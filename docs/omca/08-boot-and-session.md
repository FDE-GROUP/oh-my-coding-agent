# 启动装配线与 Session 生命周期

这一篇回答：从执行 `pi` 到第一次请求发出，系统经历了什么。

## 1. 入口

```
dist/bundle/cli.js
  → src/cli.ts
      setupCli()
      main(process.argv.slice(2))
```

`main()` 在 `src/main.ts`（1,058 行）。它同时承担：

- 子命令分发（auth / config / package / mcp）
- 参数解析
- 会话选择
- 运行时装配
- 模式分发（rpc / interactive / print）

## 2. 启动顺序

```
1. 读 --offline / PI_OFFLINE
2. runAuthCommand()          → 是 auth 子命令就结束
3. 处理 package / config / mcp 子命令
4. parseArgs()
5. 处理 --version / --export
6. 决定 appMode：rpc | json | print | interactive
7. runMigrations()
8. SettingsManager.create()  × 3 次（见下）
9. 选择 SessionManager：new / continue / resume / fork / --session
10. 决定最终 cwd（会话可能来自另一个项目）
11. 建立 ProjectTrustStore
12. createAgentSessionRuntime(createRuntime, ...)
13. 按 appMode 进入 InteractiveMode / runRpcMode / runPrintMode
```

## 3. 为什么有三个 SettingsManager

| 实例 | 信任状态 | 用途 |
|---|---|---|
| `bootstrapSettingsManager` | 不信任项目 | 读取全局代理等启动配置 |
| `startupSettingsManager` | 默认 | 首选项、主题、会话目录、信任默认值 |
| `runtimeSettingsManager` | 解析后的信任状态 | 真正绑定到 cwd 的运行时服务 |

原因：`--session` / `--resume` 可能选中另一个项目的会话。在目标 cwd 确定之前，
不能加载该项目的设置、扩展和资源。

## 4. 项目信任流程

```
hasTrustRequiringProjectResources(cwd)?
  ├─ 否 → 直接 trusted
  └─ 是 → 先以 projectTrusted=false 创建服务
            → resourceLoader.reload({ resolveProjectTrust })
                → loadProjectTrustExtensions()   // 只加载全局/CLI
                → resolveProjectTrusted(...)     // 询问/记忆/覆盖
                → setProjectTrusted(结果)
            → 正式 reload，加载项目扩展
```

信任决定按 cwd 缓存在 `projectTrustByCwd`，`/new`、`/resume` 换到新目录时会重新解析。

## 5. Runtime Factory 与会话替换

`createAgentSessionRuntime(createRuntime, ...)` 返回 `AgentSessionRuntime`，
它持有：

- 当前 `AgentSession`
- 当前 `AgentSessionServices`（cwd 绑定）
- 创建下一个 runtime 的工厂

`/new`、`/resume`、`/fork`、`/import` 都走同一条路径：

```
emitBeforeSwitch / emitBeforeFork   // 扩展可取消
teardownCurrent()
  → session.abort()                 // 先把进行中的回合落盘
  → emit session_shutdown
  → beforeSessionInvalidate()
  → session.dispose()
createRuntime(...)                  // 新 cwd / 新 session
finishSessionReplacement()
  → rebindSession()
  → withSession(ctx)
```

## 6. Services 的职责

`createAgentSessionServices()`（233 行）创建三样东西：

| 服务 | 职责 |
|---|---|
| `ModelRuntime` | provider 注册、认证、模型目录、streamSimple |
| `SettingsManager` | 全局/项目设置合并 |
| `ResourceLoader` | 扩展、skills、prompts、themes、AGENTS.md、system prompt |

顺序很重要：先 `resourceLoader.reload()`，再处理扩展注册的 provider / MCP /
virtual model，最后 `modelRuntime.refresh({ allowNetwork: false })`。

## 7. createAgentSession：真正组装 Agent

`core/sdk.ts:191`：

```
1. 决定 model
   CLI → 会话恢复 → settings 默认 → provider 默认
2. 决定 thinkingLevel
   会话恢复 → per-model → 全局默认 → 按模型能力 clamp
3. 决定工具装载
   defaultTools / +name / -name / tools / excludeTools / noTools
4. 构造 convertToLlm 包装
   blockImages 开启时，把 image 替换成文本占位
5. 构造 CacheWarmer
6. 构造 Agent
   initialState: { systemPrompt: "", model, thinkingLevel, tools: [], messages: 已有上下文 }
7. 安装 streamFn
8. 安装 onPayload / onResponse / onProviderStreamEvent
9. 新会话写入 model_change + thinking_level_change
10. new AgentSession({ agent, sessionManager, ... })
```

### streamFn 的调用栈

```
Agent loop
  → streamFn(model, context, options)
      → buildRequestOptions()
          timeout / websocket timeout / retries / identity / headers
      → cacheWarmer.start(...)       // 只对当前 session id
      → modelRuntime.streamSimple(...)
          → buildBaseOptions()       // maxTokens 按上下文窗口裁剪
          → provider.streamSimple()
```

### 扩展在请求层的挂载点

| 扩展事件 | 挂载位置 |
|---|---|
| `context` | Agent 的 `transformContext` |
| `before_provider_request` | Agent 的 `onPayload` |
| `after_provider_response` | `onResponse` |
| `provider_stream_event` | `onProviderStreamEvent` |
| `before_provider_headers` | `buildRequestOptions().transformHeaders` |
| `cache_warming_decision` | CacheWarmer 回调 |

## 8. AgentSession 构造函数安装的六层钩子

`agent-session.ts:518`：

```
agent.subscribe(_handleAgentEvent)        // 持久化 + 重试 + 队列
_installAgentToolHooks()                  // before/afterToolCall → 扩展
_installAgentNextTurnRefresh()            // 每轮前重建上下文 + 压缩
_installAgentRequestProjection()          // 请求前用 session projection 覆盖 messages
_installAgentBoundaryHooks()              // finishTurn → turn_end 边界
_installHiddenDeclarationsProjection()    // 隐藏工具声明
_installAgentForcedPromptProjection()     // 强制 system prompt
_buildRuntime()                           // 构造工具 + ExtensionRunner
```

## 9. _handleAgentEvent：事件如何变成状态

`agent-session.ts:1139`：

```
agent_start
  → 如果启动期间请求过 abort，这里终止

message_start (user)
  → 从 steering / followUp 队列移除对应文本
  → 规范化排队图片

任意事件
  → 先发给扩展，再发给公共监听器

message_end
  → custom          → appendCustomMessageEntry()
  → system/user/assistant/toolResult → appendMessage()
  → assistant       → 记录 lastAssistant、重置重试计数

turn_end
  → flushPendingCustomMessages()
```

重试判断在 `agent_end`：`_willRetryAfterAgentEnd()` 检查最后一条 assistant
是否为可重试错误，并且未超过 `maxRetries`。

## 10. prompt() 的处理管线

`agent-session.ts:2137`：

```
prompt(text)
  ├─ 以 "/" 开头 → 尝试扩展命令，命中则直接执行并返回
  ├─ 压缩进行中 → 拒绝
  ├─ _preparePrompt()
  │    ├─ input 扩展钩子（可拦截/改写）
  │    ├─ /skill:name 展开
  │    ├─ /template 展开
  │    ├─ 正在流式 → 按 steer / followUp 入队
  │    ├─ 无模型 → 报错
  │    └─ 无认证 → 报错
  └─ _startRun(trigger)
```

`_startRun` 之后才进入 agent loop。`before_agent_start` 在 run 开始时触发。

## 11. 模式分发

| appMode | 条件 | 入口 |
|---|---|---|
| `rpc` | `--mode rpc` | `runRpcMode(runtime)` |
| `json` | `--mode json` | `runPrintMode(runtime, { mode: "json" })` |
| `print` | `--print` 或 stdin/stdout 非 TTY | `runPrintMode(runtime, { mode: "text" })` |
| `interactive` | 默认 | `new InteractiveMode(runtime, ...)` |

非交互模式会 `takeOverStdout()`，退出时 `restoreStdout()`。

## 12. 一条完整的时间线

```
pi
 → cli.ts
 → main()
 → bootstrap settings → session 选择 → trust → createRuntime
     → runtime settings → services（model/settings/resources）
     → createAgentSession
         → model / thinking / tools
         → new Agent()
         → new AgentSession()
             → 六层钩子
             → _buildRuntime()（工具 + ExtensionRunner）
 → InteractiveMode / RPC / Print
 → 用户输入
 → AgentSession.prompt()
 → _preparePrompt() → _startRun()
 → agent.prompt() → agentLoop()
     → before_agent_start
     → streamAssistantResponse() → streamFn → ModelRuntime → provider
     → 工具执行（beforeToolCall → execute → afterToolCall）
     → finishTurn → turn_end 边界
 → agent_end → 重试/压缩检查 → agent_before_settle → agent_settled
```

## 13. 读到这里可以确认的事实

- 启动路径只有一个：所有模式共享同一个 `AgentSessionRuntime`。
- 会话替换是“销毁旧 runtime、重建新 runtime”，不是原地切换。
- 扩展在启动、请求、工具、turn、settle 五个层面都有挂载点。
- 持久化只发生在 `_handleAgentEvent` 的 `message_end`，其余状态由 SessionManager
  的 append 方法负责。
- 压缩、重试、队列都在 `AgentSession` 层，不在 agent-core。
