# 统一文档站：apps/docs-site 构建与发布机制

这篇记录 `apps/docs-site` 怎么把仓库文档变成一个静态站，以及怎么维护它。
它是机制说明，不是设计提案；设计决策记在 `docs/specs/vision.md` 的
「2026-11-06：新增 `apps/docs-site` 统一文档站」条目。

站点用 [Blume](https://useblume.dev)（Astro + Vite，纯静态，MIT）构建，同时面向
人和 coding agent。发布到 `pages` 分支，线上地址
`https://fde-group.github.io/oh-my-fde/`（base path `/oh-my-fde`）。

## 包结构

```
apps/docs-site/
  blume.config.ts        # 站点配置（strict schema 校验）
  package.json           # @omfde/docs-site，private，blume 精确 pin 2.2.6
  scripts/sync.mjs       # 镜像 + 清洗内容到包内 content/
  scripts/publish.mjs    # 发布 dist/ 到 pages 分支
  seed/                  # 手写的 4 篇 landing（首页 + 三区首页）
  content/  .blume/  dist/  node_modules/   # 全部 gitignore，构建产物
```

`content/` 是 `sync.mjs` 生成的镜像，不进 git；改内容要改源头（`docs/`、
`.qoder/repowiki/`）或 `seed/`，再重新 `sync`。

## 内容来源与分区

`sync.mjs` 从三处只读收集 Markdown，映射到站的三个区：

| 源 | 站分区 | 路由前缀 |
|---|---|---|
| `docs/**` | 项目文档 | `/docs` |
| `.qoder/repowiki/zh/content/**` | 仓库 Wiki | `/wiki` |
| `.qoder/repowiki/knowledge/zh/**` | 架构知识卡 | `/knowledge` |

明确排除 `packages/coding-agent/docs`（那是 Pi 产品用户文档，受众不同，且是
Mintlify 格式）。三个分区在 `blume.config.ts` 里用 `navigation.tabs` 拆成三个
header tab，每个 tab 把侧栏限定到本区——400+ 页跨三源，tab 比单一侧栏清晰。

## 构建流程

`pnpm --filter @omfde/docs-site build` = `node scripts/sync.mjs && blume build`。

`sync.mjs` 每次先 `rmSync(content/)` 再重建（幂等），对每个源文件：

1. **清洗链接**：把 repowiki 里的 `file://` 绝对路径改写成 GitHub blob 外链
   （base `https://github.com/FDE-GROUP/oh-my-fde/blob/main`），并剥掉 `<cite>` 块。
   `blume.config.ts` 开 `markdown.externalLinks: true`，外链在新标签打开。
2. **改首页名**：Blume 只认 `index.md` 作文件夹首页，不认 `README.md`，故
   `README.md` → `index.md`。
3. **转换 frontmatter**：6 个 knowledge 总览页带非标准 frontmatter
   （`kind`/`name`/`category`/`scope`/`source_files`），Blume 的 strict schema 不认。
   sync 把它们转成 Blume 原生 `title` + 一个可见的「知识卡元数据」引用块，避免
   为此引入 schema 依赖。
4. **合并 seed**：最后 `cpSync(seed/, content/, { recursive: true })`，把 4 篇手写
   landing 并进镜像（seed 覆盖同名生成页）。

`blume build` 产出 `dist/`，约 426 页，纯静态、零 server、零 AI 成本。

## 路由与 base path（易踩坑）

- **数字前缀剥离并排序**：`00-baseline.md` → `/docs/explains/baseline`；`docs/explains`
  的 00–27 顺序自动解析，无需在 config 声明。
- **中文文件名** → percent-encoded URL，可用。
- **文件夹同名 .md** → 双段路由（`/knowledge/X/X`）；`概述.md` → `/knowledge/X/概述`。
- **内部链接写 root-relative 且不带 base**：markdown 里写 `/docs`，Blume 构建时自动
  补 base → `/oh-my-fde/docs`；已带 base 的原样保留。所以 seed/源文档里不要手写
  `/oh-my-fde` 前缀。
- **链接目标含空格要用 `<...>` 角括号**，否则 markdown 解析断裂。带空格的中文模块
  路由因此在 landing 里用散文 + 侧栏导航，而不是硬写链接，避免死链。

## 发布流程

`pnpm --filter @omfde/docs-site run deploy` 跑 `scripts/publish.mjs`，**默认 dry-run**：
只构建、在 `/tmp` 模拟拷贝、打印将执行的 git 动作，不碰 `pages`、不 push。加
`--publish`（即 `run deploy:publish`）才真正发布。

命令必须带显式 `run`：`pnpm --filter … deploy`（省略 `run`）会被 pnpm 内建的
`pnpm deploy` 命令遮蔽，报 `ERR_PNPM_INVALID_DEPLOY_TARGET` 而不会跑到包脚本。

真发布时脚本：

1. `git worktree add /tmp/omfde-pages pages`——在**共享 worktree 之外**建专用
   worktree，不动当前工作区（AGENTS 硬规则：`pages` publish-only，共享 worktree
   不切分支）。
2. 清空 worktree（保留 `.git`），整站替换。
3. `assemble`：`cpSync(dist/, worktree)` + **补写 `.nojekyll`**。Blume 不产出
   `.nojekyll`，但 `dist/` 含 `_astro/`、`_headers`、`.well-known/`；GitHub Pages 的
   Jekyll 默认忽略 `_`/`.` 开头路径，缺这个文件这些资源会 404。
4. `git add -A`（仅此专用 worktree 的例外；共享 worktree 仍禁 `-A`）→ 普通 commit
   （`docs(pages): publish unified docs site (blume)`，**不 force push**）→
   `git push origin pages` → `git worktree remove`。

发布到 `pages` 是不可逆的共享远端动作，须决策者逐项授权后才跑 `--publish`。

## 面向 agent 的表面

Blume 静态生成，无需 server：`llms.txt` / `llms-full.txt`、每页 `.md` + `.mdx` 镜像、
JSON docs API、`/blume-search.json`、`agent-readability.json`、`skill.md`、
`.well-known/{api-catalog,ai-catalog.json,ard.json,agent-skills/index.json}`、`_headers`、
`404.{html,json,md}`。`agents.mcp.enabled` 关（MCP server 需 server output，纯静态形态
不开），保留日后经 deployment adapter 升级的路径。

## 配置要点

- `seo.og.enabled: false`——OG 图会给每页产一张 PNG，把 `dist` 从 ~76M 撑到 ~100M；
  文档站社交分享价值低，关掉保持产物精简、构建更快。
- `seo.robots: true`（默认，`Content-Signal: ai-train=yes`），与「文档内容全部公开」
  的既定口径一致；Blume 只有 robots 开/关，无细粒度 ai-train 旋钮。
- `deployment.{site,base}` 才是 base path 的正确配置键（不是顶层 Astro base）。
- `github.{owner,repo,branch}` 驱动页脚 repo 链接与 agent manifest；内容页是 gitignore
  产物，故不产生 Edit on GitHub 链接（Blume 自动跳过被 git 忽略的文件）。

## 维护注意

- `blume` 精确 pin `2.2.6`（AGENTS：直接依赖固定精确版本）。升级前先读 changelog。
- Blume 会在包内生成 `.blume/package.json`（含通配依赖）。`scripts/check-pinned-deps.mjs`
  的 `ignoredDirectories` 已加入 `.blume`，否则 pinned-deps 门禁会误报。
- 改内容后重跑 `sync`；`content/` 是产物，不要手改、不要提交。
- 需要 Node ≥ 22.19（Blume 要求）。
- 同一 cwd 可能有多会话并发；发布用专用 worktree，提交只 stage 自己的显式路径。

## 验证

- `pnpm --filter @omfde/docs-site check`（`blume doctor && blume validate`）：无问题、零死链。
- 根 `pnpm run check` 全绿（`apps/docs-site/scripts/*.mjs` 受 biome 管；无 `src/`，
  不进 tsc/tsdoc 作用域）。
- 发布后线上抽查：首页、`/docs` landing、`/llms.txt` 均正确，内部链接带 `/oh-my-fde` base。
