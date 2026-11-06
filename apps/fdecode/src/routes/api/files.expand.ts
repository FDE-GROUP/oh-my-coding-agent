import { createFileRoute } from "@tanstack/react-router";
import { sessionAccess } from "../../server/access.ts";
import { expandFiles } from "../../server/files.ts";
import { getCurrentUser } from "../../server/user.ts";
import { findWorkspace } from "../../server/workspaces.ts";

/**
 * 文件展开路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/files/expand")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: { sessionId?: string; paths?: string[] } = {};
				try {
					body = (await request.json()) as { sessionId?: string; paths?: string[] };
				} catch {
					return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
				}
				if (!body.sessionId || !Array.isArray(body.paths) || body.paths.length === 0) {
					return Response.json({ error: "缺少会话或文件路径" }, { status: 400 });
				}
				const user = getCurrentUser();
				const access = await sessionAccess(body.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const workspace = findWorkspace(access.workspaceId);
				if (!workspace) return Response.json({ error: "工作区不存在" }, { status: 404 });
				try {
					return Response.json(await expandFiles(workspace.path, body.paths));
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
