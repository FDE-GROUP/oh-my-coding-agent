# 验证记录

读代码之后，用真实运行来确认“理解的和系统实际做的是同一件事”。

## 环境限制

- `~/.pi/agent/auth.json` 没有凭据；
- 没有本地模型（无 Ollama）；
- 没有设置 `PI_PROVIDER` / `PI_MODEL`。

所以使用仓库自带的 **faux provider**：它返回脚本化的 assistant 消息，能确定性
地驱动完整的 `AgentSession`、工具执行、持久化和投影，且不产生费用。

脚本在 `docs/explains/validation/`，从仓库根目录运行：

```bash
node --experimental-strip-types --no-warnings docs/explains/validation/validate-events.ts
node --experimental-strip-types --no-warnings docs/explains/validation/validate-projection.ts
node --experimental-strip-types --no-warnings docs/explains/validation/validate-tool-call.ts
```

## 验证 1：事件流、持久化、投影

`validate-events.ts`：

1. 创建一个临时 workspace，写入 `hello.txt`；
2. 用 `SessionManager.create()` 持久化到真实 JSONL；
3. 脚本化模型：第一次返回 `read` 工具调用，第二次返回最终文本；
4. 执行一次 `session.prompt()`；
5. 打印事件流、agent state、JSONL entry、projection。

### 实际事件流

```
agent_start
turn_start
message_start/end  system
message_start/end  user
message_start      assistant
message_update x7  toolCall(read)
message_end        assistant
tool_execution_start  read
tool_execution_end    read
message_start/end  toolResult
turn_end
turn_start
message_start      assistant
message_update x5  text
message_end        assistant
turn_end
agent_end
agent_settled
```

### 对照结论

| 预期 | 实际 |
|---|---|
| tool call 前有 assistant `message_end` | 是 |
| 工具执行在 `message_end` 之后 | 是 |
| 工具结果作为 `toolResult` 消息重新进入上下文 | 是 |
| 第二轮 turn 在工具结果之后 | 是 |
| 最终有 `agent_end` 和 `agent_settled` | 是 |

### 持久化

JSONL 实际内容：

```
session
message system
message user
message assistant
message toolResult
message assistant
```

与 `AgentSession._handleAgentEvent()` 的 `message_end` 分支一致：每条消息一个
`message` entry，header 一条。

### 投影

`buildSessionProjection()` 的输出与 `agent.state.messages`：

```
length=true roles=true text=true
```

这确认了：**请求上下文确实由 session projection 重建，而不是直接使用 agent
内存里的数组**。两者在这一轮恰好一致，因为还没有 compaction 或 context_edit。

## 验证 2：context_edit

`validate-projection.ts` 第一段：

1. 普通 prompt 一次；
2. 找到 user entry；
3. `appendContextEdit(userEntryId, { content: "edited prompt" })`；
4. 重新构建 projection。

结果：

```
projection before: "original prompt"
projection after:  "edited prompt"
stored entry:       "original prompt"
entries:            message, message, message, context_edit
```

确认：

- `context_edit` 是追加的，不修改原 entry；
- projection 应用编辑后的内容；
- JSONL 仍保留原始消息。

这验证了“追加式 amend”的行为。

## 验证 3：compaction

`validate-projection.ts` 第二段：

1. `keepRecentTokens: 1`，让切点尽量靠后；
2. 两轮 prompt；
3. 脚本化两个摘要响应（split turn 需要 history + turn prefix 两次调用）；
4. `await session.compact()`。

结果：

```
entries: message x5, compaction
firstKeptEntryId: <id>
summary: "## Goal\nSummarized history.\n\n---\n\n**Turn..."
systemMessage: present
projection roles: system, compactionSummary, assistant
first message role: system
has compactionSummary: true
projection entries: compaction, message
```

确认：

- compaction entry 追加到 JSONL；
- `firstKeptEntryId` 指向保留区间；
- split turn 时摘要合并 history + turn prefix；
- `CompactionEntry.systemMessage` 存在，投影时作为第一条 system message；
- 投影顺序是 system（压缩边界的 prompt 快照）+ compactionSummary + 保留的消息。

这正是 `10-compaction.md` 里描述的机制：**prompt 和工具状态随 compaction 一起
快照，压缩后不会丢**。

## 验证 4：tool_call / tool_result / 嵌套调用

`validate-tool-call.ts`：

1. 注册一个最小扩展：
   - `tool_call` 记录所有调用；
   - 阻断写入 `blocked.txt`；
   - `tool_result` 改写写入 `allowed.txt` 的结果；
2. 注册一个 `run_tools` 工具，内部调用 `ctx.executeTool("echo")`；
3. 脚本化四次响应：
   - 写 `blocked.txt`
   - 写 `allowed.txt`
   - 调用 `run_tools`
   - 最终回答。

实际输出：

```
=== tool_call HANDLER ===
write parent=top
write parent=top
run_tools parent=top
echo parent=tool:...

=== tool_result HANDLER ===
write parent=top isError=false
echo parent=tool:... isError=false
run_tools parent=top isError=false

=== FILES ===
blocked.txt exists: false
allowed.txt exists: true

=== TRANSCRIPT TOOL RESULTS ===
write isError=true text="blocked by validation extension"
write isError=false text="rewritten by tool_result hook"
run_tools isError=false text="run_tools -> echo: nested"

=== FINAL ASSISTANT ===
done
```

确认：

- `tool_call` 对顶层 `write` 和 `run_tools` 都触发；
- 返回 `{ block: true }` 后工具不执行，文件没有创建，模型收到错误结果；
- `tool_result` 可以改写结果内容；
- **嵌套 `echo` 调用也经过 `tool_call` / `tool_result`**，并且带 `parentToolCallId`；
- 嵌套调用不产生独立的 transcript tool result，只出现在父工具结果里。

这直接验证了最初的核心假设：**`tool_call` 是所有工具调用的统一接缝，
包括 codemode / MCP 这类嵌套调用。**

## 对心智模型的确认

以下理解被实际运行确认：

1. transcript 是追加写的 JSONL；
2. 每条消息在 `message_end` 时落盘；
3. 请求上下文由 projection 重建；
4. `context_edit` 不修改历史；
5. compaction 是检查点，不是删除；
6. `systemMessage` 快照保证压缩后 prompt 不丢；
7. `tool_call` 拦截对顶层和嵌套调用都生效；
8. `tool_result` 可以改写结果；
9. 嵌套调用不会产生独立的 transcript 结果。

## 一个无关紧要的观察

`getMessageText()` 只读取 `content`，所以对 `compactionSummary` 返回空字符串。
验证脚本最初用它检查摘要，得到了 `false`。改用 `message.role ===
"compactionSummary"` 后通过。这是脚本的问题，不是系统的问题。

## 尚未验证

- 真实 provider 的流式细节、缓存、错误重试；
- MCP 工具的实际连接与 OAuth；
- 缓存预热的真实成本决策；
- 多分支 `/tree` 导航。

这些需要真实凭据或更复杂的脚本，留待后续。
