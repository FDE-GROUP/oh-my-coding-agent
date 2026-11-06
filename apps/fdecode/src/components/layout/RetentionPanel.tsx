import { useEffect, useState } from "react";
import { applyRetention, fetchRetentionPreview, type RetentionPreview } from "../../lib/api.ts";
import { pushNotification } from "../../lib/notifications.ts";
import { Button } from "../primitives/Button.tsx";

export interface RetentionPanelProps {
	onClose: () => void;
}

export function RetentionPanel({ onClose }: RetentionPanelProps) {
	const [preview, setPreview] = useState<RetentionPreview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirm, setConfirm] = useState(false);
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<string | null>(null);

	useEffect(() => {
		fetchRetentionPreview()
			.then(setPreview)
			.catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
	}, []);

	async function apply() {
		setBusy(true);
		setError(null);
		try {
			const applied = await applyRetention();
			setResult(
				`已删除会话 ${applied.deletedSessions}、分享 ${applied.deletedShares}、审计 ${applied.deletedAudit}`,
			);
			setPreview(applied);
			setConfirm(false);
			pushNotification("保留清理完成", `会话 ${applied.deletedSessions} / 分享 ${applied.deletedShares}`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="关闭保留清理"
				className="absolute inset-0 bg-dsw-bg-mask-1"
				onClick={onClose}
			/>
			<div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">保留清理</h2>
					<button type="button" className="ml-auto text-xs text-dsw-label-tertiary" onClick={onClose}>
						关闭
					</button>
				</div>
				<p className="mt-1 text-[11px] text-dsw-label-tertiary">
					只清理有归属记录的旧会话；活跃会话、未过期分享不会删除。默认保留策略为关闭。
				</p>

				{error && <p className="mt-2 text-xs text-dsw-state-error">{error}</p>}
				{result && <p className="mt-2 text-xs text-dsw-state-success">{result}</p>}

				{preview && (
					<div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
						<div className="flex flex-wrap gap-3 text-[11px] text-dsw-label-secondary">
							<span>会话：{preview.sessions.length}</span>
							<span>分享：{preview.shares}</span>
							<span>审计：{preview.audit}</span>
							<span>跳过活跃：{preview.skippedActive}</span>
							<span>跳过未知归属：{preview.skippedUnknown}</span>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto">
							{preview.sessions.length === 0 ? (
								<p className="text-xs text-dsw-label-tertiary">没有需要清理的会话。</p>
							) : (
								<table className="w-full border-collapse text-left text-[11px]">
									<thead className="text-dsw-label-tertiary">
										<tr>
											<th className="py-1 pr-2 font-normal">会话</th>
											<th className="py-1 pr-2 font-normal">所有者</th>
											<th className="py-1 pr-2 font-normal">工作区</th>
											<th className="py-1 font-normal">修改时间</th>
										</tr>
									</thead>
									<tbody className="font-mono text-dsw-label-secondary">
										{preview.sessions.map((session) => (
											<tr key={session.id} className="border-t border-hairline border-dsw-border-l1">
												<td className="py-1 pr-2">{session.id.slice(0, 8)}</td>
												<td className="py-1 pr-2">{session.owner}</td>
												<td className="py-1 pr-2">{session.workspaceName}</td>
												<td className="py-1">{new Date(session.modified).toLocaleString("zh-CN")}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>

						<div className="flex items-center gap-2 border-t border-hairline border-dsw-border-l1 pt-2">
							{confirm ? (
								<>
									<span className="text-xs text-dsw-state-error">确认删除以上内容？此操作不可撤销。</span>
									<Button variant="primary" className="ml-auto" disabled={busy} onClick={() => void apply()}>
										确认清理
									</Button>
									<Button variant="ghost" onClick={() => setConfirm(false)}>
										取消
									</Button>
								</>
							) : (
								<Button
									variant="secondary"
									className="ml-auto"
									disabled={busy || preview.sessions.length + preview.shares + preview.audit === 0}
									onClick={() => setConfirm(true)}
								>
									开始清理
								</Button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
