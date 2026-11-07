# Plan：Web UI 接入 omfde 平台

> 效力：经决策者批准后，本文件是实现和验收的唯一编码依据。方向记录见 `docs/specs/vision.md`。
>
> Spike 闸：无需 spike（2026-11-06，决策者已批准）。

| 字段 | 值 |
|---|---|
| 状态 | 已批准 |
| 决策者 | Abel |
| 关联 issue | [#5](https://github.com/FDE-GROUP/oh-my-fde/issues/5) |
| 关联 RAD | 无（组合式接入，由 vision 决策记录覆盖） |
| 最后更新 | 2026-11-06 |

## 1. 目标

让 `pnpm run omfde` 默认启动 FDE Code UI，保留 `--tui` 回退。组合式接入：不移动、不合并 `apps/fdecode` 代码。

## 2. 非目标

- 任务、交接数据共享。
- Web UI 代码迁移或包合并。
- 反向代理、TLS、进程守护；沿用 fdecode 的部署方式。
- 自动构建 Web UI。

## 3. 设计要点

### 3.1 启动器参数

| 参数 | 行为 |
|---|---|
| 无参数 | 启动 Web UI |
| `--tui [pi args]` | 启动 Pi TUI，其余参数透传 |
| `--port <n>` | Web UI 端口 |
| `--host <h>` | 监听地址 |
| `--config <path>` | `FDECODE_CONFIG` |
| `--no-open` | 不自动打开浏览器 |
| `--help` | 打印用法 |

Web UI 模式下不接受 Pi 参数透传；需要时用 `--tui`。

### 3.2 环境

- 设置 `OMFDE_PLATFORM=1`。
- `FDECODE_CWD` 未设置时使用启动器的当前目录。
- `--port`/`--host`/`--config` 映射到 `FDECODE_PORT`/`FDECODE_HOST`/`FDECODE_CONFIG`。
- 其余环境变量原样继承。

### 3.3 构建检查

启动前检查 `apps/fdecode/dist/server/server.js`。缺失时退出并提示：

```text
omfde: Web UI 尚未构建。先运行 pnpm --filter @omfde/fdecode build，或使用 omfde --tui。
```

### 3.4 进程与信号

- 子进程 `stdio: inherit`。
- 转发 SIGINT/SIGTERM，子进程退出后按原退出码结束。
- 浏览器打开使用 `xdg-open` / `open` / `cmd /c start`，失败静默。

## 4. 实施切片

### S1 启动器

- 解析参数与帮助。
- Web UI 启动、构建检查、环境映射、信号转发。
- `--tui` 回退保持现有行为。

完成判据：`omfde --help`、`omfde --tui --version`、Web 启动冒烟通过。

状态：已完成（2026-11-06）。验证：help 与 TUI 版本通过；Web UI 在 3211 启动，健康检查 200；SIGINT 后父子进程均退出；未构建时提示正确。

### S2 文档与验证

- 更新根 README、`AGENTS.md`/`AGENTS.zh-CN.md` 中的 omfde 入口说明。
- 运行 `pnpm run check`。
- Web 启动冒烟：curl `/api/health` 与 `/login`；TUI 回退验证。

完成判据：文档与行为一致；检查通过。

状态：已完成（2026-11-06）。验证：根 README.zh-CN、AGENTS 中英文入口说明已更新；`pnpm run check` 通过；app 测试 27 项通过。

## 5. 测试与验证

- `pnpm run omfde -- --help`：打印用法。
- `pnpm run omfde -- --tui --version`：输出 Pi 版本并退出。
- `pnpm run omfde -- --no-open --port 3211`：启动 Web UI，`/api/health` 200；停止后进程退出。
- `pnpm run check` 通过。

## 6. 风险

| 风险 | 应对 |
|---|---|
| 未构建 Web UI | 启动前检查并给出明确命令 |
| 端口占用 | 透传 fdecode 的启动错误 |
| 浏览器打开失败 | 静默忽略，仍打印地址 |
| 信号处理重复退出 | 统一在 child exit 处理 |

## 7. 决策者批准记录

- 批准范围：全文（启动器、参数、构建检查、文档与验证）。
- 日期：2026-11-06
- 备注：决策者以“同意，无需 spike”批准本 plan。
