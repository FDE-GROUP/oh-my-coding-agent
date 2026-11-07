# Plan：agent-visibility 实现计划

> 关联：`docs/rads/agent-visibility.md`（已确认 2026-11-07）、`docs/spikes/agent-visibility.md`（结论已采信）、issue [#9](https://github.com/FDE-GROUP/oh-my-fde/issues/9)、vision 决策记录「agent 观测面走核心只读命令族 + 治理留痕事件」（2026-11-07）。
>
> 状态：已批准（2026-11-07）。

## 1. 背景与目标

让使用 fdecode 的软件工程师不读源码即可回答：模型看到什么（上下文解剖）、谁在支配会话（装配与生效配置）、刚才为什么压缩/重试（机制时间线）、这次调用被谁动了（治理审计）。

spike 证实的数据面事实（设计以此为准）：

- 解剖数据：`buildSessionProjection()` + `getCurrentSystemMessage()`（sections/toolsAdded）+ `estimateProjectedContextTokens`（usage 锚定 + chars/4）全部现成。
- 装配数据：`resourceLoader.getExtensions()`、SettingsManager 三层 API（`getSettings`/`getGlobalSettings`/`getProjectSettings`）、mcp 扩展内 `connection.state` 均已存在，仅缺 RPC 暴露。
- 治理留痕：现状零留痕（事件流无 `tool_call`/`tool_result`；block 表现为普通错误结果；参数改写无标记；结果改写原文丢失）。

## 2. 非目标

（继承 RAD §5 全部非目标）配置编辑与开关 UI、独立平台控制台 app、TUI 观测专项、profiling、面向非技术用户的简化、观测数据注入模型上下文。此外本期不做：多会话聚合观测、观测数据导出、`tool_governance` 之外的任何新事件、既有 RPC 命令的语义变更。

## 3. 设计要点与否决项

### D1 命令：`get_context_anatomy`（只读）

- 输入：无参数（当前会话、当前分支）。
- 输出（v1 字段冻结）：`sections: [{ name, chars, estTokens }]`、`baseContent: { chars, estTokens }`、`tools: [{ name }]`、`messages: { count, estTokens }`、`total: { tokens, contextWindow?, percent?, basis: "usage-anchored" | "estimated" }`、`compaction: { active: boolean }`。
- 实现：RPC 命令处理器内调用三个现成核心函数；token 用既有 chars/4 启发式与 usage 锚定，不引入 tokenizer。
- 否决项：客户端重建投影（重复实现 + 深耦合，spike 否决）；精确 tokenizer（成本不配收益，口径标注即可）。

### D2 命令：`get_assembly`（只读）

- 输出（v1 字段冻结）：`extensions: [{ path, error? }]`、per-extension 注册项 `{ tools: [name], commands: [name] }`（从 runner 注册表聚合）、`mcp: [{ name, source: "mcp.json" | "extension:<path>", state?: "connected" | ... }]`、`settings: { effective, global, project, sources: { globalPath, projectPath } }`（三层原样返回 + 文件路径）。
- MCP 状态暴露路径：优先在命令实现侧向 mcp 扩展的连接管理器读取；若封装边界不允许，降级为返回注册信息不返回连接态（标注 `state: null`），连接态暴露另行走扩展约定——切片 S3 复核后定，不阻塞其余字段。
- 否决项：客户端合并复刻（deepMerge + defaultTools ± + env 回退会漂移，spike 否决）；把 per-key 优先级计算放前端。

### D3 事件：`tool_governance`（只增不改）

- 发射点：`agent-session.ts` 的 `_beforeToolCall`（钩子返回 block 时）与 `_afterToolCall`（钩子改写 content/参数时）。
- 载荷：`{ toolCallId, parentToolCallId?, toolName, action: "block" | "args-mutated" | "result-rewritten", extensionPath, summary }`；`summary` 为受限摘要（长度上限，v1 固定 200 chars），不含完整原文。
- 参数改写检测：`tool_call` 钩子按文档以原地变异 `event.input` 方式改参数——发射点在 `_beforeToolCall` 内对 input 做浅快照对比（序列化对比，仅当存在 tool_call 处理器时启用）。
- 原结果保留：`_afterToolCall` 改写发生时，将原文摘要写入 toolResult `details.governance`（同样限长）。
- 否决项：扩展自报作为唯一机制（可绕过，spike 否决；保留为补充）；完整原文入 transcript（体积与敏感面，RAD NFR）。
- 该事件同时进入会话事件流（RPC 可见）与扩展事件分发，语义只增不改。

### D4 fdecode 视图

- 上下文解剖面板：消费 `get_context_anatomy`，按分节分解 + 总量与口径标注。
- 装配视图：消费 `get_assembly`，三块：扩展与注册项、MCP、生效配置（三层对照 + 来源路径）。
- 治理审计：会话事件流中 `tool_governance` 的列表视图，按 toolCall 关联到对话流。
- 机制时间线：纯消费既有事件（compaction/auto_retry/summarization/queue），不依赖新命令。
- 信息架构：默认视图回答高频四问；原始 JSON 入高级折叠区（RAD NFR"策展"）。

## 4. 实施切片

| 切片 | 内容 | 落点 | 依赖 |
|---|---|---|---|
| S0 机制时间线 | 既有机制事件的会话内时间线视图 | `apps/fdecode` | 无（可立即开始，纯前端） |
| S1 `get_context_anatomy` | 命令 + `rpc-commands.md` 文档 + faux 单测（含零副作用断言） | `packages/coding-agent/src/modes/rpc/` | vision 决策（已落） |
| S2 解剖视图 | fdecode 上下文解剖面板 | `apps/fdecode` | S1 |
| S3 `get_assembly` + 装配视图 | 命令（含 MCP 状态暴露路径复核）+ 文档 + 单测；fdecode 装配/配置视图 | 两处 | S1（协议模式复用） |
| S4 `tool_governance` + 治理审计 | 事件 + 快照对比 + details provenance + 单测；fdecode 审计视图 | 两处 | 无强依赖，建议在 S1 后 |

每切片独立可交付、可验收；S0 与 S1 无依赖关系，可并行。

## 5. 验收判据

- 每切片：`pnpm run check` 通过；涉及包跑对应测试（coding-agent 用 `test/suite/harness.ts` + faux provider；fdecode 跑 `pnpm --filter @omfde/fdecode test`）；平台导出 TSDoc 合规。
- S1/S3：观测命令调用前后，transcript entries 逐字节不变（单测断言）；不产生 provider 请求。
- S4：block / 参数改写 / 结果改写三种动作各有一条 `tool_governance` 事件，`extensionPath` 正确，`summary` 不超限；既有事件序列与语义不变（快照测试对照）。
- 视图：解剖/装配数据与 transcript、settings 文件人工抽样核对一致（RAD §10）。
- 失败判定沿用 RAD §10：数据不一致、有副作用、命令面失控。

## 6. 风险与回滚

- `tool_governance` 发射点在核心钩子热路径：实现为纯同步发射、无条件 I/O；若基准显示开销，加采样/开关（settings 键）。
- 协议面扩大：命令与事件一次性冻结 v1 字段，扩张另走决策（vision 条目已约束）。
- 回滚：S1/S3/S4 均为增量（新命令处理器、新事件类型），回滚即移除注册点；视图回滚为前端 revert。

## 7. 决策者批准记录

- 批准范围：全文（决策者会话内确认"全文同意"，2026-11-07）。批准同时涵盖 spike 结论，含其对 RAD FR-2 实现归属的修正。
- 日期：2026-11-07
- 备注：实现按切片 S0–S4 推进，每切片独立验收（§5）；S0 与 S1 无依赖可并行。
