# MCP 与 codemode

这一层回答：工具生态如何在不膨胀模型工具声明的前提下接入。

## 1. 内置扩展

`extensions/index.ts`：

| 扩展 | 可替换 |
|---|---|
| `llama.cpp` | 否 |
| `codemode` | 是 |
| `tool-search` | 是 |
| `mcp` | 是 |

可替换的意思是：第三方扩展注册同名 tool / command / flag 时，内置扩展让位。

## 2. 工具暴露模型（核心概念）

`ToolExposure` 四种：

| 值 | 含义 |
|---|---|
| `direct` | 直接声明给模型 |
| `codemode` | 不声明，只能从 codemode 脚本调用 |
| `deferred` | 不声明，直到 `tool_search` 加载它 |
| `hidden` | 不可达 |

另有一个 `model-only`：声明给模型，但不能被脚本调用（codemode 自己）。

MCP 工具默认是 `codemode`，目的是让工具声明保持很小。

## 3. MCP 扩展

### 配置来源

- `~/.pi/agent/mcp.json`
- 受信任项目的 `.pi/mcp.json`（可覆盖全局服务器）
- 扩展通过 `pi.registerMcpServer()` 注册的服务器

`mcp.json` 里的同名服务器优先于注册的服务器。

### 连接生命周期

```
session_start
  → loadMcpConfig()
  → ensureDiscoveryActive()   // 先激活 codemode / tool_search
  → 后台连接所有 enabled 服务器

before_agent_start
  → waitForDirectServers()    // 只等 direct 工具，默认 10 秒
  → 写入 mcp_servers prompt section

tool_call
  → 如果调用的工具 reachesTools，等它可能触及的服务器
  → 资源工具等所有服务器
  → 普通 MCP 工具只等自己的服务器

session_shutdown
  → abort session
  → 关闭所有连接
  → 等待后台动作
```

连接失败不会阻塞启动，只在状态里显示，并通过 `/mcp` 修复。

### 工具命名

```
mcp__<server>__<tool>
```

`createMcpToolName()` 会处理名称冲突：所有会被 sanitize 成同一名字的工具都加哈希后缀，避免结果依赖列表顺序。

### 工具定义

`createMcpToolDefinition()`：

- `parameters` 来自 `normalizeMcpInputSchema(tool.inputSchema)`；
- `outputSchema` 是 `CallToolResult`，`structuredContent` 里放服务器自己的 output schema；
- `exposure` 来自配置；
- `namespace` 让 `describeNamespace()` 能找到服务器；
- `execute` 调 `client.callTool()`，支持 progress 回调。

### 结果转换

`convertMcpResult()`：

- content blocks → 文本 / 图片；
- 文本超过 20KB：保留头尾，中间裁掉，完整内容写临时文件；
- 二进制资源：写临时文件，返回路径；
- resource link：提示用 `read_mcp_resource`；
- `isError` → 错误结果，但 `structuredContent` 保留完整 `CallToolResult`（给脚本用）。

### 运行时

`McpServerConnection`：

```
states: connecting | connected | disconnected | needs-auth | failed | closed
```

- `getClient()` 懒连接；
- 连接失败按 `[250ms, 1s]` 重试（仅 HTTP 瞬态错误）；
- `McpSessionExpiredError` 时丢弃旧 client，重连一次；
- 只读请求遇到瞬态 HTTP 错误重试一次；工具调用不重试（可能已经执行）；
- `notifications/tools/list_changed` 触发重新拉取工具；
- stdio 服务器失败时保留最后 2000 字符 stderr；
- `close()` 会等 OAuth token 写入完成，避免丢失轮换后的 refresh token。

### OAuth

- 凭据存在 `mcp-auth.json`；
- HTTP 服务器默认用 OAuth，除非配置了 `Authorization` header 或 `auth`；
- 401 后进入 `needs-auth`，提示 `/mcp login`；
- `auth.provider` 可以让 MCP 复用 Pi provider 的 token。

### `/mcp` 管理器

交互模式下是 TUI 菜单：

- 按“需要注意”排序：needs-auth → failed → disconnected → connecting → connected；
- 操作：登录、登出、重连、启用/禁用、修改 exposure、查看工具；
- 全局服务器可以在项目里单独启用/禁用（写项目 `mcp.json`）；
- 注册的服务器只能对当前会话生效。

非 TUI 模式下 `/mcp` 输出纯文本状态。

## 4. codemode

### 定位

模型写 JavaScript，脚本调用其他工具。它解决的是：

- 批量调用：`Promise.allSettled` 一次跑多个工具；
- 链式调用：把上一个结果直接喂给下一个；
- 过滤大输出：只把需要的部分返回给模型。

### 沙箱

- QuickJS 编译成 WASM，运行在 worker 里；
- 默认最多 2 个 worker（`PI_CODEMODE_MAX_WORKERS` 可覆盖）；
- 堆上限 256MB，防止脚本把进程拖垮；
- worker 等待上限 60 秒；
- 脚本超时来自 `// @options: { timeout_ms }`；
- 没有 Node、文件系统、网络、timers。

### 脚本全局

| 全局 | 作用 |
|---|---|
| `tools.<name>(args)` | 调用嵌套工具 |
| `ALL_TOOLS` | 所有可调用工具的声明 |
| `searchTools(query, {limit, namespace})` | BM25 搜索 |
| `describeTool(name)` | 返回工具的完整声明 |
| `describeNamespace(name)` | 返回命名空间描述、instructions、工具名 |
| `text(value)` / `image(...)` | 添加输出 |
| `console.log(...)` | 追加到 `<console_output>` 块 |
| `exit()` | 结束脚本 |
| `store(key, value)` / `load(key)` | 跨调用保存 JSON 值 |
| `models.*` | 分类器、图片生成 |

### 嵌套调用

```
script → tools.read({ path })
  → ctx.executeTool("read", args)
  → agent loop 的 runToolCall()
  → 校验 / tool_call / 执行 / tool_result
  → 返回结果
```

所以嵌套调用和模型直接调用走完全相同的权限与 hook。只有脚本的输出会到达模型，嵌套结果不会单独进入 transcript。

结果映射：

- 工具有 `outputSchema` → 返回 `structuredContent`；
- 没有 → 返回文本内容；
- 失败/被阻止/参数非法 → reject，脚本可以 catch。

### store / load

成功脚本的写入追加为 `codemode-store` custom entry：

```ts
{ set: Record<string, unknown>, delete: string[] }
```

`load()` 从当前 branch 的根开始重放这些 entry，所以每个分支只看到自己路径上的值。

### 输出

- 多个 `text()` 结果会加 `==> text N/M <==` 标记；
- `console` 输出统一放在最后；
- 图片保存到临时文件，并在前面加一行路径；
- 默认输出预算 10,000 token；
- 超预算时保留头尾，完整内容写临时文件。

### 工具声明与激活

- codemode 默认 `defaultActive: false`；
- MCP 需要它时通过 `pi.setActiveTools()` 激活；
- `prepareLoadout()` 动态生成描述：
  - `on` 模式：已声明工具的描述里追加“脚本怎么调用它”；
  - `only` 模式：所有可调用工具都列在 codemode 描述里，直接工具声明被隐藏；
- `inlineBudget` 控制描述里工具声明的 token 预算，按“每个命名空间先各放一个最便宜的工具”轮转分配。

### reachesTools

MCP 需要知道一个 codemode 脚本可能触及哪些服务器，才能等它们连接：

- 脚本里出现 `searchTools` / `describeTool` / `describeNamespace` / `ALL_TOOLS` → `"all"`；
- 否则取源码里的所有单词，MCP 用命名空间匹配。

## 5. tool_search

- BM25 排序；
- 搜索文档包含 description、JSON Schema 的 description 和属性名、命名空间的 name/description/instructions；
- Unicode 分词，英文停用词，简单单复数归一；
- `tool_search` 把匹配到的 deferred 工具加入 active set，于是下一次请求会声明它们；
- 这个工具变化会记录进 transcript，`/tree`、resume、fork 都能恢复。

## 6. 设计观察

1. **exposure 是工具生态的核心抽象**。它把“能调用”和“声明给模型”分开。
2. **默认不声明 MCP 工具**，靠 codemode 或 tool_search 按需发现，控制上下文成本。
3. **嵌套调用复用主工具管线**，权限、校验、hook 全部一致。
4. **多层懒加载**：MCP runtime、codemode sandbox、工具本身都按需加载。
5. **沙箱有多重上限**：内存、worker 数、等待时间、脚本超时、输出预算。
6. **凭据安全**：脚本不能给 `models.*` 传 baseUrl/headers，避免把凭据发给任意地址。
7. **状态存在 session 里**：codemode store 是 custom entry，天然支持分支。

## 7. 尚未细读

- `extensions/llama`：本地 llama.cpp provider。
- `mcp/config.ts`、`mcp/oauth.ts`、`mcp/cli.ts`、`mcp/resources.ts`、`mcp/ui.ts`。
- `packages/mcp`（4,742 行）：JSON-RPC、stdio/HTTP/pipe transport、OAuth 流程。
- `packages/codemode` 的 QuickJS 沙箱实现。
