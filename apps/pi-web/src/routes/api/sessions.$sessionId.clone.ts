import { createFileRoute } from "@tanstack/react-router";
import { sessionAccess } from "../../server/access.ts";
import { recordSessionOwner } from "../../server/owners.ts";
import { getRuntimeManager } from "../../server/runtime-manager.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 克隆当前会话分支。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/clone")({
	server: {
		handlers: {
			POST: async ({ params }) => {
				const user = getCurrentUser();
				const access = await sessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const manager = getRuntimeManager();
				const runtime = manager.get(params.sessionId);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });

				try {
					const result = await runtime.command({ type: "clone" });
					if (result.data.cancelled) return Response.json({ error: "克隆被取消" }, { status: 409 });
					const state = await runtime.command({ type: "get_state" });
					manager.rekey(params.sessionId, state.data.sessionId);
					recordSessionOwner(state.data.sessionId, access.owner, access.workspaceId);
					return Response.json({ id: state.data.sessionId, state: state.data });
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					const status = message.includes("not been saved") ? 409 : 500;
					return Response.json({ error: message }, { status });
				}
			},
		},
	},
});
