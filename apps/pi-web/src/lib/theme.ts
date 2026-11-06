/**
 * 主题偏好的读取、解析与应用。
 *
 * @remarks
 * 主题只切换 `html[data-theme]` 与 CSS 变量，组件不写主题分支。选择保存在
 * `localStorage`，`system` 通过 `prefers-color-scheme` 实时解析。
 *
 * @internal
 */

/**
 * 用户可选的主题偏好。
 *
 * @internal
 */
export type ThemePreference = "light" | "dark" | "system";

/**
 * 解析后的实际主题。
 *
 * @internal
 */
export type ResolvedTheme = "light" | "dark";

/**
 * 主题偏好存储键。
 *
 * @internal
 */
export const THEME_STORAGE_KEY = "pi-web-theme";

/**
 * 首屏渲染前的内联主题初始化脚本。
 *
 * @remarks
 * 在 CSS 加载后、React 水合前运行，避免深色主题出现白色闪屏。
 *
 * @internal
 */
export const THEME_INIT_SCRIPT = `(function(){try{var key=${JSON.stringify(THEME_STORAGE_KEY)};var preference=localStorage.getItem(key);if(preference!=="light"&&preference!=="dark")preference="system";var dark=preference==="dark"||(preference==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.dataset.theme=dark?"dark":"light";root.dataset.themePreference=preference;root.style.colorScheme=dark?"dark":"light";}catch(error){}})();`;

/**
 * 读取已保存的主题偏好。
 *
 * @returns 合法的主题偏好；未保存或值非法时返回 `system`。
 * @internal
 */
export function readThemePreference(): ThemePreference {
	if (typeof window === "undefined") return "system";
	const value = window.localStorage.getItem(THEME_STORAGE_KEY);
	return value === "light" || value === "dark" ? value : "system";
}

/**
 * 把偏好解析为实际主题。
 *
 * @param preference - 用户偏好。
 * @returns `light` 或 `dark`。
 * @internal
 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
	if (preference !== "system") return preference;
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * 应用主题并持久化偏好。
 *
 * @param preference - 要应用的主题偏好。
 * @internal
 */
export function applyTheme(preference: ThemePreference): void {
	if (typeof document === "undefined") return;
	const resolved = resolveTheme(preference);
	const root = document.documentElement;
	root.dataset.theme = resolved;
	root.dataset.themePreference = preference;
	root.style.colorScheme = resolved;
	if (typeof window !== "undefined") window.localStorage.setItem(THEME_STORAGE_KEY, preference);
}

/**
 * 监听系统主题变化。
 *
 * @param onChange - 系统主题变化时调用，参数为新的实际主题。
 * @returns 取消监听的函数。
 * @internal
 */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
	if (typeof window === "undefined") return () => undefined;
	const query = window.matchMedia("(prefers-color-scheme: dark)");
	const listener = () => onChange(query.matches ? "dark" : "light");
	query.addEventListener("change", listener);
	return () => query.removeEventListener("change", listener);
}

/**
 * 按设备像素比安装发丝线宽度。
 *
 * @remarks
 * DSH 把 0.5px 向下取整到整设备像素，最小 1 个设备像素；这里保持同一规则。
 *
 * @returns 取消监听并恢复原值的函数。
 * @internal
 */
export function installHairline(): () => void {
	if (typeof window === "undefined") return () => undefined;
	const root = document.documentElement;
	const update = () => {
		const ratio = window.devicePixelRatio || 1;
		const width = Math.max(1, Math.floor(0.5 * ratio)) / ratio;
		root.style.setProperty("--dsh-hairline-width", `${width}px`);
	};
	update();
	const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
	query.addEventListener("change", update);
	return () => {
		query.removeEventListener("change", update);
		root.style.removeProperty("--dsh-hairline-width");
	};
}
