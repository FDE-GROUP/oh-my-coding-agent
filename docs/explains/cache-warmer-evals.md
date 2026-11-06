# Cache Warming 与 Evals

这一篇补最后两个子系统：缓存预热的经济学，以及评测夹具。

## 1. Cache Warmer

`core/cache-warmer.ts`（455 行）。

### 目的

Prompt cache 有 TTL。TTL 过期后，下一次真实请求会变成 full-price 的 cache write。
Cache warmer 在 TTL 过期前**重放上一次请求**，但把输出限制成 1 个 token，用一次
便宜的 cache read 保住缓存条目。

三种模式：

| 模式 | 行为 |
|---|---|
| `off` | 不预热 |
| `streaming` | 只在 agent run 进行期间预热 |
| `idle` | agent 空闲后继续预热，最多 30 分钟 |

### TTL 与调度

```
ttlMs = model.promptCache[retention] * 1000
delayMs = 90% * ttlMs，且至少留 10 秒
```

`retention` 来自 `cacheRetention` 或 `PI_CACHE_RETENTION`；`none` 不预热。

调度时还会算一个 `refreshDeadlineAt`：如果定时器因为睡眠或事件循环阻塞而跑晚，
超过一半的原始余量就放弃这次预热，因为晚到的请求很可能变成 full-price cache write。

安全上限：

- streaming：1 小时；
- idle：30 分钟。

### 重放安全性

`isReplayable()`：

- Anthropic 的 budget-based thinking（非 adaptive）不能重放；
- 因为 `budget_tokens` 从 `max_tokens` 推导，重放会得到不同 budget，而 Anthropic
  的 message cache key 包含它；
- adaptive thinking 可以重放。

### 经济学

```ts
promptTokens = 最后一条 assistant usage 的 input + cacheRead + cacheWrite

cacheHitCost  = price(cacheRead: promptTokens)
cacheMissCost = price(cacheWrite: promptTokens)   // 没有 cacheWrite 价格时用 input
warmCost      = price(cacheRead: promptTokens, output: 1)
missCost      = max(0, cacheMissCost - cacheHitCost)

continuationProbability = streaming ? 1 : 0.15
expectedSavings = continuationProbability * missCost - warmCost

warm if expectedSavings >= $0.05
```

也就是说：只有“预计省下的钱”超过 5 美分才预热。空闲时只有 15% 的概率会有后续
请求，所以大多数情况下会停。

### 生命周期

```
start(request, isCurrent)
  → 检查模式 / 可重放 / TTL
  → 安排定时器

timer 到期
  → validateRun：模式、上下文是否仍匹配
  → refreshDeadlineMissed？
  → evaluate
  → 扩展 cache_warming_decision 可覆盖
  → warm：streamSimple(maxTokens:1, disableContinuation:true, maxRetries:0)
  → 成功则 appendUsage("cache_warm")
  → 重新安排

agent_settled
  → streaming 模式停止；idle 模式继续到 30 分钟上限
```

`disableContinuation: true` 很重要：预热请求不能替换对话的 thread 状态。

### 扩展覆盖

`cache_warming_decision` 事件带：

```
warmCost / missCost / continuationProbability / action
```

扩展可以返回 `{ action: "warm" | "stop" }`。扩展失败则回退到 Pi 自己的决定。
覆盖会记录在 usage note 和状态里。

### 状态展示

`formatCacheWarmingStatus()` 给 `/session` 一行：

```
Decision in 2m 30s (100% continuation probability, expected savings $0.120 >= $0.050)
Warming cache (...)
Stopped (expected savings below threshold)
```

## 2. Evals

`packages/evals` 是 Pi 自己的评测夹具，主要做**文档评测**：对比“有 docs”和
“没有 docs”时 agent 的表现。

### Harness

`src/harness.ts` 把一个真实的 `AgentSession` 跑起来：

```
1. 隔离 HOME 和 PI_CODING_AGENT_DIR
2. 从宿主 auth.json 读凭据，放进 InMemoryCredentialStore
3. 创建临时 workspace，写入 fixture 文件
4. createAgentSessionServices + createAgentSessionFromServices
5. 检查没有意外加载的扩展
6. 可选进入非特权沙箱（root → setuid/setgid）
7. 依次执行 prompt / reload 步骤
8. 收集：
     - transcript events
     - usage（input/output/cache/total tokens、tool calls、cost）
     - system prompt sha256
     - 会话 JSONL artifact
9. dispose + 清理临时目录 + 恢复环境
```

失败时会附带 partial run，方便定位。

### 沙箱

文档评测必须跑在容器里，并且：

- 以 root 启动；
- `PI_EVAL_SANDBOX_UID` / `PI_EVAL_SANDBOX_GID` 指定非特权用户；
- `setgroups([])`、`setgid`、`setuid` 后进入沙箱；
- 检查进程无法读取转换后的 eval 模块。

这是必要的，因为 agent 会执行工具，工具可能写文件。

### 文档评测

```ts
createPiDocumentationEvalHarness()
  → 要求 PI_EVAL_CONTAINER=1 且有 sandbox id
  → PI_EVAL_VARIANT = without_docs | with_docs
  → without_docs：从 system prompt 删除 <docs> 段
  → with_docs：保留
  → 工具限制为 read/write/edit/grep/find/ls
```

不暴露 bash 和网络，避免评测变成“随便执行命令”。

### 任务计划

`plan.ts`：

- 发现用例名必须是 `<eval set> > <case>`；
- 同一个 identity 不能重复；
- 每个 case × model × runNumber × variant 生成任务；
- 奇数轮先 `without_docs`，偶数轮先 `with_docs`，平衡顺序效应。

### 报告

`report.ts`：

- 读 vitest JSON report + workspace；
- 按 `(evalSet, caseId, model, runNumber)` 配对 control / treatment；
- 每个 run 的结果是 `scored` / `unscored` / `skipped` / `pending` / `errored`；
- 分数必须在 0..1；
- 指标：input/output/cache read/cache write/total tokens、tool calls、耗时、估算成本；
- 对比：
  - control pass rate；
  - treatment pass rate；
  - lift；
  - flags：`no-lift`、`negative-delta`、`control-saturated`、
    `treatment-saturated`、`flaky`；
- 无法配对的 run 进入 `blockedPairs`，带原因；
- 每个 variant 的 operational totals；
- 会话 JSONL 按 hash 存到 artifact 目录。

### 示例：documentation audit

`evals/documentation-audit.eval.ts`：

- 自定义工具 `submit_documentation_audit`，参数是 `{ verdict, explanation }`；
- 对每个 docs 页面运行一次；
- prompt 要求：读完整文档页和相关实现，只报告“明确的、用户可见的矛盾”；
- 断言：
  - 必须读过该文档页；
  - 必须读过至少一个源码文件；
  - 必须恰好调用一次审计工具；
  - verdict 必须是 `match`。

这是一个“仓库用自己的 agent 审计自己的文档”的自检。

## 3. 设计观察

1. **Cache warming 是一个成本优化器**，不是功能：它只在预期省钱时运行。
2. **重放安全优先于省钱**：不能安全重放的请求直接不预热。
3. **Evals 是真实 agent run**，不是单元测试；它测的是模型 + harness + prompt 的
   组合。
4. **配对设计**控制模型方差：同一个 case、同一个 runNumber 下比较 with/without。
5. **指标不只有分数**：token、工具调用、耗时、成本都记录，因为“更贵地通过”不是
   通过。
6. **沙箱是评测的一部分**：工具会执行，所以评测必须在受限环境里跑。
7. **会话 JSONL 被保留**：失败时可以回放完整轨迹。

## 4. 尚未细读

- `report.ts` 的 lift / flag 计算细节；
- `docker.ts` 与容器入口；
- `cli.ts` 的发现与调度；
- `configured-runtime.ts`；
- 其余 eval 文件（docs、extensions、models、prompt-templates、tui、openai-provider）。
