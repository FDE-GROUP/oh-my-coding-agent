# Provider 与 Stream

核心不是 14k 行的 provider 实现，而是 `packages/ai/src/utils/transcript.ts`
（263 行）定义的 transcript 协议。理解它比读任何一个 provider 都重要。

## 1. 两个 Context 类型

```ts
Context            // 公开输入：{ systemPrompt?, messages, tools? }
TranscriptContext  // 品牌类型：只能由 normalizeContext() 产生
```

`normalizeContext()` 把 `systemPrompt` 和 `tools` 折叠成**第一条 system message**。
之后所有 provider 只接受 `TranscriptContext`，从类型上杜绝“原始 Context 误入
provider”的情况。

## 2. Prompt 是增量流，不是重建的字符串

`SystemMessage` 的字段：

```ts
{
  role: "system",
  content: string,                    // 首条是 base prompt，后续是追加指令
  sections?: Record<string, string | null>, // 按名字替换/删除段落
  toolsAdded?: Tool[],
  toolsRemoved?: ToolReference[],
  timestamp: number
}
```

重放规则（`getCurrentSystemMessage`）：

- `content` 依次拼接；
- `sections` 按名字覆盖，`null` 删除；
- 工具用 `getCurrentTools` 按 `toolsRemoved` / `toolsAdded` 应用增量。

所以“修改 prompt”不是重新生成一整段文本，而是**追加一条差异**。
这是 Pi 保住 prompt cache 的核心机制。

## 3. 按 transport 能力决定工具声明的放法

`resolveTranscriptTools` 支持三种能力：

| 能力 | 行为 | 缓存影响 |
|---|---|---|
| `none` | 顶层工具列表 = 当前工具集 | 每次工具变化都可能失效 |
| `additions` | 顶层列表停在最后一次“非增量变化”，后续新增原地声明 | 只在删除/重定义时失效一次 |
| `changes` | 所有工具都在 system message 原地声明 | 由 provider 的前缀缓存决定 |

“非增量变化”指删除工具或同名重定义。`getToolStateChanges` 会把
“定义变了”判成一次删除 + 一次新增。

`toToolDeclaration` 在比较和持久化前剥掉可执行字段（`execute` 等），
只保留模型可见的 `name` / `description` / `parameters` / `constrainedSampling`。

## 4. 缓存与用量

- `Usage` 明确区分 `input` / `output` / `cacheRead` / `cacheWrite` / `cost`；
- `StreamOptions` 有 `cacheRetention` 和 `sessionId`；
- 部分 provider 支持 1h 缓存写入（`cacheWrite1h`）；
- coding-agent 的 `cache-warmer.ts` 会基于 warm/miss 成本决定是否预热。

设计意图很清楚：**让不变的 prefix 尽量长，让变化只发生在尾部。**

## 5. 失败契约

- `streamSimple()` 在缺少认证时**可以同步抛错**；
- 一旦返回了 stream，请求/模型/运行时错误必须编码进流：
  `stopReason: "error" | "aborted"` + `errorMessage`；
- `start` 之前不能出现 update/done；
- agent loop 依赖这个契约决定是否重试或终止（`agent-loop.ts:254`）。

## 6. 对渐进增强的含义

| 操作 | 代价 |
|---|---|
| 启用/禁用一个 pack，改变工具集 | 一次 cache miss（工具声明变化） |
| 修改 prompt 的某个 section | 一次 cache miss（该 section 之后的前缀） |
| 每轮重写整段 system prompt | 每轮 cache miss，必须避免 |
| 把状态写进 `custom` entry | 零上下文成本 |
| 在 `before_provider_request` 改 payload | 可能每轮 miss，且绕过 `ctx.getSystemPrompt()` |

所以渐进增强的正确姿势是：

1. 能力开关只在**会话开始时**改变工具集和 prompt section；
2. 运行期状态放 `custom` entry；
3. 需要模型知道的事情用 `custom_message`，它会作为 user 角色消息进入尾部；
4. 不要在每轮请求里重建 prompt。

## 7. 仍未读的部分

- 具体 provider 的缓存实现（Anthropic 的 `cache_control`、OpenAI 的
  automatic caching）在 `api/*.ts`，共约 14k 行，按需再读。
- `cache-warmer.ts` 的预热决策逻辑，尚未读。
- `constrainedSampling` 在各 provider 的降级策略，尚未读。
