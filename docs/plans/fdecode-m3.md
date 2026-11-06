# Plan：FDE Code UI M3

> 效力：经决策者批准后，本文件是实现和验收的唯一编码依据。需求见 `docs/rads/fdecode-m3.md`。
>
> Spike 结论：`docs/spikes/fdecode-m3.md`。

| 字段 | 值 |
|---|---|
| 状态 | 已批准 |
| 决策者 | Abel |
| 关联 issue | [#3](https://github.com/FDE-GROUP/oh-my-fde/issues/3) |
| 关联 RAD | `docs/rads/fdecode-m3.md` |
| 最后更新 | 2026-11-06 |

## 1. 背景与目标

M3 让 3~5 人共用一套 FDE Code UI：可选 LAN 访问、令牌登录、用户归属、工作区选择和移动端基础能力。

## 2. 非目标

- SSO / LDAP / OAuth。
- 角色与细粒度权限、审计数据库、管理员查看全部会话。
- 多租户、云部署、内置 HTTPS 证书管理。
- 移动端原生应用与离线能力。

## 3. 设计要点

### 3.1 配置

配置文件默认 `~/.fdecode/config.json`，权限 0600；环境变量 `FDECODE_CONFIG` 可覆盖路径。

```json
{
  "host": "127.0.0.1",
  "port": 3210,
  "publicOrigins": ["http://192.168.1.2:3210"],
  "auth": {
    "secret": "base64url-secret",
    "users": [{ "id": "abel", "name": "Abel", "tokenHash": "sha256-hex" }]
  },
  "workspaces": [{ "id": "omfde", "name": "omfde", "path": "/home/abel/omfde" }],
  "limits": { "maxRuntimesPerUser": 2, "maxRuntimesTotal": 8 }
}
```

规则：

- 非回环 `host` 且 `auth.users` 为空时，启动失败并输出明确错误。
- `workspaces` 路径启动时校验存在且为目录；不合法直接退出。
- `publicOrigins` 用于反向代理或 LAN 场景的 Origin 校验；未配置时由 Host 推导。
- 缺少 `auth.secret` 且启用用户时，首次启动生成并写回 0600。

### 3.2 认证（生产入口）

认证在 `server.mjs` 边缘层完成，避免依赖 TanStack 中间件：

- `POST /api/auth/login`：`{ token }`，按 SHA-256 哈希匹配用户；成功后设置 `fdecode_session` cookie（HttpOnly、SameSite=Strict、Path=/、HTTPS 时 Secure）。
- `POST /api/auth/logout`：清 cookie。
- `GET /login`：内联登录页，无需认证。
- 其余页面与 API：校验 cookie；未登录页面重定向 `/login`，API 返回 401。
- SSE 复用 cookie，不依赖 Authorization 头。
- 通过校验后，边缘层写入 `x-fdecode-user` 请求头，并**先删除客户端传入的同名头**；应用只信任该头。
- 未启用认证时（仅回环），边缘层注入 `local` 用户，行为与 M1/M2 一致。
- 保留现有 Host/Origin/Sec-Fetch-Site 校验；加入 `publicOrigins`。
- 登录失败不区分“用户不存在”和“令牌错误”。

Token 生成：`node apps/fdecode/scripts/hash-token.mjs`，输出 SHA-256 十六进制，供写入配置。

### 3.3 用户与归属

新增 `server/owners.ts`：

- 索引文件 `~/.fdecode/sessions.json`，权限 0600，临时文件 + rename 原子写。
- 结构：`{ sessions: [{ id, owner, workspaceId, updatedAt }] }`。
- 创建会话初始化后记录 owner 与 workspace；fork/clone 继承并记录新 id。
- 列表默认只返回当前 owner 的会话；无索引项归为 `unknown`，不展示。
- 详情、SSE、命令、分叉、克隆、删除都校验 owner；不匹配返回 404。

### 3.4 工作区

- `GET /api/workspaces` 返回白名单，不暴露真实路径给不相关用户（M3 可显示路径）。
- `POST /api/sessions` 增加 `workspaceId`；未提供时使用第一个工作区。
- 运行时创建使用工作区路径作为 cwd；owner 索引记录 workspace。
- 会话列表按用户可见工作区聚合，每项带 workspace 名称。
- 文件接口改为显式根目录：
  - `GET /api/files/search?sessionId=&q=`
  - `POST /api/files/expand` `{ sessionId, paths }`
  - 服务端根据 session 的 owner + workspace 解析根目录，不接受浏览器传路径根。
- `server/files.ts` 改为 `searchFiles(root, query)`、`expandFiles(root, paths)`，不再读全局 `FDECODE_CWD`。

### 3.5 并发

- `RuntimeManager` 创建时接收 owner；每用户上限默认 2，全局上限默认 8。
- 超限时只回收**同一用户**的空闲运行时；仍超限返回 429。
- 全局超限时优先回收最久未活动的空闲运行时。

### 3.6 移动端与 PWA

- `public/manifest.webmanifest`、主题色、图标、`apple-touch-icon`。
- 使用 `h-dvh` / 安全区变量；输入区避免被软键盘遮挡。
- 触摸目标不小于 40px；hover-only 操作提供可见替代。
- 不做离线缓存与推送。

### 3.7 否决项

| 选项 | 理由 |
|---|---|
| Authorization 头 | EventSource 不支持 |
| localStorage 令牌 | 可被 XSS 读取 |
| 修改 Pi session 格式加 owner | 增加维护负担 |
| 全局 `FDECODE_CWD` | 并发会串工作区 |
| 非回环无认证启动 | 安全边界不允许 |

## 4. 实施切片

### S1 配置与认证

- `config` 加载与校验、启动规则。
- 边缘登录/登出/cookie/守卫、`x-fdecode-user` 注入。
- 登录页、登出按钮、未登录重定向。
- 测试：401、cookie 标志、跨站拒绝、LAN Host、非回环拒绝启动。

完成判据：非回环必须登录；回环无认证行为不变；SSE 鉴权通过。

状态：已完成（2026-11-06）。验证：未登录 401/302、cookie 标志、LAN 访问、SSE 鉴权、登出、非回环无认证拒绝启动。

### S2 工作区

- 工作区 API、创建会话选择、cwd 绑定、列表聚合。
- 文件工具改显式 root；文件接口按 session 解析工作区。
- 侧栏显示工作区与会话所属工作区。

完成判据：两工作区会话、列表、`@file` 完全隔离。

状态：已完成（2026-11-06）。验证：会话 cwd 与 session 目录按工作区隔离；文件接口按 session 解析工作区；侧栏工作区选择器。

### S3 归属与并发

- owner 索引、写入/读取/过滤、接口校验。
- 每用户并发上限与回收。
- fork/clone 归属继承。

完成判据：两个用户互相不可见；每用户超限返回 429。

状态：已完成（2026-11-06）。验证：A 创建会话后 B 列表为空、详情与 SSE 均 404；owner 索引单测；每用户上限逻辑。

### S4 移动端与 PWA

- manifest、图标、theme-color、安全区、触摸尺寸。
- Playwright 设备模拟冒烟。

完成判据：手机宽度可发送、中止、切换会话；可添加到主屏。

状态：已完成（2026-11-06）。验证：Playwright 390px 抽屉可用；manifest 200；安装提示未在 headless 中验证。

### S5 加固与文档

- 配置样例、令牌生成脚本、部署说明、反向代理说明。
- 全量 `pnpm run check` 与 app 测试；Playwright 冒烟。
- 旧单用户模式回归。

完成判据：RAD 第 10 节可复现；M1/M2 无回归。

状态：已完成（2026-11-06）。验证：登录→工作区→会话→刷新→手机→登出浏览器冒烟通过；`pnpm run check` 通过；app 测试 23 项通过。补充：历史会话回填脚本、PWA PNG 图标、systemd 示例与反向代理说明。

## 5. 测试与验证

- 单元：配置校验、cookie 签名/校验、owner 索引并发写、工作区路径校验。
- 集成：登录 → API → SSE；两用户隔离；两工作区隔离；每用户 429。
- 浏览器：登录/登出、工作区选择、手机宽度、既有 M1/M2 流程。
- 门禁：`pnpm run check`；`pnpm --filter @omfde/fdecode test`。

## 6. 风险

| 风险 | 应对 |
|---|---|
| Cookie 密钥丢失导致全部登出 | 持久化 secret，文档说明 |
| 反向代理 Origin 不匹配 | `publicOrigins` 配置 |
| 文件接口绕过工作区 | 只接受 sessionId，根目录服务端解析 |
| owner 索引丢失 | 列表忽略未知项；提供回填说明 |
| 每用户上限过低 | 配置可调，默认 2 |

## 7. 决策者批准记录

- 批准范围：全文（切片 S1–S5）。
- 日期：2026-11-06
- 备注：状态补正。实现与验证先于本记录完成（各切片已附 `pnpm run check`、app 测试与 Playwright 冒烟结果），原批准记录为空、头部状态滞留“待批准”。经决策者在本轮治理滞后清理中显式授权，将头部状态补正为“已批准”。本条为文档一致性补正，不追溯伪造原始批准用语。
