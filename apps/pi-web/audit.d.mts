export interface AuditEntry {
	ts?: number;
	user: string;
	role: "admin" | "member";
	action: string;
	target: string;
	result: "ok" | "failed";
	detail?: string;
}

export function appendAudit(entry: AuditEntry): void;
export function queryAudit(limit?: number): AuditEntry[];

export function previewAudit(beforeTs: number): number;
export function pruneAudit(beforeTs: number): number;
