import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeManager, RuntimeCapacityError } from "../../server/runtime-manager.ts";
import { findSessionPath, listSessions } from "../../server/sessions.ts";

/**
 * 会话列表与创建路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions")({
	server: {
		handlers: {
			GET: async () => {
				try {
					return Response.json({ sessions: await listSessions() });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},

			POST: async ({ request }) => {
				let body: { resumeId?: string } = {};
				try {
					body = (await request.json()) as { resumeId?: string };
				} catch {
					body = {};
				}

				const manager = getRuntimeManager();
				try {
					if (body.resumeId) {
						const existing = manager.get(body.resumeId);
						if (existing) {
							const state = await existing.command({ type: "get_state" });
							return Response.json({ id: state.data.sessionId, state: state.data });
						}
						const path = await findSessionPath(body.resumeId);
						if (!path) return Response.json({ error: "会话不存在" }, { status: 404 });
						const runtime = await manager.create({ sessionPath: path });
						const state = runtime.state;
						if (!state) return Response.json({ error: "会话初始化失败" }, { status: 500 });
						return Response.json({ id: state.sessionId, state });
					}

					const runtime = await manager.create();
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
