# 仓库地图

只记录改这个项目必须理解的部分。不是全仓库导览。

## 包依赖图

```
schema ──┬──> ai ──┬──> agent ──┐
         │         │            ├──> coding-agent
         │         └──> telemetry│        ▲
         │                      │        │
         ├──> chord ──> durable ─┼──> env │
         │                      │        │
         └──> codemode ─────────┴────────┘
                     mcp ─────────────────┘
                     tui ─────────────────┘
                     (evals: private, 无依赖)
```

`coding-agent` 的直接依赖：`agent`、`ai`、`codemode`、`mcp`、`tui`。
它**不依赖** `chord`、`durable`、`env`、`p2`。

## 规模

| 包 | 文件 | 行数 | 说明 |
|---|---:|---:|---|
| `packages/chord` | 974 | 179,767 | 跨进程对象运行时，coding-agent 不用 |
| `apps/p2` | 700 | 141,113 | 应用，依赖全部包 |
| `packages/coding-agent` | 856 | 217,032 | CLI 产品层，实际核心约 36k |
| `packages/durable` | 275 | 100,948 | 持久化运行时，仅 env/p2 用 |
| `packages/ai` | 473 | 87,640 | 多 provider 层 |
| `packages/tui` | 126 | 45,305 | 终端渲染 |
| `packages/schema` | 260 | 41,904 | JSON Schema/TypeBox |
| `packages/env` | 46 | 11,006 | SSH 远程执行 daemon（Rust） |
| `packages/mcp` | 53 | 8,540 | MCP 客户端 |
| `packages/agent` | 21 | 8,445 | agent loop，手写核心约 2.5k |
| `packages/codemode` | 35 | 5,860 | 模型写 JS 调工具 |
| `packages/evals` | 31 | 3,732 | 评测夹具（private） |
| `packages/telemetry` | 20 | 3,460 | 遥测契约 |

合计 3,995 个跟踪文件，约 85 万行。

## 四条关键路径

### 1. Agent loop（先读这个）

| 文件 | 行数 | 作用 |
|---|---:|---|
| `packages/agent/src/agent-loop.ts` | 959 | 请求/turn/工具执行的完整状态机 |
| `packages/agent/src/agent.ts` | 623 | 有状态封装、队列、事件订阅 |
| `packages/agent/src/types.ts` | 551 | 事件与消息类型 |

要回答的问题：
- `prompt()` 到 `agent_end` 的状态转移；
- steering / follow-up 在哪里插入；
- parallel 工具 preflight 与 `turn_end` 的顺序保证。

### 2. 工具执行

`packages/coding-agent/src/core/tools/`：24 文件，4,838 行。
`beforeToolCall` / `afterToolCall` 在 `agent` 包的 loop 里，
工具实现和 schema 在 coding-agent。

改权限与 gate 时，入口在 `tool_call` 事件派发处，不在工具实现里。

### 3. 扩展系统

| 位置 | 规模 | 作用 |
|---|---|---|
| `packages/coding-agent/src/core/extensions/` | 9 文件 / 5,146 行 | 加载、事件分发、ExtensionAPI |
| `packages/coding-agent/src/extensions/` | 25 文件 / 7,471 行 | 内置扩展（codemode/llama/mcp/tool-search） |
| `packages/coding-agent/src/core/compaction/` | 4 文件 / 1,673 行 | 压缩 |

对外文档 `packages/coding-agent/docs/extensions.md` 3,367 行。
第一个月不要动这一层。

### 4. Provider / 流式

`packages/ai/src/api/` 14,015 行，`providers/` 3,997 行。
最深的坑，不重写，只读接口：
`streamSimple` / `streamFn`、`Model`、transcript 的 system message 投影。

## 建议阅读顺序

1. `packages/agent/src/types.ts`：先知道事件长什么样。
2. `packages/agent/src/agent-loop.ts`：只跟一条正常路径 + 一条工具路径。
3. `packages/coding-agent/src/core/tools/` 的入口文件。
4. `packages/coding-agent/src/core/extensions/` 的派发点。
5. `packages/ai/src/api/` 只读 `streamSimple` 的签名与调用点。

## 仍未确认的问题

- `telemetry` 被 `ai` 依赖到什么程度，能否内联后删除。
- `evals` 是否可直接改造成本项目的 benchmark harness。
- `check-entry-graphs.mjs` 里对其他包的预算约束，裁剪时需要同步修改。
