# Plan：FDE Code UI M1

> 效力：经决策者批准后，本文件是实现和验收的唯一编码依据。需求见 `docs/rads/fdecode.md`；RAD 与 plan 冲突时以 RAD 为准。
>
> 流程：vision → RAD → spike → plan → 实现，详见 `docs/specs/workflow.md`。

| 字段 | 值 |
|---|---|
| 状态 | 已批准 |
| 决策者 | Abel |
| 关联 issue | [#1](https://github.com/FDE-GROUP/oh-my-fde/issues/1) |
| 关联 RAD | `docs/rads/fdecode.md` |
| 最后更新 | 2026-11-06 |

> Spike 闸已过：S-1 到 S-4 完成，S-5 暂缓（2026-11-06）。结论见 `docs/spikes/fdecode-stack.md`；本文件已批准。

## 1. 背景与目标

RAD 已确认 FDE Code UI M1 的范围与形态。本 plan 把它拆成可执行切片，锁定技术选型、目录结构、进程模型、HTTP/SSE 协议和验证方式。

目标：在 `apps/fdecode` 交付一个本地启动、可连续几天代替 TUI 的浏览器客户端。

## 2. 非目标

- 不做 RAD 第 5 节列出的非目标。
- 不做 M2 功能：`@file`、图片粘贴、扩展完整 UI、会话分叉、多会话并行。
- 不改 Pi 内核，不 import Pi 内部模块；只使用 RPC 协议与 `@earendil-works/pi-coding-agent` 的公开导出。
- 不做远程访问、认证、多用户。
- M1 不提供工作目录切换；项目目录由后端启动目录决定。

## 3. 关联

- Issue #1
- `docs/rads/fdecode.md`
- `packages/coding-agent/docs/rpc.md`、`rpc-commands.md`、`json.md`、`rpc-extension-ui.md`

## 4. 设计要点

### 4.1 总体结构

```text
浏览器（React + TanStack Start + Tailwind）
  │  GET /api/sessions/:id/events   (SSE)
  │  POST /api/sessions/:id/commands
  ▼
apps/fdecode 的 Node 服务
  │  JSONL stdin/stdout
  ▼
pi --mode rpc --session <path>
```

- 一个 Pi 子进程对应一个会话。
- 浏览器只与 HTTP/SSE 打交道，不接触子进程、文件系统或密钥。
- 会话事实来自 Pi；前端状态可丢弃，重连时以服务端快照为准。

### 4.2 目录结构

```text
apps/fdecode/
  package.json
  tsconfig.json
  vite.config.ts
  server.mjs            # 生产入口：静态资源 + serverEntry.fetch
  scripts/
    generate-tokens.mjs # 从 DSH 源生成 token 子集
  src/
    routes/
      __root.tsx
      index.tsx
      session.$sessionId.tsx
      api/health.ts
      api/sessions.ts
      api/sessions.$sessionId.ts
      api/sessions.$sessionId.events.ts
      api/sessions.$sessionId.commands.ts
    server/
      runtime.ts          # 单会话 RPC 子进程与生命周期
      runtime-manager.ts  # 会话 id → runtime，空闲回收
      jsonl.ts            # JSONL 分帧与命令关联
      sessions.ts         # SessionManager 列表与路径解析
      security.ts         # Host / Origin 校验
    components/
      layout/             # AppFrame、Sidebar、RightPanel
      conversation/       # 消息列表、Markdown、thinking
      tools/              # 工具卡片、diff、结果
      composer/           # 输入框、排队、中止
      controls/           # 模型菜单、状态、用量
      primitives/         # Button、Menu、Dialog、Toast
    styles/
      tokens/
        generated.css     # 由生成脚本产出的 DSH token 子集
        app-tokens.css    # 字体、圆角、阴影、焦点环
      app.css             # Tailwind 入口与 @theme 映射
    lib/
      api.ts              # 浏览器侧 HTTP 客户端
      stream.ts           # SSE 客户端与重连
      reducer.ts          # 事件归约（纯函数）
  test/
    jsonl.test.ts
    reducer.test.ts
    runtime.test.ts
    faux-extension.ts     # 测试用 faux provider 扩展，驱动真实 RPC 子进程
```

### 4.3 依赖（精确版本）

| 包 | 版本 | 用途 |
|---|---|---|
| `react` / `react-dom` | 19.3.1 | UI |
| `@tanstack/react-start` | 1.169.4 | 应用框架 |
| `@tanstack/react-router` | 1.170.46 | 路由 |
| `vite` | 8.3.6 | 构建与开发服务器 |
| `@tailwindcss/vite` / `tailwindcss` | 4.3.4 | 样式 |
| `react-markdown` | 10.1.0 | Markdown |
| `remark-gfm` | 4.0.1 | GFM |
| `shiki` | 4.6.0 | 代码高亮 |
| `clsx` | 2.1.1 | 条件类名 |
| `vitest` | 5.1.0 | 单元与集成测试 |
| `@types/react` / `@types/react-dom` | 19.3.0 | 类型 |
| `@types/node` | 26.6.6 | 类型 |

TypeScript 使用仓库根版本 7.0.2。新增依赖固定精确版本，并用 `pnpm install --lockfile-only --ignore-scripts` 更新锁文件。pnpm 11 不再读取 `package.json` 的 `pnpm.onlyBuiltDependencies`，需要放 `pnpm-workspace.yaml`。

### 4.4 会话与进程

- **发现**：`SessionManager.list(cwd)` 读取当前目录的会话；只用公开导出的 `SessionInfo` 字段。
- **启动**：`pi --mode rpc --session <path>`；新会话用 `pi --mode rpc`，创建后从 `get_state` 取 id。
- **映射**：路由用 Pi 的 session id；服务端维护 `id → runtime`。
- **打开**：首次打开会话时懒启动子进程，随后 `get_state` + `get_messages` + `get_session_stats`。
- **空闲回收**：30 分钟无命令和事件后发送 SIGTERM，等待退出；会话文件保留。
- **崩溃**：子进程退出时向 SSE 推送 `runtime_exit`，UI 显示原因和“重新启动”操作。
- **并发**：M1 最多同时活跃 4 个 runtime，超出时回收最久未使用的空闲 runtime。

### 4.5 HTTP 与 SSE 协议

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | `{ ok, piBin, cwd }` |
| GET | `/api/sessions` | 会话列表（当前 cwd） |
| POST | `/api/sessions` | 新建会话并返回 `{ id }` |
| GET | `/api/sessions/:id` | 快照 `{ state, messages, stats }` |
| GET | `/api/sessions/:id/events` | SSE：先 `snapshot`，后逐条事件 |
| POST | `/api/sessions/:id/commands` | 转发一条 RPC 命令，返回 Pi 的 response |
| DELETE | `/api/sessions/:id` | 关闭 runtime，不删除会话文件 |

命令端点必须并发处理：扩展命令可能一直等待 UI 响应，串行会死锁。任何命令都不得阻塞其他命令。

扩展弹窗（`select` / `confirm` / `input` / `editor`）在 M1 统一回 `cancelled`；没有客户端连接或超过 60 秒时由服务端自动取消。

SSE 信封：

```json
{"seq":12,"ts":1762400000000,"kind":"event","payload":{"type":"message_update","..." :"..."}}
```

- `seq` 每次连接内单调递增，用于客户端排序与丢弃重复。
- 连接建立时先发 `kind:"snapshot"`，包含 `state`、`messages`、`stats`；客户端整体替换本地状态。
- 事件原样透传 Pi 的会话事件；服务端额外发 `runtime_status`（starting / ready / reclaimed / exited）。

### 4.6 前端结构

- 路由：`/`（最近会话或新建）、`/session/:sessionId`。
- 状态：`useReducer` 管理对话，纯函数 reducer 放在 `lib/reducer.ts`，便于单测。
- 数据获取：TanStack Router loader 拉会话列表与快照；流式事件通过 SSE 追加。
- Markdown：`react-markdown` + `remark-gfm`，禁用原始 HTML。
- 代码：`shiki` 按需加载常用语言；diff 用现有文本解析，不引入 diff 组件库。
- 组件：自建 `primitives`，不引入组件库或 Tailwind UI 套件。

### 4.7 布局与主题

- 三栏：Sidebar（264–420，默认 280）、Conversation（主列）、RightPanel（M1 空置槽位）。
- 响应式：≥1024 三栏；768–1023 自动收起侧栏为 56px rail；<768 抽屉 + 遮罩。
- 主题：`html[data-theme="light|dark"]`，`system` 由 `prefers-color-scheme` 解析；选择存 `localStorage`。
- token：从 DSH（MIT）复制 M1 实际使用的子集（约 40–60 个），在 `tokens.css` 中按 light/dark 定义；出处和来源版本写在文件头注释。
- 提供 `scripts/generate-tokens.mjs`，从 DSH 源文件生成 token 子集，避免手工复制漂移。
- Tailwind v4 `@theme` 把 token 映射为语义工具类，例如 `--color-dsw-label-primary`、`--radius-dsw-card`。
- 组件不使用 `dark:` 分支；主题切换只改变 CSS 变量。
- 半像素边框用自定义 `hairline` 工具类，消费 `--dsh-hairline-width`。

### 4.8 安全

- 只监听 `127.0.0.1`。
- 校验 `Host` 为 `127.0.0.1:<port>` 或 `localhost:<port>`；POST/SSE 校验 `Origin` 同源，缺失 `Origin` 的非浏览器请求直接拒绝。
- 响应加 `CSP: default-src 'self'`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`。
- 不提供通用文件读取接口；错误信息不回显 API key。
- 日志默认不写 prompt 正文。

### 4.9 否决项及理由

| 选项 | 否决理由 |
|---|---|
| SDK 进程内 | 与“Web 崩溃不拖垮 Pi”冲突，且耦合内部 API |
| WebSocket | 需要自己实现重连与心跳；SSE + POST 已满足 M1 |
| 数据库 | 会话事实归 Pi，索引可直接扫描 session 目录 |
| 组件库 / shadcn | vision 禁止额外组件库；M1 控件数量可控 |
| CSS Modules | vision 已定 Tailwind |
| iframe 嵌入 TUI | 无法满足结构化工具卡片与主题要求 |
| 虚拟列表（M1） | 先用普通列表 + 内容折叠，性能问题出现再加 |

## 5. 实施切片

前置：Spike 闸由决策者裁定通过。需要实际验证的项见 `docs/spikes/fdecode-stack.md`；若某项被裁定不做，在对应切片中以文档结论为准。

### S1 workspace 与外壳

- 新增 `apps/fdecode` 包、脚本、tsconfig、Vite 配置。
- 增加自定义生产入口 `server.mjs`：服务 `dist/client` 静态资源，其余交给 `serverEntry.fetch`，支持流式响应。
- `pnpm-workspace.yaml`、根 `package.json`、`pnpm-lock.yaml` 串行修改。
- 实现 AppFrame、Sidebar、Conversation 占位、RightPanel 槽位、主题切换。
- 实现 `tokens.css`、token 生成脚本与 Tailwind `@theme` 映射。

完成判据：`pnpm --filter @omfde/fdecode dev` 可打开；生产构建可启动，`/api/health` 与 SSR 正常；1200/900/600px 布局正确；主题可切换并持久化。

状态：已完成（2026-11-06）。验证：`pnpm run check` 通过；dev 与生产入口的 `/api/health`、SSR HTML、token CSS 均已实测。

### S2 RPC 桥

- `jsonl.ts`：按 LF 分帧，处理 CRLF，不用 `readline`。
- `runtime.ts`：spawn、命令 id 关联、超时、stdout 事件分发、stderr 日志、退出处理。
- `runtime-manager.ts`：懒启动、空闲回收、并发上限。
- HTTP 路由：health、snapshot、SSE、commands。
- `test/faux-extension.ts` 与 `runtime.test.ts`。

完成判据：真实 Pi + faux provider 下命令/响应关联正确；SSE 能收到快照和事件；子进程退出有 exit 事件。

状态：已完成（2026-11-06）。验证：`pnpm --filter @omfde/fdecode test` 5 项通过；dev 实测创建会话、快照、命令、SSE、关闭均正常；`pnpm run check` 通过。

### S3 对话

- 消息快照渲染、流式文本、thinking 折叠。
- `reducer.ts` 处理 `message_update`、`message_end`、`toolcall_*`。
- 中止按钮；`abort` 后回到 idle。
- 自动滚动与“回到底部”。

完成判据：真实 Pi + faux provider 的固定脚本下，文本增量正确，`message_end` 校正无重复。

状态：已完成（2026-11-06）。验证：reducer 单测 5 项通过；HTTP + SSE 实测 `text_delta` 与最终快照一致；`pnpm run check` 通过。

### S4 工具卡片

- `tool_execution_start/update/end` 配对。
- 文本、代码、diff 三种结果呈现；长输出折叠。
- 工具错误态与耗时。

完成判据：并发工具调用不乱序；错误结果可见。

状态：已完成（2026-11-06）。验证：reducer 覆盖 start/update/end 与错误态；真实 RPC 测试产生 `tool_execution_*` 与 toolResult；`pnpm run check` 通过。

### S5 会话与控制

- 会话列表、新建、恢复、重命名。
- 模型菜单（`get_available_models` / `set_model`）。
- token、费用、上下文占用（`get_session_stats`）。
- 运行状态：streaming、compacting、retrying。

完成判据：RAD 场景 3、4 与 US-6、US-7 通过。

状态：已完成（2026-11-06）。验证：dev 实测列表、恢复、重命名、模型命令与用量查询；工作目录按 `FDECODE_CWD` → `INIT_CWD` → `process.cwd()` 解析；`pnpm run check` 通过。

### S6 排队与扩展

- Composer 支持 steer / followUp；显示 `queue_update` 队列。
- `extension_ui_request`：`notify` 显示提示；`select/confirm/input/editor` 统一回 `cancelled`；无客户端连接或超过 60 秒时服务端自动取消。

完成判据：运行中排队消息能送达；扩展弹窗不会挂死 agent。

状态：已完成（2026-11-06）。验证：运行中可切换插话/追加并显示队列数量；`notify` 显示为提示；弹窗由服务端立即取消；reducer 覆盖 `queue_update`。

### S7 加固

- 断线重连：重连拉快照；运行中刷新不丢历史。
- 崩溃恢复：错误提示 + 重启。
- 安全头、Host/Origin 校验。
- 空态、加载态、超时、无模型、无密钥等错误路径。
- 启动文档与 `.env` 说明。

完成判据：RAD 第 10 节验收步骤全部可复现。

状态：已完成（2026-11-06）。验证：生产入口实测 CSP 与安全头、Host/Origin 拒绝、SSE 重连快照、崩溃重启入口、会话加载态；启动文档见 `apps/fdecode/README.md`。浏览器内视觉与水合仍需人工冒烟。

## 6. 测试与验证

- 单元：`jsonl` 分帧、命令关联、reducer、SSE 信封。
- 集成：用 faux provider 扩展驱动真实 RPC 子进程，覆盖命令关联、事件顺序、中止、恢复和扩展 UI；不调用真实 provider。
- 手工冒烟：真实 Pi + DeepSeek 小 prompt，按 RAD 验收步骤逐条记录。
- 根门禁：`pnpm run check` 增加 `pnpm --filter @omfde/fdecode check`（typecheck + test + build）。
- 不引入 Playwright；响应式与主题先按手工冒烟验收，M2 再评估。

## 7. 验收判据

1. `pnpm --filter @omfde/fdecode dev` 启动，`127.0.0.1` 可用。
2. RAD 第 10 节 9 条验收步骤全部通过并记录输出。
3. `pnpm run check` 通过。
4. 无真实 provider 的自动化测试通过。
5. 浏览器端无密钥、无文件读取接口。

## 8. 风险与依赖

| 类型 | 内容 | 应对 |
|---|---|---|
| 风险 | TanStack Start 与 Vite 8 兼容问题 | 已由 S-1 验证；锁定 1.169.4 / 8.3.6，升级前重跑检查 |
| 风险 | 无浏览器环境导致水合与视觉未验证 | 实现 S1 第一项就是浏览器冒烟和截图评审 |
| 风险 | 扩展弹窗阻塞命令 | 命令端点并发 + 60 秒自动取消 |
| 风险 | dev 模式模块热更新导致重复子进程 | runtime 存在 `globalThis` 单例 |
| 风险 | Pi CLI 未构建时无法启动 | 文档要求先 `pnpm run build`，或设置 `FDECODE_PI_BIN` |
| 风险 | SSE 经过代理缓冲 | 本地直连 + 响应头 `Cache-Control: no-cache`、`X-Accel-Buffering: no` |
| 依赖 | DSH token 数值 | MIT，复制时在文件头注明出处 |
| 依赖 | Pi RPC 协议 | 只依赖文档化记录类型；协议变化先更新文档 |

## 9. 决策者批准记录

- 批准范围：全文（S1–S7、技术选型、协议、验收判据）。
- 日期：2026-11-06
- 备注：决策者以“开始 S1”批准本 plan；S1 完成后再进入 S2。
