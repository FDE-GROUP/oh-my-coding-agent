import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeManager } from "../../server/runtime-manager.ts";

/**
 * 单个会话的快照与关闭路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const runtime = getRuntimeManager().get(params.sessionId);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });
				try {
					const snapshot = await runtime.snapshot();
					return Response.json(snapshot);
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
			DELETE: async ({ params }) => {
				const closed = await getRuntimeManager().close(params.sessionId);
				if (!closed) return Response.json({ error: "会话未加载" }, { status: 404 });
				return Response.json({ ok: true });
			},
		},
	},
});
