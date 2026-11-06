import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateLegacyHome } from "../config.mjs";
import { migrateLegacyDatabase } from "../db.mjs";

describe("legacy storage migration", () => {
	it("moves the old home directory", () => {
		const home = mkdtempSync(join(tmpdir(), "fdecode-home-"));
		mkdirSync(join(home, ".pi-web"));
		writeFileSync(join(home, ".pi-web", "config.json"), "{}");

		expect(migrateLegacyHome(home)).toBe(true);
		expect(existsSync(join(home, ".fdecode", "config.json"))).toBe(true);
		expect(existsSync(join(home, ".pi-web"))).toBe(false);
	});

	it("merges missing files into an existing home directory", () => {
		const home = mkdtempSync(join(tmpdir(), "fdecode-home-"));
		mkdirSync(join(home, ".pi-web"));
		mkdirSync(join(home, ".fdecode"));
		writeFileSync(join(home, ".pi-web", "config.json"), "{}");
		writeFileSync(join(home, ".fdecode", "keep.txt"), "keep");

		expect(migrateLegacyHome(home)).toBe(true);
		expect(existsSync(join(home, ".fdecode", "config.json"))).toBe(true);
		expect(existsSync(join(home, ".fdecode", "keep.txt"))).toBe(true);
		expect(existsSync(join(home, ".pi-web"))).toBe(false);
	});

	it("renames the legacy database and sidecars", () => {
		const dir = mkdtempSync(join(tmpdir(), "fdecode-db-"));
		writeFileSync(join(dir, "pi-web.db"), "db");
		writeFileSync(join(dir, "pi-web.db-wal"), "wal");
		writeFileSync(join(dir, "pi-web.db-shm"), "shm");

		expect(migrateLegacyDatabase(dir)).toBe(true);
		expect(existsSync(join(dir, "fdecode.db"))).toBe(true);
		expect(existsSync(join(dir, "fdecode.db-wal"))).toBe(true);
		expect(existsSync(join(dir, "fdecode.db-shm"))).toBe(true);
		expect(existsSync(join(dir, "pi-web.db"))).toBe(false);
	});

	it("keeps an existing database untouched", () => {
		const dir = mkdtempSync(join(tmpdir(), "fdecode-db-"));
		writeFileSync(join(dir, "pi-web.db"), "old");
		writeFileSync(join(dir, "fdecode.db"), "new");

		expect(migrateLegacyDatabase(dir)).toBe(false);
		expect(existsSync(join(dir, "pi-web.db"))).toBe(true);
	});
});
