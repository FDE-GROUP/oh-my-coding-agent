import { createFileRoute } from "@tanstack/react-router";
import { listGithubRepos } from "../../server/github.ts";
import { getCurrentUser } from "../../server/user.ts";
import { listWorkspaces } from "../../server/workspaces.ts";

/**
 * 工作区列表路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/workspaces")({
	server: {
		handlers: {
			GET: async () =>
				Response.json({
					user: getCurrentUser(),
					workspaces: listWorkspaces(),
					githubRepos: listGithubRepos(),
				}),
		},
	},
});
