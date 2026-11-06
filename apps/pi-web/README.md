# Pi Web UI

独立的 Pi 浏览器客户端，不依赖 `apps/omfde`。布局与设计系统对齐 DSH，实现层使用 React + TanStack Start + Tailwind CSS + Vite。

## 状态

已实现：

- 会话：新建、列表、恢复、重命名、分叉、克隆。
- 对话：prompt、流式文本、thinking、工具卡片、diff、中止。
- 输入：图片粘贴/拖拽/选择、`@file` 引用、`/` 斜杠命令。
- 排队：运行中发送 steering 或 follow-up。
- 控制：模型切换、token、费用、上下文占用。
- 并行：多个会话同时运行，侧栏显示状态。
- 团队：访问令牌登录、用户归属、工作区白名单、每用户并发上限。
- 移动端：抽屉布局、PWA manifest。

不做：文件编辑器、命令参数补全、SSO/LDAP、RBAC、审计库、多租户、云部署、内置 HTTPS 证书管理。

## 运行

前置条件：

- Node.js >= 22.19。
- pnpm 11.15.1。
- Pi CLI 可用：默认使用 PATH 中的 `pi`，或设置 `PI_WEB_PI_BIN`。

开发（回环、无认证）：

```bash
pnpm run pi-web
# 或
pnpm --filter @omfde/pi-web dev
```

生产：

```bash
pnpm --filter @omfde/pi-web build
pnpm --filter @omfde/pi-web start
```

默认地址：`http://127.0.0.1:3210`。

## 访问控制

- 只绑定 `127.0.0.1` 时，可以不配置认证，行为与 M1/M2 相同。
- 监听非回环地址时，**必须**配置至少一个用户；否则服务拒绝启动。
- 登录使用访问令牌，成功后写入 HttpOnly、SameSite=Strict 的 `piweb_session` cookie。
- 页面、API、SSE 共用同一 cookie；登出立即失效。
- 登录失败限速：同一来源每分钟最多 10 次。

开发模式不经过生产入口，因此没有登录页；生产部署才会启用认证。

## 配置

默认路径 `~/.pi-web/config.json`，权限 0600；可用 `PI_WEB_CONFIG` 覆盖。

```json
{
  "host": "0.0.0.0",
  "port": 3210,
  "publicOrigins": ["http://192.168.1.2:3210"],
  "auth": {
    "secret": "<自动生成>",
    "users": [{ "id": "abel", "name": "Abel", "tokenHash": "<sha256>" }]
  },
  "workspaces": [{ "id": "omfde", "name": "omfde", "path": "/home/abel/omfde" }],
  "limits": { "maxRuntimesPerUser": 2, "maxRuntimesTotal": 8 }
}
```

生成令牌哈希：

```bash
pnpm --filter @omfde/pi-web token
# 或指定令牌
pnpm --filter @omfde/pi-web token -- my-access-token
```

- 配置了用户但没有 `auth.secret` 时，首次启动会生成并写回。
- 工作区路径启动时校验；不存在或不是目录会拒绝启动。
- `publicOrigins` 用于反向代理或跨主机访问时的 Origin 校验。
- 旧会话没有归属记录：启用认证后默认不可见；需要时可手工补 `~/.pi-web/sessions.json`。

## 工作区

- 用户只能从白名单工作区创建会话。
- 会话的 cwd、Pi session 目录、`@file` 搜索都限定在该工作区。
- 文件接口只接受 `sessionId`，由服务端解析工作区，浏览器不能指定根目录。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PI_WEB_CONFIG` | `~/.pi-web/config.json` | 配置路径 |
| `PI_WEB_HOST` | 配置或 `127.0.0.1` | 监听地址 |
| `PI_WEB_PORT` / `PORT` | `3210` | 监听端口 |
| `PI_WEB_CWD` | `INIT_CWD` 或当前目录 | 无配置文件时的默认工作区 |
| `PI_WEB_PI_BIN` | `pi` | Pi 可执行文件 |
| `PI_WEB_IDLE_MS` | `1800000` | 空闲回收阈值 |
| `PI_WEB_MAX_RUNTIMES` | 配置或 `8` | 全局活跃运行时上限 |
| `PI_WEB_MAX_PER_USER` | 配置或 `2` | 每用户活跃运行时上限 |

## HTTP 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 令牌登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/workspaces` | 用户与工作区 |
| GET | `/api/health` | 进程与默认工作区 |
| GET | `/api/sessions` | 当前用户可见会话 |
| POST | `/api/sessions` | 新建；`{workspaceId}` 或 `{resumeId}` |
| GET | `/api/sessions/:id` | 状态、消息、用量快照 |
| GET | `/api/sessions/:id/events` | SSE |
| POST | `/api/sessions/:id/commands` | 转发 RPC 命令 |
| PATCH | `/api/sessions/:id` | 重命名 |
| POST | `/api/sessions/:id/fork` | 从 user 消息分叉 |
| POST | `/api/sessions/:id/clone` | 克隆当前分支 |
| DELETE | `/api/sessions/:id` | 关闭运行时 |
| GET | `/api/runtimes` | 当前用户活跃运行时 |
| GET | `/api/files/search?sessionId=&q=` | 工作区文件搜索 |
| POST | `/api/files/expand` | `{sessionId, paths}` 展开 `@file` |

## 架构

```text
浏览器 ──HTTP/SSE + cookie── 生产入口（认证/安全头）
  └── TanStack Start ──JSONL── pi --mode rpc（每会话一个进程）
```

- 认证在 `server.mjs` 边缘层完成，校验后向应用注入 `x-piweb-user`。
- 会话事实以 Pi 为准；SSE 重连时整体替换为快照。
- 只为当前会话保持 SSE；后台会话继续运行。
- `@file` 只允许工作区内普通文件；敏感文件名（`.env`、密钥等）默认跳过。
- 归属索引 `~/.pi-web/sessions.json` 使用原子写，0600。

## 安全

- 只监听回环时默认无认证；非回环必须配置认证。
- 校验 Host、Origin、Sec-Fetch-Site；跨站请求拒绝。
- 登录 cookie 为 HttpOnly、SameSite=Strict；HTTPS 时加 Secure。
- 生产响应带 CSP、`nosniff`、`frame-ancestors 'none'`。
- 浏览器不接触文件系统、API key 或子进程。
- 默认假定 HTTPS 由反向代理终止；内置证书管理不在当前范围。

## 测试

```bash
pnpm --filter @omfde/pi-web test
pnpm run check
```

测试使用 faux provider 驱动真实 RPC 子进程，不调用真实模型。
