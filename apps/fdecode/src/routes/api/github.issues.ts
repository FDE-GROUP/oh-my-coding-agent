import { createFileRoute } from "@tanstack/react-router";
import { GithubError, listIssues } from "../../server/github.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * GitHub Issue 列表。
 *
 * @internal
 */
export const Route = createFileRoute("/api/github/issues")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				getCurrentUser();
				const repo = new URL(request.url).searchParams.get("repo") ?? "";
				try {
					return Response.json({ issues: await listIssues(repo) });
				} catch (error) {
					const status = error instanceof GithubError ? error.status : 500;
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status });
				}
			},
		},
	},
});
