# 裁剪方案与执行记录

日期：2026-11-06
分支：`main`（当时为 `omca`）

## 实际执行

计划是四批，实际合并为三批：第三、四批必须同时做。

原因是 `packages/chord/test/bench/*` 直接 import 了
`packages/durable/src/...` 的源码。先删 `durable` 会让 `chord` 的
`tsc --noEmit` 失败。这是测试级交叉依赖，包级依赖图里看不出来。

| 提交 | 内容 | 删除 |
|---|---|---|
| `22696ea0b` | `apps/p2` | 700 文件 / 137,228 行 |
| `5f76a237e` | `packages/env` | 46 文件 / 11,272 行 |
| `3574562f1` | `packages/chord` + `durable` + durable smoke 脚本 | 1,250 文件 / 281,145 行 |

合计删除 1,996 个文件、约 43 万行。

## 同步修改的文件

| 文件 | 改动 |
|---|---|
| `package.json` | workspaces 去掉 `apps/*` 和 chord tutorial；build 链去掉 chord/durable/env |
| `package-lock.json` | 移除已不存在 workspace 的 stale 条目 |
| `scripts/sync-versions.test.mjs` | 去掉 `apps/p2` 用例 |
| `scripts/preview-packages.mjs` | 去掉 `pi-env` 排除项 |
| `scripts/preview-packages.test.mjs` | 去掉 env fixture |
| `scripts/check-entry-graphs.mjs` | 去掉 chord/durable 的 workspace 与预算 |
| `scripts/check-browser-smoke.mjs` | 去掉 durable bundle 检查 |
| `scripts/browser-smoke-entry.ts` | 去掉 chord 导入 |
| `scripts/generate-coding-agent-install-lock.mjs` | 去掉 chord 特例 |
| `packages/coding-agent/src/utils/shell.ts` | 删除指向 durable 的失效注释 |

## 结果

| 项 | 裁剪前 | 裁剪后 |
|---|---:|---:|
| 跟踪文件 | 3,995 | 1,999 |
| 包 | 13 + 1 app | 9 |
| 行数（跟踪文件） | ~855k | ~422k |
| `npm run check` | 通过 | 通过 |
| `./test.sh` 失败 | 46 + 7 导入 | 44 |

剩余包：`agent`、`ai`、`coding-agent`、`codemode`、`evals`、`mcp`、
`schema`、`telemetry`、`tui`。

## 未删除的包

| 包 | 原因 |
|---|---|
| `telemetry` | `ai` 直接依赖，内联后再评估 |
| `evals` | 可改造成 benchmark harness |
| `codemode` / `mcp` | `coding-agent` 直接依赖 |

## 后续

1. 安装 `rg` 和 `fd`，让 27 个失败消失。
2. 按 `01-repo-map.md` 的四条路径读代码。
3. 第一个功能改动建议：`tool_call` 层的写路径白名单，`advise` 级别。
