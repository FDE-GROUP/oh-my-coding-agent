import { createFileRoute } from "@tanstack/react-router";
import { appendAudit } from "../../../audit.mjs";
import { readSessionAccess } from "../../server/access.ts";
import { GithubError, getIssue, type IssueSummary } from "../../server/github.ts";
import { recordIssueLink } from "../../server/links.ts";
import { recordSessionOwner } from "../../server/owners.ts";
import { getRuntimeManager, RuntimeCapacityError } from "../../server/runtime-manager.ts";
import { listSessions, resolveSession } from "../../server/sessions.ts";
import { getCurrentUser } from "../../server/user.ts";
import { defaultWorkspace, findWorkspace } from "../../server/workspaces.ts";

/**
 * 会话列表与创建路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions")({
	server: {
		handlers: {
			GET: async () => {
				const user = getCurrentUser();
				try {
					return Response.json({ sessions: await listSessions(user.id) });
				} catch (error) {
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},

			POST: async ({ request }) => {
				const user = getCurrentUser();
				let body: { resumeId?: string; workspaceId?: string; issue?: { repoId?: string; number?: number } } = {};
				try {
					body = (await request.json()) as {
						resumeId?: string;
						workspaceId?: string;
						issue?: { repoId?: string; number?: number };
					};
				} catch {
					body = {};
				}

				const manager = getRuntimeManager();
				try {
					if (body.resumeId) {
						const access = await readSessionAccess(body.resumeId, user);
						if (!access) return Response.json({ error: "会话不存在" }, { status: 404 });
						const existing = manager.get(body.resumeId);
						if (existing) {
							const state = await existing.command({ type: "get_state" });
							return Response.json({ id: state.data.sessionId, state: state.data });
						}
						const resolved = await resolveSession(body.resumeId, access.entry.owner);
						if (!resolved) return Response.json({ error: "会话不存在" }, { status: 404 });
						const runtime = await manager.create({
							sessionPath: resolved.summary.path,
							cwd: resolved.workspace.path,
							owner: access.entry.owner,
						});
						const state = runtime.state;
						if (!state) return Response.json({ error: "会话初始化失败" }, { status: 500 });
						return Response.json({ id: state.sessionId, state });
					}

					let issue: IssueSummary | undefined;
					if (body.issue?.repoId && Number.isInteger(body.issue.number) && (body.issue.number ?? 0) > 0) {
						try {
							issue = await getIssue(body.issue.repoId, body.issue.number ?? 0);
						} catch (error) {
							const status = error instanceof GithubError ? error.status : 502;
							return Response.json(
								{ error: error instanceof Error ? error.message : String(error) },
								{ status },
							);
						}
					}

					const workspace = body.workspaceId ? findWorkspace(body.workspaceId) : defaultWorkspace();
					if (!workspace) return Response.json({ error: "工作区不存在" }, { status: 400 });
					const runtime = await manager.create({ cwd: workspace.path, owner: user.id });
					const state = runtime.state;
					if (!state) return Response.json({ error: "会话初始化失败" }, { status: 500 });
					recordSessionOwner(state.sessionId, user.id, workspace.id);
					let draft: string | undefined;
					if (issue && body.issue?.repoId) {
						recordIssueLink({
							sessionId: state.sessionId,
							repoId: body.issue.repoId,
							number: issue.number,
							title: issue.title,
							url: issue.url,
						});
						draft =
							`请处理 GitHub Issue #${issue.number}：${issue.title}\n${issue.url}\n\n${issue.body}`.trimEnd();
					}
					appendAudit({
						user: user.id,
						role: user.role,
						action: "session.create",
						target: state.sessionId,
						result: "ok",
					});
					return Response.json({ id: state.sessionId, state, ...(draft ? { draft } : {}) });
				} catch (error) {
					if (error instanceof RuntimeCapacityError) {
						return Response.json({ error: error.message }, { status: 429 });
					}
					return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
				}
			},
		},
	},
});
