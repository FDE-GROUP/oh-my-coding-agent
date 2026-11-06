/**
 * 会话只读分享。
 *
 * @remarks
 * token 只保存 SHA-256；记录写入 `~/.pi-web/shares.json`，权限 0600，原子写。
 * 分享默认 7 天过期，可随时撤销。
 *
 * @internal
 */
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAppConfig } from "./config.ts";

/**
 * 分享记录。
 *
 * @internal
 */
export interface ShareRecord {
	tokenHash: string;
	sessionId: string;
	owner: string;
	createdAt: number;
	expiresAt: number;
	revokedAt?: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let cache: Map<string, ShareRecord> | undefined;
let cachePath: string | undefined;

function storePath(): string {
	return join(dirname(getAppConfig().path), "shares.json");
}

function hash(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function load(): Map<string, ShareRecord> {
	const path = storePath();
	if (cache && cachePath === path) return cache;
	cache = new Map();
	cachePath = path;
	if (!existsSync(path)) return cache;
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as { shares?: ShareRecord[] };
		for (const entry of parsed.shares ?? []) {
			if (entry && typeof entry.tokenHash === "string") cache.set(entry.tokenHash, entry);
		}
	} catch (error) {
		console.warn(`[pi-web] 无法读取分享索引：${String(error)}`);
	}
	return cache;
}

function flush(): void {
	const path = storePath();
	const temp = `${path}.tmp`;
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(temp, `${JSON.stringify({ shares: [...load().values()] }, null, 2)}\n`);
	chmodSync(temp, 0o600);
	renameSync(temp, path);
}

/**
 * 创建分享。
 *
 * @param sessionId - 会话 id。
 * @param owner - 所有者 id。
 * @param ttlMs - 有效期，默认 7 天。
 * @returns 明文 token 与过期时间。
 * @internal
 */
export function createShare(
	sessionId: string,
	owner: string,
	ttlMs = DEFAULT_TTL_MS,
): { token: string; expiresAt: number } {
	const token = randomBytes(32).toString("base64url");
	const expiresAt = Date.now() + Math.max(60_000, ttlMs);
	const record: ShareRecord = {
		tokenHash: hash(token),
		sessionId,
		owner,
		createdAt: Date.now(),
		expiresAt,
	};
	load().set(record.tokenHash, record);
	flush();
	return { token, expiresAt };
}

/**
 * 查找有效的分享。
 *
 * @param token - 明文 token。
 * @returns 分享记录；不存在、过期或已撤销时返回 `undefined`。
 * @internal
 */
export function findValidShare(token: string): ShareRecord | undefined {
	const record = load().get(hash(token));
	if (!record) return undefined;
	if (record.revokedAt) return undefined;
	if (record.expiresAt <= Date.now()) return undefined;
	return record;
}

/**
 * 列出某个会话的分享。
 *
 * @param sessionId - 会话 id。
 * @param owner - 所有者 id。
 * @returns 不含明文 token 的分享记录。
 * @internal
 */
export function listShares(sessionId: string, owner: string): ShareRecord[] {
	return [...load().values()]
		.filter((record) => record.sessionId === sessionId && record.owner === owner)
		.sort((left, right) => right.createdAt - left.createdAt);
}

/**
 * 撤销分享。
 *
 * @param token - 明文 token。
 * @param owner - 所有者 id。
 * @returns 是否撤销成功。
 * @internal
 */
export function revokeShare(token: string, owner: string): boolean {
	const record = load().get(hash(token)) ?? (/^[a-f0-9]{64}$/.test(token) ? load().get(token) : undefined);
	if (!record || record.owner !== owner) return false;
	record.revokedAt = Date.now();
	flush();
	return true;
}

/**
 * 清空内存缓存，仅供测试使用。
 *
 * @internal
 */
export function resetShareCache(): void {
	cache = undefined;
	cachePath = undefined;
}
