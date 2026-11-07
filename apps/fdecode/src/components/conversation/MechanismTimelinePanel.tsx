/** 机制时间线的一条记录：一次压缩、自动重试或摘要重试事件。 */
export interface MechanismEvent {
	id: string;
	type: string;
	label: string;
	detail?: string;
	at: number;
	/** live = 本页打开后从事件流收到；entry = 从 transcript 压缩 entry 回填。 */
	source: "live" | "entry";
}

const REASON_LABELS: Record<string, string> = {
	manual: "手动",
	threshold: "达到阈值",
	overflow: "上下文溢出",
};

function reasonLabel(reason: unknown): string {
	return typeof reason === "string" ? (REASON_LABELS[reason] ?? reason) : "未知";
}

function truncate(text: string, max = 160): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

let liveSequence = 0;

/**
 * 把一条会话事件记录映射为机制时间线条目；非机制事件返回 null。
 *
 * @remarks
 * 覆盖压缩（compaction_start/end）、自动重试（auto_retry_*）与摘要重试
 * （summarization_retry_*）三族；queue_update 已由输入区的队列状态展示，不重复收录。
 */
export function mechanismEventFromRecord(record: Record<string, unknown>): MechanismEvent | null {
	const type = record.type;
	switch (type) {
		case "compaction_start":
			return {
				id: `live-${++liveSequence}`,
				type,
				label: "压缩开始",
				detail: `原因：${reasonLabel(record.reason)}`,
				at: Date.now(),
				source: "live",
			};
		case "compaction_end": {
			const aborted = record.aborted === true;
			const parts = [`原因：${reasonLabel(record.reason)}`];
			if (aborted) parts.push("已中止");
			if (record.willRetry === true) parts.push("将重试");
			if (typeof record.errorMessage === "string") parts.push(truncate(record.errorMessage));
			return {
				id: `live-${++liveSequence}`,
				type,
				label: aborted ? "压缩中止" : "压缩完成",
				detail: parts.join(" · "),
				at: Date.now(),
				source: "live",
			};
		}
		case "auto_retry_start":
			return {
				id: `live-${++liveSequence}`,
				type,
				label: `自动重试 ${record.attempt}/${record.maxAttempts}`,
				detail: typeof record.errorMessage === "string" ? truncate(record.errorMessage) : undefined,
				at: Date.now(),
				source: "live",
			};
		case "auto_retry_end":
			return {
				id: `live-${++liveSequence}`,
				type,
				label:
					record.success === true ? `重试成功（第 ${record.attempt} 次）` : `重试失败（第 ${record.attempt} 次）`,
				detail: typeof record.finalError === "string" ? truncate(record.finalError) : undefined,
				at: Date.now(),
				source: "live",
			};
		case "summarization_retry_scheduled":
			return {
				id: `live-${++liveSequence}`,
				type,
				label: `摘要重试排期 ${record.attempt}/${record.maxAttempts}`,
				detail: typeof record.errorMessage === "string" ? truncate(record.errorMessage) : undefined,
				at: Date.now(),
				source: "live",
			};
		case "summarization_retry_attempt_start":
			return {
				id: `live-${++liveSequence}`,
				type,
				label: "摘要重试开始",
				detail: record.source === "branchSummary" ? "分支摘要" : "压缩摘要",
				at: Date.now(),
				source: "live",
			};
		case "summarization_retry_finished":
			return { id: `live-${++liveSequence}`, type, label: "摘要重试结束", at: Date.now(), source: "live" };
		default:
			return null;
	}
}

/**
 * 从会话 entries 回填机制时间线：只取压缩 entry（transcript 中持久化的部分）。
 *
 * @remarks
 * 自动重试与摘要重试事件不落 transcript，重开会话后仅保留本页打开后的实时记录。
 */
export function mechanismEventsFromEntries(entries: Array<Record<string, unknown>>): MechanismEvent[] {
	const events: MechanismEvent[] = [];
	for (const entry of entries) {
		if (entry.type !== "compaction") continue;
		const timestamp = typeof entry.timestamp === "string" ? Date.parse(entry.timestamp) : Number.NaN;
		events.push({
			id: typeof entry.id === "string" ? `entry-${entry.id}` : `entry-${events.length}`,
			type: "compaction",
			label: "压缩（历史）",
			detail: `原因：${reasonLabel(entry.reason)}`,
			at: Number.isNaN(timestamp) ? 0 : timestamp,
			source: "entry",
		});
	}
	return events;
}

function formatTime(at: number): string {
	if (at <= 0) return "--:--";
	return new Date(at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** 机制时间线面板的属性。 */
export interface MechanismTimelinePanelProps {
	events: MechanismEvent[];
	onClose: () => void;
}

/**
 * 机制时间线面板：按时间列出压缩、自动重试与摘要重试事件（观测面）。
 *
 * @remarks
 * 历史压缩来自 transcript 回填；重试族事件仅在页面打开后实时可见。只读展示。
 */
export function MechanismTimelinePanel({ events, onClose }: MechanismTimelinePanelProps) {
	const ordered = [...events].sort((a, b) => b.at - a.at);
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="关闭机制时间线"
				className="absolute inset-0 overlay-mask"
				onClick={onClose}
			/>
			<div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">机制时间线</h2>
					<span className="rounded-dsw-xs border border-hairline border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary">
						{events.length} 条
					</span>
					<button type="button" className="ml-auto text-xs text-dsw-label-tertiary" onClick={onClose}>
						关闭
					</button>
				</div>

				<div className="mt-3 min-h-0 flex-1 overflow-y-auto">
					{ordered.length === 0 ? (
						<p className="text-xs text-dsw-label-tertiary">本会话暂无机制事件（压缩 / 自动重试 / 摘要重试）。</p>
					) : (
						<ul className="space-y-1.5">
							{ordered.map((event) => (
								<li
									key={event.id}
									className="flex items-start gap-2 rounded-dsw-xs border border-hairline border-dsw-border-l1 px-2 py-1.5 text-[11px]"
								>
									<span className="shrink-0 font-mono text-dsw-label-tertiary">{formatTime(event.at)}</span>
									<span className="shrink-0 text-dsw-label-primary">{event.label}</span>
									{event.detail && (
										<span className="min-w-0 flex-1 break-all text-dsw-label-tertiary">{event.detail}</span>
									)}
									{event.source === "entry" && (
										<span className="shrink-0 text-[10px] text-dsw-label-tertiary">回填</span>
									)}
								</li>
							))}
						</ul>
					)}
				</div>

				<p className="mt-2 border-t border-hairline border-dsw-border-l1 pt-2 text-[10px] text-dsw-label-tertiary">
					历史压缩由 transcript 回填；自动重试与摘要重试事件不落盘，仅页面打开后实时可见。
				</p>
			</div>
		</div>
	);
}
