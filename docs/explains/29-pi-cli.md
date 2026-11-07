# pi CLI:在本项目中的作用与技术关键

本项目有两个 CLI:`pi`(底座 CLI,`packages/coding-agent`,bin 指向 `dist/bundle/cli.js`)和 `omfde`(平台启动器,`apps/omfde/bin/omfde.mjs`)。本文回答 pi CLI 在 omfde 平台里承担什么角色、哪些技术细节是平台工作的地基。事实来自源码与 `03`、`08`、`13`、`17` 篇笔记;末节"装配点"是开放问题记录,不是设计提案。

## 1. 一句话

包(packages/*)只是库。平台里一切"跑 agent"的地方,跑的都是 `pi` 这个可执行文件——CLI 是 Pi 在运行期的唯一存在形态。

## 2. 五个作用

| 作用 | 说明 | 落点 |
|---|---|---|
| 可执行交付单元 | 平台三种入口最终都执行 `pi` 二进制 | `omfde --tui` spawn `node_modules/.bin/pi`;fdecode 每会话 spawn `pi --mode rpc`(`FDECODE_PI_BIN` 或 PATH) |
| 模式分岔点 | 同一二进制,`--mode rpc/json`、`--print`、默认 interactive | `main.ts` 的 `resolveAppMode()` |
| 扩展与资源装载入口 | settings、扩展、skills、工具、MCP 在 CLI 启动链里装配进进程;平台能力从这里进入 | `createAgentSessionServices()` 的 ResourceLoader;`.pi/`、`~/.pi/agent/`、npm/git 包 |
| 人的界面 | TUI interactive 模式是单兵 FDE 工作、教程线"用好"的发生地 | `modes/interactive/`(约 7k 行,三种模式中最大) |
| 配置与状态宿主 | 认证、设置、会话文件 | `~/.pi/agent/`(auth.json、settings.json、sessions/) |

## 3. 技术关键

### 3.1 CLI 是装配程序,不只是参数解析

启动链(见 `08-boot-and-session.md`、`17-system-overview.md`):

```
cli.ts → setupCli() + main()
  → 3 个 SettingsManager(bootstrap/startup/runtime)
  → 会话选择(new/continue/resume/fork)
  → 项目信任
  → createAgentSessionServices():ModelRuntime + SettingsManager + ResourceLoader
  → createAgentSession():Agent + AgentSession(六层钩子)
```

对平台的含义:**一个会话拥有什么能力,完全由这条链读到的配置决定**。fdecode spawn `pi` 时传的参数、workspace `.pi/`、`~/.pi/agent/` 三处合并的结果,就是该会话的能力集。平台"装配能力"不是写代码,是决定这些配置由谁提供。

### 3.2 一个 runtime,四种消费者

三种模式共享同一个 `AgentSessionRuntime`,差异只在如何消费事件流(不变量四,见 `13-modes.md`):

| | print | rpc | interactive |
|---|---|---|---|
| 输入 | argv / stdin | JSONL stdin | 编辑器 |
| 输出 | 最终文本 / JSON 事件 | JSON 响应 + 事件 | TUI 组件 |
| 扩展 UI | 无 | `extension_ui_request/response` 记录 | 原生命令 |
| 生命周期 | 单次 | 常驻 | 常驻 |

两个易漏的点:

- **扩展 UI 是模式相关的**。同一个 `ExtensionUIContext`,在 TUI 是原生命令,在 RPC 变成请求/响应记录(客户端必须应答,挂在 `pendingExtensionRequests`),在 print/json 是空实现。平台扩展若用到对话框,在 Web 端要靠 fdecode 实现 extension UI 协议才有交互;只注册工具与渲染器的扩展(如 code-graph 的形态)不受影响。
- **RPC 的 `prompt` 响应在 preflight 成功后才发**,排队也算成功;`/new`、`/resume`、`/fork`、`/switch` 后会重绑 session 并重新订阅。

### 3.3 进程生命周期与信号语义

- print:单次运行,错误/中止退出码 1;信号第一次 dispose、第二次强杀。
- rpc:常驻;stdin EOF → 有序关闭;每个响应写出后等待 stdout 背压。
- interactive:关闭顺序有讲究——先停 TUI 再 dispose,避免扩展清理时重绘终端。

平台的进程监督(fdecode 的空闲回收、并发上限、意外退出处理)建立在这些语义上。宿主必须持续读 stdout,否则背压会拖住 pi。

### 3.4 资源发现与懒加载

扩展/工具/skills 从 `.pi/`(项目)、`~/.pi/agent/`(全局)、npm/git 包三处发现;MCP runtime、codemode sandbox、模型目录、工具实现全部按需加载。interactive 模式**先 mount TUI 再初始化扩展**,保证 `session_start` 里的扩展对话框有 UI 可用。

### 3.5 三条消费路径与"哪个 pi 在跑"

| 入口 | 实际执行 | 形态 |
|---|---|---|
| `pnpm run tui` | `pi-test.sh` | 从源码跑 |
| `omfde --tui` | 仓库 `node_modules/.bin/pi` | workspace 链接的构建产物 |
| fdecode | `FDECODE_PI_BIN` 或 PATH 中的 `pi` | 默认取 PATH,**不一定是仓库这份** |

部署上的关键:systemd/fdecode 环境里 PATH 的 `pi` 与仓库构建产物可能版本不一致;transcript 格式与 RPC 协议都依赖两侧匹配。目前靠文档约定,没有版本握手机制。

## 4. omfde 启动器

`apps/omfde/bin/omfde.mjs` 是纯进程编排:默认启动 fdecode 服务(注入 `OMFDE_PLATFORM=1`、`FDECODE_CWD`),`--tui` 回退 spawn pi;自己不 import Pi,也不 import Web UI 服务端。它被有意保持为薄启动器(源码注释明说);是否升级为"默认配置 + 扩展编排"的装配点,是 vision 未决问题。

## 5. 开放问题:装配点

平台能力(code-graph 及后续扩展)要到达所有会话,实质是"往 pi 启动链的配置合并里提供内容"。三个候选:

1. `apps/omfde` 编排(平台拥有默认值);
2. workspace `.pi/` 约定(仓库即配置,团队共享靠 git);
3. fdecode 启动子进程时注入。

在 pi 眼里三者技术等价,差别在治理:谁拥有默认值、团队怎么共享、版本怎么对齐。该问题同时是 code-graph RAD(`docs/rads/code-graph.md` §5"由平台经扩展加载器装配")落地前必须回答的前提,已列入 vision 未决问题(apps/omfde 的分工)。

## 参考

- `docs/explains/08-boot-and-session.md` — 启动装配线
- `docs/explains/13-modes.md` — 三种模式与事件消费
- `docs/explains/17-system-overview.md` — 系统总览与不变量
- `packages/coding-agent/docs/rpc.md` — RPC 协议权威说明
- `docs/specs/glossary.md` — RPC、JSONL、SSE 术语定义
- `docs/rads/code-graph.md` — 触发装配点问题的第一个平台能力需求
