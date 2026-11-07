import { useState } from "react";
import type { CiStatus } from "../../lib/api.ts";
import type { RpcSessionStats } from "../../server/runtime.ts";
import { ContextAnatomyPanel } from "./ContextAnatomyPanel.tsx";
import { type MechanismEvent, MechanismTimelinePanel } from "./MechanismTimelinePanel.tsx";
import { SharePanel } from "./SharePanel.tsx";

export interface ModelSummary {
	provider: string;
	id: string;
	name: string;
	input?: string[];
}

export interface SessionBarProps {
	models: ModelSummary[];
	model: ModelSummary | null;
	stats: RpcSessionStats | null;
	onSelectModel: (provider: string, id: string) => void;
	onClone: () => void;
	canClone: boolean;
	sessionId?: string;
	ci?: CiStatus | null;
	canWrite: boolean;
	/** 机制时间线事件（压缩/自动重试/摘要重试），由会话页采集。 */
	timeline?: MechanismEvent[];
}

function compact(value: number | undefined | null): string {
	if (value === undefined || value === null) return "0";
	if (value < 1_000) return String(value);
	if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}k`;
	return `${(value / 1_000_000).toFixed(2)}M`;
}

function contextLabel(stats: RpcSessionStats | null): string {
	const usage = stats?.contextUsage;
	if (!usage || typeof usage.percent !== "number") return "ctx -";
	return `ctx ${Math.round(usage.percent)}%`;
}

export function SessionBar({
	models,
	model,
	stats,
	onSelectModel,
	onClone,
	canClone,
	sessionId,
	ci,
	canWrite,
	timeline = [],
}: SessionBarProps) {
	const [shareOpen, setShareOpen] = useState(false);
	const [anatomyOpen, setAnatomyOpen] = useState(false);
	const [timelineOpen, setTimelineOpen] = useState(false);
	const current = model ? `${model.provider}/${model.id}` : "";
	const cost = stats?.cost ?? 0;
	const tokens = stats?.tokens;
	const knownModel = models.some((item) => `${item.provider}/${item.id}` === current);

	return (
		<div className="border-t border-hairline border-dsw-border-l1 px-4 py-1.5">
			<div className="mx-auto flex w-full max-w-3xl items-center gap-3 text-[11px] text-dsw-label-tertiary">
				<label className="flex min-w-0 items-center gap-1">
					<span className="sr-only">模型</span>
					<select
						value={current}
						onChange={(event) => {
							const [provider, ...rest] = event.target.value.split("/");
							onSelectModel(provider, rest.join("/"));
						}}
						disabled={models.length === 0}
						className="max-w-56 truncate rounded-dsw-xs bg-transparent py-0.5 text-[11px] text-dsw-label-secondary outline-none hover:text-dsw-label-primary"
					>
						{model === null && <option value="">未选择模型</option>}
						{model && !knownModel && <option value={current}>{model.name}</option>}
						{models.map((item) => (
							<option key={`${item.provider}/${item.id}`} value={`${item.provider}/${item.id}`}>
								{item.name}
							</option>
						))}
					</select>
				</label>

				<div className="ml-auto flex items-center gap-1">
					{canWrite && sessionId && (
						<button
							type="button"
							onClick={() => setShareOpen(true)}
							className="rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary"
						>
							分享
						</button>
					)}
					{sessionId && (
						<button
							type="button"
							onClick={() => {
								window.location.href = `/api/sessions/${encodeURIComponent(sessionId)}/handoff`;
							}}
							className="rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary"
						>
							交接
						</button>
					)}
					{sessionId && (
						<button
							type="button"
							onClick={() => setAnatomyOpen(true)}
							className="rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary"
						>
							解剖
						</button>
					)}
					{sessionId && (
						<button
							type="button"
							onClick={() => setTimelineOpen(true)}
							className="rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary"
						>
							时间线{timeline.length > 0 ? ` ${timeline.length}` : ""}
						</button>
					)}
					{ci && (
						<a
							href={ci.url}
							target="_blank"
							rel="noreferrer"
							className={
								ci.conclusion === "failure"
									? "rounded-dsw-xs border border-dsw-state-error px-1.5 py-0.5 text-[10px] text-dsw-state-error"
									: "rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary"
							}
						>
							CI {ci.conclusion ?? ci.status}
						</a>
					)}
					{canWrite && (
						<button
							type="button"
							onClick={onClone}
							disabled={!canClone}
							title={canClone ? "克隆当前分支" : "发送一条消息后才能克隆"}
							className="rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary disabled:opacity-40"
						>
							克隆
						</button>
					)}
				</div>
				<span className="font-mono">{contextLabel(stats)}</span>
				<span className="font-mono">
					↑{compact(tokens?.input)} ↓{compact(tokens?.output)}
				</span>
				<span className="font-mono">${cost.toFixed(4)}</span>
			</div>
			{shareOpen && sessionId && <SharePanel sessionId={sessionId} onClose={() => setShareOpen(false)} />}
			{anatomyOpen && sessionId && (
				<ContextAnatomyPanel sessionId={sessionId} onClose={() => setAnatomyOpen(false)} />
			)}
			{timelineOpen && sessionId && (
				<MechanismTimelinePanel events={timeline} onClose={() => setTimelineOpen(false)} />
			)}
		</div>
	);
}
