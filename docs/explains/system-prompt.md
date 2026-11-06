# System Prompt 的组装

核心文件：

- `core/system-prompt.ts`（228 行）：分节、渲染、diff
- `core/skills.ts`（505 行）：技能发现与校验
- `core/prompt-templates.ts`（325 行）：模板加载与参数替换
- `core/resource-loader.ts`：AGENTS.md、SYSTEM.md 的发现

## 1. 组装发生在三个时刻

```
构造 AgentSession
  → _rebuildSystemPrompt(activeToolNames)
      收集 resourceLoader 的 systemPrompt / append / skills / contextFiles
      收集每个工具的 snippet / guidelines
      → normalizeBuildSystemPromptOptions()

每次 run 开始
  → _prepareRun()
      → emitBeforeAgentStart(trigger, baseOptions)
          扩展可以改 sections / selectedTools / systemPrompt
      → _preparePromptAndToolLoadout(runOptions)
          → diffSystemPromptSections(当前 sections, 新 sections)
          → 返回一条只含变化的 SystemMessage

每次请求前
  → agent loop 的 declareToolChanges()
      比较工具声明，追加 toolsAdded / toolsRemoved
```

## 2. 分节结构

`buildSystemPromptSections()` 的输出顺序：

| 节名 | 内容 | 是否 XML 包裹 |
|---|---|---|
| `preamble` | 默认身份说明，或 `customPrompt` 的完整替换 | 否 |
| `tools` | 每个可见工具一行 snippet | 是 |
| `rules` | 工具 guidelines + prompt guidelines + 默认两条 | 是 |
| `docs` | Pi 自己的文档/示例路径，仅在问及 harness 时使用 | 是 |
| `addendum` | `APPEND_SYSTEM.md` 或 `--append-system-prompt` | 是 |
| `project_context` | AGENTS.md / CLAUDE.md | 是 |
| `skills` | `<available_skills>` 列表 | 是 |
| `cwd` | 当前工作目录（反斜杠转正斜杠） | 是 |
| 自定义 | 扩展通过 `sections` 提供，名字需匹配 `^[a-z][a-z0-9_-]*$` | 是 |

`preamble` 是唯一不加标签的节。其余节用同名 XML 标签包裹，目的是让模型能把
“后续的 section patch”对应回原来的段落。

## 3. 默认 preamble 与 rules

默认 preamble 很短：

```
You are a coding assistant running inside pi, a coding agent harness.
Help users inspect files, run commands, and modify code.
```

`rules` 的内容：

- 如果只有 bash/powershell，没有 grep/find/ls，会加一条“用 shell 做文件操作”；
- 每个选中工具的 guidelines；
- 扩展提供的 `promptGuidelines`；
- 固定两条：`Be concise in your responses`、`Show file paths clearly when working with files`。

去重按 trim 后的完整字符串。

## 4. 差异更新而不是整体替换

`diffSystemPromptSections(previous, current)`：

- 新节或内容变化的节 → 写入新值；
- 旧节在新集合中不存在 → 写入 `null`（删除）；
- 返回 `SystemMessage.sections` 补丁，没有变化则返回 undefined。

这条补丁会作为一条 mid-conversation system message 进入 transcript。
模型重放时按名字覆盖，所以只有变化的部分破坏缓存前缀。

`forceSystemPrompt` 是例外：它返回 `{ content, sections: undefined }`，
作为完整的 leading system prompt 投影到请求上，但 transcript 仍保留结构化节。

## 5. AGENTS.md / CLAUDE.md 的发现

`loadProjectContextFiles()`：

```
1. 全局：<agentDir>/AGENTS.override.md | AGENTS.md | AGENTS.MD | CLAUDE.md | CLAUDE.MD
2. 从 cwd 向上遍历到根，收集每一级的同名文件
3. 祖先文件按“根 → 近”的顺序插入（unshift）
4. 去重按路径
5. 链接 worktree 会跳过被主仓库同名文件遮蔽的副本
```

最终顺序是：全局 → 最远祖先 → … → 当前目录。越靠近当前目录的说明越靠后。

## 6. SYSTEM.md 与 APPEND_SYSTEM.md

| 文件 | 作用 | 优先级 |
|---|---|---|
| `.pi/SYSTEM.md` | 替换默认 preamble（作为 `customPrompt`） | 项目受信任时优先 |
| `~/.pi/agent/SYSTEM.md` | 同上，全局 | 项目无文件时使用 |
| `.pi/APPEND_SYSTEM.md` | 追加到 `addendum` 节 | 项目受信任时优先 |
| `~/.pi/agent/APPEND_SYSTEM.md` | 同上，全局 | 项目无文件时使用 |

项目级文件只有在项目受信任时才会被读取。

## 7. Skills

### 发现规则

```
目录含 SKILL.md
  → 把它当作 skill root，不再递归

否则
  → 根目录的直接 .md 文件（includeRootFiles 时）
  → 递归子目录寻找 SKILL.md
```

默认位置：

```
~/.pi/agent/skills/
<cwd>/.pi/skills/
```

再加上 package 提供的 skills 和显式路径。同名冲突时先到先得，并产生 collision 诊断。

### 校验

| 字段 | 规则 |
|---|---|
| `name` | ≤64 字符，小写 a-z/0-9/连字符，不以连字符开头/结尾，不能有 `--` |
| `description` | 必填，≤1024 字符 |
| `disable-model-invocation` | 为 true 时不进入 prompt，但仍可通过 `/skill:name` 调用 |

名称缺省时用父目录名。校验失败只产生 warning，仍然加载；只有 description
缺失才不加载。

### Prompt 中的形式

```xml
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>/abs/path/SKILL.md</location>
  </skill>
</available_skills>
```

只有存在可用的 `read` 或 `bash` 工具时才加入这一节。技能正文不在 prompt 里，
模型需要时自己读 `SKILL.md`。这是按需加载，不是全量注入。

## 8. Prompt Templates

### 位置与命名

```
~/.pi/agent/prompts/*.md
<cwd>/.pi/prompts/*.md
package 提供的 prompts
显式路径
```

目录扫描是非递归的。模板名 = 文件名去掉 `.md`。

### frontmatter

```yaml
---
description: 一行说明
argument-hint: "<file>"
---
```

description 缺省时取正文第一行，截断到 60 字符。

### 参数替换

支持：

| 语法 | 含义 |
|---|---|
| `$1` | 第 1 个参数 |
| `$@` / `$ARGUMENTS` | 全部参数 |
| `${N:-default}` | 第 N 个参数，缺失时用默认值 |
| `${@:-default}` | 全部参数，为空时用默认值 |
| `${@:N}` | 从第 N 个开始的全部参数 |
| `${@:N:L}` | 从第 N 个开始的 L 个参数 |

替换只发生在模板字符串上，参数和默认值里的 `$1` 不会被递归替换。

### 展开时机

`AgentSession._preparePrompt()` 在 input 钩子之后、run 开始之前：

```
/skill:name args → 读取 SKILL.md 正文，包成 <skill> 块
/name args       → 展开为模板内容
```

## 9. 一个完整的 prompt 生命周期

```
resourceLoader.reload()
  → 读取 SYSTEM.md / APPEND_SYSTEM.md
  → 读取 AGENTS.md
  → 读取 skills
  → 读取 prompt templates

AgentSession._rebuildSystemPrompt()
  → normalize options

run 开始
  → before_agent_start 可改 options
  → _preparePromptAndToolLoadout()
      → buildSystemPromptSections()
      → diff 当前 sections
      → 返回补丁消息

请求
  → agent loop declareToolChanges()
  → provider 收到：leading system + 若干 section patch + 工具增量
```

## 10. 值得记住的设计点

1. **prompt 是分节 + 差异更新**，不是每次重建一个长字符串。
2. **preamble 不加标签**，其余节加同名标签，便于模型匹配后续 patch。
3. **AGENTS.md 从根到当前目录**，越靠近 cwd 的说明越靠后。
4. **项目级 SYSTEM.md / APPEND_SYSTEM.md 受信任门控**。
5. **skills 按需读取**，prompt 里只有元数据。
6. **prompt template 是纯文本替换**，不进入扩展命令体系。
7. **`forceSystemPrompt` 只投影到请求**，不改 transcript 的结构化节。

## 11. 尚未确认

- `before_agent_start` 修改 `sections` 后，`diffSystemPromptSections` 与工具声明
  更新的相对顺序（当前看是：先 prompt 补丁，再由 agent loop 声明工具变化）。
- `customPrompt` 与 `SYSTEM.md` 同时存在时的覆盖细节（当前看是
  `SYSTEM.md` 作为 `customPrompt` 传入）。
