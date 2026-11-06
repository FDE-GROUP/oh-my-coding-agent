import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeManager } from "../../server/runtime-manager.ts";

/**
 * 活跃运行时列表。
 *
 * @internal
 */
export const Route = createFileRoute("/api/runtimes")({
	server: {
		handlers: {
			GET: async () => Response.json({ runtimes: getRuntimeManager().list() }),
		},
	},
});
