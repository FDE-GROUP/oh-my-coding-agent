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
- 协作：只读分享、交接文档导出、管理员只读视图、审计日志。
- 集成：GitHub Issue 列表与上下文、CI 状态。
- 通知：页面内通知、可选浏览器通知。
- 运维：会话/审计/分享保留策略与手动清理。
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
    "users": [
      { "id": "abel", "name": "Abel", "role": "admin", "tokenHash": "<sha256>" },
      { "id": "bob", "name": "Bob", "role": "member", "tokenHash": "<sha256>" }
    ]
  },
  "workspaces": [{ "id": "omfde", "name": "omfde", "path": "/home/abel/omfde" }],
  "limits": { "maxRuntimesPerUser": 2, "maxRuntimesTotal": 8 },
  "github": {
    "token": "<可选；PI_WEB_GITHUB_TOKEN 优先>",
    "repos": [{ "id": "omfde", "owner": "FDE-GROUP", "name": "oh-my-fde", "branch": "main" }]
  },
  "retention": { "sessionsDays": 0, "auditDays": 0, "sharesDays": 0 }
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
- 旧会话没有归属记录：启用认证后默认不可见，可用下面的命令回填。

```bash
# 查看未归属会话
pnpm --filter @omfde/pi-web import-sessions -- --list

# 回填到指定用户（可加 --workspace 限定工作区）
pnpm --filter @omfde/pi-web import-sessions -- --owner abel

# 只演练不写入
pnpm --filter @omfde/pi-web import-sessions -- --owner abel --dry-run
```

## 存储

- 元数据（会话归属、Issue 关联、分享、审计）在 SQLite：`~/.pi-web/pi-web.db`，可用 `PI_WEB_DB` 覆盖。
- 配置仍是 `config.json`，保持人工编辑。
- 服务启动时打开数据库并执行迁移；启用 WAL、`busy_timeout=5000`，数据库与 `-wal`/`-shm` 权限收紧到 0600。
- 首次启动把旧的 `sessions.json`、`links.json`、`shares.json`、`audit.jsonl` 一次性导入，成功后删除。是否已迁移记录在 `schema_migrations`。
- 旧 JSON 解析失败会阻止启动并保留文件；修复后重启继续迁移。
- 审计不再按 10MB 轮转；用 `retention.auditDays` 清理。
- `node:sqlite` 仍是 Node 的实验特性，升级 Node 时需要回归数据库测试。

备份与恢复：

```bash
# 停止服务后复制
cp ~/.pi-web/pi-web.db /path/to/pi-web-backup.db

# 或在运行中在线备份
sqlite3 ~/.pi-web/pi-web.db "VACUUM INTO '/path/to/pi-web-backup.db'"
```

恢复时停止服务，替换 `pi-web.db`，删除同目录的 `pi-web.db-wal` 与 `pi-web.db-shm`，再启动。

## 分享与交接

- 所有者可以在会话底栏创建只读分享链接，默认 7 天过期，可随时撤销。
- 分享链接必须登录后才能打开；只读页面没有输入框和写操作。
- 会话底栏的“交接”会下载 Markdown，包含目标、结论、工具摘要、改动文件、风险与下一步；导出前对密钥模式脱敏。

## GitHub 与 CI

- 在配置里填写 `github.repos`；`github.token` 或环境 `PI_WEB_GITHUB_TOKEN` 提供 PAT。
- token 只在服务端使用，不返回浏览器、不写日志。
- 侧栏 “GitHub Issues” 列出 open issue；创建会话会填入草稿，不自动发送。
- 会话关联 Issue 后，状态栏显示最近一次 Actions run；未配置时隐藏。
- 代理环境需要 `NODE_USE_ENV_PROXY=1` 启动服务。

## 通知

- 标题栏铃铛显示页面内通知与未读数。
- 浏览器通知默认关闭，需要在铃铛菜单中授权；只在页面隐藏且会话结束时发送。
- 通知不包含 prompt 或工具输出正文。

## 保留清理

- 配置 `retention.sessionsDays`、`auditDays`、`sharesDays`；0 表示关闭。
- 管理员侧栏 “保留清理” 可预览将删除的会话、分享与审计。
- 只清理有归属记录的旧会话；活跃会话和未过期分享不会删除。
- 清理前需要二次确认，清理结果写入审计。

## 管理员与审计

- 用户配置 `role: "admin"` 即管理员，默认 `member`。
- 管理员侧栏可开启“全部会话”，打开他人会话时进入只读视图。
- 管理员可查看最近审计记录；普通成员访问管理员接口返回 403。
- 审计事件写入 SQLite 表 `audit_events`；管理员可查询最近记录。

## 工作区

- 用户只能从白名单工作区创建会话。
- 会话的 cwd、Pi session 目录、`@file` 搜索都限定在该工作区。
- 文件接口只接受 `sessionId`，由服务端解析工作区，浏览器不能指定根目录。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PI_WEB_CONFIG` | `~/.pi-web/config.json` | 配置路径 |
| `PI_WEB_DB` | 配置目录下的 `pi-web.db` | SQLite 数据库路径 |
| `PI_WEB_HOST` | 配置或 `127.0.0.1` | 监听地址 |
| `PI_WEB_PORT` / `PORT` | `3210` | 监听端口 |
| `PI_WEB_CWD` | `INIT_CWD` 或当前目录 | 无配置文件时的默认工作区 |
| `PI_WEB_PI_BIN` | `pi` | Pi 可执行文件 |
| `PI_WEB_IDLE_MS` | `1800000` | 空闲回收阈值 |
| `PI_WEB_MAX_RUNTIMES` | 配置或 `8` | 全局活跃运行时上限 |
| `PI_WEB_MAX_PER_USER` | 配置或 `2` | 每用户活跃运行时上限 |
| `PI_WEB_GITHUB_TOKEN` | 配置 | GitHub PAT，优先于配置文件 |
| `PI_WEB_GITHUB_API` | `https://api.github.com` | GitHub API 地址（测试用） |

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
| POST | `/api/sessions/:id/shares` | 创建只读分享 |
| GET | `/api/sessions/:id/shares` | 列出分享 |
| GET | `/api/shares/:token` | 只读快照 |
| GET | `/api/shares/:token/events` | 只读 SSE |
| DELETE | `/api/shares/:token` | 撤销分享 |
| GET | `/api/sessions/:id/handoff` | 下载交接 Markdown |
| GET | `/api/admin/sessions` | 管理员会话列表 |
| GET | `/api/admin/audit?limit=` | 管理员审计查询 |
| GET | `/api/github/issues?repo=` | open issues |
| GET | `/api/github/issue?repo=&number=` | 单条 issue |
| GET | `/api/github/ci?repo=&branch=` | 最近 CI 状态 |
| GET | `/api/sessions/:id/issue` | 会话关联 Issue |
| GET | `/api/admin/retention` | 清理预览 |
| POST | `/api/admin/retention` | 应用清理（需确认） |

## 架构

```text
浏览器 ──HTTP/SSE + cookie── 生产入口（认证/安全头）
  └── TanStack Start ──JSONL── pi --mode rpc（每会话一个进程）
```

- 认证在 `server.mjs` 边缘层完成，校验后向应用注入 `x-piweb-user`。
- 会话事实以 Pi 为准；SSE 重连时整体替换为快照。
- 只为当前会话保持 SSE；后台会话继续运行。
- `@file` 只允许工作区内普通文件；敏感文件名（`.env`、密钥等）默认跳过。
- 归属、Issue 关联、分享与审计存放在 `~/.pi-web/pi-web.db`（WAL，0600）。

## 安全

- 只监听回环时默认无认证；非回环必须配置认证。
- 校验 Host、Origin、Sec-Fetch-Site；跨站请求拒绝。
- 登录 cookie 为 HttpOnly、SameSite=Strict；HTTPS 时加 Secure。
- 生产响应带 CSP、`nosniff`、`frame-ancestors 'none'`。
- 浏览器不接触文件系统、API key 或子进程。
- 默认假定 HTTPS 由反向代理终止；内置证书管理不在当前范围。

## 部署

构建后用 systemd 或任意进程管理器运行 `server.mjs`：

```bash
pnpm --filter @omfde/pi-web build
sudo cp apps/pi-web/deploy/pi-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pi-web
```

反向代理（TLS 由代理终止）示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:3210;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 1h;
}
```

- 把代理后的地址加入 `publicOrigins`，例如 `https://pi.example.com`。
- SSE 依赖关闭代理缓冲；服务端已发送 `X-Accel-Buffering: no`。
- 备份 `~/.pi-web/config.json`、`~/.pi-web/pi-web.db` 和 `~/.pi/agent/sessions/`；数据库在线备份方式见“存储”一节。

## 测试

```bash
pnpm --filter @omfde/pi-web test
pnpm run check
```

测试使用 faux provider 驱动真实 RPC 子进程，不调用真实模型。
