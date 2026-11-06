import { useEffect, useState } from "react";
import { createShare, listShares, revokeShare, type ShareInfo } from "../../lib/api.ts";
import { Button } from "../primitives/Button.tsx";

export interface SharePanelProps {
	sessionId: string;
	onClose: () => void;
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function SharePanel({ sessionId, onClose }: SharePanelProps) {
	const [shares, setShares] = useState<ShareInfo[]>([]);
	const [created, setCreated] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		listShares(sessionId)
			.then(setShares)
			.catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
	}, [sessionId]);

	async function refresh() {
		setShares(await listShares(sessionId));
	}

	async function create() {
		setBusy(true);
		setError(null);
		try {
			const share = await createShare(sessionId, 7);
			setCreated(share.url);
			await refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(false);
		}
	}

	async function revoke(id: string) {
		setBusy(true);
		setError(null);
		try {
			await revokeShare(id);
			await refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button type="button" aria-label="关闭分享" className="absolute inset-0 bg-dsw-bg-mask-1" onClick={onClose} />
			<div className="relative w-full max-w-lg rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-4 shadow-dsw-prominent">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">只读分享</h2>
					<button type="button" className="ml-auto text-xs text-dsw-label-tertiary" onClick={onClose}>
						关闭
					</button>
				</div>
				<p className="mt-1 text-xs text-dsw-label-secondary">链接需要登录后才能打开，默认 7 天过期。</p>

				<div className="mt-3 flex items-center gap-2">
					<Button variant="primary" disabled={busy} onClick={() => void create()}>
						创建分享链接
					</Button>
					{created && (
						<>
							<a
								href={created}
								target="_blank"
								rel="noreferrer"
								className="min-w-0 flex-1 truncate text-xs text-dsw-link"
							>
								{created}
							</a>
							<Button
								variant="ghost"
								onClick={() => {
									void navigator.clipboard.writeText(created).then(() => setCopied(true));
								}}
							>
								{copied ? "已复制" : "复制"}
							</Button>
						</>
					)}
				</div>

				{error && <p className="mt-2 text-xs text-dsw-state-error">{error}</p>}

				<div className="mt-4 flex flex-col gap-1">
					{shares.length === 0 ? (
						<p className="text-xs text-dsw-label-tertiary">还没有分享。</p>
					) : (
						shares.map((share) => {
							const expired = share.expiresAt <= Date.now();
							const revoked = Boolean(share.revokedAt);
							return (
								<div
									key={share.id}
									className="flex items-center gap-2 border-t border-hairline border-dsw-border-l1 py-1.5"
								>
									<span className="text-xs text-dsw-label-secondary">创建 {formatTime(share.createdAt)}</span>
									<span className="text-[11px] text-dsw-label-tertiary">
										{revoked ? "已撤销" : expired ? "已过期" : `到期 ${formatTime(share.expiresAt)}`}
									</span>
									{!revoked && !expired && (
										<Button variant="ghost" className="ml-auto" onClick={() => void revoke(share.id)}>
											撤销
										</Button>
									)}
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
