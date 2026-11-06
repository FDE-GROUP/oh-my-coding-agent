---
title: "Pi 多包 Monorepo 配置系统：分层设置、模型目录与环境变量解析"
---

> **知识卡元数据**（Repo Wiki 自动生成，可能过时）
>
> - 类型：`configuration_system`
> - 适用范围：`**`
> - 覆盖源文件（11）：[`packages/coding-agent/src/config.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/config.ts)、[`packages/coding-agent/src/core/settings-manager.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/settings-manager.ts)、[`packages/coding-agent/src/core/settings-defaults.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/settings-defaults.ts)、[`packages/coding-agent/src/core/settings-schema.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/settings-schema.ts)、[`packages/coding-agent/src/core/model-config.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/model-config.ts)、[`packages/coding-agent/src/core/resolve-config-value.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/coding-agent/src/core/resolve-config-value.ts)、[`packages/ai/src/auth/context.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/ai/src/auth/context.ts)、[`packages/ai/src/utils/provider-env.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/packages/ai/src/utils/provider-env.ts)、[`apps/omfde/bin/omfde.mjs`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/apps/omfde/bin/omfde.mjs)、[`extensions/omfde-core/src/index.ts`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/extensions/omfde-core/src/index.ts)、[`.env.example`](https://github.com/FDE-GROUP/oh-my-fde/blob/main/.env.example)

## 1. 采用的系统与工具

仓库没有引入 dotenv 等第三方 .env 加载库，而是通过 `process.env` + 自定义解析器实现配置。核心依赖包括：
- `typebox`（`Type` / `Compile`）用于 JSON Schema 校验与类型推导
- `proper-lockfile` 对 settings.json 做文件级锁保护
- Node 内置 `fs`/`os`/`child_process` 直接读写配置文件
- Bun 运行时检测（`import.meta.url` 包含 `$bunfs`/`~BUN`/`%7EBUN`）以适配二进制分发

## 2. 关键文件与位置

| 职责 | 文件 |
|---|---|
| 应用根路径、安装方式、包资源、用户配置目录 | `packages/coding-agent/src/config.ts` |
| 用户设置（settings.json）加载、合并、校验、持久化 | `packages/coding-agent/src/core/settings-manager.ts` |
| 设置默认值 | `packages/coding-agent/src/core/settings-defaults.ts` |
| 设置 JSON Schema | `packages/coding-agent/src/core/settings-schema.ts` |
| 模型目录（models.json）加载与校验 | `packages/coding-agent/src/core/model-config.ts` |
| API Key / Header 值解析（`$VAR`、`${VAR}`、`!command`） | `packages/coding-agent/src/core/resolve-config-value.ts` |
| LLM Provider 认证上下文（env/fileExists） | `packages/ai/src/auth/context.ts` |
| Provider 环境变量解析（含 Bun sandbox 回退） | `packages/ai/src/utils/provider-env.ts` |
| OMFDE 平台扩展入口（注入 `OMFDE_PLATFORM`） | `apps/omfde/bin/omfde.mjs` |
| 示例 .env | `.env.example` |
| 各 schema 定义（供文档生成） | `packages/coding-agent/schemas/*.schema.json` |

## 3. 架构与约定

### 3.1 配置来源分层（由低到高优先级）

1. **包内默认值**：`settings-defaults.ts` 中的 `SETTINGS_DEFAULTS`。
2. **包内 models.json 内置模型**：`model-config.ts` 从包内 models.json 读取。
3. **全局用户配置**：`~/.pi/agent/settings.json`（或 `~/.pi/agent/models.json`），由 `getAgentDir()` 决定。
4. **项目级配置**：`<cwd>/.pi/agent/settings.json`，由 `FileSettingsStorage` 在 `cwd` 下查找。
5. **进程环境变量**：如 `PI_SELF_UPDATE_COMMAND`、`PI_PACKAGE_DIR`、`PI_CODING_AGENT_DIR`、`PI_SESSION_DIR`、`PI_SHARE_VIEWER_URL`、`OMFDE_PLATFORM` 等，覆盖同名 setting。
6. **CLI 参数**：通过 `--model`、`--tools`、`--provider` 等传入的运行时参数（例如 `applyToolModifiers` 处理 `+name`/`-name`）。

### 3.2 用户配置目录解析

`config.ts` 中 `getAgentDir()` 优先检查 `PI_CODING_AGENT_DIR`（或 `<APP_NAME>_CODING_AGENT_DIR`），否则回退到 `homedir()/.pi/agent`。同目录下固定子目录：`themes/`、`bin/`、`prompts/`、`sessions/`、`tools/`；固定文件：`settings.json`、`models.json`、`auth.json`、`<app>-debug.log`。

### 3.3 设置文件格式与校验

- 使用 TypeBox 编译出的 schema 校验 `settings.json`，错误以 `SettingsError`（含 scope/path/error）形式返回。
- 支持深合并（`deepMergeObjects`），但 `defaultTools` 走特殊合并逻辑：纯名称列表替换基值，`+name`/`-name` 修饰符追加到基值后按序生效。
- 写入时使用 `proper-lockfile` 加锁，避免并发写入损坏。

### 3.4 模型目录（models.json）

- 路径：`getModelsPath()` → `~/.pi/agent/models.json`。
- 结构：`providers.<id>` 对象，每个 provider 可声明 `baseUrl`、`apiKey`、`api`、`oauth`、`headers`、`compat`、`models[]`、`modelOverrides`。
- `apiKey` 字段支持三种写法：字面量、`"$NAME"` 环境变量插值、`"!command"` shell 命令输出。
- 所有值通过 `resolveConfigValue` 解析，命令执行结果按进程生命周期缓存。

### 3.5 配置值解析器（`resolve-config-value.ts`）

解析规则：
- 以 `!` 开头 → 作为 shell 命令执行，stdout 去空白后作为值（Windows 用 `cmd.exe /d /c`，其他平台用配置的 shell）。
- 包含 `$VAR` 或 `${VAR}` → 从 `env` 参数或 `process.env` 中取值，缺失则返回 `undefined`。
- `$$` 转义为字面量 `$`，`$!` 转义为字面量 `!`。
- 非命令值中未引用的 `$` 保留原样。
- 提供 `getConfigValueEnvVarNames` / `getMissingConfigValueEnvVarNames` 用于静态分析哪些环境变量是必需的。

### 3.6 Provider 环境隔离

`packages/ai/src/utils/provider-env.ts` 暴露 `getProviderEnvValue(name, env?)`，优先级：`env[name]` → `process.env[name]` → Bun sandbox `/proc/self/environ` 回退。注释明确说明这是为了兼容 Bun 编译二进制在 Linux sandbox 中 `process.env` 为空的问题。

`packages/ai/src/auth/context.ts` 的 `defaultProviderAuthContext()` 提供跨运行时的 auth 抽象：`env(name)` 读 `process.env`，`fileExists(path)` 支持 `~` 展开并通过 `node:fs/promises` 异步探测，浏览器环境下 fs 调用始终返回 false。

### 3.7 OMFDE 平台注入

`apps/omfde/bin/omfde.mjs` 作为 CLI 包装器，启动时注入 `OMFDE_PLATFORM=omfde` 环境变量，再转发参数到 monorepo 内的 pi 可执行文件，从而让 Pi 内核区分“平台化调用”和“普通调用”。`extensions/omfde-core/src/index.ts` 通过 ExtensionAPI 注册 `/omfde` 命令作为探针，不修改内核。

### 3.8 运行时元信息

`config.ts` 启动时读取 package.json 的 `piConfig.name`、`piConfig.configDir`、`version`，导出 `PACKAGE_NAME`、`APP_NAME`、`APP_TITLE`、`CONFIG_DIR_NAME`、`VERSION`，并据此派生 `ENV_AGENT_DIR`、`ENV_SESSION_DIR` 等环境变量名。

## 4. 约定与约束

- **无 .env 文件加载器**：仓库未引入 dotenv，`.env.example` 仅作为开发者参考；实际运行时只读 `process.env`。
- **配置目录可通过环境变量覆盖**：`PI_PACKAGE_DIR` 覆盖包根目录，`PI_CODING_AGENT_DIR` 覆盖用户配置目录，`PI_SESSION_DIR` 覆盖会话目录，`PI_SELF_UPDATE_COMMAND` 覆盖自更新命令。
- **models.json apiKey 必须经 `resolveConfigValue` 解析**：不允许把明文密钥直接传给底层 SDK，应使用 `$NAME` 或 `!command` 形式。
- **settings.json 写入需加锁**：`FileSettingsStorage.withLock` 强制串行化，防止多进程同时编辑。
- **Bun 二进制与 Node 分发包共享同一套配置路径逻辑**：`isBunBinary`、`isBundledNode`、`findNodePackageDir` 统一处理两种分发形态下的资源定位。
- **Provider 环境变量读取必须走 `getProviderEnvValue`**：注释明确要求 provider env lookup 不能依赖 `process.env` 被 patch，因为 ai 包可被独立消费。
- **Schema 即契约**：`settings-schema.ts`、`model-config.ts` 中的 TypeBox schema 既是运行时校验，也是 `schemas/*.schema.json` 文档生成的来源（见 `scripts/generate-schemas.ts`）。