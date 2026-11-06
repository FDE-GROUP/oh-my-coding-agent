import { createFileRoute } from "@tanstack/react-router";
import { appendAudit } from "../../../audit.mjs";
import { sessionAccess } from "../../server/access.ts";
import { createShare, listShares } from "../../server/shares.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 会话分享创建与列表路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/shares")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const user = getCurrentUser();
				const access = await sessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				return Response.json({
					shares: listShares(params.sessionId, user.id).map((share) => ({
						id: share.tokenHash,
						createdAt: share.createdAt,
						expiresAt: share.expiresAt,
						revokedAt: share.revokedAt,
					})),
				});
			},

			POST: async ({ params, request }) => {
				const user = getCurrentUser();
				const access = await sessionAccess(params.sessionId, user);
				if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
				let body: { expiresInDays?: number } = {};
				try {
					body = (await request.json()) as { expiresInDays?: number };
				} catch {
					body = {};
				}
				const days = Math.min(30, Math.max(1, Number(body.expiresInDays ?? 7)));
				const share = createShare(params.sessionId, user.id, days * 24 * 60 * 60 * 1000);
				appendAudit({
					user: user.id,
					role: user.role,
					action: "share.create",
					target: params.sessionId,
					result: "ok",
					detail: share.token.slice(0, 6),
				});
				const origin = new URL(request.url).origin;
				return Response.json({
					token: share.token,
					expiresAt: share.expiresAt,
					url: `${origin}/share/${share.token}`,
				});
			},
		},
	},
});
