/**
 * 页面内通知与浏览器通知。
 *
 * @remarks
 * 通知保存在 `localStorage`，最多 50 条。浏览器通知默认关闭，需要用户显式授权；
 * 只在页面隐藏且会话结束时发送，不包含 prompt 或工具输出正文。
 *
 * @internal
 */

/**
 * 一条通知。
 *
 * @internal
 */
export interface AppNotification {
	id: number;
	ts: number;
	title: string;
	body: string;
	read: boolean;
}

const STORAGE_KEY = "fdecode-notifications";
const BROWSER_KEY = "fdecode-browser-notifications";
const listeners = new Set<() => void>();
let sequence = 0;

function load(): AppNotification[] {
	if (typeof window === "undefined") return [];
	try {
		const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
		return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
	} catch {
		return [];
	}
}

function save(list: AppNotification[]): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-50)));
	for (const listener of listeners) listener();
}

/**
 * 订阅通知变化。
 *
 * @param listener - 变化回调。
 * @returns 取消订阅函数。
 * @internal
 */
export function subscribeNotifications(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * 读取通知列表。
 *
 * @returns 按时间倒序的通知。
 * @internal
 */
export function listNotifications(): AppNotification[] {
	return [...load()].sort((left, right) => right.ts - left.ts);
}

/**
 * 写入一条通知。
 *
 * @param title - 标题。
 * @param body - 摘要，不应包含 prompt 或工具输出正文。
 * @internal
 */
export function pushNotification(title: string, body: string): void {
	if (typeof window === "undefined") return;
	const list = load();
	list.push({ id: Date.now() + ++sequence, ts: Date.now(), title, body, read: false });
	save(list);

	if (
		window.localStorage.getItem(BROWSER_KEY) === "1" &&
		typeof Notification !== "undefined" &&
		Notification.permission === "granted" &&
		document.visibilityState === "hidden"
	) {
		try {
			new Notification(title, { body });
		} catch {
			// Browser notifications are best-effort.
		}
	}
}

/**
 * 全部标记为已读。
 *
 * @internal
 */
export function markAllNotificationsRead(): void {
	save(load().map((item) => ({ ...item, read: true })));
}

/**
 * 未读数量。
 *
 * @returns 未读通知数。
 * @internal
 */
export function unreadNotificationCount(): number {
	return load().filter((item) => !item.read).length;
}

/**
 * 浏览器通知是否已启用。
 *
 * @returns 是否启用。
 * @internal
 */
export function browserNotificationsEnabled(): boolean {
	return typeof window !== "undefined" && window.localStorage.getItem(BROWSER_KEY) === "1";
}

/**
 * 请求并设置浏览器通知。
 *
 * @param enabled - 是否启用。
 * @returns 设置后的状态；权限被拒绝时返回 `false`。
 * @internal
 */
export async function setBrowserNotifications(enabled: boolean): Promise<boolean> {
	if (typeof window === "undefined") return false;
	if (!enabled) {
		window.localStorage.setItem(BROWSER_KEY, "0");
		return false;
	}
	if (typeof Notification === "undefined") return false;
	const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
	if (permission !== "granted") return false;
	window.localStorage.setItem(BROWSER_KEY, "1");
	return true;
}
