# Tools 实现

核心目录：`core/tools/`（约 3,820 行）。
这一层是模型真正“动手”的地方。所有工具都是工厂函数 + 可替换的
`Operations`，因此可以委托给远程系统（例如 SSH）。

## 1. 两种工具类型

```
ToolDefinition   扩展面向：name、description、parameters、
                 promptSnippet、promptGuidelines、renderers
AgentTool        运行时面向：execute、executionMode、outputSchema

wrapToolDefinition()          ToolDefinition → AgentTool
createToolDefinitionFromAgentTool()   AgentTool → 最小 ToolDefinition
```

默认内置工具：

| 工具 | 作用 |
|---|---|
| `read` | 读文件，支持图片 |
| `bash` | 执行 shell |
| `powershell` | Windows shell |
| `edit` | 精确文本替换 |
| `write` | 整文件写入 |
| `grep` | ripgrep 搜索 |
| `find` | fd 按 glob 找文件 |
| `ls` | 列目录 |

默认激活的是 `read / bash / edit / write`；`createCodingTools()` 和
`createReadOnlyTools()` 提供两组预置。

## 2. 路径解析

`resolveToCwd(filePath, cwd)`：

- 展开 `~`；
- 规范化 Unicode 空格；
- 去掉开头的 `@`；
- 相对路径按 cwd 解析。

**注意：它不限制路径必须在 cwd 内。** 工具可以读写任意绝对路径，
这是权限层缺失的直接体现。

`resolveReadPath()` 额外处理 macOS 的文件名差异：

1. 精确路径；
2. AM/PM 前的窄不换行空格；
3. NFD 分解形式；
4. 弯引号 `’`；
5. NFD + 弯引号组合。

只用于读；写和编辑使用精确解析结果。

## 3. 文件写入串行化

`withFileMutationQueue(path, fn)`：

- key 优先用 `realpath`，文件不存在时退回 `resolve()`；
- 同一文件的写操作串行，不同文件并行；
- 用 `registrationQueue` 保证队列注册本身是原子的；
- 操作完成后释放下一个，并清理空队列。

`write` 和 `edit` 都使用它。abort 检查放在每个 `await` 之后，而不是用
abort 事件直接 reject——否则会在文件操作还没结束时释放队列。

## 4. 输出截断

两个独立限制，先到先得：

```
maxLines = 2000
maxBytes = 50 KB
```

| 函数 | 用途 |
|---|---|
| `truncateHead` | read / ls / grep / find：保留开头 |
| `truncateTail` | bash：保留结尾（错误和最终结果） |
| `truncateLine` | grep 单行，500 字符 |

`truncateHead` 永不返回半个行；如果第一行就超过字节限制，返回空内容并
标记 `firstLineExceedsLimit`，让调用方给出替代方案。

`truncateTail` 有一个例外：如果最后一行本身超过字节限制，会取该行的尾部，
并标记 `lastLinePartial`。

字符串切片 `sliceHead` / `sliceTail` 会避免切断 surrogate pair。

## 5. read

输入：`path`、`offset`（1-indexed）、`limit`。

行为：

- 先检测 MIME 类型，图片走 `processImage()`，按模型输入限制缩放；
- 非视觉模型会附加一条“图片将被省略”的说明；
- 文本优先走 `createReadStream`，只把要显示的行留在内存；
- 无法流式读取时退回整文件读取；
- 用户指定的 `limit` 先于截断生效；
- 截断时给出可执行的下一步：`Use offset=N to continue`；
- 第一行超限时提示用 `sed -n 'Np' file | head -c 51200`。

图片结果同时返回 `structuredContent`，供 codemode 的 `image()` 使用。

## 6. write

输入：`path`、`content`。

- 创建父目录；
- 整文件覆盖；
- 同一文件串行；
- 不返回 diff（它本来就是全量覆盖）。

## 7. edit

输入：`path`、`edits[]`（每个 `{ oldText, newText }`）。

### 参数兼容

`prepareArguments()` 处理模型常见的畸形输出：

- `edits` 是 JSON 字符串 → 解析成数组；
- `edits` 是单个对象 → 包成数组；
- 顶层 `oldText` / `newText` → 追加成一条 edit。

### 匹配规则

所有 edit 都针对**同一个原始内容**匹配，不是增量应用。

1. 先精确匹配；
2. 失败后进入模糊匹配：
   - NFKC 规范化；
   - 每行去尾部空白；
   - 智能引号 → ASCII；
   - 各种 Unicode 破折号 → `-`；
   - 特殊空格 → 普通空格；
3. 统计出现次数，>1 报“必须唯一”；
4. 多条 edit 按位置排序，检测重叠；
5. 从后往前应用，保持偏移稳定。

### 保留原始字节

如果用了模糊匹配，替换发生在规范化内容上。为了不把整个文件重写成规范化
形式，`applyReplacementsPreservingUnchangedLines()`：

- 把每个替换扩展到它触及的完整行；
- 只重写这些行；
- 其余行从原始内容原样复制。

### 换行与 BOM

- 读取后检测原始换行（CRLF / LF）；
- 匹配前统一转 LF；
- 写回时恢复原始换行；
- BOM 被剥离后再匹配，写回时加回。

### 输出

- 显示用 diff（带行号和上下文）；
- 标准 unified patch；
- `firstChangedLine` 供编辑器跳转。

## 8. bash

输入：`command`、可选 `timeout`（秒）。

### 执行

- shell 配置来自 settings：`shellPath`、`commandPrefix`；
- Unix 上 `detached: true`，abort/timeout 时杀整个进程树；
- Windows 不 detached，因为拿不到子进程；
- `waitForChildProcess()` 避免被后台进程继承的 stdio 卡住；
- 被信号杀死时，退出码按 `128 + signal` 计算。

### 环境

默认暴露：

```
PI_SESSION_ID
PI_SESSION_FILE
PI_PROVIDER
PI_MODEL
PI_REASONING_LEVEL
```

可以通过 `exposeSessionEnvironment: false` 关闭。
`spawnHook` 可以在执行前改写 command / cwd / env。

### 输出

`OutputAccumulator` 边流式接收边维护：

- 滚动保留最后 `2 * maxBytes`；
- 超过限制时打开临时文件保存完整输出；
- 节流推送 `onUpdate` 快照。

超时消息会区分两种情况：

- 命令本身超时；
- shell 已经退出，但它启动的后台进程还在写输出。

非零退出码返回 `isError: true`，内容里带上输出和
`Command exited with code N`。

`structuredContent` 供程序化调用：

```ts
{ output, truncated, full_output_path?, exit_code, wall_time_seconds }
```

## 9. grep

调用 ripgrep：

```
--no-config --json --line-number --color=never --hidden
[--ignore-case] [--fixed-strings] [--glob G] [--context N]
-- PATTERN PATH
```

- `--no-config` 保证 `RIPGREP_CONFIG_PATH` 不会改变工具行为；
- 解析 JSON 事件，处理 `match` 和 `context`；
- 路径相对于搜索目录（单文件搜索时用 basename）；
- 每行截断到 500 字符；
- 匹配上限默认 100；
- 命中上限后再出现一个 match，才能确认“确实还有更多”；
- 字节上限 50KB，超出部分只计数不存储；
- abort 时杀掉 rg。

## 10. find

调用 fd：

```
--glob --color=never --hidden
[--no-require-git]
--max-results LIMIT+1
-- PATTERN PATH
```

细节：

- 不在 git 仓库内时加 `--no-require-git`，否则 fd 默认不读 `.gitignore`；
- 在仓库内使用 fd 的 git-aware 行为，父级 `.gitignore` 不会越过嵌套仓库边界；
- 含 `/` 的 pattern 加 `--full-path`，并补 `**/` 前缀；
- Windows 上把 `/` 替换成 `[/\\]`；
- 结果相对搜索根目录，分隔符统一为 `/`；
- `limit + 1` 用来区分“正好 N 个”和“超过 N 个”。

自定义 `operations.glob()` 可以完全绕过 fd。

## 11. ls

- 默认 limit 500，最小 1；
- 按大小写不敏感字母序排序；
- 目录加 `/` 后缀；
- 包含 dotfiles；
- 无法 stat 的条目跳过；
- 只有字节截断，没有单独的行限制（条目数已经封顶）。

## 12. OutputAccumulator

流式输出的有界内存实现：

```
append(Buffer)
  → TextDecoder 流式解码
  → 维护 tailText，超过 2*maxBytes 时 trim
  → 统计 totalLines / totalBytes / currentLineBytes
  → 超过限制时把原始 chunk 写入临时文件
```

`trimTail()` 会跳过 UTF-8 续字节，保证从字符边界开始。
`readFullOutput(maxBytes)` 在完整输出超过上限时返回“头部 + 省略标记 + 尾部”。

## 13. 设计观察

1. **所有工具都是可插拔的**：`ReadOperations`、`WriteOperations`、
   `EditOperations`、`BashOperations`、`GrepOperations`、`FindOperations`、
   `LsOperations` 都可以替换成远程实现。
2. **abort 处理一致**：检查 `signal.aborted`，杀掉进程树，不提前释放文件队列。
3. **每个工具都有结构化输出**：`structuredContent` 让 codemode 可以编程调用。
4. **截断会告诉模型下一步怎么做**：`offset=N`、`limit=2N`、`sed -n`，
   而不是只返回“被截断”。
5. **edit 是最复杂的工具**：模糊匹配 + 保留原始字节 + 多编辑重叠检测。
6. **路径没有沙箱**：`resolveToCwd` 只做解析，不检查是否在 cwd 内。

## 14. 尚未确认

- `processImage()` 的具体缩放策略与各模型限制。
- `waitForChildProcess()` 的实现细节。
- `createOutputFileStream()` 的临时目录与清理策略。
- `renderers/` 如何把工具结果渲染成 TUI 组件。
