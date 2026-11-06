import { clsx } from "clsx";
import { Button } from "../primitives/Button.tsx";
import { PlusIcon } from "../primitives/icons.tsx";
import { ThemeControl } from "./ThemeControl.tsx";

export interface SidebarProps {
	collapsed: boolean;
	drawer?: boolean;
	onClose?: () => void;
}

export function Sidebar({ collapsed, drawer = false, onClose }: SidebarProps) {
	return (
		<aside
			className={clsx(
				"flex shrink-0 flex-col border-r border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1",
				drawer ? "w-[280px] bg-dsw-bg-base" : collapsed ? "w-14" : "w-[280px]",
			)}
			aria-label="侧栏"
		>
			<div className={clsx("flex h-12 shrink-0 items-center gap-2 px-3", collapsed && "justify-center px-0")}>
				<span className="flex size-7 shrink-0 items-center justify-center rounded-dsw-sm bg-dsw-label-primary text-sm font-semibold text-dsw-label-inverted">
					π
				</span>
				{!collapsed && (
					<>
						<span className="truncate text-sm font-medium">Pi Web</span>
						<span className="ml-auto rounded-dsw-xs bg-dsw-bg-layer-2 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary">
							S1
						</span>
					</>
				)}
			</div>

			<div className={clsx("px-2", collapsed && "flex justify-center px-0")}>
				{collapsed ? (
					<Button variant="ghost" className="w-10 px-0" disabled title="新建会话将在 S2 接入">
						<PlusIcon />
						<span className="sr-only">新建会话</span>
					</Button>
				) : (
					<Button variant="secondary" className="w-full justify-start" disabled title="新建会话将在 S2 接入">
						<PlusIcon />
						新建会话
						<span className="ml-auto text-[10px] text-dsw-label-tertiary">S2</span>
					</Button>
				)}
			</div>

			{!collapsed && (
				<div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 px-2">
					<span className="px-1 text-xs text-dsw-label-tertiary">会话</span>
					<div className="rounded-dsw-md border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-2 px-3 py-6 text-center text-xs leading-5 text-dsw-label-secondary">
						还没有会话
						<br />
						会话列表将在 S5 接入
					</div>
				</div>
			)}

			<div
				className={clsx(
					"mt-auto flex flex-col gap-3 border-t border-hairline border-dsw-border-l1 p-3",
					collapsed && "items-center px-0",
				)}
			>
				<ThemeControl collapsed={collapsed} />
				{!collapsed && drawer && (
					<Button variant="ghost" className="w-full justify-start" onClick={onClose}>
						关闭侧栏
					</Button>
				)}
			</div>
		</aside>
	);
}
