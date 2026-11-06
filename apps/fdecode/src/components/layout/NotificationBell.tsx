import { useEffect, useState } from "react";
import {
	type AppNotification,
	browserNotificationsEnabled,
	listNotifications,
	markAllNotificationsRead,
	setBrowserNotifications,
	subscribeNotifications,
} from "../../lib/notifications.ts";
import { IconButton } from "../primitives/IconButton.tsx";
import { BellIcon } from "../primitives/icons.tsx";

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function NotificationBell() {
	const [items, setItems] = useState<AppNotification[]>([]);
	const [open, setOpen] = useState(false);
	const [browserEnabled, setBrowserEnabled] = useState(false);

	useEffect(() => {
		const refresh = () => setItems(listNotifications());
		refresh();
		setBrowserEnabled(browserNotificationsEnabled());
		const unsubscribe = subscribeNotifications(refresh);
		const onStorage = () => refresh();
		window.addEventListener("storage", onStorage);
		return () => {
			unsubscribe();
			window.removeEventListener("storage", onStorage);
		};
	}, []);

	const unread = items.filter((item) => !item.read).length;

	return (
		<div className="relative">
			<IconButton label="通知" onClick={() => setOpen((current) => !current)}>
				<span className="relative">
					<BellIcon />
					{unread > 0 && (
						<span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-dsw-state-error px-1 text-center text-[9px] leading-4 text-dsw-label-inverted">
							{unread > 9 ? "9+" : unread}
						</span>
					)}
				</span>
			</IconButton>

			{open && (
				<div className="absolute right-0 top-11 z-50 w-80 rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-base p-3 shadow-dsw-prominent">
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold">通知</span>
						<button
							type="button"
							className="ml-auto text-[11px] text-dsw-label-tertiary hover:text-dsw-label-primary"
							onClick={() => {
								markAllNotificationsRead();
								setItems(listNotifications());
							}}
						>
							全部已读
						</button>
					</div>

					<label className="mt-2 flex items-center gap-2 text-[11px] text-dsw-label-secondary">
						<input
							type="checkbox"
							checked={browserEnabled}
							onChange={(event) => {
								void setBrowserNotifications(event.target.checked).then((enabled) => {
									setBrowserEnabled(enabled);
									if (!enabled) setItems(listNotifications());
								});
							}}
						/>
						页面隐藏时发送浏览器通知
					</label>

					<div className="mt-2 max-h-64 overflow-y-auto">
						{items.length === 0 ? (
							<p className="py-4 text-center text-[11px] text-dsw-label-tertiary">没有通知</p>
						) : (
							items.map((item) => (
								<div key={item.id} className="border-t border-hairline border-dsw-border-l1 py-1.5">
									<div className="flex items-center gap-2">
										<span
											className={
												item.read ? "text-[11px] text-dsw-label-tertiary" : "text-[11px] font-medium"
											}
										>
											{item.title}
										</span>
										<span className="ml-auto font-mono text-[10px] text-dsw-label-tertiary">
											{formatTime(item.ts)}
										</span>
									</div>
									<p className="truncate text-[11px] text-dsw-label-secondary">{item.body}</p>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
