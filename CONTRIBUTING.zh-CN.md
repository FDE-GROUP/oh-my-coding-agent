[English](CONTRIBUTING.md) | 简体中文

# 为 omfde 做贡献

本仓库是 oh-my-fde（omfde）的内部 FDE 平台，基于 Pi 构建。

## 先读这些

- [`docs/specs/vision.md`](docs/specs/vision.md)
- [`docs/specs/workflow.md`](docs/specs/workflow.md)
- [`AGENTS.md`](AGENTS.md)

## 唯一规则

你必须理解自己的代码。用 AI 写代码没问题；提交自己无法解释的代码不行。如果你无法解释一个改动做了什么，以及它如何与系统其余部分交互，它就还没有准备好。

## Issue 与讨论

GitHub Issues 是团队记录需求、bug 和任务的统一视图和任务板，也通过 milestone 或 tracking issue 跟踪阶段目标。

- 新需求先由决策者发起讨论。决定后，再创建 issue；如需要 RAD，一并关联。
- Bug 可以直接开 issue，也可以在讨论后马上记录。不要只靠聊天报告。
- 使用“omfde Task”issue 表单；它要求填写明确的 write scope。
- 需求类 issue：如需要 RAD，关联 `docs/rads/<slug>.md`；不需要 RAD 时说明理由。由决策者确认。
- 实现类 issue：关联 `docs/plans/<slug>.md` 中的 plan；非平凡工作必须先有已批准的 plan 才能编码。
- Bug issue：写清复现步骤、期望/实际行为和环境；用 `fixes #N` 关闭。
- A 类机械修复可以跳过 issue；如果涉及共享文档、行为变化或多人并行，仍然要建 issue。
- 阶段目标用 milestone 或 tracking issue 表示；每个开发 issue 归入一个阶段目标。

## 工作流

1. 新需求先由决策者发起讨论，然后开 issue 或领取 issue；Bug 可以直接开 issue。
2. 如需要，写 RAD；由决策者确认，用户故事同步冻结。
3. 通过 spike 闸：Agent 提出 spike 清单（或“无需 spike”的结论），由决策者裁定。该环节始终位于 RAD 和 plan 之间，不能省略。
4. 非平凡工作写 plan；由决策者批准。plan 是编码依据。
5. 只在已批准 plan 的范围内实现。
6. 用命令和记录下来的证据验证。
7. 关闭 issue，并链接结果。

完整流程见 [`docs/specs/workflow.md`](docs/specs/workflow.md)。

## 范围与边界

- `docs/specs/vision.md` 是项目宪法。不要超出它的目标、边界和阶段。如果改动与它冲突，先停下来商议是否修改 vision。
- Pi 核心保持精简。优先用应用、扩展和配置，而不是改核心。
- 除非 vision 决策和已批准的 plan 都明确说明，否则不要修改 Pi 核心。
- Pi 包现在由本项目维护；继续放在 `packages/`，并按同一套工作流修改。
- 平台代码按职责放在 `apps/`、`packages/` 或 `extensions/`。

## 分支与提交

- 只在 `main` 上工作。不要创建功能分支，也不要在其他分支的 worktree 中工作。如果任务看起来需要分支，先停下来询问决策者。
- 每个 Agent 任务都要声明明确的 write scope。A 类机械修复可以用会话任务作为声明。没有 scope 的任务视为未就绪，不得开始。
- 只写声明的 scope 内的文件；提交前用 `git status` 和 `git diff --name-only` 检查。共享文件单写者、串行修改。
- 只提交本次会话中你修改、且位于 write scope 内的文件。绝不 stage 或提交其他 Agent 的文件。超范围提交必须经决策者明确同意。
- 显式 stage 路径；绝不要用 `git add -A` 或 `git add .`。提交前检查 `git status` 和 `git diff --cached --name-only`。
- 提交消息：`{feat,fix,docs}[(repo|ai|tui|agent|coding-agent)]: <summary>`。正文用 `refs #N`；完成时用 `fixes #N` 或 `closes #N`。
- 不要提交 `.env`、`~/.pi/agent/auth.json` 或 API key。
- 不要直接改 `pages`；文档站有自己的发布流程。
- 内部工作不要编辑 `packages/*/CHANGELOG.md`；把内部变更记录在 `docs/explains/`。
- 所有 Agent 共享 `main` worktree。切换分支和改变 Git 状态的操作（switch、checkout、rebase、reset、stash、删除分支）必须串行，不要并发执行。

## PR 与合并

- 内部工作默认不开 PR。`main` 是唯一开发分支。
- PR 只用于：外部贡献者从自己的 fork 提交，或决策者批准的内部例外。
- 内部例外 PR 必须使用独立的 fork 或 clone；不要在 canonical 仓库中创建它的源分支。
- PR 必须关联 issue 和 RAD / plan（如有），写清 write scope，列出验证命令和输出，并且只包含 scope 内的改动。
- 只有决策者，或获得明确授权的 Agent 可以合并。
- 使用 squash merge，保持 `main` 线性；合并后删除源分支，并在 issue 中附结果。
- 永远不要 force push。

## pages 分支

- `pages` 是发布分支，不是开发分支。
- 未经决策者明确授权，不要切换、checkout、提交、push 或合并 `pages`。
- 获授权的发布使用独立的 clone 或 worktree；不要切换共享的 `main` worktree。
- 不要把 `pages` 合并进 `main`，也不要把 `main` 合并进 `pages`。
- 如果必须在共享 worktree 中发布，先停止所有 Agent，并取得明确授权。

## 质量门禁

- 所有质量门禁都在本地执行。远程 CI 不是门禁；不要 push 后等 GitHub Actions 发现问题。
- 代码改动：运行 `pnpm run check`（只读）。只有需要格式化或安全的 lint 自动修复时才运行 `pnpm run check:fix`，并确保产生的 diff 在 write scope 内。
- `apps/*/src` 和 `extensions/*/src` 中的新平台导出必须写 TSDoc；`pnpm run check:tsdoc` 已包含在 `check` 中。
- pre-commit 只检查 staged 文件；pre-push 运行完整 `pnpm run check`。
- 运行相关测试；非 e2e 测试用 `./test.sh`。
- 平台入口改动：运行 `pnpm run omfde -- --version`，并跑一条 `pnpm run omfde -- -p "..."` 冒烟。
- 记录命令、输出和环境。不要用 skip 或放宽断言掩盖失败。
- 如果你创建或修改了测试，运行它并迭代到通过。

## 独立维护

本仓库已经从 `earendil-works/pi` 独立出来。`upstream` remote 已删除；`pi-fork-base-20d86c365` 和 `omfde-cutover` 标签锚定历史。

- 未经决策者明确决定，不要重新添加 upstream remote，也不要恢复自动 upstream rebase。
- 依赖更新、安全审查、模型目录更新、测试和兼容性现在由本项目负责。
- 保留 MIT 许可证和上游版权声明。
- 如果必须查阅上游代码，使用临时 clone 或经批准的归档 ref；不要把它变成日常工作流依赖。

## 外部贡献

仓库是公开的，但当前开发主要服务内部团队。外部贡献者应先开 issue 讨论，得到决定后再开 PR。

## 问题

开 issue 或询问决策者。架构问题先读 `docs/explains/`。
