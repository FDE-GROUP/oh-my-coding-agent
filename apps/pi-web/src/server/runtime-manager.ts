/**
 * 会话运行时注册表：懒启动、并发上限与空闲回收。
 *
 * @remarks
 * 运行时以 Pi 的 session id 为键。M1 最多同时保留 4 个活跃进程；超过上限时
 * 优先回收最久未活动且不忙的运行时。
 *
 * @internal
 */

import { resolveProjectCwd } from "./project.ts";
import { SessionRuntime, type SessionRuntimeOptions } from "./runtime.ts";

/**
 * 运行时报错：已达到并发上限且没有可回收的运行时。
 *
 * @internal
 */
export class RuntimeCapacityError extends Error {
	constructor(message = "已达到活跃会话上限，且没有可回收的空闲会话") {
		super(message);
		this.name = "RuntimeCapacityError";
	}
}

/**
 * 管理器配置。
 *
 * @internal
 */
export interface RuntimeManagerOptions {
	/** 最大活跃运行时数量，默认 4。 */
	maxRuntimes?: number;
	/** 空闲回收阈值，默认 30 分钟。 */
	idleMs?: number;
	/** 清理间隔，默认 60 秒。 */
	sweepMs?: number;
	/** 所有运行时共享的启动参数。 */
	runtimeOptions?: Omit<SessionRuntimeOptions, "onExit" | "sessionPath">;
}

const DEFAULT_MAX_RUNTIMES = 4;
const DEFAULT_IDLE_MS = 30 * 60_000;
const DEFAULT_SWEEP_MS = 60_000;

/**
 * 管理多个会话运行时。
 *
 * @internal
 */
export class RuntimeManager {
	readonly #runtimes = new Map<string, SessionRuntime>();
	readonly #options: Required<Omit<RuntimeManagerOptions, "runtimeOptions">> &
		Pick<RuntimeManagerOptions, "runtimeOptions">;
	readonly #sweepTimer: NodeJS.Timeout;

	constructor(options: RuntimeManagerOptions = {}) {
		this.#options = {
			maxRuntimes: options.maxRuntimes ?? DEFAULT_MAX_RUNTIMES,
			idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
			sweepMs: options.sweepMs ?? DEFAULT_SWEEP_MS,
			runtimeOptions: options.runtimeOptions,
		};
		this.#sweepTimer = setInterval(() => {
			void this.sweep();
		}, this.#options.sweepMs);
		this.#sweepTimer.unref();
	}

	/** 当前活跃运行时数量。 */
	get size(): number {
		return this.#runtimes.size;
	}

	/**
	 * 启动一个运行时并完成初始化。
	 *
	 * @param options - 单个运行时的启动参数。
	 * @returns 已初始化的运行时。
	 * @internal
	 */
	async create(options: SessionRuntimeOptions = {}): Promise<SessionRuntime> {
		await this.#makeRoom();
		const runtime = new SessionRuntime({
			...this.#options.runtimeOptions,
			...options,
			onExit: (exited) => {
				const id = exited.sessionId;
				if (id && this.#runtimes.get(id) === exited) this.#runtimes.delete(id);
			},
		});
		try {
			const state = await runtime.initialize();
			const existing = this.#runtimes.get(state.sessionId);
			if (existing) {
				await runtime.dispose();
				return existing;
			}
			this.#runtimes.set(state.sessionId, runtime);
			return runtime;
		} catch (error) {
			await runtime.dispose();
			throw error;
		}
	}

	/**
	 * 按 session id 查找运行时。
	 *
	 * @param id - Pi session id。
	 * @returns 运行时；不存在时返回 `undefined`。
	 * @internal
	 */
	get(id: string): SessionRuntime | undefined {
		return this.#runtimes.get(id);
	}

	/**
	 * 关闭并移除一个运行时。
	 *
	 * @param id - Pi session id。
	 * @returns 是否找到并关闭。
	 * @internal
	 */
	async close(id: string): Promise<boolean> {
		const runtime = this.#runtimes.get(id);
		if (!runtime) return false;
		this.#runtimes.delete(id);
		await runtime.dispose();
		return true;
	}

	/**
	 * 回收超过空闲阈值的运行时。
	 *
	 * @returns 回收的数量。
	 * @internal
	 */
	async sweep(): Promise<number> {
		const now = Date.now();
		const expired = [...this.#runtimes.values()].filter(
			(runtime) => !runtime.busy && now - runtime.lastActivityAt >= this.#options.idleMs,
		);
		await Promise.all(
			expired.map(async (runtime) => {
				const id = runtime.sessionId;
				if (id) this.#runtimes.delete(id);
				await runtime.dispose();
			}),
		);
		return expired.length;
	}

	/**
	 * 关闭所有运行时。
	 *
	 * @returns 全部退出后完成。
	 * @internal
	 */
	async closeAll(): Promise<void> {
		clearInterval(this.#sweepTimer);
		const runtimes = [...this.#runtimes.values()];
		this.#runtimes.clear();
		await Promise.all(runtimes.map((runtime) => runtime.dispose()));
	}

	async #makeRoom(): Promise<void> {
		if (this.#runtimes.size < this.#options.maxRuntimes) return;
		const idle = [...this.#runtimes.entries()]
			.filter(([, runtime]) => !runtime.busy)
			.sort(([, left], [, right]) => left.lastActivityAt - right.lastActivityAt)[0];
		if (!idle) throw new RuntimeCapacityError();
		const [id, runtime] = idle;
		this.#runtimes.delete(id);
		await runtime.dispose();
	}
}

const globalStore = globalThis as typeof globalThis & { __piWebRuntimeManager?: RuntimeManager };

/**
 * 获取进程级运行时管理器。
 *
 * @returns 单例管理器。
 * @internal
 */
export function getRuntimeManager(): RuntimeManager {
	if (!globalStore.__piWebRuntimeManager) {
		globalStore.__piWebRuntimeManager = new RuntimeManager({
			maxRuntimes: Number(process.env.PI_WEB_MAX_RUNTIMES ?? DEFAULT_MAX_RUNTIMES),
			idleMs: Number(process.env.PI_WEB_IDLE_MS ?? DEFAULT_IDLE_MS),
			runtimeOptions: { cwd: resolveProjectCwd() },
		});
	}
	return globalStore.__piWebRuntimeManager;
}
