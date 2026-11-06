# OpenAI Responses 适配器

和 Anthropic 对比，能看出适配层吸收差异的方式。
两个文件：

- `api/openai-responses.ts`（455 行）：客户端、请求参数、入口；
- `api/openai-responses-shared.ts`（891 行）：消息/工具转换、流处理。
  也被 Codex、Azure 复用。

## 1. 最大的差异：item 模型

Anthropic 是“消息列表”，OpenAI Responses 是“条目列表”：

```ts
type ResponseInputItem =
  | message                // role: user / assistant / system / developer
  | reasoning              // 加密推理
  | function_call          // 工具调用
  | function_call_output   // 工具结果
  | custom_tool_call       // grammar 工具
  | custom_tool_call_output
  | additional_tools       // 中途追加工具
  | tool_search_call / output
  | configuration_update   // 中途改 reasoning effort
```

所以转换不是“消息改格式”，而是**把一条 assistant 消息拆成多种 item**：

```
assistant message
  ├─ thinking block   → reasoning item
  ├─ text block       → message(output_text) item
  └─ toolCall block   → function_call / custom_tool_call item

toolResult          → function_call_output / custom_tool_call_output
system message      → developer / system message（可多次出现）
```

## 2. 消息转换

`convertResponsesMessages()`：

1. 先过 `transformMessages()`：图片降级、thinking 过滤、孤儿 tool result；
2. 工具调用 id 归一：

```
原始 id: "<call_id>|<item_id>"
每部分 sanitize 到 [a-zA-Z0-9_-]，最长 64
item id 必须以 "fc_" 开头
跨 provider 的 item id 用 hash 代替
```

3. thinking block 的 `thinkingSignature` 就是完整 reasoning item 的 JSON，
   直接解析回来；
4. text block 的 `textSignature` 记录 `{ id, phase }`，用于回放；
5. toolCall 的 item id：
   - 不同模型 → 丢掉 id，避免 OpenAI 的配对校验；
   - 前缀不对（`fc_` vs `ctc_`）→ 丢掉；
6. toolResult 的 `call_id` 取 `id` 的第一段。

### 工具变化

Responses 没有“system message 改工具”的概念，所以用 `additional_tools` item：

```
首条 additional_tools 声明初始工具
后续 additional_tools 追加，同名定义替换
移除无法在 wire 上表达 → 用文本公告
```

代码里维护 `unavailableTools`，并在每个增量 item 前加一段说明：

```
This is an incremental tools update...
Still unavailable: ...
```

这是为了小模型不会在后续工具加载后又调用已经移除的工具（注释里说在
gpt-5.6-luna / gpt-6-luna 上验证过）。

禁用 `additional_tools` 时退回 `tool_search_call` + `tool_search_output` 的合成对。

### 中途修改 thinking level

不直接改 `reasoning.effort`，因为那会让整个 prompt 前缀失效。改用
`configuration_update` item：

```
每个历史 reply 前放一个 configuration_update，带上它当时的 providerThinkingLevel
末尾再放一个当前 effort
```

这样前面的输入永远不变，缓存前缀得以保留。

## 3. 工具转换

两种工具：

| 类型 | 用途 |
|---|---|
| `function` | 普通 JSON Schema 工具，可选 strict |
| `custom` | grammar 约束工具，`format: { type: "grammar", syntax, definition }` |

`defer_loading: true` 用于 tool search 的结果，表示加载但不立即声明。

## 4. 请求参数

```ts
{
  model,
  input: items,
  stream: true,
  store: false,                    // 无状态回放
  prompt_cache_key,                // session id，clamp 过
  prompt_cache_retention,          // long → "24h"
  prompt_cache_options,            // explicit mode / ttl "30m"
  max_output_tokens,               // 最小 16
  reasoning: { effort, summary },
  include: ["reasoning.encrypted_content"],
  tools, tool_choice,
}
```

特殊情况：

- **Sign in with ChatGPT**：拒绝 `max_output_tokens`、`temperature`、
  `prompt_cache_*`、`configuration_update`，这些字段会被省略；
- **service tier**：`flex` 成本 ×0.5，`priority`/`fast` ×2（gpt-5.5 是 ×2.5），
  在 `applyServiceTierPricing()` 里乘到 usage 上；
- **GitHub Copilot**：动态 headers。

## 5. 流处理

`processResponsesStream()`：

| 事件 | 行为 |
|---|---|
| `response.created` | 记录 responseId |
| `output_item.added` | 按类型创建 slot：thinking / text / toolCall |
| `reasoning_summary_text.delta` | `thinking_delta` |
| `reasoning_text.delta` | `thinking_delta` |
| `output_text.delta` | `text_delta` |
| `refusal.delta` | 也作为 `text_delta` |
| `function_call_arguments.delta` | `toolcall_delta`，增量 JSON 解析 |
| `function_call_arguments.done` | 替换成完整参数 |
| `custom_tool_call_input.delta` | grammar 工具的输入增量 |
| `output_item.done` | 收尾：thinking signature、text signature、tool call finish |
| `response.completed` / `incomplete` | usage、stop reason、cost |
| `response.failed` | 抛错 |
| `error` | 抛错 |

关键细节：

- **每个 output slot 单独跟踪**，不把临时状态挂在 content block 上，
  避免进入 partial；
- **reasoning 的完整 item 存进 `thinkingSignature`**，下次请求原样回放；
- **text 的 `textSignature` 存 `{ id, phase }`**，phase 用于区分
  `commentary` / `final_answer`；
- **未完成的 tool call 会抛错**：如果流结束了但某个 tool call 没有
  `output_item.done`，参数可能被截断或错位，不能交给 agent 执行；
- **Azure 回填**：`response.output_item.done` 可能缺
  `reasoning.encrypted_content`，从 `response.completed.response.output` 回填。

## 6. Usage 与 stop reason

OpenAI 的 `input_tokens` **包含** cached 和 cache_write，所以要减掉：

```ts
input = max(0, input_tokens - cached_tokens - cache_write_tokens)
cacheRead = cached_tokens
cacheWrite = cache_write_tokens
reasoning = output_tokens_details.reasoning_tokens
```

stop reason：

| status | stopReason |
|---|---|
| `completed` | `stop` |
| `incomplete` + `max_output_tokens` | `length` |
| 其他 `incomplete` | `error` |
| `failed` / `cancelled` | `error` |
| `in_progress` / `queued` | `stop`（注释说这两个“wonky”） |

有 tool call 且 stop 是 `stop` → 改成 `toolUse`。

## 7. 和 Anthropic 的对比

| | Anthropic | OpenAI Responses |
|---|---|---|
| 消息模型 | 消息列表 | item 列表 |
| 工具调用 | `tool_use` block | `function_call` item |
| 工具结果 | `tool_result` block | `function_call_output` item |
| 推理 | thinking block + signature | reasoning item + encrypted_content |
| 缓存 | `cache_control` | `prompt_cache_key` / retention / options |
| 工具变化 | 原生 beta / 文本公告 | `additional_tools` + 文本公告 |
| 中途 effort | thinking budget | `configuration_update` |
| 无状态回放 | `store` 概念不存在 | `store: false` + 回放 item |

## 8. 设计观察

1. **同一个事件契约，完全不同的 wire 模型**：上层只看到
   `text_* / thinking_* / toolcall_*`。
2. **id 编码了 provenance**：`call_id|item_id`，回放时要保持可配对。
3. **签名是回放状态**：thinking signature、text signature 保存了 provider
   需要的东西。
4. **缓存靠稳定前缀**：`additional_tools`、`configuration_update`、`store:false`
   都是为了让历史请求字节不变。
5. **grammar 工具是 custom tool call**，不是 function call，参数直接是字符串。
6. **provider quirk 集中处理**：ChatGPT 登录、Azure 回填、service tier 定价。

## 9. 尚未细读

- `openai-codex-responses.ts`（1,723 行）：WebSocket 续传。
- `openai-completions.ts`（1,739 行）：chat completions 路径。
- `google-generative-ai.ts` / `google-vertex.ts` / `bedrock-converse-stream.ts`。
- `constrained-sampling.ts` 的 grammar / strict 降级细节。
