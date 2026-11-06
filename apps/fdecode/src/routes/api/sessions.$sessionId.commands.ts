import type { RpcCommand } from "@earendil-works/pi-coding-agent";
import { createFileRoute } from "@tanstack/react-router";
import { sessionAccess } from "../../server/access.ts";
import { getRuntimeManager } from "../../server/runtime-manager.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 会话命令转发路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/commands")({
	server: {
		handlers: {
			POST: async ({ params, request }) => {
				const user = getCurrentUser();
				const access = await sessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				const runtime = getRuntimeManager().get(params.sessionId);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });

				let command: RpcCommand;
				try {
					command = (await request.json()) as RpcCommand;
				} catch {
					return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
				}
				if (!command || typeof command.type !== "string") {
					return Response.json({ error: "缺少命令类型" }, { status: 400 });
				}

				try {
					const response = await runtime.command(command);
					return Response.json({ ok: true, response });
				} catch (error) {
					return Response.json(
						{ ok: false, error: error instanceof Error ? error.message : String(error) },
						{ status: 500 },
					);
				}
			},
		},
	},
});
