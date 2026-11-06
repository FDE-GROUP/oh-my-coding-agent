import { createFileRoute } from "@tanstack/react-router";
import { searchFiles } from "../../server/files.ts";

/**
 * 文件搜索路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/files/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const query = new URL(request.url).searchParams.get("q") ?? "";
				try {
					return Response.json({ files: await searchFiles(query) });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
