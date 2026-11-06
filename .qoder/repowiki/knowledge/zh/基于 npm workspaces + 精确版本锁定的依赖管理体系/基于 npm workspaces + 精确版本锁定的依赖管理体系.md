---
kind: dependency_management
name: 基于 npm workspaces + 精确版本锁定的依赖管理体系
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - .npmrc
    - package-lock.json
    - scripts/check-pinned-deps.mjs
    - scripts/check-runtime-deps.mjs
    - scripts/generate-coding-agent-install-lock.mjs
    - scripts/npm-audit.mjs
    - scripts/check-lockfile-commit.mjs
    - scripts/package-workspaces.mjs
    - scripts/sync-versions.js
    - scripts/local-package-install.mjs
---

## 1. 使用的系统与工具

- **包管理器**: npm（`package-lock.json` 为锁定文件），同时仓库根 `devDependencies` 中声明了 `pnpm@11.15.1`，但实际工作区由 npm 管理。
- **工作区**: 通过根 `package.json` 的 `workspaces` 字段聚合 `packages/*` 以及 `packages/coding-agent/examples/extensions/with-deps`、`custom-provider-anthropic`、`custom-provider-gitlab-duo`、`gondolin` 等示例扩展。
- **Node 版本约束**: 根 `engines.node = ">=22.19.0"`，所有子包也各自声明 `engines`。
- **私有注册表**: `.npmrc` 仅配置 `save-exact=true` 与 `min-release-age=2`；未配置私有 registry / auth token，默认使用 npm public registry。
- **构建/发布脚本**: 全部位于 `scripts/`，包括 `publish.mjs`、`pack-packages.mjs`、`release.mjs`、`local-release.mjs`、`sync-versions.js` 等。

## 2. 关键文件

| 文件 | 作用 |
|---|---|
| `package.json` | 顶层 workspace 定义、统一 scripts、`overrides.protobufjs`、`engines.node` |
| `.npmrc` | `save-exact=true`、`min-release-age=2` |
| `package-lock.json` | 全仓锁定文件（lockfileVersion 3） |
| `scripts/check-pinned-deps.mjs` | 强制所有直接 registry 依赖使用精确语义化版本 |
| `scripts/check-runtime-deps.mjs` | 用 TypeScript AST 检查公开包的运行时 import 是否已声明在 dependencies/optionalDependencies/peerDependencies |
| `scripts/generate-coding-agent-install-lock.mjs` | 从根 lockfile 生成 `packages/coding-agent/install-lock/package.json` + `package-lock.json`，用于安装器离线分发 |
| `scripts/npm-audit.mjs` | 运行 `npm audit --omit=dev`，阈值 `moderate`，维护白名单 `acceptedAdvisories` |
| `scripts/check-lockfile-commit.mjs` | pre-commit 钩子，阻止非工作区包变更提交到 `package-lock.json` |
| `scripts/package-workspaces.mjs` | 递归发现 `packages/` 下含 `package.json` 的目录（跳过 `dist`、`node_modules`） |
| `scripts/sync-versions.js` | 配合 `version:patch/minor/major` 同步各 workspace 版本号 |
| `scripts/local-package-install.mjs` | 本地开发时把 workspace 包以 link 方式注入到被测试包中 |

## 3. 架构与约定

### 3.1 精确版本锁定（pinned deps）
`scripts/check-pinned-deps.mjs` 遍历仓库内所有 `package.json`，对 `dependencies`、`devDependencies`、`optionalDependencies` 三段进行检查：允许 `workspace:`、`file:`、`link:`、`portal:`、`git+`、`github:`、`git:`、`https?:`、`ssh:`、`git://` 等非 registry 来源，其余必须匹配正则 `^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$`（即严格语义化版本）。不满足则 `process.exit(1)`。该脚本通过 `npm run check:pinned-deps` 在 `prepublishOnly` 和 `check` 流程中被调用。

### 3.2 运行时依赖审计
`scripts/check-runtime-deps.mjs` 使用 `typescript/unstable/sync` API 解析每个公开包的 `tsconfig.build.json`（无此文件的回退到 `tsconfig.runtime-deps-fallback.json`，仅包含 `src/**/*`），AST 遍历 `import`/`export`/`require`/`require.resolve`，排除 `.`、`/`、`cloudflare:`、Node builtin 及包自身名后，要求所有第三方模块名出现在 `dependencies`/`optionalDependencies`/`peerDependencies` 中。失败输出具体文件行号并退出。

### 3.3 安全审计
`scripts/npm-audit.mjs` 执行 `npm audit --omit=dev --json`，阈值 `auditLevel = "moderate"`，将漏洞按 `id:name` 去重，仅在 `acceptedAdvisories` 白名单中且 package 名称匹配的条目被忽略；未接受的漏洞或不再匹配的白名单条目会打印警告/错误并退出。当前 `acceptedAdvisories` 为空对象，意味着任何 moderate 及以上漏洞都会阻断 CI。

### 3.4 安装器锁定包（install-lock）
`scripts/generate-coding-agent-install-lock.mjs` 从根 `package-lock.json`（要求 `lockfileVersion === 3`）出发，递归展开 `packages/coding-agent` 的依赖树，将内部包（`@earendil-works/pi-*`）替换为指向 npm registry tarball 的 `resolved` URL，外部包保留原始 lock 条目，最终产出 `packages/coding-agent/install-lock/package.json` 与 `package-lock.json`。校验规则包括：
- lockfileVersion 必须为 3
- 不允许 `link` 条目
- 不允许 `file:`/`link:`/`workspace:`/相对路径 的 `resolved`
- 不允许 `dev`/`devOptional`/`extraneous` 元数据
- 内部包版本必须等于 install-lock 根版本
- `hasInstallScript` 的包必须在 `allowedInstallScriptPackages` 白名单中（目前仅 `@google/genai@2.21.0` 与 `protobufjs@7.6.6`）
- 所有依赖的版本必须与 spec 精确匹配

该脚本支持 `--check` 模式，由 `npm run check:install-lock:coding-agent` 触发，确保生成的安装锁与源码同步。

### 3.5 Lockfile 提交门禁
`scripts/check-lockfile-commit.mjs` 作为 pre-commit 钩子（`.husky/pre-commit` 调用），当 `package-lock.json` 被暂存时，比较 HEAD 与暂存区的 `packages.*` 差异：如果变更只涉及 `packages/` 下的工作区包元数据，则放行；否则拒绝提交，除非设置环境变量 `PI_ALLOW_LOCKFILE_CHANGE=1|true|yes`。输出会列出新增/移除/变更的包及其版本。

### 3.6 版本同步与发布
根 `package.json` 提供 `version:patch/minor/major/set` 脚本，统一调用 `npm version ... --workspaces --no-workspaces-update`，随后执行 `scripts/sync-versions.js` 再 `npm install --package-lock-only --ignore-scripts`。`prepublishOnly` 先 clean + build + check，`publish` 再调用 `scripts/publish.mjs`。

### 3.7 依赖覆盖
根 `package.json` 使用 `overrides.protobufjs = "7.6.6"` 强制整个依赖树中的 protobufjs 版本一致，避免多版本冲突。

## 4. 约定与约束

- **所有直接 registry 依赖必须使用精确语义化版本**（由 `scripts/check-pinned-deps.mjs` 强制执行，`npm run check:pinned-deps` 是 `check` 流程的一部分）。
- **所有公开包的运行时 import 必须显式声明在 dependencies/optionalDependencies/peerDependencies 中**（由 `scripts/check-runtime-deps.mjs` 通过 TS AST 验证）。
- **`package-lock.json` 不得随意提交**：只有工作区包元数据变更可自动通过，其他变更需设置 `PI_ALLOW_LOCKFILE_CHANGE=1`（由 `scripts/check-lockfile-commit.mjs` 在 pre-commit 阶段拦截）。
- **安全审计阈值 ≥ moderate 即失败**，白名单项需在 `scripts/npm-audit.mjs` 中登记原因（由 `scripts/npm-audit.mjs` 强制执行）。
- **install-lock 必须与源码同步**：`packages/coding-agent/install-lock/package.json` 与 `package-lock.json` 由 `scripts/generate-coding-agent-install-lock.mjs` 生成，`--check` 模式下若不一致则失败（由 `npm run check:install-lock:coding-agent` 触发）。
- **所有 workspace 包必须声明 `engines`**（根与各子包均如此，便于安装期 Node 版本校验）。
- **安装器产物禁止包含本地 resolved 路径、link 条目、dev 元数据及未白名单的 install script**（由 `generate-coding-agent-install-lock.mjs` 的 `validateGeneratedFiles` 强制）。
- **私有注册表/认证**: 仓库未配置任何私有 registry 或 `.npmrc` 认证段，依赖全部来自 npm public registry。