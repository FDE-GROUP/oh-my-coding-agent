import { createFileRoute } from "@tanstack/react-router";
import { GithubError, getIssue } from "../../server/github.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 单条 GitHub Issue。
 *
 * @internal
 */
export const Route = createFileRoute("/api/github/issue")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				getCurrentUser();
				const url = new URL(request.url);
				const repo = url.searchParams.get("repo") ?? "";
				const number = Number(url.searchParams.get("number") ?? 0);
				if (!Number.isInteger(number) || number <= 0) {
					return Response.json({ error: "缺少 issue 编号" }, { status: 400 });
				}
				try {
					return Response.json({ issue: await getIssue(repo, number) });
				} catch (error) {
					const status = error instanceof GithubError ? error.status : 500;
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status });
				}
			},
		},
	},
});
