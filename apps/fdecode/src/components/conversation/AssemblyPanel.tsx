import { useCallback, useEffect, useState } from "react";
import { sendCommand } from "../../lib/api.ts";
import type { RpcAssembly } from "../../server/runtime.ts";
import { Button } from "../primitives/Button.tsx";

/** 装配面板的属性。 */
export interface AssemblyPanelProps {
	sessionId: string;
	onClose: () => void;
}

const SCOPE_LABELS: Record<string, string> = {
	global: "全局 mcp.json",
	project: "项目 mcp.json",
	extension: "扩展注册",
};

function scopeLabel(scope: string): string {
	return SCOPE_LABELS[scope] ?? scope;
}

/**
 * 生效配置的逐键对照：值为全局/项目合并后与全局层的差异键。
 *
 * @remarks
 * 差异 = effective 中与 global 不同的键（来源为项目层或 CLI 覆盖）。不重复实现合并
 * 语义，仅做展示层 diff。
 */
function diffKeys(effective: Record<string, unknown>, global: Record<string, unknown>): string[] {
	return Object.keys(effective).filter((key) => JSON.stringify(effective[key]) !== JSON.stringify(global[key]));
}

/**
 * 装配面板：展示会话装了什么、来自哪里（观测面）。
 *
 * @remarks
 * 数据来自只读 RPC 命令 get_assembly：扩展与注册项、MCP 服务器（连接状态未暴露，
 * 显示为「未暴露」）、settings 三层与差异键。只读，不产生 provider 请求。
 */
export function AssemblyPanel({ sessionId, onClose }: AssemblyPanelProps) {
	const [assembly, setAssembly] = useState<RpcAssembly | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const data = (await sendCommand(sessionId, { type: "get_assembly" })) as RpcAssembly;
			setAssembly(data);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(false);
		}
	}, [sessionId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const overrides = assembly ? diffKeys(assembly.settings.effective, assembly.settings.global) : [];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button type="button" aria-label="关闭装配视图" className="absolute inset-0 overlay-mask" onClick={onClose} />
			<div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">装配视图</h2>
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
				{!assembly && !error && <p className="mt-2 text-xs text-dsw-label-tertiary">加载中…</p>}

				{assembly && (
					<div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto text-[11px]">
						<section>
							<h3 className="mb-1 text-xs font-semibold">
								扩展（{assembly.extensions.length}）
								{assembly.extensionErrors.length > 0 && (
									<span className="ml-1 text-dsw-state-error">加载失败 {assembly.extensionErrors.length}</span>
								)}
							</h3>
							{assembly.extensions.length === 0 && <p className="text-dsw-label-tertiary">未加载任何扩展。</p>}
							<ul className="space-y-1">
								{assembly.extensions.map((extension) => (
									<li
										key={extension.path}
										className="rounded-dsw-xs border border-hairline border-dsw-border-l1 px-2 py-1.5"
									>
										<p className="truncate font-mono text-dsw-label-primary" title={extension.path}>
											{extension.path}
										</p>
										<p className="mt-0.5 text-dsw-label-tertiary">{extension.source}</p>
										<p className="mt-0.5 text-dsw-label-secondary">
											工具 {extension.tools.length}
											{extension.tools.length > 0 && (
												<span className="font-mono text-dsw-label-tertiary">
													{" "}
													{extension.tools.join(" · ")}
												</span>
											)}
											{extension.commands.length > 0 && ` · 命令 ${extension.commands.join(" · ")}`}
											{extension.hooks.length > 0 && ` · 钩子 ${extension.hooks.join(" · ")}`}
										</p>
									</li>
								))}
								{assembly.extensionErrors.map((failure) => (
									<li
										key={failure.path}
										className="rounded-dsw-xs border border-dsw-state-error px-2 py-1.5 text-dsw-state-error"
									>
										<p className="truncate font-mono">{failure.path}</p>
										<p className="mt-0.5 break-all">{failure.error}</p>
									</li>
								))}
							</ul>
						</section>

						<section>
							<h3 className="mb-1 text-xs font-semibold">MCP 服务器（{assembly.mcp.servers.length}）</h3>
							{assembly.mcp.servers.length === 0 && (
								<p className="text-dsw-label-tertiary">未配置 MCP 服务器。</p>
							)}
							<ul className="space-y-1">
								{assembly.mcp.servers.map((server) => (
									<li
										key={`${server.scope}:${server.name}`}
										className="flex items-center gap-2 rounded-dsw-xs border border-hairline border-dsw-border-l1 px-2 py-1.5"
									>
										<span className="min-w-0 flex-1 truncate font-mono text-dsw-label-primary">
											{server.name}
										</span>
										<span className="shrink-0 text-dsw-label-tertiary">{scopeLabel(server.scope)}</span>
										{server.exposure && (
											<span className="shrink-0 font-mono text-dsw-label-tertiary">{server.exposure}</span>
										)}
										<span className="shrink-0 text-[10px] text-dsw-label-tertiary">连接状态未暴露</span>
									</li>
								))}
							</ul>
							{assembly.mcp.errors.length > 0 && (
								<p className="mt-1 break-all text-dsw-state-error">{assembly.mcp.errors.join("；")}</p>
							)}
						</section>

						<section>
							<h3 className="mb-1 text-xs font-semibold">生效配置</h3>
							<p className="text-dsw-label-tertiary">
								全局 {Object.keys(assembly.settings.global).length} 键 · 项目{" "}
								{Object.keys(assembly.settings.project).length} 键
							</p>
							{overrides.length > 0 ? (
								<p className="mt-0.5 text-dsw-label-secondary">
									覆盖键：
									<span className="font-mono text-dsw-label-tertiary"> {overrides.join(" · ")}</span>
								</p>
							) : (
								<p className="mt-0.5 text-dsw-label-tertiary">无项目层或 CLI 覆盖。</p>
							)}
							<p className="mt-1 break-all font-mono text-[10px] text-dsw-label-tertiary">
								{assembly.settings.sources.globalPath}
								{" / "}
								{assembly.settings.sources.projectPath}
							</p>
						</section>
					</div>
				)}
			</div>
		</div>
	);
}
