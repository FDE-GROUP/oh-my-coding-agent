/**
 * 进程健康信息。
 *
 * @remarks
 * S1 用它验证 SSR、server function 与生产入口是否连通；后续会加入 Pi 可执行
 * 文件解析和模型配置检查。
 *
 * @internal
 */
import { createServerFn } from "@tanstack/react-start";
import { defaultWorkspace } from "./workspaces.ts";

/**
 * 健康检查结果。
 *
 * @internal
 */
export interface Health {
	ok: boolean;
	cwd: string;
	node: string;
	pid: number;
}

/**
 * 读取当前服务进程的健康信息。
 *
 * @returns 健康检查结果。
 * @internal
 */
export function readHealth(): Health {
	return {
		ok: true,
		cwd: defaultWorkspace().path,
		node: process.version,
		pid: process.pid,
	};
}

/**
 * 供路由 loader 使用的健康检查 server function。
 *
 * @returns 健康检查结果。
 * @internal
 */
export const getHealth = createServerFn({ method: "GET" }).handler(async (): Promise<Health> => readHealth());
