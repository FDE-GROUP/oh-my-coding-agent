/**
 * 会话索引与解析。
 *
 * @remarks
 * 会话事实归 Pi。列表按配置的工作区分别读取，再用旁路 owner 索引过滤；
 * 不使用全局 cwd 决定范围。
 *
 * @internal
 */
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { getSessionOwner, recordSessionOwner } from "./owners.ts";
import { findWorkspace, listWorkspaces, type Workspace } from "./workspaces.ts";

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
	/** 父会话文件路径，分叉会话才有。 */
	parentSessionPath?: string;
	/** 所属工作区 id。 */
	workspaceId: string;
	/** 所属工作区名称。 */
	workspaceName: string;
}

async function listWorkspaceSessions(workspace: Workspace): Promise<SessionSummary[]> {
	const sessions = await SessionManager.list(workspace.path);
	return sessions.map((session) => ({
		id: session.id,
		path: session.path,
		name: session.name,
		cwd: session.cwd,
		modified: session.modified.toISOString(),
		created: session.created.toISOString(),
		messageCount: session.messageCount,
		firstMessage: session.firstMessage,
		parentSessionPath: session.parentSessionPath,
		workspaceId: workspace.id,
		workspaceName: workspace.name,
	}));
}

/**
 * 列出某个用户可见的会话。
 *
 * @param owner - 用户 id。
 * @returns 按最后修改时间倒序排列的会话。
 * @internal
 */
export async function listSessions(owner: string): Promise<SessionSummary[]> {
	const sessions = (await Promise.all(listWorkspaces().map(listWorkspaceSessions))).flat();
	return sessions
		.filter((session) => {
			const entry = getSessionOwner(session.id);
			if (entry) return entry.owner === owner;
			return owner === "local";
		})
		.sort((left, right) => right.modified.localeCompare(left.modified));
}

/**
 * 解析一个用户可访问的会话。
 *
 * @param id - Pi session id。
 * @param owner - 用户 id。
 * @returns 会话摘要与工作区；无权限或不存在时返回 `undefined`。
 * @internal
 */
export async function resolveSession(
	id: string,
	owner: string,
): Promise<{ summary: SessionSummary; workspace: Workspace } | undefined> {
	const entry = getSessionOwner(id);
	if (entry && entry.owner !== owner) return undefined;
	const workspaces = entry
		? [findWorkspace(entry.workspaceId)].filter((item): item is Workspace => Boolean(item))
		: listWorkspaces();
	for (const workspace of workspaces) {
		const summary = (await listWorkspaceSessions(workspace)).find((session) => session.id === id);
		if (!summary) continue;
		if (!entry && owner === "local") recordSessionOwner(id, owner, workspace.id);
		return { summary, workspace };
	}
	return undefined;
}

/**
 * 按 session id 查找会话文件路径。
 *
 * @param id - Pi session id。
 * @param owner - 用户 id。
 * @returns 会话文件路径与工作区；不存在时返回 `undefined`。
 * @internal
 */
export async function findSessionPath(
	id: string,
	owner: string,
): Promise<{ path: string; workspace: Workspace } | undefined> {
	const resolved = await resolveSession(id, owner);
	return resolved ? { path: resolved.summary.path, workspace: resolved.workspace } : undefined;
}
