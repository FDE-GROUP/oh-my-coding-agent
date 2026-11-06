import { createFileRoute } from "@tanstack/react-router";
import { appendAudit } from "../../../audit.mjs";
import { readSessionAccess, sessionAccess } from "../../server/access.ts";
import { getRuntimeManager } from "../../server/runtime-manager.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 单个会话的快照、重命名与关闭路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const user = getCurrentUser();
				const access = await readSessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
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
				const user = getCurrentUser();
				const access = await sessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const closed = await getRuntimeManager().close(params.sessionId);
				if (!closed) return Response.json({ error: "会话未加载" }, { status: 404 });
				appendAudit({
					user: user.id,
					role: user.role,
					action: "session.delete",
					target: params.sessionId,
					result: "ok",
				});
				return Response.json({ ok: true });
			},
			PATCH: async ({ params, request }) => {
				const user = getCurrentUser();
				const access = await sessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const runtime = getRuntimeManager().get(params.sessionId);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });
				let body: { name?: string } = {};
				try {
					body = (await request.json()) as { name?: string };
				} catch {
					return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
				}
				const name = body.name?.trim();
				if (!name) return Response.json({ error: "缺少会话名称" }, { status: 400 });
				try {
					await runtime.command({ type: "set_session_name", name });
					return Response.json({ ok: true, name });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
