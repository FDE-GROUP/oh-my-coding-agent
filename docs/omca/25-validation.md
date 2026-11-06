# 验证记录

读代码之后，用真实运行来确认“理解的和系统实际做的是同一件事”。

## 环境限制

- `~/.pi/agent/auth.json` 没有凭据；
- 没有本地模型（无 Ollama）；
- 没有设置 `PI_PROVIDER` / `PI_MODEL`。

所以使用仓库自带的 **faux provider**：它返回脚本化的 assistant 消息，能确定性
地驱动完整的 `AgentSession`、工具执行、持久化和投影，且不产生费用。

脚本在 `docs/omca/validation/`，从仓库根目录运行：

```bash
node --experimental-strip-types --no-warnings docs/omca/validation/validate-events.ts
node --experimental-strip-types --no-warnings docs/omca/validation/validate-projection.ts
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

## 对心智模型的确认

以下理解被实际运行确认：

1. transcript 是追加写的 JSONL；
2. 每条消息在 `message_end` 时落盘；
3. 请求上下文由 projection 重建；
4. `context_edit` 不修改历史；
5. compaction 是检查点，不是删除；
6. `systemMessage` 快照保证压缩后 prompt 不丢。

## 一个无关紧要的观察

`getMessageText()` 只读取 `content`，所以对 `compactionSummary` 返回空字符串。
验证脚本最初用它检查摘要，得到了 `false`。改用 `message.role ===
"compactionSummary"` 后通过。这是脚本的问题，不是系统的问题。

## 尚未验证

- 真实 provider 的流式细节、缓存、错误重试；
- MCP 工具连接与嵌套调用；
- `tool_call` 钩子的实际拦截；
- 缓存预热的真实成本决策；
- 多分支 `/tree` 导航。

这些需要真实凭据或更复杂的脚本，留待后续。
