---
title: "跨包错误处理体系：领域错误类 + 结构化 cause 包装"
---

> **知识卡元数据**（Repo Wiki 自动生成，可能过时）
>
> - 类型：`error_handling`
> - 适用范围：`**`
> - 覆盖源文件（10）：[`packages/mcp/src/oauth/errors.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/mcp/src/oauth/errors.ts)、[`packages/mcp/src/protocol/jsonrpc.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/mcp/src/protocol/jsonrpc.ts)、[`packages/mcp/src/transports/streamable-http.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/mcp/src/transports/streamable-http.ts)、[`packages/ai/src/utils/models-error.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/ai/src/utils/models-error.ts)、[`packages/ai/src/api/pi-messages.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/ai/src/api/pi-messages.ts)、[`packages/codemode/src/source.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/codemode/src/source.ts)、[`packages/coding-agent/src/core/model-runtime.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/model-runtime.ts)、[`packages/coding-agent/src/core/session-manager.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/session-manager.ts)、[`packages/coding-agent/src/core/tools/bash.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/tools/bash.ts)、[`packages/coding-agent/src/cli/auth-command.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/cli/auth-command.ts)

## 1. 总体方案

仓库采用 **纯 JavaScript `Error` 子类** 作为错误建模手段，没有引入第三方异常库（如 `ts-error`、`neverthrow`）。每个包在自身命名空间下定义语义化的错误类，并通过 `cause` 字段保留底层原因。顶层应用层（coding-agent）通过 `try/catch` 捕获并向上抛出更高层的错误；不存在全局 panic/recover 或中间件式统一错误处理器。

## 2. 关键文件与包

- `packages/mcp/src/oauth/errors.ts` — MCP OAuth 域错误：`OAuthError`、`OAuthIssuerMismatchError`、`OAuthInsecureEndpointError`、`OAuthRegistrationError`、`McpOAuthAuthorizationRequiredError`、`McpRefreshLockBusyError`
- `packages/mcp/src/protocol/jsonrpc.ts` — JSON-RPC 协议错误：`McpError`（带 `code`/`data`）、`McpConnectionClosedError`、`McpTimeoutError`、`McpAbortError`，以及常量 `JSON_RPC_ERROR_CODES`（parseError / invalidRequest / methodNotFound / invalidParams / internalError）
- `packages/mcp/src/transports/streamable-http.ts` — HTTP 传输错误：基类 `McpHttpError`（含 `status`/`body`），派生 `McpAuthRequiredError`、`McpSessionExpiredError`
- `packages/ai/src/utils/models-error.ts` — AI 运行时通用错误：`ModelsError`，携带枚举 `ModelsErrorCode = "model_source" | "model_validation" | "provider" | "stream" | "auth" | "oauth"`，并通过 `withCauseDetail` 把 `cause` 的 `formatThrownValue` 结果拼入 message
- `packages/ai/src/api/pi-messages.ts` — Provider 响应错误：`PiMessagesResponseError`（含 `code`、`diagnosticDetails`，包含 provider/model/url/status/body/timestampMs 等诊断字段）
- `packages/codemode/src/source.ts` — 沙箱源码解析错误：`CodemodeSourceError`
- `packages/coding-agent/src/core/*.ts` — 业务层错误：`CredentialSynchronizationError`、`MissingSessionCwdError`、`SessionImportFileNotFoundError`、`SessionHeaderScanLimitError`、`ShellTimeoutError`、`AuthCommandError` 等

## 3. 架构与约定

### 3.1 错误类命名与结构
所有自定义错误均继承自原生 `Error`，并在构造函数中显式设置 `this.name`，便于日志和调试区分类型。常见属性模式：
- 协议级错误：`code: number` + `data?: unknown`（`McpError`）
- HTTP 级错误：`status: number` + `body: string`（`McpHttpError`）
- OAuth 级错误：`code: string` + `errorUri?: string`（`OAuthError`）
- 业务级错误：语义化字段（如 `expected`/`received`、`endpoint`、`timeoutMs`）

### 3.2 Cause 链
`ModelsError` 是仓库中最明确的 cause 封装点：构造时接收 `{ cause?: unknown }`，并通过 `withCauseDetail` 调用 `formatThrownValue(cause)` 将底层错误信息追加到 message 末尾，同时保持原始 `options.cause` 透传给 `super()`，从而保留标准 `Error.cause` 链。

其他包也遵循类似模式：例如 `pi-messages.ts` 中的 `createPiMessagesResponseError` 把 provider 返回的 error body 原样放入 `diagnosticDetails.error`，并把原始 body 截断后放入 `diagnosticDetails.body`，供上层消费。

### 3.3 分层抛错策略
- **协议层**（mcp）：抛出 `McpError` / `McpHttpError` / `McpTimeoutError` 等，携带结构化 code/data/status/body
- **Provider 适配层**（ai）：将 HTTP 4xx/5xx 或 SSE 事件中的错误转换为 `PiMessagesResponseError` 或 `ModelsError`，附带 provider/model/url/status 等上下文
- **业务层**（coding-agent）：捕获下层错误，包装为 `CredentialSynchronizationError`、`MissingSessionCwdError` 等语义化错误后再向上传播

### 3.4 重试与瞬态错误识别
`streamable-http.ts` 中 `isTransientStatus(status)` 明确列出可重试状态码：`408`、`429`、`>= 500`，用于流重连逻辑。`openai-codex-responses.ts` 中存在 `RetryDelayExceededError` 表示重试耗尽。

### 3.5 无中间件式统一处理
仓库中没有全局错误中间件、Express-style error handler 或 `process.on('uncaughtException')` 级别的兜底。错误主要通过函数返回值（如 `parseJsonRpcMessage` 抛 `McpError`）和 `try/catch` 在调用栈内传播。`close()` 等方法中对非关键网络调用使用空 `catch {}` 做静默降级（best-effort 清理）。

## 4. 约定与约束

- **自定义错误必须继承 `Error` 并设置 `name`**：所有已发现的自定义错误类都显式赋值 `this.name`，这是代码库的一致约定（见 `OAuthError`、`McpError`、`McpHttpError`、`CodemodeSourceError`、`PiMessagesResponseError`、`ModelsError` 等）。
- **结构化错误优先于裸字符串**：协议层错误（MCP、HTTP、OAuth）一律携带结构化字段（`code`/`status`/`body`/`data`），而非仅靠 message 区分。
- **底层原因通过 `cause` 保留**：`ModelsError` 强制要求调用方传入 `cause` 选项，并通过 `withCauseDetail` 把 cause 文本化后追加到 message，避免丢失堆栈上下文。
- **错误分类使用字面量枚举**：`ModelsErrorCode` 用联合字面量类型限定错误域（`model_source` / `model_validation` / `provider` / `stream` / `auth` / `oauth`），使 switch/if-else 分支可穷尽检查。
- **瞬态错误有显式判定**：HTTP 层通过 `isTransientStatus` 集中声明可重试状态码，避免在多处散落判断。
- **Biome 未强制错误规则**：`biome.json` 中没有启用 `noThrow` 或 `useThrowStatement` 等规则，因此是否抛错由开发者自行决定；仓库内既有 `throw new Error(...)` 也有返回 `undefined`/可选值的混合风格，但新定义的领域错误倾向于使用专用类。
- **测试中可见 fake error 类**：测试文件（如 `provider-error-body-passthrough.test.ts`、`regression.test.ts`）中定义 `FakeAPIError extends Error` 模拟 API 错误，说明测试层也遵循同一套错误建模约定。