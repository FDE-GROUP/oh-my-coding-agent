---
kind: build_system
name: Pi Monorepo 构建与发布系统（npm workspaces + Bun 打包 + GitHub Actions + Nix）
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - scripts/release.mjs
    - scripts/package-workspaces.mjs
    - scripts/pack-packages.mjs
    - scripts/build-binaries.sh
    - flake.nix
    - nix/package.nix
    - .github/workflows/ci.yml
    - .github/workflows/publish-model-catalog.yml
    - test.sh
---

## 1. 总体方案

Pi monorepo 采用 **npm workspaces** 作为多包依赖与工作区管理，Node.js ≥22.19.0 为唯一运行时要求（`package.json#engines`）。构建、检查、测试、打包、发布均通过顶层 `package.json` 的 scripts 统一编排，具体逻辑下沉到 `scripts/*.mjs`。二进制产物使用 **Bun** 编译打包，Nix flake 提供跨平台可复现构建，GitHub Actions 承担 CI/CD。

## 2. 关键文件与职责

- `package.json`：工作区声明（`packages/*` 及若干 examples）、顶层脚本入口、`prepublishOnly` 钩子（clean → build → check）、版本升级脚本（`version:patch/minor/major/set`）。
- `scripts/release.mjs`：发布主流程——校验未提交变更 → 验证 npm 注册 → 锁定最新 model catalog 并执行 `build:offline` → bump 版本 → 更新各包 `CHANGELOG.md` 的 `[Unreleased]` 段 → 重新生成 artifacts → 运行 `npm run check` 与 `./test.sh` → `git commit/tag/push` → 追加新的 `[Unreleased]` 段。
- `scripts/package-workspaces.mjs`：递归扫描 `packages/` 下含 `package.json` 的目录（跳过 `dist`、`node_modules`），被 release 与 pack 脚本复用。
- `scripts/pack-packages.mjs` / `scripts/package-artifacts.mjs`：构建所有公开包并输出一致的 artifact set（含 manifest），供外部项目通过 `scripts/use-local-packages.mjs` 消费。
- `scripts/build-binaries.sh`：本地多平台打包脚本，镜像 `.github/workflows/build-binaries.yml`，支持 `--platform`、`--skip-install`、`--skip-build`、`--offline-model-data`；对每个目标调用 `bun build --compile` 将 `cli.js` 与 worker 脚本编译为独立可执行文件。
- `flake.nix` + `nix/package.nix`：定义 `aarch64-darwin / aarch64-linux / x86_64-darwin / x86_64-linux` 四架构，`x86_64-darwin` 单独 pin 到 `nixpkgs-26.05-darwin`（因 unstable 不再支持 Intel macOS），暴露 `pi` package 与 `pi` app。
- `.github/workflows/ci.yml`：PR/main/tag 触发，分 `build-check`、`test`（matrix: coding-agent/durable/other）、`mcp-conformance` 三个 job；Node 22 + `npm ci --ignore-scripts`。
- `.github/workflows/publish-model-catalog.yml`：定时（CET 工作日 10:17/12:17/14:17）或手动触发，生成 model catalog JSON → 校验兼容性 → 经 `environment: pi-model-upload` 写入 Cloudflare R2。
- `test.sh`：在隔离临时目录中设置干净环境变量（`HOME`、`TMPDIR`、`XDG_*`、`GIT_*`、`NPM_CONFIG_*`、`PI_NO_LOCAL_LLM=1`、`AWS_EC2_METADATA_DISABLED=true`），仅允许继承 PATH/PWD/GIT_ASKPASS 等必要变量，再执行 `npm test`。

## 3. 构建链与约定

### 3.1 依赖与工作区
- 使用 `npm` 作为包管理器（尽管 devDependencies 包含 `pnpm`，实际 CI 与脚本全部走 `npm`）。
- 工作区由根 `package.json#workspaces` 声明，`scripts/package-workspaces.mjs` 以文件系统方式发现包，避免硬编码包列表。
- 预发布钩子 `prepublishOnly` 强制 clean → build → check，确保发布的包是干净的构建产物。

### 3.2 构建顺序
顶层 `npm run build` 按依赖拓扑串行调用子包构建：`telemetry → schema → tui → codemode → mcp → ai → agent → coding-agent`。`build:offline` 仅在 `ai` 包上切换离线模式，其余相同。

### 3.3 代码质量检查
`npm run check` 串联多个检查：
- Biome 格式化（`scripts/biome-check.mjs --write`）
- 固定依赖检查（`check-pinned-deps.mjs`）
- 运行时依赖检查（`check-runtime-deps.mjs`）
- TS 相对导入检查（`check-ts-relative-imports.mjs`）
- 入口图检查（`check-entry-graphs.mjs`）
- Coding Agent install lock 校验（`generate-coding-agent-install-lock.mjs --check`）
- TypeScript 类型检查（`tsc --noEmit`，含 examples tsconfig）
- 浏览器 smoke 检查（`check-browser-smoke.mjs`）

### 3.4 测试
- `npm run test` = `test:scripts`（Node `--test` 运行 `scripts/*.test.mjs/ts`）+ 各 workspace 的 `test`。
- `test.sh` 提供全量隔离环境，CI 的 release 流程调用它；CI 的 `test` job 通过 matrix 拆分 suites，`other` 分支动态遍历 `packages/*/` 跳过 `coding-agent` 与 `durable`。
- MCP conformance 通过 `npm run test:mcp-conformance` 单独 job 运行。

### 3.5 版本策略
- 统一语义化版本，通过 `npm version <major|minor|patch>` 配合 `scripts/sync-versions.js` 同步工作区间依赖范围，再 `npm install --package-lock-only --ignore-scripts` 刷新 lockfile。
- `release.mjs` 会删除 `package-lock.json` 中指向旧工作区版本的 stale link entry，保证锁文件一致性。
- 每个包的 `CHANGELOG.md` 必须维护 `[Unreleased]` 段，release 时将其替换为 `## [vX.Y.Z] - YYYY-MM-DD`，并在末尾追加新的空 `[Unreleased]`。

### 3.6 二进制打包
- 使用 Bun 的 `--compile` 将 Node 代码编译为原生可执行文件，目标包括 `darwin-arm64`、`darwin-x64`（baseline）、`linux-x64`、`linux-arm64`、`windows-x64`、`windows-arm64`。
- 编译参数显式传入 `--no-compile-autoload-bunfig --no-compile-autoload-dotenv` 防止加载宿主项目的 bunfig/.env（见脚本注释 #7684、#10473）。
- 产物结构：每个平台目录内包含 `pi`(exe)、`package.json`、`README.md`、`CHANGELOG.md`、`photon_rs_bg.wasm`、`theme/`、`assets/`、`core/export-html/`、`docs/`、`examples/`，以及按平台复制的 native prebuilds。

### 3.7 Nix 构建
- `flake.nix` 暴露 `packages.default`、`packages.pi`、`apps.default`、`apps.pi` 与 overlay。
- `x86_64-darwin` 使用独立的 `nixpkgs-darwin-x64` 输入，其他架构用 `nixpkgs-unstable`。
- 发布流程中 `release.mjs` 会先 `updateModelCatalogPin` 锁定最新 catalog，然后 `hydrateModelCatalogBytes` + `npm run build:offline` 验证该 catalog 能成功构建，失败则回滚 `nix/model-catalog.json`。

## 4. CI/CD 流水线

- `ci.yml`：PR/main/tag 触发，job 间无共享状态；preview packages 仅对 main push 或同仓库 PR 产出，保留 3 天。
- `publish-model-catalog.yml`：workflow_run 监听 CI 成功结果，schedule 每小时候选（CET 工作日 10–15 点窗口，仅 10:17/12:17/14:17 放行），`workflow_dispatch` 需显式勾选 `publish=true`；R2 上传受 `environment: pi-model-upload` 保护。
- `build-binaries.yml`、`preview-packages.yml`、`pr-gate.yml`、`env.yml`、`env-daemons.yml`、`approve-contributor.yml`、`issue-analysis.yml`、`issue-gate.yml`、`issue-triage-labels.yml`、`nix.yml`、`npm-audit.yml`、`p2-cloud-bundle.yml`、`remove-inprogress-on-close.yml` 构成完整的辅助流水线矩阵。

## 5. 约束与规则（来源标注）

- **Node 版本**：`package.json#engines.node >=22.19.0`，CI 固定 `actions/setup-node@... node-version: 22`。
- **工作区发现**：`scripts/package-workspaces.mjs` 递归扫描 `packages/`，跳过 `dist` 与 `node_modules`，包名排序后返回。
- **发布前条件**：`scripts/release.mjs` 在修改任何文件前调用 `assertPackagesAreRegisteredWithNpm()`，若任一公开包在 npm 上 404 直接退出。
- **模型目录锁定**：release 流程无条件 pin 最新 catalog 并执行 `build:offline`，构建失败则恢复 `nix/model-catalog.json` 原内容，确保工作树干净。
- **Changelog 格式**：`scripts/release.mjs` 只识别 `## [Unreleased]` 标记，不存在该段的包会被跳过；发布后自动插入新 `[Unreleased]` 段。
- **测试隔离**：`test.sh` 使用 `env -i` 启动子进程，仅白名单继承环境变量，且 cleanup trap 拒绝删除非 `pi-test.*` 前缀目录。
- **Bun 编译安全**：`scripts/build-binaries.sh` 对 Windows 与非 Windows 分别调用 `bun build --compile`，禁用 bunfig/dotenv autoload，并显式传入 worker 脚本路径。
- **预览包生命周期**：`ci.yml` 中 preview packages 上传 artifact 设置 `retention-days: 3`。
- **Model Catalog 发布窗口**：`publish-model-catalog.yml` 通过 `TZ=Europe/Vienna` 计算 `local_day <= 5 && local_hour >= 10 && local_hour < 15`，schedule 触发还需 `(local_hour - 10) % 2 == 0`。