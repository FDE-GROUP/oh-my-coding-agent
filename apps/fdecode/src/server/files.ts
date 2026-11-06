/**
 * 项目文件搜索与 `@file` 展开。
 *
 * @remarks
 * 只允许项目目录内的普通文件。所有路径在 `realpath` 后重新校验，阻止 `..`
 * 与符号链接逃逸。文本按 Pi CLI 的 `<file>` 格式包裹，图片转为 base64 附件。
 *
 * @internal
 */
import type { Dirent } from "node:fs";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { detectSupportedImageMimeTypeFromFile } from "@earendil-works/pi-coding-agent";

/** 文本文件大小上限。 */
const TEXT_LIMIT_BYTES = 256 * 1024;
/** 图片文件大小上限。 */
const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;
/** 单次搜索最多访问的条目数。 */
const MAX_VISITED = 50_000;
const EXCLUDED_DIRS = new Set([".git", "node_modules", "dist", ".tanstack", ".next", "coverage", ".turbo"]);
const DENIED_SEGMENTS = new Set([".git", ".ssh", "node_modules"]);
const DENIED_NAMES = new Set([".env", ".npmrc", "auth.json", "id_rsa", "id_ed25519"]);
const DENIED_SUFFIXES = [".pem", ".key", ".p12", ".pfx"];

function isSensitive(path: string): boolean {
	const segments = path.split(sep);
	if (segments.some((segment) => DENIED_SEGMENTS.has(segment))) return true;
	const name = segments.at(-1) ?? "";
	if (DENIED_NAMES.has(name)) return true;
	if (name.startsWith(".env.")) return true;
	return DENIED_SUFFIXES.some((suffix) => name.toLowerCase().endsWith(suffix));
}

/**
 * 文件候选。
 *
 * @internal
 */
export interface FileCandidate {
	/** 相对于项目目录的路径。 */
	path: string;
}

/**
 * 展开后的图片附件。
 *
 * @internal
 */
export interface ExpandedImage {
	type: "image";
	mimeType: string;
	data: string;
}

/**
 * 展开结果。
 *
 * @internal
 */
export interface ExpandedFiles {
	text: string;
	images: ExpandedImage[];
	notes: string[];
}

/**
 * 搜索项目文件。
 *
 * @param root - 工作区根目录。
 * @param query - 文件名或路径片段，大小写不敏感。
 * @param limit - 最多返回数量，默认 100。
 * @returns 匹配的相对路径。
 * @internal
 */
export async function searchFiles(root: string, query: string, limit = 100): Promise<FileCandidate[]> {
	const needle = query.toLowerCase();
	const results: string[] = [];
	let visited = 0;

	const stack = [root];
	while (stack.length > 0 && results.length < limit && visited < MAX_VISITED) {
		const current = stack.pop();
		if (!current) break;
		let entries: Dirent[];
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (results.length >= limit || visited >= MAX_VISITED) break;
			if (entry.isSymbolicLink()) continue;
			if (entry.isDirectory()) {
				if (EXCLUDED_DIRS.has(entry.name)) continue;
				if (entry.name.startsWith(".") && entry.name !== ".pi") continue;
				stack.push(join(current, entry.name));
				continue;
			}
			if (!entry.isFile()) continue;
			visited++;
			const absolute = join(current, entry.name);
			const path = relative(root, absolute);
			if (path.toLowerCase().includes(needle)) results.push(path);
		}
	}

	return results.map((path) => ({ path }));
}

function inside(root: string, candidate: string): boolean {
	return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function readText(path: string): Promise<string> {
	const content = await readFile(path, "utf-8");
	return content.replace(/^\uFEFF/, "");
}

/**
 * 展开 `@file` 引用。
 *
 * @param rootPath - 工作区根目录。
 * @param paths - 相对工作区的路径。
 * @returns 拼接后的文本、图片附件与跳过说明。
 * @internal
 */
export async function expandFiles(rootPath: string, paths: string[]): Promise<ExpandedFiles> {
	const root = await realpath(rootPath);
	const textParts: string[] = [];
	const images: ExpandedImage[] = [];
	const notes: string[] = [];

	for (const path of paths) {
		let absolute: string;
		try {
			absolute = await realpath(resolve(root, path));
		} catch {
			notes.push(`${path}: 文件不存在`);
			continue;
		}
		if (!inside(root, absolute)) {
			notes.push(`${path}: 不在项目目录内`);
			continue;
		}
		if (isSensitive(relative(root, absolute))) {
			notes.push(`${path}: 敏感文件已跳过`);
			continue;
		}

		const info = await stat(absolute);
		if (!info.isFile()) {
			notes.push(`${path}: 不是普通文件`);
			continue;
		}
		if (info.size === 0) {
			notes.push(`${path}: 跳过空文件`);
			continue;
		}

		const mimeType = await detectSupportedImageMimeTypeFromFile(absolute);
		if (mimeType) {
			if (info.size > IMAGE_LIMIT_BYTES) {
				notes.push(`${path}: 图片超过 10MB`);
				continue;
			}
			const data = await readFile(absolute);
			images.push({ type: "image", mimeType, data: data.toString("base64") });
			textParts.push(`<file name="${absolute}"></file>\n`);
			continue;
		}

		if (info.size > TEXT_LIMIT_BYTES) {
			notes.push(`${path}: 文本超过 256KB`);
			continue;
		}
		const content = await readText(absolute);
		if (content.includes("\u0000")) {
			notes.push(`${path}: 二进制文件`);
			continue;
		}
		textParts.push(`<file name="${absolute}">\n${content}\n</file>\n`);
	}

	return { text: textParts.join(""), images, notes };
}
