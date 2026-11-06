# TUI

`packages/tui` 是一个独立的终端 UI 库，coding-agent 只是它的消费者。
源码约 20,000 行（之前统计的 45k 包含测试、示例和文档）。

## 1. 组件模型

```ts
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  handleMouse?(event: TuiMouseEvent): TuiMouseEventResult | undefined;
  invalidate(): void;
}
```

- 组件只负责“给定宽度，返回若干行字符串”；
- 行里可以带 ANSI 样式；
- 布局、合成、差分由 TUI 负责，组件不关心自己在屏幕的哪个位置；
- `Container` 是最简单的组合：按顺序拼接子组件的行。

## 2. TUI 接口

`TUI` 扩展 `Component`，增加：

```
addChild / removeChild / clear
setFocus(component)
showOverlay(component, options) → OverlayHandle
start() / stop()
renderNow(force?) / requestRender(force?)
addInputListener(listener)
queryTerminalColors()
onTerminalColorSchemeChange()
```

`TuiBase` 提供通用实现：

- 焦点管理（`Focusable`，`focused` 标记）；
- overlay 栈与焦点恢复；
- 输入监听器链（可以消费或改写输入）；
- 渲染调度；
- 终端启动/停止；
- 终端颜色与单元格尺寸查询。

### 渲染调度

```
requestRender()
  → process.nextTick(scheduleRender)
  → 距上次渲染不足 16ms 就 setTimeout
  → doRender()

requestImmediateRender()
  → 跳过节流，键盘输入走这条路
```

键盘输入是延迟敏感的，所以不排队等 16ms 的节流 tick。

## 3. 两个 renderer

### TuiMainScreen

渲染到主屏幕和 scrollback。

核心是**按行差分**：

```
1. render(width) 得到新行
2. 合成 overlay
3. 提取 CURSOR_MARKER，计算光标位置
4. 给每行加 reset
5. 与 previousLines 逐行比较
6. 只重写第一个变化行到最后一个变化行
```

会触发整屏重绘的情况：

- 第一次渲染；
- 终端宽度变化（换行会变）；
- 终端高度变化（Termux 例外，避免软键盘切换时重放历史）；
- `clearOnShrink` 开启且内容变短；
- 第一个变化行在上一帧视口之上（差分只能碰可见区域）；
- Kitty 图片区域会滚动。

输出用 `\x1b[?2026h` / `\x1b[?2026l` 包裹，这是同步输出（synchronized output），
减少闪烁。

写入用 `BoundedTerminalWriter` 按 1MiB 分块，避免形成超大字符串。

### TuiAltScreen

渲染到备用屏幕，带固定视口布局。`ChatViewport` 用它实现：

```
ScrollView（transcript）
  + dock（pending messages / status / widgets / editor / footer）
```

备用屏幕支持搜索、滚动条、鼠标选择、prompt 跳转。

## 4. 布局系统

布局在 `layout.ts`，独立于组件的 `render()`。

组件可以通过 `LAYOUT_NODE` 符号暴露布局节点：

```ts
type = "vstack" | "hstack" | "scroll"
```

`renderLayoutFrame(root, width, height)`：

```
1. 递归 layoutComponent()
   - 普通组件：render(width) 得到行和高度
   - scroll：先布局内容，再按 scrollTop 平移，裁剪到视口
   - vstack / hstack：计算每个子项尺寸，递归布局
2. paintBox() 把 LayoutBox 树画到屏幕行数组
3. 处理 Kitty 图片裁剪、滚动条
4. 返回 LayoutFrame { root, width, height, lines }
```

### 尺寸分配

`allocateStackSizes()`：

- `basis`：固定尺寸，或 `"auto"` 用固有尺寸；
- `grow`：剩余空间按权重分配；
- `shrink`：空间不足时按权重收缩；
- `minSize` / `maxSize`：夹紧；
- `gap`：子项间距。

算法是迭代分配：每轮给仍有容量的候选者按权重分，直到分完或没人能收。

### 命中测试

`getLayoutBoxesAt(frame, x, y)` 返回从最深到根的命中路径，按 layer 和深度排序。
鼠标事件用它找到目标组件。

## 5. Overlay

`showOverlay()` 支持：

- 宽高：绝对数字或百分比；
- 锚点：`center`、四角、四边中点；
- `row` / `col`：绝对或百分比；
- `margin`；
- `visible(termWidth, termHeight)`：按终端尺寸决定是否显示；
- `nonCapturing`：不抢焦点。

overlay 维护自己的栈和焦点恢复状态。被隐藏或移除时，焦点回到下一个可见
overlay 或原来的 `preFocus`。

合成顺序：先渲染基础内容，再按 `focusOrder` 把 overlay 逐行合成进去，最后
才做差分。

## 6. 终端抽象

`Terminal` 接口：

```
start(onInput, onResize) / stop()
write(data)
columns / rows
hideCursor / showCursor
moveBy / clearLine / clearScreen
setTitle
setProgress
setProgramStatus
drainInput()
restoreOnExit()
```

`ProcessTerminal` 负责：

- raw mode；
- stdin 读取与 `StdinBuffer` 分帧；
- resize 事件；
- Kitty 键盘协议协商；
- 转义序列超时（本地 10ms，SSH 100ms）；
- OSC 颜色查询、单元格尺寸查询；
- 终端进度（OSC 9;4）和程序状态（OSC 7501）。

## 7. 光标

组件在需要光标的位置输出 `CURSOR_MARKER`：

```
\x1b_pi:c\x07
```

这是一个零宽的 APC 序列，终端会忽略。TUI 在渲染行里找到它，计算可见列，
然后：

- 从输出中剥掉；
- 用 `\x1b[<n>G` 把硬件光标移到对应列；
- 根据 `showHardwareCursor` 决定显示还是隐藏。

这样 IME 候选窗口能出现在正确位置。

还有“假光标”标记（`FAKE_CURSOR_START/END`），用于没有硬件光标时用反色
绘制光标。

## 8. 输入与按键

- `keys.ts`：解析按键、`matchesKey()`、Kitty 协议、release/repeat 事件；
- `stdin-buffer.ts`：把 stdin 字节流拆成事件，处理转义序列；
- `keybindings.ts`：默认键位、配置覆盖、冲突检测；
- 输入监听器可以消费或改写输入，再交给焦点组件。

## 9. 组件

| 组件 | 作用 |
|---|---|
| `Text` | 带样式和缩进的文本 |
| `Box` | 边框/内边距 |
| `Spacer` | 空行 |
| `VStack` / `HStack` | 布局容器 |
| `ScrollView` | 可滚动视口 |
| `Editor` | 多行编辑器，撤销、kill ring、自动补全 |
| `Input` | 单行输入 |
| `Markdown` | 基于 marked 的 Markdown 渲染 |
| `SelectList` / `SettingsList` | 选择菜单 |
| `Image` | Kitty / iTerm2 图片 |
| `Loader` / `CancellableLoader` | spinner |
| `MouseRegion` | 鼠标区域 |

Markdown 渲染会处理代码块、表格、链接、LaTeX、图片，并按终端宽度换行。

## 10. 设计观察

1. **组件只返回行**：布局、合成、差分、光标都由 TUI 统一处理。
2. **差分按行比较**：简单、可靠，但要求组件渲染稳定；同一状态应产出同样的行。
3. **渲染缓存按宽度**：`layout.ts` 用 `Map<Component, Map<width, string[]>>`，
   避免同一帧内重复 render。
4. **同步输出包裹整帧**：减少闪烁，也让差分写入看起来是一次原子更新。
5. **光标是行内标记**：组件不需要知道屏幕坐标，TUI 负责定位。
6. **布局与渲染分离**：`LAYOUT_NODE` 让容器参与尺寸分配，但内容仍由
   `render(width)` 决定。
7. **终端能力是运行时探测的**：颜色、单元格尺寸、Kitty 协议、图片支持都
   通过查询/协商获得。

## 11. 尚未细读

- `tui-alt-screen.ts`（1,800 行）：备用屏幕的搜索、滚动、选择。
- `components/editor.ts`（2,483 行）：编辑器的撤销、kill ring、自动补全。
- `components/markdown.ts`（1,161 行）：Markdown 渲染细节。
- `latex.ts`（1,506 行）、`autocomplete.ts`（858 行）。
- `terminal-image.ts`（786 行）：Kitty/iTerm2 图片编码。
- `keys.ts`（1,511 行）、`utils.ts`（1,469 行）。
