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
