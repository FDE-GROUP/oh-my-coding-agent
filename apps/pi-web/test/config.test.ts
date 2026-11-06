import { chmodSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashToken, loadConfig } from "../config.mjs";
import { getSessionOwner, listSessionOwners, recordSessionOwner, removeSessionOwner, resetOwnerCache } from "../src/server/owners.ts";

describe("config", () => {
	let dir: string;
	let configPath: string;
	const previous = process.env.PI_WEB_CONFIG;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pi-web-config-"));
		configPath = join(dir, "config.json");
		process.env.PI_WEB_CONFIG = configPath;
	});

	afterEach(() => {
		if (previous === undefined) delete process.env.PI_WEB_CONFIG;
		else process.env.PI_WEB_CONFIG = previous;
		resetOwnerCache();
	});

	it("loads workspaces and validates paths", () => {
		const workspace = join(dir, "workspace");
		mkdirSync(workspace, { recursive: true });
		writeFileSync(join(dir, "file"), "");
		const config = {
			host: "127.0.0.1",
			port: 3210,
			workspaces: [
				{ id: "ok", name: "ok", path: workspace },
				{ id: "missing", name: "missing", path: join(dir, "missing") },
				{ id: "file", name: "file", path: join(dir, "file") },
			],
		};
		writeFileSync(configPath, JSON.stringify(config));

		const loaded = loadConfig();
		expect(loaded.config.workspaces.some((item) => item.id === "ok")).toBe(true);
		expect(loaded.errors.join(" ")).toContain("工作区不存在");
	});

	it("generates a secret when users exist", () => {
		writeFileSync(
			configPath,
			JSON.stringify({
				port: 3210,
				auth: { users: [{ id: "a", name: "A", tokenHash: hashToken("token") }] },
				workspaces: [{ id: "w", name: "w", path: dir }],
			}),
		);
		const loaded = loadConfig();
		expect(loaded.config.auth.secret.length).toBeGreaterThan(20);
		const persisted = JSON.parse(readFileSync(configPath, "utf8"));
		expect(persisted.auth.secret).toBe(loaded.config.auth.secret);
		expect(statSync(configPath).mode & 0o777).toBe(0o600);
	});

	it("hashes tokens deterministically", () => {
		expect(hashToken("abc")).toBe(hashToken("abc"));
		expect(hashToken("abc")).not.toBe(hashToken("abd"));
		expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/);
	});
});

describe("owners", () => {
	let dir: string;
	let configPath: string;
	const previous = process.env.PI_WEB_CONFIG;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pi-web-owners-"));
		configPath = join(dir, "config.json");
		writeFileSync(configPath, JSON.stringify({ port: 3210, workspaces: [{ id: "w", name: "w", path: dir }] }));
		chmodSync(configPath, 0o600);
		process.env.PI_WEB_CONFIG = configPath;
		resetOwnerCache();
	});

	afterEach(() => {
		if (previous === undefined) delete process.env.PI_WEB_CONFIG;
		else process.env.PI_WEB_CONFIG = previous;
		resetOwnerCache();
	});

	it("records and filters session owners", () => {
		recordSessionOwner("s1", "alice", "w");
		recordSessionOwner("s2", "bob", "w");
		recordSessionOwner("s3", "alice", "w");
		expect(listSessionOwners("alice").map((entry) => entry.id).sort()).toEqual(["s1", "s3"]);
		expect(getSessionOwner("s2")?.owner).toBe("bob");
		removeSessionOwner("s1");
		expect(getSessionOwner("s1")).toBeUndefined();
		const persisted = JSON.parse(readFileSync(join(dir, "sessions.json"), "utf8"));
		expect(persisted.sessions).toHaveLength(2);
		expect(statSync(join(dir, "sessions.json")).mode & 0o777).toBe(0o600);
	});
});
