/**
 * 会话访问控制。
 *
 * @internal
 */
import { getSessionOwner, type SessionOwner } from "./owners.ts";
import type { SessionRuntime } from "./runtime.ts";
import { getRuntimeManager } from "./runtime-manager.ts";
import { resolveSession } from "./sessions.ts";
import type { RequestUser } from "./user.ts";

/**
 * 校验用户是否可访问某个会话。
 *
 * @param id - Pi session id。
 * @param user - 当前用户。
 * @returns 归属记录；无权限或不存在时返回 `undefined`。
 * @internal
 */
export interface SessionPermission {
	entry: SessionOwner;
	canWrite: boolean;
}

/**
 * 校验读权限：所有者或管理员。
 *
 * @param id - 会话 id。
 * @param user - 当前用户。
 * @returns 权限结果；无权限时返回 `undefined`。
 * @internal
 */
export async function readSessionAccess(id: string, user: RequestUser): Promise<SessionPermission | undefined> {
	const entry = getSessionOwner(id);
	if (entry) {
		if (entry.owner === user.id) return { entry, canWrite: true };
		if (user.role === "admin") return { entry, canWrite: false };
		return undefined;
	}
	if (user.id !== "local") return undefined;
	const resolved = await resolveSession(id, user.id);
	const created = resolved ? getSessionOwner(id) : undefined;
	return created ? { entry: created, canWrite: true } : undefined;
}

/**
 * 校验写权限：仅所有者。
 *
 * @param id - 会话 id。
 * @param user - 当前用户。
 * @returns 归属记录；无写权限时返回 `undefined`。
 * @internal
 */
export async function sessionAccess(id: string, user: RequestUser): Promise<SessionOwner | undefined> {
	const permission = await readSessionAccess(id, user);
	return permission?.canWrite ? permission.entry : undefined;
}

/**
 * 确保会话有运行中的 Pi 进程。
 *
 * @param id - 会话 id。
 * @param owner - 用于启动进程的用户 id。
 * @returns 运行时；会话不存在时返回 `undefined`。
 * @internal
 */
export async function ensureRuntime(id: string, owner: string): Promise<SessionRuntime | undefined> {
	const manager = getRuntimeManager();
	const existing = manager.get(id);
	if (existing) return existing;
	const resolved = await resolveSession(id, owner);
	if (!resolved) return undefined;
	return manager.create({
		sessionPath: resolved.summary.path,
		cwd: resolved.workspace.path,
		owner,
	});
}
