import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../src/server/db.ts";
import { getIssueLink, recordIssueLink, removeIssueLink, removeIssueLinks, resetLinkCache } from "../src/server/links.ts";

describe("issue links", () => {
	let dir: string;
	const previous = process.env.PI_WEB_CONFIG;
	const previousDb = process.env.PI_WEB_DB;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pi-web-links-"));
		process.env.PI_WEB_CONFIG = join(dir, "config.json");
		writeFileSync(
			process.env.PI_WEB_CONFIG,
			JSON.stringify({ port: 3210, workspaces: [{ id: "w", name: "w", path: dir }] }),
		);
		delete process.env.PI_WEB_DB;
		resetLinkCache();
	});

	afterEach(() => {
		resetLinkCache();
		if (previous === undefined) delete process.env.PI_WEB_CONFIG;
		else process.env.PI_WEB_CONFIG = previous;
		if (previousDb === undefined) delete process.env.PI_WEB_DB;
		else process.env.PI_WEB_DB = previousDb;
	});

	it("records, reads, and removes links", () => {
		recordIssueLink({
			sessionId: "s1",
			repoId: "demo",
			number: 7,
			title: "Fix it",
			url: "https://example.test/7",
		});
		recordIssueLink({
			sessionId: "s2",
			repoId: "demo",
			number: 8,
			title: "Other",
			url: "https://example.test/8",
		});
		expect(getIssueLink("s1")?.number).toBe(7);
		removeIssueLink("s1");
		expect(getIssueLink("s1")).toBeUndefined();
		removeIssueLinks(["s2"]);
		expect(getIssueLink("s2")).toBeUndefined();
		const row = getDb().prepare("SELECT COUNT(*) AS count FROM issue_links").get() as { count: number };
		expect(row.count).toBe(0);
		expect(statSync(join(dir, "pi-web.db")).mode & 0o777).toBe(0o600);
	});
});
