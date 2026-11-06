---
kind: error_handling
name: Pi Monorepo 错误处理体系：领域化 Error 子类与结构化诊断
category: error_handling
scope:
    - '**'
source_files:
    - packages/ai/src/utils/models-error.ts
    - packages/ai/src/utils/retry.ts
    - packages/mcp/src/oauth/errors.ts
    - packages/ai/src/api/pi-messages.ts
    - packages/ai/src/api/openai-codex-responses.ts
    - packages/ai/src/api/constrained-sampling.ts
    - packages/ai/src/api/mistral-conversations.ts
    - packages/codemode/src/source.ts
    - packages/coding-agent/src/main.ts
---

## 1. 采用的方案

仓库没有统一的异常框架，而是采用 **每个包/子域定义自己的 `Error` 子类**、在调用点通过 `instanceof` 精确分派、并通过可选的 `code` / `payload` / `diagnosticDetails` 等字段携带结构化诊断信息的模式。跨包传播的错误通常保留原始 `cause`（使用 `new Error(message, { cause })`），以便上层捕获链能追溯根因。

## 2. 关键文件与包

- `packages/ai/src/utils/models-error.ts` — 通用 `ModelsError` + `ModelsErrorCode` 联合类型（`model_source | model_validation | provider | stream | auth | oauth`）
- `packages/mcp/src/oauth/errors.ts` — MCP OAuth 领域的错误族：`OAuthError`、`OAuthIssuerMismatchError`、`OAuthInsecureEndpointError`、`OAuthRegistrationError`、`McpOAuthAuthorizationRequiredError`、`McpRefreshLockBusyError`
- `packages/ai/src/api/pi-messages.ts` — `PiMessagesResponseError`（含 `code`、`diagnosticDetails: JsonObject`）
- `packages/ai/src/api/openai-codex-responses.ts` — `CodexApiError`、`CodexProtocolError`、`ProviderStreamEventCallbackError`、`RetryDelayExceededError`、`WebSocketCloseError`
- `packages/ai/src/api/constrained-sampling.ts` — `UnsupportedStrictJsonSchemaError`
- `packages/ai/src/api/mistral-conversations.ts` — `MistralHttpError`
- `packages/codemode/src/source.ts` — `CodemodeSourceError`
- `packages/codemode/src/runtime/execution.ts` — `BridgeError`
- `packages/coding-agent/src/core/model-runtime.ts` — `CredentialSynchronizationError`
- `packages/coding-agent/src/core/session-manager.ts` — `SessionHeaderScanLimitError`
- `packages/coding-agent/src/core/tools/bash.ts` — `ShellTimeoutError`
- `packages/ai/src/utils/retry.ts` — `RetrySleepAbortError` + `retryAssistantCall` 重试策略

## 3. 架构与约定

### 3.1 领域化 Error 类族
每个 API 提供方或子系统定义一组语义明确的 `Error` 子类，而不是用字符串 code 区分所有分支。例如 Codex 将 HTTP 层错误 (`CodexApiError`)、协议解析错误 (`CodexProtocolError`)、回调抛错 (`ProviderStreamEventCallbackError`) 分开；MCP OAuth 将鉴权失败、issuer 不匹配、非 HTTPS 端点、动态注册失败分别暴露为独立类型。

### 3.2 结构化诊断字段
- `ModelsError` 通过 `code: ModelsErrorCode` 提供跨 AI 子系统的统一分类码。
- `PiMessagesResponseError` 额外带 `diagnosticDetails: JsonObject`，包含 `provider`、`model`、`url`、`status`、`statusText`、`error`、`body`、`timestampMs` 等完整上下文。
- `CodexApiError` / `CodexProtocolError` 通过 `code?` / `payload?` 透传上游 JSON。
- MCP OAuth 错误普遍带 `code` 和可选的 `errorUri`。

### 3.3 cause 链传递
`ModelsError` 构造函数显式调用 `withCauseDetail(options?.cause)`，把底层原因格式化后追加到 message 中，同时保留 `options.cause` 给 `Error.cause` 链。`CodexApiError` / `CodexProtocolError` / `ProviderStreamEventCallbackError` 也接受 `{ cause }` 并直接赋值 `this.cause`。

### 3.4 错误分类与可重试性
`packages/ai/src/utils/retry.ts` 中的 `isRetryableAssistantError` 基于正则 `NON_RETRYABLE_PROVIDER_LIMIT_ERROR_PATTERN` / `RETRYABLE_PROVIDER_ERROR_PATTERN` 判断 `AssistantMessage.errorMessage`，决定 `retryAssistantCall` 是否指数退避重试。这是仓库中唯一集中化的“错误→动作”决策点。

### 3.5 顶层入口的兜底
`packages/coding-agent/src/main.ts` 对 CLI 命令错误做最小兜底：`error instanceof AuthCommandError ? error.message : "Failed to parse auth command"`，即只有已知错误才输出其 message，其余走默认文案。

## 4. 观察到的约定与约束

- **每个自定义 Error 都设置 `this.name`**：`ModelsError`、`PiMessagesResponseError`、`CodexApiError`、`CodexProtocolError`、`ProviderStreamEventCallbackError`、`OAuthError`、`CodemodeSourceError` 等均显式赋值 `name`，便于日志与调试识别。
- **错误通过 `instanceof` 而非字符串匹配进行分派**：如 `openai-codex-responses.ts` 中的 `isCodexNonTransportError`、`isWebSocketConnectionLimitReachedError`、`isPreviousResponseNotFoundError` 全部基于 `error instanceof X` 与 `error.code === CONSTANT` 判断。
- **HTTP 响应错误统一包装**：`pi-messages.ts` 的 `createPiMessagesResponseError` 从 `Response` + body 构造 `PiMessagesResponseError`，并把服务端返回的 `error.code` / `error.message` / `error.details` 原样放入 `diagnosticDetails`。
- **OAuth 安全约束**：`OAuthInsecureEndpointError` 在检测到非 HTTPS 端点时直接抛错，禁止发送凭据。
- **重试边界明确**：`retryAssistantCall` 文档注释声明 abort 是终态且永不重试；`RetrySleepAbortError` 用于在 backoff sleep 期间被 abort 时归一化为 `stopReason: "aborted"` 的 `AssistantMessage`，使调用方无需关心取消发生在哪个阶段。
- **无全局 panic/recover**：仓库未使用 `throw new Error(...)` 作为控制流（除少量内部校验外），也没有 `try/catch` 包裹整个请求生命周期的中间件式错误处理器；错误沿调用栈向上传播，由消费方（CLI、扩展、运行时）按领域类型处理。
- **测试中的 fake 错误**：测试文件（如 `test/provider-error-body-passthrough.test.ts`）定义 `FakeAPIError extends Error` 以模拟第三方错误，说明 `instanceof` 分派是实际依赖的类型契约。