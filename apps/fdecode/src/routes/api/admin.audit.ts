import { createFileRoute } from "@tanstack/react-router";
import { queryAudit } from "../../../audit.mjs";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 管理员审计查询。
 *
 * @internal
 */
export const Route = createFileRoute("/api/admin/audit")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = getCurrentUser();
				if (user.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
				const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
				return Response.json({ entries: queryAudit(limit) });
			},
		},
	},
});
