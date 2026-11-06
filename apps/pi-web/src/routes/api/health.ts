import { createFileRoute } from "@tanstack/react-router";
import { readHealth } from "../../server/health.ts";

/**
 * 健康检查 HTTP 路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => Response.json(readHealth()),
		},
	},
});
