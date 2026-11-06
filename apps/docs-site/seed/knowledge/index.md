# 架构知识卡

由 Repo Wiki 工具生成的模块级架构知识卡，按 monorepo 的包与子系统拆分。每张卡通常含概述、技术栈、架构设计、编码规范与特殊配置与命令。**内容为自动生成，可能过时**；与源码冲突时以源码为准。

## 结构

- 顶层模块 `Pi 运行时 Monorepo 根编排` 下按包组织子模块：`agent`、`ai`、`coding-agent`、`codemode`、`evals`、`mcp`、`schema`、`telemetry`、`tui`，以及 `apps` 与 `extensions`。
- 另有若干横切主题卡：构建与发布体系、配置系统、pnpm workspace 依赖管理、日志系统、TUI 样式系统、跨包错误处理体系。

从左侧栏选择模块进入。项目层面的权威说明见 [项目文档](/docs)。
