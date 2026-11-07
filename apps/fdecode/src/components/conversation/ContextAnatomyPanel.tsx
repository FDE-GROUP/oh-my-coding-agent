import { useCallback, useEffect, useState } from "react";
import { sendCommand } from "../../lib/api.ts";
import type { RpcContextAnatomy } from "../../server/runtime.ts";
import { Button } from "../primitives/Button.tsx";

/** 上下文解剖面板的属性。 */
export interface ContextAnatomyPanelProps {
	sessionId: string;
	onClose: () => void;
}

/** 构成条的一个分段。 */
interface AnatomySegment {
	key: string;
	label: string;
	tokens: number;
	chars: number;
	/** 分类色槽位（1-6）；0 表示中性「其他」折叠段。 */
	slot: number;
}

function compact(value: number): string {
	if (value < 1_000) return String(value);
	if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}k`;
	return `${(value / 1_000_000).toFixed(2)}M`;
}

/**
 * 把解剖数据折叠为最多 7 个分段：消息历史占槽位 1，前 5 个分节占槽位 2-6，
 * 其余分节与基础 prompt 合并为中性的「其他」。
 */
function buildSegments(anatomy: RpcContextAnatomy): AnatomySegment[] {
	const segments: AnatomySegment[] = [
		{ key: "messages", label: "消息历史", tokens: anatomy.messages.estTokens, chars: 0, slot: 1 },
	];
	const sections = anatomy.sections.slice(0, 5);
	for (const section of sections) {
		segments.push({
			key: section.name,
			label: section.name,
			tokens: section.estTokens,
			chars: section.chars,
			slot: segments.length + 1,
		});
	}
	const rest = anatomy.sections.slice(5);
	const otherTokens = rest.reduce((sum, section) => sum + section.estTokens, 0) + anatomy.baseContent.estTokens;
	if (otherTokens > 0) {
		segments.push({
			key: "__other",
			label: `其他（${rest.length + (anatomy.baseContent.estTokens > 0 ? 1 : 0)} 项）`,
			tokens: otherTokens,
			chars: rest.reduce((sum, section) => sum + section.chars, 0) + anatomy.baseContent.chars,
			slot: 0,
		});
	}
	return segments.filter((segment) => segment.tokens > 0);
}

function segmentClass(slot: number): string {
	return slot === 0 ? "bg-dsw-border-l2" : `bg-dsw-chart-${slot}`;
}

/**
 * 上下文解剖面板：展示下一次请求的上下文构成与占用（观测面）。
 *
 * @remarks
 * 数据来自只读 RPC 命令 get_context_anatomy；分节与消息 token 为 chars/4 估算，
 * 总量在可用时以 provider usage 锚定（basis 字段）。只读，不产生 provider 请求。
 */
export function ContextAnatomyPanel({ sessionId, onClose }: ContextAnatomyPanelProps) {
	const [anatomy, setAnatomy] = useState<RpcContextAnatomy | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const data = (await sendCommand(sessionId, { type: "get_context_anatomy" })) as RpcContextAnatomy;
			setAnatomy(data);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(false);
		}
	}, [sessionId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const segments = anatomy ? buildSegments(anatomy) : [];
	const segmentTotal = segments.reduce((sum, segment) => sum + segment.tokens, 0);
	const basisLabel = anatomy?.total.basis === "usage-anchored" ? "usage 锚定" : "估算";
	const windowLabel =
		anatomy?.total.percent !== undefined && anatomy.total.contextWindow !== undefined
			? `${Math.round(anatomy.total.percent)}% / ${compact(anatomy.total.contextWindow)}`
			: "窗口未知";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="关闭上下文解剖"
				className="absolute inset-0 overlay-mask"
				onClick={onClose}
			/>
			<div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">上下文解剖</h2>
					<span className="rounded-dsw-xs border border-hairline border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary">
						{basisLabel}
					</span>
					{anatomy?.compaction.active && (
						<span className="rounded-dsw-xs border border-hairline border-dsw-state-warn px-1.5 py-0.5 text-[10px] text-dsw-state-warn">
							压缩中
						</span>
					)}
					<div className="ml-auto flex items-center gap-2">
						<Button variant="ghost" disabled={busy} onClick={() => void refresh()}>
							刷新
						</Button>
						<button type="button" className="text-xs text-dsw-label-tertiary" onClick={onClose}>
							关闭
						</button>
					</div>
				</div>

				{error && <p className="mt-2 text-xs text-dsw-state-error">{error}</p>}
				{!anatomy && !error && <p className="mt-2 text-xs text-dsw-label-tertiary">加载中…</p>}

				{anatomy && (
					<div className="mt-3 min-h-0 flex-1 overflow-y-auto">
						<div className="flex items-baseline justify-between font-mono text-[11px] text-dsw-label-secondary">
							<span>总量 {compact(anatomy.total.tokens)} tokens</span>
							<span>{windowLabel}</span>
						</div>

						{segmentTotal > 0 && (
							<div className="mt-2 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-dsw-xs" aria-hidden>
								{segments.map((segment) => (
									<div
										key={segment.key}
										className={segmentClass(segment.slot)}
										style={{ width: `${(segment.tokens / segmentTotal) * 100}%` }}
										title={`${segment.label} · ${compact(segment.tokens)} tokens`}
									/>
								))}
							</div>
						)}

						<ul className="mt-3 space-y-1">
							{segments.map((segment) => (
								<li key={segment.key} className="flex items-center gap-2 text-[11px] text-dsw-label-secondary">
									<span
										className={`h-2.5 w-2.5 shrink-0 rounded-dsw-xs ${segmentClass(segment.slot)}`}
										aria-hidden
									/>
									<span className="min-w-0 flex-1 truncate">{segment.label}</span>
									<span className="font-mono">{compact(segment.tokens)}</span>
								</li>
							))}
						</ul>

						<div className="mt-3 border-t border-hairline border-dsw-border-l1 pt-2">
							<p className="text-[11px] text-dsw-label-secondary">
								消息 {anatomy.messages.count} 条 · 工具 {anatomy.tools.length} 个：
								<span className="font-mono text-dsw-label-tertiary">
									{" "}
									{anatomy.tools.map((tool) => tool.name).join(" · ")}
								</span>
							</p>
							<p className="mt-1 text-[10px] text-dsw-label-tertiary">
								口径：分节与消息为 chars/4 估算；总量在 provider usage 可信时以其锚定（含其后的估算尾部）。
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
