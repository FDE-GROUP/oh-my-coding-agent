/**
 * 会话访问控制。
 *
 * @internal
 */
import { getSessionOwner, type SessionOwner } from "./owners.ts";
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
export async function sessionAccess(id: string, user: RequestUser): Promise<SessionOwner | undefined> {
	const entry = getSessionOwner(id);
	if (entry) return entry.owner === user.id ? entry : undefined;
	if (user.id !== "local") return undefined;
	const resolved = await resolveSession(id, user.id);
	return resolved ? getSessionOwner(id) : undefined;
}
