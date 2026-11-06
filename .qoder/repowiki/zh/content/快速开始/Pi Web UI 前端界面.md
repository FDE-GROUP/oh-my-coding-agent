# Pi Web UI 前端界面

<cite>
**本文引用的文件**
- [apps/pi-web/package.json](file://apps/pi-web/package.json)
- [apps/pi-web/server.mjs](file://apps/pi-web/server.mjs)
- [apps/pi-web/src/router.tsx](file://apps/pi-web/src/router.tsx)
- [apps/pi-web/src/routes/__root.tsx](file://apps/pi-web/src/routes/__root.tsx)
- [apps/pi-web/src/routes/index.tsx](file://apps/pi-web/src/routes/index.tsx)
- [apps/pi-web/src/routes/session.$sessionId.tsx](file://apps/pi-web/src/routes/session.$sessionId.tsx)
- [apps/pi-web/src/components/layout/AppFrame.tsx](file://apps/pi-web/src/components/layout/AppFrame.tsx)
- [apps/pi-web/src/components/layout/Sidebar.tsx](file://apps/pi-web/src/components/layout/Sidebar.tsx)
- [apps/pi-web/src/components/layout/RightPanel.tsx](file://apps/pi-web/src/components/layout/RightPanel.tsx)
- [apps/pi-web/src/components/layout/ThemeControl.tsx](file://apps/pi-web/src/components/layout/ThemeControl.tsx)
- [apps/pi-web/src/components/conversation/Conversation.tsx](file://apps/pi-web/src/components/conversation/Conversation.tsx)
- [apps/pi-web/src/components/conversation/MessageList.tsx](file://apps/pi-web/src/components/conversation/MessageList.tsx)
- [apps/pi-web/src/components/conversation/SessionBar.tsx](file://apps/pi-web/src/components/conversation/SessionBar.tsx)
- [apps/pi-web/src/components/tools/ToolCard.tsx](file://apps/pi-web/src/components/tools/ToolCard.tsx)
- [apps/pi-web/src/lib/api.ts](file://apps/pi-web/src/lib/api.ts)
- [apps/pi-web/src/lib/theme.ts](file://apps/pi-web/src/lib/theme.ts)
- [apps/pi-web/src/lib/viewport.ts](file://apps/pi-web/src/lib/viewport.ts)
- [apps/pi-web/src/styles/app.css](file://apps/pi-web/src/styles/app.css)
- [apps/pi-web/src/server/health.ts](file://apps/pi-web/src/server/health.ts)
- [apps/pi-web/src/server/sessions.ts](file://apps/pi-web/src/server/sessions.ts)
- [apps/pi-web/src/routes/api/sessions.ts](file://apps/pi-web/src/routes/api/sessions.ts)
- [apps/pi-web/src/routes/api/sessions.$sessionId.ts](file://apps/pi-web/src/routes/api/sessions.$sessionId.ts)
- [apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts](file://apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts)
- [apps/pi-web/src/routes/api/sessions.$sessionId.events.ts](file://apps/pi-web/src/routes/api/sessions.$sessionId.events.ts)
- [apps/pi-web/src/server/runtime-manager.ts](file://apps/pi-web/src/server/runtime-manager.ts)
- [apps/pi-web/src/server/runtime.ts](file://apps/pi-web/src/server/runtime.ts)
</cite>

## 更新摘要
**变更内容**
- 新增完整的服务器实现 server.mjs，包含安全头部和主机验证
- 增强会话管理功能，支持会话列表、恢复和重命名
- 添加完整的对话组件系统，包括消息列表、工具卡片和会话栏
- 实现REST API路由和SSE事件流用于实时通信
- 完善主题控制组件和UI交互
- 增加安全加固措施，包括CSP、X-Frame-Options等

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能与可维护性](#性能与可维护性)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)

## 简介
Pi Web 是 Pi 的完整Web前端界面，基于 React、TanStack Router 与 Vite 构建，提供会话式交互的现代化Web UI。当前版本实现了：
- 完整的服务器实现与安全加固
- 会话管理与REST API接口
- 实时事件流通信（SSE）
- 完整的对话界面与工具调用展示
- 主题系统与响应式布局
- 健康检查与服务端函数

该文档从代码层面梳理前端界面与后端运行时的协作方式，帮助读者快速理解整体架构、关键数据流与扩展点。

## 项目结构
Pi Web 采用按功能域组织的目录结构：
- routes：页面路由与接口路由
- components：UI组件（布局、对话、原语、工具）
- lib：通用逻辑（API客户端、对话状态、主题、视口）
- server：服务端能力（健康检查、JSONL分帧、运行时与运行时管理器、会话管理）
- styles：样式入口与Token映射

```mermaid
graph TB
subgraph "应用入口"
Pkg["package.json"]
Server["server.mjs"]
Router["router.tsx"]
Root["routes/__root.tsx"]
end
subgraph "页面与接口"
Index["routes/index.tsx"]
SessionPage["routes/session.$sessionId.tsx"]
ApiSessions["routes/api/sessions.ts"]
ApiSessionId["routes/api/sessions.$sessionId.ts"]
ApiCommands["routes/api/sessions.$sessionId.commands.ts"]
ApiEvents["routes/api/sessions.$sessionId.events.ts"]
end
subgraph "UI 组件"
AppFrame["components/layout/AppFrame.tsx"]
Sidebar["components/layout/Sidebar.tsx"]
RightPanel["components/layout/RightPanel.tsx"]
ThemeControl["components/layout/ThemeControl.tsx"]
Conversation["components/conversation/Conversation.tsx"]
MessageList["components/conversation/MessageList.tsx"]
SessionBar["components/conversation/SessionBar.tsx"]
ToolCard["components/tools/ToolCard.tsx"]
end
subgraph "服务层"
Health["server/health.ts"]
Sessions["server/sessions.ts"]
RuntimeMgr["server/runtime-manager.ts"]
Runtime["server/runtime.ts"]
end
subgraph "样式与工具"
Theme["lib/theme.ts"]
Viewport["lib/viewport.ts"]
Api["lib/api.ts"]
Styles["styles/app.css"]
end
Pkg --> Server
Server --> Router
Router --> Root
Root --> Index
Index --> AppFrame
SessionPage --> AppFrame
AppFrame --> Sidebar
AppFrame --> RightPanel
AppFrame --> ThemeControl
AppFrame --> Conversation
Conversation --> MessageList
Conversation --> SessionBar
MessageList --> ToolCard
Index --> Health
ApiSessions --> RuntimeMgr
ApiSessionId --> RuntimeMgr
ApiCommands --> RuntimeMgr
ApiEvents --> RuntimeMgr
RuntimeMgr --> Runtime
AppFrame --> Viewport
Root --> Theme
Root --> Styles
```

**图示来源**
- [apps/pi-web/package.json:1-41](file://apps/pi-web/package.json#L1-L41)
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)
- [apps/pi-web/src/router.tsx:1-18](file://apps/pi-web/src/router.tsx#L1-L18)
- [apps/pi-web/src/routes/__root.tsx:1-32](file://apps/pi-web/src/routes/__root.tsx#L1-L32)
- [apps/pi-web/src/routes/index.tsx:1-14](file://apps/pi-web/src/routes/index.tsx#L1-L14)
- [apps/pi-web/src/routes/session.$sessionId.tsx:1-20](file://apps/pi-web/src/routes/session.$sessionId.tsx#L1-L20)
- [apps/pi-web/src/components/layout/AppFrame.tsx:1-62](file://apps/pi-web/src/components/layout/AppFrame.tsx#L1-L62)
- [apps/pi-web/src/components/layout/Sidebar.tsx:1-77](file://apps/pi-web/src/components/layout/Sidebar.tsx#L1-L77)
- [apps/pi-web/src/components/layout/RightPanel.tsx:1-10](file://apps/pi-web/src/components/layout/RightPanel.tsx#L1-L10)
- [apps/pi-web/src/components/layout/ThemeControl.tsx:1-71](file://apps/pi-web/src/components/layout/ThemeControl.tsx#L1-L71)
- [apps/pi-web/src/components/conversation/Conversation.tsx:1-274](file://apps/pi-web/src/components/conversation/Conversation.tsx#L1-L274)
- [apps/pi-web/src/components/conversation/MessageList.tsx:1-232](file://apps/pi-web/src/components/conversation/MessageList.tsx#L1-L232)
- [apps/pi-web/src/components/conversation/SessionBar.tsx:1-68](file://apps/pi-web/src/components/conversation/SessionBar.tsx#L1-L68)
- [apps/pi-web/src/components/tools/ToolCard.tsx:1-124](file://apps/pi-web/src/components/tools/ToolCard.tsx#L1-L124)
- [apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)
- [apps/pi-web/src/server/sessions.ts:1-70](file://apps/pi-web/src/server/sessions.ts#L1-L70)
- [apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)
- [apps/pi-web/src/routes/api/sessions.$sessionId.ts:1-48](file://apps/pi-web/src/routes/api/sessions.$sessionId.ts#L1-L48)
- [apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts:1-40](file://apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts#L1-L40)
- [apps/pi-web/src/routes/api/sessions.$sessionId.events.ts:1-92](file://apps/pi-web/src/routes/api/sessions.$sessionId.events.ts#L1-L92)
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)
- [apps/pi-web/src/lib/theme.ts:1-123](file://apps/pi-web/src/lib/theme.ts#L1-L123)
- [apps/pi-web/src/lib/viewport.ts:1-41](file://apps/pi-web/src/lib/viewport.ts#L1-L41)
- [apps/pi-web/src/lib/api.ts:1-160](file://apps/pi-web/src/lib/api.ts#L1-L160)
- [apps/pi-web/src/styles/app.css:1-95](file://apps/pi-web/src/styles/app.css#L1-L95)

**章节来源**
- [apps/pi-web/package.json:1-41](file://apps/pi-web/package.json#L1-L41)
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)
- [apps/pi-web/src/router.tsx:1-18](file://apps/pi-web/src/router.tsx#L1-L18)
- [apps/pi-web/src/routes/__root.tsx:1-32](file://apps/pi-web/src/routes/__root.tsx#L1-L32)
- [apps/pi-web/src/routes/index.tsx:1-14](file://apps/pi-web/src/routes/index.tsx#L1-L14)

## 核心组件
- 服务器实现与安全
  - server.mjs 提供完整的HTTP服务器，包含安全头部、主机验证和内容类型处理。
  - 支持静态文件服务和动态请求转发到TanStack Start应用。
  - 实现CSP、X-Frame-Options等安全头部配置。
- 路由与根文档
  - 通过 TanStack Router 创建路由器并挂载全局路由树，启用滚动恢复与意图预加载。
  - 根路由注入 HTML 元信息、样式与主题初始化脚本，确保首屏无闪烁。
  - 新增会话页面路由 `/session/$sessionId`。
- 对话组件系统
  - Conversation 组件管理会话状态、模型选择和消息流。
  - MessageList 组件渲染消息历史、工具调用和流式输出。
  - SessionBar 组件显示模型选择、使用统计和成本信息。
  - ToolCard 组件展示工具调用的参数、执行状态和结果。
- 侧边栏与右侧面板
  - Sidebar 提供品牌标识、新建会话按钮、会话列表与主题切换控件。
  - RightPanel 为预留插槽，默认隐藏，后续可扩展停靠面板。
  - ThemeControl 组件提供主题选择界面。
- 主题与视口
  - theme.ts 实现主题偏好读取、解析与应用，支持系统主题监听与发丝线宽度适配。
  - viewport.ts 订阅浏览器视口宽度，避免 SSR/CSR 不一致。
- 健康检查与会话管理
  - health.ts 暴露服务端函数，返回进程工作目录、Node 版本与 PID。
  - sessions.ts 提供会话列表查询和路径查找功能。
- 会话运行时与 API
  - runtime-manager.ts 管理多个 Pi 子进程运行时，具备并发上限、空闲回收与清理定时器。
  - runtime.ts 封装单个 Pi RPC 子进程的生命周期、命令收发、事件分发与快照获取。
  - REST API路由：创建会话、获取快照、关闭会话、发送命令、事件流。

**章节来源**
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)
- [apps/pi-web/src/router.tsx:1-18](file://apps/pi-web/src/router.tsx#L1-L18)
- [apps/pi-web/src/routes/__root.tsx:1-32](file://apps/pi-web/src/routes/__root.tsx#L1-L32)
- [apps/pi-web/src/routes/index.tsx:1-14](file://apps/pi-web/src/routes/index.tsx#L1-L14)
- [apps/pi-web/src/routes/session.$sessionId.tsx:1-20](file://apps/pi-web/src/routes/session.$sessionId.tsx#L1-L20)
- [apps/pi-web/src/components/layout/AppFrame.tsx:1-62](file://apps/pi-web/src/components/layout/AppFrame.tsx#L1-L62)
- [apps/pi-web/src/components/layout/Sidebar.tsx:1-77](file://apps/pi-web/src/components/layout/Sidebar.tsx#L1-L77)
- [apps/pi-web/src/components/layout/RightPanel.tsx:1-10](file://apps/pi-web/src/components/layout/RightPanel.tsx#L1-L10)
- [apps/pi-web/src/components/layout/ThemeControl.tsx:1-71](file://apps/pi-web/src/components/layout/ThemeControl.tsx#L1-L71)
- [apps/pi-web/src/components/conversation/Conversation.tsx:1-274](file://apps/pi-web/src/components/conversation/Conversation.tsx#L1-L274)
- [apps/pi-web/src/components/conversation/MessageList.tsx:1-232](file://apps/pi-web/src/components/conversation/MessageList.tsx#L1-L232)
- [apps/pi-web/src/components/conversation/SessionBar.tsx:1-68](file://apps/pi-web/src/components/conversation/SessionBar.tsx#L1-L68)
- [apps/pi-web/src/components/tools/ToolCard.tsx:1-124](file://apps/pi-web/src/components/tools/ToolCard.tsx#L1-L124)
- [apps/pi-web/src/lib/theme.ts:1-123](file://apps/pi-web/src/lib/theme.ts#L1-L123)
- [apps/pi-web/src/lib/viewport.ts:1-41](file://apps/pi-web/src/lib/viewport.ts#L1-L41)
- [apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)
- [apps/pi-web/src/server/sessions.ts:1-70](file://apps/pi-web/src/server/sessions.ts#L1-L70)
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)
- [apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)
- [apps/pi-web/src/routes/api/sessions.$sessionId.ts:1-48](file://apps/pi-web/src/routes/api/sessions.$sessionId.ts#L1-L48)
- [apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts:1-40](file://apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts#L1-L40)
- [apps/pi-web/src/routes/api/sessions.$sessionId.events.ts:1-92](file://apps/pi-web/src/routes/api/sessions.$sessionId.events.ts#L1-L92)

## 架构总览
Pi Web 在前端使用 React + TanStack Router 组织页面与路由；在服务端通过 TanStack Start 的服务端函数与文件系统路由暴露 API。会话由 Node 子进程承载，Web 层通过 JSONL 协议与其进行 RPC 通信。新增的server.mjs作为独立HTTP服务器，提供安全头部、静态文件服务和请求转发。

```mermaid
sequenceDiagram
participant Browser as "浏览器"
participant Server as "server.mjs"
participant Router as "TanStack Router"
participant RouteIndex as "routes/index.tsx"
participant Health as "server/health.ts"
participant Frame as "AppFrame.tsx"
participant ApiSessions as "routes/api/sessions.ts"
participant Manager as "server/runtime-manager.ts"
participant Runtime as "server/runtime.ts"
Browser->>Server : 访问 "/"
Server->>Router : 转发到TanStack Start
Router->>RouteIndex : 匹配根路由
RouteIndex->>Health : getHealth()
Health-->>RouteIndex : {ok, cwd, node, pid}
RouteIndex-->>Frame : 渲染 <AppFrame health/>
Browser->>Server : POST /api/sessions
Server->>Router : 转发到API路由
Router->>ApiSessions : 处理POST请求
ApiSessions->>Manager : create({sessionPath})
Manager->>Runtime : new SessionRuntime(...)
Runtime->>Runtime : initialize()
Runtime-->>Manager : RpcSessionState
Manager-->>ApiSessions : 运行时实例
ApiSessions-->>Browser : {id, state}
```

**图示来源**
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)
- [apps/pi-web/src/routes/index.tsx:1-14](file://apps/pi-web/src/routes/index.tsx#L1-L14)
- [apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)
- [apps/pi-web/src/components/layout/AppFrame.tsx:1-62](file://apps/pi-web/src/components/layout/AppFrame.tsx#L1-L62)
- [apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)

## 详细组件分析

### 服务器实现与安全
- HTTP服务器
  - 监听端口默认为3210，支持环境变量配置。
  - 实现安全头部：X-Content-Type-Options、X-Frame-Options、Referrer-Policy、Content-Security-Policy。
  - 主机白名单验证，仅允许localhost和127.0.0.1访问。
  - 跨站请求防护，阻止cross-site请求。
- 静态文件服务
  - 提供client构建产物的静态文件服务。
  - 自动设置正确的Content-Type和缓存策略。
  - 防止路径遍历攻击，限制在client目录内。
- 请求转发
  - 将非静态请求转发到TanStack Start应用。
  - 保持原始请求方法和头部。
  - 错误处理和日志记录。

```mermaid
flowchart TD
A["HTTP请求到达"] --> B{"静态文件?"}
B --> |是| C["安全检查"]
B --> |否| D["转发到TanStack Start"]
C --> E["返回静态文件"]
D --> F["处理API请求"]
F --> G["返回响应"]
```

**图示来源**
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)

**章节来源**
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)

### 路由与根文档
- 路由器配置
  - 启用滚动恢复与意图预加载，减少不必要的请求与提升交互流畅度。
- 根文档
  - 注入字符集、视口、标题与全局样式。
  - 在 HTML 中内联主题初始化脚本，避免深色主题首次白屏闪烁。
- 会话页面
  - 新增 `/session/$sessionId` 路由，支持直接访问特定会话。

```mermaid
flowchart TD
A["进入根路由"] --> B["注入 meta/links"]
B --> C["渲染 html/body 外壳"]
C --> D["执行主题初始化脚本"]
D --> E["挂载子路由与页面"]
E --> F["会话页面路由"]
```

**图示来源**
- [apps/pi-web/src/router.tsx:1-18](file://apps/pi-web/src/router.tsx#L1-L18)
- [apps/pi-web/src/routes/__root.tsx:1-32](file://apps/pi-web/src/routes/__root.tsx#L1-L32)
- [apps/pi-web/src/routes/session.$sessionId.tsx:1-20](file://apps/pi-web/src/routes/session.$sessionId.tsx#L1-L20)

**章节来源**
- [apps/pi-web/src/router.tsx:1-18](file://apps/pi-web/src/router.tsx#L1-L18)
- [apps/pi-web/src/routes/__root.tsx:1-32](file://apps/pi-web/src/routes/__root.tsx#L1-L32)
- [apps/pi-web/src/routes/session.$sessionId.tsx:1-20](file://apps/pi-web/src/routes/session.$sessionId.tsx#L1-L20)

### 对话组件系统
- Conversation 组件
  - 管理会话生命周期：创建、恢复、崩溃重启。
  - 处理模型选择、消息发送和流式响应。
  - 集成事件流连接，实时更新会话状态。
  - 错误处理和用户通知。
- MessageList 组件
  - 渲染用户消息、助手回复和工具调用。
  - 支持流式文本输出和思维过程展示。
  - 工具结果展示，包括diff视图和输出折叠。
  - 自动滚动到底部和回到底部按钮。
- SessionBar 组件
  - 模型选择下拉框，显示可用模型列表。
  - 上下文使用百分比、token计数和成本显示。
  - 实时统计信息更新。
- ToolCard 组件
  - 工具调用状态指示器（运行中、完成、失败）。
  - 参数展示和执行结果输出。
  - diff格式检测和语法高亮。
  - 长输出折叠展开功能。

```mermaid
classDiagram
class Conversation {
+props health, sessionId, onSessionCreated
+state conversation, activeId, error
+effect 事件流连接
+method send(), abort(), restart()
+render 消息列表/输入框/会话栏
}
class MessageList {
+props messages, streaming, tools
+render 消息行/流式输出
+method scrollToBottom()
}
class SessionBar {
+props models, model, stats, onSelectModel
+render 模型选择/统计信息
}
class ToolCard {
+props callId, name, args, execution, result
+render 状态指示器/参数/输出
}
Conversation --> MessageList : "渲染"
Conversation --> SessionBar : "渲染"
MessageList --> ToolCard : "渲染"
```

**图示来源**
- [apps/pi-web/src/components/conversation/Conversation.tsx:1-274](file://apps/pi-web/src/components/conversation/Conversation.tsx#L1-L274)
- [apps/pi-web/src/components/conversation/MessageList.tsx:1-232](file://apps/pi-web/src/components/conversation/MessageList.tsx#L1-L232)
- [apps/pi-web/src/components/conversation/SessionBar.tsx:1-68](file://apps/pi-web/src/components/conversation/SessionBar.tsx#L1-L68)
- [apps/pi-web/src/components/tools/ToolCard.tsx:1-124](file://apps/pi-web/src/components/tools/ToolCard.tsx#L1-L124)

**章节来源**
- [apps/pi-web/src/components/conversation/Conversation.tsx:1-274](file://apps/pi-web/src/components/conversation/Conversation.tsx#L1-L274)
- [apps/pi-web/src/components/conversation/MessageList.tsx:1-232](file://apps/pi-web/src/components/conversation/MessageList.tsx#L1-L232)
- [apps/pi-web/src/components/conversation/SessionBar.tsx:1-68](file://apps/pi-web/src/components/conversation/SessionBar.tsx#L1-L68)
- [apps/pi-web/src/components/tools/ToolCard.tsx:1-124](file://apps/pi-web/src/components/tools/ToolCard.tsx#L1-L124)

### 主题与视口
- 主题
  - 支持 light/dark/system 三种偏好，持久化到 localStorage。
  - 通过 data-theme 与 CSS 变量驱动样式，避免组件分支判断。
  - 监听系统主题变化，动态更新实际主题。
  - 安装发丝线宽度，保证高 DPI 下边框视觉一致。
- 视口
  - 默认宽度 1280，避免 SSR/CSR 不一致。
  - 监听 resize 事件同步真实宽度。
- 主题控制组件
  - 提供可视化主题选择界面。
  - 支持紧凑模式和展开模式。
  - 图标化主题选项，提升用户体验。

```mermaid
flowchart TD
T0["用户选择主题"] --> T1["applyTheme(preference)"]
T1 --> T2["resolveTheme() 计算实际主题"]
T2 --> T3["设置 html[data-theme] 与 colorScheme"]
T3 --> T4["localStorage 保存 preference"]
T4 --> T5["watchSystemTheme 监听系统变化"]
```

**图示来源**
- [apps/pi-web/src/lib/theme.ts:1-123](file://apps/pi-web/src/lib/theme.ts#L1-L123)
- [apps/pi-web/src/components/layout/ThemeControl.tsx:1-71](file://apps/pi-web/src/components/layout/ThemeControl.tsx#L1-L71)

**章节来源**
- [apps/pi-web/src/lib/theme.ts:1-123](file://apps/pi-web/src/lib/theme.ts#L1-L123)
- [apps/pi-web/src/lib/viewport.ts:1-41](file://apps/pi-web/src/lib/viewport.ts#L1-L41)
- [apps/pi-web/src/components/layout/ThemeControl.tsx:1-71](file://apps/pi-web/src/components/layout/ThemeControl.tsx#L1-L71)

### 健康检查与会话管理
- 健康检查
  - 服务端函数返回进程基本信息，便于验证 SSR、服务端函数与生产入口连通性。
  - 首页通过 loader 调用并透传给 AppFrame。
- 会话管理
  - listSessions() 列出当前项目的会话，按修改时间排序。
  - findSessionPath() 根据会话ID查找文件路径。
  - 会话摘要信息包含ID、路径、名称、工作目录、时间戳、消息数量等。

```mermaid
sequenceDiagram
participant Client as "客户端"
participant Loader as "index.tsx loader"
participant ServerFn as "health.ts getHealth"
Client->>Loader : 触发路由加载
Loader->>ServerFn : GET 健康检查
ServerFn-->>Loader : {ok, cwd, node, pid}
Loader-->>Client : 渲染页面
```

**图示来源**
- [apps/pi-web/src/routes/index.tsx:1-14](file://apps/pi-web/src/routes/index.tsx#L1-L14)
- [apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)
- [apps/pi-web/src/server/sessions.ts:1-70](file://apps/pi-web/src/server/sessions.ts#L1-L70)

**章节来源**
- [apps/pi-web/src/routes/index.tsx:1-14](file://apps/pi-web/src/routes/index.tsx#L1-L14)
- [apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)
- [apps/pi-web/src/server/sessions.ts:1-70](file://apps/pi-web/src/server/sessions.ts#L1-L70)

### 会话运行时与 API
- 运行时管理器
  - 单例进程级管理器，维护活跃运行时 Map。
  - 并发上限与空闲回收：超过上限时优先回收最久未活动且不忙的运行时。
  - 定时清理空闲运行时，释放资源。
- 会话运行时
  - 每个会话对应一个 Pi 子进程，使用 JSONL 协议进行 RPC。
  - 命令发送带超时与错误处理，响应按 id 关联。
  - 事件分发：状态变更、记录事件、退出事件。
  - 快照：并行获取状态、消息与用量统计。
- API 路由
  - POST /api/sessions：创建或恢复会话，返回会话 ID 与初始状态。
  - GET /api/sessions/$sessionId：获取会话快照。
  - DELETE /api/sessions/$sessionId：关闭会话。
  - PATCH /api/sessions/$sessionId：重命名会话。
  - POST /api/sessions/$sessionId/commands：发送RPC命令。
  - GET /api/sessions/$sessionId/events：SSE事件流。

```mermaid
classDiagram
class RuntimeManager {
+create(options) Promise~SessionRuntime~
+get(id) SessionRuntime|undefined
+close(id) Promise~boolean~
+sweep() Promise~number~
+closeAll() Promise~void~
-makeRoom() Promise~void~
}
class SessionRuntime {
+initialize() Promise~RpcSessionState~
+snapshot() Promise~SessionSnapshot~
+command(cmd) Promise~Response~
+subscribe(listener) () => void
+dispose() Promise~void~
+status RuntimeStatus
+busy boolean
+lastActivityAt number
+sessionId string|undefined
}
RuntimeManager --> SessionRuntime : "创建/管理"
```

**图示来源**
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)

```mermaid
sequenceDiagram
participant Client as "客户端"
participant SessionsAPI as "sessions.ts"
participant Manager as "runtime-manager.ts"
participant Runtime as "runtime.ts"
Client->>SessionsAPI : POST /api/sessions
SessionsAPI->>Manager : create({sessionPath})
Manager->>Runtime : new SessionRuntime(...)
Runtime->>Runtime : initialize()
Runtime-->>Manager : RpcSessionState
Manager-->>SessionsAPI : 运行时实例
SessionsAPI-->>Client : {id, state}
Client->>SessionsAPI : GET /api/sessions/ : id
SessionsAPI->>Manager : get(id)
Manager-->>SessionsAPI : SessionRuntime
SessionsAPI->>Runtime : snapshot()
Runtime-->>SessionsAPI : {state, messages, stats}
SessionsAPI-->>Client : 快照数据
Client->>SessionsAPI : DELETE /api/sessions/ : id
SessionsAPI->>Manager : close(id)
Manager-->>SessionsAPI : true/false
SessionsAPI-->>Client : {ok}
```

**图示来源**
- [apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)
- [apps/pi-web/src/routes/api/sessions.$sessionId.ts:1-48](file://apps/pi-web/src/routes/api/sessions.$sessionId.ts#L1-L48)
- [apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts:1-40](file://apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts#L1-L40)
- [apps/pi-web/src/routes/api/sessions.$sessionId.events.ts:1-92](file://apps/pi-web/src/routes/api/sessions.$sessionId.events.ts#L1-L92)
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)

**章节来源**
- [apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)
- [apps/pi-web/src/routes/api/sessions.$sessionId.ts:1-48](file://apps/pi-web/src/routes/api/sessions.$sessionId.ts#L1-L48)
- [apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts:1-40](file://apps/pi-web/src/routes/api/sessions.$sessionId.commands.ts#L1-L40)
- [apps/pi-web/src/routes/api/sessions.$sessionId.events.ts:1-92](file://apps/pi-web/src/routes/api/sessions.$sessionId.events.ts#L1-L92)
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)

## 依赖关系分析
- 前端依赖
  - React 与 ReactDOM 作为 UI 框架。
  - TanStack Router/Start 提供路由与服务端函数能力。
  - TailwindCSS 与自定义 Token 映射构成设计系统。
- 运行时依赖
  - Node child_process 启动 Pi 子进程。
  - @earendil-works/pi-coding-agent 提供 RPC 类型定义和会话管理。
  - JSONL 分帧器用于可靠的消息边界解析。
- 安全依赖
  - 内置安全头部和请求验证。
  - CSP策略限制脚本和样式来源。
  - 主机白名单和跨站请求防护。

```mermaid
graph LR
Frontend["React/TanStack/Vite"] --> Routes["routes/*"]
Frontend --> Components["components/*"]
Frontend --> Lib["lib/*"]
Frontend --> Styles["styles/*"]
Routes --> API["routes/api/*"]
API --> Manager["server/runtime-manager.ts"]
Manager --> Runtime["server/runtime.ts"]
Runtime --> Child["node:child_process"]
Runtime --> Agent["@earendil-works/pi-coding-agent"]
Server["server.mjs"] --> Security["安全头部/验证"]
Server --> Static["静态文件服务"]
Server --> Start["TanStack Start"]
```

**图示来源**
- [apps/pi-web/package.json:1-41](file://apps/pi-web/package.json#L1-L41)
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)

**章节来源**
- [apps/pi-web/package.json:1-41](file://apps/pi-web/package.json#L1-L41)
- [apps/pi-web/server.mjs:1-139](file://apps/pi-web/server.mjs#L1-L139)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)

## 性能与可维护性
- 首屏体验
  - 内联主题初始化脚本避免深色主题闪烁。
  - 默认视口宽度避免 SSR/CSR 不一致导致的重排。
  - 静态文件缓存优化，assets目录使用长期缓存。
- 资源与并发
  - 运行时管理器限制最大活跃会话数，防止内存与进程膨胀。
  - 空闲回收与定时清理降低长期驻留成本。
  - SSE事件流心跳机制保持连接活跃。
- 可观测性与健壮性
  - 子进程 stderr 保留最近日志，便于诊断。
  - 命令超时与退出事件统一处理，避免悬挂请求。
  - 错误处理和用户友好的错误提示。
- 安全性
  - 全面的安全头部配置，防止常见Web攻击。
  - 主机白名单和跨站请求防护。
  - 静态文件路径验证，防止路径遍历攻击。
- 样式与设计系统
  - 通过 CSS 变量与 Tailwind 映射设计令牌，主题切换无需组件分支。
  - 发丝线宽度随设备像素比自适应，保证精细边框一致性。

[本节为通用指导，不直接分析具体文件]

## 故障排查指南
- 服务器启动失败
  - 检查端口是否被占用，确认PI_WEB_PORT或PORT环境变量。
  - 查看控制台输出，确认服务器监听地址。
  - 参考服务器实现：[apps/pi-web/server.mjs:130-132](file://apps/pi-web/server.mjs#L130-L132)。
- 健康检查失败
  - 检查 SSR 与服务端函数是否可用，确认 Node 版本与工作目录。
  - 参考健康检查实现路径：[apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)。
- 会话创建失败
  - 若返回 429，表示达到活跃会话上限且无可回收空闲会话。
  - 调整环境变量 PI_WEB_MAX_RUNTIMES 或等待空闲回收。
  - 参考会话创建路由与运行时管理器：[apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)、[apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)。
- 子进程异常退出
  - 查看 stderr 最后若干行，定位 Pi 子进程错误。
  - 关注退出事件与 pending 命令拒绝逻辑。
  - 参考运行时实现：[apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)。
- 主题闪烁或颜色异常
  - 确认主题初始化脚本已执行，html[data-theme] 是否正确设置。
  - 检查 CSS 变量与 Tailwind 映射是否正常加载。
  - 参考主题与样式：[apps/pi-web/src/lib/theme.ts:1-123](file://apps/pi-web/src/lib/theme.ts#L1-L123)、[apps/pi-web/src/styles/app.css:1-95](file://apps/pi-web/src/styles/app.css#L1-L95)。
- 安全相关错误
  - 检查Host头是否在白名单中，确认访问地址。
  - 查看CSP策略是否阻止了必要的资源加载。
  - 参考安全配置：[apps/pi-web/server.mjs:11-17](file://apps/pi-web/server.mjs#L11-L17)。

**章节来源**
- [apps/pi-web/server.mjs:11-17](file://apps/pi-web/server.mjs#L11-L17)
- [apps/pi-web/server.mjs:130-132](file://apps/pi-web/server.mjs#L130-L132)
- [apps/pi-web/src/server/health.ts:1-46](file://apps/pi-web/src/server/health.ts#L1-L46)
- [apps/pi-web/src/routes/api/sessions.ts:1-59](file://apps/pi-web/src/routes/api/sessions.ts#L1-L59)
- [apps/pi-web/src/server/runtime-manager.ts:1-194](file://apps/pi-web/src/server/runtime-manager.ts#L1-L194)
- [apps/pi-web/src/server/runtime.ts:1-337](file://apps/pi-web/src/server/runtime.ts#L1-L337)
- [apps/pi-web/src/lib/theme.ts:1-123](file://apps/pi-web/src/lib/theme.ts#L1-L123)
- [apps/pi-web/src/styles/app.css:1-95](file://apps/pi-web/src/styles/app.css#L1-L95)

## 结论
Pi Web 在当前阶段提供了完整的Web前端界面与安全的服务器实现。通过独立的server.mjs服务器、TanStack Router与文件系统路由，前后端职责清晰；运行时管理器与子进程 RPC 机制为后续对话与工具调用打下基础。新增的对话组件系统、REST API和SSE事件流提供了现代化的用户交互体验。下一步可在 S2 接入新建会话、S5 接入会话列表，并逐步完善右侧停靠面板与更丰富的交互流程。

[本节为总结性内容，不直接分析具体文件]