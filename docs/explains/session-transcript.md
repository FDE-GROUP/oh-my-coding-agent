# Session 与 Transcript

核心文件：`core/session-manager.ts`（2,029 行）。
结论先行：**这一层已经具备做流程层所需的大部分原语，不需要重写。**

## 1. 存储格式

追加写的 JSONL，一行一个 entry，第一个 entry 是 header。

```
~/.pi/agent/sessions/--<encoded-cwd>--/<timestamp>_<session-id>.jsonl
```

- 版本：`CURRENT_SESSION_VERSION = 3`，加载时原地迁移 v1→v2→v3。
- 树结构：每个 entry 有 `id` 和 `parentId`，`leafId` 指向当前位置。
- 分支 = 移动 `leafId`，历史永不修改、永不删除。
- 只有出现 user/assistant 消息后才真正落盘；只配置不聊天不会留下文件。

## 2. Entry 类型

| 类型 | 进入 LLM 上下文 | 用途 |
|---|---|---|
| `message` | 是 | user / assistant / toolResult / system |
| `custom` | **否** | 扩展状态，重载后可恢复 |
| `custom_message` | 是 | 扩展注入的消息，可控制是否显示 |
| `compaction` | 是（摘要） | 压缩检查点 |
| `branch_summary` | 是 | 被放弃分支的摘要 |
| `context_edit` | 间接 | 追加式修改更早 entry 的内容 |
| `model_change` / `thinking_level_change` | 否 | 运行状态 |
| `usage` | 否 | 成本/用量记录 |
| `label` / `session_info` | 否 | 书签与显示名 |

这个划分非常关键：**状态和上下文是分开的**。流程层可以把任务图、gate 决策、
审计记录写成 `custom` entry，既持久化又不污染 token。

## 3. 投影算法

```
buildContextEntries()
  → 沿 leaf 到 root 取路径
  → 找最新的 compaction
  → 保留：compaction 本身 + firstKeptEntryId 起的条目 + compaction 之后的所有条目
  → 丢弃：更早的、已被摘要的条目

buildSessionProjection()
  → 对每个 context entry 应用最新的 context_edit
  → 返回 { sourceEntry, messages } 的投影，保留来源
  → flatMap 得到最终 messages
```

两个不显眼但很重要的性质：

1. **投影保留 provenance**：每条投影消息都知道自己来自哪个 entry。
   这就是做“需求 → 任务 → 工具调用 → 测试结果”可追踪矩阵的天然基础。
2. **`context_edit` 是追加式的**：不重写文件，只是新增一条指向旧 entry 的
   覆盖记录。可以把它理解成“带历史的 amend”。

## 4. 压缩的语义

`CompactionEntry` 保存：

- `summary`：给模型看的摘要；
- `firstKeptEntryId`：从哪里开始保留原文；
- `tokensBefore`：压缩前 token；
- `systemMessage`：**压缩边界处完整的 prompt 与 tool 状态快照**。

最后一项是关键。它保证长会话压缩后，system prompt 和工具声明不会丢，
不需要每轮重建，也不会因为压缩而破坏 provider 的缓存前缀。

## 5. 对框架的直接含义

| 需求 | 现成原语 |
|---|---|
| 保存任务图 / gate 决策 / 审计日志 | `custom` entry（不进上下文） |
| 给模型注入流程指令 | `custom_message` entry |
| 修正早先的需求或提示，但保留历史 | `context_edit` entry |
| 探索多个方案 | `branch` + `branch_summary` |
| 长会话中保持流程状态 | compaction 的 `systemMessage` |
| 可追踪性 | 投影的 `sourceEntry` |
| 崩溃恢复 | 追加写 + 失败回滚（`_appendEntry` 写入失败会同步回滚内存） |

这意味着“流程层”不需要自己的存储。它应该：

1. 用 `custom` entry 存状态；
2. 用 `custom_message` 注入模型可见的约束；
3. 用 `context_edit` 做修正而不是重写；
4. 用 `branch_summary` 记录放弃的方案。

## 6. 一个需要警惕的设计点

`appendContextEdit` 会校验目标必须在当前分支上，并且只允许编辑
user/assistant/toolResult/custom_message 的内容。**它不能改 system message，
也不能改工具声明。** 这是有意的：prompt 和工具归属 transcript 的 system
message，不能通过上下文编辑绕过。

所以流程层如果要强制“系统级约束”，只能：

- 在 `before_agent_start` / `context` 钩子里注入；
- 或者把它做成工具层的 `{ block: true }`。

不能靠 `context_edit` 偷偷改 system prompt。这个边界是好的。

## 7. 仍未确认

- `compaction` 触发点的完整逻辑在 `core/compaction/compaction.ts`（1,104 行），
  还没读。
- `session-manager` 的投影是每次请求重建还是缓存，需要看 `agent-session.ts`
  的 `_installAgentRequestProjection`。
- `custom` entry 的读取 API 是否对扩展友好，需要看 `ExtensionContext`。
