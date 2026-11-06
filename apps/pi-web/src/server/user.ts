/**
 * 当前请求的用户。
 *
 * @remarks
 * 生产入口在认证通过后写入 `x-piweb-user` 和 `x-piweb-user-name`，并删除
 * 浏览器传入的同名头。开发模式下没有边缘层，回退为本地用户。
 *
 * @internal
 */
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * 用户信息。
 *
 * @internal
 */
export interface RequestUser {
	id: string;
	name: string;
}

/**
 * 读取当前请求的用户。
 *
 * @returns 边缘层注入的用户；开发模式返回 `local`。
 * @internal
 */
export function getCurrentUser(): RequestUser {
	const id = getRequestHeader("x-piweb-user") ?? "local";
	const name = getRequestHeader("x-piweb-user-name") ?? (id === "local" ? "Local" : id);
	return { id, name };
}
