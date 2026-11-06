/**
 * 会话与 GitHub Issue 的关联索引。
 *
 * @remarks
 * 存储在 SQLite 表 `issue_links`，一个会话最多关联一个 Issue。数据库默认位于
 * `~/.fdecode/fdecode.db`。
 *
 * @internal
 */
import { closeDb, getDb } from "./db.ts";

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

interface LinkRow {
	session_id: string;
	repo_id: string;
	number: number;
	title: string;
	url: string;
}

function toRecord(row: LinkRow): IssueLink {
	return {
		sessionId: row.session_id,
		repoId: row.repo_id,
		number: Number(row.number),
		title: row.title,
		url: row.url,
	};
}

/**
 * 记录会话的 Issue 关联。
 *
 * @param link - 关联记录。
 * @internal
 */
export function recordIssueLink(link: IssueLink): void {
	getDb()
		.prepare(
			`INSERT INTO issue_links (session_id, repo_id, number, title, url) VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(session_id) DO UPDATE SET repo_id = excluded.repo_id, number = excluded.number, title = excluded.title, url = excluded.url`,
		)
		.run(link.sessionId, link.repoId, link.number, link.title, link.url);
}

/**
 * 读取会话的 Issue 关联。
 *
 * @param sessionId - 会话 id。
 * @returns 关联记录；不存在时返回 `undefined`。
 * @internal
 */
export function getIssueLink(sessionId: string): IssueLink | undefined {
	const row = getDb()
		.prepare("SELECT session_id, repo_id, number, title, url FROM issue_links WHERE session_id = ?")
		.get(sessionId) as LinkRow | undefined;
	return row ? toRecord(row) : undefined;
}

/**
 * 删除会话的 Issue 关联。
 *
 * @param sessionId - 会话 id。
 * @internal
 */
export function removeIssueLink(sessionId: string): void {
	getDb().prepare("DELETE FROM issue_links WHERE session_id = ?").run(sessionId);
}

/**
 * 删除多个会话的关联。
 *
 * @param sessionIds - 会话 id 集合。
 * @internal
 */
export function removeIssueLinks(sessionIds: Iterable<string>): void {
	const remove = getDb().prepare("DELETE FROM issue_links WHERE session_id = ?");
	for (const id of sessionIds) remove.run(id);
}

/**
 * 关闭数据库连接，仅供测试使用。
 *
 * @internal
 */
export function resetLinkCache(): void {
	closeDb();
}
