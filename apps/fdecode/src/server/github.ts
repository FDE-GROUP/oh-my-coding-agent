/**
 * 服务端 GitHub 客户端。
 *
 * @remarks
 * token 只从配置或 `FDECODE_GITHUB_TOKEN` 读取，不返回浏览器。请求带 10 秒超时，
 * 使用 ETag 缓存 60 秒；Node 需要 `NODE_USE_ENV_PROXY=1` 时才会读取代理环境变量。
 *
 * @internal
 */
import { getAppConfig } from "./config.ts";

/**
 * GitHub 仓库配置。
 *
 * @internal
 */
export interface GithubRepo {
	id: string;
	owner: string;
	name: string;
	branch?: string;
}

/**
 * Issue 摘要。
 *
 * @internal
 */
export interface IssueSummary {
	number: number;
	title: string;
	body: string;
	url: string;
	state: string;
	labels: string[];
	updatedAt: string;
}

/**
 * CI 状态。
 *
 * @internal
 */
export interface CiStatus {
	name: string;
	status: string;
	conclusion: string | null;
	branch: string | null;
	url: string;
	updatedAt: string;
}

/**
 * GitHub 请求错误。
 *
 * @internal
 */
export class GithubError extends Error {
	readonly status: number;

	constructor(message: string, status = 502) {
		super(message);
		this.name = "GithubError";
		this.status = status;
	}
}

interface CacheEntry {
	etag?: string;
	data: unknown;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_MS = 60_000;

function repos(): GithubRepo[] {
	return getAppConfig().config.github.repos;
}

function repoById(id: string): GithubRepo | undefined {
	return repos().find((repo) => repo.id === id);
}

function baseUrl(): string {
	return (process.env.FDECODE_GITHUB_API ?? "https://api.github.com").replace(/\/$/, "");
}

function token(): string {
	return process.env.FDECODE_GITHUB_TOKEN ?? getAppConfig().config.github.token;
}

async function request<T>(path: string): Promise<T> {
	const url = `${baseUrl()}${path}`;
	const cached = cache.get(url);
	if (cached && cached.expiresAt > Date.now()) return cached.data as T;

	const headers: Record<string, string> = {
		accept: "application/vnd.github+json",
		"x-github-api-version": "2022-11-28",
		"user-agent": "fdecode",
	};
	if (token()) headers.authorization = `Bearer ${token()}`;
	if (cached?.etag) headers["if-none-match"] = cached.etag;

	let response: Response;
	try {
		response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
	} catch (error) {
		throw new GithubError(`GitHub 请求失败：${error instanceof Error ? error.message : String(error)}`);
	}

	if (response.status === 304 && cached) {
		cached.expiresAt = Date.now() + CACHE_MS;
		return cached.data as T;
	}
	if (!response.ok) {
		if (response.status === 404) throw new GithubError("GitHub 资源不存在", 404);
		if (response.status === 401 || response.status === 403) {
			throw new GithubError("GitHub 认证失败或无权限", 403);
		}
		throw new GithubError(`GitHub 返回 ${response.status}`, 502);
	}

	const data = (await response.json()) as T;
	cache.set(url, { etag: response.headers.get("etag") ?? undefined, data, expiresAt: Date.now() + CACHE_MS });
	return data;
}

/**
 * 列出配置仓库的 open issues。
 *
 * @param repoId - 仓库配置 id。
 * @returns Issue 摘要，已过滤 PR。
 * @internal
 */
export async function listIssues(repoId: string): Promise<IssueSummary[]> {
	const repo = repoById(repoId);
	if (!repo) throw new GithubError("仓库未配置", 404);
	const data = await request<Array<Record<string, unknown>>>(
		`/repos/${repo.owner}/${repo.name}/issues?state=open&per_page=50`,
	);
	return data
		.filter((item) => item.pull_request === undefined)
		.slice(0, 50)
		.map((item) => ({
			number: Number(item.number),
			title: String(item.title ?? ""),
			body: typeof item.body === "string" ? item.body : "",
			url: String(item.html_url ?? ""),
			state: String(item.state ?? "open"),
			labels: Array.isArray(item.labels)
				? item.labels
						.map((label) => (label && typeof label === "object" ? (label as { name?: string }).name : undefined))
						.filter((name): name is string => Boolean(name))
				: [],
			updatedAt: String(item.updated_at ?? ""),
		}));
}

/**
 * 读取单条 issue。
 *
 * @param repoId - 仓库配置 id。
 * @param number - Issue 编号。
 * @returns Issue 摘要。
 * @internal
 */
export async function getIssue(repoId: string, number: number): Promise<IssueSummary> {
	const repo = repoById(repoId);
	if (!repo) throw new GithubError("仓库未配置", 404);
	const item = await request<Record<string, unknown>>(`/repos/${repo.owner}/${repo.name}/issues/${number}`);
	if (item.pull_request !== undefined) throw new GithubError("该编号是 Pull Request，不是 Issue", 400);
	return {
		number: Number(item.number),
		title: String(item.title ?? ""),
		body: typeof item.body === "string" ? item.body : "",
		url: String(item.html_url ?? ""),
		state: String(item.state ?? "open"),
		labels: Array.isArray(item.labels)
			? item.labels
					.map((label) => (label && typeof label === "object" ? (label as { name?: string }).name : undefined))
					.filter((name): name is string => Boolean(name))
			: [],
		updatedAt: String(item.updated_at ?? ""),
	};
}

/**
 * 查询仓库最近的 CI 状态。
 *
 * @param repoId - 仓库配置 id。
 * @param branch - 分支；省略时用仓库配置的分支。
 * @returns 最近一次 workflow run；没有运行时返回 `null`。
 * @internal
 */
export async function getCiStatus(repoId: string, branch?: string): Promise<CiStatus | null> {
	const repo = repoById(repoId);
	if (!repo) throw new GithubError("仓库未配置", 404);
	const target = branch ?? repo.branch;
	const query = new URLSearchParams({ per_page: "1" });
	if (target) query.set("branch", target);
	const data = await request<{ workflow_runs?: Array<Record<string, unknown>> }>(
		`/repos/${repo.owner}/${repo.name}/actions/runs?${query.toString()}`,
	);
	const run = data.workflow_runs?.[0];
	if (!run) return null;
	return {
		name: String(run.name ?? "workflow"),
		status: String(run.status ?? "unknown"),
		conclusion: typeof run.conclusion === "string" ? run.conclusion : null,
		branch: typeof run.head_branch === "string" ? run.head_branch : null,
		url: String(run.html_url ?? ""),
		updatedAt: String(run.updated_at ?? ""),
	};
}

/**
 * 列出可展示的仓库配置。
 *
 * @returns 不含 token 的仓库列表。
 * @internal
 */
export function listGithubRepos(): GithubRepo[] {
	return repos().map((repo) => ({ ...repo }));
}
