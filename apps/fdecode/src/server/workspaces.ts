/**
 * 工作区白名单。
 *
 * @internal
 */
import { getAppConfig } from "./config.ts";

/**
 * 对外暴露的工作区。
 *
 * @internal
 */
export interface Workspace {
	id: string;
	name: string;
	path: string;
}

/**
 * 列出配置中的工作区。
 *
 * @returns 工作区列表；配置为空时返回默认目录。
 * @internal
 */
export function listWorkspaces(): Workspace[] {
	return getAppConfig().config.workspaces.map((workspace) => ({ ...workspace }));
}

/**
 * 按 id 查找工作区。
 *
 * @param id - 工作区 id。
 * @returns 工作区；不存在时返回 `undefined`。
 * @internal
 */
export function findWorkspace(id: string): Workspace | undefined {
	return listWorkspaces().find((workspace) => workspace.id === id);
}

/**
 * 默认工作区。
 *
 * @returns 第一个工作区；配置异常时回退当前目录。
 * @internal
 */
export function defaultWorkspace(): Workspace {
	const workspaces = listWorkspaces();
	if (workspaces.length > 0) return workspaces[0];
	return { id: "default", name: "default", path: process.cwd() };
}
