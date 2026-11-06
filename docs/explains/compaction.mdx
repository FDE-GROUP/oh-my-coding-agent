# Compaction 与 Branch Summarization

核心文件：

- `core/compaction/compaction.ts`（1,104 行）：触发、切点、摘要、持久化
- `core/compaction/utils.ts`（164 行）：文件操作提取、序列化
- `core/compaction/branch-summarization.ts`（398 行）：分支导航时的摘要
- `core/agent-session.ts`：手动/自动压缩的编排

## 1. 设置

```ts
DEFAULT_COMPACTION_SETTINGS = {
  enabled: true,
  reserveTokens: 16384,
  keepRecentTokens: 20000,
}
```

- `reserveTokens`：给 prompt 和输出留的空间；
- `keepRecentTokens`：压缩后至少保留多少 token 的近期消息。

## 2. Token 估计

| 函数 | 依据 |
|---|---|
| `estimateTokens(message)` | chars / 4，图片按 4800 字符估算 |
| `calculateContextTokens(usage)` | `totalTokens`，否则 input+output+cacheRead+cacheWrite |
| `estimateContextTokens(messages)` | 最后一条有效 assistant usage + 其后消息的估算 |
| `estimateProjectedContextTokens(projection, branch)` | 如果 usage 之后有 `context_edit` 或 `compaction`，就丢弃旧 usage，全部重新估算 |

最后一条很重要：压缩或编辑后，旧的 usage 反映的是旧上下文，不能直接信。

## 3. 触发条件

`shouldCompact(contextTokens, contextWindow, settings)`：

```
contextTokens > contextWindow - reserveTokens
```

`_checkCompaction()` 分三种情况：

### 情况 1/2：上下文溢出

- `stopReason === "error"` 且是 context overflow；
- 或 usage 匹配当前投影且超出窗口；
- 或 `stopReason === "length"` 且输出低于模型原本的 maxTokens（可恢复的截断）。

处理：

```
第一次溢出：
  _overflowRecoveryAttempted = true
  _omitRecoveryAttempt(assistantMessage)   // 追加 context_edit(null)
  compact("overflow", willRetry=true)
  → agent.continue()

第二次溢出：
  放弃，报 "Context overflow recovery failed after one compact-and-retry attempt"
```

### 情况 3：阈值压缩

没有溢出，但 token 超过阈值 → `compact("threshold", false)`，不重试。

### 其他入口

- 手动 `/compact` → `AgentSession.compact()`；
- 每轮开始前 `_checkCompaction(lastAssistant, false)`，捕获被中断的响应；
- `prepareNextTurn` 里的 `_compactBeforeNextAssistantResponse()` 做阈值检查。

## 4. 切点算法

`findCutPoint()`：

```
从最新往最旧走，累加 estimateTokens
累计 >= keepRecentTokens 时，选最近的合法切点
```

合法切点：

- user / assistant / bashExecution / custom / branchSummary / compactionSummary；
- **不能切在 toolResult**：工具结果必须跟着它的 tool call。

如果切点落在 turn 中间：

- `isSplitTurn = true`；
- 额外生成一份 “turn prefix summary”；
- 最终摘要是 `history summary + turn prefix summary`。

`firstKeptEntryId` 指向保留区间的第一条 entry。投影时：

```
保留：compaction 本身
     + firstKeptEntryId 起的条目
     + compaction 之后的全部条目
丢弃：更早的、已被摘要的条目
```

保留区间里的 system message 会被跳过，因为 prompt 由 compaction 自己的
`systemMessage` 携带。

## 5. 摘要生成

### 输入不是消息，而是序列化文本

`serializeConversation()` 把消息转成：

```
[User]: ...
[Assistant]: ...
[Assistant tool calls]: write(path="...", content="...")
[Tool result]: ...（最多 2000 字符）
```

思考内容被省略：provider 返回的思考摘要往往不属于实时上下文，带上反而让
摘要请求比被摘要的上下文还大。

### Prompt

第一次压缩用 `SUMMARIZATION_PROMPT`，已经有摘要时用
`UPDATE_SUMMARIZATION_INSTRUCTIONS`，要求保留旧信息、增量更新。

固定结构：

```
## Goal
## Constraints & Preferences
## Progress (Done / In Progress / Blocked)
## Key Decisions
## Next Steps
## Critical Context
```

要求保留精确的文件路径、函数名、错误信息。

### 文件操作追踪

从 assistant 的工具调用和 tool result 的 `nestedCalls` 中提取：

- `read` → readFiles
- `write` → written
- `edit` → edited

最终：

- `modifiedFiles` = written ∪ edited
- `readFiles` = read - modified

以 `<read-files>` / `<modified-files>` XML 追加到摘要末尾，同时写入
`CompactionEntry.details`，供下一次压缩累积。

### 请求参数

- `cacheRetention: "none"`：一次性摘要不写缓存；
- 没有 session id 时生成一个新的 routing id；
- 使用 `retryAssistantCall` 复用配置的重试策略；
- `stopReason === "error"` 或 `"length"` 视为失败；
- 模型尝试调用工具也视为失败。

## 6. 持久化

```ts
sessionManager.appendCompaction(
  summary,
  firstKeptEntryId,
  tokensBefore,
  details,
  fromHook,
  usage,
)
```

`appendCompaction()` 额外做一件事：

```ts
const systemMessage = getCurrentSystemMessage(
  this.buildSessionProjection().messages
)
```

把压缩边界处的完整 prompt 与工具状态快照进 `CompactionEntry.systemMessage`。

`sessionEntryToContextMessages()` 对 compaction entry 返回：

```ts
[systemMessage, compactionSummary]
```

这就是“压缩后 prompt 和工具声明不会丢”的实现。不需要每轮重建，也不破坏
provider 的缓存前缀结构。

## 7. 溢出恢复的“删除”

`_omitRecoveryAttempt()` 不删除历史，而是追加 `context_edit`：

```
appendContextEdit(assistantEntryId, null)
appendContextEdit(toolResultEntryId, null)
```

投影时这些条目贡献空消息。所以：

- 文件仍然保留完整历史；
- 模型上下文里看不到失败的那次尝试；
- 工具结果和它的 tool call 成对移除，避免出现孤立的 toolResult。

## 8. Branch Summarization

用途不同：不是压缩上下文，而是**离开一个分支时保留它的摘要**。

触发：`/tree` 导航到另一个 leaf。

```
collectEntriesForBranchSummary(session, oldLeafId, targetId)
  → 从 oldLeafId 往回走到 common ancestor
  → 收集被放弃的条目（时间顺序）

prepareBranchEntries(entries, tokenBudget)
  → 从最新往最旧加入，直到预算
  → compaction / branch_summary 条目优先保留
  → 同时累积文件操作

generateBranchSummary(...)
  → 同样的结构化 summary
  → 前缀 "The user explored a different conversation branch before returning here."
  → 写入 branch_summary entry
```

`branch_summary` 进入上下文时是一条 summary message，带上 `fromId`。
被放弃的分支仍然完整保存在 JSONL 里。

## 9. 扩展钩子

| 事件 | 能力 |
|---|---|
| `session_before_compact` | 取消，或提供自定义 `compaction` |
| `session_compact` | 观察已保存的 compaction entry |
| `session_compact_failed` | 观察失败/中止 |

自定义 compaction 必须提供 `summary`、`firstKeptEntryId`、`tokensBefore`；
`usage` 和 `details` 可选。

## 10. 一个容易忽略的顺序

自动压缩完成后：

```ts
if (willRetry) return true;                  // 继续被中断的回合
return this.agent.hasQueuedMessages();       // 否则只为了投递排队消息再跑一次
```

也就是说，压缩可能触发一次额外的 `agent.continue()`，即使没有工具结果。
这是为了把压缩期间排队的 steer / followUp 消息送进去。

## 11. 设计要点

1. **压缩是检查点，不是删除**：JSONL 永远保留全部历史。
2. **prompt 随 compaction 一起快照**：`systemMessage` 保证长会话不丢指令。
3. **切点避开 toolResult**：不会产生孤立的工具结果。
4. **摘要输入是文本，不是消息**：防止模型继续对话。
5. **文件操作跨压缩累积**：下一次摘要能继承已读/已改文件列表。
6. **溢出恢复只尝试一次**：失败后明确报错，不无限重试。
7. **手动和自动共享同一个 `compact()`**：区别只在触发方式和是否重试。

## 12. 尚未确认

- `SessionManager.appendCompaction` 里 `systemMessage` 的时间戳处理细节。
- `_failedResponse` 的“final-attempt recovery”在 agent loop 里的消费点。
- 压缩后 `cacheWarmer` 如何重建前缀（只看到它按 session id 启动）。
