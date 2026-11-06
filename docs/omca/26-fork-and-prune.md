# Fork 与裁剪说明

这份文档解释“把 Pi fork 下来并裁剪了约一半代码”具体指什么，以及哪些事情没有发生。

## 1. 一句话

在本地复制 Pi 的仓库，保留上游引用，建立自己的工作分支；然后按依赖关系删除
四个与 coding-agent 无关的子系统。**coding-agent 的核心代码没有改。**

## 2. “Fork”在这里的含义

不是 GitHub 上的 fork 按钮，没有账号关系，也没有 push。

```bash
git init
git remote add upstream https://github.com/earendil-works/pi.git
git fetch upstream
git checkout -B main upstream/main
git checkout -B omca
```

| 引用 | 作用 |
|---|---|
| `upstream` | Pi 官方仓库，只读同步源 |
| `main` | 上游镜像，没有自己的提交 |
| `omca` | 所有实际工作所在的分支 |

所以“fork”= 本地 Git 分支 + 上游 remote，而不是平台意义上的 fork。

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
| 文档与验证脚本（`docs/omca`） | 30 文件，+5,710 行 |
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

能。两处都有：

```bash
# 本地 fork 基点
git show 20d86c365:packages/chord/README.md

# 或从上游
git fetch upstream
git show upstream/main:packages/durable/README.md
```

删除本身也是三个独立提交，可以单独 revert：

```
22696ea0b  remove apps/p2
5f76a237e  remove packages/env
5b6dc4f6c  remove chord and durable
```

## 9. 上游漂移

fork 基点是：

```
20d86c365  2026-11-05 18:07  feat(p2): Chord v2 cleanup pass
```

但 `upstream/main` 后来被某个后台 fetch 更新到了：

```
2a32a605a  2026-11-05 23:35  feat(p2): Gondolin sandbox environments
```

比基点新 11 个提交。这解释了一个容易误判的现象：用
`git diff upstream/main` 看核心代码，会看到 128 行改动，但那**不是我们的改动**，
而是上游新增的 11 个提交。

正确的比较方式：

```bash
git diff 20d86c365          # 我们自己的改动
git log --oneline HEAD..upstream/main   # 上游新增的提交
```

同步上游时建议：

```bash
git fetch upstream
git rebase upstream/main
```

不要直接 `merge`，否则历史里会混入上游的合并提交，之后很难看清自己的改动。

## 10. 这不是什么

- **不是 GitHub fork**：没有账号关系，没有 push。
- **不是重写 Pi**：核心代码只删了 2 行注释。
- **不是删功能**：删的是 coding-agent 从不加载的包。
- **不是永久删除**：git 历史和上游都保留着。

## 11. 当前验证状态

- `npm run check`：通过；
- `./test.sh`：最后一次运行剩余 17 个失败，均为环境相关（剪贴板、Bun worker、
  模型目录网络、时序），详见 `00-baseline.md`；
- 四项基于 faux provider 的运行验证通过，见 `25-validation.md`。

## 12. 一个未跟踪目录

工作树里有一个未跟踪的 `docs/specs/`，不是本项目创建的，也没有被提交。
如果它是另一个会话或工具写的，注意避免与本仓库的改动互相覆盖。
