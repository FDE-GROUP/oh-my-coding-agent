# Plan：Pi Web UI M4

> 效力：经决策者批准后，本文件是实现和验收的唯一编码依据。需求见 `docs/rads/pi-web-m4.md`。
>
> Spike 结论：`docs/spikes/pi-web-m4.md`。

| 字段 | 值 |
|---|---|
| 状态 | 待批准 |
| 决策者 | Abel |
| 关联 issue | [#4](https://github.com/FDE-GROUP/oh-my-fde/issues/4) |
| 关联 RAD | `docs/rads/pi-web-m4.md` |
| 最后更新 | 2026-11-06 |

## 1. 背景与目标

M3 已支持团队登录、工作区与归属。M4 补齐协作闭环：只读分享、交接文档、管理员只读视图、审计日志。

## 2. 非目标

- 实时协作、评论、在线状态。
- 细粒度 RBAC、组织架构。
- 未登录的外部链接。
- 审计数据库、合规报表。
- 管理员代操作会话。

## 3. 设计要点

### 3.1 分享

新增 `server/shares.ts`：

- 存储 `~/.pi-web/shares.json`，0600，原子写。
- 记录：`tokenHash`、`sessionId`、`owner`、`createdAt`、`expiresAt`、`revokedAt?`。
- 默认有效期 7 天，可通过创建参数覆盖；token 32 字节随机，base64url。
- 只存 SHA-256，不存明文。

API：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/sessions/:id/shares` | 所有者创建，返回 token 与完整 URL |
| GET | `/api/sessions/:id/shares` | 所有者列出（不返回 token，只返回状态） |
| DELETE | `/api/shares/:token` | 所有者撤销 |
| GET | `/api/shares/:token` | 登录用户读取只读快照 |
| GET | `/api/shares/:token/events` | 登录用户订阅只读事件 |

- 必须登录；未登录 401。
- 分享接口只读，不提供命令、分叉、克隆、删除。
- 撤销或过期后返回 404。
- 页面 `/share/$token` 使用只读视图：隐藏 Composer、重命名、分叉、克隆、删除。
- 分享 token 不写入审计日志正文，只记录哈希前缀。

### 3.2 交接文档

新增 `server/handoff.ts`：

- 输入：session snapshot、工作区、owner。
- 输出 Markdown：
  - 元信息：工作区、模型、会话 id、消息数、工具调用数。
  - 目标：全部 user 消息文本。
  - 结论：最后一条 assistant 文本。
  - 工具调用：名称 + 参数摘要。
  - 改动文件：`write` / `edit` 的 `path` 参数去重。
  - 风险与下一步：从 assistant 文本中标题含“风险 / 下一步 / 未完成 / TODO”的小节提取。
- 脱敏：命中密钥模式的行替换为 `[已隐藏]`。
- API：`GET /api/sessions/:id/handoff`，所有者可用，返回 `text/markdown` 附件。
- UI：会话栏“导出交接”按钮，直接下载。

### 3.3 管理员

- 配置用户增加 `role: "admin" | "member"`，默认 `member`。
- 认证边缘层注入 `x-piweb-user-role`；应用只信任该头。
- 权限模型：
  - `read`：所有者或管理员。
  - `write`：仅所有者。
- 管理员接口：
  - `GET /api/admin/sessions`：全部会话及 owner/workspace。
  - `GET /api/admin/audit?limit=`：最近审计。
- 管理员打开他人会话时进入只读模式；Composer 与写操作隐藏。
- 普通成员访问管理员接口返回 403。

### 3.4 审计

新增 `audit.mjs`（边缘层与应用共用）+ `audit.d.mts`：

- 文件：`~/.pi-web/audit.jsonl`，0600，追加写。
- 写链串行；超过 10MB 轮转为 `audit.jsonl.1`。
- 记录：`ts`、`user`、`role`、`action`、`target`、`result`、`detail?`。
- 动作：`auth.login`、`auth.login_failed`、`session.create`、`session.fork`、`session.clone`、`session.delete`、`share.create`、`share.revoke`。
- 不记录 prompt、工具输出、文件内容。
- 管理员查询按文件尾部读取。

### 3.5 否决项

| 选项 | 理由 |
|---|---|
| 明文分享 token | 文件泄露即可冒用 |
| 未登录分享 | 超出团队边界 |
| 分享复用命令端点 | 只读无法保证 |
| 管理员写权限 | 越权风险 |
| 审计记录正文 | 隐私与体积 |

## 4. 实施切片

### S1 分享

- shares 存储、创建/列出/撤销 API、只读快照与 SSE、分享页面、分享对话框。
- 测试：四种身份、过期、撤销、只读命令拒绝。

完成判据：RAD 场景 1 通过；撤销立即生效。

状态：已完成（2026-11-06）。验证：创建/读取/撤销/过期，未登录 401，成员只读，直接命令 404；Playwright 分享与撤销通过。

### S2 交接文档

- handoff 生成、脱敏、下载接口、会话栏按钮。
- 测试：目标/结论/工具/改动文件/风险/密钥脱敏。

完成判据：RAD 场景 2 通过。

状态：已完成（2026-11-06）。验证：交接下载包含目标、结论、工具、改动文件、风险；密钥模式脱敏单测通过。

### S3 管理员与审计

- role 配置与边缘头、读写权限拆分、admin 接口、审计模块与事件写入、管理员只读 UI。
- 测试：admin/member 权限、1000 条审计查询、轮转。

完成判据：RAD 场景 3、4 通过。

状态：已完成（2026-11-06）。验证：admin 列表/只读/审计，member 403，审计 0600 与轮转；Playwright 管理员只读与审计面板通过。

### S4 加固与文档

- README 配置与接口更新、分享/交接/审计说明。
- 全量 `pnpm run check`、app 测试、Playwright 冒烟。

完成判据：RAD 第 10 节可复现；M1–M3 无回归。

状态：已完成（2026-11-06）。验证：`pnpm run check` 通过；app 测试 27 项通过；M4 Playwright 冒烟 9 步通过；README 更新。

## 5. 测试与验证

- 单元：share token/过期/撤销、handoff 生成与脱敏、audit 追加与轮转、role 解析。
- 集成：owner/member/admin 三种身份；分享只读；交接下载。
- 浏览器：创建分享、打开只读、撤销、导出、管理员列表。
- 门禁：`pnpm run check`；`pnpm --filter @omfde/pi-web test`。

## 6. 风险

| 风险 | 应对 |
|---|---|
| 分享链接转发 | 登录 + 过期 + 撤销 |
| 只读接口被绕过 | 独立 share 路由，不暴露命令 |
| 交接泄漏参数密钥 | 导出前模式脱敏 |
| 审计磁盘增长 | 10MB 轮转 |
| 管理员越权 | 读写权限分离 |

## 7. 决策者批准记录

- 批准范围：
- 日期：
- 备注：
