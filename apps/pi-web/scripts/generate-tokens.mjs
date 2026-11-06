/**
 * 从 DSH 主题源文件生成 Pi Web 使用的 `--dsw-*` token 子集。
 *
 * @remarks
 * DSH 的 token 表是 MIT 许可；本脚本只提取 Web UI 实际使用的别名，并把
 * 它们引用的静态色阶一并带上。生成的 CSS 单独提交，正常构建不依赖 DSH 源码。
 *
 * 用法：`node scripts/generate-tokens.mjs [--source <dir>]`
 *
 * @internal
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE = "/tmp/opencode/deepseek-harness/packages/client/ui-theme/src/styles";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/tokens/generated.css");

const USED_TOKENS = [
	"--dsw-alias-bg-base",
	"--dsw-alias-bg-layer-1",
	"--dsw-alias-bg-layer-2",
	"--dsw-alias-bg-layer-3",
	"--dsw-alias-bg-overlay",
	"--dsw-alias-bg-mask-1",
	"--dsw-alias-bg-document-selection",
	"--dsw-alias-label-primary",
	"--dsw-alias-label-secondary",
	"--dsw-alias-label-tertiary",
	"--dsw-alias-label-primary-inverted",
	"--dsw-alias-label-primary-dimmed",
	"--dsw-alias-border-l1",
	"--dsw-alias-border-l2",
	"--dsw-alias-border-l3",
	"--dsw-alias-border-l4",
	"--dsw-alias-state-business-primary",
	"--dsw-alias-state-error-primary",
	"--dsw-alias-state-warn-primary",
	"--dsw-alias-state-success-primary",
	"--dsw-alias-state-done-primary",
	"--dsw-alias-link",
	"--dsw-alias-menu-icon",
	"--dsw-alias-scrollbar-bg-l1",
	"--dsw-alias-scrollbar-hover-l1",
];

function readSourceArgument() {
	const index = process.argv.indexOf("--source");
	if (index !== -1 && process.argv[index + 1]) return resolve(process.argv[index + 1]);
	return resolve(process.env.DSH_THEME_DIR ?? DEFAULT_SOURCE);
}

function stripComments(text) {
	return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function readBlocks(css) {
	const blocks = [];
	let index = 0;
	while (index < css.length) {
		const open = css.indexOf("{", index);
		if (open === -1) break;
		const selector = css.slice(index, open).trim();
		let depth = 1;
		let cursor = open + 1;
		while (cursor < css.length && depth > 0) {
			if (css[cursor] === "{") depth += 1;
			else if (css[cursor] === "}") depth -= 1;
			cursor += 1;
		}
		if (depth !== 0) throw new Error(`Unbalanced block for selector ${JSON.stringify(selector)}`);
		blocks.push({ selector, body: css.slice(open + 1, cursor - 1) });
		index = cursor;
	}
	return blocks;
}

function declarations(body) {
	const map = new Map();
	for (const part of body.split(";")) {
		const colon = part.indexOf(":");
		if (colon === -1) continue;
		const name = part.slice(0, colon).trim();
		const value = part.slice(colon + 1).trim();
		if (name.startsWith("--")) map.set(name, value.replace(/\s+/g, " ").trim());
	}
	return map;
}

function merge(target, source) {
	for (const [key, value] of source) target.set(key, value);
}

function collectToken(name, map, fallback, out) {
	const value = map.get(name) ?? fallback.get(name);
	if (value === undefined) {
		throw new Error(`Token ${name} is not defined in the DSH source`);
	}
	out.set(name, value);
	for (const match of value.matchAll(/var\((--[a-z0-9-]+)/gi)) {
		collectToken(match[1], map, fallback, out);
	}
}

function orderedTokens(tokens) {
	const entries = [...tokens.entries()];
	entries.sort(([a], [b]) => {
		const staticA = a.startsWith("--dsw-static-");
		const staticB = b.startsWith("--dsw-static-");
		if (staticA !== staticB) return staticA ? -1 : 1;
		return a.localeCompare(b);
	});
	return entries;
}

function block(selector, tokens) {
	const lines = orderedTokens(tokens).map(([name, value]) => `\t${name}: ${value};`);
	return `${selector} {\n${lines.join("\n")}\n}`;
}

function readDshVersion(source) {
	for (const relative of ["../../../../../package.json", "../../../package.json", "../../package.json"]) {
		try {
			const version = JSON.parse(readFileSync(join(source, relative), "utf8")).version;
			if (version) return version;
		} catch {
			// Try the next candidate.
		}
	}
	return "unknown";
}

const source = readSourceArgument();
const palettePath = join(source, "design-platform.css");
const palette = stripComments(readFileSync(palettePath, "utf8"));

const light = new Map();
const dark = new Map();
for (const { selector, body } of readBlocks(palette)) {
	if (selector === "body") merge(light, declarations(body));
	else if (selector.includes("body[data-ds-dark-theme]")) merge(dark, declarations(body));
}

const lightOut = new Map();
const darkOut = new Map();
for (const token of USED_TOKENS) {
	collectToken(token, light, light, lightOut);
	collectToken(token, dark, light, darkOut);
}

const dshVersion = readDshVersion(source);
const header = [
	"/*",
	" * 由 apps/pi-web/scripts/generate-tokens.mjs 生成，不要手工编辑。",
	` * 来源：DSH ${dshVersion}，packages/client/ui-theme/src/styles/design-platform.css（MIT）。`,
	" * 仅包含 Pi Web 使用的 --dsw-* token 子集。",
	" */",
	"",
].join("\n");

const output = `${header}${block(":root", lightOut)}\n\n${block('[data-theme="dark"]', darkOut)}\n`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, output);

console.log(`generated ${OUT}`);
console.log(`light tokens: ${lightOut.size}, dark tokens: ${darkOut.size}`);
