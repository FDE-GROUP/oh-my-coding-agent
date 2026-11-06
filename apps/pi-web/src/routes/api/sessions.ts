import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeManager, RuntimeCapacityError } from "../../server/runtime-manager.ts";

/**
 * 会话创建路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: { sessionPath?: string } = {};
				try {
					body = (await request.json()) as { sessionPath?: string };
				} catch {
					body = {};
				}

				try {
					const runtime = await getRuntimeManager().create({
						sessionPath: body.sessionPath,
					});
					const state = runtime.state;
					if (!state) return Response.json({ error: "会话初始化失败" }, { status: 500 });
					return Response.json({ id: state.sessionId, state });
				} catch (error) {
					if (error instanceof RuntimeCapacityError) {
						return Response.json({ error: error.message }, { status: 429 });
					}
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
