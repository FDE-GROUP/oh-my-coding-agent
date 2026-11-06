# omca 代码阅读笔记

这些文档是阅读 `earendil-works/pi` 的产物，不是设计提案。
目标是把系统理解清楚，而不是决定改什么。

## 文档索引

| 文档 | 内容 |
|---|---|
| `00-baseline.md` | 环境、构建、测试基线、已知环境问题 |
| `01-repo-map.md` | 包依赖图、规模、四条关键路径、阅读顺序 |
| `02-prune-plan.md` | 裁剪执行记录（已完成的仓库缩减） |
| `03-critical-path.md` | agent loop 与工具执行的完整调用链 |
| `04-session-transcript.md` | JSONL 会话格式、树结构、投影、压缩语义 |
| `05-provider-stream.md` | Context/TranscriptContext、prompt 增量流、缓存 |
| `06-extension-loading.md` | 扩展发现、加载、Handler 顺序、API 能力面 |
| `07-package-manager.md` | npm/git/本地来源、过滤语义、优先级、autoload |
| `08-boot-and-session.md` | 从 CLI 到第一次请求的装配线与 Session 生命周期 |
| `09-system-prompt.md` | 分节 prompt、AGENTS.md、skills、prompt templates |
| `10-compaction.md` | 触发条件、切点、摘要、溢出恢复、分支摘要 |
| `11-model-runtime.md` | provider 组合、auth.json、虚拟模型、模型解析 |
| `12-tools.md` | read/write/edit/bash/grep/find/ls、路径、截断、输出累积 |
| `13-modes.md` | print / RPC / interactive 如何消费事件流 |
| `14-mcp-codemode.md` | 工具暴露、MCP 连接与 OAuth、QuickJS 沙箱、tool_search |
| `15-tui.md` | 组件模型、差分渲染、布局、overlay、终端抽象 |
| `16-provider-adapters.md` | Provider 契约、消息可移植层、Anthropic 适配器 |

## 已覆盖的调用链

```
CLI → main() → runtime factory → services → createAgentSession
    → Agent → AgentSession → 六层钩子
    → prompt() → agentLoop() → streamAssistantResponse() → provider
    → 工具执行 → finishTurn → turn_end → agent_end → settle
```

## 尚未细读

| 子系统 | 规模 | 重要性 |
|---|---|---|
| ~~`core/compaction/`~~ | ~~1,104 行~~ | 已读，见 `10-compaction.md` |
| ~~`core/model-runtime.ts` + auth~~ | ~~~1,100 行 + 认证~~ | 已读，见 `11-model-runtime.md` |
| ~~`core/system-prompt.ts` + skills/prompts~~ | ~~228 行 + loaders~~ | 已读，见 `09-system-prompt.md` |
| ~~`core/tools/` 实现~~ | ~~4,838 行~~ | 已读，见 `12-tools.md` |
| ~~`modes/`~~ | ~~24,612 行~~ | 已读结构与事件面，见 `13-modes.md` |
| ~~`extensions/mcp` + `codemode`~~ | ~~13,331 行~~ | 已读整合层，见 `14-mcp-codemode.md`；底层 `packages/mcp` 未读 |
| `core/cache-warmer.ts` | 未统计 | 中：成本控制 |
| ~~`packages/ai/src/api/*`~~ | ~~14,015 行~~ | 已读契约与 Anthropic 示例，见 `16-provider-adapters.md`；其余 provider 未读 |
| ~~`packages/tui`~~ | ~~源码约 20k 行~~ | 已读架构，见 `15-tui.md`；细节未读 |
| `packages/schema` | 41,904 行 | 低：JSON Schema |

## 建议的继续阅读顺序

1. `system-prompt.ts` + skills/prompts loader：模型实际收到的指令是怎么拼的。
2. `compaction/compaction.ts`：压缩触发、摘要、保留边界。
3. `model-runtime.ts` + `auth-storage.ts`：认证、provider 注册、stream 路由。
4. `core/tools/`：每个工具的行为、路径解析、输出截断。
5. `modes/`：交互模式如何消费 AgentSession 事件。
6. `extensions/mcp` + `codemode`：工具如何被包装和嵌套调用。

## 阅读方法

- 从调用方倒推，不从目录正推。
- 先读接口和状态机，再读实现细节。
- 每个子系统只回答三个问题：输入是什么、状态存在哪、失败怎么处理。
