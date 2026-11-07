/** 治理审计的一条记录：一次扩展钩子对工具调用的拦截、参数改写或结果改写。 */
export interface GovernanceEvent {
	id: string;
	toolCallId: string;
	parentToolCallId?: string;
	toolName: string;
	action: "block" | "args-mutated" | "result-rewritten";
	extensionPath: string;
	summary: string;
	at: number;
}

let governanceSequence = 0;

const ACTION_LABELS: Record<GovernanceEvent["action"], string> = {
	block: "拦截",
	"args-mutated": "参数改写",
	"result-rewritten": "结果改写",
};

/**
 * 把一条会话事件记录映射为治理审计条目；非 tool_governance 事件返回 null。
 *
 * @remarks
 * tool_governance 由核心在扩展钩子动作发生时发射（agent-visibility S4）；静默改写
 * 参数的钩子归属为该事件上最后执行的 handler（best-effort）。
 */
export function governanceEventFromRecord(record: Record<string, unknown>): GovernanceEvent | null {
	if (record.type !== "tool_governance") return null;
	const action = record.action;
	if (action !== "block" && action !== "args-mutated" && action !== "result-rewritten") return null;
	return {
		id: `gov-${++governanceSequence}`,
		toolCallId: String(record.toolCallId ?? ""),
		...(typeof record.parentToolCallId === "string" ? { parentToolCallId: record.parentToolCallId } : {}),
		toolName: String(record.toolName ?? ""),
		action,
		extensionPath: String(record.extensionPath ?? "unknown"),
		summary: String(record.summary ?? ""),
		at: Date.now(),
	};
}

function formatTime(at: number): string {
	return new Date(at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** 治理审计面板的属性。 */
export interface GovernancePanelProps {
	events: GovernanceEvent[];
	onClose: () => void;
}

/**
 * 治理审计面板：列出扩展钩子对工具调用的拦截/改写动作（观测面）。
 *
 * @remarks
 * 区分「模型的决策」与「扩展的治理动作」。只读展示;事件不落 transcript,仅页面
 * 打开后实时可见。
 */
export function GovernancePanel({ events, onClose }: GovernancePanelProps) {
	const ordered = [...events].reverse();
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="关闭治理审计"
				className="absolute inset-0 bg-dsw-bg-mask-1"
				onClick={onClose}
			/>
			<div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">治理审计</h2>
					<span className="rounded-dsw-xs border border-hairline border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary">
						{events.length} 条
					</span>
					<button type="button" className="ml-auto text-xs text-dsw-label-tertiary" onClick={onClose}>
						关闭
					</button>
				</div>

				<div className="mt-3 min-h-0 flex-1 overflow-y-auto">
					{ordered.length === 0 ? (
						<p className="text-xs text-dsw-label-tertiary">
							未观察到治理动作（拦截 / 参数改写 / 结果改写）。扩展钩子的放行不产生记录。
						</p>
					) : (
						<ul className="space-y-1.5">
							{ordered.map((event) => (
								<li
									key={event.id}
									className="rounded-dsw-xs border border-hairline border-dsw-border-l1 px-2 py-1.5 text-[11px]"
								>
									<div className="flex items-center gap-2">
										<span className="shrink-0 font-mono text-dsw-label-tertiary">{formatTime(event.at)}</span>
										<span
											className={
												event.action === "block"
													? "shrink-0 rounded-dsw-xs border border-dsw-state-error px-1.5 py-0.5 text-[10px] text-dsw-state-error"
													: "shrink-0 rounded-dsw-xs border border-dsw-state-warn px-1.5 py-0.5 text-[10px] text-dsw-state-warn"
											}
										>
											{ACTION_LABELS[event.action]}
										</span>
										<span className="min-w-0 flex-1 truncate font-mono text-dsw-label-primary">
											{event.toolName}
											{event.parentToolCallId ? "（嵌套）" : ""}
										</span>
									</div>
									<p className="mt-1 break-all text-dsw-label-secondary">{event.summary}</p>
									<p
										className="mt-0.5 truncate font-mono text-[10px] text-dsw-label-tertiary"
										title={event.extensionPath}
									>
										{event.extensionPath}
									</p>
								</li>
							))}
						</ul>
					)}
				</div>

				<p className="mt-2 border-t border-hairline border-dsw-border-l1 pt-2 text-[10px] text-dsw-label-tertiary">
					tool_governance 事件不落 transcript,仅页面打开后实时可见;参数改写的归属为最后执行的钩子（best-effort）。
				</p>
			</div>
		</div>
	);
}
