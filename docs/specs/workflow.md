# 开发工作流

> 版本：0.3.3 | 日期：2026-11-07 | 状态：现行

本文件把 vision、RAD、AGENTS 的规则串成可重复执行的闭环。它不新设产品边界；边界以 `docs/specs/vision.md` 为准。贡献者的操作细节和代码门禁见 `CONTRIBUTING.md`。

## 1. 权威层级

1. **`docs/specs/vision.md`**：项目宪法，决定目标、边界和阶段。
2. **`docs/rads/`**：确认需求，是 spike 和 plan 的制定依据。
3. **`docs/plans/`**：已批准方案，是实现和验收的唯一编码依据。
4. **`docs/spikes/`**：预研证据，不构成编码依据。
5. **`docs/specs/glossary.md`**：术语 SSOT，统一人机交流口径；**非裁决性**，不参与事实冲突裁决，词条与 1–4 冲突时以 1–4 为准并回改本表。
6. **代码与文档**：当前实现。
7. **`AGENTS.md`**：执行纪律、命令和 Git 规则，始终适用。

产品事实冲突时按 1、2、3、4、6 裁决（glossary 不参与）；执行纪律以 `AGENTS.md` 为准。代码不能反向定义 vision。决策者可以修改 vision，但必须先显式修改；在修改前，任何“先做再说”的指令都不构成越过 vision 的授权。

## 2. 三条工作线

| 线 | 主线 | 产物 |
|---|---|---|
| 教程线 | 理解 → 会用 → 用好 | `docs/explains/`、使用文档、示例、验证记录 |
| 平台化线 | 骨架 → 核心能力 → 协作 → 企业集成 → 治理 | `apps/omfde`、`packages/`、`extensions/` |
| Web UI 线 | 可用 → 对齐 DSH → 会话完整 → 团队可用 | `apps/fdecode` |

三条线并行。每条线都由真实需求或可验证结果触发，不能先搭空架子。

## 3. 任务分级

| 类型 | 例子 | 路径 |
|---|---|---|
| A 机械 | typo、格式、链接、排序、无行为变化的文档修正 | 直接修改 → 验证 → 提交 |
| B 常规 | 功能、文档、扩展、平台骨架、行为变更 | Vision 闸 → RAD（如需要）→ Spike 闸（必经）→ Plan（非平凡任务）→ 实现 → 验证 → 提交 |
| C 决策 | 架构、流程、边界、依赖、平台方向 | 先讨论 → 修改 vision 或记录决定 → 再走 B |

### 3.1 GitHub Issues：统一入口

GitHub Issues 是团队记录任务、bug 和阶段目标的统一视图，不是新需求的起点。

- **新需求**：由决策者发起讨论；讨论有初步结论后，决策者决定是否需要 RAD，再同步补 issue。需要 RAD 时，issue 关联 `docs/rads/<slug>.md`；不需要时在 issue 正文说明理由。
- **Bug**：可以直接开 issue，也可以在讨论后补；修复用 `fixes #N` 关闭。
- **Chore / 决策**：可以开 issue，也可以先讨论再补；团队可见任务仍以 issue 为准。
- 使用 `.github/ISSUE_TEMPLATE/omfde-task.yml`，write scope 为必填。
- 类型建议：`type:requirement`、`type:bug`、`type:chore`、`type:decision`。
- 非平凡实现必须关联 plan；plan 的“关联 issue 和 RAD（如有）”回链。
- 阶段目标用 GitHub Milestone 或 tracking issue 表示；每个开发 issue 归入对应 milestone。
- 状态建议：`needs-rad` → `needs-spike` → `needs-plan` → `ready` → `in-progress` → `done`；阻塞用 `blocked`。
- A 类机械修复可以例外不建 issue；如果影响共享文档、行为或多人协作，仍然建 issue。

新需求由决策者发起。团队成员可以反馈问题和建议，但是否成为需求、是否需要 RAD，由决策者决定。bug 修复、chore、机械修复不强制 RAD。不是每个 B 都需要完整仪式；判断标准是：是否新增能力、改变行为、跨越模块边界，或存在关键不确定性。

### 3.2 Agent 写范围

多 Agent 并行时，冲突控制首先是写范围，不是分支。

- 每个 issue 或任务在开始前，由决策者指定 **write scope**：允许写入的文件或目录。没有 scope 的任务视为未就绪，不得开始。A 类机械修复可以跳过 issue，但仍必须在会话任务中声明 scope。
- 同时指定 **read-only scope** 和 **shared files**。共享文件默认单写者、串行修改。
- Agent 只能写 write scope 内的文件。需要扩大范围时，停下来申请，不得自行越界。
- 共享文件的例子：`package.json`、`pnpm-lock.yaml`、`tsconfig.json`、`AGENTS.md`、`docs/specs/`、根 README、生成文件。
- 提交前用 `git status` 和 `git diff --name-only` 检查改动只落在 write scope 内；越界就停下。
- 提交时只 stage 自己修改且在 scope 内的文件；其他 Agent 的改动保持未暂存。超范围提交必须经决策者明确同意。
- 这是硬规则：所有工作只在 `main` 上。不切功能分支，也不在其他分支的 worktree 中工作。范围重叠时串行处理或重新划分 scope，不靠分支解决。

## 4. 主循环

```text
讨论（新需求由决策者发起）/ 缺陷 / 任务
  │
  ├─ 新需求 → 决策者决定是否 RAD → 补 issue（+ RAD）→ B
  ├─ Bug / chore → 补 issue → A / B
  ├─ A 机械 → 直接实现 → 验证 → 提交
  ├─ B 常规 → RAD? → Spike 闸（Agent 提清单 → 决策者裁定）→ Plan? → 实现 → 验证 → 提交
  └─ C 决策 → 讨论 → vision / 决策记录 → 转 B
  │
[Issue 闸] 讨论有结论后补 issue；团队任务以 issue 为准
[Scope 闸] 每个 Agent 的 write scope 明确且尽量不重叠
[Vision 闸] 每个任务先检查是否越过 vision
[Spike 闸] Agent 提出 spike 清单或“无需 spike”的结论 → 决策者裁定 → 才可进入 Plan
[Plan 闸] 非平凡方案成文 → 决策者批准
[实现] 只在批准范围和 write scope 内写代码
[验证] check / 测试 / 冒烟，附命令和输出
[提交] 引用 issue，确认未越界，明确证据和下一步
```

## 5. Vision 闸

每个 RAD、plan 和实现前都要检查 `docs/specs/vision.md`：

- 是否属于当前目标线和阶段；
- 是否触碰 vision 的“当前边界”；
- 是否偏离“首批用户是 3~5 人团队”的约束。

边界内的实现细节不需要改 vision。与 vision 冲突或需要扩大边界时，停止实现，先商议是否修改 vision；修改写入 vision 的决策记录后再继续。

## 6. RAD 闸

- **触发**：新需求由决策者发起讨论，并决定是否需要 RAD；需要时再同步补 issue 并关联 RAD。
- **模板**：`docs/rads/TEMPLATE.md`。
- **产物**：`docs/rads/<slug>.md`。
- **内容**：背景与价值、Vision 对齐、干系人、场景、范围与非目标、FR-N、非功能约束、开放问题、US-N、验收指标、决策者确认记录。
- **确认**：决策者确认后，用户故事同步建立并冻结；后续修订需再次确认并留痕。
- **效力**：确认后的 RAD 是 spike 和 plan 的制定依据，但不是编码依据。

## 7. Spike 闸（必经）

- **位置**：RAD 确认后、plan 起草前，必须通过本闸。没有“跳过 spike 直接写 plan”的路径。
- **Agent 职责**：判断是否需要实际执行 spike，并给出清单。即使判断“无需 spike”，也要显式说明理由并提交决策者。
- **清单内容**：每条候选 spike 写明要回答的问题、对 plan 的影响、建议的验证方式、粗略成本和是否建议执行。
- **决策者职责**：决定执行哪些 spike，或批准“无需 spike”的结论。
- **产物**：
  - 需要执行：`docs/spikes/<slug>.md`，至少包含要回答的问题、调研方法和验证结果、选型对比与否决项、风险清单、结论与建议。
  - 无需执行：在 issue 或 plan 中记录“Spike 闸已过：无需 spike”及理由，并注明决策者的裁定。
- **验证代码可丢弃**：spike 代码不进 `main`，除非决策者明确要求保留。
- **效力**：spike 是证据和输入，不是编码依据；决策者裁定后，才可进入 Plan 闸。

## 8. Plan 闸

- **触发**：RAD 确认后，且 Spike 闸已由决策者裁定；非平凡 B/C 任务必须有 plan。
- **产物**：首次使用时创建 `docs/plans/<slug>.md`，至少包含：
  - 背景与目标
  - 非目标
  - 关联 issue 和 RAD（如有）
  - 设计要点与否决项及理由
  - 实施切片
  - 验收判据
  - 决策者批准记录
- **批准 = 授权范围**：实现选择在范围内由 AI 决定；出圈即停-问。
- **唯一编码依据**：实现和验收只对照已批准 plan；RAD、spike 只作溯源。

## 9. 实现与验证

- 只改 plan 范围内的内容。涉及 Pi 核心的改动必须先在 plan 中说明；当前阶段默认不改核心。
- 代码改动后运行 `pnpm run check`（只读）；需要自动修复时再运行 `pnpm run check:fix`，并确认改动在 write scope 内。涉及测试时运行对应测试；需要时运行 `./test.sh`。
- 平台导出必须按 `docs/specs/tsdoc-comment-standards.md` 写 TSDoc；`pnpm run check:tsdoc` 已包含在 `check` 中。
- pre-commit 只检查 staged 文件；pre-push 运行完整 `pnpm run check`。
- 平台入口改动至少运行：
  - `pnpm run omfde -- --version`
  - 一条 `pnpm run omfde -- -p "..."`
- 所有检查都在本地执行；不依赖远程 CI，也不等待 GitHub Actions 结果。推送前本地必须通过。
- 记录命令、输出和环境；不能只说“通过”。
- 失败必须如实记录，不能用 skip、放宽断言或删除测试来掩盖。

## 10. 提交、PR 与合并

### 10.1 提交

- 只在 `main` 上工作。不创建功能分支，也不在其他分支的 worktree 中工作。提交按 `AGENTS.md` 的“用户要求才提交”规则执行。
- 只提交自己修改且在 write scope 内的文件；其他 Agent 的改动不要 stage 或 commit。超范围提交必须经决策者明确同意。
- 提交前运行 `git status` 和 `git diff --cached --name-only`，确认每个 staged 路径都是自己的且在 scope 内；显式 `git add <paths>`。
- 提交消息：`{feat,fix,docs}[(repo|ai|tui|agent|coding-agent)]: <summary>`，正文引用 issue：`refs #N`，完成时用 `fixes #N` 或 `closes #N`。
- `git commit` 和 `git push` 是共享状态的短临界区：一次只允许一个 Agent 执行；执行前确认没有其他 Agent 正在提交，执行后报告 commit hash。
- 已删除 `upstream` remote；不要重新添加或恢复自动 upstream rebase，除非决策者明确重新开启该决定。需要查阅上游时使用临时 clone 或经批准的归档 ref。

### 10.2 开 PR

- 内部默认不开 PR。`main` 是唯一开发分支，canonical repo 中没有功能分支。
- PR 只用于两种情况：
  - 外部贡献者从自己的 fork 提交；
  - 决策者特批的内部例外（高风险、大改动、需要多人评审）。
- 内部例外 PR 的源分支不得建在 canonical repo；使用独立的 fork 或 clone，合并后删除源分支。
- PR 必须关联 issue、RAD / plan（如有），写清 write scope、实际 diff、验证命令与输出、风险和回滚方式。
- PR 的 diff 必须与 write scope 一致；不得夹带其他 Agent 的改动、无关格式化或密钥。
- 作者不能自行合并自己的 PR，除非决策者明确授权。

### 10.3 合并

- 只有决策者，或获得明确授权的 Agent 可以合并 PR。
- 合并前必须确认：检查通过、diff 在 scope 内、issue / RAD / plan 关联完整、无密钥和无关文件。
- 统一使用 squash merge，保持 `main` 线性；合并后删除源分支。
- 合并后回到 issue 附验收结果；bug 用 `fixes #N` 关闭。
- 不 force push。

### 10.4 pages 分支

- `pages` 是发布分支，不是开发分支。
- 未经决策者明确授权，Agent 不得切换、checkout、提交、push 或合并 `pages`。
- 授权发布时，使用独立的 clone 或 worktree；不要切换共享的 `main` worktree。发布完成后删除临时目录。
- 不把 `pages` 合并进 `main`，也不把 `main` 合并进 `pages`；发布流程重建文档内容。
- 如果必须在共享 worktree 中操作 `pages`，先停止所有 Agent，并取得决策者的明确授权。

### 10.5 共享 worktree 串行操作

- 所有 Agent 共享同一个 `main` worktree。切换分支、rebase、reset、stash、清理和删除分支都必须由决策者协调，并确保没有其他 Agent 在运行。
- 不在后台并发运行 Git 命令；`git status` 发现异常 staged 文件时先停下，不要自行清理。

## 11. 会话协议

**开始：**

1. 读 `docs/specs/vision.md`。
2. 读本文件。
3. 读 `AGENTS.md`。
4. 查看 GitHub Issues 和当前 milestone；新需求确认是否已由决策者发起并同步到 issue。
5. 确认当前在 `main`，且没有未经授权的分支切换；尤其不要切到 `pages`。
6. 确认本次任务属于 A/B/C 哪类、对应哪条目标线。
7. 明确边界：本次不做什么。

**进行中：**

- 撞到 vision、RAD 或 plan 边界就停-问。
- 不把“实现方便”当作修改需求的理由。
- 不确定就记录为开放问题，不猜。

**收尾：**

- vision 边界变化：更新 vision 决策记录。
- 事实变化：更新 RAD、plan 或 `docs/explains/`。
- 汇报通过、失败、跳过，附命令和结果。
- 未完成事项写成 issue 或明确的下一步。

## 12. 角色分工

| 动作 | AI | 决策者（当前为 Abel） |
|---|---|---|
| 需求发起与讨论 | 整理讨论、提炼成文 | 发起新需求，决定是否进入 RAD |
| issue 记录与分诊 | 起草、整理、补全上下文 | 决定优先级、分配 milestone |
| Agent 写范围 | 按 scope 执行，越界前申请 | 为每个任务指定 write scope、read-only scope 和 shared files |
| 阶段目标 | 建议 milestone / tracking issue | 决定阶段目标和优先级 |
| 起草 RAD / spike / plan | 执行 | 确认 RAD、裁定 spike 清单、批准 plan |
| 需求主权 | 建议 | 决定 |
| 实现 / 验证 | 执行 | 抽查 |
| vision 修改 | 提议 | 确认 |
| 开 PR / 合并 | 准备 PR、执行获授权的合并 | 批准 PR、决定合并、授权内部例外 |
| pages 发布 | 未经授权不切换；获授权后使用独立 clone/worktree | 授权发布并协调共享 worktree |
| 提交 / push | 按指令执行 | 可撤销 |
| 事故复盘 | 起草 | 裁决 |

## 13. 例外与事故

- 门禁失败不得用 skip 或放宽断言掩盖；记录在 `docs/explains/00-baseline.md` 或 issue。
- 事故：记录现象、根因、修复和防复发的门禁；必要时更新本工作流。
- 代码冻结：决策者可宣布，期间只做文档或 issue。
- 已批准方案的变体：回到 Plan 闸，或由决策者明确豁免并留痕。
- 当前不引入 ADR 编号体系；决策记录优先写入 vision 决策记录，实施级取舍留在 issue/PR 中。

## 14. 变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-11-06 | 0.1.0 | 首版，参考 OdooThink 的 RAD / Spike / Plan 闭环，按 3~5 人团队和 Pi 底座裁剪 |
| 2026-11-06 | 0.1.1 | 明确 GitHub Issues 是需求、缺陷、任务和阶段目标的统一入口，并建立 issue ↔ RAD ↔ plan 关联 |
| 2026-11-06 | 0.1.2 | 增加 Agent 写范围（write scope / read-only scope / shared files），以范围隔离控制多 Agent 冲突 |
| 2026-11-06 | 0.1.3 | 将“只在 main 工作”和“每个任务必须有可检查的 write scope”定为硬规则；新增 omfde Task issue 表单，write scope 必填 |
| 2026-11-06 | 0.1.4 | 明确只提交自己修改且在 write scope 内的文件；超范围提交须经决策者同意 |
| 2026-11-06 | 0.2.0 | 明确 PR/合并约定；pages 为发布分支，未经授权不得切换；共享 worktree 的 Git 操作串行 |
| 2026-11-06 | 0.2.1 | 明确不向上游 Pi 贡献；PR 只保留外部贡献和决策者特批的内部例外两种情况 |
| 2026-11-06 | 0.2.2 | 新需求改为决策者先发起讨论、再同步补 issue；是否建立 RAD 由决策者决定 |
| 2026-11-06 | 0.2.3 | 质量门禁改为只在本地执行，不依赖远程 CI |
| 2026-11-06 | 0.2.4 | check 改为只读，新增 check:fix 和 secret scan；pre-commit 只检查 staged 文件，pre-push 跑完整 check |
| 2026-11-06 | 0.2.5 | 增加平台 TSDoc 规范和 check:tsdoc 本地门禁 |
| 2026-11-06 | 0.2.6 | 包管理器从 npm 迁移到 pnpm；本地命令、锁文件和 workspace 配置同步更新 |
| 2026-11-06 | 0.3.0 | 切断上游，转为独立维护；删除 upstream remote 和自动 rebase 约定 |
| 2026-11-06 | 0.3.1 | Spike 闸改为 RAD 到 plan 的必经环节：Agent 提清单或“无需 spike”结论，决策者裁定 |
| 2026-11-06 | 0.3.2 | 工作线从两条扩展为三条，新增 Web UI 线 |
| 2026-11-07 | 0.3.3 | 权威层级挂入 `docs/specs/glossary.md`（术语 SSOT，非裁决性），代码与文档、AGENTS.md 顺延为 6、7 |
