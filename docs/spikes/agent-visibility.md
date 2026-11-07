# Spike：agent-visibility（A/B/C）

> 关联：`docs/rads/agent-visibility.md`（已确认）、issue #9。
>
> 日期：2026-11-07。三项 spike 由决策者全批（2026-11-07）。
>
> 验证代码：一次性脚本 `/tmp/spike-visibility.ts`（已删除，不进 main），基于 `packages/coding-agent/test/suite/harness.ts` + faux provider 驱动真实 `AgentSession`；不调用真实 provider。

## 方法

- **阅读面**：`core/agent-session.ts`（钩子安装与嵌套调用）、`packages/agent/src/agent-loop.ts`（工具执行管线与事件发射）、`core/extensions/runner.ts`（tool_call/tool_result 分发）、`core/session-manager.ts`（投影）、`core/compaction/compaction.ts`（token 估算）、`core/settings-manager.ts`（合并语义）、`core/resource-loader.ts` 与 `core/extensions/loader.ts`（扩展枚举）、`core/mcp-servers.ts` 与 `extensions/mcp/index.ts`（MCP 状态）、`core/settings-schema.ts`（开关键）。
- **实证面**：harness 内注册治理扩展（block / 原地改参数 / 改写结果三种动作），驱动 4 次工具调用，观察会话事件流与 transcript 落痕；同时从同一会话取投影、system message 分节、token 估算与 settings 三层 API。

## Spike A：上下文解剖取数与计数（FR-1）

### 要回答的问题

投影一手数据在哪、是否可直接序列化；命令落点与侵入面；token 计数口径与成本；输出 schema 草案。

### 结果（实证输出摘录）

```
== A1: context anatomy from projection ==
system.content chars=0 estTokens=0
  section 'preamble' chars=126 estTokens=32
  section 'tools'    chars=274 estTokens=69
  section 'rules'    chars=589 estTokens=148
  section 'docs'     chars=1167 estTokens=292
  section 'cwd'      chars=52  estTokens=13
toolsAdded: ["read","bash","edit","write","echo"]
estimateProjectedContextTokens: tokens=1450 (usageTokens=1450 trailing=0)
```

- 数据源全部现成：`sessionManager.buildSessionProjection()` → `{ entries, messages }`；`getCurrentSystemMessage(messages)`（pi-ai 导出）→ 当前生效 system message（`content` + `sections` 逐分节字符串 + `toolsAdded`）；工具清单即 `toolsAdded` + agent 工具态。
- token 计数两级口径已在核心实现：`estimateProjectedContextTokens`（usage 锚定：最后一次可信 provider usage + 其后按 chars/4 估算，context_edit/compaction 后自动回退全估算）；分节粒度用 `estimateTokens` 的 chars/4 同源启发式即可。**无需引入 tokenizer**，精确值只在 provider usage 处锚定，视图标注口径即可。
- 会话级 totals（tokens/contextWindow/percent）核心已在计算（agent-session 的 stats 路径，`get_session_stats` 已暴露，fdecode 已显示上下文占用）；缺的只是分节/分组分解。

### 结论与对 plan 的影响

- 取数走核心（客户端复刻投影 = 重复实现 + 深耦合，否决）；落点为一个新 RPC 命令内部调用上述三个现成函数，侵入面小。
- schema 草案：`{ sections: [{ name, chars, estTokens }], baseContent: { chars, estTokens }, tools: [{ name, source }], messages: { count, estTokens }, compaction: { active, summaryTokens? }, total: { tokens, basis: "usage-anchored" | "estimated" } }`。字段集在 plan 冻结。

## Spike B：治理审计留痕（FR-5）

### 要回答的问题

tool_call 钩子的拦截/改写/放行今天留了什么痕；核心统一留痕 vs 扩展自报的取舍；嵌套调用与 block 的可见性。

### 结果（实证输出摘录）

```
== B1: session event types observed ==
agent_start, turn_start, message_start, message_end, message_update,
tool_execution_start, tool_execution_end, turn_end, agent_end, agent_settled

== B2/B3: tool_execution_end 与 transcript toolResult 完全一致 ==
write isError=true  text="spike-B: blocked by governance ext"     ← block
write isError=false text="Successfully wrote to argmut.txt"        ← 参数被原地改写
write isError=false text="spike-B: result rewritten by tool_result hook" ← 结果被改写
echo  isError=false text="echo: plain"

transcript mentions 'spike-B': true
transcript keeps original args 'original-args': true               ← 助手消息里的原始参数
transcript keeps original result 'original-result': false-as-result ← 原结果已丢失(命中的是参数里的同串)
```

可见性矩阵（现状）：

| 治理动作 | 事件流 | transcript | 缺口 |
|---|---|---|---|
| block | `tool_execution_end` isError=true，文本=reason | 同左 | 与真实工具错误**不可区分**，无"策略动作/来源扩展"标记 |
| 参数改写（原地变异 `event.input`） | 无痕 | 助手消息保留**原始**参数，结果反映改写后执行 | 无任何标记；观察者无法知道发生过改写 |
| 结果改写（tool_result 钩子替换 content） | 无痕 | 仅改写后结果，**原文丢失** | 无标记且不可恢复 |
| （对照）`tool_call`/`tool_result` 扩展事件本身 | **不在会话事件流中**（B1 证实） | 不落盘 | RPC 客户端完全看不到钩子被触发 |

嵌套调用带 `parentToolCallId` 贯穿钩子与事件（阅读面 + 既有 `validate-tool-call.ts` 验证），留痕设计可直接继承该关联键。

### 方案对比

| 方案 | 侵入 | 完整性 | 结论 |
|---|---|---|---|
| ① 核心统一留痕：在 `agent-session.ts` 的 `_beforeToolCall`/`_afterToolCall`，当钩子返回非空结果时发射新事件（如 `tool_governance`：动作类型、来源扩展、原/新参数或原/新结果摘要），并在 toolResult `details` 附 provenance | 集中两处；新增事件类型（协议面扩大）；不改既有事件语义；对所有扩展自动生效 | 高：覆盖一切扩展，含第三方 | **建议** |
| ② 扩展自报 custom entry | 零核心改动 | 低：依赖扩展自觉，第三方/未来扩展可绕过 | 否决为唯一机制；可作补充 |

注意：方案 ① 不再是纯"只读命令"，而是"只读命令族 + 一处事件增强"——vision 方向性决策的措辞需如实覆盖。

## Spike C：装配注册表、MCP 状态、配置合并、配置开关（FR-2/FR-3）

### C-1 装配注册表

`resourceLoader.getExtensions(): LoadExtensionsResult` 已提供已加载扩展清单与诊断（加载错误、路径）；`AgentSession` 持有 resourceLoader。工具→扩展的归属：扩展工具经 `wrapper.ts` 的 `RegisteredTool` 包装注册，注册关系在 runner 侧聚合，但**工具对象本身不带来源标记**——命令输出需从 runner 注册表补 per-extension 注册项（工具/命令/钩子），字段集 plan 冻结。

### C-2 MCP 连接状态

`extensions/mcp/index.ts` 内有连接状态机（`connection.state`：connected 等），并已用于 TUI `/mcp` 的状态展示（"connected · N tools · resources"）。**RPC 面不可见**。暴露路径（通用 `get_assembly` 命令向扩展收集 vs mcp 扩展经约定接口自报）留给 plan 定；数据存在性已确认。

### C-3 配置合并语义（验证 RAD"FR-2 零核心改动可先行"断言）

合并逻辑：`deepMergeSettings(global, project)` 深合并 + `defaultTools` 的 `+name`/缺省替换特例 + CLI 覆盖层 + 部分键的 env 回退（"Settings 优先于 env"）。**结论：客户端忠实复刻脆弱**（特例与回退会漂移）。核心已提供 `getSettings()` / `getGlobalSettings()` / `getProjectSettings()` 三层 API（实证确认存在）。

RAD 断言修正：**"静态先行"仅对"展示三份原始文件 + 简单说明"成立；"逐键生效值"应走核心命令**（并入 `get_assembly`），不做客户端合并复刻。此修正不改变 FR-2 的用户价值，只改实现归属。

### C-4 配置开关机制（原则二的后继需求铺垫）

开关在配置中已存在三档粒度，无需新机制：

| 粒度 | 配置键 | 语义 |
|---|---|---|
| 扩展/包 | `packages`（npm/git 源 + 资源过滤）、`extensions`（本地路径） | 列表即装载；启动链读取，**新会话生效** |
| 工具 | `defaultTools`（`+name` 增删）、CLI `--tools`/`--exclude-tools` | 同上 |
| MCP server | `mcpServers[].enabled`（mcp.json / 扩展注册） | 同上 |

缺的不是机制而是**所有权与呈现**：谁写这些键（单写者规则）、用户在哪里看到并切换（装配开关管理 UI，后继需求）。生效语义（新会话）需在 UI 明示。

## 风险清单

| 风险 | 说明 | 应对 |
|---|---|---|
| 协议面扩大 | 新命令 + 新事件类型（tool_governance）进入 RPC/事件契约 | 命令只读、事件只增不改既有语义；文档随实现同步；字段集 plan 冻结 |
| 原 结果/参数 留痕的体积与敏感面 | 治理留痕会复制内容片段 | 留摘要/长度上限，可配置；本地存储，不上传 |
| 事件增强落在核心钩子路径 | `_beforeToolCall`/`_afterToolCall` 是热路径 | 留痕为纯发射，无 I/O 阻塞；基准测试进 plan 验收 |
| 工具→扩展归属字段设计 | runner 注册表形状未完全展开 | plan 首切片做字段冻结前的复核 |
| 与 code-graph 排序 | 两条需求都在平台化线核心能力层 | 决策者排程（未决） |

## 结论与建议

1. **A 成立**：上下文解剖 = 一个只读命令（`get_context_anatomy`）包三个现成核心函数；token 口径 usage-anchored + chars/4，无新依赖。
2. **B 需要事件增强**：现状三种治理动作零留痕标记、改写原文丢失；建议核心统一留痕（新事件 `tool_governance` + toolResult details provenance），扩展自报仅作补充。
3. **C 修正 FR-2 实现归属**：逐键生效值并入 `get_assembly` 命令，不做客户端合并复刻；装配数据（扩展清单、注册项、MCP 状态、settings 三层）核心均有现成持有者，命令面收敛为 **`get_context_anatomy` + `get_assembly` 两个只读命令 + 一处事件增强**。
4. **vision 方向性决策的措辞**："只读观测 RPC 族 + 治理留痕事件增强"，时机按既定（spike 后、plan 批准前）。
5. 下一步：起草 `docs/plans/agent-visibility.md`（切片建议：① `get_context_anatomy` 命令 + fdecode 解剖视图；② `get_assembly` 命令 + 装配/配置视图；③ `tool_governance` 事件 + 治理审计视图；④ 机制时间线，纯 fdecode 端）。
