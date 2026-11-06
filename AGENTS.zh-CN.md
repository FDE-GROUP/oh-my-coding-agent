[English](AGENTS.md) | 简体中文

# 开发规则

## 当前状态

本仓库是 `earendil-works/pi` 的本地 fork，不是 GitHub 意义上的 fork。

- `upstream` 是 Pi 远端。`main` 镜像上游，不接收提交。所有工作都在 `omca` 分支上进行。
- 已裁剪的上游子系统：`apps/p2`、`packages/env`、`packages/durable`、`packages/chord` 和 `scripts/durable-browser-smoke-entry.ts`。
- 保留的包：`agent`、`ai`、`coding-agent`、`codemode`、`evals`、`mcp`、`schema`、`telemetry`、`tui`。
- 平台布局：`apps/` 放可运行应用，`extensions/` 放平台扩展，`packages/` 放 Pi 和共享库。Pi 包保留在 `packages/`，这样上游 rebase 仍然适用。
- `apps/omfde` 是第一个平台入口，启动 Pi 时设置 `OMFDE_PLATFORM=1`；`extensions/omfde-core` 是第一个扩展骨架。
- 除删除 `packages/coding-agent/src/utils/shell.ts` 中两行注释外，Pi 核心代码未修改。
- 当前目标顺序：理解 → 会用 → 用好 → 增强。项目处于“会用”阶段。在真实缺口证明需要进入“增强”之前，不要修改 Pi 核心行为。
- 愿景和决策记录在 `docs/specs/vision.md`。阅读笔记、验证脚本和 fork 说明在 `docs/explains/`。
- 裁剪范围和恢复方法：`docs/explains/26-fork-and-prune.md`。

当前阶段优先使用配置和扩展，而不是改核心。核心改动必须先在 `docs/specs/vision.md` 中记录明确决定。

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

## 命令

- 代码改动（不是文档）之后：运行 `npm run check`（完整输出，不要只看尾部）。提交前修复所有 error、warning 和 info。它不运行测试。
- `npm run omfde` 启动平台入口。`npm run tui` 仍然直接从源码启动 Pi。
- 只在某些东西需要构建产物（`dist/`）时运行 `npm run build`，例如导入已构建包的测试。永远不要用它做类型检查或 lint：那应该用 `npm run check`。
- 除非用户要求，否则永远不要运行 `npm test`。
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

- 把 npm 依赖和 lockfile 变更当作需要审查的代码。直接 registry 依赖，包括内部 workspace 依赖，都固定为精确版本。
- 更新 `undici` 时，必须先阅读目标版本的 changelog/发布说明，评估是否有任何变更可能影响功能，然后再应用更新。
- 本地 hydrate/更新用 `npm install --ignore-scripts`；干净/CI 风格用 `npm ci --ignore-scripts`。除非用户要求，否则不要运行生命周期脚本。
- 如果依赖元数据变化，用 `npm install --package-lock-only --ignore-scripts` 刷新 `package-lock.json`。
- 如果 `packages/coding-agent/install-lock/` 需要重新生成，运行 `node scripts/generate-coding-agent-install-lock.mjs`（用 `--check` 或 `npm run check` 验证）。带生命周期脚本的新依赖需要审查，并在该脚本里显式加入 allowlist；永远不要悄悄添加。
- 除非设置 `PI_ALLOW_LOCKFILE_CHANGE=1`，否则 pre-commit 会阻止 lockfile 提交。除非用户希望提交这个 lockfile 变更，否则不要绕过。

## 分支、Git 与上游

同一个 cwd 中可能同时运行多个 pi 会话，每个会话修改不同的文件。触碰你改动之外的未暂存、已暂存或未跟踪文件的 Git 操作，会破坏其他会话的工作。

- 只在 `omca` 上工作。永远不要向 `main` 提交；它镜像上游。
- 只提交你在本次会话中修改的文件。
- 显式 stage 路径（`git add <path1> <path2>`）；绝不要用 `git add -A` / `git add .`。
- 提交前运行 `git status`，确认你只 stage 了自己的文件。
- `packages/ai/src/models.generated.ts` 可以始终和你的文件一起包含。
- 消息格式：`{feat,fix,docs}[(ai,tui,agent,coding-agent)]: <commit message>`（可选多行）。消息要有信息量且精炼。
- 除非用户明确要求，否则不要 push 到 `upstream`，也不要向上游开 PR。

永远不要运行（会破坏其他 agent 的工作或绕过检查）：

- `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash`、`git add -A`、`git add .`、`git commit --no-verify`。

同步上游：

- `upstream/main` 会独立前进。不要用 `git diff upstream/main` 比较自己的工作；应该使用 `docs/explains/26-fork-and-prune.md` 中记录的 fork 基点，或用 `git log --oneline HEAD..upstream/main` 查看仅属于上游的提交。
- 用 `git fetch upstream && git rebase upstream/main` 同步。不要把上游 merge 进 `omca`；merge 会让历史里的自有改动变得难以辨认。
- 如果发生 rebase 冲突，只在你修改过的文件中解决冲突。如果冲突出现在你没有修改过的文件中，中止并询问用户。
- 永远不要 force push。

## Issue 与 PR

本 fork 不使用上游的 issue/PR 门槛。内部工作记录在 `docs/specs/vision.md` 和 `docs/explains/`。

- 向上游贡献时，遵守上游 `CONTRIBUTING.md` 及其 `lgtm`/`lgtmi` 门槛。
- 审查上游 PR 时，除非用户明确要求，否则不要运行 `gh pr checkout`、`git switch`，也不要以其他方式把 worktree 移到 PR 分支。使用 `gh pr view`、`gh pr diff`、`gh api`，以及针对已 fetch ref 的本地 `git show`/`git diff`。
- 发布 issue/PR 评论时，把评论写入临时文件，用 `gh issue/pr comment --body-file` 发布。评论要简洁、技术性，并在每条 AI 发布的评论末尾加上发起 prompt 指定的 AI 生成免责声明行。
- 通过 commit 关闭 issue 时，包含 `fixes #<number>` 或 `closes #<number>`；多个 issue 时每个 issue 重复一次关键字。

## 文档

- `docs/specs/vision.md` 是动态愿景和决策记录。目标、边界或阶段变化时更新它。它是用户的工作文档；除非用户要求，否则不要 stage 或提交它。
- `docs/explains/` 保存架构笔记、验证脚本和 fork 记录。理解变化时更新它，优先使用可执行验证，而不是只有文字结论。
- 保持中文译本与英文源文件同步：`README.zh-CN.md`、`AGENTS.zh-CN.md`、`CONTRIBUTING.zh-CN.md`。
- 不要提交 `.env`、`~/.pi/agent/auth.json` 或任何 API key。

## 用 tmux 测试 pi 交互模式

测试 pi 的交互模式时，加载并遵循 [.pi/skills/interactive-testing.md](.pi/skills/interactive-testing.md)。

## Changelog 与发布

- 本 fork 不发布版本，也不维护每个包的 changelog。内部工作不要编辑 `packages/*/CHANGELOG.md`；把内部变更记录在 `docs/explains/`。
- 如果准备向上游贡献，到那时再遵守上游的 changelog 和发布规则。

## 用户覆盖

如果用户的指令与本文档中的任何规则冲突，先请求明确确认再覆盖。只有确认后才执行用户的指令。
