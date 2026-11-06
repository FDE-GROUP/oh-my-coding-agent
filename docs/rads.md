# RADS

需求描述文档目录。完整开发流程见 [`docs/specs/workflow.md`](/oh-my-fde/docs/specs/workflow)。

## 使用方式

1. 新需求由决策者发起讨论；决策者决定是否需要 RAD。讨论有初步结论后，再同步补 GitHub Issue。
2. 需要 RAD 时，复制 `TEMPLATE.md` 为 `docs/rads/<slug>.md`，AI 参与分析和提炼成文。
3. 在 RAD 中填写“关联 issue”和“关联 milestone”，并检查 `docs/specs/vision.md` 的“Vision 对齐”一节；与 vision 冲突时，先修改 vision。
4. 决策者确认后，RAD 成为实现计划、任务拆分和验收的依据。
5. 确认后的需求变更需要再次确认，并在“决策者确认记录”中留痕。

## 与其它文档的关系

| 文档 | 作用 |
|---|---|
| GitHub Issues | 团队记录任务、bug 和阶段目标的统一视图；新需求讨论后同步到这里 |
| `docs/specs/vision.md` | 项目宪法，决定目标、边界和阶段 |
| `docs/rads/<slug>.md` | 单个需求的确认描述，关联对应 issue |
| `docs/plans/<slug>.md` | 已批准方案，关联 issue 和 RAD |
| `docs/explains/` | 架构阅读笔记与验证记录 |
| `apps/`、`packages/`、`extensions/` | 代码落点 |
