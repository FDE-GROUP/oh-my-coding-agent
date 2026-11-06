/**
 * 把已有 Pi session 回填到 owner 索引。
 *
 * 用法：
 *   pnpm --filter @omfde/fdecode import-sessions -- --owner abel
 *   pnpm --filter @omfde/fdecode import-sessions -- --owner abel --workspace omfde
 *   pnpm --filter @omfde/fdecode import-sessions -- --list
 */
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config.mjs";
import { getDatabase, resolveDbPath, withTransaction } from "../db.mjs";

function argument(name) {
	const index = process.argv.indexOf(name);
	return index === -1 ? undefined : process.argv[index + 1];
}

const owner = argument("--owner");
const workspaceId = argument("--workspace");
const listOnly = process.argv.includes("--list");
const dryRun = process.argv.includes("--dry-run");

const loaded = loadConfig();
if (loaded.errors.length > 0) {
	for (const error of loaded.errors) console.error(error);
	process.exit(1);
}

const workspaces = workspaceId
	? loaded.config.workspaces.filter((workspace) => workspace.id === workspaceId)
	: loaded.config.workspaces;
if (workspaces.length === 0) {
	console.error(`没有匹配的工作区：${workspaceId ?? "(all)"}`);
	process.exit(1);
}

const db = getDatabase();
const existing = new Set(
	db
		.prepare("SELECT id FROM session_owners")
		.all()
		.map((row) => String(row.id)),
);

const pending = [];
for (const workspace of workspaces) {
	const sessions = await SessionManager.list(workspace.path);
	for (const session of sessions) {
		if (existing.has(session.id)) continue;
		pending.push({ session, workspace });
	}
}

if (listOnly) {
	console.log(
		JSON.stringify(
			pending.map(({ session, workspace }) => ({
				id: session.id,
				workspace: workspace.id,
				messages: session.messageCount,
				firstMessage: session.firstMessage,
			})),
			null,
			2,
		),
	);
	process.exit(0);
}

if (!owner) {
	console.error("缺少 --owner；使用 --list 只查看未归属会话。");
	process.exit(1);
}

if (!dryRun) {
	const insert = db.prepare(
		"INSERT OR IGNORE INTO session_owners (id, owner, workspace_id, updated_at) VALUES (?, ?, ?, ?)",
	);
	withTransaction(() => {
		for (const { session, workspace } of pending) {
			insert.run(session.id, owner, workspace.id, Date.now());
		}
	});
}

console.log(
	JSON.stringify(
		{
			owner,
			imported: pending.length,
			total: existing.size + pending.length,
			dryRun,
			path: resolveDbPath(),
			workspaces: workspaces.map((workspace) => workspace.id),
		},
		null,
		2,
	),
);
