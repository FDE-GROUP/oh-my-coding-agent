---
kind: frontend_style
name: Pi TUI 终端 UI 样式系统：纯 ANSI/OSC 转义序列 + 函数式 Theme 主题
category: frontend_style
scope:
    - '**'
source_files:
    - packages/tui/src/colors.ts
    - packages/tui/src/terminal-colors.ts
    - packages/tui/src/oklab.ts
    - packages/tui/src/components/editor.ts
    - packages/tui/src/components/markdown.ts
    - packages/tui/src/components/select-list.ts
    - packages/tui/src/components/settings-list.ts
    - packages/tui/src/components/image.ts
    - packages/tui/src/index.ts
    - packages/tui/test/test-themes.ts
    - packages/tui/package.json
---

## 1. 使用的系统与方案

本仓库没有浏览器端前端代码，也没有 CSS/SCSS/Tailwind 等 Web 样式体系。唯一的 UI 层是 `packages/tui`——一个基于 Node.js 的终端用户界面（TUI）库，通过差分渲染在标准输出上绘制文本、图像与交互控件。

样式完全由 ANSI/OSC 转义序列驱动，核心路径如下：
- `packages/tui/src/colors.ts`：颜色模型（Indexed / RGB / OKLCH / OKHSL）、色域映射、ANSI 256 色与 truecolor 转换、`styleText` / `styleTextWithAnsi` 生成带前缀/后缀重置的 ANSI 片段。
- `packages/tui/src/terminal-colors.ts`：解析终端 OSC 10/11/4 响应以探测当前终端的前景色、背景色、调色板及 dark/light 主题模式。
- `packages/tui/src/oklab.ts`：OKLCH ↔ sRGB 色彩空间转换。
- 组件层（`src/components/*.ts`）通过 `EditorTheme` / `MarkdownTheme` / `SelectListTheme` / `SettingsListTheme` / `ImageTheme` 等接口接收**函数式主题**，每个主题字段是一个 `(text: string) => string` 函数，返回已着色文本。

依赖方面，运行时仅依赖 `get-east-asian-width`、`marked`、`marked-cjk-friendly`；测试中用 `chalk` 构造默认主题，但 chalk 不是运行时依赖。

## 2. 关键文件

- `packages/tui/src/colors.ts` — 颜色 API、ANSI 转义生成、256 色近似算法
- `packages/tui/src/terminal-colors.ts` — OSC 颜色协议解析、dark/light 主题检测
- `packages/tui/src/oklab.ts` — OKLCH/sRGB 色彩空间数学
- `packages/tui/src/components/editor.ts` — `EditorTheme` 定义（含 `selectList`）
- `packages/tui/src/components/markdown.ts` — `MarkdownTheme` 定义（heading/link/code/quote/hr/bold/italic/strikethrough/underline 等）
- `packages/tui/src/components/select-list.ts` — `SelectListTheme` 定义（selectedPrefix/selectedText/description/scrollInfo/noMatch）
- `packages/tui/src/components/settings-list.ts` — `SettingsListTheme` 定义
- `packages/tui/src/components/image.ts` — `ImageTheme` 定义
- `packages/tui/src/index.ts` — 统一导出所有 Theme 类型
- `packages/tui/test/test-themes.ts` — 基于 chalk 的默认主题实现，供测试使用
- `packages/tui/package.json` — 声明 `@earendil-works/pi-tui` 包，无 CSS 相关依赖

## 3. 架构与约定

- **无 CSS/SCSS/Tailwind**：整个仓库未检出任何 `.css` / `.scss` / `.less` / `.sass` 文件，也未安装 Tailwind（仅在 `scripts/tool-stats.ts` 中通过 CDN 引用一次 `@tailwindcss/browser@4`，属于工具脚本而非应用样式）。
- **颜色模型分层**：`colors.ts` 暴露 `Color = IndexedColor | RgbColorValue | OklchColorValue` 联合类型，并通过 `parseColor` 接受 `#hex`、`oklch(...)`、`okhsl(...)` 字符串以及数字索引；内部统一转为 sRGB 后再按 `TerminalColorMode`（`"256color" | "truecolor"`）输出 ANSI 转义。
- **主题即函数**：每个组件的 Theme 都是函数集合，例如 `MarkdownTheme.heading(text) => string`，调用方直接拼接 ANSI 片段。这使主题可以任意组合 chalk、自定义 ANSI 或纯文本。
- **终端主题感知**：`terminal-colors.ts` 通过 OSC 10/11/4 和 `\x1b[?997;...n` 协议反向探测终端实际配色与 dark/light 模式，供上层决定是否切换主题。
- **组件树 + 差分渲染**：`tui.ts` / `tui-main-screen.ts` / `tui-alt-screen.ts` 维护布局节点树，每次重绘只输出差异 ANSI 片段，避免整屏刷新。
- **TypeScript 类型约束**：所有颜色值、属性（bold/dim/italic/underline/inverse/strikethrough）均通过接口强制校验，如 `indexedColor` 要求 index ∈ [0,255]，`rgbColor` 要求 r/g/b ∈ [0,255]。

## 4. 约定与约束

- **不存在 Web 样式体系**：仓库中没有 CSS/SCSS/Tailwind 配置，`frontend_style` 在此仓库的实际含义是“终端 ANSI 样式 + 函数式主题”。
- **颜色必须经 `colors.ts` 工厂函数创建**：`indexedColor` / `rgbColor` / `oklchColor` / `okhslColor` 对输入做范围校验并返回 `Object.freeze` 实例，禁止直接构造 Color 对象。
- **Theme 字段必须是 `(text: string) => string` 函数**：由 `EditorTheme` / `MarkdownTheme` / `SelectListTheme` / `SettingsListTheme` / `ImageTheme` 等 TypeScript 接口强制，组件构造函数签名直接要求传入对应 Theme。
- **ANSI 转义片段总是成对闭合**：`styleTextWithAnsi` 将 reset 序列放在 suffix 中以逆序关闭，保证嵌套样式正确。
- **256 色近似策略固定**：`rgbToAnsi256` 使用预定义的 `CUBE_VALUES = [0,95,135,175,215,255]` 与 `GRAY_VALUES = 8..240(step 10)` 查找最近色，灰度判断阈值 `spread < 10` 且距离比较采用加权 RGB 距离公式。
- **dark/light 主题来源是终端协议**：`parseTerminalColorSchemeReport` 仅识别 `\x1b[?997;(1|2)n` 响应，返回 `"dark" | "light"`，不引入外部主题配置文件。
- **测试主题基于 chalk level=3**：`test/test-themes.ts` 显式创建 `new Chalk({ level: 3 })` 以启用 truecolor，确保测试输出与真实终端一致。