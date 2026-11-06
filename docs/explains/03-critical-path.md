# 关键路径与接缝

基于 `main` 分支的实际代码（原 `omca`），行号对应上游 `20d86c365` 加本地三次裁剪提交。
目的：为“在 `tool_call` 层加写路径白名单”找到最小改动面。

## 1. 一次 prompt 的完整调用链

```
AgentSession.prompt()
  → Agent.prompt()
  → agentLoop()                       packages/agent/src/agent-loop.ts:47
  → runAgentLoop()                    :111
  → runLoop()                         :172
      ├─ prepareNextTurn()            :195
      ├─ prepareRequest()             :228
      ├─ streamAssistantResponse()    :390
      │     → config.convertToLlm()
      │     → streamFn(model, context)   // packages/ai
      │     → emit message_start/update/end
      ├─ executeToolCalls()           :518
      └─ finishTurn()                 :295
```

外层 `while` 处理 follow-up，内层处理 turn / tool / steering。`finishTurn`
返回 `{action:"end"}` 会直接结束，`continue` 保证再发一次请求。

## 2. 工具执行链（最重要的接缝）

```
executeToolCalls()                    agent-loop.ts:518
  ├─ sequential?  executeToolCallsSequential()   :540
  └─ parallel?    executeToolCallsParallel()     :596
        └─ prepareToolCall()                      :718
             1. tools.find(name)
             2. prepareToolCallArguments()
             3. validateToolArguments()
             4. config.beforeToolCall(...)   ← 权限/gate 在这里
             5. { block: true } → 错误结果，不执行
        └─ executePreparedToolCall()              :831
             → tool.execute()
        └─ finalizeExecutedToolCall()             :869
             → config.afterToolCall(...)     ← 结果改写在这里
        └─ emit tool_execution_end
        └─ createToolResultMessage() + message_start/end
```

三个关键事实：

1. **`beforeToolCall` 在参数校验之后运行**，拿到的是已经过 schema 的
   `args`，不是原始字符串。
2. **并行模式只是“预检串行、执行并发”**。所有 `beforeToolCall` 都在执行前
   按顺序跑完，所以 gate 不需要考虑并发竞态。
3. **嵌套工具调用走同一个入口**：`runToolCall()`（:821）复用了
   `prepareToolCall`，因此 codemode / MCP 里发起的调用也会经过
   `tool_call` 钩子。这一点在 `extensions/mcp/index.ts:20` 和
   `extensions/codemode/tool.ts:9` 的注释里也明确写了。

## 3. coding-agent 如何接上这个钩子

```
AgentSession._installAgentToolHooks()      core/agent-session.ts:688
  this.agent.beforeToolCall = _beforeToolCall
  this.agent.afterToolCall  = _afterToolCall

_beforeToolCall()                          :694
  → ExtensionRunner.emitToolCall()         core/extensions/runner.ts:1256
      for 每个扩展的 tool_call handler（按加载/注册顺序）
        → handler(event, ctx)
        → 第一个返回 { block: true } 的立即胜出
```

- `_beforeToolCall` 在没有 `tool_call` 处理器时直接返回 `undefined`，零开销。
- handler 抛错时，`prepareToolCall` 的 try/catch 会把它变成错误工具结果，
  也就是**抛错等价于阻断**。
- 嵌套调用通过 `_executeNestedToolCall()`（:766）传入 `parentToolCallId`。

## 4. turn / settle 边界

```
finishTurn 钩子                            agent-session.ts:922
  → _dispatchTurnEndBoundary()             :882
      → emitBoundary("turn_end")           runner.ts:1043

settle 循环                                agent-session.ts:1951
  → _runBeforeSettleBoundary()             :2062
      → emitBoundary("agent_before_settle")
      → result.continue → 再跑一轮
```

这就是未来 `converge` 的挂载点：在 `agent_before_settle` 里跑验证器，
不通过就 `continue`。`agent-session.ts:2063` 同样在没有处理器时零开销。

## 5. 工具与配置的组装

```
AgentSession._buildRuntime()               agent-session.ts:3736
  → createAllToolDefinitions(cwd)          core/tools/index.ts:182
  → new ExtensionRunner(...)
  → _refreshToolRegistry(...)
默认激活工具：read / bash / edit / write   :3782
```

配置文件位置：

| 范围 | 路径 |
|---|---|
| 用户 | `~/.pi/agent/settings.json` |
| 项目 | `<cwd>/.pi/settings.json` |
| 目录名来源 | `package.json` 的 `pi.configDir`，默认 `.pi` |

## 6. 对第一个功能的结论

**写路径白名单应该做成扩展，不改内核。** 理由：

- `tool_call` 已经提供了 `toolName` + 校验后的 `input` + `{block}` 返回；
- 扩展出错会被转换成阻断结果，失败关闭（fail closed）；
- 嵌套调用自动覆盖，不需要额外接线；
- 不注册处理器时零成本，符合渐进增强。

### 但 `bash` 不能靠字符串匹配来“保证”写路径

`bash` 的输入是任意 shell 命令。以下都能绕过基于命令文本的路径检查：

```
echo x > /etc/passwd
python -c "open('/etc/passwd','w').write('x')"
tee /etc/passwd <<< x
sed -i 's/a/b/' /etc/passwd
cd /etc && echo x > passwd
```

所以权限设计必须分两级：

| 工具 | 可用的强制手段 | 级别 |
|---|---|---|
| `write` / `edit` | 解析 `input.path`，与白名单比对 | `block` 可靠 |
| `bash` | 只能做前缀/关键词检查，可被绕过 | 只能 `advise` |
| `bash` 真要强制 | OS 级沙箱（容器、只读挂载、用户隔离） | 内核外 |

这条约束会决定架构：**不要把“安全”寄托在 `tool_call` 上。**
`tool_call` 是策略层，真正的边界必须是进程/文件系统层。

### `advise` 的语义需要先定义

`tool_call` 里没有“警告但不阻断、且让模型看见”的返回形式：

- 返回 `{block:false}` 等于没发生；
- 返回 `{block:true}` 就是阻断；
- `ctx.ui.notify()` 只有用户看得见，模型看不见。

所以“advise”只能定义为以下之一，必须先选：

1. **面向用户**：UI 提示 + 审计日志，模型无感。实现最简单。
2. **面向模型**：在 `tool_result` 里追加一条警告文本，事后可见。
3. **面向模型且事前**：在 `before_agent_start` 注入策略说明，靠模型自觉。

我建议 1 + 2 组合：事前只审计，事后把违规写进工具结果。这样不会产生
“看起来拦住了其实没有”的假安全感。

## 7. 仍未确认

- `settings-schema.ts` 是否支持任意扩展配置，还是需要改 schema 才能加 pack 配置。
- `resource-loader.ts` 的扩展发现顺序，决定多个 gate 的优先级。
- `ExtensionRunner` 的 `emitToolCall` 没有 try/catch，依赖调用方捕获；
  如果要做审计日志，必须保证日志失败不阻断工具执行。
