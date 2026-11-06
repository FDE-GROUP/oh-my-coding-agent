import { createFileRoute } from "@tanstack/react-router";
import { getRuntimeManager } from "../../server/runtime-manager.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 活跃运行时列表。
 *
 * @internal
 */
export const Route = createFileRoute("/api/runtimes")({
	server: {
		handlers: {
			GET: async () => {
				const user = getCurrentUser();
				const runtimes = getRuntimeManager()
					.list()
					.filter((runtime) => runtime.owner === user.id);
				return Response.json({ runtimes });
			},
		},
	},
});
