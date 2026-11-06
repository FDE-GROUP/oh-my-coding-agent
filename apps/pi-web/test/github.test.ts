import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getCiStatus, getIssue, listIssues } from "../src/server/github.ts";

let server: Server;
let base = "";
let requests = 0;
let lastAuthorization = "";
const previousApi = process.env.PI_WEB_GITHUB_API;
const previousConfig = process.env.PI_WEB_CONFIG;
const previousToken = process.env.PI_WEB_GITHUB_TOKEN;

beforeAll(async () => {
	server = createServer((request, response) => {
		requests += 1;
		lastAuthorization = request.headers.authorization ?? "";
		const url = new URL(request.url ?? "/", "http://localhost");
		if (url.pathname === "/repos/acme/demo/issues") {
			response.writeHead(200, { "content-type": "application/json", etag: '"abc"' });
			response.end(
				JSON.stringify([
					{
						number: 1,
						title: "Real issue",
						body: "Body",
						html_url: "https://example.test/1",
						state: "open",
						labels: [{ name: "bug" }],
						updated_at: "2026-11-06T00:00:00Z",
					},
					{
						number: 2,
						title: "A PR",
						pull_request: {},
						html_url: "https://example.test/2",
						state: "open",
						labels: [],
						updated_at: "2026-11-06T00:00:00Z",
					},
				]),
			);
			return;
		}
		if (url.pathname === "/repos/acme/demo/issues/1") {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					number: 1,
					title: "Real issue",
					body: "Body",
					html_url: "https://example.test/1",
					state: "open",
					labels: [],
					updated_at: "2026-11-06T00:00:00Z",
				}),
			);
			return;
		}
		if (url.pathname === "/repos/acme/demo/actions/runs") {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					workflow_runs: [
						{
							name: "CI",
							status: "completed",
							conclusion: "success",
							head_branch: "main",
							html_url: "https://example.test/run",
							updated_at: "2026-11-06T00:00:00Z",
						},
					],
				}),
			);
			return;
		}
		response.writeHead(404, { "content-type": "application/json" });
		response.end(JSON.stringify({ message: "Not Found" }));
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

	const dir = mkdtempSync(join(tmpdir(), "pi-web-github-"));
	const configPath = join(dir, "config.json");
	writeFileSync(
		configPath,
		JSON.stringify({
			port: 3210,
			workspaces: [{ id: "w", name: "w", path: dir }],
			github: { repos: [{ id: "demo", owner: "acme", name: "demo", branch: "main" }] },
		}),
	);
	process.env.PI_WEB_CONFIG = configPath;
	process.env.PI_WEB_GITHUB_API = base;
	process.env.PI_WEB_GITHUB_TOKEN = "test-token";
});

afterAll(() => {
	server.close();
	if (previousApi === undefined) delete process.env.PI_WEB_GITHUB_API;
	else process.env.PI_WEB_GITHUB_API = previousApi;
	if (previousConfig === undefined) delete process.env.PI_WEB_CONFIG;
	else process.env.PI_WEB_CONFIG = previousConfig;
	if (previousToken === undefined) delete process.env.PI_WEB_GITHUB_TOKEN;
	else process.env.PI_WEB_GITHUB_TOKEN = previousToken;
});

describe("github", () => {
	it("lists issues, filters PRs, and caches", async () => {
		const first = await listIssues("demo");
		expect(first).toHaveLength(1);
		expect(first[0]?.number).toBe(1);
		expect(lastAuthorization).toBe("Bearer test-token");
		const count = requests;
		await listIssues("demo");
		expect(requests).toBe(count);
	});

	it("reads a single issue and rejects PRs", async () => {
		const issue = await getIssue("demo", 1);
		expect(issue.title).toBe("Real issue");
		await expect(getIssue("demo", 2)).rejects.toThrow(/资源不存在/);
	});

	it("reads CI status", async () => {
		const ci = await getCiStatus("demo");
		expect(ci?.conclusion).toBe("success");
		expect(ci?.branch).toBe("main");
	});
});
