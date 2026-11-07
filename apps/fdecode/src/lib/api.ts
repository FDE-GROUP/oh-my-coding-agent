/**
 * 浏览器侧 HTTP 与 SSE 客户端。
 *
 * @remarks
 * 浏览器只访问本地 HTTP 接口，不直接接触 Pi 子进程或文件系统。
 *
 * @internal
 */
import type { RpcCommand, RpcSessionState } from "@earendil-works/pi-coding-agent";
import type { RuntimeEvent, SessionSnapshot } from "../server/runtime.ts";
import type { SessionSummary } from "../server/sessions.ts";

/**
 * 新建会话的响应。
 *
 * @internal
 */
export interface CreatedSession {
	id: string;
	state: RpcSessionState;
	draft?: string;
}

/**
 * SSE 事件信封。
 *
 * @internal
 */
export interface EventEnvelope {
	seq: number;
	ts: number;
	kind: "snapshot" | "event";
	payload: unknown;
}

/**
 * 事件流回调。
 *
 * @internal
 */
export interface EventStreamHandlers {
	onSnapshot: (snapshot: SessionSnapshot) => void;
	onEvent: (event: RuntimeEvent) => void;
	/** 传输层瞬时中断；EventSource 会自动重连。 */
	onConnectionError?: () => void;
	/** 事件流致命关闭（如运行时被回收致 404），不会自动重连，需上层恢复。 */
	onFatal?: () => void;
	/** 检测到 seq 断档（丢帧），上层应重建事件流以重新同步快照。 */
	onGap?: () => void;
}

async function readError(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { error?: string };
		if (body.error) return body.error;
	} catch {
		// Fall through to the status text.
	}
	return `${response.status} ${response.statusText}`;
}

/**
 * 创建一个新会话。
 *
 * @param workspaceId - 工作区 id；省略时使用默认工作区。
 * @param issue - 可选的 GitHub Issue 关联。
 * @returns 新会话的 id、初始状态与可选草稿。
 * @internal
 */
export async function createSession(
	workspaceId?: string,
	issue?: { repoId: string; number: number },
): Promise<CreatedSession> {
	const response = await fetch("/api/sessions", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ ...(workspaceId ? { workspaceId } : {}), ...(issue ? { issue } : {}) }),
	});
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as CreatedSession;
}

/**
 * 向会话发送一条 RPC 命令。
 *
 * @param sessionId - Pi session id。
 * @param command - RPC 命令。
 * @returns Pi 的命令响应。
 * @internal
 */
export async function sendCommand(sessionId: string, command: RpcCommand): Promise<unknown> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/commands`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(command),
	});
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as {
		ok: boolean;
		response?: { data?: unknown };
		error?: string;
	};
	if (!body.ok) throw new Error(body.error ?? "命令失败");
	return body.response?.data;
}

/**
 * 打开会话事件流。
 *
 * @param sessionId - Pi session id。
 * @param handlers - 快照、事件与连接错误回调。
 * @returns 关闭事件流的函数。
 * @internal
 */
export function openEventStream(sessionId: string, handlers: EventStreamHandlers): () => void {
	const source = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
	let lastSeq = 0;
	source.addEventListener("snapshot", (event) => {
		const envelope = JSON.parse((event as MessageEvent).data) as EventEnvelope;
		lastSeq = envelope.seq;
		handlers.onSnapshot(envelope.payload as SessionSnapshot);
	});
	source.addEventListener("event", (event) => {
		const envelope = JSON.parse((event as MessageEvent).data) as EventEnvelope;
		if (lastSeq !== 0 && envelope.seq !== lastSeq + 1) {
			source.close();
			handlers.onGap?.();
			return;
		}
		lastSeq = envelope.seq;
		handlers.onEvent(envelope.payload as RuntimeEvent);
	});
	source.addEventListener("error", () => {
		if (source.readyState === EventSource.CLOSED) handlers.onFatal?.();
		else handlers.onConnectionError?.();
	});
	return () => source.close();
}

/**
 * 读取当前项目的会话列表。
 *
 * @returns 会话列表。
 * @internal
 */
export async function fetchSessions(): Promise<SessionSummary[]> {
	const response = await fetch("/api/sessions");
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { sessions: SessionSummary[] };
	return body.sessions;
}

/**
 * 恢复一个已有会话。
 *
 * @param sessionId - Pi session id。
 * @returns 会话 id 与状态。
 * @internal
 */
export async function resumeSession(sessionId: string): Promise<CreatedSession> {
	const response = await fetch("/api/sessions", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ resumeId: sessionId }),
	});
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as CreatedSession;
}

/**
 * 重命名会话。
 *
 * @param sessionId - Pi session id。
 * @param name - 新名称。
 * @returns 重命名请求完成后 resolve。
 * @internal
 */
export async function renameSession(sessionId: string, name: string): Promise<void> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name }),
	});
	if (!response.ok) throw new Error(await readError(response));
}

/**
 * 文件候选。
 *
 * @internal
 */
export interface FileCandidate {
	path: string;
}

/**
 * 展开后的文件内容。
 *
 * @internal
 */
export interface ExpandedFilesResponse {
	text: string;
	images: Array<{ type: "image"; mimeType: string; data: string }>;
	notes: string[];
}

/**
 * 搜索项目文件。
 *
 * @param sessionId - 用于解析工作区的会话 id。
 * @param query - 文件名片段。
 * @returns 匹配的相对路径。
 * @internal
 */
export async function searchProjectFiles(sessionId: string, query: string): Promise<FileCandidate[]> {
	const response = await fetch(
		`/api/files/search?sessionId=${encodeURIComponent(sessionId)}&q=${encodeURIComponent(query)}`,
	);
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { files: FileCandidate[] };
	return body.files;
}

/**
 * 展开 `@file` 引用。
 *
 * @param sessionId - 用于解析工作区的会话 id。
 * @param paths - 相对工作区的路径。
 * @returns 文本、图片与提示。
 * @internal
 */
export async function expandProjectFiles(sessionId: string, paths: string[]): Promise<ExpandedFilesResponse> {
	const response = await fetch("/api/files/expand", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId, paths }),
	});
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as ExpandedFilesResponse;
}

/**
 * 从指定消息分叉会话。
 *
 * @param sessionId - 当前 session id。
 * @param entryId - 分叉点的 user 消息 entry id。
 * @returns 新会话 id 与状态。
 * @internal
 */
export async function forkSession(sessionId: string, entryId: string): Promise<CreatedSession> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/fork`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ entryId }),
	});
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as CreatedSession;
}

/**
 * 克隆当前会话分支。
 *
 * @param sessionId - 当前 session id。
 * @returns 新会话 id 与状态。
 * @internal
 */
export async function cloneSession(sessionId: string): Promise<CreatedSession> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/clone`, { method: "POST" });
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as CreatedSession;
}

/**
 * 活跃运行时信息。
 *
 * @internal
 */
export interface RuntimeInfo {
	/** Session id。 */
	id: string;
	/** 是否正在运行。 */
	busy: boolean;
	/** 最后活动时间戳。 */
	lastActivityAt: number;
	/** 运行时状态。 */
	status: "starting" | "ready" | "exited";
}

/**
 * 读取活跃运行时列表。
 *
 * @returns 运行时信息。
 * @internal
 */
export async function fetchRuntimes(): Promise<RuntimeInfo[]> {
	const response = await fetch("/api/runtimes");
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { runtimes: RuntimeInfo[] };
	return body.runtimes;
}

/**
 * 当前用户与可用工作区。
 *
 * @internal
 */
export interface WorkspaceInfo {
	id: string;
	name: string;
	path: string;
}

/**
 * 读取当前用户和工作区。
 *
 * @returns 用户信息与工作区列表。
 * @internal
 */
export interface GithubRepoInfo {
	id: string;
	owner: string;
	name: string;
	branch?: string;
}

/**
 * 读取当前用户、工作区与 GitHub 仓库。
 *
 * @returns 用户、工作区与不含 token 的仓库配置。
 * @internal
 */
export async function fetchWorkspaces(): Promise<{
	user: { id: string; name: string; role: "admin" | "member" };
	workspaces: WorkspaceInfo[];
	githubRepos: GithubRepoInfo[];
}> {
	const response = await fetch("/api/workspaces");
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as {
		user: { id: string; name: string; role: "admin" | "member" };
		workspaces: WorkspaceInfo[];
		githubRepos: GithubRepoInfo[];
	};
}

/**
 * 管理员会话列表项。
 *
 * @internal
 */
export type AdminSessionSummary = SessionSummary & { owner: string };

/**
 * 管理员读取全部会话。
 *
 * @returns 全部会话与 owner。
 * @internal
 */
export async function fetchAdminSessions(): Promise<AdminSessionSummary[]> {
	const response = await fetch("/api/admin/sessions");
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { sessions: AdminSessionSummary[] };
	return body.sessions;
}

/**
 * 审计记录。
 *
 * @internal
 */
export interface AuditEntry {
	ts: number;
	user: string;
	role: "admin" | "member";
	action: string;
	target: string;
	result: "ok" | "failed";
	detail?: string;
}

/**
 * 管理员读取审计记录。
 *
 * @param limit - 最多返回数量。
 * @returns 最近的审计记录。
 * @internal
 */
export async function fetchAudit(limit = 100): Promise<AuditEntry[]> {
	const response = await fetch(`/api/admin/audit?limit=${limit}`);
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { entries: AuditEntry[] };
	return body.entries;
}

/**
 * 登出。
 *
 * @returns 请求完成后 resolve。
 * @internal
 */
export async function logout(): Promise<void> {
	await fetch("/api/auth/logout", { method: "POST" });
}

/**
 * 分享信息。
 *
 * @internal
 */
export interface ShareInfo {
	id: string;
	createdAt: number;
	expiresAt: number;
	revokedAt?: number;
}

/**
 * 新建分享。
 *
 * @param sessionId - 会话 id。
 * @param expiresInDays - 有效天数，默认 7。
 * @returns token、过期时间与完整链接。
 * @internal
 */
export async function createShare(
	sessionId: string,
	expiresInDays = 7,
): Promise<{ token: string; expiresAt: number; url: string }> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/shares`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ expiresInDays }),
	});
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as { token: string; expiresAt: number; url: string };
}

/**
 * 列出会话分享。
 *
 * @param sessionId - 会话 id。
 * @returns 分享记录。
 * @internal
 */
export async function listShares(sessionId: string): Promise<ShareInfo[]> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/shares`);
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { shares: ShareInfo[] };
	return body.shares;
}

/**
 * 撤销分享。
 *
 * @param token - 分享 token。
 * @returns 请求完成后 resolve。
 * @internal
 */
export async function revokeShare(token: string): Promise<void> {
	const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, { method: "DELETE" });
	if (!response.ok) throw new Error(await readError(response));
}

/**
 * 只读分享数据。
 *
 * @internal
 */
export interface SharedSession {
	snapshot: SessionSnapshot;
	session: { id: string; name?: string; workspace: string };
}

/**
 * 读取只读分享。
 *
 * @param token - 分享 token。
 * @returns 快照与会话信息。
 * @internal
 */
export async function fetchSharedSession(token: string): Promise<SharedSession> {
	const response = await fetch(`/api/shares/${encodeURIComponent(token)}`);
	if (!response.ok) throw new Error(await readError(response));
	return (await response.json()) as SharedSession;
}

/**
 * 打开只读分享事件流。
 *
 * @param token - 分享 token。
 * @param handlers - 快照与事件回调。
 * @returns 关闭事件流的函数。
 * @internal
 */
export function openSharedEventStream(token: string, handlers: EventStreamHandlers): () => void {
	const source = new EventSource(`/api/shares/${encodeURIComponent(token)}/events`);
	let lastSeq = 0;
	source.addEventListener("snapshot", (event) => {
		const envelope = JSON.parse((event as MessageEvent).data) as EventEnvelope;
		lastSeq = envelope.seq;
		handlers.onSnapshot(envelope.payload as SessionSnapshot);
	});
	source.addEventListener("event", (event) => {
		const envelope = JSON.parse((event as MessageEvent).data) as EventEnvelope;
		if (lastSeq !== 0 && envelope.seq !== lastSeq + 1) {
			source.close();
			handlers.onGap?.();
			return;
		}
		lastSeq = envelope.seq;
		handlers.onEvent(envelope.payload as RuntimeEvent);
	});
	source.addEventListener("error", () => {
		if (source.readyState === EventSource.CLOSED) handlers.onFatal?.();
		else handlers.onConnectionError?.();
	});
	return () => source.close();
}

/**
 * GitHub Issue 摘要。
 *
 * @internal
 */
export interface GithubIssue {
	number: number;
	title: string;
	body: string;
	url: string;
	state: string;
	labels: string[];
	updatedAt: string;
}

/**
 * 读取 open issues。
 *
 * @param repoId - 仓库配置 id。
 * @returns Issue 摘要。
 * @internal
 */
export async function fetchGithubIssues(repoId: string): Promise<GithubIssue[]> {
	const response = await fetch(`/api/github/issues?repo=${encodeURIComponent(repoId)}`);
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { issues: GithubIssue[] };
	return body.issues;
}

/**
 * 读取会话关联的 Issue。
 *
 * @param sessionId - 会话 id。
 * @returns Issue 关联；没有时返回 `null`。
 * @internal
 */
export async function fetchIssueLink(
	sessionId: string,
): Promise<{ number: number; title: string; url: string; repoId: string } | null> {
	const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/issue`);
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as {
		issue: { number: number; title: string; url: string; repoId: string } | null;
	};
	return body.issue;
}

/**
 * CI 状态。
 *
 * @internal
 */
export interface CiStatus {
	name: string;
	status: string;
	conclusion: string | null;
	branch: string | null;
	url: string;
	updatedAt: string;
}

/**
 * 读取仓库最近 CI 状态。
 *
 * @param repoId - 仓库配置 id。
 * @param branch - 可选分支。
 * @returns 最近一次 workflow run。
 * @internal
 */
export async function fetchCiStatus(repoId: string, branch?: string): Promise<CiStatus | null> {
	const query = new URLSearchParams({ repo: repoId });
	if (branch) query.set("branch", branch);
	const response = await fetch(`/api/github/ci?${query.toString()}`);
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { ci: CiStatus | null };
	return body.ci;
}

/**
 * 保留清理预览。
 *
 * @internal
 */
export interface RetentionPreview {
	sessions: Array<{
		id: string;
		owner: string;
		workspaceId: string;
		workspaceName: string;
		modified: string;
	}>;
	shares: number;
	audit: number;
	skippedUnknown: number;
	skippedActive: number;
}

/**
 * 读取保留清理预览。
 *
 * @returns 预览结果。
 * @internal
 */
export async function fetchRetentionPreview(): Promise<RetentionPreview> {
	const response = await fetch("/api/admin/retention");
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as { preview: RetentionPreview };
	return body.preview;
}

/**
 * 应用保留清理。
 *
 * @returns 实际删除数量。
 * @internal
 */
export async function applyRetention(): Promise<
	RetentionPreview & { deletedSessions: number; deletedShares: number; deletedAudit: number }
> {
	const response = await fetch("/api/admin/retention", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ confirm: true }),
	});
	if (!response.ok) throw new Error(await readError(response));
	const body = (await response.json()) as {
		result: RetentionPreview & { deletedSessions: number; deletedShares: number; deletedAudit: number };
	};
	return body.result;
}
