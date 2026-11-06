---
kind: configuration_system
name: Pi 配置系统：JSON Schema + 环境变量 + 用户目录分层
category: configuration_system
scope:
    - '**'
source_files:
    - packages/coding-agent/src/config.ts
    - packages/coding-agent/schemas/settings.schema.json
    - packages/coding-agent/schemas/models.schema.json
    - packages/coding-agent/schemas/keybindings.schema.json
    - packages/coding-agent/schemas/theme.schema.json
    - packages/ai/src/env-api-keys.ts
    - packages/ai/src/utils/provider-env.ts
    - packages/coding-agent/src/core/auth-storage.ts
    - packages/coding-agent/docs/environment-variables.md
---

## 1. 总体方案

Pi monorepo 没有引入第三方配置框架（如 dotenv、conf、configstore）。配置通过三层组合实现：

1. **包级运行时配置**：从 `package.json` 的 `piConfig` 字段读取应用名、配置目录名、版本等，由 `packages/coding-agent/src/config.ts` 在进程启动时解析。
2. **用户持久化配置**：位于 `~/.pi/agent/`（可通过 `PI_CODING_AGENT_DIR` 覆盖），以 JSON 文件形式存储，每个文件对应一个领域（settings、models、auth、keybindings、theme）。
3. **环境变量**：通过 `process.env` 与统一的 `getProviderEnvValue()` 访问器读取，用于进程开关、路径覆盖、凭据注入以及沙箱环境修复。

所有用户可编辑的配置项都有对应的 JSON Schema（`packages/coding-agent/schemas/*.schema.json`），Schema 由 TypeScript 源生成（注释声明 `This file is generated from TypeScript source. Do not edit it manually; run npm run generate:schemas.`），从而保证类型安全与编辑器提示。

## 2. 关键文件与职责

- `packages/coding-agent/src/config.ts`：安装方式检测、包路径解析、用户目录 (`~/.pi/agent`) 路径构造、自更新命令解析、包资产路径（themes/export-html/interactive assets/QuickJS wasm）。
- `packages/coding-agent/schemas/settings.schema.json`：settings.json 的完整 schema（800+ 行），定义 defaultProvider/defaultModel/compaction/retry/terminal/images/codemode/websocketConnectTimeoutMs 等全部设置项。
- `packages/coding-agent/schemas/models.schema.json`、`schemas/keybindings.schema.json`、`schemas/theme.schema.json`：其他用户配置文件的 schema。
- `packages/ai/src/env-api-keys.ts`：按 provider 映射到 API key 环境变量名（OPENAI_API_KEY、ANTHROPIC_API_KEY、GOOGLE_CLOUD_API_KEY 等），并处理 Anthropic/OAuth/GitHub Copilot 的特殊优先级。
- `packages/ai/src/utils/provider-env.ts`：统一的环境变量读取入口 `getProviderEnvValue(name, env?)`，支持传入 scoped `ProviderEnv`、回退到 `process.env`、再回退到 Bun sandbox `/proc/self/environ` 修复。
- `packages/coding-agent/docs/environment-variables.md`：官方文档化的 Pi 进程环境变量清单（PI_OFFLINE、PI_SKIP_VERSION_CHECK、PI_SELF_UPDATE_COMMAND、PI_CODEMODE_MAX_WORKERS 等）。
- `packages/coding-agent/src/core/auth-storage.ts`：基于 `auth.json` 的凭据存储实现，带文件锁、只读模式、provider 校验。

## 3. 架构与约定

### 3.1 用户配置目录结构

默认根目录为 `~/.pi/agent/`，子项包括：

| 路径 | 用途 |
|---|---|
| `settings.json` | 用户偏好（模型、TUI、终端、缓存预热、代理、工具选择等） |
| `models.json` | 自定义模型注册 |
| `auth.json` | 已登录凭据（OAuth token / API key 等） |
| `tools/` | 用户自定义工具 |
| `prompts/` | 提示词模板 |
| `themes/` | 用户主题 |
| `bin/` | 托管的二进制（fd、rg） |
| `sessions/` | 会话数据 |
| `${APP_NAME}-debug.log` | 调试日志 |

这些路径通过 `getAgentDir()` 派生，再由 `getSettingsPath()` / `getModelsPath()` / `getAuthPath()` 等 accessor 暴露。`PI_CODING_AGENT_DIR` 可整体覆盖该目录。

### 3.2 包内配置来源

`config.ts` 启动时读取 `getPackageJsonPath()` 返回的 `package.json`，提取 `name`、`version`、`piConfig.name`、`piConfig.configDir`，导出 `PACKAGE_NAME`、`APP_NAME`、`APP_TITLE`、`CONFIG_DIR_NAME`、`VERSION`。Bun 二进制与 Node.js 分发通过 `isBunBinary` / `isBundledNode` 分支选择不同的资源路径（`theme/`、`export-html/`、`modes/interactive/assets/`）。

### 3.3 环境变量分层

`getProviderEnvValue()` 的查找顺序是：

1. 显式传入的 `env` 参数（scoped override，便于测试与多租户）。
2. `process.env[name]`。
3. Bun sandbox 下 `/proc/self/environ` 的兜底读取。

这使同一份 provider 代码可在浏览器/Vite、Node、Bun 三种环境下工作，同时允许调用方注入 mock env。

API key 解析集中在 `env-api-keys.ts`：对每个 provider 维护一个 `envMap`，将 provider 字符串映射到一个或多个环境变量名；Anthropic 特殊处理 `ANTHROPIC_AUTH_TOKEN`（仅用于 Authorization header，不作为普通 API key 返回）。

### 3.4 Schema 驱动的配置

所有用户配置项都先以 TypeScript 类型/接口定义，再通过 `scripts/generate-schemas.ts` 生成 `schemas/*.schema.json`。settings.json 的 `$comment` 明确禁止手动编辑，强制“单真相源”在 TS 侧。

### 3.5 自更新命令

自更新命令有两个来源，优先级如下：

1. `PI_SELF_UPDATE_COMMAND`（空格分隔 argv，支持 `{packageName}` / `{version}` / `{installSpec}` 占位符）。
2. settings.json 中的 `selfUpdateCommand` 数组。

安装方式通过 `detectInstallMethod()` 自动推断（bun-binary / pnpm / yarn / bun / npm / unknown），然后生成对应的 `pnpm install -g` / `yarn global add` / `bun install -g` / `npm install -g` 命令。若检测到安装被全局包管理器管理且不可写，则给出相应错误提示。

## 4. 约定与约束

- 用户配置目录固定为 `~/.pi/agent/`，可通过 `PI_CODING_AGENT_DIR` 或 settings.json 中的 `sessionDir` 覆盖部分行为。
- 所有用户可编辑的设置必须出现在 `schemas/settings.schema.json` 中；该文件由脚本生成，禁止手工修改。
- Provider API key 必须通过标准环境变量提供（如 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GOOGLE_CLOUD_API_KEY` 等），新增 provider 需在 `env-api-keys.ts` 的 `envMap` 中添加映射。
- 环境变量读取统一走 `getProviderEnvValue()`，禁止直接散落 `process.env` 访问，以保证 Bun sandbox 兼容性与测试可注入性。
- Pi 进程自身配置变量以 `PI_` 前缀命名（见 `docs/environment-variables.md`），例如 `PI_OFFLINE`、`PI_SKIP_VERSION_CHECK`、`PI_SELF_UPDATE_COMMAND`、`PI_CODEMODE_MAX_WORKERS`、`PI_CACHE_RETENTION`、`PI_SHARE_VIEWER_URL`、`PI_PACKAGE_DIR` 等。
- 凭据写入 `auth.json` 时使用文件锁，并对每个 provider 的 credential 结构做运行时校验；只读实例禁止写入。
- 包内资源路径区分 Bun 二进制与 Node.js 分发：Bun 二进制下 theme/export-html/assets 与可执行文件同目录；Node.js 下位于 `src/` 或 `dist/modes/interactive/` 相对路径。
- 进程标记：CLI/RPC 入口设置 `AI_AGENT=pi` 与 `PI_CODING_AGENT=true`，供子进程识别 Pi 身份；shell 工具还会注入 `PI_SESSION_ID` / `PI_SESSION_FILE` / `PI_PROVIDER` / `PI_MODEL` / `PI_REASONING_LEVEL`。
