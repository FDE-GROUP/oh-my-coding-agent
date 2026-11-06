---
kind: logging_system
name: Pi Monorepo 日志系统：无统一框架，MCP 服务器日志走专用文件轮转
category: logging_system
scope:
    - '**'
source_files:
    - packages/coding-agent/src/extensions/mcp/log.ts
    - packages/coding-agent/test/mcp-extension.test.ts
---

## 总体结论

本仓库没有统一的日志框架。代码中未发现对 pino、winston、bunyan、log4js、debug、consola 等第三方日志库的依赖；package.json 中也仅 chalk（用于终端着色）被引入。运行时日志主要采用两种方式：
- CLI/构建脚本：直接使用 Node.js 原生 console.log / console.warn / console.error。
- MCP 服务器消息：通过 packages/coding-agent/src/extensions/mcp/log.ts 中的 McpServerLog 写入本地文件 mcp.log，并做单文件同步追加与大小轮转。

因此，该仓库不存在跨包的 logger 初始化、结构化字段约定或全局 log level 策略——每个包自行决定输出方式。

## 关键文件

- packages/coding-agent/src/extensions/mcp/log.ts — 唯一具备日志基础设施语义的实现，负责 MCP server 的 notifications/message 落盘。
- packages/coding-agent/test/mcp-extension.test.ts — 验证 level、logger、data 字段的测试用例。
- 其余位置均为裸 console.* 调用（如 packages/ai/catalog/generate.ts、packages/ai/src/cli.ts、packages/agent/src/proxy.ts 等），无集中入口。

## 架构与约定

### MCP 服务器日志（唯一有结构化的部分）

formatMcpLogMessage(server, params) 将 MCP server 发来的通知格式化为单行文本：

<ISO timestamp> [<server>] <level>[ <logger>:] <text>

其中 params 被视为记录对象，支持三个字段：
- level: string — 默认 info；
- logger: string — 可选，附加在 level 后的来源标识；
- data: unknown — 字符串原样输出，非字符串则 JSON.stringify，失败时回退到 String()。

McpServerLog 类封装了文件写入逻辑：
- 目标路径为 agent 目录下的 mcp.log；
- 使用 appendFileSync 同步追加，注释明确说明多个 pi 进程可能写同一文件，所以每条消息都是同步追加；
- 超过 MAX_LOG_BYTES = 5 * 1024 * 1024（5 MiB）后，先检查是否已被其他进程旋转，再 renameSync 为 mcp.log.1；
- 所有 I/O 异常被吞掉（catch {}），注释写明 logging must not break tools，即日志是 best-effort，不能影响工具执行。

### 其它代码

- 构建脚本（packages/ai/catalog/generate.ts、scripts/*.ts）和 CLI（packages/ai/src/cli.ts）直接用 console.log / console.error 输出人类可读信息。
- packages/schema/test/bench/candidates.ts 中把 Ajv 的 logger: false 作为编译选项传入，属于第三方库配置，不是本项目日志体系的一部分。
- packages/tui/test/key-tester.ts 中的 KeyLogger 只是 TUI 组件名，并非日志框架。

## 约定与约束（基于代码观察）

- 未强制使用任何日志库：仓库中没有 lint 规则、类型定义或包依赖强制要求使用特定 logger。
- MCP 服务器日志字段约定：level、logger、data 三个字段由 formatMcpLogMessage 的类型守卫与分支逻辑所消费，测试也覆盖了这些字段（见 test/mcp-extension.test.ts 中对 { level: "warning", logger: "db", data: "slow\nquery" } 的断言）。
- MCP 日志文件不可中断业务：write() 方法内整个 try/catch 块为空，任何写入错误都被忽略，这是实现层强加的约束。
- 多进程安全：注释明确要求每条消息同步追加，并在重命名前再次 statSync 校验文件大小，以应对并发进程同时旋转的情况。
- 日志级别：除 MCP 日志外，仓库没有统一的 log level 枚举或分级策略；console.log/warn/error 的使用是随意的，没有按模块或环境切换级别的机制。

## 适用性判断

本仓库存在一个局部的、针对 MCP server 通知的文件日志实现，但整体上没有跨包的日志框架、初始化入口或结构化日志规范，因此该类别的适用范围很窄。