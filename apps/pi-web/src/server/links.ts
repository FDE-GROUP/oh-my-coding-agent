/**
 * 会话与 GitHub Issue 的关联索引。
 *
 * @remarks
 * 存储在 `~/.pi-web/links.json`，权限 0600，原子写。一个会话最多关联一个 Issue。
 *
 * @internal
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAppConfig } from "./config.ts";

/**
 * Issue 关联记录。
 *
 * @internal
 */
export interface IssueLink {
	sessionId: string;
	repoId: string;
	number: number;
	title: string;
	url: string;
}

let cache: Map<string, IssueLink> | undefined;
let cachePath: string | undefined;

function storePath(): string {
	return join(dirname(getAppConfig().path), "links.json");
}

function load(): Map<string, IssueLink> {
	const path = storePath();
	if (cache && cachePath === path) return cache;
	cache = new Map();
	cachePath = path;
	if (!existsSync(path)) return cache;
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as { links?: IssueLink[] };
		for (const link of parsed.links ?? []) {
			if (link && typeof link.sessionId === "string") cache.set(link.sessionId, link);
		}
	} catch (error) {
		console.warn(`[pi-web] 无法读取 Issue 关联：${String(error)}`);
	}
	return cache;
}

function flush(): void {
	const path = storePath();
	const temp = `${path}.tmp`;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(temp, `${JSON.stringify({ links: [...load().values()] }, null, 2)}\n`);
	chmodSync(temp, 0o600);
	renameSync(temp, path);
}

/**
 * 记录会话的 Issue 关联。
 *
 * @param link - 关联记录。
 * @internal
 */
export function recordIssueLink(link: IssueLink): void {
	load().set(link.sessionId, link);
	flush();
}

/**
 * 读取会话的 Issue 关联。
 *
 * @param sessionId - 会话 id。
 * @returns 关联记录；不存在时返回 `undefined`。
 * @internal
 */
export function getIssueLink(sessionId: string): IssueLink | undefined {
	return load().get(sessionId);
}

/**
 * 删除会话的 Issue 关联。
 *
 * @param sessionId - 会话 id。
 * @internal
 */
export function removeIssueLink(sessionId: string): void {
	if (!load().delete(sessionId)) return;
	flush();
}

/**
 * 删除多个会话的关联。
 *
 * @param sessionIds - 会话 id 集合。
 * @internal
 */
export function removeIssueLinks(sessionIds: Iterable<string>): void {
	let changed = false;
	for (const id of sessionIds) {
		if (load().delete(id)) changed = true;
	}
	if (changed) flush();
}

/**
 * 清空内存缓存，仅供测试使用。
 *
 * @internal
 */
export function resetLinkCache(): void {
	cache = undefined;
	cachePath = undefined;
}
