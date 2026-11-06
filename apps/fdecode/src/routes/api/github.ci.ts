import { createFileRoute } from "@tanstack/react-router";
import { GithubError, getCiStatus } from "../../server/github.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * GitHub CI 状态。
 *
 * @internal
 */
export const Route = createFileRoute("/api/github/ci")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				getCurrentUser();
				const url = new URL(request.url);
				const repo = url.searchParams.get("repo") ?? "";
				const branch = url.searchParams.get("branch") ?? undefined;
				try {
					return Response.json({ ci: await getCiStatus(repo, branch) });
				} catch (error) {
					const status = error instanceof GithubError ? error.status : 500;
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status });
				}
			},
		},
	},
});
