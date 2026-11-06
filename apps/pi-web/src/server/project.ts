/**
 * 解析 Pi 的工作目录。
 *
 * @remarks
 * 优先使用显式的 `PI_WEB_CWD`，其次是 pnpm 提供的 `INIT_CWD`，最后回退到
 * 服务进程的当前目录。这样从任意目录执行 `pnpm run pi-web` 时，Pi 默认在
 * 调用者所在目录工作，而不是应用包目录。
 *
 * @returns 绝对或相对的工作目录路径。
 * @internal
 */
export function resolveProjectCwd(): string {
	const explicit = process.env.PI_WEB_CWD?.trim();
	if (explicit) return explicit;
	const init = process.env.INIT_CWD?.trim();
	if (init) return init;
	return process.cwd();
}
