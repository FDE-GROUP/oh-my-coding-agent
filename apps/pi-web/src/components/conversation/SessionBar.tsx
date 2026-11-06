import type { RpcSessionStats } from "../../server/runtime.ts";

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

export function SessionBar({ models, model, stats, onSelectModel, onClone }: SessionBarProps) {
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

				<button
					type="button"
					onClick={onClone}
					className="ml-auto rounded-dsw-xs border border-dsw-border-l1 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary hover:text-dsw-label-primary"
				>
					克隆
				</button>
				<span className="font-mono">{contextLabel(stats)}</span>
				<span className="font-mono">
					↑{compact(tokens?.input)} ↓{compact(tokens?.output)}
				</span>
				<span className="font-mono">${cost.toFixed(4)}</span>
			</div>
		</div>
	);
}
