# Pi Web UI

独立的 Pi 浏览器客户端，不依赖 `apps/omfde`。布局与设计系统对齐 DSH，实现层使用 React + TanStack Start + Tailwind CSS + Vite。

## 状态

M1 + M2 可用范围：

- 会话：新建、列表、恢复、重命名、分叉、克隆。
- 对话：prompt、流式文本、thinking、工具卡片、diff、中止。
- 输入：图片粘贴/拖拽/选择、`@file` 引用、`/` 斜杠命令。
- 排队：运行中发送 steering 或 follow-up。
- 控制：模型切换、token、费用、上下文占用。
- 并行：多个会话同时运行，侧栏显示运行状态。
- 扩展：`notify` 显示为提示；弹窗自动取消。
- 断连：刷新页面后从快照恢复；Pi 进程崩溃可重新启动。

不在当前范围：文件编辑器、完整文件浏览器、命令参数补全、远程访问、多用户。

## 输入限制

| 类型 | 限制 |
|---|---|
| 图片（浏览器） | 长边 2048px、单图 5MB；Pi 再按模型限制规范化 |
| 图片（`@file`） | 单文件 10MB |
| 文本（`@file`） | 单文件 256KB |
| 文件搜索 | 排除 `.git`、`node_modules`、`dist` 等目录 |

## 运行

前置条件：

- Node.js >= 22.19。
- pnpm 11.15.1。
- Pi CLI 可用：默认使用 PATH 中的 `pi`；也可以设置 `PI_WEB_PI_BIN` 指向 `packages/coding-agent/dist/bundle/cli.js` 或包装脚本。

开发：

```bash
# 在任意项目目录执行；Pi 默认在该目录工作
pnpm run pi-web

# 只启动应用包
pnpm --filter @omfde/pi-web dev
```

生产：

```bash
pnpm --filter @omfde/pi-web build
pnpm --filter @omfde/pi-web start
```

默认地址：`http://127.0.0.1:3210`。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PI_WEB_PORT` / `PORT` | `3210` | 监听端口，仅绑定 `127.0.0.1` |
| `PI_WEB_CWD` | `INIT_CWD` 或当前目录 | Pi 的工作目录 |
| `PI_WEB_PI_BIN` | `pi` | Pi 可执行文件 |
| `PI_WEB_IDLE_MS` | `1800000` | 空闲回收阈值（毫秒） |
| `PI_WEB_MAX_RUNTIMES` | `4` | 最大活跃 Pi 子进程数 |

## HTTP 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 进程与工作目录 |
| GET | `/api/sessions` | 当前项目的会话列表 |
| POST | `/api/sessions` | 新建；`{"resumeId":"..."}` 恢复已有会话 |
| GET | `/api/sessions/:id` | 状态、消息、用量快照 |
| GET | `/api/sessions/:id/events` | SSE：先 `snapshot`，再逐条事件 |
| POST | `/api/sessions/:id/commands` | 转发 RPC 命令 |
| PATCH | `/api/sessions/:id` | 重命名 |
| POST | `/api/sessions/:id/fork` | 从 user 消息分叉 |
| POST | `/api/sessions/:id/clone` | 克隆当前分支 |
| DELETE | `/api/sessions/:id` | 关闭运行时，不删除会话文件 |
| GET | `/api/runtimes` | 活跃运行时与忙碌状态 |
| GET | `/api/files/search?q=` | 项目文件搜索 |
| POST | `/api/files/expand` | 展开 `@file` 引用 |

## 架构

```text
浏览器 ──HTTP/SSE── Node 服务 ──JSONL── pi --mode rpc
```

- 一个 Pi 子进程对应一个会话；空闲回收后会话文件保留。
- 会话事实以 Pi 为准；SSE 重连时整体替换为快照。
- 命令端点并发处理；扩展弹窗在服务端直接取消。
- 只为当前会话保持 SSE；后台会话继续运行，切换时拉快照。
- `@file` 只允许项目目录内的普通文件，`realpath` 后校验，拒绝符号链接逃逸。
- 生产入口 `server.mjs` 负责静态资源和 `serverEntry.fetch`，不是构建产物自带。
- 会话索引只使用 `@earendil-works/pi-coding-agent` 的公开导出，不读内部实现。

## 安全

- 只监听回环地址；校验 `Host`、`Origin` 和 `Sec-Fetch-Site`。
- 生产响应带 CSP、`nosniff`、`frame-ancestors 'none'`。
- 浏览器不接触文件系统、API key 或子进程。
- 不做登录；不要暴露到公网。

## 测试

```bash
pnpm --filter @omfde/pi-web test
pnpm run check
```

测试用 `test/faux-extension.ts` 注册 faux provider，驱动真实 RPC 子进程，不调用真实模型。
