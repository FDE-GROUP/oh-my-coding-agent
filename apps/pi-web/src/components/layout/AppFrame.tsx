import { useEffect, useRef, useState } from "react";
import { useViewport } from "../../lib/viewport.ts";
import type { Health } from "../../server/health.ts";
import { Conversation } from "../conversation/Conversation.tsx";
import { IconButton } from "../primitives/IconButton.tsx";
import { PanelLeftIcon } from "../primitives/icons.tsx";
import { RightPanel } from "./RightPanel.tsx";
import { Sidebar } from "./Sidebar.tsx";

export function AppFrame({ health }: { health: Health }) {
	const { width } = useViewport();
	const isDrawer = width < 768;
	const [expanded, setExpanded] = useState(true);
	const previousWide = useRef(width >= 1024);

	useEffect(() => {
		const wide = width >= 1024;
		if (previousWide.current && !wide) setExpanded(false);
		previousWide.current = wide;
	}, [width]);

	const layoutLabel = isDrawer ? "抽屉" : expanded ? "280px" : "56px";

	return (
		<div className="flex h-dvh overflow-hidden bg-dsw-bg-base text-dsw-label-primary">
			{!isDrawer && <Sidebar collapsed={!expanded} />}

			{isDrawer && expanded && (
				<div className="fixed inset-0 z-40 flex">
					<Sidebar collapsed={false} drawer onClose={() => setExpanded(false)} />
					<button
						type="button"
						aria-label="关闭侧栏"
						className="flex-1 bg-dsw-bg-mask-1"
						onClick={() => setExpanded(false)}
					/>
				</div>
			)}

			<main className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline border-dsw-border-l1 px-3">
					<IconButton
						label={expanded ? "收起侧栏" : "展开侧栏"}
						aria-expanded={expanded}
						onClick={() => setExpanded((current) => !current)}
					>
						<PanelLeftIcon />
					</IconButton>
					<span className="truncate text-sm font-medium">Pi Web</span>
					<span className="ml-auto shrink-0 font-mono text-[11px] text-dsw-label-tertiary">
						{width}px · {layoutLabel}
					</span>
				</header>

				<Conversation health={health} />
			</main>

			<RightPanel />
		</div>
	);
}
