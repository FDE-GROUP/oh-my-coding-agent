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
	onConnectionError?: () => void;
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
 * @returns 新会话的 id 与初始状态。
 * @internal
 */
export async function createSession(): Promise<CreatedSession> {
	const response = await fetch("/api/sessions", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({}),
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
	const body = (await response.json()) as { ok: boolean; response?: unknown; error?: string };
	if (!body.ok) throw new Error(body.error ?? "命令失败");
	return body.response;
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
	source.addEventListener("snapshot", (event) => {
		const envelope = JSON.parse((event as MessageEvent).data) as EventEnvelope;
		handlers.onSnapshot(envelope.payload as SessionSnapshot);
	});
	source.addEventListener("event", (event) => {
		const envelope = JSON.parse((event as MessageEvent).data) as EventEnvelope;
		handlers.onEvent(envelope.payload as RuntimeEvent);
	});
	source.addEventListener("error", () => handlers.onConnectionError?.());
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
