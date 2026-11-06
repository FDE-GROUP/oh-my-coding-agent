# MCP 包内部

`packages/mcp` 是一个独立、应用无关的 MCP 客户端实现。coding-agent 通过
`extensions/mcp` 使用它，并提供配置、凭据、日志和 UI。

## 1. 分层

```
protocol/     JSON-RPC、MCP 类型、内容块
transports/   stdio、Streamable HTTP、pipe、in-memory
oauth/        发现、PKCE、注册、换 token、回调
client.ts     会话、请求/响应、通知、分页、取消
naming.ts     mcp__server__tool 命名
config.ts     mcpServers 配置校验
output-limit.ts  20KB 中间截断
```

## 2. JSON-RPC

标准 2.0 消息：

```ts
{ jsonrpc: "2.0", id, method, params }        // request
{ jsonrpc: "2.0", method, params }            // notification
{ jsonrpc: "2.0", id, result }                // success
{ jsonrpc: "2.0", id, error: { code, message, data } }
```

标准错误码：parse / invalidRequest / methodNotFound / invalidParams /
internalError。

自定义错误：

- `McpError`：带 code 和 data；
- `McpConnectionClosedError`；
- `McpTimeoutError`；
- `McpAbortError`。

`parseJsonRpcMessage()` 做运行时校验，不信任线上数据。

## 3. MCP 类型

- 协议版本：最新 `2025-11-25`，同时接受 `2025-06-18`、`2025-03-26`、
  `2024-11-05`；
- `initialize`：clientInfo、capabilities、protocolVersion；
- 服务端能力：tools / resources / prompts / logging / completions；
- 工具：name、title、description、inputSchema、outputSchema、annotations、
  execution；
- 资源：uri、name、mimeType、size、annotations；
- 资源模板：RFC 6570 URI template；
- progress / cancelled 通知。

`toLlmContent()` 把 MCP content block 转成模型可读的 text/image。

## 4. 传输契约

```ts
interface McpTransport {
  start(): Promise<void>
  send(message, options?): Promise<void>
  close(): Promise<void>
  onMessage / onError / onClose
  setProtocolVersion?(version)
}
```

- 单条消息上限默认 16MB；
- `send` 的 `signal` 在请求不再等待回复后 abort，传输层不应再派发或重试；
- `TransportEvents` 统一管理监听器，`close` 只触发一次。

## 5. Stdio 传输

- `cross-spawn` 启动子进程，Windows 兼容 `.cmd`；
- Unix 上 `detached`，建立独立进程组；
- 关闭顺序：关闭 stdin → 最多等 500ms → SIGTERM → 再等 `closeTimeoutMs`
  → SIGKILL；
- 杀的是整个进程组，避免 `npx` / `uvx` 留下子进程；
- 进程退出时还有 hook 清理所有 live group；
- stderr 保留尾部，用于连接失败诊断。

## 6. Streamable HTTP 传输

`send()`：

```
POST JSON-RPC
  Accept: application/json, text/event-stream
  Content-Type: application/json
  Mcp-Session-Id（如果有）
```

响应处理：

- `application/json`：解析一条或多条 JSON-RPC；
- `text/event-stream`：消费 SSE；
- 通知/响应：202/204，不读 body；
- 收到 `notifications/initialized` 后启动服务端到客户端的 GET 流。

SSE 解析：

- 支持 CRLF、LF、单独 CR；
- `data:` 多行拼接；
- `event:` / `id:` / `retry:`；
- 单事件大小上限；
- 断线重连带 `Last-Event-ID` 和指数退避；
- 只在流已经收到过事件时才重连。

错误：

- 401，或 403 + `insufficient_scope` → 触发授权；
- 404 → session 过期，客户端重建会话；
- 408/429/5xx → 可重试。

## 7. 客户端

状态机：

```
idle → connecting → connected → closed
```

`connect()`：

1. 启动传输；
2. 发 `initialize`；
3. 校验返回的协议版本在支持列表里；
4. 保存 serverInfo、capabilities、instructions；
5. 通知 `notifications/initialized`；
6. 进入 connected。

请求管理：

- 每个请求分配自增 id；
- `pending` map 保存 resolve/reject、timer、signal、progress token；
- 超时默认 30 秒；
- 收到 progress 会重置超时；
- 取消时发 `notifications/cancelled`（`initialize` 不能取消）；
- 请求 settle 后 abort `sendController`，避免传输层重发。

服务端发来的请求：

- 内置 `ping` 和 `roots/list` 处理器；
- 未知方法返回 `methodNotFound`；
- 处理器异常返回 `internalError`；
- 服务端取消通知会 abort 对应处理器。

分页：

- `listAll()` 自动跟随 `nextCursor`；
- 最多 1000 页；
- 重复 cursor 直接报错，防止死循环；
- 某些服务端用 `null` / `""` 结束分页，会被归一成 undefined。

结果校验：

- `initialize`、tools/list、resources/list、resources/read、
  tools/call 都有运行时校验；
- 缺 `name` 的资源用 URI 兜底；
- 缺 `content` 的 tools/call 结果补成 `[]`。

## 8. 命名

```ts
mcp__<server>__<tool>
```

- 非 `[A-Za-z0-9_]` 字符替换成 `_`；
- 超过 64 字符时截断并加 8 位 sha256 后缀；
- 两个工具 sanitize 后同名时都加后缀，避免结果依赖顺序；
- namespace 是 `mcp__<server>`，`-` 替换成 `_`。

这个命名同时用于模型工具名和 codemode 脚本标识符。

## 9. 配置

`mcpServers` 形状：

```json
{
  "mcpServers": {
    "filesystem": { "command": "npx", "args": ["-y", "..."] },
    "docs": { "url": "https://example.com/mcp", "headers": { "Authorization": "Bearer ${DOCS_TOKEN}" } }
  }
}
```

- stdio：command / args / env / cwd；
- http：url / headers / oauth；
- 公共字段：description / enabled / timeout；
- 服务名限制为 `[A-Za-z0-9_-]+`；
- 未知字段保留给调用方检查；
- 配置文件是信任边界，所有字段都校验。

## 10. 输出限制

- 模型可见文本上限 20KB；
- 超过时保留头尾各一半，中间替换成 `…N chars truncated…`；
- 完整文本可以交给 `McpOutputSaver` 写临时文件，返回路径；
- 图片保留在文本之后；
- 截断按 UTF-8 字符边界，不会切坏多字节字符。

## 11. OAuth

流程：

```
1. 发现授权服务器元数据（RFC 8414 / OIDC）
2. 解析 WWW-Authenticate，选 resource
3. 生成 PKCE S256 + state
4. 构造 authorization URL
     response_type=code
     code_challenge_method=S256
     redirect_uri
     resource（可选）
     scope（可选）
     offline_access → prompt=consent
5. 用户在浏览器授权
6. 回调拿到 code
7. token request
     client_secret_basic / client_secret_post / none
     resource 参数
8. 保存 tokens
```

客户端注册：

- 优先使用已配置的 `clientId`；
- 否则动态注册（DCR），或使用 Client ID Metadata Document（CIMD）；
- `clientRegistration: "auto" | "dcr" | "cimd"`。

回调：

- 默认 loopback `http://127.0.0.1:<port>/callback`；
- 支持固定 `callbackUrl`；
- RFC 8252 要求 loopback 或自定义 scheme；
- OpenID Connect 服务器默认把 redirect URI 当 `web`，所以显式设置
  `application_type: "native"`。

错误：

- `OAuthInsecureEndpointError`：非 https 且非 loopback；
- `OAuthIssuerMismatchError`：`iss` 不匹配；
- `OAuthRegistrationError`；
- `OAuthError`：带 error / description / uri。

凭据由应用保存（coding-agent 用 `mcp-auth.json`）。

## 12. 设计观察

1. **应用无关**：这个包不知道 Pi、不知道 settings，只提供协议和传输。
2. **信任边界明确**：配置、线上 JSON-RPC、OAuth 元数据都做运行时校验。
3. **传输抽象很小**：stdio 和 HTTP 只差分帧方式。
4. **取消和超时是显式的**：每个请求都有 signal、timeout、progress token。
5. **分页有防护**：重复 cursor、最大页数。
6. **OAuth 按 RFC 实现**：PKCE、resource、loopback、CIMD/DCR。
7. **输出截断是中间截断**：保留头尾，适合看日志和错误。

## 13. 尚未细读

- `transports/pipe.ts`、`in-memory.ts`；
- `oauth/discovery.ts`、`callback.ts`、`provider.ts`、`client-settings.ts`、
  `sign-in.ts` 的细节；
- `oauth/loopback.ts` 的回调服务器；
- `protocol/content.ts` 的全部内容类型；
- 测试与 conformance 套件。
