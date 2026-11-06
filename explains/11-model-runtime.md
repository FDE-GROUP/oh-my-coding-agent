# Model Runtime 与认证

核心文件：

- `core/model-runtime.ts`（1,078 行）：provider 组合、认证、stream 分发
- `core/auth-storage.ts`（508 行）：`auth.json`、锁、凭据读写
- `core/model-resolver.ts`（690 行）：模型引用、scope、初始选择
- `core/virtual-models.ts`（238 行）：虚拟模型路由
- `core/provider-composer.ts`（742 行）：provider 叠加配置
- `core/models-store.ts`（147 行）：模型目录缓存

## 1. 分层

```
ModelRuntime
  ├─ RuntimeCredentials      // 会话级 API key 覆盖 + 持久化凭据
  ├─ ModelConfig             // models.json：provider 覆盖配置
  ├─ Models (pi-ai)          // provider 注册表 + 模型目录
  ├─ ModelsStore             // 模型目录缓存（文件或内存）
  └─ builtinProviderCatalog  // 内置 provider 定义
```

`ModelRuntime` 实现了 pi-ai 的 `Models` 接口，所以上层既可以当它是
provider 注册表，也可以当它是 stream 入口。

## 2. Provider 的来源与组合

一个 provider 可能来自五处：

| 来源 | 存储 |
|---|---|
| 内置 provider | `builtinProviderCatalog` |
| 扩展注册的原生 provider | `nativeExtensionProviders` |
| 扩展注册的配置式 provider | `extensionProviders` |
| `models.json` 里的覆盖配置 | `ModelConfig` |
| 只含虚拟模型 | `virtualModels` |

`composeProvider(providerId)` 的规则：

```
base = nativeExtensionProvider ?? builtinProvider
if 没有 config 且没有 extension:
  直接用 base（保留其 auth/login/stream 行为）
else:
  composeModelProvider(base, config, extension)
  失败时记录 compositionError，并回退到 base
```

组合成功后，`recomposeProvider()` 再把虚拟模型挂上去：

```
models.setProvider(withVirtualModels(providerId, provider, virtualModels))
```

## 3. 快照与可用性

```ts
snapshot = {
  all: Model[],
  available: Model[],
  configuredProviders: Set<string>,
  storedProviders: Set<string>,
  auth: Map<string, AuthCheck>,
}
```

`available` 不是“所有模型”，而是“当前有认证的 provider 的模型”。

刷新是异步的，用序号防止旧结果覆盖新结果：

- `availabilityRefreshSeq`：全量刷新；
- `providerAvailabilitySeq`：单 provider 刷新；
- `availabilityErrorSeq`：错误归属。

`markProvisionallyConfigured()` 解决一个启动竞态：扩展刚注册 provider 时，
异步可用性检查还没完成，但初始模型选择已经在读 snapshot。于是先标记为已配置，
下一次刷新再替换成真实结果。

## 4. 认证存储

### 文件

```
~/.pi/agent/auth.json
```

- 目录 `0700`，文件 `0600`（仅创建时设置，保留管理员 ACL）；
- 用 `proper-lockfile` 加锁；
- 同步锁最多 10 次重试（Windows 的 EPERM 另算）；
- 异步锁有 30 秒 stale 超时和指数退避。

### 凭据格式

```ts
type Credential =
  | { type: "api_key"; key?: string; env?: Record<string,string> }
  | { type: "oauth"; access: string; refresh: string; expires: number }
```

`api_key` 的 `key` 可以是命令配置值（`isCommandConfigValue`），读取时才
`resolveConfigValue` 解析，不落盘明文。

### 读缓存

`AuthStorage` 维护 `readState`：

- `revision` 用文件 mtime/size 判断是否需要重新读；
- 并发读合并成一次 `reload`，用 reader 计数决定何时 abort；
- 读取失败保留上一次有效快照。

### 会话级覆盖

`RuntimeCredentials` 在持久化凭据之上加一层内存覆盖：

- `setRuntimeApiKey()` 只影响当前进程，不写 `auth.json`；
- 用于 `--api-key` 和临时切换。

## 5. 凭据变更的同步

```ts
login / logout / setRuntimeApiKey / removeRuntimeApiKey
  → enqueueCredentialOperation(providerId)   // 同 provider 串行
  → 修改凭据
  → synchronizeCredentialState()
       recomposeProvider()
       models.refresh({ allowNetwork: false, providers: [id] })
       updateModelSnapshot()
       refreshProviderAvailability()
```

如果凭据已经写入成功，但本地快照同步失败，会抛
`CredentialSynchronizationError`，并带上 provider、操作和凭据。
这样调用方知道“磁盘已变，但内存没跟上”。

`settleCredentialWrites()` 在退出前等待进行中的写入，避免 OAuth 刷新轮换了
refresh token 却没保存。

## 6. 请求准备

`prepareRequest(model, options)`：

```
1. 找 provider
2. getAuth(model, { apiKey, env, signal })
3. 如果 auth.baseUrl 存在，覆盖 model.baseUrl
4. headers 合并顺序：
   getOpenCodeSessionHeaders()
   → resolution.auth.headers
   → providerOptions.headers
   → transformHeaders()（扩展的 before_provider_headers）
5. env = resolution.env + providerOptions.env
6. apiKey = providerOptions.apiKey ?? resolution.auth.apiKey
```

`getAuth()` 在 `models.getAuth` 之上再合并 `models.json` / 扩展配置里的
模型级 headers。

## 7. Stream 方法

所有入口都走 `lazyStream`：

| 方法 | 用途 |
|---|---|
| `stream` | 带 API 特定选项 |
| `streamSimple` | 统一选项 |
| `streamDeferred` / `fetchDeferred` / `cancelDeferred` | 延迟响应 |
| `generateImages` | 图片生成 |
| `classify` | 分类模型 |

`lazyStream` 的意义：认证失败、provider 不存在的错误可以在真正开始流式时
才抛出，并被编码成 stream 错误，而不是同步炸掉调用方。

虚拟模型在 `streamSimple` 里特殊处理：先 `resolveModel`，再用物理模型重试；
调用方为虚拟 provider 解析的凭据不会发给另一个 vendor。

## 8. 虚拟模型

### 定义

```ts
{
  provider, id, name,
  thinkingLevels?,
  contextWindow?, maxTokens?,
  input?,
  route(request) → { model, thinkingLevel, state? }
}
```

- api 固定为 `pi-virtual`；
- 永远不会到达 provider；
- 可以挂在一个已有物理模型的 provider 下；
- 只含虚拟模型的 provider 不需要凭据。

### 路由请求

```ts
route({
  model, thinkingLevel, reason,
  previous?,   // 最近一次成功响应的物理模型
  failed?,     // 重试时失败的那次请求
  state?,      // 上次保存的路由状态
  messages,    // 完整对话
})
```

`reason` 四种：

| 值 | 含义 |
|---|---|
| `user` | 用户消息后的第一次请求 |
| `continuation` | 工具结果/扩展消息后的请求 |
| `retry` | 自动重试（含压缩后的重试） |
| `direct` | agent loop 之外的请求（摘要、扩展调用） |

路由结果必须是已注册的物理模型，并且该 provider 有凭据；thinking level
会按目标模型 clamp。

### 状态持久化

路由返回的 `state` 存成 session 的 `custom` entry：

```
customType = "pi.virtual-model-state"
data = { provider, modelId, state }
```

下次同 provider/model 的路由会带上它。

### 选择恢复

`getBranchSelection(branch)`：

- 最新的 `model_change` 优先；
- 如果它是虚拟模型，就保持虚拟选择，直到下一次 `model_change`；
- 否则用最后一条物理 assistant 响应；
- 虚拟模型已被注销时，回退到最后的物理响应。

## 9. 模型引用解析

`resolveModelReference(text, models, usable)`：

1. 精确 id 匹配；
2. `provider/id` 前缀匹配（provider id 本身可能含 `/`，取最长匹配）；
3. 精确匹配不到时，尝试 `:<thinking>` 后缀；
4. 仍不到时，模糊匹配 id / name。

细节：

- thinking 后缀只在整段文本匹配不到模型时才解析。OpenRouter 的
  `qwen/qwen3-coder:exacto` 这种 id 含冒号，不能误判。
- 同一 id 出现在多个 provider 时，`usable`（有凭据）只用于打破平局；
  仍然歧义就报错，让用户用 `provider/id` 指定。
- 完全找不到但有明确 provider 时，`buildFallbackModel()` 用一个自定义
  model id 兜底，方便 `--api-key` 首次配置。

## 10. Scope 与初始选择

### `resolveModelScope(patterns)`

支持：

- `provider/model`
- `model`
- glob：`*sonnet*`、`provider/*`
- thinking 后缀：`provider/*:high`

每个 pattern 可能产出多个模型；歧义和无效 thinking level 变成 warning。

### `findInitialModel()`

优先级：

```
1. scopedModels[0]（仅新会话）
2. settings 里保存的默认模型（且该 provider 有认证）
3. 已知 provider 的默认模型
4. 第一个可用模型
```

### `restoreModelFromSession()`

恢复会话时：

- 模型存在且 provider 有认证 → 用它；
- 否则回退到当前模型或第一个可用模型，并给出 fallback message。

## 11. 设计要点

1. **provider 是组合出来的，不是固定的**：内置 + 配置 + 扩展 + 虚拟模型。
2. **认证与模型目录分离**：`auth.json` 存凭据，`models.json` 存 provider 覆盖，
   `models-store.json` 存目录缓存。
3. **凭据变更是串行事务**：写入、重组合、刷新、可用性检查是一条链。
4. **虚拟模型是选择层的语法糖**：路由后只剩物理模型，消息记录物理模型。
5. **歧义不猜**：同一 id 多 provider 时优先报错，而不是按目录顺序选一个。
6. **错误尽量进 stream**：`lazyStream` 让上层可以用统一方式处理认证失败。

## 12. 尚未确认

- `provider-composer.ts` 的字段级覆盖规则（baseUrl、headers、oauth、models）。
- `ModelConfig` 的 `models.json` schema 与热更新行为。
- `models-store.json` 的缓存失效策略。
