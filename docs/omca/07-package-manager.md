# Package Manager

核心文件：`core/package-manager.ts`（2,967 行）。
这一层决定“pack 能不能完全不加载”，是渐进增强可行性的最后一环。

## 1. 来源类型

| 形式 | 解析 |
|---|---|
| `npm:foo@1.2.3` / `foo@1.2.3` | npm 包，可钉版本或范围 |
| `git:host/path` | git 仓库，安装后记录 commit |
| 本地路径 | 直接使用，不安装 |
| `builtin:<name>` | 内置扩展，无文件 |

作用域：

- `user`：`~/.pi/`
- `project`：`<cwd>/.pi/`
- `temporary`：CLI 传入，不持久化

`PI_OFFLINE=1` 时跳过所有网络访问。

## 2. resolve() 的流程

```
resolve()
  1. 收集 packages：项目条目在前，全局条目在后
  2. dedupePackages()：同一 identity 项目胜出
  3. 对每种资源（extensions/skills/prompts/themes）：
       a. 项目 settings 里的本地条目
       b. 全局 settings 里的本地条目
  4. addAutoDiscoveredResources()：约定目录自动发现
  5. 内置扩展
  6. 返回 ResolvedResource[] { path, enabled, metadata }
```

**关键点：`enabled: false` 的资源不会进入加载器。** `resource-loader` 只把
`enabled` 的资源路径传给 `loadExtensions`。所以禁用 = 零加载成本，不只是
“加载了但不注册”。

## 3. 优先级

`resourcePrecedenceRank()` 定义“同名冲突时谁赢”：

| rank | 来源 |
|---:|---|
| 0 | 项目 + settings 条目 |
| 1 | 项目 + 自动发现 |
| 2 | 用户 + settings 条目 |
| 3 | 用户 + 自动发现 |
| 4 | 包资源 |
| 5 | 内置扩展 |

同一 rank 内按插入顺序，规则是“先到先得”。**没有拓扑排序，也没有显式 priority。**

## 4. 过滤语义（最重要）

`settings.packages` 的对象形式有三种模式：

### 模式 A：默认

`{ "source": "npm:foo" }` 或 `"npm:foo"`

按 `pi` manifest 声明；没有声明就扫描约定目录 `extensions/`、`skills/`、
`prompts/`、`themes/`。

### 模式 B：显式过滤

```json
{ "source": "npm:foo", "extensions": ["src/a.ts", "!src/b.ts", "+src/c.ts", "-src/d.ts"] }
```

规则：

| 前缀 | 含义 |
|---|---|
| 普通 | 包含 |
| `!` | 排除 |
| `+` | 强制包含（覆盖排除） |
| `-` | 强制排除（覆盖强制包含） |

空数组表示**该类型全部禁用**。

### 模式 C：opt-in（`autoload: false`）

```json
{ "source": "npm:foo", "autoload": false, "extensions": ["src/permissions.ts"] }
```

- 从空集开始；
- 只有显式列出的资源被启用；
- `-` / `!` 禁用，`+` 启用。

这是渐进增强最干净的形态：**包已安装，但默认什么都不启用，按需打开。**

### 项目对全局的 delta

`dedupePackages()` 有一个特殊规则：

> 项目条目如果 `autoload: false`，它不被视为“覆盖全局”，而是“全局条目的增量”，
> 两者都保留，delta 在前。

也就是说可以这样用：

```json
// 全局：装好整个团队工具包，默认全开
{ "packages": ["git:internal/agent-packs"] }

// 项目：只开其中两个
{ "packages": [{ "source": "git:internal/agent-packs", "autoload": false,
                 "extensions": ["packs/permissions.ts", "packs/verify.ts"] }] }
```

这正是“全局分发、项目按需”的机制，不需要我们另造。

## 5. 本地 settings 条目也支持模式

`settings.extensions` / `skills` / `prompts` / `themes` 同样支持
`!` / `+` / `-`。内置扩展的开关就是 `-builtin:mcp`。

## 6. 内置扩展的替换

- 内置扩展以 `builtin:<name>` 表示；
- 默认启用，除非被 `-builtin:x` / `!builtin:x` 排除；
- 项目设置里的 override 优先于全局设置；
- `replaceable` 的内置扩展会在第三方注册同名 tool/command/flag 时让位。

这是“默认实现 vs 团队覆盖”的现成机制。

## 7. 对 pack 模型的结论

**一个 pack 就是一个 package，不需要新机制。**

| 需求 | 现成做法 |
|---|---|
| 安装 pack | `settings.packages` 加一条 |
| 默认不启用 | `autoload: false` |
| 只启用部分能力 | `extensions` 显式列路径 |
| 项目覆盖全局 | 项目 `autoload:false` delta |
| 团队默认 vs 个人覆盖 | 全局 package + 项目 delta |
| 禁用 = 零成本 | `enabled:false` 不进入加载器 |
| 默认实现被替换 | `replaceable` 内置扩展 |

但仍有四个缺口，必须由我们的薄层补：

| 缺口 | 后果 |
|---|---|
| 没有 `requires` | pack 之间的依赖靠路径碰运气 |
| 没有显式 `priority` | 同 rank 内只能靠插入顺序 |
| 没有配置 schema | `settings.omca.packs.*` 写错不报错 |
| 没有运行期开关 | 只能在加载时决定，`/reload` 才能变 |

## 8. 设计含义

pack 层可以做得非常薄：

```
resolve() 之后、loadExtensions() 之前
  → 读取每个 pack 的 manifest（从 pi manifest 扩展一个 omca 字段）
  → 拓扑排序 requires
  → 按 order 稳定排序
  → 用 configSchema 校验 settings.omca.packs[id]
  → 生成最终的 extensionPaths
```

不需要改 package-manager，也不需要改 loader。唯一要决定的是
**pack 的身份从哪里来**：package 名、manifest 的 `pi.omca.id`，还是路径。

我倾向 `pi.omca` 字段：

```json
{
  "pi": {
    "extensions": ["./src/index.ts"],
    "omca": {
      "id": "permissions",
      "requires": ["core"],
      "order": 10,
      "configSchema": "./schema.json"
    }
  }
}
```

这样不污染 Pi 的 manifest 语义，缺失时也能回退到“无依赖、无顺序”。

## 9. 仍未确认

- npm/git 安装目录与更新/回滚的精确行为（`install()` / `update()` 的
  2,000 行实现没读完）。
- `settings.packages` 持久化时如何写回全局/项目文件。
- `PI_OFFLINE` 下缺失包的 `MissingSourceAction` 交互流程。
