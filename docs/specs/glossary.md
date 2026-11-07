# 术语表（Glossary）

> 状态：**已确认** | 版本：0.1.1 | 日期：2026-11-07
> 归属：`docs/specs/` | 受众：**开发者 + AI + Agent**
> 新词先改本表，再回写引用处。一词一义；冲突在此锐化。

## 0. 定位

本表是 omfde 项目级术语 SSOT。词条来源限定为本仓已裁事实：`docs/specs/vision.md`（宪法与决策记录）、`docs/specs/workflow.md`、`AGENTS.md`、`docs/explains/`、已确认的 RAD 与已批准的 plan。参考 OdooThink `docs/specs/glossary.md` 的同构格式建立，但**不搬运其词条**——两仓治理模型（本仓无 ADR 编号体系）与产品域均不同。

本仓不设 ADR 编号；决策记录写入 vision 的「决策记录」节，实施级取舍留在 issue / PR / plan 中。本表引用决策时以 vision 决策记录条目标题为准。

## 1. 项目身份与目标线

| 词 | 含义 |
|----|------|
| **omfde / oh-my-fde** | 本仓：以 Pi 为底座的**企业内部 FDE 平台**，独立维护的 Pi fork。不是通用 SaaS、不是公开产品、不是上游 Pi 的镜像 |
| **FDE** | Forward Deployed Engineer，前置交付工程师。平台的最终服务对象；不是「全栈工程师」、不是外部顾问角色泛称 |
| **Pi** | Earendil 的编码 Agent 与 toolkit（`earendil-works/pi`）。本仓**底座**：核心代码已由本仓独立维护，不再同步上游（vision 决策「切断上游，转为独立维护」）。不是外部依赖、不是需要跟踪的生活分支 |
| **DSH** | DeepSeek Harness。平台化路径的**参考对象**：只借鉴接缝划分、session 不变量、多端交付、Web 布局骨架与 token 分层、测试纪律；不照搬其包数量、流程规模、契约节奏、样式实现约束（vision「与 DSH 的关系」）。不是替换目标、不是依赖 |
| **三条目标线** | 教程线（理解 → 会用 → 用好，文档主线）、平台化线（骨架 → 核心能力 → 协作 → 企业集成 → 治理，代码结构主线）、Web UI 线（可用 → 对齐 DSH → 会话完整 → 团队可用，独立应用主线，以 M1–M5 落地）。三线并行、互相供料、都不先搭空架子 |
| **教程线** | 以文档为主线的目标线；「会用」已完成，「用好」转入后台持续推进，**不再是门禁线**。不是代码工作线 |
| **平台化线** | 以代码结构为主线的目标线；当前阶段 = **核心能力**（进行中）。原「增强」不再是第四阶段，而是平台化线的总称 |
| **Web UI 线** | 以独立应用（`apps/fdecode`）为主线的目标线；M1–M5 已交付。不是平台化线的一步、不是 omfde 的子模块 |
| **四层平台** | 核心 agent / 工作方式 / 团队协作 / 企业集成与治理。近期平台化线本体只做前两层；后两层已由 Web UI 线（M3–M5）先行供料，本体待固化 |
| **当前阶段** | 平台化线「核心能力」层。进入增强由**真实缺口触发**，不由计划表触发；每项具体能力仍须走 vision → RAD → plan → 验证 |
| **缺口触发** | 平台化能力的立项依据：教程线/真实使用暴露的可固化缺口（如缺预建代码图谱）。不是「为了改而改」、不是主动规划放行 |
| **首批用户** | 以 Abel 为首的团队，规模 3~5 人。平台化能力以该团队的维护能力为上限；不是大型组织、不按平台团队规模铺开 |
| **vision 宪法地位** | `docs/specs/vision.md` 是项目宪法：代码、文档、开发决策不能越过其目标、边界和阶段；冲突时先商议修改 vision 并写入决策记录，再实施。不是实施计划、不是事后说明；代码不能反向定义 vision |
| **决策记录** | vision 内的追加式条目（日期 + 原因 + 影响）。本仓**不用 ADR 编号体系**（workflow 第 13 节）；被取代条目以「> 已由…取代」注记保留 |
| **当前边界** | vision 的「做 / 不做」对照表。边界内的实现细节不需要改 vision；扩边界必须先修宪 |

## 2. 治理与协作

| 词 | 含义 |
|----|------|
| **决策者** | 最终裁决权角色（当前 = Abel）。发起新需求、确认 RAD、裁定 spike、批准 plan、指定 write scope、授权合并与 pages 发布（workflow 第 12 节） |
| **任务分级** | A 机械（typo/格式/无行为变化，直接改→验证→提交）、B 常规（功能/文档/扩展/行为变更，走完整闸链）、C 决策（架构/流程/边界/依赖，先讨论→修 vision 或记录决定→转 B） |
| **停-问** | 撞到 vision、RAD 或 plan 边界即停：给选项与带理由推荐，等决策者裁定；不静默选、不猜。「不确定就记录为开放问题」 |
| **授权包络** | 已批准 plan 圈定的实现范围。包络内实现选择由 AI 决定；出圈即停-问 |
| **Issue 闸** | GitHub Issues 是任务、bug、阶段目标的**统一视图**，不是新需求起点；新需求由决策者先发起讨论再补 issue。A 类机械修复可例外不建 issue，但影响共享文档、行为或多人协作时仍建 |
| **Scope 闸** | 每个任务开始前必须有明确的 write scope；无 scope = 未就绪，不得开始。A 类可用会话任务作声明 |
| **write scope** | 决策者为任务指定的允许写入的文件/目录集合。Agent 只能写 scope 内；需扩大时停下申请，不自行越界 |
| **read-only scope** | 任务指定为只读的区域；可以读，不得写 |
| **共享文件（单写者）** | package manifests、lockfiles、`tsconfig.json`、`AGENTS.md`、`docs/specs/`、根 README、生成文件。默认单写者、串行修改；提交须格外核对 |
| **Vision 闸** | 每个 RAD、plan、实现前检查：是否属当前目标线和阶段、是否触碰当前边界、是否偏离 3~5 人约束 |
| **RAD** | 需求分析文档（`docs/rads/<slug>.md`，模板 `TEMPLATE.md`）。决策者确认后 = spike/plan 的**制定依据**，不是编码依据；用户故事随确认冻结 |
| **Spike 闸（必经）** | RAD 确认后、plan 起草前的必经环节：Agent 提 spike 清单或「无需 spike」的结论及理由，决策者裁定。没有「跳过 spike 直接写 plan」的路径 |
| **Spike** | 预研报告（`docs/spikes/<slug>.md`）。**证据与输入，不是编码依据**；spike 验证代码不进 `main`，除非决策者明确要求保留 |
| **Plan** | 实施方案（`docs/plans/<slug>.md`）。**唯一编码依据**；批准 = 授权包络。实现和验收只对照已批准 plan，RAD/spike 只作溯源 |
| **Plan 闸** | 非平凡 B/C 任务必须有成文 plan 并经决策者批准；批准记录写入 plan |
| **实证关闭** | 关闭 issue、宣布验证通过须附命令、输出和环境；不能只说「通过」，禁只凭推理关闭 |
| **权威层级** | vision → RAD → plan → spike → 代码与文档；`AGENTS.md` 的执行纪律始终适用。产品事实冲突按此裁决 |
| **main-only** | 所有工作只在 `main`：不建功能分支、不在其他分支的 worktree 工作。多 Agent 冲突靠 write scope 隔离，不靠分支；范围重叠时串行或重划 scope |
| **内部不开 PR** | `main` 是唯一开发分支。PR 只有两种情况：外部贡献者从自己 fork 提交、决策者特批的内部例外（源分支不得建在 canonical repo）。内部例外合并后删源分支 |
| **squash merge** | 唯一的合并方式，保持 `main` 线性；只有决策者或获明确授权的 Agent 可合并；作者不自并除非明确授权；不 force push |
| **pages 发布分支** | `pages` 是文档站发布分支，publish-only：未经授权不切换、不 checkout、不提交、不 push、不合并；授权发布用独立 clone/worktree，不动共享 `main` worktree；两分支互不合并 |
| **共享 worktree 串行** | 所有 Agent 共享同一 `main` worktree。`git switch` / `checkout <branch>` / `rebase` / `reset` / `stash` / 分支删除须决策者协调并确保无其他 Agent 运行；`git commit` / `git push` 是短临界区，一次一个 Agent |
| **本地门禁** | 所有质量闸只在本地执行：pre-commit 查 staged 文件，pre-push 跑完整 `pnpm run check`。不依赖 GitHub Actions 或任何远程 CI；推送前本地必须通过 |
| **fork 基点标签** | `pi-fork-base-20d86c365`（原始 fork 基点）与 `omfde-cutover`（切断上游、转独立维护）。历史比较用这两个标签；`upstream` remote 已删除，不重新添加、不恢复自动 rebase |
| **裁剪子系统** | 已删除的四个上游子系统：`apps/p2`、`packages/env`、`packages/durable`、`packages/chord`（依据包依赖图，coding-agent 不依赖它们）。git 历史可找回；不是删功能 |
| **保留 9 包** | `agent`、`ai`、`coding-agent`、`codemode`、`evals`、`mcp`、`schema`、`telemetry`、`tui`。新增 workspace 包或改包图须先在 vision 记录决定 |

## 3. 工程与工具

| 词 | 含义 |
|----|------|
| **pnpm** | 本仓**唯一包管理器**（vision 决策「包管理器迁移到 pnpm」），版本由 `packageManager: pnpm@11.15.1` 钉死。`pnpm-lock.yaml` + `pnpm-workspace.yaml` 是依赖与 workspace 的 SSOT |
| **锁文件门禁** | pre-commit 阻止 `pnpm-lock.yaml` 提交，除非 `PI_ALLOW_LOCKFILE_CHANGE=1`。依赖与锁文件变更按已评审代码对待；直接依赖（含内部 workspace 依赖）钉精确版本 |
| **--ignore-scripts** | 安装纪律：hydrate 用 `pnpm install --ignore-scripts`，干净安装加 `--frozen-lockfile`；不跑 lifecycle 脚本除非用户要求。已知副作用：husky 钩子可能未激活（见 explains/00-baseline） |
| **check** | `pnpm run check`：只读、全量本地质量门禁（lint、格式、TSDoc、secrets 等），代码改动后必跑；**不跑测试**。修掉全部 errors/warnings/infos 再提交。不是 `check:fix`，不用它做类型检查以外的验证 |
| **check:fix** | 自动修复入口：写文件，仅限格式与安全 lint 修复；用后必须核对 diff 在 write scope 内 |
| **check:tsdoc** | 平台导出 TSDoc 门禁，已含在 `check` 中；规范正本 `docs/specs/tsdoc-comment-standards.md`，适用面 `apps/*/src` 与 `extensions/*/src` |
| **check:secrets** | 密钥扫描，已含在 `check` 中，也可单独跑。不提交 `.env`、`~/.pi/agent/auth.json` 或任何 API key |
| **test.sh** | 非 e2e 测试入口：只跑 `packages/*`。**不直接跑全量 vitest**（env 变量存在时会激活 e2e）；`pnpm test` 除非用户要求不跑 |
| **faux provider** | 测试专用假 provider：不用真实 API、密钥或付费 token。`packages/coding-agent/test/suite/` 用 `test/suite/harness.ts` + faux provider；TUI 冒烟可用 DeepSeek 小 prompt，保持便宜确定 |
| **DeepSeek 测试模型** | 测试 LLM 默认 DeepSeek；凭据在 `~/.pi/agent/auth.json`，默认模型在 `~/.pi/agent/settings.json`，均不提交。`.env.example` 只是模板：Pi 不加载 `.env`，`ODOOTHINK_*` 变量不被识别 |
| **baseline** | `docs/explains/00-baseline.md`：已知环境性失败的台账。失败如实记录在此或 issue，**不用 skip、放宽断言或删除测试掩盖** |
| **TSDoc** | 平台 TypeScript 注释规范（中文 summary + 块标签）；`apps/*/src` 与 `extensions/*/src` 的导出必写 |
| **平台目录三分** | `apps/` = 可运行应用，`extensions/` = 平台扩展，`packages/` = Pi fork 与共享库。Pi 包留在 `packages/` 不移动 |
| **apps/omfde** | 平台第一入口（当前是 Pi 的薄启动器）：默认以 `OMFDE_PLATFORM=1` 启动已构建的 Web UI，`--tui` 直接启动 Pi TUI。不是完整平台实现；其最终分工是 vision 未决问题 |
| **extensions/omfde-core** | 第一个平台扩展骨架。「分工/落点不明时优先扩展与配置，改核心须先证明缺口」的落点示例 |
| **apps/docs-site** | 统一文档站（`@omfde/docs-site`，private）：Blume（Astro + Vite）纯静态站，构建时只读汇聚 `docs/**` 与 `.qoder/repowiki/**`，发布到 `pages` 分支替换 docsify。人与 coding agent 双读；不开 server 端能力 |
| **agent 表面（文档站）** | 文档站面向 coding agent 的输出：llms.txt、每页 `.md` 镜像、JSON docs API，随静态构建生成。不是 MCP server、不是 Ask AI |
| **Repo Wiki** | `.qoder/repowiki/`：机器生成并纳入 Git 跟踪的仓库知识文档；自动更新已由用户关闭，重生成须走显式任务 |
| **中文译本同步** | `README.zh-CN.md`、`AGENTS.zh-CN.md`、`CONTRIBUTING.zh-CN.md` 与英文源保持同步；英文源为正本 |
| **提交消息格式** | `{feat,fix,docs}[(repo|ai|tui|agent|coding-agent)]: <summary>`；正文 `refs #N`，关闭用 `fixes #N` / `closes #N`（多 issue 逐个重复关键字）。无 emoji |
| **models.generated.ts** | `packages/ai/src/models.generated.ts`：生成文件，只能改 `packages/ai/catalog/` 定义再重生成，不直接编辑。`src/providers/data/` 是 gitignore 产物：不 stage、不查 git 历史 |
| **erasable TS** | 根 config 检查面（`packages/*/src`、`packages/*/test` 等）只允许可擦除 TypeScript 语法（Node strip-only）：无 parameter properties、`enum`、`namespace`、`import =` 等需 JS emit 的构造 |

## 4. Web UI（fdecode）域

| 词 | 含义 |
|----|------|
| **fdecode / FDE Code** | Web UI 线的独立应用：`apps/fdecode`，包名 `@omfde/fdecode`。原名 pi-web，2026-11-07 更名（vision 决策「Web UI 应用更名为 fdecode / FDE Code」）。不是 Pi 官方 Web 客户端、不是 omfde 子模块 |
| **组合式接入** | omfde 消费 fdecode 的方式：`apps/omfde` 默认启动**已构建**的 Web UI 服务，经 `FDECODE_CONFIG`、`FDECODE_CWD` 与端口共享配置；`apps/fdecode` 保持独立目录与独立启动，**不合并代码**。是否代码级并入是 vision 未决问题 |
| **FDECODE_\*** | fdecode 的统一环境变量前缀；配置与数据目录 `~/.fdecode`。旧 `PI_WEB_*` 不再读取，启动时提示；启动自动迁移 `~/.pi-web` 及其 sidecar |
| **fdecode.db** | `~/.fdecode/fdecode.db`：Node 内置 `node:sqlite` 的元数据库（会话归属、链接、分享、审计，由 JSON 文件迁入）。配置仍在 `config.json`。未来平台数据用独立 `~/.omfde/omfde.db`，经 API 共享，**不共享表** |
| **M1–M5** | Web UI 线里程碑：M1 可用界面 + DSH 对齐起步、M2 会话完整、M3 团队可用（LAN 绑定 + 令牌认证 + 工作区）、M4 协作与交接（归属、分享、管理员/成员两级角色、审计）、M5 企业集成（GitHub、CI、通知、保留策略）。M4/M5 向平台化线协作层/企业集成供料 |
| **访问令牌** | fdecode M3 起的登录凭据；非回环监听必须启用认证。不做 SSO/LDAP/OAuth、不做 RBAC 细粒度权限 |
| **两级角色** | fdecode M3/M4 的管理员/成员角色模型。不是多租户、不是组织架构 |
| **工作区（fdecode）** | fdecode M3 的会话工作区选择。不是 OdooThink 的「工作台项目」、不是平台化线协作层的「项目」概念（后者待固化） |
| **三栏 AppFrame** | Web UI 布局骨架：左侧栏（会话/工作区）、中间会话、右侧可停靠面板；窄屏抽屉。对齐 DSH 布局，不是自创视觉语言 |
| **--dsw-\* token** | Web UI 的语义 token 前缀：静态色阶 → 语义别名 → 组件变量分层；映射为 Tailwind theme/工具类，功能组件只消费语义 token 对应工具类，不写字面色值、不写主题分支 |
| **前端技术栈** | 应用型界面（FDE Code UI、平台控制台）= React + TanStack Start + Tailwind CSS + Vite；内容型站点（文档、官网）= React + Astro + Tailwind CSS + Vite。分界按交互形态不按项目大小；具体版本在 plan 中锁定。不是每应用自选框架 |
| **本地优先** | fdecode 默认只监听回环地址；M3 起支持 3~5 人团队共用（可选 LAN 绑定）。不做云端 IDE、不替代完整文件树与编辑器 |

## 5. Pi 运行时（底座术语）

以下词条以 `docs/explains/`（尤其 17-system-overview）的已验证认识为准；在平台文档与对话中使用统一口径。

| 词 | 含义 |
|----|------|
| **分层 harness** | Pi 的结构口径：稳定内核 = transcript + agent loop + 工具管线；产品层 = 模式；能力层 = 扩展、包、MCP、codemode；边缘层 = provider 适配器、终端、平台差异 |
| **transcript** | 会话的**唯一事实源**：追加写的 JSONL 树，entry 带 `id`/`parentId`；分支 = 移动 leaf，历史不修改不删除。不是内存数组、不是可直接编辑的文件 |
| **projection** | 从 transcript **重建**模型上下文的投影。请求上下文不直接复用内存数组；「任何状态都应能落到 entry 里」 |
| **prompt 增量流** | system message 协议：首条 = 基础 prompt + 初始工具；之后 `content` 追加、`sections` 按名替换、`toolsAdded`/`toolsRemoved` 改工具；重放得到当前 prompt。改 prompt 是追加差异不是重建字符串（缓存友好前提） |
| **compaction** | 上下文压缩**检查点**，不是删除；`systemMessage` 快照保证压缩后 prompt 不丢。`context_edit` 是追加式 amend，原始记录保留 |
| **工具管线** | 所有工具调用（模型直接调用、codemode 嵌套、MCP、扩展注册）走同一条：prepare → validate → beforeToolCall → execute → afterToolCall → result。嵌套调用带 `parentToolCallId`，返回 `{ block: true }` 可阻止执行 |
| **tool_call 接缝** | 权限、审计、门禁这类需求的**第一选择切口**（扩展的 `tool_call`/`tool_result` 钩子自动覆盖所有工具入口）；不是改内核。注意它是策略层不是沙箱，路径无限制 |
| **事件流 UI 契约** | `AgentSession` 发事件，`interactive`/`rpc`/`json`/`print` 只是不同消费者；Agent 不知道 UI 存在。模式 = 产品层的运行形态（TUI / RPC / JSON / print） |
| **六层钩子** | 扩展可介入的层面：启动/信任、请求、工具、回合/收尾、UI（`ctx.ui`、renderers、widgets、commands）等。最常用三缝：`tool_call`、`before_agent_start`、`agent_before_settle` |
| **扩展（extension）** | 不改内核完成拦截、改写、工具编排的机制；平台能力（权限/审计/门禁）的首选落点。扩展事件面（30+）相对易变，避免深度耦合；优先依赖「数据格式 + 窄接口」 |
| **codemode** | QuickJS 沙箱内的模型代码执行（`packages/codemode`）；其嵌套工具调用仍走统一工具管线 |
| **MCP** | Model Context Protocol 客户端实现（`packages/mcp`）；MCP 工具同样走统一工具管线。默认懒加载，只等 direct 工具 |
| **provider 边缘** | provider 差异只存在于 `api/*.ts` 适配层：缓存、伪装 headers、strict 降级、错误映射，经 `model.compat` 暴露能力标志；核心只认 `AssistantMessageEventStream` |
| **steering / follow-up** | 流式进行中的追加输入队列（fdecode M2 已接入同名能力）；不是新会话、不是中止 |
| **会话文件** | `~/.pi/agent/sessions/--<cwd>--/<id>.jsonl`。**唯一需要备份的东西**；其余（settings、auth、models 缓存）都是可重建的配置或缓存 |
| **项目信任** | 启动路径上的 `project_trust` 决策点：决定当前 cwd 加载哪些项目级配置与扩展。不是权限沙箱 |

## 6. 协议与观测

| 词 | 含义 |
|----|------|
| **JSONL** | JSON Lines：一行一条完整 JSON 对象、以 LF（`\n`）结尾的文本格式。本仓承载两类数据：RPC 协议记录（stdin/stdout）与 transcript 会话文件（追加写，每条一个 entry）。解析只按 LF 分行——Node `readline` 会在 JSON 字符串内合法的 U+2028/U+2029 上误分行，不能用于协议解析 |
| **RPC（pi）** | Pi 的 `--mode rpc` 模式：pi 作为常驻子进程，宿主经 stdin/stdout 管道用 JSONL 记录通信；命令/响应按 `id` 关联，会话事件流式推送，`prompt` 成功响应只表示已受理（完成看 `agent_settled`）。"remote" 实为"另一个进程"，不涉及网络。fdecode 每会话一个 pi RPC 子进程，对 Pi 的依赖收敛为该协议 + 会话 JSONL（窄耦合面实例）。正本 `packages/coding-agent/docs/rpc.md`；架构角色见 `docs/explains/29-pi-cli.md` |
| **SSE** | Server-Sent Events：HTTP 长连接上服务端单向推送事件流的标准协议（`text/event-stream`）。fdecode 用它把 pi 子进程 stdout 的 RPC 事件转发给浏览器（流式文本、thinking、工具卡片）；重连以快照整体替换，不做增量补齐；反向代理需关闭缓冲（服务端已发送 `X-Accel-Buffering: no`） |
| **观测面** | agent-visibility 需求（`docs/rads/agent-visibility.md`，已确认）交付的能力面：上下文解剖、装配视图、机制时间线、治理审计。核心侧为只读观测 RPC 命令族 + `tool_governance` 事件（vision 决策「agent 观测面走核心只读命令族 + 治理留痕事件」），视图在 fdecode。给人的 UI，不注入模型上下文、不产生 provider 费用 |

## 演变记录

| 日期 | 版本 | 变更原因 | 内容修订 |
|------|------|----------|----------|
| 2026-11-07 | 0.1.0 | 决策者指令：参考 OdooThink glossary 建立本仓术语表 | 首版：项目身份与目标线、治理与协作、工程与工具、Web UI（fdecode）域、Pi 运行时五节建档；词条取自 vision/workflow/AGENTS/explains/fdecode RAD 系列的已裁事实 |
| 2026-11-07 | 0.1.1 | pi CLI / RPC 讨论与 agent-visibility 需求立项，补协议与观测术语（合并另一会话同日起草的独立 glossary 草稿，其内容收编为本节） | 新增「协议与观测」一节：JSONL、RPC（pi）、SSE、观测面四词 |
