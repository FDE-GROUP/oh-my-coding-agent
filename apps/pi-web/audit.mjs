/**
 * 审计事件读写。
 *
 * @remarks
 * 事件写入 SQLite 表 `audit_events`，数据库默认位于配置目录下的 `pi-web.db`。
 * 查询按写入顺序倒序返回；清理由保留策略驱动。
 */

import { getDatabase } from "./db.mjs";

/**
 * 追加一条审计事件。
 *
 * @param {object} entry - 事件内容。
 */
export function appendAudit(entry) {
	try {
		const ts = Number.isFinite(entry.ts) ? entry.ts : Date.now();
		getDatabase()
			.prepare(
				"INSERT INTO audit_events (ts, user, role, action, target, result, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				ts,
				entry.user,
				entry.role === "admin" ? "admin" : "member",
				entry.action,
				entry.target,
				entry.result === "failed" ? "failed" : "ok",
				typeof entry.detail === "string" ? entry.detail : null,
			);
	} catch (error) {
		console.warn(`[pi-web] 无法写入审计日志：${String(error)}`);
	}
}

/**
 * 查询最近的审计事件。
 *
 * @param {number} [limit] - 条数，默认 100，上限 1000。
 * @returns {Array<object>} 按写入顺序倒序的事件。
 */
export function queryAudit(limit = 100) {
	const capped = Math.max(1, Math.min(1000, Math.trunc(limit)));
	const rows = getDatabase()
		.prepare("SELECT ts, user, role, action, target, result, detail FROM audit_events ORDER BY id DESC LIMIT ?")
		.all(capped);
	return rows.map((row) => ({
		ts: Number(row.ts),
		user: String(row.user),
		role: row.role === "admin" ? "admin" : "member",
		action: String(row.action),
		target: String(row.target),
		result: row.result === "failed" ? "failed" : "ok",
		...(typeof row.detail === "string" ? { detail: row.detail } : {}),
	}));
}

/**
 * 预览早于阈值的审计事件数量。
 *
 * @param {number} beforeTs - 时间戳阈值。
 * @returns {number} 将删除的条数。
 */
export function previewAudit(beforeTs) {
	const row = getDatabase().prepare("SELECT COUNT(*) AS count FROM audit_events WHERE ts < ?").get(beforeTs);
	return Number(row?.count ?? 0);
}

/**
 * 删除早于阈值的审计事件。
 *
 * @param {number} beforeTs - 时间戳阈值。
 * @returns {number} 删除条数。
 */
export function pruneAudit(beforeTs) {
	return Number(getDatabase().prepare("DELETE FROM audit_events WHERE ts < ?").run(beforeTs).changes);
}
