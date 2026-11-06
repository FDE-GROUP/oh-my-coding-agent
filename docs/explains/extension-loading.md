# 扩展加载与配置

核心文件：

- `core/extensions/loader.ts`（888 行）：发现、加载、API 构造
- `core/resource-loader.ts`（1,319 行）：资源编排、信任、启用/禁用
- `core/settings-schema.ts`（494 行）：配置 schema
- `core/settings-manager.ts`（1,456 行）：全局/项目合并
- `core/extensions/types.ts`（2,352 行）：ExtensionAPI 与事件类型

## 1. 发现规则

`discoverExtensionsInDir()` 只扫描一层：

1. `*.ts` / `*.js` 文件 → 直接加载；
2. 子目录有 `index.ts` / `index.js` → 加载；
3. 子目录有 `package.json` 且声明 `pi.extensions` → 按声明加载。

标准位置与顺序（`discoverAndLoadExtensions`）：

```
1. <cwd>/.pi/extensions/         项目级
2. ~/.pi/agent/extensions/       全局
3. settings 里显式配置的路径       configuredPaths
```

去重按解析后的绝对路径，保留首次出现的顺序。

`DefaultResourceLoader` 走的是另一条路径：`packageManager.resolve()` 把
`settings.packages`（npm / git / 本地）解析成资源，再与 CLI 传入的临时路径合并。
最终顺序由 `extensionPaths` 决定，CLI 资源排在前面。

## 2. 加载机制

- 用 jiti 直接执行 TypeScript，无需编译；
- `moduleCache: false`，每次 reload 都是新模块实例；
- 宿主包（`@earendil-works/pi-*`、`typebox`）通过 alias 映射到 Pi 自己的副本，
  避免扩展装出第二份运行时；
- 模块必须默认导出一个工厂函数：`export default function (pi: ExtensionAPI) {...}`；
- 工厂可以是 async，Pi 会 await 它完成再继续启动。

加载失败不会中断整个进程：错误进 `errors`，其他扩展继续加载。

## 3. Handler 顺序与优先级

**没有显式的 priority 字段。** 顺序是：

```
扩展加载顺序 → 同一扩展内 handler 注册顺序
```

`emitToolCall` 会按这个顺序执行，第一个返回 `{ block: true }` 的立即胜出。

项目级扩展排在全局扩展之前，所以“项目策略覆盖全局策略”是天然成立的。
但这条规则没有被写进 API，只是一个副作用。**框架需要把它变成显式契约。**

## 4. 替换机制

内置扩展可以被标记为 `replaceable`。`omitReplacedExtensions()` 的规则：

- 第三方扩展注册了同名的 tool / command / flag；
- 内置扩展让位，并产生一条 warning。

这其实就是“默认实现 vs 团队覆盖”的雏形。可以复用这个模式做 pack 替换，
但它只覆盖名字冲突，不覆盖“同一能力的不同实现”。

## 5. 配置

### 位置与合并

| 范围 | 路径 |
|---|---|
| 全局 | `~/.pi/agent/settings.json` |
| 项目 | `<cwd>/.pi/settings.json` |

`deepMergeSettings(global, project)`：项目优先，嵌套对象递归合并。
项目配置在未受信任时被完全忽略。

### 任意命名空间配置是可行的

`SettingsSchema` 的根对象带 `{ additionalProperties: true }`，而
`settings-manager` 明确不严格校验（“Settings files are not validated”）。
所以下面这种配置可以直接用，不需要改 schema：

```json
{
  "omca": {
    "packs": {
      "permissions": { "mode": "audit", "writePaths": ["src/", "tests/"] }
    }
  }
}
```

扩展通过 `pi.getSettings()` 拿到的是全局+项目合并后的副本。

### 官方提供的启用/禁用手段

| 手段 | 粒度 |
|---|---|
| `settings.packages` 的对象形式 + `autoload: false` | 包 |
| `packages[].extensions/skills/prompts/themes` | 包内资源 |
| `settings.extensions` | 本地扩展路径 |
| `disabledBuiltinExtensions` | 内置扩展 |
| `noExtensions` / `noSkills` / `noPromptTemplates` / `noThemes` / `noContextFiles` | 资源类别 |
| `settings.defaultTools` 的 `+name` / `-name` | 工具装载 |
| `pi.setActiveTools()` | 运行期工具集 |

最后两项很重要：**渐进增强的工具装载已经有原语**，不需要自己发明。

## 6. ExtensionAPI 能力面

注册类：

```
on(event, handler)
registerTool / registerCommand / registerShortcut / registerFlag
registerMessageRenderer / registerEntryRenderer / registerToolRenderer
registerMarkdownTransformer
registerProvider / registerMcpServer / registerVirtualModel
```

动作类：

```
sendMessage / sendUserMessage / appendEntry
getFlag / getSettings / getActiveTools / getAllTools / setActiveTools
setSessionName / getSessionName / setLabel
exec / setModel / getThinkingLevel / setThinkingLevel
events.emit / events.on
```

`ExtensionContext` 提供：

```
ui, mode, hasUI, cwd, sessionManager（只读）, modelRegistry, model,
scopedModels, thinkingLevel, signal, isIdle(), isProjectTrusted(),
abort(), hasPendingMessages(), shutdown(), getContextUsage(),
compact(), getSystemPrompt()
```

工具执行上下文还可以 `executeTool(name, args)` 调用其他工具，
走同一套校验、hook 和权限检查。

## 7. 项目信任

```
loadProjectTrustExtensions()
  → 强制 projectTrusted = false
  → 只加载全局/CLI 扩展
  → resolveProjectTrust() 决定
  → 正式 reload，加载项目扩展
```

这意味着**项目级 pack 不能在信任决定之前生效**。这是好的默认值，但也意味着
项目级 gate 无法保护“信任决定”本身。第一道边界必须是全局的。

## 8. 对 pack 模型的含义

一个 pack 不需要新机制，它就是一个 Pi package：

```
my-pack/
  package.json      { "pi": { "extensions": ["./src/index.ts"] } }
  src/index.ts      export default function (pi) { ... }
```

配置放 `settings.json` 的命名空间键，状态用 `pi.appendEntry()`，
运行时工具用 `pi.setActiveTools()`。

但现有实现有三个缺口，正好是框架该补的：

| 缺口 | 影响 | 建议 |
|---|---|---|
| 没有依赖声明 | pack A 依赖 pack B 的 tool，加载顺序靠运气 | manifest 加 `requires`，拓扑排序 |
| 没有显式优先级 | 只能靠路径/加载顺序隐式决定 | manifest 加 `order` 或 `priority` |
| 命名空间配置无 schema | 配置错了不会报错，直到运行时 | pack 自带 JSON Schema，启动时校验 |

另外两个安全事实：

1. 扩展在 Pi 进程内运行，拥有同等 OS 权限；
2. 项目级扩展只在信任后加载，但全局扩展永远先加载。

所以“权限 pack”本身也只是一个扩展，**它不能保护自己不被另一个扩展绕过**。
真正的边界仍然必须是 OS 级沙箱。

## 9. 建议的内核层（不改 Pi 的加载器）

在 Pi 的扩展之上加一个很薄的 `pack` 清单层：

```ts
interface PackManifest {
  id: string
  version: string
  requires?: string[]          // 其他 pack id
  order?: number               // 同层排序
  defaultEnabled?: boolean
  configSchema?: object
  enforcement?: Record<string, "off" | "advise" | "block">
}
```

加载时：

1. 读取所有 pack 的 manifest；
2. 检查 `requires`，拓扑排序，检测环；
3. 用 `configSchema` 校验 `settings.omca.packs[id]`；
4. 按 `order` 生成最终的扩展路径顺序；
5. 禁用的 pack **不加载模块**，保证零成本。

这一层不需要 fork Pi 的 loader，只需要在 `settings.packages` / `extensions`
生成之前做一次排序和过滤。

## 10. 仍未确认

- `package-manager.ts` 的 `enabled` 判定规则与 `autoload` 的精确语义。
- `/reload` 之后 `ExtensionRunner` 如何重建、旧 ctx 如何失效（已知会
  `invalidate`）。
- `snapshotEventHandlers` 是否对同一扩展的多个 handler 保持稳定顺序。
