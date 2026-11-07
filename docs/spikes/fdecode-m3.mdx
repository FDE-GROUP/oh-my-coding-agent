# Spike：FDE Code UI M3

> 对应 RAD：`docs/rads/fdecode-m3.md`；对应 issue：[#3](https://github.com/FDE-GROUP/oh-my-fde/issues/3)。
>
> 裁定：执行 M3-S1 到 M3-S3，M3-S4 随实现验证（2026-11-06）。
>
> 效力：证据与输入，不是编码依据。spike 代码在 `node_modules/.cache/fdecode-m3`，不进入 `main`。

## 1. 要回答的问题

| 编号 | 问题 |
|---|---|
| M3-S1 | cookie 认证能否覆盖页面、API 和 SSE？LAN 访问如何校验 Host/Origin？未配置认证时如何拒绝非回环监听？ |
| M3-S2 | 多工作区下，会话目录、会话列表和 `@file` 范围如何隔离？ |
| M3-S3 | Pi session 文件没有 owner 字段，如何记录归属、过滤可见性并限制每用户并发？ |
| M3-S4 | 移动端与 PWA（跳过，随实现验证）。 |

## 2. 环境与方法

| 项目 | 值 |
|---|---|
| 日期 | 2026-11-06 |
| Node | v22.23.0 |
| 网络 | 回环 + `192.168.1.2` |
| Pi CLI | 已构建的 `dist/bundle/cli.js` |

方法：

- S1：最小 HTTP 服务，HMAC 签名 cookie、登录、SSE、同源校验、LAN 绑定；用 fetch 逐项验证，并验证启动规则函数。
- S2：两个工作区各起一个真实 RPC 子进程；读取 session 文件位置；用 `SessionManager.list` 分别列出；切换 `FDECODE_CWD` 验证文件搜索与越界拒绝。
- S3：实现旁路 owner 索引（临时文件 + rename 原子写）；并发写 100 条；重载验证；模拟每用户 2 个并发上限。

## 3. 结果

### M3-S1 认证与 LAN

| 检查 | 结果 |
|---|---|
| 未登录访问 API | 401 |
| 错误令牌登录 | 401 |
| 正确令牌登录 | 200 |
| Cookie 标志 | HttpOnly、SameSite=Strict、Path=/ |
| 带 cookie 的 API | 200 |
| 带 cookie 的 SSE | 200，首条事件正常 |
| 不带 cookie 的 SSE | 401 |
| 跨站 POST（Origin 不匹配） | 403 |
| 同源 POST | 200 |
| 通过 LAN IP 访问（带 cookie） | 200 |
| 非回环且无认证 | 拒绝启动规则为 true |

结论：cookie 方案可以同时覆盖页面、API 和 SSE。SSE 不能自定义 Authorization 头，cookie 是正确选择。LAN 访问需要把实际地址加入 Host 白名单，同时保留同源 Origin 校验。

### M3-S2 多工作区

| 检查 | 结果 |
|---|---|
| 两个工作区的 session 文件 | 分别位于 `--...-ws-a--` 和 `--...-ws-b--` |
| `SessionManager.list(ws-a)` | 只返回 ws-a 的会话 |
| `SessionManager.list(ws-b)` | 只返回 ws-b 的会话 |
| `@file` 搜索 | 各自只返回本工作区文件 |
| 跨工作区引用 `../ws-b/beta.txt` | 被拒绝 |
| 当前文件工具 | 读取全局 `FDECODE_CWD`，并发切换会串范围 |

结论：Pi 的 session 目录天然按 cwd 隔离；会话列表按工作区调用即可。文件工具必须从全局 cwd 改为显式 `root` 参数，否则多用户并发时会读到错误工作区。

### M3-S3 归属与并发

| 检查 | 结果 |
|---|---|
| 100 条归属并发写入 | 234ms，JSON 完整 |
| 重载后归属数量 | user-a 50，user-b 50 |
| 用户列表过滤 | 双方都只能看到自己的条目 |
| 每用户上限 2 | 前两个成功，第三个被拒绝 |
| 索引文件权限 | 0600 |
| 原子写 | 无残留临时文件 |

结论：不需要改 Pi 的 session 格式。旁路索引记录 `session id → owner + workspace`，原子写和 0600 权限足够。启动时如果索引缺失，可先回填或按“未知归属”处理。

## 4. 结论与对 plan 的影响

| 编号 | 结论 | 影响 |
|---|---|---|
| S1 | 可行 | 新增认证模块、登录页、cookie 会话、路由/API 守卫、LAN 启动规则 |
| S2 | 可行，需重构 | 工作区配置、创建会话接受 workspace、文件工具显式 root、列表按工作区聚合 |
| S3 | 可行 | owner 旁路索引、列表过滤、接口 owner 校验、每用户并发上限 |
| S4 | 随实现 | manifest、抽屉、触摸目标、键盘遮挡 |

### 被否决的选项

| 选项 | 理由 |
|---|---|
| Authorization 头传令牌 | EventSource 不支持自定义头 |
| localStorage 存令牌 | 可被 XSS 读取 |
| 在 session 文件加 owner | 改 Pi 格式，增加维护负担 |
| 全局 `FDECODE_CWD` 支持多工作区 | 并发请求会串范围 |
| 无认证时监听非回环 | 直接拒绝启动 |

### 风险

| 风险 | 应对 |
|---|---|
| Cookie 密钥重启后变化导致全部登出 | 密钥持久化到配置文件 |
| 反向代理终止 TLS 后 Origin 变化 | 配置允许的 public origin |
| 会话索引与 session 文件不同步 | 列表时忽略无索引项或标记未知 |
| 工作区路径逃逸 | 启动校验 + 每次操作 realpath |
| 并发上限降低体验 | 每用户独立上限，空闲回收 |

## 5. 对 plan 的具体建议

1. 新增 `server/auth.ts`：用户配置、令牌哈希、HMAC cookie、登录/登出、请求守卫。
2. 新增 `server/workspaces.ts`：白名单、启动校验、按工作区列会话。
3. 新增 `server/owners.ts`：旁路索引、原子写、owner 过滤。
4. 文件工具改为 `createFileTools(root)` 或显式传入 root。
5. 运行时管理支持每用户计数与上限。
6. 登录页与工作区选择器；SSE 复用 cookie。
7. 非回环启动时强制认证，否则退出并给出明确信息。

## 6. 未决问题

- 用户配置用 JSON 文件还是环境变量：plan 中定，建议 `~/.fdecode/config.json` + 0600。
- 令牌是明文配置还是哈希：建议哈希，提供生成脚本。
- 管理员查看全部会话：M3 不做，保留扩展点。
