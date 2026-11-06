import { createFileRoute } from "@tanstack/react-router";
import { expandFiles } from "../../server/files.ts";

/**
 * 文件展开路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/files/expand")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: { paths?: string[] } = {};
				try {
					body = (await request.json()) as { paths?: string[] };
				} catch {
					return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
				}
				if (!Array.isArray(body.paths) || body.paths.length === 0) {
					return Response.json({ error: "缺少文件路径" }, { status: 400 });
				}
				try {
					return Response.json(await expandFiles(body.paths));
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
