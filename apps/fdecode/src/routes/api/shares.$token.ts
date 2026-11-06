import { createFileRoute } from "@tanstack/react-router";
import { appendAudit } from "../../../audit.mjs";
import { ensureRuntime } from "../../server/access.ts";
import { resolveSession } from "../../server/sessions.ts";
import { findValidShare, revokeShare } from "../../server/shares.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 分享快照与撤销路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/shares/$token")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				getCurrentUser();
				const share = findValidShare(params.token);
				if (!share) return Response.json({ error: "分享不存在或已失效" }, { status: 404 });
				const resolved = await resolveSession(share.sessionId, share.owner);
				if (!resolved) return Response.json({ error: "会话不存在" }, { status: 404 });
				const runtime = await ensureRuntime(share.sessionId, share.owner);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });
				try {
					const snapshot = await runtime.snapshot();
					return Response.json({
						snapshot,
						session: {
							id: resolved.summary.id,
							name: resolved.summary.name,
							workspace: resolved.workspace.name,
						},
					});
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},

			DELETE: async ({ params }) => {
				const user = getCurrentUser();
				const revoked = revokeShare(params.token, user.id);
				if (!revoked) return Response.json({ error: "分享不存在或无权限" }, { status: 404 });
				appendAudit({
					user: user.id,
					role: user.role,
					action: "share.revoke",
					target: params.token.slice(0, 6),
					result: "ok",
				});
				return Response.json({ ok: true });
			},
		},
	},
});
