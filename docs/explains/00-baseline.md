# 基线记录

日期：2026-11-06
上游：`https://github.com/earendil-works/pi.git`
上游提交：`20d86c365` (2026-11-05) `feat(p2): Chord v2 cleanup pass`
工作分支：`main`（`upstream/main` 为只读镜像；2026-11-06 前使用 `omca`）

## 环境

| 项 | 值 |
|---|---|
| Node | v22.23.0（要求 >=22.19.0） |
| npm | 10.9.8 |
| git | 2.43.0 |
| 磁盘 | 873G 可用 |
| git 身份 | 仓库本地：`abel <abel@localhost>`（按需修改） |

网络说明：直连 DNS 不可用，`127.0.0.1:7897` 有 HTTP 代理。Node 22 的
`fetch` 默认不读代理环境变量，构建时必须加 `NODE_USE_ENV_PROXY=1`，
否则 `packages/ai` 拉取 models.dev 会报 `EAI_AGAIN`。

## 建立基线的命令

```bash
git init
git remote add upstream https://github.com/earendil-works/pi.git
git fetch --no-tags upstream '+refs/heads/main:refs/remotes/upstream/main'
git checkout -B main upstream/main

npm install --ignore-scripts
NODE_USE_ENV_PROXY=1 npm run build
npm run check
NODE_USE_ENV_PROXY=1 ./test.sh
```

## 裁剪前的基线

| 命令 | 结果 |
|---|---|
| `npm install --ignore-scripts` | 通过，306 包，0 漏洞 |
| `npm run build` | 通过，bundle 84 文件 / 9.2 MiB |
| `npm run check` | 通过（EXIT 0） |
| `./test.sh` | EXIT 1：46 个既有失败 + 7 个导入失败 |

**更正**：初次汇报只看到 7 个失败，是因为输出被 `tail` 截断。完整基线是
46 个测试失败（分布在 10 个文件）外加 `packages/env` 的 7 个导入失败。
这些失败全部与裁剪无关，原因见下。

### 既有失败分类

| 原因 | 数量 | 说明 |
|---|---:|---|
| 缺 `rg` / `fd` | 27 | `tools.test.ts` 21 个 + `3302/3303` 回归 6 个 |
| 剪贴板 / 无头环境 | 12 | `clipboard*.test.ts`，需要 X11/Wayland 工具 |
| Bun worker 生命周期 | 3 | `codemode/test/worker-lifetime.test.ts`，本机 Bun 行为差异 |
| 网络 / 模型目录 | 1 | `model-catalog-protocol.test.ts` |
| 时序 flaky | 1 | `auth-storage.test.ts` |
| `packages/env` 缺 Rust daemon | 7 个文件 | `cargo build` 未执行，导入即失败 |

`rg` 和 `fd` 由 `packages/coding-agent/src/utils/tools-manager.ts` 的
`ensureTool()` 按需下载。`test.sh` 用 `env -i` 隔离环境，不传代理变量，
下载失败；系统 PATH 上也没有这两个二进制。这是环境问题，不是代码回归。

## 裁剪后的结果

见 `02-prune-plan.md` 的执行记录。裁剪后 `npm run check` 通过；
`./test.sh` 剩 44 个失败，全部是上表中的环境问题（`env` 的 7 个导入失败
随包删除而消失，durable/chord 的 flaky 失败随包删除而消失）。

安装 `ripgrep 15.2.0` 与 `fd 10.5.1` 到 `~/.local/bin` 后，27 个
grep/find 失败消失，剩余 17 个：

| 原因 | 数量 |
|---|---:|
| 剪贴板 / 无头环境 | 12 |
| `codemode` Bun worker 生命周期 | 3 |
| 模型目录网络请求 | 1 |
| `auth-storage` 时序 flaky | 1 |

## 已知环境欠账

1. ~~安装 `ripgrep` 与 `fd`~~ 已完成（2026-11-06）。
2. 剪贴板测试需要 `xclip`/`wl-copy` 等工具，或跳过。
3. `codemode` 的 Bun worker 测试需要与上游一致的 Bun 版本才能验证。
4. `model-catalog-protocol` 与 `auth-storage` 属于网络/时序问题，
   用 `./test.sh` 的隔离环境无法稳定复现。
