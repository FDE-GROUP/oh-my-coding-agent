# TUI 编辑器与 Markdown

这一篇补 TUI 最复杂的两个组件。

## 1. Editor

`components/editor.ts` 约 2,480 行，是一个 Emacs 风格的多行编辑器。

### 状态

```ts
state = {
  lines: string[],
  cursorLine: number,
  cursorCol: number,
}
preferredVisualCol  // 上下移动时保持列
scrollOffset
pastes              // 粘贴标记 → 原文
pasteCounter
undoStack
killRing
history / historyIndex
autocompleteState / autocompleteList
```

### 长粘贴：paste marker

大段粘贴不会直接进 `lines`。它会变成：

```
[paste #1 +123 lines]
[paste #2 1234 chars]
```

然后：

- 在 `pastes` 里保存原文；
- 把 marker 当作**原子片段**处理：光标移动、删除、换行都把它当一个字符；
- 提交时 `getExpandedText()` 把 marker 展开回原文。

好处是编辑大段粘贴时不会卡，也不会让光标在几千行里乱跳。

`segmentWithMarkers()` 用一个包装过的 `Intl.Segmenter`，把 marker 内部的所有
grapheme 合并成一个 segment。

### 布局与渲染

`render(width)`：

```
1. 计算 contentWidth / layoutWidth
2. layoutText(layoutWidth) → LayoutLine[]
     { text, hasCursor, cursorPos }
3. 最大可见行数 = max(5, 终端行数 * 30%)
4. 调整 scrollOffset 让光标可见
5. 渲染 top border（带向上滚动指示）
6. 渲染可见行：
     - 有光标 → 插入 CURSOR_MARKER + 反色假光标
     - 补齐右侧空白
7. 渲染 bottom border（带向下滚动指示）
8. 如果自动补全打开，在下面渲染列表
```

光标有两种：

- `CURSOR_MARKER`：给 TUI 定位硬件光标（IME 用）；
- `renderFakeCursor()`：用反色画一个可见光标。

### 输入处理

`handleInput(data)` 是一个大分派：

1. **jump mode**：等待下一个字符，执行 `jumpToChar`；
2. **bracketed paste**：`\x1b[200~ ... \x1b[201~`，缓冲完整后再处理；
3. **undo**；
4. **autocomplete 模式**：上下选择、Tab 应用、Enter 应用或提交；
5. **Tab**：触发补全；
6. **删除**：到行首/行尾/词/字符；
7. **kill ring**：`yank` / `yank-pop`；
8. **history**：上一条/下一条；
9. **光标移动**：行首/行尾/词/字符/页；
10. **提交**：Enter，或反斜杠+Enter 插入换行。

### 撤销

`pushUndoSnapshot()` 保存：

```ts
{ state, pastes, pasteCounter }
```

`undo()` 直接 `Object.assign` 回去。所有会改文本的操作前都会 push。

### Kill ring

- 删除词/行时把删除内容放进 `KillRing`；
- `yank()` 插入最近一条；
- `yankPop()` 只在刚 yank 后有效：删掉上次插入的内容，旋转 ring，再插入上一条；
- `lastAction` 用来判断是否允许 yank-pop。

### 历史

- `navigateHistory(±1)` 在历史里移动；
- 任何编辑动作都会 `exitHistoryBrowsing()`；
- 历史是编辑器自己的，不是 shell 历史。

### 自动补全

Provider 接口：

```ts
getSuggestions(lines, cursorLine, cursorCol, { signal, force })
applyCompletion(lines, cursorLine, cursorCol, item, prefix)
shouldTriggerFileCompletion?(...)
```

流程：

```
输入触发字符 / Tab
  → requestAutocomplete()
      → 取消上一个请求
      → 计算 debounce（附件路径有延迟，其他立即）
      → startAutocompleteRequest()
          → 等待上一个任务
          → 检查 startToken
          → AbortController
          → 快照 text / line / col
          → getSuggestions()
          → 检查请求仍然当前（id、abort、快照）
          → 显示 SelectList
```

关键点：**异步结果必须和快照匹配**，否则丢弃。避免用户已经继续输入，旧的补全结果
却弹出来。

Slash command 和文件补全走不同触发路径；`/` 开头且没有空格时是命令补全。

### 词换行

`wordWrapLine()`：

- 按 grapheme 切分；
- 优先在空白后断行；
- CJK 字符之间允许断行；
- paste marker 是原子片段，不拆；
- 单词比行宽还长时强制按字符断；
- 返回 `{ text, startIndex, endIndex }`，保持光标位置可映射。

## 2. Markdown

`components/markdown.ts` 约 1,160 行。

### 解析

基于 `marked`，加了几层扩展：

- **CJK 友好**：裸 URL 在 CJK 标点处停止；
- **严格删除线**：`~~text~~` 不能以空格开头/结尾；
- **LaTeX**：`$...$`、`$$...$$`、`\(...\)`、`\[...\]`；
- **表格保护**：`$$` 块不能跨表格，避免未闭合数学吞掉表格；
- **流式友好**：
  - 未闭合的代码围栏会被裁掉，避免最后几个字符到达时闪烁；
  - HTML 注释块在流式输出时保持隐藏；
  - 未闭合的 LaTeX 标记为 `pending`。

### 渲染

`render(width)`：

```
1. 命中缓存（text + width）直接返回
2. transform（可选）
3. tab → 3 空格
4. lexer 解析成 tokens（WeakRef 缓存）
5. 逐个顶层 block 渲染：
     - 按 token.raw 复用上一次的 RenderedBlock
     - 只有宽度或下一个 token 类型变化才重渲染
     - wrapTextWithAnsi 到内容宽度
     - 加左右 padding / 背景色
6. 加上下空行
7. 缓存结果
```

流式优化的核心：**只重渲染最后一个变化的 block**。一条长消息在流式输出时，
前面的块不变，只有最后一块在增长。

缓存策略：

- tokens 用 `WeakRef`：token 树大约是源文本的 10 倍，长会话里每个消息都留一份
  会很占内存；
- blocks 也用 `WeakRef`：流式/调整大小这种连续渲染期间保留，之后可回收；
- 有引用式链接定义时不复用 block，因为同一个 `raw` 可能渲染不同。

### 内联渲染

`renderInlineTokens()` 处理：

- 文本、强调、加粗、删除线；
- 行内代码；
- 链接（OSC 8 超链接）；
- 图片（交给 Image 组件）；
- LaTeX（交给 `renderLatex`）；
- 换行、HTML。

样式通过 `MarkdownTheme` 注入，默认文本样式单独处理：前景色在文本上，背景色在
整行 padding 阶段应用。

### 列表与表格

- 有序/无序列表按层级缩进；
- 列表项内部的嵌套 token 递归渲染；
- 表格按列计算宽度，单元格内容换行；
- 长单词会撑开列宽，但有最大宽度限制。

### 图片

`isImageLine()` 的行直接跳过换行和 padding，交给终端图片协议处理。

## 3. LaTeX

`latex.ts` 约 1,500 行，不是完整的排版引擎，而是**终端友好的近似渲染**：

- 大量符号映射（希腊字母、运算符、集合、箭头、积分、求和等）；
- 上标/下标、分数、根号、矩阵等用 Unicode 和布局近似；
- 目标是“可读”，不是“和浏览器一样”。

`renderLatex()` 接收 LaTeX 源和宽度，返回若干行文本。

## 4. 设计观察

1. **编辑器是一个完整的状态机**，不是简单的 textarea：撤销、kill ring、历史、
   词导航、jump mode、粘贴标记都在里面。
2. **paste marker 解决了大粘贴的交互问题**：逻辑上一个字符，显示上一行，
   提交时展开。
3. **渲染是光标感知的**：`LayoutLine` 带 `hasCursor` / `cursorPos`，TUI 据此
   定位硬件光标。
4. **自动补全是异步且可取消的**：快照校验防止过期结果。
5. **Markdown 为流式而设计**：block 级复用、WeakRef 缓存、未闭合围栏处理。
6. **LaTeX 是务实的 Unicode 近似**，不追求排版精度。

## 5. 尚未细读

- `autocomplete.ts`（858 行）：provider 组合、文件/命令补全的具体实现。
- `markdown.ts` 的表格、代码高亮、列表细节。
- `latex.ts` 的矩阵、分数、根号布局算法。
- `undo-stack.ts`、`kill-ring.ts` 的容量策略。
