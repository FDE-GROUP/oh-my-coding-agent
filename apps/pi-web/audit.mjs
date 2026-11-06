import {
	appendFileSync,
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { resolveConfigPath } from "./config.mjs";

const MAX_SIZE = 10 * 1024 * 1024;

function auditPath() {
	return join(dirname(resolveConfigPath()), "audit.jsonl");
}

export function appendAudit(entry) {
	const path = auditPath();
	try {
		mkdirSync(dirname(path), { recursive: true });
		appendFileSync(path, `${JSON.stringify({ ts: Date.now(), ...entry })}\n`, { mode: 0o600 });
		if (existsSync(path) && statSync(path).size > MAX_SIZE) {
			renameSync(path, `${path}.1`);
			writeFileSync(path, "", { mode: 0o600 });
			chmodSync(path, 0o600);
		}
	} catch (error) {
		console.warn(`[pi-web] 无法写入审计日志：${String(error)}`);
	}
}

export function queryAudit(limit = 100) {
	const path = auditPath();
	if (!existsSync(path)) return [];
	try {
		const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
		return lines
			.slice(-Math.max(1, Math.min(1000, limit)))
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return undefined;
				}
			})
			.filter(Boolean)
			.reverse();
	} catch {
		return [];
	}
}

export function previewAudit(beforeTs) {
	const path = auditPath();
	if (!existsSync(path)) return 0;
	try {
		return readFileSync(path, "utf8")
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return undefined;
				}
			})
			.filter((entry) => entry && typeof entry.ts === "number" && entry.ts < beforeTs).length;
	} catch {
		return 0;
	}
}

export function pruneAudit(beforeTs) {
	const path = auditPath();
	if (!existsSync(path)) return 0;
	try {
		const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
		const kept = [];
		let removed = 0;
		for (const line of lines) {
			try {
				const entry = JSON.parse(line);
				if (typeof entry.ts === "number" && entry.ts < beforeTs) {
					removed += 1;
					continue;
				}
				kept.push(line);
			} catch {
				kept.push(line);
			}
		}
		const temp = `${path}.tmp`;
		writeFileSync(temp, `${kept.join("\n")}${kept.length > 0 ? "\n" : ""}`, { mode: 0o600 });
		chmodSync(temp, 0o600);
		renameSync(temp, path);
		return removed;
	} catch {
		return 0;
	}
}
