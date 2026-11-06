/**
 * 服务端 SQLite 访问。
 *
 * @remarks
 * 连接由 `db.mjs` 持有，按数据库路径做进程级单例；这里只提供带类型的入口，
 * 让 src 下的模块不必直接依赖 `.mjs` 声明。
 *
 * @internal
 */
import type { DatabaseSync } from "node:sqlite";
import { closeDatabase, getDatabase, withTransaction } from "../../db.mjs";

/**
 * 读取共享数据库连接，必要时打开并迁移。
 *
 * @returns 已迁移的数据库连接。
 * @internal
 */
export function getDb(): DatabaseSync {
	return getDatabase();
}

/**
 * 在共享连接上执行同步事务。
 *
 * @param fn - 同步回调；不要返回 Promise。
 * @returns 回调的返回值。
 * @internal
 */
export function runInTransaction<T>(fn: () => T): T {
	return withTransaction(fn);
}

/**
 * 关闭共享连接，仅供测试使用。
 *
 * @internal
 */
export function closeDb(): void {
	closeDatabase();
}
