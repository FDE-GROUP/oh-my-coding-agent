# Modes：RPC、Print、Interactive

核心目录：`modes/`。
三种模式共享同一个 `AgentSessionRuntime`，区别只在**如何消费 `AgentSession` 的事件流**。

## 1. 模式选择

`main.ts` 的 `resolveAppMode()`：

| 条件 | 模式 |
|---|---|
| `--mode rpc` | rpc |
| `--mode json` | json |
| `--print` 或 stdin/stdout 非 TTY | print |
| 默认 | interactive |

## 2. Print / JSON

`runPrintMode(runtime, { mode, messages, initialMessage, initialImages })`：

- `text`：只输出最后一条 assistant 消息的文本；
- `json`：把每个 `AgentSessionEvent` 写成一行 JSON。

流程：

```
rebindSession()
  → session.bindExtensions({ mode: "json" | "print", ... })
  → session.subscribe(event => json 模式写 stdout)
  → prompt(initialMessage)
  → 依次 prompt(messages)
  → text 模式读取最后一条 assistant 消息
  → dispose
```

退出码：

- `error` / `aborted` → 1，并输出 errorMessage；
- `length` → 1，提示输出被截断；
- 其他 → 0。

信号处理：SIGTERM / SIGHUP 第一次触发 dispose，第二次强制退出。
dispose 完成前保留信号处理器，避免在清理中途被杀。

JSON 模式还订阅了 agent 事件，在每个事件后等待 stdout 背压。

## 3. JSON 事件的形状

`toJsonEvent()` 只对 `message_update` 做转换：

- 去掉累积的 `partial` 快照；
- 保留 `usage`；
- `toolcall_start` 额外补上 `id` 和 `toolName`。

原因：`message_start` 提供初始消息，delta 增量构建，`message_end` 提供最终
消息。累积 `partial` 在流式事件里是重复数据。

## 4. RPC 模式

`runRpcMode(runtime)` 返回 `Promise<never>`，进程常驻。

### 协议

```
stdin  ：JSON 命令，可选 id
stdout ：JSON 响应 + AgentSessionEvent 事件
```

JSONL 使用严格的 LF 分帧，**不用 Node readline**，因为 readline 会在
JSON 字符串内部的 U+2028 / U+2029 上也分行。

### 命令面

| 类别 | 命令 |
|---|---|
| Prompt | `prompt` / `steer` / `follow_up` / `abort` / `clear_queue` |
| Session | `new_session` / `switch_session` / `fork` / `clone` / `get_entries` / `get_tree` / `get_messages` / `set_session_name` / `export_html` |
| Model | `set_model` / `cycle_model` / `get_available_models` |
| Thinking | `set_thinking_level` / `cycle_thinking_level` / `get_available_thinking_levels` |
| Queue | `set_steering_mode` / `set_follow_up_mode` |
| Compaction | `compact` / `set_auto_compaction` |
| Retry | `set_auto_retry` / `abort_retry` |
| Bash | `bash` / `abort_bash` |
| State | `get_state` / `get_session_stats` / `get_last_assistant_text` |
| Commands | `get_commands` |

`prompt` 的特殊之处：它立即开始处理，但**只在 preflight 成功后**才发
`response`。排队和立即处理的 prompt 都算成功。

### 扩展 UI

RPC 模式把 `ExtensionUIContext` 映射成请求/响应：

```
extension_ui_request  → select / confirm / input / editor /
                        notify / setStatus / setWidget /
                        setTitle / set_editor_text
extension_ui_response → value / confirmed / cancelled
```

带 `id` 的请求会挂在 `pendingExtensionRequests`，等待客户端响应。
`notify`、`setStatus`、`setTitle` 是 fire-and-forget。

不支持的能力（自定义组件、主题切换、footer/header 工厂、终端原始输入）
会显式返回空实现或错误。

### 生命周期

- `setRebindSession()` 在 `/new`、`/resume`、`/fork`、`/switch` 后重新订阅；
- 扩展请求 shutdown 时，要等输入已连接、没有活动命令、session 空闲；
- stdin EOF → `shutdown()`；
- 每个响应写完后等待 stdout 背压。

## 5. Interactive 模式

`interactive-mode.ts` 约 7,225 行，是三种模式里最大的。

### 构造

```
createInteractiveTui()
  → TuiMainScreen 或 TuiAltScreen
创建组件树：
  headerContainer
  loadedResourcesContainer
  chatContainer
  pendingMessagesContainer
  statusContainer
  widgetContainerAbove / Below
  editorContainer（CustomEditor）
  footerContainer（FooterComponent）
```

`fullscreen` 和 `regular` 共用同一棵组件树，只是 renderer 不同。
`ChatViewport` 负责布局：上方 `ScrollView` 放 transcript，下方固定 dock 放
pending messages、status、widgets、editor、footer。

### init()

```
registerSignalHandlers()
mountInteractiveTui()
ui.start()
等待终端颜色
构建 header
ensureTool("fd") / ensureTool("rg")
setupKeyHandlers()
setupEditorSubmitHandler()
rebindCurrentSession()   // 绑定扩展
renderInitialMessages()
主题 watcher / git 分支 watcher
加载语法高亮
```

关键顺序：**先 mount TUI，再初始化扩展**，这样 `session_start` 里的
扩展对话框已经有 UI 可用。

### run()

```
init()
后台刷新模型目录
检查新版本 / 包更新 / tmux 键盘设置
显示启动诊断、迁移警告、模型回退消息、崩溃提示
处理 initialMessage / initialMessages
进入输入循环
```

### 输入

`getUserInput()`：

- 先看 `pendingUserInputs` 队列；
- 否则等待 `onInputCallback`，由 editor 的 submit handler 触发。

编辑器的 submit 不是直接 `prompt()`，而是进入 `handleUserInput`，处理
`/command`、`!bash`、`!!bash`、`/skill:`、模板展开等。

### 事件消费

`subscribeToAgent()` 订阅 `session.subscribe`，所有事件进入 `handleEvent()`：

| 事件 | UI 行为 |
|---|---|
| `agent_start` | 清空 pending tools，恢复 escape 处理器 |
| `turn_start` | 终端进度、working 指示器 |
| `queue_update` | 更新待发送消息显示 |
| `entry_appended` | custom entry / cache warm / custom message / compaction |
| `session_info_changed` | 更新终端标题 |
| `thinking_level_changed` | 更新 footer 和编辑器边框 |
| `message_start` | 创建 streaming 组件 |
| `message_update` | 更新 assistant 文本，按 toolCall 创建 ToolExecutionComponent |
| `message_end` | 完成消息；错误时把 pending tools 标记为错误 |
| `tool_execution_start/update/end` | 创建、更新、完成工具组件 |
| `agent_end` | 清空 streaming 和 pending tools |
| `agent_settled` | 检查 shutdown 请求 |
| `compaction_start/end` | 显示压缩状态；完成后重建聊天视图 |
| `auto_retry_start/end` | 重试指示器和 escape 取消 |
| `summarization_retry_*` | 压缩/分支摘要的重试状态 |

**压缩完成会重建整个聊天视图**：从 `sessionManager.buildContextEntries()`
重新渲染，再插入一条 compaction summary 消息。它不是增量更新。

### 扩展 UI

- 对话框：放在 editor slot，`pushExtensionDialog()` 管理栈；
- widget：`setWidget()` 渲染在 editor 上方或下方；
- header / footer：扩展可以替换内置组件；
- 终端输入：`onTerminalInput()` 订阅原始输入；
- 主题：扩展可以注册主题，`InteractiveThemeController` 负责切换。

### 关闭

`shutdown()`：

- 交互退出：先 `stop()` TUI，再 `runtimeHost.dispose()`，最后打印
  resume 命令；
- 信号退出：先 dispose，再 drain input，再 stop，避免扩展清理写终端；
- 第二次信号才强制 `process.exit`。

## 6. 三种模式的对比

| | print | rpc | interactive |
|---|---|---|---|
| 输入 | argv / stdin | JSONL stdin | 编辑器 |
| 输出 | 最终文本 / JSON 事件 | JSON 响应 + 事件 | TUI 组件 |
| 扩展 UI | 无 | RPC 请求 | 原生命令 |
| 生命周期 | 单次 | 常驻 | 常驻 |
| 背压 | 仅 JSON | 每个事件 | 渲染循环 |

## 7. 设计观察

1. **事件流是唯一的 UI 契约**。三种模式都只是不同的消费者。
2. **`message_update` 是高频事件**：TUI 原地更新组件，JSON 去掉累积快照，
   RPC 等待 stdout 背压。
3. **压缩会重建视图**，因为上下文边界变了，增量更新不可靠。
4. **扩展 UI 是模式相关的**：同一套 `ExtensionUIContext` 在 TUI、RPC、
   print 下有不同的实现。
5. **关闭顺序是有讲究的**：先停 UI 再 dispose，避免扩展清理时重绘终端。
6. **RPC 的 JSONL 不用 readline**，因为 JSON 字符串可以包含 U+2028。

## 8. 尚未细读

- `rpc-client.ts`（617 行）：RPC 客户端封装，协议相同。
- `interactive-mode.ts` 的 7,225 行中，只读了结构、init/run、事件处理、
  输入与关闭；未逐个读组件（editor、footer、dialog、renderer）。
- `interactive/` 下的 bug-report、session-share、external-editor 等外围功能。
- `packages/tui`（45k 行）：终端渲染库本身。
