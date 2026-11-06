import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeManager } from "../../server/runtime-manager.ts";

/**
 * 从指定 user 消息分叉会话。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/fork")({
	server: {
		handlers: {
			POST: async ({ params, request }) => {
				const manager = getRuntimeManager();
				const runtime = manager.get(params.sessionId);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });

				let body: { entryId?: string } = {};
				try {
					body = (await request.json()) as { entryId?: string };
				} catch {
					return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
				}
				if (!body.entryId) return Response.json({ error: "缺少 entryId" }, { status: 400 });

				try {
					const result = await runtime.command({ type: "fork", entryId: body.entryId });
					if (result.data.cancelled) return Response.json({ error: "分叉被取消" }, { status: 409 });
					const state = await runtime.command({ type: "get_state" });
					manager.rekey(params.sessionId, state.data.sessionId);
					return Response.json({ id: state.data.sessionId, state: state.data });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
