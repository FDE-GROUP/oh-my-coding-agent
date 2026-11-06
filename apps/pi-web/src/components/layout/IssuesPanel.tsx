import { useEffect, useState } from "react";
import { fetchGithubIssues, type GithubIssue, type GithubRepoInfo } from "../../lib/api.ts";
import { Button } from "../primitives/Button.tsx";

export interface IssuesPanelProps {
	repos: GithubRepoInfo[];
	workspaceId: string;
	onClose: () => void;
	onCreate: (repoId: string, number: number) => void;
}

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("zh-CN");
}

export function IssuesPanel({ repos, workspaceId, onClose, onCreate }: IssuesPanelProps) {
	const [repoId, setRepoId] = useState(repos[0]?.id ?? "");
	const [issues, setIssues] = useState<GithubIssue[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!repoId) return;
		let cancelled = false;
		setLoading(true);
		setError(null);
		fetchGithubIssues(repoId)
			.then((list) => {
				if (!cancelled) setIssues(list);
			})
			.catch((caught) => {
				if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [repoId]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="关闭 Issues"
				className="absolute inset-0 bg-dsw-bg-mask-1"
				onClick={onClose}
			/>
			<div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">GitHub Issues</h2>
					<select
						value={repoId}
						onChange={(event) => setRepoId(event.target.value)}
						className="rounded-dsw-xs border border-dsw-border-l1 bg-dsw-bg-layer-1 px-2 py-1 text-xs"
					>
						{repos.map((repo) => (
							<option key={repo.id} value={repo.id}>
								{repo.owner}/{repo.name}
							</option>
						))}
					</select>
					<button type="button" className="ml-auto text-xs text-dsw-label-tertiary" onClick={onClose}>
						关闭
					</button>
				</div>
				<p className="mt-1 text-[11px] text-dsw-label-tertiary">
					工作区：{workspaceId || "默认"}。选择 Issue 会新建会话并填入草稿。
				</p>

				{error && <p className="mt-2 text-xs text-dsw-state-error">{error}</p>}
				{loading && <p className="mt-2 text-xs text-dsw-label-tertiary">正在加载…</p>}

				<div className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
					{!loading && issues.length === 0 && !error && (
						<p className="text-xs text-dsw-label-tertiary">没有 open issue。</p>
					)}
					{issues.map((issue) => (
						<div
							key={issue.number}
							className="flex items-center gap-3 border-t border-hairline border-dsw-border-l1 py-2"
						>
							<div className="min-w-0 flex-1">
								<a
									href={issue.url}
									target="_blank"
									rel="noreferrer"
									className="block truncate text-xs text-dsw-link"
								>
									#{issue.number} {issue.title}
								</a>
								<span className="text-[11px] text-dsw-label-tertiary">
									{issue.labels.join(", ")}
									{issue.labels.length > 0 ? " · " : ""}
									{formatDate(issue.updatedAt)}
								</span>
							</div>
							<Button variant="secondary" onClick={() => onCreate(repoId, issue.number)}>
								创建会话
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
