# Spike：FDE Code UI 技术栈与 RPC 契约

> 对应 RAD：`docs/rads/fdecode.md`；对应 issue：[#1](https://github.com/FDE-GROUP/oh-my-fde/issues/1)。
>
> 裁定：执行 S-1 到 S-4，S-5 暂缓（2026-11-06）。
>
> 效力：证据与输入，不是编码依据。spike 代码留在 `/tmp/opencode/fdecode-spike`，不进入 `main`。

## 1. 要回答的问题

| 编号 | 问题 |
|---|---|
| S-1 | TanStack Start 1.x + Vite 8 能否稳定提供 SSE、在开发态保持单例 runtime、并完成生产构建与启动？ |
| S-2 | Pi RPC 是否满足 Web 客户端所需契约：`--session` 恢复、消息重建、中止、扩展 UI 阻塞、JSONL 分帧边界？ |
| S-3 | 公开导出的 `SessionManager` 能否在独立应用中使用，1000 个会话下列表是否可接受？ |
| S-4 | DSH 语义 token 能否完整映射到 Tailwind v4 `@theme`，并支持 `data-theme` 切换、hairline、elevation 和透明度修饰符？ |
| S-5 | 流式长对话下 Markdown/Shiki 的重渲染成本（暂缓）。 |

## 2. 环境与方法

| 项目 | 值 |
|---|---|
| 日期 | 2026-11-06 |
| Node | v22.23.0 |
| pnpm | 11.15.1 |
| React | 19.3.1 |
| TanStack Start | 1.169.4 |
| TanStack Router | 1.170.46 |
| Vite | 8.3.6 |
| Tailwind CSS | 4.3.4 |
| TypeScript | 7.0.2 |
| Pi CLI | `packages/coding-agent/dist/bundle/cli.js`（已构建） |

方法：

- S-1 与 S-4 共用一个临时 TanStack Start 应用（`/tmp/opencode/fdecode-spike`），含一个 SSE 路由、一个 `get_state` 命令路由和一个三栏示例页。
- S-2 用一个临时扩展注册 faux provider，通过真实 RPC 子进程驱动；不使用真实 provider 或密钥。
- S-3 直接 import 公开导出的 `SessionManager`，用 1000 个会话文件测列表耗时。

复现命令：

```bash
cd /tmp/opencode/fdecode-spike
pnpm dev                 # S-1 dev，SSE 在 3002
pnpm build               # S-1 prod 构建
node spike/serve-prod.mjs # S-1 prod 启动（自定义 Node 入口）
node rpc/driver.mjs      # S-2 全部断言
node node_modules/.cache/... # S-3（实际位于仓库 node_modules/.cache/fdecode-spike/s3.mjs）
```

## 3. 结果

### S-1 前端骨架与 SSE

| 检查 | 结果 |
|---|---|
| dev 启动 | 通过，Vite 8.3.6 |
| SSE 路由流式输出 | 通过，`text/event-stream` 持续推送 |
| 多客户端共享同一子进程 | 通过，两个 EventSource 收到同一 `pid` |
| HMR 后 runtime 是否重复 | 通过，`globalThis` 单例保留，pid 与 moduleId 不变 |
| 生产构建 | 通过，输出 `dist/client` 和 `dist/server/server.js` |
| 生产启动 | 需自定义 Node 入口；官方构建产物只导出 `fetch` |
| 静态资源 | 通过，自定义入口直接服务 `dist/client/assets` |
| TypeScript 7 类型检查 | 通过，`tsc --noEmit` 无错误 |

关键证据：

```text
dev  (3002) hello: {"pid":1441209,...,"moduleId":"hem0semix25"}
touch src/routes/index.tsx 之后：
dev  (3002) hello: {"pid":1441209,...,"moduleId":"hem0semix25"}
prod (3100) hello: {"pid":1441574,...,"moduleId":"leay1bzvcr"}
```

生产入口需要约 40–60 行代码：把 Node `IncomingMessage` 转成 `Request`，调用 `serverEntry.fetch(request)`，再把 `response.body` 管道回 Node。TanStack Start 默认构建不包含 Node HTTP 服务器，也没有内置静态文件服务。

未验证：环境没有浏览器二进制，水合、响应式断点和主题切换只验证到 HTML/CSS 层，没有做浏览器内的人工或自动截图对比。

### S-2 Pi RPC 契约

全部断言通过：

| 检查 | 结果 |
|---|---|
| faux provider 通过扩展注入 | 通过 |
| `get_state` / `get_available_models` | 通过 |
| CRLF 命令输入 | 通过 |
| 一次含工具调用的运行 | 通过，`user,assistant,toolResult,assistant` |
| `message_start` 先于 `message_update` | 通过 |
| 工具执行后继续流式输出 | 通过 |
| `abort` 到 `agent_settled` | 约 0.5 秒，`aborted: true` |
| 扩展 UI `confirm` 阻塞 | 通过，未响应时命令不完成 |
| 取消后命令完成 | 通过，`disposition: "handled"` |
| `notify` 事件 | 通过 |
| 输入含 U+2028 / U+2029 | 通过，JSONL 分帧不受影响 |
| `--session <path>` 恢复 | 通过，session id 与消息数一致 |
| stderr 是否污染 stdout | 未污染 |

关键发现：

1. **扩展命令的 `prompt` 响应会等待命令处理完成。** `/uispike` 触发 `confirm` 后，`prompt` 响应一直不返回，直到发送 `extension_ui_response` 才返回 `handled`。后端不能对所有命令串行加锁，否则 UI 请求会被自己的命令阻塞。
2. **未响应的扩展弹窗会无限阻塞。** 客户端必须对 `select` / `confirm` / `input` / `editor` 主动回复 `cancelled`，或设置超时。
3. **`disposition: "handled"` 不会产生 `agent_settled`。** 客户端不能把扩展命令当成一次 run 等待结束。
4. **`--session <path>` 可以直接恢复。** 不需要先启动再 `switch_session`。
5. faux provider 可以用扩展在子进程内注册，适合做无网络的集成测试。

### S-3 会话索引

| 指标 | 结果 |
|---|---|
| `import("@earendil-works/pi-coding-agent")` | 1.27 秒，RSS 约 140MB |
| `SessionManager.list(cwd, dir)`，1000 个会话 | 462ms |
| 进程 RSS（列表后） | 约 178MB |
| 会话字段 | `id`、`cwd`、`name`、时间、`messageCount` 均可用 |

结论：可以直接使用公开导出。导入成本只发生在服务端启动或首次列表，客户端不受影响。1000 个会话的列表在本地可接受；更大的规模（数千以上）需要缓存或分页，但不属于 M1。

### S-4 DSH token 到 Tailwind

| 检查 | 结果 |
|---|---|
| `@theme` 变量映射 | 通过，生成 `--color-dsw-*: var(--dsw-alias-*)` |
| 颜色工具类 | 通过，`background-color: var(--color-dsw-bg-document)` |
| 背景透明度修饰符 | 通过，生成 `color-mix(in oklab, var(...) 10%, transparent)` |
| 字体与阴影 | 通过，`font-family` 与 `box-shadow` 均引用变量 |
| 自定义 hairline 工具类 | 通过，`border-width: var(--dsh-hairline-width)` |
| `data-theme="dark"` | 通过，变量在暗色块中被覆盖 |
| 组件是否需要 `dark:` | 不需要，切换只改变变量 |

DSH 客户端 CSS 中唯一 `--dsw-*` 变量约 431 个。M1 不需要全部导入，建议按页面实际使用导入一个子集（约 40–60 个），并提供从 DSH 源文件生成映射的脚本；复制时在文件头注明 MIT 出处。

未验证：与 DSH 的像素级视觉对比。环境没有浏览器，留到实现阶段做人工截图评审。

## 4. 结论与建议

| 编号 | 结论 | 对 plan 的影响 |
|---|---|---|
| S-1 | 可行 | 增加自定义 Node 生产入口；开发态继续用 Vite |
| S-2 | 可行 | 命令端点必须并发；扩展弹窗自动取消；不要按 run 等待 `handled` |
| S-3 | 可行 | 使用公开 `SessionManager`；M1 只列当前 cwd |
| S-4 | 可行 | 建立 token 子集与生成脚本；组件只消费变量 |
| S-5 | 暂缓 | 等 M1 后期用真实长会话数据决定 |

### 被否决的选项

| 选项 | 理由 |
|---|---|
| 依赖构建产物自带 Node 服务器 | 实际不存在，必须自写入口 |
| 每个命令串行执行 | 扩展弹窗会阻塞后续命令，形成死锁 |
| 未处理扩展弹窗 | 会无限等待，agent 卡死 |
| 一次性导入全部 431 个 DSH token | M1 用不到，增加维护面 |
| 自研 session 文件解析 | 公开导出已够用，重复实现会跟随格式漂移 |

### 风险

| 风险 | 说明 | 应对 |
|---|---|---|
| 无浏览器验证 | 水合和视觉未在真实浏览器确认 | 实现阶段第一件事做浏览器冒烟 |
| TanStack Start 版本演进 | 1.x 仍在快速迭代 | 锁定 1.169.4；升级前重跑 S-1 检查 |
| 生产入口自维护 | 需要自己处理静态资源、流式响应、错误 | 入口保持最小，并有集成测试 |
| `SessionManager` 导入成本 | 服务端启动约 1.27 秒、140MB | 可接受；若变慢再做懒加载或独立索引 |
| token 复制漂移 | DSH 数值会变 | 记录来源版本，提供再生成脚本 |

## 5. 对 plan 的具体修订

1. 在 S1 增加 `server.mjs` 生产入口：静态资源 + `serverEntry.fetch` + 流式响应。
2. 在 S2/S6 明确命令端点并发处理，任何命令都不得阻塞其他命令。
3. 在 S6 增加扩展弹窗策略：无客户端连接或超过 60 秒自动 `cancelled`。
4. 在测试方案中用“faux provider 扩展 + 真实 RPC 子进程”替代纯 fake-pi，覆盖协议层。
5. 在 S1/S5 增加 token 子集与生成脚本，不手写全部 token。
6. 依赖安装注意：pnpm 11 不再读取 `package.json` 的 `pnpm.onlyBuiltDependencies`，改放 `pnpm-workspace.yaml`。
7. 保留 TypeScript 7.0.2 与 Vite 8；`tsc --noEmit` 已验证。

## 6. 未决问题

- 生产入口是否在 M1 就支持 HTTPS 或只做回环 HTTP。M1 建议只做回环 HTTP。
- token 生成脚本放在 `apps/fdecode/scripts/` 还是仓库级 `scripts/`。建议放在 app 内，避免污染根目录。
- 是否需要把 DSH token 源文件作为 vendored 参考提交。建议只提交生成后的子集和来源说明。
