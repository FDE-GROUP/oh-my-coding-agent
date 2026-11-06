[English](AGENTS.md) | 简体中文

# 开发规则

## 当前状态

本仓库是独立维护的 `earendil-works/pi` fork，不是 GitHub 意义上的 fork。

- 没有 `upstream` remote。`main` 是产品主分支；`pages` 发布文档站。历史由 `pi-fork-base-20d86c365` 和 `omfde-cutover` 标签锚定。
- 包管理器：pnpm 11.15.1，由 `packageManager` 固定。`pnpm-lock.yaml` 和 `pnpm-workspace.yaml` 是依赖与 workspace 的事实来源。
- 所有工作都在 `main` 上进行。不要创建功能分支，也不要在其他分支的 worktree 中工作。
- 已裁剪的上游子系统：`apps/p2`、`packages/env`、`packages/durable`、`packages/chord` 和 `scripts/durable-browser-smoke-entry.ts`。
- 保留的包：`agent`、`ai`、`coding-agent`、`codemode`、`evals`、`mcp`、`schema`、`telemetry`、`tui`。
- 平台布局：`apps/` 放可运行应用，`extensions/` 放平台扩展，`packages/` 放 Pi fork 和共享库。
- `apps/omfde` 是第一个平台入口，启动 Pi 时设置 `OMFDE_PLATFORM=1`；`extensions/omfde-core` 是第一个扩展骨架。
- Pi 核心现在由本项目维护。核心改动是允许的，但仍需要明确决定和 plan。
- 目标分为三条并行线：教程线（理解 → 会用 → 用好）、平台化线（骨架 → 核心能力 → 协作 → 企业集成 → 治理）和 Web UI 线（可用 → 对齐 DSH → 会话完整 → 团队可用）。项目处于“会用”阶段。优先使用扩展和配置；只有出现真实缺口时才改核心。
- 愿景和决策记录在 `docs/specs/vision.md`。阅读笔记、验证脚本和 fork 说明在 `docs/explains/`。
- 裁剪范围和恢复方法：`docs/explains/26-fork-and-prune.md`。

当前阶段优先使用配置和扩展，而不是改核心。核心改动必须先在 `docs/specs/vision.md` 中记录明确决定。

## Vision 的宪法地位

`docs/specs/vision.md` 是项目宪法。

- 代码、文档和开发决策都不能超出 vision 的目标、边界和阶段。
- 在边界内的实现细节属于正常开发，不需要修改 vision。
- 如果具体决策与 vision 冲突，或会扩大其边界，先停下来，商议是否修改 vision。不要先实现冲突的改动，也不要悄悄重新解释 vision。
- 修改 vision 的决定要先写入 vision 的决策记录，再实施。
- vision 不是实施计划。它回答项目要去哪，以及现在不做什么。

## 硬规则

这些规则优先于便利和局部偏好。

- 只在 `main` 上工作。不要创建功能分支，也不要在其他分支的 worktree 中工作。如果任务看起来需要分支，先停下来询问决策者。
- 每个任务必须在 issue 或任务说明中声明明确的 write scope。A 类机械修复可以用会话任务作为声明。没有 scope 的任务视为未就绪，不得开始。
- 只写声明的 scope 内的文件。提交前用 `git status` 和 `git diff --name-only` 检查。
- 只提交本次会话中你修改、且位于 write scope 内的文件。不要 stage 或提交其他 Agent 的文件。超范围提交必须经决策者明确同意。
- `pages` 只用于发布。未经决策者明确授权，不要把共享 worktree 切到 `pages`，不要在上面提交或 push。获授权的发布使用独立的 clone 或 worktree。
- 切换分支和改变共享状态的 Git 操作必须串行。未经决策者协调，不要在共享 worktree 中运行 `git switch`、`git checkout <branch>`、`git rebase`、`git reset`、`git stash` 或删除分支。
- 所有质量门禁都在本地执行。不要依赖 GitHub Actions 或任何远程 CI；本地检查通过后才能 push。
- 共享文件单写者：package manifest、lockfile、`tsconfig.json`、`AGENTS.md`、`docs/specs/`、根 README 和生成文件。

## 交流风格

- 回答保持简短、精炼
- commit、issue、PR 评论和代码中不使用 emoji
- 不要废话或热情过头的填充语（例如用 “Thanks @user”，而不是 “Thanks so much @user!”）
- 只写技术性文字，直接表达
- 使用简洁、清晰、简单的语言。无法避免的术语要先定义再使用。
- 按“问题、具体例子或简短追踪、解决方案”的顺序解释非平凡的设计和问题。说明为什么这个解决方案是必要的，并把它与可选的复杂性区分开。
- 优先使用具体行为和简短示例，而不是抽象总结、密集术语或未解释的变更列表。
- 用户提问时，先回答问题，再做修改或运行实现命令。
- 回应用户反馈或分析时，先明确表示同意或不同意，再说明你改了什么。

## 代码质量

- 在做大范围修改前、编辑尚未完整检查过的文件前，以及被要求调查或审计时，完整阅读文件。不要依赖搜索片段做大范围修改。
- 除非绝对必要，否则不使用 `any`。
- 不要对 TypeScript 已经保证的类型做运行时检查（不要对类型化参数、类型化回调结果或类型化声明使用 `typeof`/`instanceof`/`Array.isArray`/形状守卫）。只在明确决定的信任边界做校验（wire input、经 schema 校验的 arguments 和 params）。
- 只有一个调用点的单行 helper 直接内联。
- 外部 API 的类型去 `node_modules` 里查，不要猜。
- **禁止内联 import**（`await import()`、`import("pkg").Type`、动态类型 import）。只使用顶层 import。
- 在 `packages/coding-agent` 中，通过 `src/config.ts` 里的 helper 解析包资源。不要直接使用 `__dirname`；这些 helper 会处理源码 checkout、npm 安装和独立二进制三种情况。
- 不要为了修复过时依赖导致的类型错误而删除或降级代码；应该升级依赖。
- 在根配置检查的代码中（`packages/*/src`、`packages/*/test`、`packages/coding-agent/examples`），只使用可擦除的 TypeScript 语法（Node strip-only 模式）：不要使用 parameter properties、`enum`、`namespace`/`module`、`import =`、`export =` 或其他需要 JS emit 的构造。使用显式字段和构造函数赋值。
- 删除看起来是有意为之的功能或代码前，必须先询问。
- 除非用户要求，否则不要保留向后兼容。
- 不要硬编码按键检查（例如 `matchesKey(keyData, "ctrl+x")`）。把默认值加到 `DEFAULT_EDITOR_KEYBINDINGS` 或 `DEFAULT_APP_KEYBINDINGS`，让它们保持可配置。
- 永远不要直接修改 `packages/ai/src/models.generated.ts`；应该修改 `packages/ai/catalog/` 里的目录定义（见该目录的 README），然后重新生成。把生成后的 `models.generated.ts` diff 一起提交总是可以的，即使重新生成时带上了不相关的上游模型元数据变更。`packages/ai/src/providers/data/` 中生成的模型数据已被 gitignore：永远不要 stage 它，也不要在 git 历史里找它。
- 在 `docs/specs/vision.md` 中记录决定之前，不要新增 workspace 包或改变包依赖图。
- `apps/*/src` 和 `extensions/*/src` 中的平台导出必须按 `docs/specs/tsdoc-comment-standards.md` 写 TSDoc。`pnpm run check:tsdoc` 会检查基础规则。

## 命令

- 代码改动（不是文档）之后：运行 `pnpm run check`（只读，完整输出，不要只看尾部）。提交前修复所有 error、warning 和 info。它不运行测试。
- 只有需要格式化或安全的 lint 自动修复时才运行 `pnpm run check:fix`；它会写文件，必须检查 diff 并保持在 write scope 内。`pnpm run check:secrets` 已包含在 `check` 中，也可以单独运行。
- pre-commit 只对 staged 文件做快速检查；pre-push 运行完整 `pnpm run check`。两者都只在本地执行。
- `pnpm run omfde` 启动平台入口。`pnpm run tui` 仍然直接从源码启动 Pi。
- 只在某些东西需要构建产物（`dist/`）时运行 `pnpm run build`，例如导入已构建包的测试。永远不要用它做类型检查或 lint：那应该用 `pnpm run check`。
- 除非用户要求，否则永远不要运行 `pnpm test`。
- 永远不要直接运行完整的 vitest 套件：它包含 e2e 测试，当存在 endpoint/auth 环境变量时这些测试会激活。要运行所有非 e2e 测试，在仓库根目录运行 `./test.sh`。它只运行 `packages/*`。否则从包根目录运行特定测试：
  - Vitest：`node "$(git rev-parse --show-toplevel)/node_modules/vitest/dist/cli.js" --run test/specific.test.ts`
  - `packages/tui`（`node:test`）：`node --test test/specific.test.ts`
- 如果你创建或修改了测试文件，运行它，并迭代测试或实现直到通过。
- 对于 `packages/coding-agent/test/suite/`，使用 `test/suite/harness.ts` + faux provider。不要使用真实 provider API、key 或付费 token。
- 为已修复的 issue 添加回归测试时，在测试旁边加一条注释，写上 issue 编号。
- 对于临时脚本，用 `write` 写到临时文件（例如 `/tmp`），运行，必要时编辑，完成后删除。不要把多行脚本嵌在 `bash` 命令里。
- 除非用户要求，否则永远不要提交。

已知的环境相关失败记录在 `docs/explains/00-baseline.md`。不要用 skip 或放宽断言来掩盖失败；应该记录下来。

## 环境与测试模型

- DeepSeek 是测试用 LLM。凭据放在 `~/.pi/agent/auth.json`；默认模型设置在 `~/.pi/agent/settings.json`。永远不要提交这两个文件，也不要把 key 粘贴到源码里。
- `.env.example` 是模板，不是运行时配置文件。Pi 不会加载 `.env`。`ODOOTHINK_PROVIDER` 和 `ODOOTHINK_MODEL` 不被 Pi 识别；要把它们映射到 `--provider` / `--model`，或 settings 中的 `defaultProvider` / `defaultModel`。
- 测试不得使用真实 provider API、key 或付费 token。使用 faux provider。
- TUI 冒烟检查可以用 DeepSeek 发小 prompt。尽量保持低成本，并尽可能确定。

## 依赖与安装安全

- 把 pnpm 依赖和 lockfile 变更当作需要审查的代码。直接 registry 依赖，包括内部 workspace 依赖，都固定为精确版本。
- 更新 `undici` 时，必须先阅读目标版本的 changelog/发布说明，评估是否有任何变更可能影响功能，然后再应用更新。
- 本地 hydrate/更新用 `pnpm install --ignore-scripts`；干净安装用 `pnpm install --frozen-lockfile --ignore-scripts`。除非用户要求，否则不要运行生命周期脚本。
- 如果依赖元数据变化，用 `pnpm install --lockfile-only --ignore-scripts` 刷新 `pnpm-lock.yaml`。
- npm 时代的 `install-lock` 和发布脚本是遗留路径。本 fork 不发布版本；除非恢复发布路径，否则不要运行它们。
- 除非设置 `PI_ALLOW_LOCKFILE_CHANGE=1`，否则 pre-commit 会阻止 `pnpm-lock.yaml` 提交。除非用户希望提交这个 lockfile 变更，否则不要绕过。

## 分支与 Git

同一个 cwd 中可能同时运行多个 pi 会话，每个会话修改不同的文件。触碰你改动之外的未暂存、已暂存或未跟踪文件的 Git 操作，会破坏其他会话的工作。

- 只在 `main` 上工作。不要创建功能分支，也不要在其他分支的 worktree 中工作。如果任务看起来需要分支，先停下来询问决策者。
- 把 `pages` 保留为独立的文档分支；不要把它合并进 `main`。
- 未经决策者协调，不要把共享 worktree 切到 `pages`，也不要在那里运行切换分支的 Git 操作。获授权的发布使用独立的 clone 或 worktree。
- 遵守 issue 中分配的 write scope。未经明确批准，不要编辑范围外的文件。把 package manifest、lockfile、`tsconfig.json`、`AGENTS.md`、`docs/specs/`、根 README 和生成文件当作单写者共享文件。
- 只提交你在本次会话中修改、且位于 write scope 内的文件。不要 stage 或提交其他 Agent 的文件。
- 显式 stage 路径（`git add <path1> <path2>`）；绝不要用 `git add -A` / `git add .`。
- 提交前运行 `git status` 和 `git diff --cached --name-only`，确认每个 staged 路径都是你的、且在 write scope 内。超范围提交必须经决策者明确同意。
- `packages/ai/src/models.generated.ts` 是生成文件、共享文件。只有在你的改动重新生成它时才包含；否则保持未暂存。它仍然受 write scope 约束。
- 消息格式：`{feat,fix,docs}[(repo|ai|tui|agent|coding-agent)]: <commit message>`（可选多行）。消息要有信息量且精炼。

永远不要运行（会破坏其他 agent 的工作或绕过检查）：

- `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash`、`git add -A`、`git add .`、`git commit --no-verify`。

上游历史：

- 已删除 upstream remote。用 `pi-fork-base-20d86c365` 标签定位原始 fork 点，用 `omfde-cutover` 定位切断点。
- 除非决策者明确重新开启该决定，否则不要重新添加 upstream remote，也不要恢复自动 upstream rebase。
- 如果必须查阅上游代码，使用临时 clone 或经明确批准的命名归档 ref；不要把它变成日常工作流依赖。
- 永远不要 force push。

## Issue 与 PR

GitHub Issues 是团队记录需求、bug 和阶段目标的统一视图和任务板；耐久的产品记录仍在 `docs/specs/vision.md`、`docs/rads/`、`docs/plans/` 和 `docs/explains/`。

- 新需求先由决策者发起讨论。决定后，再创建或关联 issue；需要 RAD 时一并关联。bug 可以直接开 issue。需求类 issue 关联 `docs/rads/<slug>.md`；实现类 issue 关联 `docs/plans/<slug>.md`；阶段目标用 milestone 或 tracking issue 跟踪。
- 团队可见的开发任务以 issue 为准。A 类机械修复可以例外不建 issue；如果涉及共享文档、行为变化或多人并行，仍然建 issue。
- 内部工作默认不开 PR。PR 只用于外部贡献者，或决策者批准的内部例外。内部例外 PR 使用独立的 fork 或 clone，不在本仓库创建源分支。
- 只有决策者，或获得明确授权的 Agent 可以合并。使用 squash merge，删除源分支，并在 issue 中附结果。
- 发布 issue/PR 评论时，把评论写入临时文件，用 `gh issue/pr comment --body-file` 发布。评论要简洁、技术性，并在每条 AI 发布的评论末尾加上发起 prompt 指定的 AI 生成免责声明行。
- 通过 commit 关闭 issue 时，包含 `fixes #<number>` 或 `closes #<number>`；多个 issue 时每个 issue 重复一次关键字。

## 文档

- `docs/specs/vision.md` 是已跟踪的项目宪法和决策记录。目标、边界或阶段变化时，更新并提交它；不要留下未提交的 vision 变更。
- `docs/specs/workflow.md` 是开发工作流。RAD、spike、plan、验证和收尾都遵循它。
- `docs/specs/tsdoc-comment-standards.md` 是平台 TypeScript 注释规范。`apps/*/src` 和 `extensions/*/src` 必须遵守。
- `docs/explains/` 保存架构笔记、验证脚本和 fork 记录。理解变化时更新它，优先使用可执行验证，而不是只有文字结论。
- 保持中文译本与英文源文件同步：`README.zh-CN.md`、`AGENTS.zh-CN.md`、`CONTRIBUTING.zh-CN.md`。
- 不要提交 `.env`、`~/.pi/agent/auth.json` 或任何 API key。

## 用 tmux 测试 pi 交互模式

测试 pi 的交互模式时，加载并遵循 [.pi/skills/interactive-testing.md](.pi/skills/interactive-testing.md)。

## Changelog 与发布

- 本 fork 不发布版本，也不维护每个包的 changelog。内部工作不要编辑 `packages/*/CHANGELOG.md`；把内部变更记录在 `docs/explains/`。

## 用户覆盖

如果用户的指令与本文档中的任何规则冲突，先请求明确确认再覆盖。只有确认后才执行用户的指令。
