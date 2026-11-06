# LaTeX、Autocomplete 与 Evals Docker

最后三个细节。

## 1. LaTeX

`latex.ts` 约 1,500 行，大部分是符号表。它不是排版引擎，而是**终端友好的
Unicode 近似**。

### 入口

```ts
renderLatex(source, { display?: boolean }): string | undefined
```

- 成功返回多行文本；
- 不支持的语法返回 `undefined`，调用方回退到原始 LaTeX 文本。

### 解析

`LatexParser` 是一个递归下降解析器：

- 命令（`\alpha`、`\frac`、`\sqrt`、`\sum`…）；
- 分组 `{...}`；
- 上标 `^` / 下标 `_`；
- 定界符 `\left...\right`；
- 环境 `\begin{...}...\end{...}`；
- 文本模式命令。

符号表覆盖希腊字母、运算符、集合、箭头、积分、求和、逻辑符号等。

### 布局节点

多行结构（矩阵、cases、堆叠的分数）不能直接拼字符串，所以：

```ts
type LayoutNode = { type: "matrix"; lines: string[]; baseline: number }
```

渲染时先插入占位符：

```
LAYOUT_MARKER_START + index + LAYOUT_MARKER_END
```

最后 `renderLayout()` 把节点展开到周围文本里，按 baseline 对齐。这样
`a + \begin{pmatrix}...\end{pmatrix} + b` 能把矩阵放在正确的高度。

### 环境

支持：

- `equation` / `equation*` / `displaymath`
- `aligned` / `align*` / `gather` / `multline` / `split`
- `cases`
- `array` / `matrix` / `pmatrix` / `bmatrix` / `Bmatrix` / `vmatrix` / `Vmatrix`

不支持的环境把 `supported` 设为 false，最终返回 undefined。

### display vs inline

`display: true` 时：

- 分数上下堆叠；
- 求和/积分上下限放在符号上方/下方；
- 矩阵按多行渲染。

inline 时保持单行紧凑。

### 对齐技巧

用 `PROTECTED_SPACE`（一个不可见的占位空格）做列对齐，最后统一替换成普通空格。

## 2. Autocomplete

`autocomplete.ts` 约 858 行。Editor 负责触发、debounce、取消、快照校验；
这里只负责**建议逻辑**。

### Provider 接口

```ts
interface AutocompleteProvider {
  triggerCharacters?: string[]
  getSuggestions(lines, line, col, { signal, force }): Promise<Suggestions | null>
  applyCompletion(lines, line, col, item, prefix): { lines, cursorLine, cursorCol }
  shouldTriggerFileCompletion?(lines, line, col): boolean
}
```

### CombinedAutocompleteProvider

一个 provider 处理三种上下文：

1. **`@` 文件附件**：模糊匹配文件路径；
2. **`/` 斜杠命令**：命令名，以及命令后的参数补全；
3. **普通路径**：文本里出现 `src/`、`./`、`~/` 时补全。

### 提取前缀

- `extractAtPrefix()`：找最后一个分隔符后的 token，若以 `@` 开头；
  - 支持引号包裹的 `@"path with space"`；
- `extractPathPrefix()`：
  - 引号前缀优先；
  - 自然触发：包含 `/`、以 `.` 或 `~/` 开头；
  - 空前缀 + 行首/空白后 → 触发文件列表；
  - 强制 Tab：总是返回。

### 命令补全

- `/` 后无空格 → 命令名；
- `skill:` 前缀同时按裸名和完整名匹配；
- `/command ` 后有空格 → 调用命令的 `getArgumentCompletions()`。

### 应用补全

`applyCompletion()` 分四种情况：

| 上下文 | 结果 |
|---|---|
| 命令名 | `/{name} `，光标 +2 |
| `@` 文件 | 目录不加空格，文件加空格 |
| 命令参数 | 替换参数，不加 `/` |
| 普通路径 | 替换路径 |

引号处理：如果 item 自带结尾引号，且光标后已有引号，就不重复添加。

### 文件建议

`getFileSuggestions()`：

- 展开 `~`；
- 用 `fd` 列文件（如果有 `fdPath`）；
- 支持作用域前缀（`src/`）；
- 打分：前缀匹配、模糊匹配、目录优先、隐藏文件降权；
- 返回 `{ value, label, description }`。

## 3. Evals Docker 沙箱

这是评测的安全边界。

### 镜像

`buildImages()`：

- 从 `docker/Dockerfile` 构建两个 target：
  - `without_docs`
  - `with_docs`
- 镜像名带仓库路径 hash，避免不同 checkout 冲突；
- 用 `docker image inspect` 拿 id。

两个镜像的差别只有：**是否包含 coding-agent 的 README / CHANGELOG / docs / examples**。

### 运行参数

`dockerArgs()`：

```
--rm
--read-only                          # 根文件系统只读
--tmpfs /tmp:rw,exec,mode=1777
--tmpfs /repo/node_modules/.vite-temp:rw,exec
--mount artifacts -> /artifacts
--env PI_EVAL_ARTIFACT_DIR=/artifacts
--env PI_EVAL_RUNS_PER_VARIANT
--env PI_EVAL_SANDBOX_UID=65532
--env PI_EVAL_SANDBOX_GID=65532
--env PI_PROVIDER / PI_MODEL
--mount auth.json -> /run/pi-eval-secrets/auth.json,readonly
```

宿主机是 POSIX 时还会传 `PI_EVAL_ARTIFACT_UID/GID`，让产物回到宿主用户。

### 容器入口

`docker/entrypoint.ts` 以 root 启动，先做完整性检查：

1. **工作区形状必须完全匹配**：
   - `/repo` 只能有 node_modules、package.json、packages、vitest.base.ts；
   - `/repo/packages` 只能有 evals；
   - evals 目录只能有 docker、evals、package.json、src、vitest 配置。
2. **内部依赖不能暴露文档**：
   - 不能有 docs、examples、src、test、tests；
   - 不能有 README、CHANGELOG。
3. **变体检查**：
   - `without_docs`：coding-agent 目录下不能有 README、CHANGELOG、docs、examples；
   - `with_docs`：这些必须存在且非空。
4. **评测源码不可被模型用户读取**：
   - eval 目录、src、docker、vitest 配置必须 root-only（0700 / 0600）；
   - 用 `spawnSync(uid/gid=65532)` 实际探测是否可读。
5. **coding-agent 必须从 dist 解析**，不能从源码。

然后：

```
HOME=/tmp/pi-eval-bootstrap
PI_CODING_AGENT_DIR=/tmp/pi-eval-host-agent
复制 auth.json 到 agentDir
chown agentDir 和 /artifacts 给 sandbox uid/gid
umask 022
```

最后运行 vitest：

- `--discover`：`vitest list --json=/artifacts/discovered-tests.json`
- 否则：`vitest run --reporter=vitest-evals/reporter --reporter=json --outputFile=/artifacts/vitest.json`

结束后把 `/artifacts` chown 回宿主 uid/gid。

### 安全模型

- 镜像内部是只读根文件系统；
- 只有 `/tmp` 和 vite 临时目录可写；
- 评测源码 root-only，模型用户读不到；
- 沙箱用户是 65532（非 root）；
- 认证通过只读 bind mount 注入；
- 产物通过 bind mount 取出。

这比“在开发机上直接跑 eval”严格得多。因为 eval 里的 agent 会执行工具，
必须假定它可能读写任何它能访问的东西。

## 4. 设计观察

1. **LaTeX 是“可读近似”**：不追求排版精度，遇到不支持就优雅回退。
2. **布局节点解决多行数学**：占位符 + baseline 对齐，让矩阵能嵌入行内。
3. **Autocomplete 是纯建议逻辑**：触发、取消、快照校验都在 editor。
4. **一个 provider 覆盖三种上下文**：`@`、`/`、普通路径。
5. **Evals 的镜像就是安全边界**：两个变体只差文档，其他完全一致。
6. **评测源码对模型不可见**：root-only + 实际探测，防止 agent 读到答案。
7. **只读根文件系统 + 非特权用户 + 只读凭据**：三层约束。

## 5. 尚未细读

- `latex.ts` 的完整符号表和分数/根号布局算法；
- `autocomplete.ts` 的 `fd` 调用与打分细节；
- `evals/src/cli.ts` 的调度；
- `docker/Dockerfile` 本身。
