import { createFileRoute } from "@tanstack/react-router";
import { applyRetention, previewRetention } from "../../server/retention.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 管理员保留清理预览与应用。
 *
 * @internal
 */
export const Route = createFileRoute("/api/admin/retention")({
	server: {
		handlers: {
			GET: async () => {
				const user = getCurrentUser();
				if (user.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
				try {
					return Response.json({ preview: await previewRetention() });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},

			POST: async ({ request }) => {
				const user = getCurrentUser();
				if (user.role !== "admin") return Response.json({ error: "无权限" }, { status: 403 });
				let body: { confirm?: boolean } = {};
				try {
					body = (await request.json()) as { confirm?: boolean };
				} catch {
					return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
				}
				if (body.confirm !== true) return Response.json({ error: "需要确认后才能清理" }, { status: 400 });
				try {
					return Response.json({ result: await applyRetention() });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
