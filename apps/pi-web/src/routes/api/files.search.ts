import { createFileRoute } from "@tanstack/react-router";
import { sessionAccess } from "../../server/access.ts";
import { searchFiles } from "../../server/files.ts";
import { getCurrentUser } from "../../server/user.ts";
import { findWorkspace } from "../../server/workspaces.ts";

/**
 * 文件搜索路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/files/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const sessionId = url.searchParams.get("sessionId") ?? "";
				const query = url.searchParams.get("q") ?? "";
				const user = getCurrentUser();
				const access = await sessionAccess(sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const workspace = findWorkspace(access.workspaceId);
				if (!workspace) return Response.json({ error: "工作区不存在" }, { status: 404 });
				try {
					return Response.json({ files: await searchFiles(workspace.path, query) });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
