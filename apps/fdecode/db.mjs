/**
 * fdecode SQLite 元数据存储。
 *
 * @remarks
 * 数据库默认位于配置目录下的 `fdecode.db`，可由 `FDECODE_DB` 覆盖。打开时启用
 * WAL、`busy_timeout`、`synchronous=NORMAL` 和外键约束，并把数据库与
 * `-wal`/`-shm` 权限收紧到 0600。
 *
 * 首次打开会建表并将旧 JSON（`sessions.json`、`links.json`、`shares.json`、
 * `audit.jsonl`）一次性导入；成功后删除旧文件。迁移标记写入
 * `schema_migrations`，因此重复启动不会重复导入。
 *
 * 本模块是边缘层与应用共用的实现；TypeScript 侧通过 `src/server/db.ts`
 * 使用同一连接。
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveConfigPath } from "./config.mjs";

const SCHEMA_VERSION = 2;
const LEGACY_FILES = ["sessions.json", "links.json", "shares.json", "audit.jsonl"];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS session_owners (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS session_owners_owner ON session_owners (owner);
CREATE TABLE IF NOT EXISTS issue_links (
  session_id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shares (
  token_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS shares_session ON shares (session_id, owner);
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  user TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  result TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS audit_events_ts ON audit_events (ts);
`;

let shared;

/**
 * 计算数据库路径。
 *
 * @returns `FDECODE_DB` 或配置目录下的 `fdecode.db`。
 */
export function resolveDbPath() {
	const override = process.env.FDECODE_DB?.trim();
	if (override) return override;
	const dir = dirname(resolveConfigPath());
	migrateLegacyDatabase(dir);
	return join(dir, "fdecode.db");
}

/**
 * 把同目录下的旧 `pi-web.db` 迁移为 `fdecode.db`。
 *
 * @param dir - 配置目录。
 * @returns 是否发生了迁移。
 */
export function migrateLegacyDatabase(dir) {
	const target = join(dir, "fdecode.db");
	const legacy = join(dir, "pi-web.db");
	if (existsSync(target) || !existsSync(legacy)) return false;
	try {
		renameSync(legacy, target);
		for (const suffix of ["-wal", "-shm"]) {
			if (existsSync(`${legacy}${suffix}`)) renameSync(`${legacy}${suffix}`, `${target}${suffix}`);
		}
		return true;
	} catch (error) {
		throw new Error(`无法迁移旧数据库 ${legacy}：${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * 读取进程级数据库连接，必要时打开并迁移。
 *
 * @returns 共享的数据库连接。
 */
export function getDatabase() {
	const path = resolveDbPath();
	if (shared && shared.path === path) return shared.db;
	if (shared) {
		try {
			shared.db.close();
		} catch {
			// Closing a already-closed test connection is harmless.
		}
		shared = undefined;
	}
	const db = openDatabase(path);
	shared = { path, db };
	return db;
}

/**
 * 关闭进程级数据库连接，仅供测试使用。
 */
export function closeDatabase() {
	if (!shared) return;
	try {
		shared.db.close();
	} catch {
		// Ignore double-close during teardown.
	}
	shared = undefined;
}

/**
 * 打开数据库、应用 pragma 与迁移。
 *
 * @param path - 数据库文件路径。
 * @returns 已迁移的数据库连接。
 */
export function openDatabase(path) {
	mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	try {
		db.exec("PRAGMA journal_mode = WAL");
		db.exec("PRAGMA busy_timeout = 5000");
		db.exec("PRAGMA synchronous = NORMAL");
		db.exec("PRAGMA foreign_keys = ON");
		migrate(db, dirname(resolveConfigPath()));
		restrict(path);
		return db;
	} catch (error) {
		try {
			db.close();
		} catch {
			// Preserve the original error.
		}
		throw error;
	}
}

/**
 * 在同一连接上执行同步事务。
 *
 * @param fn - 同步回调；返回 Promise 会在提交后继续执行，调用方需自行避免。
 * @returns 回调的返回值。
 */
export function withTransaction(fn) {
	const db = getDatabase();
	db.exec("BEGIN IMMEDIATE");
	try {
		const result = fn();
		db.exec("COMMIT");
		return result;
	} catch (error) {
		try {
			db.exec("ROLLBACK");
		} catch {
			// Keep the original failure.
		}
		throw error;
	}
}

function hasMigration(db, version) {
	return Boolean(db.prepare("SELECT 1 AS applied FROM schema_migrations WHERE version = ?").get(version));
}

function migrate(db, legacyDir) {
	transaction(db, () => {
		db.exec(SCHEMA);
		db.prepare("INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(1, Date.now());
	});

	transaction(db, () => {
		if (hasMigration(db, SCHEMA_VERSION)) return;
		importLegacyJson(db, legacyDir);
		db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(SCHEMA_VERSION, Date.now());
	});

	removeLegacyFiles(legacyDir);
}

function transaction(db, fn) {
	db.exec("BEGIN IMMEDIATE");
	try {
		const result = fn();
		db.exec("COMMIT");
		return result;
	} catch (error) {
		try {
			db.exec("ROLLBACK");
		} catch {
			// Keep the original failure.
		}
		throw error;
	}
}

function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		throw new Error(`无法解析旧存储 ${path}：${error instanceof Error ? error.message : String(error)}`);
	}
}

function importLegacyJson(db, dir) {
	const sessionsPath = join(dir, "sessions.json");
	if (existsSync(sessionsPath)) {
		const parsed = readJson(sessionsPath);
		const insert = db.prepare(
			"INSERT OR IGNORE INTO session_owners (id, owner, workspace_id, updated_at) VALUES (?, ?, ?, ?)",
		);
		for (const entry of Array.isArray(parsed?.sessions) ? parsed.sessions : []) {
			if (!entry || typeof entry.id !== "string" || typeof entry.owner !== "string") continue;
			insert.run(
				entry.id,
				entry.owner,
				typeof entry.workspaceId === "string" ? entry.workspaceId : "",
				Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
			);
		}
	}

	const linksPath = join(dir, "links.json");
	if (existsSync(linksPath)) {
		const parsed = readJson(linksPath);
		const insert = db.prepare(
			"INSERT OR IGNORE INTO issue_links (session_id, repo_id, number, title, url) VALUES (?, ?, ?, ?, ?)",
		);
		for (const entry of Array.isArray(parsed?.links) ? parsed.links : []) {
			if (!entry || typeof entry.sessionId !== "string") continue;
			insert.run(
				entry.sessionId,
				typeof entry.repoId === "string" ? entry.repoId : "",
				Number.isInteger(entry.number) ? entry.number : 0,
				typeof entry.title === "string" ? entry.title : "",
				typeof entry.url === "string" ? entry.url : "",
			);
		}
	}

	const sharesPath = join(dir, "shares.json");
	if (existsSync(sharesPath)) {
		const parsed = readJson(sharesPath);
		const insert = db.prepare(
			"INSERT OR IGNORE INTO shares (token_hash, session_id, owner, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)",
		);
		for (const entry of Array.isArray(parsed?.shares) ? parsed.shares : []) {
			if (!entry || typeof entry.tokenHash !== "string" || typeof entry.sessionId !== "string") continue;
			insert.run(
				entry.tokenHash,
				entry.sessionId,
				typeof entry.owner === "string" ? entry.owner : "",
				Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
				Number.isFinite(entry.expiresAt) ? entry.expiresAt : Date.now(),
				Number.isFinite(entry.revokedAt) ? entry.revokedAt : null,
			);
		}
	}

	const auditPath = join(dir, "audit.jsonl");
	if (existsSync(auditPath)) {
		const insert = db.prepare(
			"INSERT INTO audit_events (ts, user, role, action, target, result, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
		);
		const lines = readFileSync(auditPath, "utf8").split("\n");
		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index].trim();
			if (!line) continue;
			let entry;
			try {
				entry = JSON.parse(line);
			} catch (error) {
				throw new Error(
					`无法解析审计日志 ${auditPath} 第 ${index + 1} 行：${error instanceof Error ? error.message : String(error)}`,
				);
			}
			insert.run(
				Number.isFinite(entry.ts) ? entry.ts : Date.now(),
				typeof entry.user === "string" ? entry.user : "unknown",
				entry.role === "admin" ? "admin" : "member",
				typeof entry.action === "string" ? entry.action : "unknown",
				typeof entry.target === "string" ? entry.target : "",
				entry.result === "failed" ? "failed" : "ok",
				typeof entry.detail === "string" ? entry.detail : null,
			);
		}
	}
}

function removeLegacyFiles(dir) {
	for (const name of LEGACY_FILES) {
		const path = join(dir, name);
		if (!existsSync(path)) continue;
		try {
			rmSync(path);
		} catch (error) {
			console.warn(`[fdecode] 无法删除旧存储 ${path}：${String(error)}`);
		}
	}
}

function restrict(path) {
	for (const suffix of ["", "-wal", "-shm"]) {
		const file = `${path}${suffix}`;
		if (!existsSync(file)) continue;
		try {
			chmodSync(file, 0o600);
		} catch (error) {
			console.warn(`[fdecode] 无法收紧数据库权限 ${file}：${String(error)}`);
		}
	}
}
