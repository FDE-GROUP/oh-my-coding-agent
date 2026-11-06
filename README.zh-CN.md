[English](README.md) | 简体中文

<p align="center">
  <a href="https://pi.dev">
    <img alt="pi logo" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://www.npmjs.com/package/@earendil-works/pi-coding-agent"><img alt="npm" src="https://img.shields.io/npm/v/@earendil-works/pi-coding-agent?style=flat-square" /></a>
</p>

> 新贡献者提交的 issue 和 PR 默认会被自动关闭。维护者每天会审查被自动关闭的 issue。参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

# Pi

Pi 是一个最小化、可扩展的 agent harness，你可以把它改造成自己的工具。

让 Pi 适应你的工作流，而不是反过来。你可以用[扩展](packages/coding-agent/docs/extensions.md)、[技能](packages/coding-agent/docs/skills.md)、[提示模板](packages/coding-agent/docs/prompt-templates.md)和[主题](packages/coding-agent/docs/themes.md)来定制 Pi。把它们打包成 [Pi 包](packages/coding-agent/docs/packages.md)，通过 npm 或 git 分享。

Pi 自带强大的默认配置，但刻意跳过了 sub-agents 和 plan mode 这类功能。需要什么就让 Pi 自己构建，或者安装一个符合你习惯的包。

你可以[以交互方式](packages/coding-agent/docs/usage.md)使用 Pi，在 [print 或 JSON 模式](packages/coding-agent/docs/cli.md)下自动化，通过 [RPC](packages/coding-agent/docs/rpc.md) 控制它，或者用 [Pi TypeScript SDK](packages/coding-agent/docs/sdk.md) 构建应用。真实集成案例见 [OpenClaw](https://github.com/OpenClaw/OpenClaw)。

> **译注**：本文件根据仓库根目录的 `README.md` 翻译。本仓库是独立维护的 Pi fork，已删除 `upstream` remote；上游 README 中的 `packages/chord`、`packages/durable` 和 `apps/p2` 已被移除。下文的包列表按当前仓库实际内容调整，其余章节保持原意。fork 与切断记录见 [`docs/explains/26-fork-and-prune.md`](docs/explains/26-fork-and-prune.md)。

## 本仓库结构

| 目录 | 内容 |
|---|---|
| `packages/` | Pi 和共享库 |
| `apps/` | 平台应用，当前为 `apps/omfde` |
| `extensions/` | 平台扩展，当前为 `extensions/omfde-core` |

启动平台入口：

```bash
pnpm run omfde
```

## 快速开始

安装命令行工具：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

Windows：

```shell
powershell -c "irm https://pi.dev/install.ps1 | iex"
```

安装器会锁定所有依赖，并通过 `pi update` 更新 Pi。也可以直接用 npm 安装，但 npm 不会锁定传递依赖：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Pi 需要 Node.js 22.19 或更高版本。macOS、Linux 和 Windows 安装器会在需要时安装 Node.js。正常通过 npm 安装时，不需要运行依赖项的生命周期脚本。

在你希望 Pi 工作的目录中启动它：

```bash
cd /path/to/project
pi
```

要使用内置的 AI provider，在 Pi 中运行 `/login`，连接订阅或 API key。然后给 Pi 一个任务。

完整安装和使用说明见[文档](https://pi.dev/docs/latest)，演示见 [pi.dev](https://pi.dev)。

## 包

这个 monorepo 包含 Pi CLI 及其支撑库。

| 包 | 说明 |
|---------|-------------|
| **[@earendil-works/pi-agent-core](packages/agent)** | 带工具调用和状态管理的 agent 运行时 |
| **[@earendil-works/pi-ai](packages/ai)** | 统一的多 provider LLM API（OpenAI、Anthropic、Google 等） |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | 交互式 coding agent CLI |
| **[@earendil-works/pi-codemode](packages/codemode)** | 沙箱化 JavaScript 执行，唯一能力是调用注入的工具 |
| **[@earendil-works/pi-evals](packages/evals)** | 评测 harness |
| **[@earendil-works/pi-mcp](packages/mcp)** | 独立的 Model Context Protocol 客户端 |
| **[@earendil-works/pi-schema](packages/schema)** | 不使用 eval 的 JSON Schema 校验：支持 2020-12 和 7，编译为普通闭包 |
| **[@earendil-works/pi-telemetry](packages/telemetry)** | 厂商中立的遥测契约、参考适配器、一致性测试和类型化 schema |
| **[@earendil-works/pi-tui](packages/tui)** | 带差分渲染的终端 UI 库 |

Slack/聊天自动化和工作流见 [earendil-works/pi-chat](https://github.com/earendil-works/pi-chat)。

## 权限与容器化

Pi 不包含用于限制文件系统、进程、网络或凭据访问的内置权限系统。默认情况下，它以启动它的用户和进程的权限运行。

如果需要更强的边界，请容器化或沙箱化 Pi。三种模式见 [packages/coding-agent/docs/containerization.md](packages/coding-agent/docs/containerization.md)：

- **Gondolin 扩展**：`pi` 和 provider 认证留在宿主机，内置工具和 `!` 命令被路由到本地 Linux micro-VM。
- **普通 Docker**：把整个 `pi` 进程放进本地容器，获得简单隔离。
- **OpenShell**：把整个 `pi` 进程放进受策略控制的沙箱。

## 贡献

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)，项目规则（同时面向人和 agent）见 [AGENTS.md](AGENTS.md)。Pi 的长期计划也可以在 [RFC](https://rfc.earendil.com/keyword/pi/) 中找到。

## 开发

本仓库使用 pnpm 作为包管理器。

```bash
pnpm install --ignore-scripts  # 安装所有依赖，但不运行生命周期脚本
pnpm run build         # 刷新模型数据，然后构建所有包
pnpm run build:offline # 使用已有模型数据重新构建，不访问网络
pnpm run check         # Lint、格式化和类型检查
./test.sh            # 运行测试（没有 API key 时跳过依赖 LLM 的测试）
./pi-test.sh         # 从源码运行 pi（可以在任意目录运行）
```

### 在 monorepo 外使用本地包

把所有公开包构建成一套相互匹配的本地产物：

```bash
pnpm run pack:packages -- --out .artifacts/pi-packages
```

这一步会在构建 `pi-ai` 之前刷新模型数据。如果模型数据已经 hydrate，可以传入
`--offline-model-data` 以避免访问网络。

然后配置一个外部项目，让它使用其中一个包，并从同一套产物中解析所有 Pi 依赖。
默认使用 npm：

```bash
node scripts/use-local-packages.mjs \
  --manifest .artifacts/pi-packages/manifest.json \
  --consumer ../my-project \
  --package @earendil-works/pi-coding-agent \
  --package @earendil-works/pi-agent-core
cd ../my-project
npm install --ignore-scripts
```

如果项目使用 pnpm，把 `--consumer` 指向 workspace 根目录：

```bash
node scripts/use-local-packages.mjs \
  --manifest .artifacts/pi-packages/manifest.json \
  --consumer ../my-project \
  --package @earendil-works/pi-agent-core \
  --package-manager pnpm
cd ../my-project
pnpm install --ignore-scripts
```

每个直接依赖都要重复一次 `--package`。该命令会把 consumer 的 `package.json`
更新为带内容寻址的本地 `file:` 引用。对于 npm，它会把传递依赖的 overrides
写入 `package.json`；对于 pnpm，则写入 `pnpm-workspace.yaml`。安装或更新 consumer
期间要保持产物目录可用。修改 Pi 源码后，需要重新运行这两条命令。

## 从发布源码构建独立二进制

GitHub release 包含一个带版本号的源码归档，并由该 release 的 `SHA256SUMS`
文件校验。解压后运行与官方独立二进制相同的构建脚本：

```bash
VERSION="<release-version>"
tar -xzf "pi-${VERSION}-source.tar.gz"
cd "pi-${VERSION}"
./scripts/build-binaries.sh --offline-model-data --platform linux-x64 --out "$PWD/out"
```

归档中包含发布时的模型数据和原生预构建产物。`--offline-model-data` 会直接使用
这些模型数据，不刷新 provider 目录。脚本会安装依赖，并连同运行时资源一起构建
可执行文件；如果依赖已经准备好，可以传入 `--skip-install`。

## 供应链加固

我们把 pnpm 依赖变更当作需要审查的代码变更。

- 直接外部依赖固定为精确版本。内部 workspace 包仍使用版本范围。
- `.npmrc` 设置 `save-exact=true`；依赖变更必须审查 lockfile。
- `pnpm-lock.yaml` 是依赖的唯一事实来源。除非设置 `PI_ALLOW_LOCKFILE_CHANGE=1`，否则 pre-commit 会阻止意外提交 lockfile。
- `pnpm run check` 会校验固定版本的直接依赖、TypeScript import 兼容性、secret、TSDoc 和入口图。
- 本 fork 不发布版本；`install-lock` 和发布脚本是上游遗留路径，当前不使用。
- 本 fork 的质量门禁只在本地执行，不使用远程 CI。

## 分享你的 OSS coding agent 会话

如果你用 Pi 或其他 coding agent 做开源工作，请分享你的会话。

公开的 OSS 会话数据能帮助改进 coding agent，让它们面对真实任务、工具使用、失败和修复，而不是玩具 benchmark。

完整说明见 [这篇 X 帖子](https://x.com/badlogicgames/status/2037811643774652911)。

要发布会话，使用 [`badlogic/pi-share-hf`](https://github.com/badlogic/pi-share-hf)。安装步骤见它的 README.md。你只需要一个 Hugging Face 账号、Hugging Face CLI 和 `pi-share-hf`。

也可以看[这个视频](https://x.com/badlogicgames/status/2041151967695634619)，我在里面演示了如何发布自己的 `pi-mono` 会话。

我会定期在这里发布自己的 `pi-mono` 工作会话：

- [Hugging Face 上的 badlogicgames/pi-mono](https://huggingface.co/datasets/badlogicgames/pi-mono)

## 许可证

MIT

<p align="center">
  <a href="https://pi.dev">pi.dev</a> 域名由
  <br /><br />
  <a href="https://exe.dev"><img src="packages/coding-agent/docs/images/exy.png" alt="Exy mascot" width="48" /><br />exe.dev</a> 慷慨捐赠
</p>
