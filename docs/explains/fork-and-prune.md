# Fork 与裁剪说明

这份文档解释“把 Pi fork 下来并裁剪了约一半代码”具体指什么，以及哪些事情没有发生。

> 2026-11-06 注：本文记录 fork 和裁剪的初始过程。之后已删除 `upstream` remote，转为独立维护；下文中关于 upstream 的命令是历史记录，不再作为当前工作流。

## 1. 一句话

当时在本地复制 Pi 的仓库，保留上游引用，建立自己的工作分支；然后按依赖关系删除
四个与 coding-agent 无关的子系统。**coding-agent 的核心代码没有改。**

## 2. “Fork”在这里的含义

不是 GitHub 上的 fork 按钮，没有账号关系，也没有 push。

```bash
git init
git remote add upstream https://github.com/earendil-works/pi.git
git fetch upstream
git checkout -B main upstream/main
```

当前引用：

| 引用 | 作用 |
|---|---|
| `main` | 产品主分支，承载 Pi fork、平台应用和扩展 |
| `pages` | 文档站分支，独立发布 GitHub Pages |
| `pi-fork-base-20d86c365` | 原始 fork 基点标签 |
| `omfde-cutover` | 切断上游、转为独立维护的标签 |

2026-11-06 前工作分支是 `omca`；分支整理后统一到 `main`，`omca` 已删除。之后 `upstream` remote 也已删除。

所以当时的“fork”= 本地 Git 分支 + 上游 remote，而不是平台意义上的 fork。当前已删除 `upstream` remote，转为独立维护。

## 3. 裁剪了什么

删除的四个子系统：

| 删除 | 文件 | 行数 | 原因 |
|---|---:|---:|---|
| `apps/p2` | 700 | 137,228 | 一个应用，依赖全部包 |
| `packages/env` | 46 | 11,272 | SSH 远程执行 daemon，依赖 durable/chord |
| `packages/durable` | 275 | 100,948 | 持久化运行时，只被 env/p2 使用 |
| `packages/chord` | 974 | 179,767 | 跨进程对象运行时，只被 durable/env/p2 使用 |
| `scripts/durable-browser-smoke-entry.ts` | 1 | 8 | 随 durable 删除 |

合计约 **1,996 个文件、43 万行**。

> 2026-11-06 注：后来新增了 `apps/` 作为平台应用目录（`apps/omfde`）。这里删除的是上游的 `apps/p2`，不是新的平台应用目录。

依据是包依赖图，不是猜测：

```
coding-agent 依赖：agent, ai, codemode, mcp, tui
ai 依赖：schema, telemetry
chord / durable / env / p2 是另一个集群
```

`coding-agent` 不依赖 `chord`、`durable`、`env` 或 `p2`，所以删掉它们不会影响
agent 的行为。

## 4. 保留了什么

裁剪后保留 9 个包：

```
agent          agent loop、工具执行、steering/follow-up
ai             provider 适配、模型目录、认证
coding-agent   CLI、session、扩展、tools、compaction
codemode       QuickJS 沙箱
evals          评测夹具
mcp            MCP 客户端实现
schema         JSON Schema 编译/校验
telemetry      遥测契约（ai 依赖）
tui            终端渲染库
```

## 5. 同步修改了什么

删除会影响构建、脚本和 lockfile，所以做了这些“路标”修改：

| 文件 | 改动 |
|---|---|
| `package.json` | workspaces 去掉 `apps/*` 和 chord tutorial；build 链去掉 chord/durable/env |
| `package-lock.json` | 移除已不存在 workspace 的 stale 条目 |
| `scripts/sync-versions.test.mjs` | 去掉 `apps/p2` 用例 |
| `scripts/preview-packages.mjs` / `.test.mjs` | 去掉 `pi-env` 排除项 |
| `scripts/check-entry-graphs.mjs` | 去掉 chord/durable 的 workspace 与预算 |
| `scripts/check-browser-smoke.mjs` | 去掉 durable bundle 检查 |
| `scripts/browser-smoke-entry.ts` | 去掉 chord 导入 |
| `scripts/generate-coding-agent-install-lock.mjs` | 去掉 chord 特例 |
| `packages/coding-agent/src/utils/shell.ts` | 删除 2 行指向已删 durable 的失效注释 |

## 6. 准确的 diff

以 fork 基点 `20d86c365` 比较：

```
git diff --shortstat 20d86c365
→ 2,036 files changed, 5,769 insertions(+), 429,663 deletions(-)
```

拆开看：

| 部分 | 变化 |
|---|---|
| 核心代码（agent/ai/coding-agent/tui/schema/mcp/codemode/telemetry） | 只有 `shell.ts` 删了 2 行注释 |
| 文档与验证脚本（`docs/explains`） | 30 文件，+5,710 行 |
| 删除的四个子系统 + 脚本 | 约 1,996 文件，约 43 万行 |
| 构建与脚本同步修改 | 少量增删 |

跟踪文件数：

```
fork 时：3,995
现在：   2,029（含新增的 30 份文档/脚本）
```

## 7. “51%”的口径

两个统计口径略有差异：

- 按包行数求和：约 85.5 万 → 约 42.2 万，删除约 43.3 万，占 **50.6%**；
- 按 `git diff` 的 deletions：429,663 行，占 **约 50.3%**。

说“约 50%–51%”更准确。它衡量的是**仓库体积和需要理解的代码量**，不是
“改了 Pi 一半的行为”。

## 8. 删掉的代码还能找回来吗

能。本地历史仍然保留：

```bash
# 本地 fork 基点
git show 20d86c365:packages/chord/README.md
git show pi-fork-base-20d86c365:packages/durable/README.md
```

如果要查看原上游仓库，使用临时 clone 或经批准的归档 ref，不要重新把 `upstream` 作为日常工作流依赖。

删除本身也是三个独立提交，可以单独 revert：

```
22696ea0b  remove apps/p2
5f76a237e  remove packages/env
5b6dc4f6c  remove chord and durable
```

## 9. 上游漂移（历史）

fork 基点是：

```
20d86c365  2026-11-05 18:07  feat(p2): Chord v2 cleanup pass
```

在切断上游之前，`upstream/main` 曾漂移到 `2a32a605a`，比基点新 11 个提交。
当时用 `git diff upstream/main` 会误把上游提交当成我们的改动。

2026-11-06 后已删除 `upstream` remote，不再做上游同步。历史比较使用本地标签：

```bash
git diff pi-fork-base-20d86c365   # 相对 fork 基点的改动
git diff omfde-cutover           # 相对切断点的改动
```

## 10. 这不是什么

- **不是 GitHub fork**：没有账号关系，也没有 push 到上游。
- **不是重写 Pi**：当前核心改动仍然很少；后续修改按 vision → RAD → plan 控制。
- **不是删功能**：删的是 coding-agent 从不加载的包。
- **不是永久删除**：git 历史保留着，`pi-fork-base-20d86c365` 标签可定位原始基点。

## 11. 当前验证状态

- `pnpm run check`：通过；
- `./test.sh`：最后一次运行剩余 17 个失败，均为环境相关（剪贴板、Bun worker、
  模型目录网络、时序），详见 `00-baseline.md`；
- 四项基于 faux provider 的运行验证通过，见 `25-validation.md`。

## 12. docs/specs 已跟踪

`docs/specs/` 已纳入版本控制；其中 `vision.md` 是项目宪法，修改时需要决策者确认并随相关变更提交。
