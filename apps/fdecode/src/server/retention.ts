/**
 * 会话、分享与审计的保留清理。
 *
 * @remarks
 * 只清理有 owner 索引的会话；运行中的会话不删除。应用顺序：删除会话文件 →
 * 在单个 SQLite 事务中删除 owner/Issue 关联、分享与审计 → 写审计。事务失败时
 * 回滚元数据删除。
 *
 * @internal
 */
import { rmSync } from "node:fs";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { appendAudit, previewAudit, pruneAudit } from "../../audit.mjs";
import { getAppConfig } from "./config.ts";
import { runInTransaction } from "./db.ts";
import { removeIssueLinks } from "./links.ts";
import { getSessionOwner, removeSessionOwner } from "./owners.ts";
import { getRuntimeManager } from "./runtime-manager.ts";
import { previewSharePrune, pruneShares } from "./shares.ts";
import { listWorkspaces } from "./workspaces.ts";

const DAY = 24 * 60 * 60 * 1000;

/**
 * 将被清理的会话。
 *
 * @internal
 */
export interface RetentionSession {
	id: string;
	owner: string;
	workspaceId: string;
	workspaceName: string;
	modified: string;
}

/**
 * 清理预览。
 *
 * @internal
 */
export interface RetentionPreview {
	sessions: RetentionSession[];
	shares: number;
	audit: number;
	skippedUnknown: number;
	skippedActive: number;
}

/**
 * 清理结果。
 *
 * @internal
 */
export interface RetentionResult extends RetentionPreview {
	deletedSessions: number;
	deletedShares: number;
	deletedAudit: number;
}

interface RemovableSession {
	path: string;
	entry: RetentionSession;
}

async function compute(): Promise<{ preview: RetentionPreview; removable: RemovableSession[] }> {
	const config = getAppConfig().config;
	const now = Date.now();
	const sessionCutoff = config.retention.sessionsDays > 0 ? now - config.retention.sessionsDays * DAY : undefined;
	const shareCutoff = config.retention.sharesDays > 0 ? now - config.retention.sharesDays * DAY : undefined;
	const auditCutoff = config.retention.auditDays > 0 ? now - config.retention.auditDays * DAY : undefined;
	const active = new Set(
		getRuntimeManager()
			.list()
			.map((runtime) => runtime.id),
	);
	const removable: RemovableSession[] = [];
	let skippedUnknown = 0;
	let skippedActive = 0;

	for (const workspace of listWorkspaces()) {
		let sessions: Awaited<ReturnType<typeof SessionManager.list>>;
		try {
			sessions = await SessionManager.list(workspace.path);
		} catch {
			continue;
		}
		for (const session of sessions) {
			const owner = getSessionOwner(session.id);
			if (!owner) {
				skippedUnknown += 1;
				continue;
			}
			if (!sessionCutoff || session.modified.getTime() >= sessionCutoff) continue;
			if (active.has(session.id)) {
				skippedActive += 1;
				continue;
			}
			removable.push({
				path: session.path,
				entry: {
					id: session.id,
					owner: owner.owner,
					workspaceId: workspace.id,
					workspaceName: workspace.name,
					modified: session.modified.toISOString(),
				},
			});
		}
	}

	const removedIds = new Set(removable.map((item) => item.entry.id));
	const shares = previewSharePrune(removedIds, shareCutoff);
	const audit = auditCutoff ? previewAudit(auditCutoff) : 0;
	return {
		preview: {
			sessions: removable.map((item) => item.entry),
			shares,
			audit,
			skippedUnknown,
			skippedActive,
		},
		removable,
	};
}

/**
 * 预览保留清理。
 *
 * @returns 将删除的会话、分享与审计数量。
 * @internal
 */
export async function previewRetention(): Promise<RetentionPreview> {
	return (await compute()).preview;
}

/**
 * 应用保留清理。
 *
 * @returns 实际删除数量与跳过统计。
 * @internal
 */
export async function applyRetention(): Promise<RetentionResult> {
	const { preview, removable } = await compute();
	const config = getAppConfig().config;
	const removedIds = new Set(removable.map((item) => item.entry.id));

	for (const item of removable) {
		rmSync(item.path, { force: false });
	}
	const shareCutoff = config.retention.sharesDays > 0 ? Date.now() - config.retention.sharesDays * DAY : undefined;
	const { deletedShares, deletedAudit } = runInTransaction(() => {
		for (const id of removedIds) removeSessionOwner(id);
		removeIssueLinks(removedIds);
		const shares = pruneShares(removedIds, shareCutoff);
		const audit = config.retention.auditDays > 0 ? pruneAudit(Date.now() - config.retention.auditDays * DAY) : 0;
		return { deletedShares: shares, deletedAudit: audit };
	});

	appendAudit({
		user: "system",
		role: "admin",
		action: "retention.apply",
		target: "retention",
		result: "ok",
		detail: `sessions=${removable.length} shares=${deletedShares} audit=${deletedAudit}`,
	});

	return {
		...preview,
		deletedSessions: removable.length,
		deletedShares,
		deletedAudit,
	};
}
