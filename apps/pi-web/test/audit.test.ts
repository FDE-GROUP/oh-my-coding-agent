import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendAudit, queryAudit } from "../audit.mjs";

describe("audit", () => {
	let dir: string;
	const previous = process.env.PI_WEB_CONFIG;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pi-web-audit-"));
		process.env.PI_WEB_CONFIG = join(dir, "config.json");
		writeFileSync(process.env.PI_WEB_CONFIG, JSON.stringify({ port: 3210 }));
	});

	afterEach(() => {
		if (previous === undefined) delete process.env.PI_WEB_CONFIG;
		else process.env.PI_WEB_CONFIG = previous;
	});

	it("appends and queries entries", () => {
		appendAudit({ user: "alice", role: "member", action: "session.create", target: "s1", result: "ok" });
		appendAudit({ user: "bob", role: "admin", action: "auth.login", target: "/login", result: "ok" });
		const entries = queryAudit(10);
		expect(entries).toHaveLength(2);
		expect(entries[0]?.user).toBe("bob");
		expect(entries[1]?.action).toBe("session.create");
		expect(statSync(join(dir, "audit.jsonl")).mode & 0o777).toBe(0o600);
	});
});
