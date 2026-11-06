import type { Health } from "../../server/health.ts";

export function ConversationPlaceholder({ health }: { health: Health }) {
	return (
		<div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
			<div className="w-full max-w-md">
				<p className="text-xs font-medium tracking-wide text-dsw-label-tertiary">FDE Code UI</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight">开始一个任务</h1>
				<p className="mt-3 text-sm leading-6 text-dsw-label-secondary">
					输入任务并发送。会话会出现在左侧，刷新后仍可继续；工具调用会展开为卡片。
				</p>

				<dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 p-4 text-xs">
					<dt className="text-dsw-label-tertiary">工作目录</dt>
					<dd className="truncate font-mono text-dsw-label-secondary" title={health.cwd}>
						{health.cwd}
					</dd>
					<dt className="text-dsw-label-tertiary">Node</dt>
					<dd className="font-mono text-dsw-label-secondary">{health.node}</dd>
					<dt className="text-dsw-label-tertiary">进程</dt>
					<dd className="font-mono text-dsw-label-secondary">{health.pid}</dd>
				</dl>

				<p className="mt-6 text-xs text-dsw-label-tertiary">
					启动命令：<code className="font-mono">pnpm run fdecode</code>
				</p>
			</div>
		</div>
	);
}
