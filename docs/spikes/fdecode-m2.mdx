# Spike：FDE Code UI M2

> 对应 RAD：`docs/rads/fdecode-m2.md`；对应 issue：[#2](https://github.com/FDE-GROUP/oh-my-fde/issues/2)。
>
> 裁定：执行 M2-S1 到 M2-S4，M2-S5 跳过（2026-11-06）。
>
> 效力：证据与输入，不是编码依据。spike 代码在 `/tmp/opencode/fdecode-m2` 与仓库 `node_modules/.cache/fdecode-m2`，不进入 `main`。

## 1. 要回答的问题

| 编号 | 问题 |
|---|---|
| M2-S1 | `@file` 的 CLI 语义能否在服务端复刻？文件搜索是否足够快？ |
| M2-S2 | `fork` / `clone` 后 session 与运行时如何变化？ |
| M2-S3 | 多会话并行时事件、切换和资源上限如何表现？ |
| M2-S4 | 图片链路是否需要自己缩放？Pi 的 prompt 图片规范化是否生效？ |
| M2-S5 | 斜杠命令（跳过，随实现验证）。 |

## 2. 环境与方法

| 项目 | 值 |
|---|---|
| 日期 | 2026-11-06 |
| Node | v22.23.0 |
| Pi CLI | `packages/coding-agent/dist/bundle/cli.js` |
| 模型 | faux provider（扩展注入），不使用真实 API |

方法：

- S1：对照 `packages/coding-agent/src/cli/file-processor.ts` 实现最小展开器，测试文本、BOM、空文件、二进制、超大文件、图片；在 10,000 个文件的目录上测搜索。
- S2：真实 RPC 子进程跑两轮对话，分别从第一条和第二条 user 消息 fork，再 clone；记录 session id、文件、消息和原会话状态。
- S3：两个进程同时跑长回答；另用 Web 服务创建 4 个忙碌会话后创建第 5 个。
- S4：生成 1200×1200 PNG（5.7MB），以 base64 通过 `prompt.images` 发送，读取回传消息中的图片尺寸和大小。

## 3. 结果

### M2-S1 `@file`

| 检查 | 结果 |
|---|---|
| 文本包裹 | 通过，与 CLI 相同：`<file name="绝对路径">\n内容\n</file>\n` |
| BOM | 通过，已剥离 |
| 空文件 | 通过，跳过 |
| 二进制 | 通过，检测到 NUL 后拒绝；CLI 本身不检测，这是 Web 端额外保护 |
| 超大文本 | 通过，超过 256KB 时拒绝并说明 |
| 图片 | 通过，`detectSupportedImageMimeTypeFromFile` 可公开导入；转 base64 附件 |
| 文件搜索 | 10,006 个文件、排除 `.git` / `node_modules` 后 62ms |
| 图片尺寸提示 | 未复刻。CLI 用内部 `processImage` 生成 hints；该函数未公开导出。Pi 会在 prompt 阶段重新处理图片，因此 hints 不是必须 |

结论：可以服务端实现，不需要改 Pi 内核。需要自己定义文本/图片大小上限和目录排除规则。

### M2-S2 `fork` / `clone`

| 检查 | 结果 |
|---|---|
| fork 第一条 user 消息 | 新 session，历史为空（分支点在 system 之后） |
| fork 第二条 user 消息 | 新 session 含第一条问答；返回被分叉消息文本 |
| 当前运行时 | fork 后自动切到新 session，session id 和文件都变化 |
| 原会话 | 保留完整历史，文件未被修改 |
| clone | 复制当前分支到新 session，消息数一致 |
| 父会话 | 新 session header 有 `parentSession`；`SessionInfo.parentSessionPath` 可用 |

结论：fork/clone 会替换当前运行时绑定的 session。Web 后端必须在命令后重新读取 `get_state`，把运行时映射从旧 id 移到新 id，并把新 id 返回给浏览器。

### M2-S3 多会话并行

| 检查 | 结果 |
|---|---|
| 两个会话同时流式 | 通过，首字节约 0.4s，两个都在 ~5.7s 完成，时间重叠 |
| 会话隔离 | 通过，session id、消息内容互不混淆 |
| 单进程内存 | 约 113MB RSS |
| 4 个忙碌会话后再创建 | 返回 429，错误信息明确 |
| 有空闲会话时再创建 | 自动回收最久未活动的空闲运行时，不返回 429 |
| 切换后快照 | 通过，后台会话完成后可读取完整消息 |

结论：运行时层已经支持并行；Web 端只需按活跃会话建立 SSE，后台会话不需要保持事件连接，切换时用快照恢复。侧栏状态可以通过轮询活跃运行时列表获得。

### M2-S4 图片

| 检查 | 结果 |
|---|---|
| 1200×1200 PNG，5.7MB | 接受 |
| base64 体积 | 7.6MB，RPC 单行可传 |
| Pi 规范化 | 自动缩放为 512×512 JPEG，61KB |
| 依据 | 模型 `inputLimits.images.resize` + 设置 `images.autoResize`（默认 true） |

结论：不需要在服务端实现缩放；Pi 已按当前模型限制处理。浏览器端仍应先缩小图片，避免每次上传 7MB 以上。UI 需要按模型 `input` 是否包含 `image` 决定是否允许附件。

## 4. 结论与对 plan 的影响

| 编号 | 结论 | 对 plan 的影响 |
|---|---|---|
| S1 | 可实现 | 新增 `server/files.ts`：目录范围、排除规则、文本/图片上限、二进制检测；新增搜索与展开 API |
| S2 | 可实现 | fork/clone 后重新绑定运行时；新增 fork/clone 接口并返回新 session |
| S3 | 可实现 | 只为当前会话保持 SSE；新增活跃运行时状态接口；保留 4 个上限和空闲回收 |
| S4 | Pi 已处理 | 浏览器端 canvas 预缩放；服务端只校验大小和模型能力 |

### 被否决的选项

| 选项 | 理由 |
|---|---|
| 用 CLI `@file` 参数 | RPC 明确拒绝 |
| 在服务端复刻图片缩放 | `processImage` 未公开导出，且 Pi 已自动处理 |
| 每个会话常驻 SSE | 事件只在客户端需要时消费；快照足够，连接成本更低 |
| 直接编辑 session 文件实现分叉 | 使用 RPC 的 fork/clone，避免格式漂移 |
| 给超出上限的创建请求一律 429 | 空闲运行时可以安全回收，一律 429 会降低体验 |

### 风险

| 风险 | 说明 | 应对 |
|---|---|---|
| `@file` 语义漂移 | CLI 用内部函数处理图片 hints | 包裹格式以 `file-processor.ts` 为准，加对照测试 |
| 文件搜索越界 | 符号链接可能指向项目外 | 用 `realpath` 校验，拒绝逃逸路径 |
| 大图片请求 | base64 放大 33% | 浏览器预缩放 + 服务端大小上限 |
| 并行内存 | 每进程约 113MB | 保留默认 4 个上限，空闲回收 |
| fork 后前端路由错位 | session id 变化 | 后端返回新 id，前端强制跳转并刷新列表 |

## 5. 对 plan 的具体建议

1. 新增 `server/files.ts` 与 `GET /api/files/search`、`POST /api/files/expand`。
2. 新增 `POST /api/sessions/:id/fork`、`POST /api/sessions/:id/clone`；内部重新绑定运行时。
3. 新增 `GET /api/runtimes` 返回活跃 session id 与 busy 状态；侧栏每 2 秒轮询。
4. 图片在浏览器用 canvas 限制到 2048px 长边、5MB 以内；发送前按模型能力过滤。
5. 队列、工具卡片、会话恢复等 M1 行为不变。
6. 斜杠命令随实现验证，不单独 spike。

## 6. 未决问题

- `@file` 是否遵守 `.gitignore`：先用固定排除目录，后续再评估。
- 侧栏运行状态用轮询还是全局 SSE：spike 建议轮询，M2 先轮询。
- 分叉 UI 的入口位置：消息菜单还是悬浮按钮，plan 中定。
