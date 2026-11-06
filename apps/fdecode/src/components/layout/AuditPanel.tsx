import { useEffect, useState } from "react";
import { type AuditEntry, fetchAudit } from "../../lib/api.ts";

export interface AuditPanelProps {
	onClose: () => void;
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function AuditPanel({ onClose }: AuditPanelProps) {
	const [entries, setEntries] = useState<AuditEntry[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchAudit(100)
			.then(setEntries)
			.catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button type="button" aria-label="关闭审计" className="absolute inset-0 bg-dsw-bg-mask-1" onClick={onClose} />
			<div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">最近审计</h2>
					<button type="button" className="ml-auto text-xs text-dsw-label-tertiary" onClick={onClose}>
						关闭
					</button>
				</div>
				{error && <p className="mt-2 text-xs text-dsw-state-error">{error}</p>}
				<div className="mt-3 min-h-0 flex-1 overflow-auto">
					<table className="w-full border-collapse text-left text-[11px]">
						<thead className="sticky top-0 bg-dsw-bg-base text-dsw-label-tertiary">
							<tr>
								<th className="py-1 pr-3 font-normal">时间</th>
								<th className="py-1 pr-3 font-normal">用户</th>
								<th className="py-1 pr-3 font-normal">动作</th>
								<th className="py-1 pr-3 font-normal">目标</th>
								<th className="py-1 font-normal">结果</th>
							</tr>
						</thead>
						<tbody className="font-mono text-dsw-label-secondary">
							{entries.map((entry, index) => (
								<tr key={`${entry.ts}-${index}`} className="border-t border-hairline border-dsw-border-l1">
									<td className="py-1 pr-3">{formatTime(entry.ts)}</td>
									<td className="py-1 pr-3">{entry.user}</td>
									<td className="py-1 pr-3">{entry.action}</td>
									<td className="max-w-48 truncate py-1 pr-3">{entry.target}</td>
									<td
										className={
											entry.result === "ok" ? "py-1 text-dsw-state-success" : "py-1 text-dsw-state-error"
										}
									>
										{entry.result}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
