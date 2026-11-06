# Provider 适配层

`packages/ai/src/api/` 约 14,000 行，每个文件适配一家 API。
理解模式比读完全部实现更重要。

## 1. Provider 接口

`models.ts`：

```ts
interface Provider<TApi extends Api> {
  id: string
  name: string
  baseUrl?: string
  headers?: ProviderHeaders
  auth: ProviderAuth              // apiKey / oauth，至少一个
  getModels(): Model<TApi>[]
  getAllModels?(): ProviderModel<TApi>[]
  refreshModels?(context): Promise<void>
  filterModels?(models, credential): Model<TApi>[]
  filterAllModels?(models, credential): ProviderModel<TApi>[]
  stream(model, transcript, options?): AssistantMessageEventStream
  streamSimple(model, transcript, options?): AssistantMessageEventStream
  fetchDeferred? / cancelDeferred?
  generateImages? / classify?
}
```

约定：

- `getModels()` 同步、不抛错；
- `stream()` 接收已经归一化的 `TranscriptContext`；
- 请求/运行时错误编码进事件流，而不是同步抛出；
- 认证由 `Models` 解析后作为 `options` 传入。

## 2. 两层入口

```
Models（集合 + 认证）
  └─ compat.ts 的自由函数 stream() / streamSimple()
       ├─ normalizeContext(context)
       ├─ 找 builtin provider（如果 model 属于某个内置 provider）
       └─ 否则 resolveApiProvider(model.api)
```

`Api` 是传输协议 id，例如：

```
anthropic-messages
openai-completions
openai-responses
google-generative-ai
bedrock-converse-stream
mistral-conversations
...
```

每个 api 文件导出 `stream` / `streamSimple`，就是 `StreamFunction`。

## 3. 消息可移植层：transformMessages

不同 provider 对历史消息的要求不同。`transformMessages()` 是统一的可移植层：

1. **把 null/undefined content 归一成 `[]`**；
2. **降级不支持的图片**：模型 `input` 不含 `image` 时，图片替换成文本占位；
3. **丢弃其他模型的 thinking**：签名和加密推理只对产生它的模型有效，
   把可读 thinking 当普通文本发给新模型会让它误以为是自己的回复；
4. **清除其他模型的 `thoughtSignature`**；
5. **归一化 tool call id**：OpenAI Responses 的 id 可能 450+ 字符并含 `|`，
   Anthropic 要求 `^[a-zA-Z0-9_-]+$` 且 ≤64 字符；
6. **为孤儿 tool call 补合成结果**：assistant 有 toolCall 但没有对应
   toolResult 时，插入一条 `"No result provided"` 的错误结果；
7. **丢弃 error / aborted 的 assistant 消息**：不完整的回合不应被重放；
8. **system message 透明化**：夹在 tool call 和 tool result 之间的 system
   message 会先被扣住，等结果补齐后再发出，避免重复结果。

这一层是所有 provider 共用的，所以新增 provider 不需要重复处理这些边界。

## 4. Anthropic 适配器示例

`api/anthropic-messages.ts` 是最复杂的一个，能说明适配层要处理什么。

### 缓存

- `cacheRetention`：`short` / `long` / `none`；
- `none` 不发 cache control；
- `long` 且模型支持时用 `ttl: "1h"`；
- cache control 挂在 system、tools、消息上；
- `sessionId` 用于会话亲和（OpenRouter 用 `x-session-id`，其他用
  `x-session-affinity`）。

### Claude Code 兼容模式

OAuth token（`sk-ant-oat...`）走 Claude Code 的身份：

- headers 伪装成 `claude-cli/<version>`、`x-app: cli`；
- 工具名映射成 Claude Code 的规范大小写（`Read`、`Bash`、`Edit`…）；
- 返回时再映射回 Pi 的工具名。

### Message threads

Anthropic 的服务端线程允许“继续上一次回复”，只发新增消息：

```
prepareThreadRequest()
  → 如果前缀 hash 匹配，发 { thread: { type: "continue", previous_message_id } }
  → 否则发 { thread: { type: "create" } }

线程被拒绝（过期/并发/设置变化）
  → 新建线程重发一次
  → 端点不支持线程 → 关闭线程，按普通请求发
```

前缀 hash 会忽略 `cache_control`，因为缓存标记会移动，不改变语义。

### 缓存前缀占位

只要使用原生工具变更，就声明一个永不激活的
`__pi_deferred_placeholder__` 工具。这样 Anthropic 为“对话中途改工具”生成的
隐藏 prompt 从第一次请求就存在，第一次工具变化不会导致整段缓存失效。

### 严格工具降级

如果请求因 strict tool 限制被 400 拒绝，去掉 strict 后重试一次，并记录诊断。

### 请求构建

`buildParams()` 负责：

- system message → `system`；
- 工具声明 → `tools`，带 cache control；
- 消息 → `messages`，图片转 base64 block；
- thinking 配置 → `thinking`；
- 工具选择 → `tool_choice`；
- beta headers。

### 流式事件映射

Anthropic 原生事件 → Pi 统一事件：

| Anthropic | Pi |
|---|---|
| `message_start` | 记录 responseId、responseModel、usage、cost |
| `content_block_start` (text) | `text_start` |
| `content_block_start` (thinking / redacted) | `thinking_start` |
| `content_block_start` (tool_use) | `toolcall_start` |
| `content_block_delta` (text_delta) | `text_delta` |
| `content_block_delta` (thinking_delta) | `thinking_delta` |
| `content_block_delta` (input_json_delta) | `toolcall_delta` |
| `content_block_stop` | `text_end` / `thinking_end` / `toolcall_end` |
| `message_delta` | 停止原因、usage 增量 |
| `message_stop` | 结束 |

工具参数用 `ToolCallArgumentsStream` 增量解析，处理不完整的 JSON。

### Usage

Anthropic 不提供 `totalTokens`，所以从分量计算：

```
input + output + cacheRead + cacheWrite
```

`cache_creation.ephemeral_1h_input_tokens` 记录 1 小时缓存写入。
`calculateCost()` 按模型价格表算成本；OpenRouter 可能报告实际费用，会覆盖。

## 5. streamSimple

`streamSimple()` 是统一入口的薄封装：

```
buildBaseOptions()
  → maxTokens 按上下文窗口裁剪
  → sampling / cacheRetention / sessionId / headers
然后按 reasoning level 映射：
  - 自适应 thinking 模型 → effort
  - 旧模型 → thinkingBudgetTokens
  - 无 reasoning → thinkingEnabled: false
```

thinking budget 会被限制在 `maxTokens - 1024` 以内，给答案留空间。

## 6. 各 provider 的差异在哪里

差异都收敛在 `api/*.ts` 和 `model.compat` 标志里，例如：

- 是否支持 mid-conversation system message；
- 是否支持 mid-conversation tool changes；
- 是否支持 long cache retention；
- 是否支持 strict tools；
- 是否允许空 thinking signature；
- 是否支持 message threads；
- 是否需要 session affinity。

核心层不需要知道这些，只通过 `resolveTranscript()` 和 `model.compat` 做分支。

## 7. 设计观察

1. **核心契约很窄**：`StreamFunction` 返回 `AssistantMessageEventStream`。
2. **可移植性集中在一个函数**：`transformMessages()` 处理图片、thinking、
   tool id、孤儿调用、错误回合。
3. **provider 特有的东西不外泄**：缓存、线程、伪装 headers、strict 降级都在
   适配器内部。
4. **错误尽可能进流**：认证失败可以同步抛，但请求开始后的失败都编码成
   `stopReason: "error"`。
5. **成本是统一计算的**：适配器只填 usage，`calculateCost()` 负责价格。
6. **增量工具参数解析是共享的**：`ToolCallArgumentsStream` 不属于某一家。

## 8. 尚未细读

- 其余 provider：OpenAI Completions/Responses、Google、Bedrock、Mistral、
  Cloudflare、Codex、OpenRouter images 等。
- `constrained-sampling.ts`：strict JSON schema 和 grammar 的降级策略。
- `models.ts` 的 `Models` 集合实现（注册、刷新、可用性）。
- `utils/streaming-json.ts` 的增量 JSON 解析。
