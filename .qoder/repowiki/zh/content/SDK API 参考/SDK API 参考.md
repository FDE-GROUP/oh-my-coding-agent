# SDK API 参考

<cite>
**本文引用的文件**
- [packages/coding-agent/src/index.ts](file://packages/coding-agent/src/index.ts)
- [packages/coding-agent/docs/sdk.md](file://packages/coding-agent/docs/sdk.md)
- [packages/coding-agent/docs/rpc.md](file://packages/coding-agent/docs/rpc.md)
- [packages/coding-agent/src/core/sdk.ts](file://packages/coding-agent/src/core/sdk.ts)
- [packages/coding-agent/src/core/agent-session.ts](file://packages/coding-agent/src/core/agent-session.ts)
- [packages/coding-agent/src/core/session-manager.ts](file://packages/coding-agent/src/core/session-manager.ts)
- [packages/coding-agent/src/modes/index.ts](file://packages/coding-agent/src/modes/index.ts)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能与可靠性](#性能与可靠性)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录：RPC 协议与客户端实现指南](#附录rpc-协议与客户端实现指南)

## 简介
本文件为 Pi TypeScript SDK 的完整 API 参考，面向希望在 Node.js 或 Bun 进程中集成 Pi 的开发者。文档覆盖会话管理、消息处理、工具调用、扩展加载、模型与设置边界、以及 RPC 子进程模式等核心能力，并提供代码级图示、错误处理建议与最佳实践。

SDK 提供两类集成方式：
- 进程内 TypeScript SDK：直接调用 AgentSession、工具工厂、扩展系统等类型化 API。
- RPC 子进程模式：通过 JSONL 协议控制 Pi CLI，适合跨语言、隔离进程或 IDE 集成。

## 项目结构
Pi 的 SDK 入口位于 `@earendil-works/pi-coding-agent` 包中，对外暴露会话创建、工具工厂、扩展系统、会话持久化、模型运行时、设置管理器、RPC 客户端等能力。

```mermaid
graph TB
A["应用代码"] --> B["SDK 入口<br/>packages/coding-agent/src/index.ts"]
B --> C["会话创建<br/>createAgentSession()"]
B --> D["运行模式导出<br/>modes/index.ts"]
C --> E["AgentSession<br/>core/agent-session.ts"]
C --> F["ModelRuntime / SettingsManager<br/>core/sdk.ts"]
E --> G["SessionManager<br/>core/session-manager.ts"]
D --> H["RpcClient / runRpcMode<br/>modes/index.ts"]
```

图表来源
- [packages/coding-agent/src/index.ts:1-503](file://packages/coding-agent/src/index.ts#L1-L503)
- [packages/coding-agent/src/core/sdk.ts:180-482](file://packages/coding-agent/src/core/sdk.ts#L180-L482)
- [packages/coding-agent/src/core/agent-session.ts:409-559](file://packages/coding-agent/src/core/agent-session.ts#L409-L559)
- [packages/coding-agent/src/core/session-manager.ts:43-227](file://packages/coding-agent/src/core/session-manager.ts#L43-L227)
- [packages/coding-agent/src/modes/index.ts:1-17](file://packages/coding-agent/src/modes/index.ts#L1-L17)

章节来源
- [packages/coding-agent/src/index.ts:1-503](file://packages/coding-agent/src/index.ts#L1-L503)
- [packages/coding-agent/docs/sdk.md:1-148](file://packages/coding-agent/docs/sdk.md#L1-L148)

## 核心组件
本节概述 SDK 的主要公共接口与职责。

- 会话生命周期
  - createAgentSession：创建并配置一个 AgentSession，负责模型选择、工具集、资源加载、会话恢复等。
  - AgentSession：封装一次对话的生命周期，包括 prompt、subscribe、abort、waitForIdle、模型切换、思考级别、工具注册、事件流、压缩（compaction）等。
  - SessionManager：会话树与持久化的权威来源，支持分支、标签、上下文编辑、投影构建等。

- 工具与扩展
  - 工具工厂：createBashTool、createReadTool、createWriteTool、createEditTool、createFindTool、createGrepTool、createLsTool、createPowerShellTool、createCodingTools、createReadOnlyTools 等。
  - 扩展系统：ExtensionRunner、InlineExtension、ExtensionFactory、ExtensionContext、ExtensionAPI 等，支持命令、快捷键、UI、工具注入、事件钩子。

- 模型与设置
  - ModelRuntime：统一认证、模型解析、流式请求。
  - SettingsManager：全局与 per-model 设置，如默认工具、重试策略、HTTP/WebSocket 超时、图片处理、思考预算等。

- 运行模式
  - InteractiveMode、PrintMode、RpcClient、runRpcMode：交互式、打印输出、RPC 子进程三种运行模式。

章节来源
- [packages/coding-agent/src/core/sdk.ts:48-148](file://packages/coding-agent/src/core/sdk.ts#L48-L148)
- [packages/coding-agent/src/core/agent-session.ts:266-354](file://packages/coding-agent/src/core/agent-session.ts#L266-L354)
- [packages/coding-agent/src/core/session-manager.ts:43-227](file://packages/coding-agent/src/core/session-manager.ts#L43-L227)
- [packages/coding-agent/src/modes/index.ts:1-17](file://packages/coding-agent/src/modes/index.ts#L1-L17)

## 架构总览
下图展示 SDK 在进程内的典型调用链：应用代码通过 SDK 入口创建会话，会话内部组合 Agent、SessionManager、SettingsManager、ResourceLoader、ModelRuntime，并通过扩展系统注入工具与 UI。

```mermaid
sequenceDiagram
participant App as "应用代码"
participant SDK as "createAgentSession"
participant Sess as "AgentSession"
participant SM as "SessionManager"
participant RT as "ModelRuntime"
participant Ext as "ExtensionRunner"
App->>SDK : 传入 cwd/model/tools/settings 等选项
SDK->>RT : 初始化认证与模型
SDK->>SM : 创建或复用会话存储
SDK->>Sess : 构造 AgentSession(含工具集/扩展/缓存预热)
App->>Sess : subscribe()/prompt()
Sess->>Ext : 扩展钩子(before_tool_call/tool_result/context)
Sess->>RT : 流式请求模型响应
Sess->>SM : 写入消息/状态/压缩条目
Sess-->>App : 事件(message_update/agent_settled/...)
```

图表来源
- [packages/coding-agent/src/core/sdk.ts:191-482](file://packages/coding-agent/src/core/sdk.ts#L191-L482)
- [packages/coding-agent/src/core/agent-session.ts:409-559](file://packages/coding-agent/src/core/agent-session.ts#L409-L559)
- [packages/coding-agent/src/core/session-manager.ts:43-227](file://packages/coding-agent/src/core/session-manager.ts#L43-L227)

## 详细组件分析

### 会话创建与配置：createAgentSession
- 作用
  - 根据选项解析工作目录、Agent 目录、ModelRuntime、SettingsManager、SessionManager、ResourceLoader。
  - 从已有会话恢复模型与思考级别；若无则按设置与 provider 默认值选择初始模型。
  - 计算初始工具集（allowlist/denylist、MCP 工具保留策略）。
  - 包装 convertToLlm 以支持“屏蔽图片”等安全策略。
  - 组装 Agent、ExtensionRunner、CacheWarmer，并返回 { session, extensionsResult, modelFallbackMessage }。

- 关键参数（CreateAgentSessionOptions）
  - cwd：工作目录，影响资源发现、工具路径、会话分组。
  - agentDir：全局配置目录，默认 ~/.pi/agent。
  - modelRuntime：统一认证与模型运行时。
  - model/thinkingLevel/scopedModels：模型与思考级别选择。
  - noTools/tools/excludeTools/customTools：工具白名单/黑名单/自定义工具。
  - resourceLoader：资源加载器（扩展、技能、提示模板、主题、上下文文件）。
  - sessionManager/settingsManager：会话与设置管理器。
  - sessionStartEvent：扩展启动元数据。

- 返回值（CreateAgentSessionResult）
  - session：AgentSession 实例。
  - extensionsResult：扩展加载结果。
  - modelFallbackMessage：当无法恢复原模型时的提示。

- 行为要点
  - 若 tools 仅包含 +name/-name 形式，视为对 defaultTools 的增量修改而非替换。
  - MCP 工具在未显式排除时通常保留给 codemode/tool_search 使用。
  - 可注入 before_provider_headers/before_provider_request/after_provider_response/provider_stream_event 扩展钩子。

章节来源
- [packages/coding-agent/src/core/sdk.ts:48-148](file://packages/coding-agent/src/core/sdk.ts#L48-L148)
- [packages/coding-agent/src/core/sdk.ts:191-482](file://packages/coding-agent/src/core/sdk.ts#L191-L482)

### 会话对象：AgentSession
- 职责
  - 管理一次对话的状态与生命周期：消息队列、工具执行、模型切换、思考级别、压缩、重试、分支与会话树。
  - 订阅与分发事件：message_start/update/end、tool_execution_*、queue_update、compaction_*、auto_retry_*、summarization_retry_*、bash_execution_update、agent_end/settled 等。
  - 与扩展系统集成：before/after tool call、context transform、UI 交互、命令与快捷键。

- 主要方法与属性
  - prompt(options)：发送用户消息，支持模板展开、图片附件、流式行为（steer/followUp）、source。
  - steer()/followUp()：在当前运行后插入引导或后续消息。
  - abort()/waitForIdle()：中止当前操作或等待空闲。
  - subscribe(listener)：订阅会话事件。
  - setModel()/cycleModel()/setThinkingLevel()/getAvailableThinkingLevels()：模型与思考级别管理。
  - setActiveToolsByName()/getActiveToolNames()：动态启用/禁用工具。
  - getMessages()/getLastAssistantText()：读取会话消息与最后助手文本。
  - dispose()：释放资源、断开扩展、移除监听。

- 事件类型（部分）
  - message_start/message_update/message_end
  - tool_execution_start/tool_execution_update/tool_execution_end
  - queue_update
  - compaction_start/compaction_end
  - auto_retry_start/auto_retry_end
  - summarization_retry_scheduled/summarization_retry_attempt_start/summarization_retry_finished
  - bash_execution_update
  - agent_end/agent_settled

- 工具与扩展
  - 通过 ExtensionRunner 注入 before/after tool call、tool_result、context transform 等钩子。
  - 支持嵌套工具调用（ctx.executeTool），携带 parentToolCallId。

```mermaid
classDiagram
class AgentSession {
+prompt(options)
+steer(text)
+followUp(text)
+abort()
+waitForIdle()
+subscribe(listener)
+setModel(model, options)
+cycleModel(direction)
+setThinkingLevel(level, options)
+getAvailableThinkingLevels()
+setActiveToolsByName(names)
+getActiveToolNames()
+getMessages()
+getLastAssistantText()
+dispose()
}
class SessionManager {
+buildSessionContext()
+appendThinkingLevelChange(level)
+appendModelChange(provider, modelId)
+getBranch()
+getTree()
}
class ExtensionRunner {
+emit(event)
+emitToolCall(ctx)
+emitToolResult(ctx)
+emitContext(messages)
}
AgentSession --> SessionManager : "读写会话树"
AgentSession --> ExtensionRunner : "扩展钩子"
```

图表来源
- [packages/coding-agent/src/core/agent-session.ts:266-354](file://packages/coding-agent/src/core/agent-session.ts#L266-L354)
- [packages/coding-agent/src/core/agent-session.ts:409-559](file://packages/coding-agent/src/core/agent-session.ts#L409-L559)
- [packages/coding-agent/src/core/session-manager.ts:43-227](file://packages/coding-agent/src/core/session-manager.ts#L43-L227)

章节来源
- [packages/coding-agent/src/core/agent-session.ts:266-354](file://packages/coding-agent/src/core/agent-session.ts#L266-L354)
- [packages/coding-agent/src/core/agent-session.ts:409-559](file://packages/coding-agent/src/core/agent-session.ts#L409-L559)

### 会话持久化与树：SessionManager
- 作用
  - 维护会话的追加式条目树（JSONL），支持分支、标签、上下文编辑、摘要与压缩。
  - 提供投影构建：将原始条目转换为模型可见的消息序列，考虑压缩与上下文编辑。
  - 提供会话发现、最近会话查找、头信息读取等实用方法。

- 关键数据结构
  - SessionEntry：消息、思考级别变更、模型变更、用量、压缩、分支摘要、自定义条目、自定义消息、上下文编辑、标签、会话信息等。
  - SessionProjection：包含 entries/messages/thinkingLevel/model 的投影。
  - SessionTreeNode：带 label 的树节点视图。

- 常用函数
  - buildSessionContext/buildSessionProjection/buildContextEntries：构建最终上下文。
  - sessionEntryToContextMessages：单条条目到消息的转换。
  - loadEntriesFromFile/findMostRecentSession/getDefaultSessionDir：文件与目录操作。

```mermaid
flowchart TD
Start(["读取会话文件"]) --> Parse["逐行解析 JSONL 条目"]
Parse --> Validate{"是否有效头部?"}
Validate --> |否| Skip["跳过或报错"]
Validate --> |是| Migrate["迁移至最新版本"]
Migrate --> BuildPath["构建当前分支路径"]
BuildPath --> ApplyCompaction["应用最新压缩检查点"]
ApplyCompaction --> Project["生成投影 messages"]
Project --> End(["返回 SessionContext/Projection"])
```

图表来源
- [packages/coding-agent/src/core/session-manager.ts:350-370](file://packages/coding-agent/src/core/session-manager.ts#L350-L370)
- [packages/coding-agent/src/core/session-manager.ts:476-584](file://packages/coding-agent/src/core/session-manager.ts#L476-L584)
- [packages/coding-agent/src/core/session-manager.ts:628-670](file://packages/coding-agent/src/core/session-manager.ts#L628-L670)

章节来源
- [packages/coding-agent/src/core/session-manager.ts:43-227](file://packages/coding-agent/src/core/session-manager.ts#L43-L227)
- [packages/coding-agent/src/core/session-manager.ts:476-584](file://packages/coding-agent/src/core/session-manager.ts#L476-L584)

### 工具与扩展
- 工具工厂
  - Bash/PowerShell：命令行执行与输出累积。
  - Read/Write/Edit：文件读取、写入与差异编辑。
  - Find/Grep/Ls：文件搜索与列表。
  - CodingTools/ReadOnlyTools：高级编码与只读工具集合。
  - withFileMutationQueue：文件写操作的串行化队列。

- 扩展系统
  - InlineExtension/ExtensionFactory：定义内联或外部扩展。
  - ExtensionContext/ExtensionAPI：扩展运行上下文与可用 API。
  - ExtensionRunner：事件分发、命令/快捷键/UI 交互、工具包装。
  - 常见事件：tool_call、tool_result、before_provider_headers、before_provider_request、after_provider_response、provider_stream_event、session_start 等。

章节来源
- [packages/coding-agent/src/core/sdk.ts:135-148](file://packages/coding-agent/src/core/sdk.ts#L135-L148)
- [packages/coding-agent/src/index.ts:53-221](file://packages/coding-agent/src/index.ts#L53-L221)

### 运行模式与 RPC
- 运行模式
  - InteractiveMode：交互式终端界面。
  - PrintMode：打印模式，适合脚本化输出。
  - RpcClient/runRpcMode：RPC 子进程模式，通过 JSONL 协议控制 Pi。

- RPC 协议要点
  - 记录族：stdin 命令、stdout response、stdout 会话事件、双向 extension_ui 记录。
  - 帧格式：严格 JSONL，LF 分隔，避免 Unicode 换行符误判。
  - 关联 ID：命令可选 id，response 重复该 id；bash_execution_update 可携带命令 id。
  - 生命周期：prompt 成功仅代表接受/排队/被扩展处理；需等待 agent_settled 表示不再自动继续。
  - 错误：失败 response 含 success:false；解析错误无 request id；stderr 不解析为协议数据。
  - 关闭：EOF/SIGTERM/SIGHUP 优雅关闭；二次信号立即退出。

```mermaid
sequenceDiagram
participant Client as "RPC 客户端"
participant Process as "Pi CLI(RPC)"
participant Mode as "runRpcMode"
participant Session as "AgentSession"
Client->>Process : stdin : {"id" : "req-1","type" : "prompt",...}
Process->>Mode : 解析命令
Mode->>Session : prompt()/steer()/followUp()
Session-->>Mode : 事件(message_update/agent_end/agent_settled)
Mode-->>Client : stdout : response + 事件(JSONL)
Client->>Process : EOF/SIGTERM
Process->>Mode : 优雅关闭
```

图表来源
- [packages/coding-agent/docs/rpc.md:1-196](file://packages/coding-agent/docs/rpc.md#L1-L196)
- [packages/coding-agent/src/modes/index.ts:1-17](file://packages/coding-agent/src/modes/index.ts#L1-L17)

章节来源
- [packages/coding-agent/docs/rpc.md:1-196](file://packages/coding-agent/docs/rpc.md#L1-L196)
- [packages/coding-agent/src/modes/index.ts:1-17](file://packages/coding-agent/src/modes/index.ts#L1-L17)

## 依赖关系分析
SDK 对外导出大量类型与工厂，内部由 core 模块组织。以下图展示主要导出与依赖关系。

```mermaid
graph LR
IDX["index.ts 导出"] --> SDK["core/sdk.ts"]
IDX --> MODES["modes/index.ts"]
SDK --> AS["core/agent-session.ts"]
SDK --> SM["core/session-manager.ts"]
AS --> EXT["extensions/*"]
AS --> TOOLS["tools/*"]
AS --> SM
```

图表来源
- [packages/coding-agent/src/index.ts:1-503](file://packages/coding-agent/src/index.ts#L1-L503)
- [packages/coding-agent/src/core/sdk.ts:1-482](file://packages/coding-agent/src/core/sdk.ts#L1-L482)
- [packages/coding-agent/src/core/agent-session.ts:1-800](file://packages/coding-agent/src/core/agent-session.ts#L1-L800)
- [packages/coding-agent/src/core/session-manager.ts:1-800](file://packages/coding-agent/src/core/session-manager.ts#L1-L800)

## 性能与可靠性
- 模型与网络
  - 通过 SettingsManager 配置 HTTP/WebSocket 超时、重试次数与延迟上限。
  - 支持 before_provider_headers/before_provider_request/after_provider_response/provider_stream_event 扩展钩子，便于鉴权、日志与遥测。

- 上下文与缓存
  - CacheWarmer 针对选定的模型与上下文进行预热，减少冷启动开销。
  - 会话投影与压缩（compaction）控制上下文大小，避免溢出。

- 工具与 I/O
  - withFileMutationQueue 串行化文件写操作，避免并发冲突。
  - 图片内容可按设置自动调整尺寸或被屏蔽，降低传输与成本。

[本节为通用指导，无需特定文件引用]

## 故障排查指南
- 认证与模型
  - 若未找到 API Key 或 OAuth 过期，会抛出明确错误并给出登录指引。
  - 无法恢复会话中的模型时，返回 modelFallbackMessage 提示。

- 会话与持久化
  - 会话文件损坏或头部扫描超限会被跳过或报错，不影响其他会话发现。
  - 旧版本会话会自动迁移至当前版本。

- RPC 模式
  - 确保使用 LF 分隔的 JSONL，不要使用 readline 的 Unicode 换行分割。
  - 区分 command response 与 session event；stderr 不是协议数据。
  - 优雅关闭流程：先 EOF 或 SIGTERM，必要时再发第二次信号强制退出。

章节来源
- [packages/coding-agent/src/core/agent-session.ts:565-603](file://packages/coding-agent/src/core/agent-session.ts#L565-L603)
- [packages/coding-agent/src/core/session-manager.ts:610-738](file://packages/coding-agent/src/core/session-manager.ts#L610-L738)
- [packages/coding-agent/docs/rpc.md:50-98](file://packages/coding-agent/docs/rpc.md#L50-L98)

## 结论
Pi TypeScript SDK 提供了完整的会话、工具、扩展与模型运行时抽象，既适合在 Node.js/Bun 中直接集成，也支持通过 RPC 子进程模式进行跨语言控制。通过 SessionManager 的追加式条目树与投影机制，SDK 在保证可扩展性的同时，兼顾了上下文压缩、分支管理与持久化。结合扩展系统与工具工厂，开发者可以灵活定制工具、UI 与工作流。

[本节为总结性内容，无需特定文件引用]

## 附录：RPC 协议与客户端实现指南
- 启动方式
  - 使用 pi --mode rpc --no-session 启动 RPC 模式，配合 --provider/--model/--name/--no-session/--session-dir 等参数。

- 协议规范
  - 记录族：命令（stdin）、response（stdout）、会话事件（stdout）、extension_ui（双向）。
  - 帧格式：严格 JSONL，LF 分隔；避免 Unicode 换行符作为边界。
  - 关联 ID：命令可选 id，response 重复 id；bash_execution_update 可携带命令 id。
  - 生命周期：prompt 成功不代表完成；等待 agent_settled 表示不再自动继续。
  - 错误：失败 response 含 success:false；解析错误无 request id；stderr 非协议数据。
  - 关闭：EOF/SIGTERM/SIGHUP 优雅关闭；第二次信号立即退出。

- 客户端实现要点
  - 使用二进制管道读取 stdout，按 LF 拆分；写入 stdin 时遵循背压。
  - 先安装事件监听，再发送 prompt，避免丢失快速完成的事件。
  - 使用 RpcClient 或自行实现 JSONL 收发与 ID 关联。

章节来源
- [packages/coding-agent/docs/rpc.md:1-196](file://packages/coding-agent/docs/rpc.md#L1-L196)
- [packages/coding-agent/src/modes/index.ts:1-17](file://packages/coding-agent/src/modes/index.ts#L1-L17)