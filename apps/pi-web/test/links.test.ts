import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getIssueLink, recordIssueLink, removeIssueLink, removeIssueLinks, resetLinkCache } from "../src/server/links.ts";

describe("issue links", () => {
	let dir: string;
	const previous = process.env.PI_WEB_CONFIG;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pi-web-links-"));
		process.env.PI_WEB_CONFIG = join(dir, "config.json");
		writeFileSync(
			process.env.PI_WEB_CONFIG,
			JSON.stringify({ port: 3210, workspaces: [{ id: "w", name: "w", path: dir }] }),
		);
		resetLinkCache();
	});

	afterEach(() => {
		if (previous === undefined) delete process.env.PI_WEB_CONFIG;
		else process.env.PI_WEB_CONFIG = previous;
		resetLinkCache();
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
		const file = join(dir, "links.json");
		expect(statSync(file).mode & 0o777).toBe(0o600);
		expect(JSON.parse(readFileSync(file, "utf8")).links).toEqual([]);
	});
});
