import { existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendAudit, queryAudit } from "../audit.mjs";
import { closeDatabase, getDatabase, resolveDbPath } from "../db.mjs";
import { runInTransaction } from "../src/server/db.ts";
import { getIssueLink, recordIssueLink } from "../src/server/links.ts";
import { getSessionOwner, recordSessionOwner } from "../src/server/owners.ts";
import { listShares } from "../src/server/shares.ts";

const previousConfig = process.env.FDECODE_CONFIG;
const previousDb = process.env.FDECODE_DB;

describe("database", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "fdecode-db-"));
		process.env.FDECODE_CONFIG = join(dir, "config.json");
		writeFileSync(
			process.env.FDECODE_CONFIG,
			JSON.stringify({ port: 3210, workspaces: [{ id: "w", name: "w", path: dir }] }),
		);
		delete process.env.FDECODE_DB;
		closeDatabase();
	});

	afterEach(() => {
		closeDatabase();
		if (previousConfig === undefined) delete process.env.FDECODE_CONFIG;
		else process.env.FDECODE_CONFIG = previousConfig;
		if (previousDb === undefined) delete process.env.FDECODE_DB;
		else process.env.FDECODE_DB = previousDb;
	});

	it("creates the schema and keeps the database at 0600", () => {
		recordSessionOwner("s1", "alice", "w");
		expect(getSessionOwner("s1")?.owner).toBe("alice");
		const path = resolveDbPath();
		expect(path).toBe(join(dir, "fdecode.db"));
		expect(existsSync(path)).toBe(true);
		expect(statSync(path).mode & 0o777).toBe(0o600);
	});

	it("imports legacy json once and deletes the files", () => {
		writeFileSync(
			join(dir, "sessions.json"),
			JSON.stringify({ sessions: [{ id: "s1", owner: "alice", workspaceId: "w", updatedAt: 1 }] }),
		);
		writeFileSync(
			join(dir, "links.json"),
			JSON.stringify({
				links: [
					{
						sessionId: "s1",
						repoId: "demo",
						number: 3,
						title: "Issue",
						url: "https://example.test/3",
					},
				],
			}),
		);
		writeFileSync(
			join(dir, "shares.json"),
			JSON.stringify({
				shares: [
					{
						tokenHash: "a".repeat(64),
						sessionId: "s1",
						owner: "alice",
						createdAt: 1,
						expiresAt: Date.now() + 60_000,
					},
				],
			}),
		);
		writeFileSync(
			join(dir, "audit.jsonl"),
			`${JSON.stringify({ ts: 1, user: "alice", role: "member", action: "a", target: "t", result: "ok" })}\n${JSON.stringify({ ts: 2, user: "bob", role: "admin", action: "b", target: "t", result: "failed" })}\n`,
		);

		expect(getSessionOwner("s1")?.workspaceId).toBe("w");
		expect(getIssueLink("s1")?.number).toBe(3);
		expect(listShares("s1", "alice")).toHaveLength(1);
		expect(queryAudit(10).map((entry) => entry.action)).toEqual(["b", "a"]);
		for (const name of ["sessions.json", "links.json", "shares.json", "audit.jsonl"]) {
			expect(existsSync(join(dir, name))).toBe(false);
		}

		writeFileSync(
			join(dir, "sessions.json"),
			JSON.stringify({ sessions: [{ id: "s9", owner: "alice", workspaceId: "w", updatedAt: 3 }] }),
		);
		closeDatabase();
		getDatabase();
		expect(getSessionOwner("s9")).toBeUndefined();
		expect(existsSync(join(dir, "sessions.json"))).toBe(false);
	});

	it("fails the migration on corrupt json and keeps the file", () => {
		writeFileSync(join(dir, "sessions.json"), "{ not json");
		expect(() => getDatabase()).toThrow(/无法解析旧存储/);
		expect(existsSync(join(dir, "sessions.json"))).toBe(true);

		writeFileSync(
			join(dir, "sessions.json"),
			JSON.stringify({ sessions: [{ id: "s1", owner: "alice", workspaceId: "w", updatedAt: 1 }] }),
		);
		closeDatabase();
		expect(getSessionOwner("s1")?.owner).toBe("alice");
		expect(existsSync(join(dir, "sessions.json"))).toBe(false);
	});

	it("honors FDECODE_DB", () => {
		const custom = join(dir, "nested", "custom.db");
		process.env.FDECODE_DB = custom;
		recordIssueLink({ sessionId: "s1", repoId: "demo", number: 1, title: "T", url: "u" });
		expect(resolveDbPath()).toBe(custom);
		expect(statSync(custom).mode & 0o777).toBe(0o600);
	});

	it("rolls back a failed transaction", () => {
		recordSessionOwner("s1", "alice", "w");
		expect(() =>
			runInTransaction(() => {
				recordSessionOwner("s2", "bob", "w");
				throw new Error("boom");
			}),
		).toThrow("boom");
		expect(getSessionOwner("s2")).toBeUndefined();
		expect(getSessionOwner("s1")?.owner).toBe("alice");
	});

	it("appends and prunes audit events", () => {
		appendAudit({ user: "alice", role: "member", action: "a", target: "t", result: "ok" });
		appendAudit({ user: "bob", role: "admin", action: "b", target: "t", result: "ok" });
		expect(queryAudit(10).map((entry) => entry.action)).toEqual(["b", "a"]);
	});
});
