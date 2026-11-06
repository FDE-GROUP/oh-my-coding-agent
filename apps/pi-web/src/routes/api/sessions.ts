import { createFileRoute } from "@tanstack/react-router";
import { sessionAccess } from "../../server/access.ts";
import { recordSessionOwner } from "../../server/owners.ts";
import { getRuntimeManager, RuntimeCapacityError } from "../../server/runtime-manager.ts";
import { listSessions, resolveSession } from "../../server/sessions.ts";
import { getCurrentUser } from "../../server/user.ts";
import { defaultWorkspace, findWorkspace } from "../../server/workspaces.ts";

/**
 * 会话列表与创建路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions")({
	server: {
		handlers: {
			GET: async () => {
				const user = getCurrentUser();
				try {
					return Response.json({ sessions: await listSessions(user.id) });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},

			POST: async ({ request }) => {
				const user = getCurrentUser();
				let body: { resumeId?: string; workspaceId?: string } = {};
				try {
					body = (await request.json()) as { resumeId?: string; workspaceId?: string };
				} catch {
					body = {};
				}

				const manager = getRuntimeManager();
				try {
					if (body.resumeId) {
						const access = await sessionAccess(body.resumeId, user);
						if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
						const existing = manager.get(body.resumeId);
						if (existing) {
							const state = await existing.command({ type: "get_state" });
							return Response.json({ id: state.data.sessionId, state: state.data });
						}
						const resolved = await resolveSession(body.resumeId, user.id);
						if (!resolved) return Response.json({ error: "会话不存在" }, { status: 404 });
						const runtime = await manager.create({
							sessionPath: resolved.summary.path,
							cwd: resolved.workspace.path,
							owner: user.id,
						});
						const state = runtime.state;
						if (!state) return Response.json({ error: "会话初始化失败" }, { status: 500 });
						return Response.json({ id: state.sessionId, state });
					}

					const workspace = body.workspaceId ? findWorkspace(body.workspaceId) : defaultWorkspace();
					if (!workspace) return Response.json({ error: "工作区不存在" }, { status: 400 });
					const runtime = await manager.create({ cwd: workspace.path, owner: user.id });
					const state = runtime.state;
					if (!state) return Response.json({ error: "会话初始化失败" }, { status: 500 });
					recordSessionOwner(state.sessionId, user.id, workspace.id);
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
