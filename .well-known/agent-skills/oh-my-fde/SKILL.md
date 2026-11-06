---
name: oh-my-fde
description: "Read the oh-my-fde 文档 docs instead of answering from memory. omfde（Pi 的企业内部 FDE 平台）项目文档、仓库 Wiki 与架构知识卡，供人与 coding agent 双读。 Use when a task involves oh-my-fde 文档: how it works, how to set it up or configure it, or its API."
---

# oh-my-fde 文档

omfde（Pi 的企业内部 FDE 平台）项目文档、仓库 Wiki 与架构知识卡，供人与 coding agent 双读。

This skill points you at the oh-my-fde 文档 docs, at https://fde-group.github.io/oh-my-fde. When a task involves oh-my-fde 文档, read the relevant page before relying on what you remember: the docs are the source of truth, and they change.

## Reading the docs

- Any page as Markdown: add `.md` to its URL (the home page is https://fde-group.github.io/oh-my-fde/index.md). Every page link below already points at the Markdown.
- [llms.txt](https://fde-group.github.io/oh-my-fde/llms.txt): every page with a one-line summary.
- [llms-full.txt](https://fde-group.github.io/oh-my-fde/llms-full.txt): every page in one file, for when you need all of it.
- [JSON API](https://fde-group.github.io/oh-my-fde/api/docs/pages.json): the page index, with each page as JSON and Markdown.

## Pages

- [oh-my-fde 文档](https://fde-group.github.io/oh-my-fde/index.md)

### Docs

- [项目文档](https://fde-group.github.io/oh-my-fde/docs.md)

#### Explains

- [omfde 代码阅读笔记](https://fde-group.github.io/oh-my-fde/docs/explains.md)
- [基线记录](https://fde-group.github.io/oh-my-fde/docs/explains/baseline.md)
- [仓库地图](https://fde-group.github.io/oh-my-fde/docs/explains/repo-map.md)
- [裁剪方案与执行记录](https://fde-group.github.io/oh-my-fde/docs/explains/prune-plan.md)
- [关键路径与接缝](https://fde-group.github.io/oh-my-fde/docs/explains/critical-path.md)
- [Session 与 Transcript](https://fde-group.github.io/oh-my-fde/docs/explains/session-transcript.md)
- [Provider 与 Stream](https://fde-group.github.io/oh-my-fde/docs/explains/provider-stream.md)
- [扩展加载与配置](https://fde-group.github.io/oh-my-fde/docs/explains/extension-loading.md)
- [Package Manager](https://fde-group.github.io/oh-my-fde/docs/explains/package-manager.md)
- [启动装配线与 Session 生命周期](https://fde-group.github.io/oh-my-fde/docs/explains/boot-and-session.md)
- [System Prompt 的组装](https://fde-group.github.io/oh-my-fde/docs/explains/system-prompt.md)
- [Compaction 与 Branch Summarization](https://fde-group.github.io/oh-my-fde/docs/explains/compaction.md)
- [Model Runtime 与认证](https://fde-group.github.io/oh-my-fde/docs/explains/model-runtime.md)
- [Tools 实现](https://fde-group.github.io/oh-my-fde/docs/explains/tools.md)
- [Modes：RPC、Print、Interactive](https://fde-group.github.io/oh-my-fde/docs/explains/modes.md)
- [MCP 与 codemode](https://fde-group.github.io/oh-my-fde/docs/explains/mcp-codemode.md)
- [TUI](https://fde-group.github.io/oh-my-fde/docs/explains/tui.md)
- [Provider 适配层](https://fde-group.github.io/oh-my-fde/docs/explains/provider-adapters.md)
- [系统总览](https://fde-group.github.io/oh-my-fde/docs/explains/system-overview.md)
- [MCP 包内部](https://fde-group.github.io/oh-my-fde/docs/explains/mcp-package.md)
- [Schema](https://fde-group.github.io/oh-my-fde/docs/explains/schema.md)
- [TUI 编辑器与 Markdown](https://fde-group.github.io/oh-my-fde/docs/explains/tui-editor-markdown.md)
- [Cache Warming 与 Evals](https://fde-group.github.io/oh-my-fde/docs/explains/cache-warmer-evals.md)
- [OpenAI Responses 适配器](https://fde-group.github.io/oh-my-fde/docs/explains/openai-responses.md)
- [OpenAI Codex 适配器](https://fde-group.github.io/oh-my-fde/docs/explains/openai-codex.md)
- [LaTeX、Autocomplete 与 Evals Docker](https://fde-group.github.io/oh-my-fde/docs/explains/latex-autocomplete-docker.md)
- [验证记录](https://fde-group.github.io/oh-my-fde/docs/explains/validation.md)
- [Fork 与裁剪说明](https://fde-group.github.io/oh-my-fde/docs/explains/fork-and-prune.md)
- [TUI 使用记录](https://fde-group.github.io/oh-my-fde/docs/explains/tui-usage.md)

#### Plans

- [Plan：Pi Web UI M1](https://fde-group.github.io/oh-my-fde/docs/plans/pi-web.md)
- [Plan：Pi Web UI M2](https://fde-group.github.io/oh-my-fde/docs/plans/pi-web-m2.md)
- [Plan：Pi Web UI M3](https://fde-group.github.io/oh-my-fde/docs/plans/pi-web-m3.md)
- [Plan：Pi Web UI M4](https://fde-group.github.io/oh-my-fde/docs/plans/pi-web-m4.md)
- [Plan：Pi Web UI M5](https://fde-group.github.io/oh-my-fde/docs/plans/pi-web-m5.md)
- [Plan：pi-web SQLite 元数据存储](https://fde-group.github.io/oh-my-fde/docs/plans/pi-web-sqlite.md)
- [Plan：Web UI 接入 omfde 平台](https://fde-group.github.io/oh-my-fde/docs/plans/omfde-web-integration.md)

#### Rads

- [RADS](https://fde-group.github.io/oh-my-fde/docs/rads.md)
- [RAD：<需求名>](https://fde-group.github.io/oh-my-fde/docs/rads/TEMPLATE.md)
- [RAD：Pi Web UI](https://fde-group.github.io/oh-my-fde/docs/rads/pi-web.md)
- [RAD：Pi Web UI M2](https://fde-group.github.io/oh-my-fde/docs/rads/pi-web-m2.md)
- [RAD：Pi Web UI M3](https://fde-group.github.io/oh-my-fde/docs/rads/pi-web-m3.md)
- [RAD：Pi Web UI M4](https://fde-group.github.io/oh-my-fde/docs/rads/pi-web-m4.md)
- [RAD：Pi Web UI M5](https://fde-group.github.io/oh-my-fde/docs/rads/pi-web-m5.md)

#### Specs

- [TypeScript 注释规范（TSDoc）](https://fde-group.github.io/oh-my-fde/docs/specs/tsdoc-comment-standards.md)
- [开发工作流](https://fde-group.github.io/oh-my-fde/docs/specs/workflow.md)
- [项目愿景](https://fde-group.github.io/oh-my-fde/docs/specs/vision.md)

#### Spikes

- [Spike：Pi Web UI M2](https://fde-group.github.io/oh-my-fde/docs/spikes/pi-web-m2.md)
- [Spike：Pi Web UI M3](https://fde-group.github.io/oh-my-fde/docs/spikes/pi-web-m3.md)
- [Spike：Pi Web UI M4](https://fde-group.github.io/oh-my-fde/docs/spikes/pi-web-m4.md)
- [Spike：Pi Web UI M5](https://fde-group.github.io/oh-my-fde/docs/spikes/pi-web-m5.md)
- [Spike：Pi Web UI 技术栈与 RPC 契约](https://fde-group.github.io/oh-my-fde/docs/spikes/pi-web-stack.md)
- [Spike：pi-web SQLite 元数据存储](https://fde-group.github.io/oh-my-fde/docs/spikes/pi-web-sqlite.md)

### Knowledge

- [架构知识卡](https://fde-group.github.io/oh-my-fde/knowledge.md)

#### Pi Monorepo 构建与发布体系（pnpm + Bun + GitHub Actions）

- [Pi Monorepo 构建与发布体系（pnpm + Bun + GitHub Actions）](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20Monorepo%20%E6%9E%84%E5%BB%BA%E4%B8%8E%E5%8F%91%E5%B8%83%E4%BD%93%E7%B3%BB%EF%BC%88pnpm%20+%20Bun%20+%20GitHub%20Actions%EF%BC%89/Pi%20Monorepo%20%E6%9E%84%E5%BB%BA%E4%B8%8E%E5%8F%91%E5%B8%83%E4%BD%93%E7%B3%BB%EF%BC%88pnpm%20+%20Bun%20+%20GitHub%20Actions%EF%BC%89.md)

#### Pi 多包 Monorepo 配置系统：分层设置、模型目录与环境变量解析

- [Pi 多包 Monorepo 配置系统：分层设置、模型目录与环境变量解析](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E5%A4%9A%E5%8C%85%20Monorepo%20%E9%85%8D%E7%BD%AE%E7%B3%BB%E7%BB%9F%EF%BC%9A%E5%88%86%E5%B1%82%E8%AE%BE%E7%BD%AE%E3%80%81%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E4%B8%8E%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E8%A7%A3%E6%9E%90/Pi%20%E5%A4%9A%E5%8C%85%20Monorepo%20%E9%85%8D%E7%BD%AE%E7%B3%BB%E7%BB%9F%EF%BC%9A%E5%88%86%E5%B1%82%E8%AE%BE%E7%BD%AE%E3%80%81%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E4%B8%8E%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E8%A7%A3%E6%9E%90.md)

#### Pi 运行时 Monorepo 根编排

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

##### Model Context Protocol (MCP) 客户端库

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Model%20Context%20Protocol%20%28MCP%29%20%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%BA%93/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Model%20Context%20Protocol%20%28MCP%29%20%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%BA%93/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Model%20Context%20Protocol%20%28MCP%29%20%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%BA%93/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Model%20Context%20Protocol%20%28MCP%29%20%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%BA%93/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Model%20Context%20Protocol%20%28MCP%29%20%E5%AE%A2%E6%88%B7%E7%AB%AF%E5%BA%93/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

##### OMFDE 平台 CLI 启动器

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%20CLI%20%E5%90%AF%E5%8A%A8%E5%99%A8/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%20CLI%20%E5%90%AF%E5%8A%A8%E5%99%A8/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%20CLI%20%E5%90%AF%E5%8A%A8%E5%99%A8/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%20CLI%20%E5%90%AF%E5%8A%A8%E5%99%A8/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%20CLI%20%E5%90%AF%E5%8A%A8%E5%99%A8/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

##### OMFDE 平台扩展集合

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%E6%89%A9%E5%B1%95%E9%9B%86%E5%90%88/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%E6%89%A9%E5%B1%95%E9%9B%86%E5%90%88/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%E6%89%A9%E5%B1%95%E9%9B%86%E5%90%88/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/OMFDE%20%E5%B9%B3%E5%8F%B0%E6%89%A9%E5%B1%95%E9%9B%86%E5%90%88/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

##### Omfde 项目文档与决策依据（explains Rads Specs Plans Spikes）

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/omfde%20%E9%A1%B9%E7%9B%AE%E6%96%87%E6%A1%A3%E4%B8%8E%E5%86%B3%E7%AD%96%E4%BE%9D%E6%8D%AE%EF%BC%88explains_rads_specs_plans_spikes%EF%BC%89/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/omfde%20%E9%A1%B9%E7%9B%AE%E6%96%87%E6%A1%A3%E4%B8%8E%E5%86%B3%E7%AD%96%E4%BE%9D%E6%8D%AE%EF%BC%88explains_rads_specs_plans_spikes%EF%BC%89/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/omfde%20%E9%A1%B9%E7%9B%AE%E6%96%87%E6%A1%A3%E4%B8%8E%E5%86%B3%E7%AD%96%E4%BE%9D%E6%8D%AE%EF%BC%88explains_rads_specs_plans_spikes%EF%BC%89/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/omfde%20%E9%A1%B9%E7%9B%AE%E6%96%87%E6%A1%A3%E4%B8%8E%E5%86%B3%E7%AD%96%E4%BE%9D%E6%8D%AE%EF%BC%88explains_rads_specs_plans_spikes%EF%BC%89/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/omfde%20%E9%A1%B9%E7%9B%AE%E6%96%87%E6%A1%A3%E4%B8%8E%E5%86%B3%E7%AD%96%E4%BE%9D%E6%8D%AE%EF%BC%88explains_rads_specs_plans_spikes%EF%BC%89/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

##### Pi Ai 统一 LLM SDK

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### AI Provider 实现集合

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Cloudflare Workers AI 提供者实现

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Cloudflare%20Workers%20AI%20%E6%8F%90%E4%BE%9B%E8%80%85%E5%AE%9E%E7%8E%B0/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Cloudflare%20Workers%20AI%20%E6%8F%90%E4%BE%9B%E8%80%85%E5%AE%9E%E7%8E%B0/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Cloudflare%20Workers%20AI%20%E6%8F%90%E4%BE%9B%E8%80%85%E5%AE%9E%E7%8E%B0/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Cloudflare%20Workers%20AI%20%E6%8F%90%E4%BE%9B%E8%80%85%E5%AE%9E%E7%8E%B0/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Google 与 Google Vertex AI 模型提供方

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Google%20%E4%B8%8E%20Google%20Vertex%20AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E6%96%B9/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Google%20%E4%B8%8E%20Google%20Vertex%20AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E6%96%B9/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Google%20%E4%B8%8E%20Google%20Vertex%20AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E6%96%B9/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Google%20%E4%B8%8E%20Google%20Vertex%20AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E6%96%B9/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Google%20%E4%B8%8E%20Google%20Vertex%20AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E6%96%B9/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### OpenAI 系列 Provider 实现

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenAI%20%E7%B3%BB%E5%88%97%20Provider%20%E5%AE%9E%E7%8E%B0/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenAI%20%E7%B3%BB%E5%88%97%20Provider%20%E5%AE%9E%E7%8E%B0/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenAI%20%E7%B3%BB%E5%88%97%20Provider%20%E5%AE%9E%E7%8E%B0/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenAI%20%E7%B3%BB%E5%88%97%20Provider%20%E5%AE%9E%E7%8E%B0/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### OpenCode 与 OpenRouter 第三方 AI 提供商适配

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenCode%20%E4%B8%8E%20OpenRouter%20%E7%AC%AC%E4%B8%89%E6%96%B9%20AI%20%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenCode%20%E4%B8%8E%20OpenRouter%20%E7%AC%AC%E4%B8%89%E6%96%B9%20AI%20%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenCode%20%E4%B8%8E%20OpenRouter%20%E7%AC%AC%E4%B8%89%E6%96%B9%20AI%20%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/OpenCode%20%E4%B8%8E%20OpenRouter%20%E7%AC%AC%E4%B8%89%E6%96%B9%20AI%20%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Qwen Token Plan 多区域 Provider 适配

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Qwen%20Token%20Plan%20%E5%A4%9A%E5%8C%BA%E5%9F%9F%20Provider%20%E9%80%82%E9%85%8D/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Qwen%20Token%20Plan%20%E5%A4%9A%E5%8C%BA%E5%9F%9F%20Provider%20%E9%80%82%E9%85%8D/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Qwen%20Token%20Plan%20%E5%A4%9A%E5%8C%BA%E5%9F%9F%20Provider%20%E9%80%82%E9%85%8D/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/Qwen%20Token%20Plan%20%E5%A4%9A%E5%8C%BA%E5%9F%9F%20Provider%20%E9%80%82%E9%85%8D/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### 小米（Xiaomi）AI 模型提供商适配

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E5%B0%8F%E7%B1%B3%EF%BC%88Xiaomi%EF%BC%89AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E5%B0%8F%E7%B1%B3%EF%BC%88Xiaomi%EF%BC%89AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E5%B0%8F%E7%B1%B3%EF%BC%88Xiaomi%EF%BC%89AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E5%AE%9E%E7%8E%B0%E9%9B%86%E5%90%88/%E5%B0%8F%E7%B1%B3%EF%BC%88Xiaomi%EF%BC%89AI%20%E6%A8%A1%E5%9E%8B%E6%8F%90%E4%BE%9B%E5%95%86%E9%80%82%E9%85%8D/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### AI Provider 认证与凭据系统

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E8%AE%A4%E8%AF%81%E4%B8%8E%E5%87%AD%E6%8D%AE%E7%B3%BB%E7%BB%9F/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E8%AE%A4%E8%AF%81%E4%B8%8E%E5%87%AD%E6%8D%AE%E7%B3%BB%E7%BB%9F/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E8%AE%A4%E8%AF%81%E4%B8%8E%E5%87%AD%E6%8D%AE%E7%B3%BB%E7%BB%9F/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20Provider%20%E8%AE%A4%E8%AF%81%E4%B8%8E%E5%87%AD%E6%8D%AE%E7%B3%BB%E7%BB%9F/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### AI SDK 共享工具集

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20SDK%20%E5%85%B1%E4%BA%AB%E5%B7%A5%E5%85%B7%E9%9B%86/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20SDK%20%E5%85%B1%E4%BA%AB%E5%B7%A5%E5%85%B7%E9%9B%86/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20SDK%20%E5%85%B1%E4%BA%AB%E5%B7%A5%E5%85%B7%E9%9B%86/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20SDK%20%E5%85%B1%E4%BA%AB%E5%B7%A5%E5%85%B7%E9%9B%86/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### AI 提供商 API 适配器层

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%8F%90%E4%BE%9B%E5%95%86%20API%20%E9%80%82%E9%85%8D%E5%99%A8%E5%B1%82/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%8F%90%E4%BE%9B%E5%95%86%20API%20%E9%80%82%E9%85%8D%E5%99%A8%E5%B1%82/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%8F%90%E4%BE%9B%E5%95%86%20API%20%E9%80%82%E9%85%8D%E5%99%A8%E5%B1%82/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%8F%90%E4%BE%9B%E5%95%86%20API%20%E9%80%82%E9%85%8D%E5%99%A8%E5%B1%82/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### AI 模型目录构建与生成

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E6%9E%84%E5%BB%BA%E4%B8%8E%E7%94%9F%E6%88%90/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E6%9E%84%E5%BB%BA%E4%B8%8E%E7%94%9F%E6%88%90/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E6%9E%84%E5%BB%BA%E4%B8%8E%E7%94%9F%E6%88%90/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E6%9E%84%E5%BB%BA%E4%B8%8E%E7%94%9F%E6%88%90/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/pi-ai%20%E7%BB%9F%E4%B8%80%20LLM%20SDK/AI%20%E6%A8%A1%E5%9E%8B%E7%9B%AE%E5%BD%95%E6%9E%84%E5%BB%BA%E4%B8%8E%E7%94%9F%E6%88%90/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

##### Pi Coding Agent 主包 (pi Coding Agent)

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Bun 沙箱运行时入口

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Bun%20%E6%B2%99%E7%AE%B1%E8%BF%90%E8%A1%8C%E6%97%B6%E5%85%A5%E5%8F%A3/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Bun%20%E6%B2%99%E7%AE%B1%E8%BF%90%E8%A1%8C%E6%97%B6%E5%85%A5%E5%8F%A3/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Bun%20%E6%B2%99%E7%AE%B1%E8%BF%90%E8%A1%8C%E6%97%B6%E5%85%A5%E5%8F%A3/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Bun%20%E6%B2%99%E7%AE%B1%E8%BF%90%E8%A1%8C%E6%97%B6%E5%85%A5%E5%8F%A3/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Bun%20%E6%B2%99%E7%AE%B1%E8%BF%90%E8%A1%8C%E6%97%B6%E5%85%A5%E5%8F%A3/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### CLI 入口与交互层

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/CLI%20%E5%85%A5%E5%8F%A3%E4%B8%8E%E4%BA%A4%E4%BA%92%E5%B1%82/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/CLI%20%E5%85%A5%E5%8F%A3%E4%B8%8E%E4%BA%A4%E4%BA%92%E5%B1%82/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/CLI%20%E5%85%A5%E5%8F%A3%E4%B8%8E%E4%BA%A4%E4%BA%92%E5%B1%82/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/CLI%20%E5%85%A5%E5%8F%A3%E4%B8%8E%E4%BA%A4%E4%BA%92%E5%B1%82/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Coding Agent 测试套件

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Coding%20Agent%20%E6%B5%8B%E8%AF%95%E5%A5%97%E4%BB%B6/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Coding%20Agent%20%E6%B5%8B%E8%AF%95%E5%A5%97%E4%BB%B6/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Coding%20Agent%20%E6%B5%8B%E8%AF%95%E5%A5%97%E4%BB%B6/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Coding%20Agent%20%E6%B5%8B%E8%AF%95%E5%A5%97%E4%BB%B6/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Coding%20Agent%20%E6%B5%8B%E8%AF%95%E5%A5%97%E4%BB%B6/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Pi Coding Agent 核心运行时聚合层

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Agent 会话生命周期与运行时编排

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Agent%20%E4%BC%9A%E8%AF%9D%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Agent%20%E4%BC%9A%E8%AF%9D%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Agent%20%E4%BC%9A%E8%AF%9D%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Agent%20%E4%BC%9A%E8%AF%9D%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Pi Coding Agent JSON Schema 定义集

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20JSON%20Schema%20%E5%AE%9A%E4%B9%89%E9%9B%86/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20JSON%20Schema%20%E5%AE%9A%E4%B9%89%E9%9B%86/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20JSON%20Schema%20%E5%AE%9A%E4%B9%89%E9%9B%86/%E6%A6%82%E8%BF%B0.md)
- [特殊配置与命令](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20JSON%20Schema%20%E5%AE%9A%E4%B9%89%E9%9B%86/%E7%89%B9%E6%AE%8A%E9%85%8D%E7%BD%AE%E4%B8%8E%E5%91%BD%E4%BB%A4.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20JSON%20Schema%20%E5%AE%9A%E4%B9%89%E9%9B%86/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Pi Coding Agent 核心运行时层

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### Agent Session 生命周期与运行时编排

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/Agent%20Session%20%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/Agent%20Session%20%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/Agent%20Session%20%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/Agent%20Session%20%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E7%BC%96%E6%8E%92/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### MCP 服务器配置与 Radius 集成

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/MCP%20%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%85%8D%E7%BD%AE%E4%B8%8E%20Radius%20%E9%9B%86%E6%88%90/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/MCP%20%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%85%8D%E7%BD%AE%E4%B8%8E%20Radius%20%E9%9B%86%E6%88%90/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/MCP%20%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%85%8D%E7%BD%AE%E4%B8%8E%20Radius%20%E9%9B%86%E6%88%90/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/MCP%20%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%85%8D%E7%BD%AE%E4%B8%8E%20Radius%20%E9%9B%86%E6%88%90/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### SDK 启动与运行时引导

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/SDK%20%E5%90%AF%E5%8A%A8%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E5%BC%95%E5%AF%BC/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/SDK%20%E5%90%AF%E5%8A%A8%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E5%BC%95%E5%AF%BC/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/SDK%20%E5%90%AF%E5%8A%A8%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E5%BC%95%E5%AF%BC/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/SDK%20%E5%90%AF%E5%8A%A8%E4%B8%8E%E8%BF%90%E8%A1%8C%E6%97%B6%E5%BC%95%E5%AF%BC/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### 会话 HTML 导出与渲染

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%20HTML%20%E5%AF%BC%E5%87%BA%E4%B8%8E%E6%B8%B2%E6%9F%93/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%20HTML%20%E5%AF%BC%E5%87%BA%E4%B8%8E%E6%B8%B2%E6%9F%93/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%20HTML%20%E5%AF%BC%E5%87%BA%E4%B8%8E%E6%B8%B2%E6%9F%93/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%20HTML%20%E5%AF%BC%E5%87%BA%E4%B8%8E%E6%B8%B2%E6%9F%93/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### 会话压缩与分支摘要

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%E5%8E%8B%E7%BC%A9%E4%B8%8E%E5%88%86%E6%94%AF%E6%91%98%E8%A6%81/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%E5%8E%8B%E7%BC%A9%E4%B8%8E%E5%88%86%E6%94%AF%E6%91%98%E8%A6%81/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%E5%8E%8B%E7%BC%A9%E4%B8%8E%E5%88%86%E6%94%AF%E6%91%98%E8%A6%81/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E4%BC%9A%E8%AF%9D%E5%8E%8B%E7%BC%A9%E4%B8%8E%E5%88%86%E6%94%AF%E6%91%98%E8%A6%81/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### 内置工具执行与渲染层

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E5%86%85%E7%BD%AE%E5%B7%A5%E5%85%B7%E6%89%A7%E8%A1%8C%E4%B8%8E%E6%B8%B2%E6%9F%93%E5%B1%82/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E5%86%85%E7%BD%AE%E5%B7%A5%E5%85%B7%E6%89%A7%E8%A1%8C%E4%B8%8E%E6%B8%B2%E6%9F%93%E5%B1%82/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E5%86%85%E7%BD%AE%E5%B7%A5%E5%85%B7%E6%89%A7%E8%A1%8C%E4%B8%8E%E6%B8%B2%E6%9F%93%E5%B1%82/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E5%86%85%E7%BD%AE%E5%B7%A5%E5%85%B7%E6%89%A7%E8%A1%8C%E4%B8%8E%E6%B8%B2%E6%9F%93%E5%B1%82/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### 扩展加载与生命周期运行时

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%89%A9%E5%B1%95%E5%8A%A0%E8%BD%BD%E4%B8%8E%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E8%BF%90%E8%A1%8C%E6%97%B6/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%89%A9%E5%B1%95%E5%8A%A0%E8%BD%BD%E4%B8%8E%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E8%BF%90%E8%A1%8C%E6%97%B6/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%89%A9%E5%B1%95%E5%8A%A0%E8%BD%BD%E4%B8%8E%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E8%BF%90%E8%A1%8C%E6%97%B6/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%89%A9%E5%B1%95%E5%8A%A0%E8%BD%BD%E4%B8%8E%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E8%BF%90%E8%A1%8C%E6%97%B6/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

###### 模型配置、注册与解析层

- [技术栈](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%A8%A1%E5%9E%8B%E9%85%8D%E7%BD%AE%E3%80%81%E6%B3%A8%E5%86%8C%E4%B8%8E%E8%A7%A3%E6%9E%90%E5%B1%82/%E6%8A%80%E6%9C%AF%E6%A0%88.md)
- [架构设计](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%A8%A1%E5%9E%8B%E9%85%8D%E7%BD%AE%E3%80%81%E6%B3%A8%E5%86%8C%E4%B8%8E%E8%A7%A3%E6%9E%90%E5%B1%82/%E6%9E%B6%E6%9E%84%E8%AE%BE%E8%AE%A1.md)
- [概述](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%A8%A1%E5%9E%8B%E9%85%8D%E7%BD%AE%E3%80%81%E6%B3%A8%E5%86%8C%E4%B8%8E%E8%A7%A3%E6%9E%90%E5%B1%82/%E6%A6%82%E8%BF%B0.md)
- [编码规范](https://fde-group.github.io/oh-my-fde/knowledge/Pi%20%E8%BF%90%E8%A1%8C%E6%97%B6%20Monorepo%20%E6%A0%B9%E7%BC%96%E6%8E%92/Pi%20Coding%20Agent%20%E4%B8%BB%E5%8C%85%20%28pi-coding-agent%29/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E8%81%9A%E5%90%88%E5%B1%82/Pi%20Coding%20Agent%20%E6%A0%B8%E5%BF%83%E8%BF%90%E8%A1%8C%E6%97%B6%E5%B1%82/%E6%A8%A1%E5%9E%8B%E9%85%8D%E7%BD%AE%E3%80%81%E6%B3%A8%E5%86%8C%E4%B8%8E%E8%A7%A3%E6%9E%90%E5%B1%82/%E7%BC%96%E7%A0%81%E8%A7%84%E8%8C%83.md)

…and 227 more. [llms.txt](https://fde-group.github.io/oh-my-fde/llms.txt) lists every page.
