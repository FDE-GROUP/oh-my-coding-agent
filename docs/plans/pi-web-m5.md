# Plan：Pi Web UI M5

> 效力：经决策者批准后，本文件是实现和验收的唯一编码依据。需求见 `docs/rads/pi-web-m5.md`。
>
> Spike 结论：`docs/spikes/pi-web-m5.md`。

| 字段 | 值 |
|---|---|
| 状态 | 待批准 |
| 决策者 | Abel |
| 关联 issue | [#6](https://github.com/FDE-GROUP/oh-my-fde/issues/6) |
| 关联 RAD | `docs/rads/pi-web-m5.md` |
| 最后更新 | 2026-11-06 |

## 1. 背景与目标

M5 接入 GitHub Issues、CI 状态、通知和保留清理。默认全部关闭或只读，未配置时行为与 M4 一致。

## 2. 非目标

- PR 审查、触发 CI、自动评论或关闭 Issue。
- 邮件、Slack、Webhook。
- 多租户、细粒度权限。
- 清理前自动导出。

## 3. 设计要点

### 3.1 配置

```json
{
  "github": {
    "token": "<可选；环境 PI_WEB_GITHUB_TOKEN 优先>",
    "repos": [{ "id": "omfde", "owner": "FDE-GROUP", "name": "oh-my-fde", "branch": "main" }]
  },
  "retention": { "sessionsDays": 0, "auditDays": 0, "sharesDays": 0 }
}
```

- token 只存在配置或环境，永不返回浏览器；日志脱敏。
- 保留天数为 0 表示关闭。
- `NODE_USE_ENV_PROXY=1` 时使用环境代理；文档说明。

### 3.2 GitHub 客户端

新增 `server/github.ts`：

- `listIssues(repoId)`：过滤 `pull_request`，最多 50 条。
- `getIssue(repoId, number)`。
- `getCiStatus(repoId, branch?)`：Actions runs 最近一条。
- 10 秒超时；ETag 缓存 60 秒；404/限流/网络错误返回结构化错误。

API：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/github/issues?repo=` | open issues |
| GET | `/api/github/issue?repo=&number=` | 单条 issue |
| GET | `/api/github/ci?repo=&branch=` | 最近 CI 状态 |

### 3.3 Issue 关联与草稿

- 新增 `server/links.ts`：`~/.pi-web/links.json`，0600，`sessionId → {repoId, number, title, url}`。
- `POST /api/sessions` 支持 `issue: { repoId, number }`：
  - 创建会话后记录关联；
  - 返回 `draft`：issue 标题、正文、链接；
  - 不自动发送。
- 前端把 draft 存入 `sessionStorage`，导航后由 Composer 预填。
- 会话列表/详情显示关联 issue 链接。

### 3.4 CI 展示

- 会话有关联 issue 时，用其仓库；否则不显示。
- 在会话状态栏显示 `queued / in_progress / success / failure / cancelled`，60 秒刷新。
- 点击打开 GitHub run。

### 3.5 通知

- `lib/notifications.ts`：localStorage 持久化，事件订阅，未读计数。
- 事件：会话 settled、会话退出/错误、清理完成。
- 浏览器通知默认关闭；用户在标题栏菜单显式授权后启用。
- 页面隐藏时才发浏览器通知；不发 prompt/工具正文。
- 标题栏铃铛显示未读数，可标记全部已读。

### 3.6 保留清理

- `server/retention.ts`：
  - 预览：按工作区列出会话，结合 owner 索引、分享、审计计算将删除项。
  - 应用：删除会话文件 → 重写 owner/links/shares → 清理审计；失败停止并报告。
  - 活跃保护：运行时管理器中 busy/存在的会话、未过期分享不删除。
  - 只清理有 owner 索引的会话；未知会话报告并跳过。
- 管理员 API：`GET /api/admin/retention` 预览；`POST` body `{confirm:true}` 应用。
- 审计记录 `retention.apply`，包含数量，不含正文。

### 3.7 否决项

| 选项 | 理由 |
|---|---|
| gh CLI | 服务器不一定安装 |
| 浏览器直连 GitHub | token 泄漏 |
| 自动评论 Issue | 超出只读边界 |
| 默认清理 | 误删风险 |
| 服务端推送通知 | M5 不需要 |

## 4. 实施切片

### S1 GitHub Issues 与关联

- 配置、GitHub 客户端、issues/issue API、Issue 面板、草稿预填、links 存储。
- 测试：过滤 PR、404、token 不返回、草稿格式。

完成判据：从 Issue 创建会话，首条草稿包含标题/正文/链接。

状态：已完成（2026-11-06）。验证：Issue 列表过滤 PR；草稿预填；links 单测；token 不出现在响应。

### S2 CI 状态

- Actions runs 查询、缓存、状态栏、刷新、链接。
- 测试：五种状态、未配置隐藏、错误降级。

完成判据：关联会话显示最近 run 状态并可跳转。

状态：已完成（2026-11-06）。验证：mock GitHub 返回 success；状态栏显示并链接；60 秒刷新。

### S3 通知

- 通知存储、铃铛、已读、浏览器通知授权与页面隐藏触发。
- 测试：settled 通知、未读数、权限拒绝降级。

完成判据：页面隐藏时任务结束可收到通知。

状态：已完成（2026-11-06）。验证：页面内通知与未读数；浏览器通知授权与隐藏触发；不发送正文。

### S4 保留清理

- 配置、预览、应用、活跃保护、审计。
- 管理员 UI：预览数量、二次确认、应用。
- 测试：dry-run、过期会话/分享/审计、失败停止。

完成判据：dry-run 与实际清理一致；活跃会话不被删除。

状态：已完成（2026-11-06）。验证：spike 覆盖 dry-run/应用/失败；管理员预览与二次确认；默认关闭。

### S5 加固与文档

- README 配置、token、代理、保留说明。
- 全量 `pnpm run check`、app 测试、Playwright 冒烟。

完成判据：RAD 第 10 节可复现；M1–M4 无回归。

状态：已完成（2026-11-06）。验证：`pnpm run check` 通过；app 测试 31 项通过；M5 Playwright 冒烟 6 步通过；README 更新。

## 5. 测试与验证

- 单元：GitHub 响应过滤、缓存、错误；links；retention 计算；通知存储。
- 集成：fake GitHub 客户端；清理临时目录。
- 浏览器：Issue 面板、草稿、通知、管理员清理面板。
- 门禁：`pnpm run check`；`pnpm --filter @omfde/pi-web test`。

## 6. 风险

| 风险 | 应对 |
|---|---|
| 代理未启用 | 文档与错误提示 |
| 限流 | 缓存、降级 |
| token 泄漏 | 服务端代理、日志脱敏 |
| 清理误删 | dry-run、活跃保护、审计 |
| 通知打扰 | 默认关闭、仅页面隐藏 |

## 7. 决策者批准记录

- 批准范围：
- 日期：
- 备注：
