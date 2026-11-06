# 系统总览

把前 16 篇笔记串成一条线。目标：形成一张可检索的整体图。

## 1. 一句话

Pi 是一个**分层 harness**：

- 稳定内核 = transcript + agent loop + 工具管线；
- 产品层 = 模式（TUI / RPC / JSON / print）；
- 能力层 = 扩展、包、MCP、codemode；
- 边缘层 = provider 适配器、终端、平台差异。

## 2. 五个不变量

理解 Pi 之后，最值得记住的是这五条。它们解释了大部分“为什么这样设计”。

### 不变量一：transcript 是唯一事实源

- 会话是追加写的 JSONL 树，entry 有 `id` / `parentId`；
- 分支 = 移动 leaf，历史不修改、不删除；
- 压缩、编辑、分支摘要都是新增 entry；
- 模型上下文由 projection 从 transcript 重建。

推论：任何“状态”都应该能落到 entry 里，而不是只存在内存。

### 不变量二：prompt 是增量流

- 首条 system message 是基础 prompt + 初始工具；
- 之后的 system message 用 `content` 追加、`sections` 按名替换、`toolsAdded` /
  `toolsRemoved` 改工具；
- 重放所有 system message 得到当前 prompt 和工具集。

推论：改 prompt 是追加差异，不是重建字符串；这是缓存友好的前提。

### 不变量三：所有工具调用走同一条管线

```
prepare → validate → beforeToolCall → execute → afterToolCall → result
```

模型直接调用、codemode 嵌套调用、MCP 工具、扩展注册的工具，全部一样。
`tool_call` / `tool_result` 钩子和权限检查因此自动覆盖所有入口。

### 不变量四：事件流是唯一的 UI 契约

`AgentSession` 发出事件，`interactive` / `rpc` / `json` / `print` 只是不同的消费者。
Agent 不知道 UI 的存在。

### 不变量五：provider 差异只在边缘

核心只认 `AssistantMessageEventStream`。缓存、线程、伪装 headers、strict 降级、
错误映射都在 `api/*.ts` 里，通过 `model.compat` 暴露能力标志。

另外两条次级的：

- **能力是组合出来的**：provider、工具、扩展、包都是运行时拼装。
- **默认懒加载**：MCP runtime、codemode sandbox、模型目录、工具实现都按需加载。

## 3. 一次请求的完整路径

```
[启动]
cli.ts → main()
  → 3 个 SettingsManager（bootstrap / startup / runtime）
  → 选择 session（new/continue/resume/fork）
  → 项目信任
  → createAgentSessionServices()
      ModelRuntime + SettingsManager + ResourceLoader
  → createAgentSession()
      Agent + AgentSession（六层钩子）

[输入]
prompt(text)
  → 扩展命令？
  → input 钩子
  → /skill: /template 展开
  → 正在流式？入 steer/followUp 队列
  → 无模型/无认证？报错
  → _prepareRun()
      压缩检查
      before_agent_start（扩展可改 prompt/tools）
      prompt/tool loadout（差异补丁）
      构造 user message

[运行]
agentLoop()
  → prepareRequest（用 session projection 重建上下文）
  → streamFn → ModelRuntime → provider adapter
  → assistant message
  → tool calls
      beforeToolCall（扩展 tool_call）
      execute
      afterToolCall（扩展 tool_result）
  → tool results
  → finishTurn（turn_end 边界）
  → agent_end
  → 重试 / 压缩检查
  → agent_before_settle（扩展可 continue）
  → agent_settled

[落盘]
_handleAgentEvent()
  → message_end：appendMessage / appendCustomMessageEntry
  → compaction：appendCompaction
  → 溢出恢复：appendContextEdit(null)
  → 扩展状态：appendCustomEntry
```

## 4. 状态存在哪里

| 状态 | 位置 |
|---|---|
| 全局/项目配置 | `~/.pi/agent/settings.json`、`<cwd>/.pi/settings.json` |
| 凭据 | `~/.pi/agent/auth.json` |
| Provider 覆盖 | `models.json` |
| 模型目录缓存 | `models-store.json` |
| 会话 | `~/.pi/agent/sessions/--<cwd>--/<id>.jsonl` |
| codemode store | 会话里的 `codemode-store` custom entry |
| 扩展状态 | 会话里的 `custom` entry，或扩展内存 |
| 虚拟模型路由状态 | `pi.virtual-model-state` custom entry |
| 工具/扩展/技能/模板 | `.pi/`、`~/.pi/agent/`、npm/git 包 |
| Agent 内存 | `Agent.state.messages` / `tools` / `model` |

关键点：**会话文件是唯一需要备份的东西**。其他都是可重建的配置或缓存。

## 5. 扩展能介入的五个层面

| 层面 | 事件/API | 能做什么 |
|---|---|---|
| 启动/信任 | `project_trust`、`session_start`、`resources_discover` | 决定加载什么 |
| 请求 | `context`、`context_with_system`、`before_provider_request`、`before_provider_headers` | 改上下文、改 payload、改 headers |
| 工具 | `tool_call`、`tool_result`、`registerTool` | 拦截、改写、新增工具 |
| 回合/收尾 | `turn_end`、`agent_before_settle` | 追加条目、请求继续 |
| UI | `ctx.ui`、renderers、widgets、commands | 对话框、状态、渲染 |

最常用的三个缝：

- `tool_call`：权限、审计、参数改写；
- `before_agent_start`：注入 prompt、切换工具；
- `agent_before_settle`：收敛检查、强制继续。

## 6. 哪些是稳定的，哪些是易变的

**相对稳定（适合依赖）**

- `TranscriptContext` / `SystemMessage` / `sections` 协议；
- `AgentTool` 的 `execute` 契约；
- `AssistantMessageEventStream` 事件类型；
- `SessionEntry` 的 JSONL 格式（有版本迁移）；
- `StreamFn` 签名；
- 会话投影与 `append*` 方法。

**相对易变（避免深度耦合）**

- 扩展事件的数量和名称（30+，还在增长）；
- `model.compat` 的具体标志；
- MCP 的 exposure / 管理器行为；
- TUI 组件内部实现；
- provider 的私有兼容逻辑。

如果要在上面构建东西，**优先依赖“数据格式 + 窄接口”，而不是“完整事件面”**。

## 7. 几个设计张力

这些不是缺陷，是有意的取舍。

1. **极简内核 vs 产品能力**：没有 sub-agent、没有 plan mode，靠扩展补。
2. **prompt 增量 vs 简单性**：缓存友好，但理解和调试成本高。
3. **追加写 vs 可编辑上下文**：`context_edit` 提供了受控的可变性，但不改 system
   prompt 和工具声明。
4. **工具策略 vs 安全边界**：`tool_call` 是策略层，不是沙箱；路径没有限制。
5. **扩展能力 vs API 稳定性**：扩展能改的东西越多，内核越难演进。
6. **懒加载 vs 首 token 延迟**：MCP 只等 direct 工具，其余按需。

## 8. 按问题检索

| 问题 | 看哪篇 |
|---|---|
| 模型到底看到了什么？ | `09-system-prompt.md` |
| 为什么改了 prompt 没生效？ | `09`、`05` |
| 为什么工具调用被拦了？ | `03`、`06` |
| 为什么上下文被压缩了？ | `10` |
| 为什么换模型后 thinking 丢了？ | `16` |
| 为什么 MCP 工具不出现？ | `14` |
| 为什么扩展没加载？ | `06`、`07` |
| 为什么 UI 没更新？ | `13` |
| 为什么终端渲染错位？ | `15` |
| 为什么认证失败？ | `11` |
| 为什么工具输出被截断？ | `12` |

## 9. 推荐阅读顺序

如果重新读一遍，我会按这个顺序：

1. `03-critical-path.md`：先看一次完整调用链；
2. `08-boot-and-session.md`：再看系统怎么装配；
3. `04-session-transcript.md`：理解事实源；
4. `05-provider-stream.md`：理解 prompt 增量和缓存；
5. `09-system-prompt.md`：理解模型看到什么；
6. `10-compaction.md`：理解长会话；
7. `11-model-runtime.md`：理解 provider 和认证；
8. `12-tools.md`：理解工具行为；
9. `06-extension-loading.md` + `07-package-manager.md`：理解扩展生态；
10. `14-mcp-codemode.md`：理解工具生态；
11. `13-modes.md` + `15-tui.md`：理解 UI；
12. `16-provider-adapters.md`：理解 provider 边缘。

## 10. 还没覆盖的部分

- `packages/mcp` 内部：JSON-RPC、stdio/HTTP/pipe transport、OAuth 流程；
- `packages/schema`：TypeBox 替代品；
- TUI 的 editor、markdown、latex、镜像编码；
- 其余 provider；
- `packages/evals` 与 benchmark；
- `apps/p2`（已删除）。
