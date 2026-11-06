import { createFileRoute } from "@tanstack/react-router";
import { getSessionOwner } from "../../server/owners.ts";
import { listAllSessions } from "../../server/sessions.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 管理员会话列表。
 *
 * @internal
 */
export const Route = createFileRoute("/api/admin/sessions")({
	server: {
		handlers: {
			GET: async () => {
				const user = getCurrentUser();
				if (user.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
				const sessions = await listAllSessions();
				return Response.json({
					sessions: sessions.map((session) => ({
						...session,
						owner: getSessionOwner(session.id)?.owner ?? "unknown",
					})),
				});
			},
		},
	},
});
