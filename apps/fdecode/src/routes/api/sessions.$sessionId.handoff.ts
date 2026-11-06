import { createFileRoute } from "@tanstack/react-router";
import { ensureRuntime, readSessionAccess } from "../../server/access.ts";
import { generateHandoff } from "../../server/handoff.ts";
import { resolveSession } from "../../server/sessions.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 交接文档下载路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/handoff")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const user = getCurrentUser();
				const access = await readSessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const resolved = await resolveSession(params.sessionId, user.id);
				if (!resolved) return Response.json({ error: "会话不存在" }, { status: 404 });
				const runtime = await ensureRuntime(params.sessionId, user.id);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });
				try {
					const snapshot = await runtime.snapshot();
					const markdown = generateHandoff(snapshot, {
						sessionId: params.sessionId,
						workspace: resolved.workspace.path,
						owner: user.id,
					});
					return new Response(markdown, {
						headers: {
							"content-type": "text/markdown; charset=utf-8",
							"content-disposition": `attachment; filename="handoff-${params.sessionId.slice(0, 8)}.md"`,
							"cache-control": "no-store",
						},
					});
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
