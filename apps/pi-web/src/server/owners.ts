/**
 * 会话归属旁路索引。
 *
 * @remarks
 * Pi 的 session 文件不记录 owner。这里用 `~/.pi-web/sessions.json` 维护
 * `session id → owner + workspace`，写入使用临时文件 + rename，权限 0600。
 *
 * @internal
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAppConfig } from "./config.ts";

/**
 * 一条归属记录。
 *
 * @internal
 */
export interface SessionOwner {
	/** Pi session id。 */
	id: string;
	/** 用户 id。 */
	owner: string;
	/** 工作区 id。 */
	workspaceId: string;
	/** 最后更新时间戳。 */
	updatedAt: number;
}

let cache: Map<string, SessionOwner> | undefined;
let cachePath: string | undefined;

function indexPath(): string {
	return join(dirname(getAppConfig().path), "sessions.json");
}

function load(): Map<string, SessionOwner> {
	const path = indexPath();
	if (cache && cachePath === path) return cache;
	cache = new Map();
	cachePath = path;
	if (!existsSync(path)) return cache;
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as { sessions?: SessionOwner[] };
		for (const entry of parsed.sessions ?? []) {
			if (entry && typeof entry.id === "string" && typeof entry.owner === "string") cache.set(entry.id, entry);
		}
	} catch (error) {
		console.warn(`[pi-web] 无法读取会话索引：${String(error)}`);
	}
	return cache;
}

function flush(): void {
	const path = indexPath();
	const temp = `${path}.tmp`;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(temp, `${JSON.stringify({ sessions: [...load().values()] }, null, 2)}\n`);
	chmodSync(temp, 0o600);
	renameSync(temp, path);
}

/**
 * 记录会话归属。
 *
 * @param id - Pi session id。
 * @param owner - 用户 id。
 * @param workspaceId - 工作区 id。
 * @internal
 */
export function recordSessionOwner(id: string, owner: string, workspaceId: string): void {
	load().set(id, { id, owner, workspaceId, updatedAt: Date.now() });
	flush();
}

/**
 * 读取会话归属。
 *
 * @param id - Pi session id。
 * @returns 归属记录；不存在时返回 `undefined`。
 * @internal
 */
export function getSessionOwner(id: string): SessionOwner | undefined {
	return load().get(id);
}

/**
 * 删除会话归属。
 *
 * @param id - Pi session id。
 * @internal
 */
export function removeSessionOwner(id: string): void {
	if (!load().delete(id)) return;
	flush();
}

/**
 * 列出某个用户的会话归属。
 *
 * @param owner - 用户 id。
 * @returns 该用户的归属记录。
 * @internal
 */
export function listSessionOwners(owner: string): SessionOwner[] {
	return [...load().values()].filter((entry) => entry.owner === owner);
}

/**
 * 清空内存缓存，仅供测试使用。
 *
 * @internal
 */
export function resetOwnerCache(): void {
	cache = undefined;
	cachePath = undefined;
}
