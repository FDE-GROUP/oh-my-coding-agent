# Spike：Pi Web UI M5

> 对应 RAD：`docs/rads/pi-web-m5.md`；对应 issue：[#6](https://github.com/FDE-GROUP/oh-my-fde/issues/6)。
>
> 裁定：执行 M5-S1、M5-S2；M5-S3 随实现验证。GitHub 用 PAT、Issue 上下文填草稿、不自动评论、保留策略默认关闭（2026-11-06）。
>
> 效力：证据与输入，不是编码依据。spike 代码在 `node_modules/.cache/pi-web-m5`，不进入 `main`。

## 1. 要回答的问题

| 编号 | 问题 |
|---|---|
| M5-S1 | GitHub Issues 与 CI 用哪种 API？缓存、限流、代理与错误如何处理？ |
| M5-S2 | 保留清理如何识别活跃会话、保持 owner/shares/audit 一致、失败是否安全？ |
| M5-S3 | 浏览器通知（跳过，随实现验证）。 |

## 2. 环境与方法

| 项目 | 值 |
|---|---|
| 日期 | 2026-11-06 |
| Node | v22.23.0 |
| 网络 | 需要 `NODE_USE_ENV_PROXY=1` 才能让 Node fetch 走 HTTP 代理 |
| GitHub | 使用 `gh auth token`，公共仓库 `octocat/Hello-World`，不写入仓库 |

- S1：REST 请求 issues、actions runs、check runs；测试 ETag、404、token 泄漏。
- S2：临时目录构造会话、owner 索引、分享、审计；dry-run、应用、失败与活跃保护。

## 3. 结果

### M5-S1 GitHub Issues 与 CI

| 检查 | 结果 |
|---|---|
| open issues | 200，10 条，其中 4 条真实 issue，6 条 PR |
| issue 延迟 | 813ms |
| ETag 条件请求 | 304 |
| Actions runs | 200，620ms，含 status、conclusion、head_branch、html_url |
| Check runs | 200，5 条 |
| 不存在仓库 | 404，`Not Found` |
| Rate limit 剩余 | 4992 |
| token 泄漏 | 否 |
| Issue 注入模板 | 81 字符，包含编号与链接 |

结论：使用 REST；issues 需要过滤 `pull_request`；优先 Actions runs，check runs 作为补充。缓存 60 秒，ETag 条件请求可用。Node 22 需要 `NODE_USE_ENV_PROXY=1` 才读取代理环境变量。

### M5-S2 保留清理

| 检查 | 结果 |
|---|---|
| dry-run | 列出 old-1、2 个分享、1 条审计 |
| 应用 | 删除 old-1，保留 old-active 与 new-1 |
| owner 索引 | 删除对应条目 |
| 分享 | 删除被清理会话的分享与已过期分享 |
| 审计 | 删除超过保留期的记录 |
| 失败路径 | 报告 `delete failed`，不继续删除 |
| 文件权限 | 0600 |

结论：按“计算 → 删除文件 → 重写索引/分享/审计”顺序可保持可解释；活跃集合来自运行时管理器和当前会话。失败时停止并报告，允许已删除文件保持删除状态，不做数据库事务。

## 4. 结论与对 plan 的影响

| 编号 | 结论 | 影响 |
|---|---|---|
| S1 | 可行 | 服务端 GitHub 客户端、Issue 列表、上下文草稿、CI 状态与缓存 |
| S2 | 可行 | 保留配置、dry-run、清理模块、管理员入口 |
| S3 | 随实现 | 页面内通知 + Notification API |

### 被否决的选项

| 选项 | 理由 |
|---|---|
| 依赖 gh CLI | 服务器不一定安装，且难以控制超时 |
| 浏览器直连 GitHub | token 会进入浏览器 |
| 只用 check runs | 部分仓库没有 check，Actions runs 更通用 |
| 自动评论/关闭 Issue | 超出 M5 只读边界 |
| 清理用数据库事务 | 当前规模不需要 |

### 风险

| 风险 | 应对 |
|---|---|
| 代理未启用导致超时 | 文档要求 `NODE_USE_ENV_PROXY=1`，错误提示可诊断 |
| GitHub 限流 | 缓存、ETag、错误降级 |
| 清理误删 | dry-run、活跃保护、二次确认、审计 |
| 分享/索引不一致 | 统一在清理模块内重写，失败停止 |

## 5. 对 plan 的具体建议

1. 配置增加 `github.repos` 与可选 token；环境 `PI_WEB_GITHUB_TOKEN` 优先。
2. 新增服务端 GitHub 客户端：10 秒超时、ETag 缓存 60 秒、过滤 PR、最多 50 条。
3. Issue 关联存 `~/.pi-web/links.json`；创建会话时写入并返回草稿文本。
4. CI 展示放在会话头部或状态栏，按仓库与分支查询 Actions runs。
5. 通知使用前端本地存储 + Notification API，默认关闭浏览器通知。
6. 保留配置与清理放管理员接口，默认全部为 0（关闭）。
7. 清理动作写审计，dry-run 不写。

## 6. 未决问题

- Issue 关联是否允许一个会话关联多个 Issue：M5 先一个。
- CI 分支来源：仓库默认分支或会话工作区分支，plan 中定。
- 通知是否跨标签页同步：先使用 `localStorage` 事件，不引入服务端推送。
