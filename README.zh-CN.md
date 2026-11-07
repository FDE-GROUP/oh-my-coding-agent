<p align="center">
  <img alt="omfde" src="omfde.jpg" width="160">
</p>

# omfde (oh-my-fde)

[English](README.md) | 简体中文

**企业内部 FDE（Forward Deployed Engineer，前置交付工程师）平台**，以独立维护的 [Pi](https://github.com/earendil-works/pi) fork 为底座。coding agent 是平台的核心能力，不是最终产品：平台沿团队协作、企业集成与治理逐步演化，而不是重写 Pi。

本仓库不跟踪上游。`main` 是产品分支；历史由 `pi-fork-base-20d86c365` 与 `omfde-cutover` 标签锚定。见 [`docs/explains/26-fork-and-prune.md`](docs/explains/26-fork-and-prune.md)。

## 当前状态

三条目标线并行推进：

| 线 | 路径 | 状态 |
|---|---|---|
| 教程线（文档） | 理解 → 会用 → 用好 | 会用已完成；用好转入后台持续推进 |
| 平台化线（代码结构） | 骨架 → 核心能力 → 协作 → 企业集成 → 治理 | **核心能力进行中（当前重心）** |
| Web UI 线（`apps/fdecode`） | 可用 → 对齐 DSH → 会话完整 → 团队可用 | 里程碑 M1–M5 已交付 |

平台能力由真实使用暴露的缺口触发，不由计划表触发；每项能力仍须走 vision → RAD → plan → 验证。项目宪法是 [`docs/specs/vision.md`](docs/specs/vision.md)。

## 仓库结构

| 目录 | 内容 |
|---|---|
| `packages/` | Pi fork 与共享库（9 个包） |
| `apps/` | 可运行应用：`apps/omfde`（平台入口）、`apps/fdecode`（FDE Code UI）、`apps/docs-site`（文档站） |
| `extensions/` | 平台扩展：`extensions/omfde-core`（第一个骨架） |
| `docs/` | 治理与架构记录：`specs/`（宪法、工作流、术语表）、`rads/`、`plans/`、`spikes/`、`explains/` |

## 快速开始

需要 Node.js >= 22.19 与 pnpm 11.15.1（由 `packageManager` 钉死）。

```bash
pnpm install --ignore-scripts          # 安装依赖（不运行生命周期脚本）
pnpm --filter @omfde/fdecode build     # 首次启动前构建一次 Web UI
pnpm run omfde                         # 平台入口：启动 FDE Code UI（OMFDE_PLATFORM=1）
pnpm run omfde -- --tui                # 改为直接启动 Pi TUI
```

## 包

| 包 | 说明 |
|---|---|
| **[@earendil-works/pi-agent-core](packages/agent)** | 带工具调用和状态管理的 agent 运行时 |
| **[@earendil-works/pi-ai](packages/ai)** | 统一的多 provider LLM API（OpenAI、Anthropic、Google 等） |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | 交互式 coding agent CLI：会话、扩展、工具、压缩 |
| **[@earendil-works/pi-codemode](packages/codemode)** | 沙箱化 JavaScript 执行，唯一能力是调用注入的工具 |
| **[@earendil-works/pi-evals](packages/evals)** | 评测 harness |
| **[@earendil-works/pi-mcp](packages/mcp)** | 独立的 Model Context Protocol 客户端 |
| **[@earendil-works/pi-schema](packages/schema)** | 不使用 eval 的 JSON Schema 校验：支持 2020-12 和 7，编译为普通闭包 |
| **[@earendil-works/pi-telemetry](packages/telemetry)** | 厂商中立的遥测契约、参考适配器、一致性测试和类型化 schema |
| **[@earendil-works/pi-tui](packages/tui)** | 带差分渲染的终端 UI 库 |

上游的 `chord` / `durable` / `env` / `p2` 四个子系统已在 fork 时裁剪（约占仓库体积一半），可从 git 历史找回。Pi 的用户文档仍在 [`packages/coding-agent/docs/`](packages/coding-agent/docs/)。

## FDE Code UI（`apps/fdecode`）

Web UI 线交付 `fdecode`（包名 `@omfde/fdecode`，界面名 "FDE Code"）：本地优先的 React + TanStack Start + Tailwind CSS + Vite 应用。会话、归属、链接、分享与审计存于 `~/.fdecode/fdecode.db`（`node:sqlite`）；配置仍在 `config.json`；环境变量统一 `FDECODE_*` 前缀。M3 起支持 3~5 人团队共用（可选 LAN 绑定 + 访问令牌认证、管理员/成员两级角色）。

`apps/omfde` 以**组合式接入**消费它：启动已构建的 Web UI 服务，经 `FDECODE_CONFIG`、`FDECODE_CWD` 与端口共享配置。`apps/fdecode` 保持独立目录与独立启动方式，代码不并入平台骨架。

```bash
pnpm run fdecode   # 从源码运行 Web UI（dev）
```

## 文档站

`apps/docs-site` 用 [Blume](https://useblume.dev)（Astro + Vite，纯静态）把 `docs/` 和 `.qoder/repowiki/` 汇聚成一个统一的中文文档站，同时服务人和 coding agent：除 HTML 外，构建还产出 `llms.txt`、每页 `.md` 镜像和 JSON docs API。

它发布到 `pages` 分支，地址是 <https://fde-group.github.io/oh-my-fde/>。

```bash
pnpm --filter @omfde/docs-site build   # 同步内容 + 构建 dist/
pnpm --filter @omfde/docs-site deploy  # 演练发布到 pages（deploy:publish 才真正 push）
```

构建与发布机制见 [`docs/explains/28-docs-site.md`](docs/explains/28-docs-site.md)。

## 开发

```bash
pnpm install --ignore-scripts  # 安装所有依赖，不运行生命周期脚本
pnpm run build                 # 刷新模型数据，然后构建所有包
pnpm run build:offline         # 使用已有模型数据重新构建，不访问网络
pnpm run check                 # 全量本地质量门禁：lint、格式、类型、TSDoc、secrets（只读；不跑测试）
./test.sh                      # 运行 packages/* 测试（不直接跑全量 vitest：env 变量存在时会激活 e2e）
pnpm run tui                   # 从源码运行 Pi TUI
```

- 所有质量门禁**只在本地执行**；本 fork 不依赖远程 CI。pre-commit 检查 staged 文件，pre-push 跑完整 `pnpm run check`。
- 所有工作只在 `main` 上进行，每个任务有显式 write scope；多个 Agent 可能共享同一 worktree。绝不 `git add -A`。
- 依赖与 `pnpm-lock.yaml` 按已评审代码对待：直接依赖钉精确版本；除非 `PI_ALLOW_LOCKFILE_CHANGE=1`，pre-commit 阻止 lockfile 提交。
- 测试不得使用真实 provider API、密钥或付费 token；使用 faux provider。

## 治理与贡献

- [`docs/specs/vision.md`](docs/specs/vision.md) —— 项目宪法：目标、边界、阶段、决策记录。冲突的决策先停下修宪，再实施。
- [`docs/specs/workflow.md`](docs/specs/workflow.md) —— RAD → Spike → Plan → 验证闭环与各闸定义。
- [`docs/specs/glossary.md`](docs/specs/glossary.md) —— 术语 SSOT，统一人机交流口径。
- [`AGENTS.md`](AGENTS.md) —— 面向人和 agent 的执行纪律（write scope、Git 规则、命令）。[`CONTRIBUTING.md`](CONTRIBUTING.md) —— 贡献者操作细节与代码门禁。

内部工作默认不开 PR；`main` 是唯一开发分支。GitHub Issues 是团队可见的任务板。

## 与上游的关系

本 fork 不发布版本，也不向上游 Pi 贡献。npm 时代的 `install-lock` 与发布脚本是保留在树中但不使用的遗留路径。必须查阅上游代码时，取入临时 clone——`upstream` remote 保持删除状态。

## 许可证

MIT

<p align="center">
  <strong>omfde</strong> —— 企业内部 FDE 平台。
</p>

<p align="center">
  <img alt="omfde" src="omfde.jpg" width="160">&nbsp;&nbsp;<img alt="Abel" src="abel.jpg" width="160">
</p>
