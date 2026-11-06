---
title: "日志系统 — 基于文件追加的 MCP 服务器日志与全局 console 输出"
---

> **知识卡元数据**（Repo Wiki 自动生成，可能过时）
>
> - 类型：`logging_system`
> - 适用范围：`**`
> - 覆盖源文件（3）：[`packages/coding-agent/src/extensions/mcp/log.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/extensions/mcp/log.ts)、[`packages/coding-agent/src/extensions/mcp/index.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/extensions/mcp/index.ts)、[`packages/coding-agent/test/mcp-extension.test.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/test/mcp-extension.test.ts)

## 1. 使用的系统与框架

仓库没有引入第三方日志库（pino、winston、bun.debug 等均未出现在依赖中）。整体日志策略是：
- **MCP 服务器消息**：通过 `packages/coding-agent/src/extensions/mcp/log.ts` 中的 `McpServerLog` 类，使用 Node.js 原生 `fs.appendFileSync` 同步追加到 `mcp.log`。
- **其余业务代码**：直接调用 `console.error` / `console.warn` / `console.info` 等标准输出，未封装统一的 logger 抽象。

因此，本仓库的“日志系统”不是一个跨包统一框架，而是以 MCP 服务器的结构化文件日志为主、其他位置散落的 `console.*` 输出为辅。遥测（telemetry）与日志是分离的：`packages/telemetry` 提供的是遥测接口与内存记录器，不是应用日志。

## 2. 关键文件

- `packages/coding-agent/src/extensions/mcp/log.ts` — MCP 服务器日志写入核心（格式化 + 文件轮转）。
- `packages/coding-agent/src/extensions/mcp/index.ts` — MCP 扩展入口，负责把 `McpServerLog` 注入到每个 server connection 的 `log` 选项。
- `packages/coding-agent/test/mcp-extension.test.ts` — 对 `notifications/message` 参数（含 `level`、`logger`、`data`）的测试用例，验证日志格式。
- 各包的 `package.json` 中未发现 pino/winston/bun-debug 等依赖声明。

## 3. 架构与约定

### 3.1 MCP 服务器日志 (`McpServerLog`)

`formatMcpLogMessage(server, params)` 将 MCP 通知 `notifications/message` 转换为单行文本，格式为：

```
<ISO-8601 timestamp> [<server>] <level><logger: > <text>
```

其中：
- `level` 取自 `params.level`，默认 `"info"`。
- `logger` 取自 `params.logger`，作为可选字段附加在 level 之后。
- `data` 会尝试 `JSON.stringify`；失败时回退到 `String(data)`。
- 多行 `data` 会被缩进（每行前加 4 个空格），保证后续行对齐。

`McpServerLog.write(server, params)` 的职责：
1. 首次写入时 `mkdirSync(dirname(path), { recursive: true })` 确保目录存在。
2. 如果文件大小超过 `MAX_LOG_BYTES = 5 * 1024 * 1024`（5 MiB），先 `renameSync(path, path + ".1")` 做简单轮转，再 `appendFileSync` 新内容。
3. 所有 I/O 错误被 `try/catch` 吞掉——注释明确说明“logging must not break tools”，即日志是 best-effort，不能影响工具执行。
4. 每次写入使用 `appendFileSync`，因为注释指出“Several pi processes may write to the same file”。

### 3.2 注入点

在 `packages/coding-agent/src/extensions/mcp/index.ts` 中：
- `createMcpExtension` 内部通过 `getServerLog(runtime)` 懒创建 `McpServerLog`，默认路径为 `join(getAgentDir(), "mcp.log")`，可通过 `options.logPath` 覆盖。
- 每个 `McpServerConnection` 构造时传入 `log: getServerLog(runtime)`，由 MCP runtime 在收到 `notifications/message` 时调用。

### 3.3 非 MCP 代码的输出

除 MCP 扩展外，仓库中大量使用 `console.error` / `console.warn` 直接输出，例如：
- `packages/ai/src/cli.ts`：CLI 错误输出。
- `packages/ai/catalog/sources/index.ts`：模型目录拉取失败的警告。
- `packages/agent/src/proxy.ts`：未处理代理事件类型的警告。
- `scripts/*`：构建脚本的错误输出。

这些输出没有统一级别、没有结构化字段、也没有集中 sink，属于“散落式”的标准输出。

## 4. 约定与约束

- **MCP 服务器日志必须写文件**：`McpServerLog` 是唯一被注入到 MCP runtime 的 log sink，目标文件默认为 agent 目录下的 `mcp.log`。
- **日志不可阻塞工具执行**：`write()` 内所有 I/O 异常都被静默忽略，这是代码注释显式要求的约束（"logging must not break tools"）。
- **并发安全**：由于多个 pi 进程可能同时写入同一 `mcp.log`，写入采用 `appendFileSync`（同步追加），而非异步流。
- **日志轮转阈值固定为 5 MiB**：`MAX_LOG_BYTES = 5 * 1024 * 1024`，超过后重命名为 `mcp.log.1`，不保留更多历史版本。
- **MCP 通知字段约定**：`params` 期望是一个 record，包含可选的 `level`（string，默认 info）、`logger`（string，可选）、`data`（任意值，可 JSON 序列化）。
- **无全局日志级别配置**：仓库中没有发现环境变量或配置文件控制日志级别（如 `LOG_LEVEL`、`DEBUG` 等），MCP 日志始终按接收到的 `level` 原样输出。
- **无结构化日志格式**：除了 MCP 服务器日志有固定的行格式，其他 `console.*` 输出都是人类可读字符串，没有统一的 JSON 结构或字段命名规范。
- **telemetry 与日志分离**：`packages/telemetry` 提供的是遥测（trace/span 指标）接口和内存实现，与应用日志无关，不应混为一谈。