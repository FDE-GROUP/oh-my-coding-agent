import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendAudit, previewAudit, pruneAudit, queryAudit } from "../audit.mjs";
import { closeDatabase } from "../db.mjs";

describe("audit", () => {
	let dir: string;
	const previous = process.env.FDECODE_CONFIG;
	const previousDb = process.env.FDECODE_DB;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "fdecode-audit-"));
		process.env.FDECODE_CONFIG = join(dir, "config.json");
		writeFileSync(process.env.FDECODE_CONFIG, JSON.stringify({ port: 3210 }));
		delete process.env.FDECODE_DB;
		closeDatabase();
	});

	afterEach(() => {
		closeDatabase();
		if (previous === undefined) delete process.env.FDECODE_CONFIG;
		else process.env.FDECODE_CONFIG = previous;
		if (previousDb === undefined) delete process.env.FDECODE_DB;
		else process.env.FDECODE_DB = previousDb;
	});

	it("appends, queries, and prunes entries", () => {
		appendAudit({ user: "alice", role: "member", action: "session.create", target: "s1", result: "ok" });
		appendAudit({ user: "bob", role: "admin", action: "auth.login", target: "/login", result: "ok" });
		const entries = queryAudit(10);
		expect(entries).toHaveLength(2);
		expect(entries[0]?.user).toBe("bob");
		expect(entries[1]?.action).toBe("session.create");
		expect(statSync(join(dir, "fdecode.db")).mode & 0o777).toBe(0o600);

		const cutoff = Date.now() + 1000;
		expect(previewAudit(cutoff)).toBe(2);
		expect(pruneAudit(cutoff)).toBe(2);
		expect(queryAudit(10)).toHaveLength(0);
	});
});
