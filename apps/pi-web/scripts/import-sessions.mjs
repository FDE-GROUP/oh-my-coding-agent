/**
 * 把已有 Pi session 回填到 owner 索引。
 *
 * 用法：
 *   pnpm --filter @omfde/pi-web import-sessions -- --owner abel
 *   pnpm --filter @omfde/pi-web import-sessions -- --owner abel --workspace omfde
 *   pnpm --filter @omfde/pi-web import-sessions -- --list
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config.mjs";

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

const indexPath = join(dirname(loaded.path), "sessions.json");
const entries = new Map();
if (existsSync(indexPath)) {
	try {
		const parsed = JSON.parse(readFileSync(indexPath, "utf8"));
		for (const entry of parsed.sessions ?? []) entries.set(entry.id, entry);
	} catch (error) {
		console.error(`无法读取 ${indexPath}: ${String(error)}`);
		process.exit(1);
	}
}

const pending = [];
for (const workspace of workspaces) {
	const sessions = await SessionManager.list(workspace.path);
	for (const session of sessions) {
		if (entries.has(session.id)) continue;
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
	for (const { session, workspace } of pending) {
		entries.set(session.id, {
			id: session.id,
			owner,
			workspaceId: workspace.id,
			updatedAt: Date.now(),
		});
	}
	mkdirSync(dirname(indexPath), { recursive: true });
	const temp = `${indexPath}.tmp`;
	writeFileSync(temp, `${JSON.stringify({ sessions: [...entries.values()] }, null, 2)}\n`);
	chmodSync(temp, 0o600);
	renameSync(temp, indexPath);
}

console.log(
	JSON.stringify(
		{
			owner,
			imported: pending.length,
			total: dryRun ? entries.size + pending.length : entries.size,
			dryRun,
			path: indexPath,
			workspaces: workspaces.map((workspace) => workspace.id),
		},
		null,
		2,
	),
);
