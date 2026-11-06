/**
 * 会话索引与解析。
 *
 * @remarks
 * 会话事实归 Pi。这里只使用公开导出的 `SessionManager` 读取当前项目目录的
 * 会话列表，不解析 session 文件内部结构。
 *
 * @internal
 */
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { resolveProjectCwd } from "./project.ts";

/**
 * 会话列表项。
 *
 * @internal
 */
export interface SessionSummary {
	/** Pi session id。 */
	id: string;
	/** 会话文件路径。 */
	path: string;
	/** 用户设置的显示名。 */
	name?: string;
	/** 会话开始时的目录。 */
	cwd: string;
	/** 最后修改时间，ISO 字符串。 */
	modified: string;
	/** 创建时间，ISO 字符串。 */
	created: string;
	/** 消息数量。 */
	messageCount: number;
	/** 第一条用户消息，用于无标题会话。 */
	firstMessage: string;
}

/**
 * 列出当前项目的会话。
 *
 * @returns 按最后修改时间倒序排列的会话。
 * @internal
 */
export async function listSessions(): Promise<SessionSummary[]> {
	const sessions = await SessionManager.list(resolveProjectCwd());
	return sessions
		.map((session) => ({
			id: session.id,
			path: session.path,
			name: session.name,
			cwd: session.cwd,
			modified: session.modified.toISOString(),
			created: session.created.toISOString(),
			messageCount: session.messageCount,
			firstMessage: session.firstMessage,
		}))
		.sort((left, right) => right.modified.localeCompare(left.modified));
}

/**
 * 按 session id 查找会话文件路径。
 *
 * @param id - Pi session id。
 * @returns 会话文件路径；不存在时返回 `undefined`。
 * @internal
 */
export async function findSessionPath(id: string): Promise<string | undefined> {
	const sessions = await listSessions();
	return sessions.find((session) => session.id === id)?.path;
}
