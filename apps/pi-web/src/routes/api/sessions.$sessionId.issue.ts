import { createFileRoute } from "@tanstack/react-router";
import { readSessionAccess } from "../../server/access.ts";
import { getIssueLink } from "../../server/links.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 会话关联的 Issue。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/issue")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const user = getCurrentUser();
				const access = await readSessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				return Response.json({ issue: getIssueLink(params.sessionId) ?? null });
			},
		},
	},
});
