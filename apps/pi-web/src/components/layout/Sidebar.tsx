import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import type { SessionSummary } from "../../server/sessions.ts";
import { Button } from "../primitives/Button.tsx";
import { IconButton } from "../primitives/IconButton.tsx";
import { PencilIcon, PlusIcon } from "../primitives/icons.tsx";
import { ThemeControl } from "./ThemeControl.tsx";

export interface SidebarProps {
	collapsed: boolean;
	drawer?: boolean;
	loading?: boolean;
	sessions: SessionSummary[];
	activeId?: string;
	onNew: () => void;
	onRename: (id: string, name: string) => Promise<void>;
	onClose?: () => void;
}

function sessionTitle(session: SessionSummary): string {
	if (session.name) return session.name;
	const first = session.firstMessage.trim().replace(/\s+/g, " ");
	if (first.length > 0) return first.length > 48 ? `${first.slice(0, 48)}…` : first;
	return session.id.slice(0, 8);
}

function formatTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function SessionItem({
	session,
	active,
	onRename,
}: {
	session: SessionSummary;
	active: boolean;
	onRename: (id: string, name: string) => Promise<void>;
}) {
	const [renaming, setRenaming] = useState(false);
	const [value, setValue] = useState(session.name ?? "");

	useEffect(() => setValue(session.name ?? ""), [session.name]);

	async function commit() {
		const name = value.trim();
		setRenaming(false);
		if (name.length === 0 || name === (session.name ?? "")) return;
		await onRename(session.id, name);
	}

	if (renaming) {
		return (
			<form
				className="px-2 py-1"
				onSubmit={(event) => {
					event.preventDefault();
					void commit();
				}}
			>
				<input
					// biome-ignore lint/a11y/noAutofocus: 重命名输入是用户显式触发的临时状态。
					autoFocus
					value={value}
					onChange={(event) => setValue(event.target.value)}
					onBlur={() => void commit()}
					onKeyDown={(event) => {
						if (event.key === "Escape") setRenaming(false);
					}}
					className="h-8 w-full rounded-dsw-sm border border-hairline border-dsw-border-l3 bg-dsw-bg-layer-1 px-2 text-xs text-dsw-label-primary outline-none"
				/>
			</form>
		);
	}

	return (
		<div className="group relative">
			<Link
				to="/session/$sessionId"
				params={{ sessionId: session.id }}
				className={clsx(
					"flex flex-col gap-1 rounded-dsw-sm px-2 py-2 pr-8 no-underline",
					active ? "bg-dsw-bg-layer-2 text-dsw-label-primary" : "text-dsw-label-secondary hover:bg-dsw-bg-layer-2",
				)}
			>
				<span className="truncate text-xs leading-5">{sessionTitle(session)}</span>
				<span className="truncate font-mono text-[10px] text-dsw-label-tertiary">
					{formatTime(session.modified)} · {session.messageCount} 条
				</span>
			</Link>
			<IconButton
				label="重命名会话"
				className="absolute right-1 top-1.5 size-6 opacity-0 group-hover:opacity-100"
				onClick={() => setRenaming(true)}
			>
				<PencilIcon width={12} height={12} />
			</IconButton>
		</div>
	);
}

export function Sidebar({
	collapsed,
	drawer = false,
	loading = false,
	sessions,
	activeId,
	onNew,
	onRename,
	onClose,
}: SidebarProps) {
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
							M1
						</span>
					</>
				)}
			</div>

			<div className={clsx("px-2", collapsed && "flex justify-center px-0")}>
				{collapsed ? (
					<IconButton label="新建会话" onClick={onNew}>
						<PlusIcon />
					</IconButton>
				) : (
					<Button variant="secondary" className="w-full justify-start" onClick={onNew}>
						<PlusIcon />
						新建会话
					</Button>
				)}
			</div>

			{!collapsed && (
				<div className="mt-4 flex min-h-0 flex-1 flex-col gap-1 px-2">
					<span className="px-1 text-xs text-dsw-label-tertiary">会话</span>
					<div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-2">
						{sessions.length === 0 ? (
							<div className="rounded-dsw-md border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-2 px-3 py-6 text-center text-xs leading-5 text-dsw-label-secondary">
								{loading ? "正在加载会话…" : "还没有会话"}
							</div>
						) : (
							sessions.map((session) => (
								<SessionItem
									key={session.id}
									session={session}
									active={session.id === activeId}
									onRename={onRename}
								/>
							))
						)}
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
