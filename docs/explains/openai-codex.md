# OpenAI Codex 适配器

`api/openai-codex-responses.ts`（1,723 行）。

它和普通 Responses 适配器最大的不同：**传输层可以有状态**。

## 1. Codex 是什么

Codex 是 OpenAI 面向 ChatGPT 订阅的编码后端，不是普通 API：

- 用 ChatGPT access token 认证（不是 `sk-`）；
- JWT 里带 `chatgpt_account_id`；
- 有订阅配额，429 可能是“用量上限”而不是限流；
- 表单要求 `store: false`。

端点：

```
https://chatgpt.com/backend-api
```

## 2. 两条传输

### WebSocket（默认 `auto`）

```
wss://.../responses
→ 发送 { type: "response.create", ...body }
→ 服务端按帧推送 response 事件
```

特点：

- 连接可以复用；
- 服务端可以记住 `previous_response_id`；
- 只需要发送新增的 input。

### SSE（回退）

```
POST /responses
Content-Encoding: zstd（如果 Node/Bun 支持）
→ text/event-stream
```

压缩：

- `zstdCompressSync`，level 3；
- 浏览器 / Vite 环境没有 `node:zlib` 时退回未压缩 JSON。

## 3. 传输选择

`options.transport`：

| 值 | 行为 |
|---|---|
| `auto` | 先试 WebSocket，失败则 SSE |
| `sse` | 强制 SSE |
| `websocket-cached` | WebSocket + 服务端上下文缓存 |

回退条件：

- 失败发生在**任何事件发出之前**；
- 连接限制错误重试一次；
- `previous_response_not_found` 重试一次（通常是服务端忘了上下文）。

一旦已经开始推事件，就不再回退，直接报错。

回退会记录到 session 状态，之后的请求直接走 SSE，避免反复尝试。

## 4. WebSocket 连接复用

- 连接按 session + account 缓存；
- 复用连接时，`entry.continuation` 保存：

```ts
{
  lastRequestBody: RequestBody,
  lastResponseId: string,
  lastResponseItems: ResponseInputItem[],
}
```

- 下一次请求先检查：
  1. 除 `input` / `previous_response_id` 外的 body 是否完全一致；
  2. 当前 input 的前缀是否等于 `lastRequestBody.input + lastResponseItems`；
  3. 是 → 只发 delta，带 `previous_response_id`；
  4. 否 → 发完整上下文。

这是一个**精确前缀校验**，不是模糊匹配。任何前缀变化都会退回完整请求。

## 5. 请求体

```ts
{
  model,
  store: false,
  stream: true,
  instructions,              // system prompt 单独放这里
  previous_response_id?,     // 续传
  input,                     // item 列表
  tools, tool_choice,
  reasoning: { effort, summary },
  text: { verbosity },
  prompt_cache_key,
  include: [...],
}
```

注意 `instructions`：系统提示不放在 input 里，而是顶层字段。所以
`convertResponsesMessages()` 传了 `includeSystemPrompt: false`。

## 6. 重试与错误

SSE 路径：

- `429` / `500` / `502` / `503` / `504` 可重试；
- 但 429 如果是 `GoUsageLimitError`、`Monthly usage limit reached`、
  `insufficient_quota`、`out of budget` 等，**不重试**；
- 优先用 `retry-after-ms`，其次 `retry-after`（秒或日期）；
- 超过 `maxRetryDelayMs` 抛 `RetryDelayExceededError`；
- 指数退避，基础 1 秒。

错误信息：

- 解析 JSON error；
- 用量上限会生成友好消息：`You have hit your ChatGPT usage limit (plus plan). Try again in ~N min.`
- 其他错误用 provider 错误格式化。

## 7. 流处理

WebSocket 帧是 JSON。`parseWebSocket()` 把帧解析成 `ResponseStreamEvent`，
`mapCodexEvents()` 做少量映射，然后**复用 `processResponsesStream()`**：

```
WebSocket frames
  → parseWebSocket()
  → mapCodexEvents()
  → processResponsesStream()
  → AssistantMessageEventStream
```

因此 Codex 和普通 Responses 共享：

- slot 管理；
- thinking / text / toolcall 事件；
- usage 计算；
- stop reason 映射。

差异只在事件怎么到达，以及续传怎么发。

## 8. 调试

- `getOpenAICodexWebSocketDebugStats(sessionId)`；
- `resetOpenAICodexWebSocketDebugStats()`；
- `closeOpenAICodexWebSocketSessions()`；
- `registerSessionResourceCleanup()` 在会话结束时关闭连接。

统计包括：

- 请求数；
- 新建 / 复用连接数；
- 完整上下文请求 vs delta 请求；
- `store: true` 请求数（应为 0）；
- 上次 input items 数、previous response id。

## 9. 和普通 Responses 的对比

| | OpenAI Responses | Codex |
|---|---|---|
| 传输 | HTTPS | WebSocket（可回退 SSE） |
| 认证 | API key | ChatGPT access token + JWT |
| 续传 | 每次发完整 item 列表 | `previous_response_id` + delta |
| 系统提示 | input 里的 developer 消息 | 顶层 `instructions` |
| 请求压缩 | 无 | SSE 路径 zstd |
| 错误 | 标准 API 错误 | 订阅配额、用量上限 |
| 上下文缓存 | 客户端 prompt cache | 服务端连接级续传 |

## 10. 设计观察

1. **有状态传输是对无状态 HTTP 的优化**：服务端已经保存了前缀，客户端只发 delta。
2. **续传靠精确前缀校验**：不是“大概相同”，而是 JSON 完全相等。
3. **回退只发生在流开始前**：一旦事件已经开始，就不能悄悄换传输。
4. **共享流处理器**：Codex 和 Responses 的 wire 差异被压缩到“事件从哪来”。
5. **订阅配额是一等公民**：429 要区分“限流”和“用量用完”。
6. **连接是资源**：按 session 缓存，会话结束关闭，失败记录并回退。

## 11. 尚未细读

- WebSocket 连接池管理器（约 1,050–1,380 行）。
- `mapCodexEvents()` 的逐事件映射。
- 错误分类 `isCodexNonTransportError` 的完整规则。
- Codex 专用 headers / JWT 解析细节。
