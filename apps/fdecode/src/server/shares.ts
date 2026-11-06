/**
 * 会话只读分享。
 *
 * @remarks
 * token 只保存 SHA-256；记录写入 SQLite 表 `shares`，默认 7 天过期，可随时撤销。
 *
 * @internal
 */
import { createHash, randomBytes } from "node:crypto";
import { closeDb, getDb } from "./db.ts";

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

interface ShareRow {
	token_hash: string;
	session_id: string;
	owner: string;
	created_at: number;
	expires_at: number;
	revoked_at: number | null;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hash(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function toRecord(row: ShareRow): ShareRecord {
	return {
		tokenHash: row.token_hash,
		sessionId: row.session_id,
		owner: row.owner,
		createdAt: Number(row.created_at),
		expiresAt: Number(row.expires_at),
		...(row.revoked_at === null ? {} : { revokedAt: Number(row.revoked_at) }),
	};
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
	getDb()
		.prepare(
			"INSERT INTO shares (token_hash, session_id, owner, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)",
		)
		.run(hash(token), sessionId, owner, Date.now(), expiresAt);
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
	const row = getDb()
		.prepare(
			"SELECT token_hash, session_id, owner, created_at, expires_at, revoked_at FROM shares WHERE token_hash = ?",
		)
		.get(hash(token)) as ShareRow | undefined;
	if (!row) return undefined;
	const record = toRecord(row);
	if (record.revokedAt) return undefined;
	if (record.expiresAt <= Date.now()) return undefined;
	return record;
}

/**
 * 列出某个会话的分享。
 *
 * @param sessionId - 会话 id。
 * @param owner - 所有者 id。
 * @returns 不含明文 token 的分享记录，按创建时间倒序。
 * @internal
 */
export function listShares(sessionId: string, owner: string): ShareRecord[] {
	const rows = getDb()
		.prepare(
			"SELECT token_hash, session_id, owner, created_at, expires_at, revoked_at FROM shares WHERE session_id = ? AND owner = ? ORDER BY created_at DESC",
		)
		.all(sessionId, owner) as unknown as ShareRow[];
	return rows.map(toRecord);
}

/**
 * 撤销分享。
 *
 * @param token - 明文 token 或 64 位 token 哈希。
 * @param owner - 所有者 id。
 * @returns 是否撤销成功。
 * @internal
 */
export function revokeShare(token: string, owner: string): boolean {
	const db = getDb();
	const now = Date.now();
	const revoke = db.prepare("UPDATE shares SET revoked_at = ? WHERE token_hash = ? AND owner = ?");
	let changes = Number(revoke.run(now, hash(token), owner).changes);
	if (changes === 0 && /^[a-f0-9]{64}$/.test(token)) {
		changes = Number(revoke.run(now, token, owner).changes);
	}
	return changes > 0;
}

/**
 * 关闭数据库连接，仅供测试使用。
 *
 * @internal
 */
export function resetShareCache(): void {
	closeDb();
}

interface PruneFilter {
	where: string;
	params: Array<string | number>;
}

function pruneFilter(removedSessions: ReadonlySet<string>, createdBefore?: number): PruneFilter | undefined {
	const ids = [...removedSessions];
	const clauses: string[] = [];
	const params: Array<string | number> = [];
	if (ids.length > 0) {
		clauses.push(`session_id IN (${ids.map(() => "?").join(", ")})`);
		params.push(...ids);
	}
	if (createdBefore !== undefined) {
		clauses.push("created_at < ?");
		params.push(createdBefore);
	}
	if (clauses.length === 0) return undefined;
	return { where: `WHERE ${clauses.join(" OR ")}`, params };
}

/**
 * 预览需要清理的分享数量。
 *
 * @param removedSessions - 被删除的会话 id。
 * @param createdBefore - 可选的时间阈值。
 * @returns 将删除的分享数量。
 * @internal
 */
export function previewSharePrune(removedSessions: ReadonlySet<string>, createdBefore?: number): number {
	const filter = pruneFilter(removedSessions, createdBefore);
	if (!filter) return 0;
	const row = getDb()
		.prepare(`SELECT COUNT(*) AS count FROM shares ${filter.where}`)
		.get(...filter.params) as { count: number } | undefined;
	return Number(row?.count ?? 0);
}

/**
 * 清理分享。
 *
 * @param removedSessions - 被删除的会话 id。
 * @param createdBefore - 可选的时间阈值。
 * @returns 删除数量。
 * @internal
 */
export function pruneShares(removedSessions: ReadonlySet<string>, createdBefore?: number): number {
	const filter = pruneFilter(removedSessions, createdBefore);
	if (!filter) return 0;
	return Number(
		getDb()
			.prepare(`DELETE FROM shares ${filter.where}`)
			.run(...filter.params).changes,
	);
}
