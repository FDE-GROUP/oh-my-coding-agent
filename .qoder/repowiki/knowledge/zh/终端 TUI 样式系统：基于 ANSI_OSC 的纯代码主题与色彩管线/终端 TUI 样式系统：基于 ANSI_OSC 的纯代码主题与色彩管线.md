---
kind: frontend_style
name: 终端 TUI 样式系统：基于 ANSI/OSC 的纯代码主题与色彩管线
category: frontend_style
scope:
    - '**'
source_files:
    - packages/tui/src/colors.ts
    - packages/tui/src/terminal-colors.ts
    - packages/tui/src/oklab.ts
    - packages/tui/src/tui.ts
    - packages/tui/src/index.ts
    - packages/tui/package.json
---

## 1. 体系概览

本仓库是 Node.js monorepo，没有浏览器端前端代码（无 `*.css` / `*.scss` / Tailwind 配置）。所有用户界面均为 **Node.js 终端 UI**，由 `packages/tui` 提供。样式完全通过 ANSI/OSC 转义序列在运行时生成，不存在 CSS、设计令牌文件或第三方 UI 组件库。

- 渲染目标：ANSI 兼容终端（支持 256 色与 truecolor）。
- 样式方法：纯 TypeScript 函数组合，输出带前景/背景/属性的 ANSI 转义字符串。
- 主题来源：通过 OSC 10/11/4 查询终端当前配色方案，并区分 `dark` / `light` 两种模式。
- 颜色空间：内部统一使用 OKLCH / Okhsl 进行混合与计算，再映射到 sRGB → ANSI 256 或 truecolor。

## 2. 关键文件

- `packages/tui/src/colors.ts` — 颜色抽象与转换核心：`Color` 联合类型（`indexed` / `rgb` / `oklch`）、`TextStyle`、`styleText` / `styleTextWithAnsi`、OKLCH↔sRGB 转换、256 色近似算法。
- `packages/tui/src/terminal-colors.ts` — 终端颜色协议解析：OSC 10/11/4 响应解析、`TerminalColors` 接口、`parseTerminalColorSchemeReport` 获取 dark/light 模式。
- `packages/tui/src/oklab.ts` — OKLab / OKLCH / Okhsl 通道之间的数学转换。
- `packages/tui/src/tui.ts` — TUI 框架入口，定义 `Component` 接口、事件分发、差分渲染循环，并消费 `TerminalColorScheme`。
- `packages/tui/src/components/*.ts` — 具体 UI 组件（box、text、editor、select-list、markdown、image 等），通过 `styleText` 应用样式。
- `packages/tui/package.json` — 包名 `@earendil-works/pi-tui`，无 CSS 相关依赖；仅依赖 `marked`、`get-eastasian-width` 等文本处理库。

## 3. 架构与约定

### 颜色模型
`colors.ts` 将颜色建模为 discriminated union：
```ts
type Color = IndexedColor | RgbColorValue | OklchColorValue;
```
- `IndexedColor`：ANSI 索引色（0–255）。
- `RgbColorValue`：sRGB 三元组（0–255）。
- `OklochColorValue`：OKLCH 感知均匀颜色空间（l∈[0,1], c≥0, h∈[0,360)）。

所有颜色最终都可通过 `colorToRgb` 归一化为 sRGB，保证“颜色运算永不失败”。

### 样式 API
`TextStyle` 描述前景/背景与属性（bold/dim/italic/underline/inverse/strikethrough），并通过 `styleText` 生成带重置序列的 ANSI 字符串。`styleTextWithAnsi` 允许传入预计算的 ANSI 片段以缓存主题色。

### 终端适配层
`terminal-colors.ts` 负责与终端交互：
- 发送 OSC 10（默认前景）、OSC 11（默认背景）、OSC 4;N（调色板 N）查询。
- 解析终端返回的十六进制或 rgba:/ 格式颜色值。
- 通过 `\x1b[?997;(1|2)n` 判断终端主题为 dark/light。

TUI 主循环在启动时发起一次批量颜色查询（见 `tui.ts` 中 `TERMINAL_COLOR_QUERY`），等待 DA1 设备属性响应作为结束标志。

### 组件样式约定
每个组件实现 `render(width: number): string[]`，返回行数组；样式通过调用 `styleText` 包裹文本内容。布局容器（box、stack、v-stack、h-stack、scroll-view 等）负责边框、间距与子组件排列，不直接持有视觉主题。

### 颜色空间选择原因
注释明确说明：OKHSL 的饱和度相对于该 hue/lightness 下 sRGB 色域的最大值，因此“相同饱和度在不同 hue/lightness 下看起来一致”，适合做主题渐变与混合。

## 4. 约定与约束

- **无 CSS/SCSS/Tailwind**：仓库根及 `packages/tui` 下不存在任何 `.css` / `.scss` / `.less` / `.sass` 文件；Tailwind 仅在 `scripts/tool-stats.ts` 中以 CDN `<script>` 引入用于工具统计页面，不属于产品样式系统。
- **颜色必须通过工厂函数创建**：`indexedColor()` / `rgbColor()` / `oklchColor()` / `okhslColor()` 对参数做范围校验（如 r/g/b ∈ [0,255]、l ∈ [0,1]、c ≥ 0），非法值抛错。
- **颜色混合默认使用 OKLCH 空间**：`mixColors` 第二个参数 `space` 可设为 `"srgb"`，但默认 `"oklch"`，以保证感知均匀的混合结果。
- **终端颜色降级策略**：当终端不支持 truecolor 时，`rgbToAnsi256` 使用立方体 + 灰阶表 + 亮度加权距离 (`0.299r + 0.587g + 0.114b`) 找到最接近的 256 色索引。
- **主题切换触发重绘**：`Component.invalidate` 文档明确说明“theme changes”会调用它使组件从 scratch 重新渲染。
- **暗/亮模式枚举**：`TerminalColorScheme = "dark" | "light"`，由终端 OSC 997 报告决定，而非硬编码常量。
- **样式属性不可变**：所有 `Color` 对象通过 `Object.freeze` 返回，防止外部修改。

## 5. 结论

本仓库的“前端样式”实质是一个 **纯代码的终端 TUI 样式子系统**：以 OKLCH 为中间颜色空间、以 ANSI/OSC 为输出协议、以 `colors.ts` + `terminal-colors.ts` 为核心、以 `Component.render` 为样式消费点。它不依赖任何 CSS 工具链，也不暴露设计令牌文件——主题由运行时终端探测与组件内联的 `TextStyle` 共同构成。