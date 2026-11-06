/**
 * 会话归属旁路索引。
 *
 * @remarks
 * Pi 的 session 文件不记录 owner。这里用 SQLite 表 `session_owners` 维护
 * `session id → owner + workspace`，数据库默认位于 `~/.pi-web/pi-web.db`。
 *
 * @internal
 */
import { closeDb, getDb } from "./db.ts";

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

interface OwnerRow {
	id: string;
	owner: string;
	workspace_id: string;
	updated_at: number;
}

function toRecord(row: OwnerRow): SessionOwner {
	return {
		id: row.id,
		owner: row.owner,
		workspaceId: row.workspace_id,
		updatedAt: Number(row.updated_at),
	};
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
	getDb()
		.prepare(
			`INSERT INTO session_owners (id, owner, workspace_id, updated_at) VALUES (?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, workspace_id = excluded.workspace_id, updated_at = excluded.updated_at`,
		)
		.run(id, owner, workspaceId, Date.now());
}

/**
 * 读取会话归属。
 *
 * @param id - Pi session id。
 * @returns 归属记录；不存在时返回 `undefined`。
 * @internal
 */
export function getSessionOwner(id: string): SessionOwner | undefined {
	const row = getDb().prepare("SELECT id, owner, workspace_id, updated_at FROM session_owners WHERE id = ?").get(id) as
		| OwnerRow
		| undefined;
	return row ? toRecord(row) : undefined;
}

/**
 * 删除会话归属。
 *
 * @param id - Pi session id。
 * @internal
 */
export function removeSessionOwner(id: string): void {
	getDb().prepare("DELETE FROM session_owners WHERE id = ?").run(id);
}

/**
 * 列出某个用户的会话归属。
 *
 * @param owner - 用户 id。
 * @returns 该用户的归属记录，按更新时间升序。
 * @internal
 */
export function listSessionOwners(owner: string): SessionOwner[] {
	const rows = getDb()
		.prepare("SELECT id, owner, workspace_id, updated_at FROM session_owners WHERE owner = ? ORDER BY updated_at, id")
		.all(owner) as unknown as OwnerRow[];
	return rows.map(toRecord);
}

/**
 * 列出全部归属记录。
 *
 * @returns 所有归属记录，按更新时间升序。
 * @internal
 */
export function allSessionOwners(): SessionOwner[] {
	const rows = getDb()
		.prepare("SELECT id, owner, workspace_id, updated_at FROM session_owners ORDER BY updated_at, id")
		.all() as unknown as OwnerRow[];
	return rows.map(toRecord);
}

/**
 * 关闭数据库连接，仅供测试使用。
 *
 * @internal
 */
export function resetOwnerCache(): void {
	closeDb();
}
