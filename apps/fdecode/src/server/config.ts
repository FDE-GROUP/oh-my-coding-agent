/**
 * 应用侧配置读取。
 *
 * @remarks
 * 配置由 `config.mjs` 统一解析；这里缓存一次，避免每个请求重复读文件和
 * 校验工作区路径。
 *
 * @internal
 */
import { type AppConfig, loadConfig, resolveConfigPath } from "../../config.mjs";

interface Loaded {
	config: AppConfig;
	path: string;
	errors: string[];
}

const globalStore = globalThis as typeof globalThis & { __piWebConfig?: Loaded };

/**
 * 读取并缓存应用配置。
 *
 * @returns 配置、路径与校验错误。
 * @internal
 */
export function getAppConfig(): Loaded {
	const path = resolveConfigPath();
	if (!globalStore.__piWebConfig || globalStore.__piWebConfig.path !== path) {
		const loaded = loadConfig();
		globalStore.__piWebConfig = { config: loaded.config, path: loaded.path, errors: loaded.errors };
	}
	return globalStore.__piWebConfig;
}
