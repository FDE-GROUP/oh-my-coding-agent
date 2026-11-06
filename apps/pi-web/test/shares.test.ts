import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createShare, findValidShare, listShares, resetShareCache, revokeShare } from "../src/server/shares.ts";

describe("shares", () => {
	let dir: string;
	const previous = process.env.PI_WEB_CONFIG;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pi-web-shares-"));
		process.env.PI_WEB_CONFIG = join(dir, "config.json");
		writeFileSync(
			process.env.PI_WEB_CONFIG,
			JSON.stringify({ port: 3210, workspaces: [{ id: "w", name: "w", path: dir }] }),
		);
		resetShareCache();
	});

	afterEach(() => {
		if (previous === undefined) delete process.env.PI_WEB_CONFIG;
		else process.env.PI_WEB_CONFIG = previous;
		resetShareCache();
	});

	it("creates, resolves, lists, and revokes shares", () => {
		const share = createShare("session-1", "alice");
		expect(findValidShare(share.token)?.sessionId).toBe("session-1");
		expect(listShares("session-1", "alice")).toHaveLength(1);
		expect(listShares("session-1", "bob")).toHaveLength(0);
		expect(revokeShare(share.token, "bob")).toBe(false);
		expect(findValidShare(share.token)).toBeTruthy();
		expect(revokeShare(share.token, "alice")).toBe(true);
		expect(findValidShare(share.token)).toBeUndefined();
	});

	it("stores only hashes and protects the file", () => {
		const share = createShare("session-1", "alice");
		const file = join(dir, "shares.json");
		const content = readFileSync(file, "utf8");
		const hash = createHash("sha256").update(share.token).digest("hex");
		expect(content).not.toContain(share.token);
		expect(content).toContain(hash);
		expect(statSync(file).mode & 0o777).toBe(0o600);
	});
});
