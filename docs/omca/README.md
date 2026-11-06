# omca 代码阅读笔记

这些文档是阅读 `earendil-works/pi` 的产物，不是设计提案。
目标是把系统理解清楚，而不是决定改什么。

**如果只读一篇，读 `17-system-overview.md`。** 它把其余笔记串成一条完整的系统叙事。

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
| `17-system-overview.md` | **总览：不变量、完整路径、状态地图、设计张力** |
| `18-mcp-package.md` | JSON-RPC、stdio/HTTP 传输、客户端会话、OAuth |
| `19-schema.md` | JSON Schema 编译、校验、coercion、类型推导 |
| `20-tui-editor-markdown.md` | 编辑器状态机、粘贴标记、撤销/kill ring、Markdown 流式渲染 |

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
| ~~`extensions/mcp` + `codemode`~~ | ~~13,331 行~~ | 已读整合层，见 `14-mcp-codemode.md` |
| ~~`packages/mcp`~~ | ~~4,742 行~~ | 已读核心，见 `18-mcp-package.md`；OAuth 细节未读 |
| `core/cache-warmer.ts` | 未统计 | 中：成本控制 |
| ~~`packages/ai/src/api/*`~~ | ~~14,015 行~~ | 已读契约与 Anthropic 示例，见 `16-provider-adapters.md`；其余 provider 未读 |
| ~~`packages/tui`~~ | ~~源码约 20k 行~~ | 已读架构与 editor/markdown，见 `15-tui.md`、`20-tui-editor-markdown.md`；latex/autocomplete 细节未读 |
| ~~`packages/schema`~~ | ~~源码约 4,850 行~~ | 已读核心，见 `19-schema.md`；formats/annotations 细节未读 |
| `packages/evals` | 3,732 行 | 低：评测夹具 |

## 建议的继续阅读顺序

1. 其余 provider：OpenAI Responses、Google、Bedrock 的差异。
2. `core/cache-warmer.ts`：缓存预热策略。
3. `packages/evals`：评测夹具如何组织。
4. `latex.ts` 与 `autocomplete.ts` 的实现细节。

## 阅读方法

- 从调用方倒推，不从目录正推。
- 先读接口和状态机，再读实现细节。
- 每个子系统只回答三个问题：输入是什么、状态存在哪、失败怎么处理。
