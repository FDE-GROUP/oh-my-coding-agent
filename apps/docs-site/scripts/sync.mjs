#!/usr/bin/env node
// 把仓库根的 docs/ 与 .qoder/repowiki/ 镜像进包内 content/，做分区与清洗。
// content/ 是 gitignore 的构建产物；每次运行先清空再重建，保证幂等。
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../..");
const contentRoot = join(packageRoot, "content");

// file:// 死链改写到的 GitHub blob 前缀（remote FDE-GROUP/oh-my-fde，分支 main）。
const githubBlobBase = "https://github.com/FDE-GROUP/oh-my-fde/blob/main";

// 源目录（相对 repoRoot）→ content/ 分区名。
const partitions = [
	{ src: "docs", dest: "docs" },
	{ src: ".qoder/repowiki/zh/content", dest: "wiki" },
	{ src: ".qoder/repowiki/knowledge/zh", dest: "knowledge" },
];

// 递归收集 dir 下所有 .md 文件，返回相对 base 的路径列表。
function collectMarkdown(dir, base, acc) {
	const out = acc ?? [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			collectMarkdown(full, base, out);
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			out.push(relative(base, full));
		}
	}
	return out;
}

// 清洗单篇 Markdown：file:// → GitHub blob（保留 #L 行锚点）；剥离 <cite> 标签，保留其内引用列表。
function cleanMarkdown(text) {
	return text.replace(/file:\/\/([^\s)]+)/g, `${githubBlobBase}/$1`).replace(/<\/?cite>/g, "");
}

// 文件夹内的 README.md → index.md（Blume 只把 index 当文件夹首页，README 会变成 /README 页）。
function destName(name) {
	return name === "README.md" ? "index.md" : name;
}

// 这 6 个 knowledge 模块总览页带自定义 frontmatter（kind/name/category/scope/source_files），Blume
// 严格校验会拒绝未知键、且正文无 H1。这里把它转成 blume 原生 title + 正文可见的元数据块（零新依赖）。
function splitFrontmatter(text) {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	return match ? { block: match[1], body: text.slice(match[0].length) } : null;
}

// 解析固定的简单 frontmatter 子集：顶层 `key: value` 标量，与 `key:` 后缩进的 `- item` 字符串数组。
function parseFrontmatter(block) {
	const data = {};
	let listKey = null;
	for (const line of block.split("\n")) {
		const item = line.match(/^\s+-\s*(.*)$/);
		if (item && listKey) {
			data[listKey].push(item[1].trim().replace(/^['"]|['"]$/g, ""));
			continue;
		}
		const scalar = line.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
		if (scalar) {
			const value = scalar[2].trim().replace(/^['"]|['"]$/g, "");
			if (value === "") {
				listKey = scalar[1];
				data[listKey] = [];
			} else {
				listKey = null;
				data[scalar[1]] = value;
			}
		}
	}
	return data;
}

// frontmatter 值可能是标量或字符串数组，统一成数组。
function asList(value) {
	if (Array.isArray(value)) {
		return value;
	}
	return value ? [value] : [];
}

function toBlobLink(path) {
	return `[\`${path}\`](${githubBlobBase}/${path})`;
}

// 有 frontmatter 则改写为 title + 元数据引用块；无则原样返回（其余 415 篇走这条）。
function transformFrontmatter(text) {
	const parts = splitFrontmatter(text);
	if (!parts) {
		return text;
	}
	const data = parseFrontmatter(parts.block);
	const title = data.name ?? data.title ?? "";
	const meta = ["> **知识卡元数据**（Repo Wiki 自动生成，可能过时）", ">"];
	const kind = data.kind ?? data.category;
	if (kind) {
		meta.push(`> - 类型：\`${kind}\``);
	}
	const scope = asList(data.scope);
	if (scope.length > 0) {
		meta.push(`> - 适用范围：${scope.map((entry) => `\`${entry}\``).join("、")}`);
	}
	const files = asList(data.source_files);
	if (files.length > 0) {
		meta.push(`> - 覆盖源文件（${files.length}）：${files.map(toBlobLink).join("、")}`);
	}
	const head = `---\ntitle: ${JSON.stringify(String(title))}\n---\n`;
	const body = parts.body.replace(/^\s+/, "");
	return `${head}\n${meta.join("\n")}\n\n${body}`;
}

// MDX 把 `<` 当 JSX 标签、`{`/`}` 当表达式；repowiki 是机器生成的，正文里散布字面占位符（<cwd>）、
// 泛型（Promise<void>）、模板（{VAR}）与对象形状（{ a, b }）——这些在 .md 里是纯文本，在 .mdx 里会编译
// 失败。这些页面不使用任何真实内联 HTML 或 MDX 表达式，故把代码栅栏、行内代码与裸链接（自动成链，其
// 中的 `{}` 由 GFM 链接消化，无需转义）之外的 `<`/`{`/`}` 转义，使 .mdx 把它们渲染回字面文本。转义是通用
// 规则而非黑名单，对 repowiki 重新生成同样稳健。
function sanitizeMdxProse(text) {
	const lines = text.split("\n");
	const out = [];
	let inFence = false;
	let fenceMarker = "";
	let inFrontmatter = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (i === 0 && line.trim() === "---") {
			inFrontmatter = true;
			out.push(line);
			continue;
		}
		if (inFrontmatter) {
			out.push(line);
			if (line.trim() === "---") {
				inFrontmatter = false;
			}
			continue;
		}
		const fence = line.match(/^\s*(```|~~~)/);
		if (fence) {
			if (!inFence) {
				inFence = true;
				fenceMarker = fence[1];
			} else if (line.includes(fenceMarker)) {
				inFence = false;
			}
			out.push(line);
			continue;
		}
		if (inFence) {
			out.push(line);
			continue;
		}
		out.push(
			line.replace(/(`[^`]*`)|(https?:\/\/[^\s<>]+)|([<{}])/g, (match, code, url, special) =>
				code || url ? match : `\\${special}`,
			),
		);
	}
	return out.join("\n");
}

// 幂等：清空本包 content/ 产物目录（路径由 packageRoot 派生，恒指向包内，不误删他处）。
rmSync(contentRoot, { recursive: true, force: true });
mkdirSync(contentRoot, { recursive: true });

let mirrored = 0;
for (const { src, dest } of partitions) {
	const srcDir = join(repoRoot, src);
	if (!statSync(srcDir, { throwIfNoEntry: false })?.isDirectory()) {
		console.warn(`[sync] 跳过缺失源：${src}`);
		continue;
	}
	for (const rel of collectMarkdown(srcDir, srcDir)) {
		const segments = rel.split("/");
		segments[segments.length - 1] = destName(segments[segments.length - 1]);
		const target = join(contentRoot, dest, segments.join("/"));
		mkdirSync(dirname(target), { recursive: true });
		const raw = readFileSync(join(srcDir, rel), "utf8");
		const cleaned = cleanMarkdown(transformFrontmatter(raw));
		// mermaid 是 Blume 的 MDX-only 特性：含 mermaid fence 的页面输出为 .mdx 才能渲染成图，并转义正文中
		// 会被 MDX 误读为 JSX/表达式的字面 `<`/`{`/`}`（详见 sanitizeMdxProse）。
		const asMdx = /^```mermaid/m.test(cleaned);
		writeFileSync(
			asMdx ? target.replace(/\.md$/, ".mdx") : target,
			asMdx ? sanitizeMdxProse(cleaned) : cleaned,
			"utf8",
		);
		mirrored += 1;
	}
	console.log(`[sync] ${src} → content/${dest}`);
}

// 首页与各分区落地页来自 tracked seed/（content/ 是 gitignore 生成目录，authored 文件不能常驻其中）。
const seedDir = join(packageRoot, "seed");
if (statSync(seedDir, { throwIfNoEntry: false })?.isDirectory()) {
	cpSync(seedDir, contentRoot, { recursive: true });
	console.log("[sync] seed/ → content/（首页 + 分区落地页）");
}

console.log(`[sync] 完成：镜像 ${mirrored} 篇 Markdown 到 ${relative(repoRoot, contentRoot)}/`);
