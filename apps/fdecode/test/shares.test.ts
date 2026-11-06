import { createHash } from "node:crypto";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../src/server/db.ts";
import {
	createShare,
	findValidShare,
	listShares,
	previewSharePrune,
	pruneShares,
	resetShareCache,
	revokeShare,
} from "../src/server/shares.ts";

describe("shares", () => {
	let dir: string;
	const previous = process.env.FDECODE_CONFIG;
	const previousDb = process.env.FDECODE_DB;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "fdecode-shares-"));
		process.env.FDECODE_CONFIG = join(dir, "config.json");
		writeFileSync(
			process.env.FDECODE_CONFIG,
			JSON.stringify({ port: 3210, workspaces: [{ id: "w", name: "w", path: dir }] }),
		);
		delete process.env.FDECODE_DB;
		resetShareCache();
	});

	afterEach(() => {
		resetShareCache();
		if (previous === undefined) delete process.env.FDECODE_CONFIG;
		else process.env.FDECODE_CONFIG = previous;
		if (previousDb === undefined) delete process.env.FDECODE_DB;
		else process.env.FDECODE_DB = previousDb;
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

	it("previews and prunes by session and age", () => {
		const removed = createShare("session-1", "alice");
		const kept = createShare("session-2", "alice");
		expect(previewSharePrune(new Set(["session-1"]))).toBe(1);
		expect(pruneShares(new Set(["session-1"]))).toBe(1);
		expect(findValidShare(removed.token)).toBeUndefined();
		expect(findValidShare(kept.token)).toBeTruthy();
		expect(pruneShares(new Set(), Date.now() + 1000)).toBe(1);
		expect(findValidShare(kept.token)).toBeUndefined();
	});

	it("stores only hashes and protects the database", () => {
		const share = createShare("session-1", "alice");
		const row = getDb().prepare("SELECT token_hash FROM shares").get() as { token_hash: string };
		const hash = createHash("sha256").update(share.token).digest("hex");
		expect(row.token_hash).toBe(hash);
		expect(row.token_hash).not.toBe(share.token);
		expect(statSync(join(dir, "fdecode.db")).mode & 0o777).toBe(0o600);
	});
});
