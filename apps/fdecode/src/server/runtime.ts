/**
 * 单个 Pi RPC 子进程的生命周期、命令关联与事件分发。
 *
 * @remarks
 * 每个 Web 会话对应一个 `pi --mode rpc` 子进程。stdout 只按 LF 分帧；
 * stderr 单独保存，不进入协议流。扩展弹窗在 M1 统一取消，避免 agent 挂死。
 *
 * @internal
 */
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { RpcCommand, RpcExtensionUIRequest, RpcResponse, RpcSessionState } from "@earendil-works/pi-coding-agent";
import { createJsonlSplitter } from "./jsonl.ts";

type ResponseOf<C extends RpcCommand["type"]> = Extract<RpcResponse, { command: C; success: true }>;

/**
 * `get_messages` 返回的消息数组。
 *
 * @internal
 */
export type RpcMessages = Extract<RpcResponse, { command: "get_messages"; success: true }>["data"]["messages"];

/**
 * 会话用量统计。
 *
 * @internal
 */
export type RpcSessionStats = Extract<RpcResponse, { command: "get_session_stats"; success: true }>["data"];

/**
 * 上下文解剖数据：system prompt 逐分节、工具、消息与 token 估算（get_context_anatomy 响应）。
 *
 * @internal
 */
export type RpcContextAnatomy = Extract<RpcResponse, { command: "get_context_anatomy"; success: true }>["data"];

/**
 * 装配数据：已加载扩展及其注册项、MCP 服务器、settings 三层（get_assembly 响应）。
 *
 * @internal
 */
export type RpcAssembly = Extract<RpcResponse, { command: "get_assembly"; success: true }>["data"];

/**
 * 一次会话快照。
 *
 * @internal
 */
export interface SessionSnapshot {
	state: RpcSessionState;
	messages: RpcMessages;
	stats: RpcSessionStats;
}

/**
 * 运行时状态。
 *
 * @internal
 */
export type RuntimeStatus = "starting" | "ready" | "exited";

/**
 * 运行时向外发送的事件。
 *
 * @internal
 */
export type RuntimeEvent =
	| { kind: "status"; status: RuntimeStatus }
	| { kind: "record"; record: Record<string, unknown> }
	| { kind: "exit"; code: number | null; signal: string | null; error?: string };

/**
 * 子进程启动参数。
 *
 * @internal
 */
export interface SessionRuntimeOptions {
	/** 工作目录，默认继承当前进程。 */
	cwd?: string;
	/** 恢复指定会话文件。 */
	sessionPath?: string;
	/** Pi 可执行文件；默认使用 `FDECODE_PI_BIN` 或 PATH 中的 `pi`。 */
	piBin?: string;
	/** 追加给 Pi 的参数，测试会用它加载 faux provider 扩展。 */
	piArgs?: string[];
	/** 额外环境变量。 */
	env?: Record<string, string>;
	/** 命令响应超时，默认 60 秒。 */
	commandTimeoutMs?: number;
	/** 子进程退出回调。 */
	onExit?: (runtime: SessionRuntime) => void;
}

const DEFAULT_COMMAND_TIMEOUT_MS = 60_000;
const DIALOG_METHODS = new Set(["select", "confirm", "input", "editor"]);

function resolveCommand(piBin: string, args: string[]): { command: string; args: string[] } {
	if (piBin.endsWith(".js") || piBin.endsWith(".mjs")) {
		return { command: process.execPath, args: [piBin, ...args] };
	}
	return { command: piBin, args };
}

/**
 * 管理一个 Pi RPC 子进程。
 *
 * @internal
 */
export class SessionRuntime {
	readonly #child: ChildProcessWithoutNullStreams;
	readonly #splitter = createJsonlSplitter();
	readonly #pending = new Map<
		string,
		{ resolve: (response: RpcResponse) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
	>();
	readonly #listeners = new Set<(event: RuntimeEvent) => void>();
	readonly #commandTimeoutMs: number;
	readonly #onExit: ((runtime: SessionRuntime) => void) | undefined;
	readonly #stderr: string[] = [];
	#status: RuntimeStatus = "starting";
	#state: RpcSessionState | undefined;
	#busy = false;
	#lastActivityAt = Date.now();
	#sequence = 0;
	#exit: { code: number | null; signal: NodeJS.Signals | null } | undefined;

	constructor(options: SessionRuntimeOptions = {}) {
		this.#commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
		this.#onExit = options.onExit;
		const piBin = options.piBin ?? process.env.FDECODE_PI_BIN ?? "pi";
		const args = ["--mode", "rpc"];
		if (options.sessionPath) args.push("--session", options.sessionPath);
		if (options.piArgs) args.push(...options.piArgs);
		const resolved = resolveCommand(piBin, args);
		this.#child = spawn(resolved.command, resolved.args, {
			cwd: options.cwd,
			env: { ...process.env, ...options.env },
			stdio: ["pipe", "pipe", "pipe"],
		});
		this.#child.stdout.setEncoding("utf8");
		this.#child.stderr.setEncoding("utf8");
		this.#child.stdout.on("data", (chunk: string) => this.#handleStdout(chunk));
		this.#child.stderr.on("data", (chunk: string) => {
			for (const line of chunk.split("\n")) {
				if (line.trim().length === 0) continue;
				this.#stderr.push(line);
				if (this.#stderr.length > 100) this.#stderr.shift();
			}
		});
		this.#child.on("error", (error) => {
			this.#rejectPending(new Error(`Pi 启动失败：${error.message}`));
			this.#emit({ kind: "exit", code: null, signal: null, error: error.message });
		});
		this.#child.on("exit", (code, signal) => {
			this.#exit = { code, signal };
			this.#status = "exited";
			this.#busy = false;
			this.#rejectPending(new Error(`Pi 已退出（code=${code ?? "null"}）`));
			const error = this.#stderr.length > 0 ? this.#stderr.slice(-5).join("\n") : undefined;
			this.#emit({ kind: "status", status: "exited" });
			this.#emit({ kind: "exit", code, signal, error });
			this.#onExit?.(this);
		});
	}

	/** 子进程退出码与信号；未退出时为 `undefined`。 */
	get exitInfo(): { code: number | null; signal: NodeJS.Signals | null } | undefined {
		return this.#exit;
	}

	/** 当前运行时状态。 */
	get status(): RuntimeStatus {
		return this.#status;
	}

	/** 是否有正在进行的 agent 运行。 */
	get busy(): boolean {
		return this.#busy;
	}

	/** 最近一次命令或事件的时间戳。 */
	get lastActivityAt(): number {
		return this.#lastActivityAt;
	}

	/** 已初始化的 Pi session id。 */
	get sessionId(): string | undefined {
		return this.#state?.sessionId;
	}

	/** 最近一次 `get_state` 的结果。 */
	get state(): RpcSessionState | undefined {
		return this.#state;
	}

	/**
	 * 启动并读取初始状态。
	 *
	 * @returns 初始会话状态。
	 * @internal
	 */
	async initialize(): Promise<RpcSessionState> {
		if (this.#state) return this.#state;
		const response = await this.command({ type: "get_state" });
		this.#state = response.data;
		this.#status = "ready";
		this.#emit({ kind: "status", status: "ready" });
		return response.data;
	}

	/**
	 * 读取完整快照。
	 *
	 * @returns 状态、消息与用量。
	 * @internal
	 */
	async snapshot(): Promise<SessionSnapshot> {
		const [state, messages, stats] = await Promise.all([
			this.command({ type: "get_state" }),
			this.command({ type: "get_messages" }),
			this.command({ type: "get_session_stats" }),
		]);
		this.#state = state.data;
		return { state: state.data, messages: messages.data.messages, stats: stats.data };
	}

	/**
	 * 发送一条命令并等待对应响应。
	 *
	 * @param command - RPC 命令。
	 * @returns 该命令的成功响应。
	 * @internal
	 */
	async command<C extends RpcCommand["type"]>(command: Extract<RpcCommand, { type: C }>): Promise<ResponseOf<C>> {
		if (this.#status === "exited") throw new Error("Pi 子进程已退出");
		const id = `web-${++this.#sequence}`;
		const record = { ...command, id };
		this.#lastActivityAt = Date.now();
		const promise = new Promise<RpcResponse>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.#pending.delete(id);
				reject(new Error(`命令 ${command.type} 超时`));
			}, this.#commandTimeoutMs);
			this.#pending.set(id, { resolve, reject, timer });
		});
		this.#write(record);
		const response = (await promise) as RpcResponse;
		if (!response.success) {
			throw new Error(`命令 ${command.type} 失败：${response.error}`);
		}
		if (response.command === "get_state") {
			this.#state = response.data;
		}
		return response as ResponseOf<C>;
	}

	/**
	 * 订阅运行时事件。
	 *
	 * @param listener - 事件回调。
	 * @returns 取消订阅的函数。
	 * @internal
	 */
	subscribe(listener: (event: RuntimeEvent) => void): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	/**
	 * 关闭子进程。
	 *
	 * @returns 子进程退出后完成。
	 * @internal
	 */
	async dispose(): Promise<void> {
		if (this.#exit) return;
		const exited = new Promise<void>((resolve) => this.#child.once("exit", () => resolve()));
		this.#child.stdin.end();
		const graceful = await Promise.race([
			exited.then(() => true),
			new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
		]);
		if (graceful) return;
		this.#child.kill("SIGTERM");
		const terminated = await Promise.race([
			exited.then(() => true),
			new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
		]);
		if (!terminated) this.#child.kill("SIGKILL");
		await exited;
	}

	#write(record: Record<string, unknown>): void {
		if (!this.#child.stdin.writable) throw new Error("Pi stdin 不可写");
		this.#child.stdin.write(`${JSON.stringify(record)}\n`);
	}

	#handleStdout(chunk: string): void {
		for (const line of this.#splitter.push(chunk)) this.#handleLine(line);
	}

	#handleLine(line: string): void {
		this.#lastActivityAt = Date.now();
		let record: Record<string, unknown>;
		try {
			record = JSON.parse(line) as Record<string, unknown>;
		} catch {
			this.#emit({ kind: "record", record: { type: "parse_error", line } });
			return;
		}

		if (record.type === "response" && typeof record.id === "string") {
			const pending = this.#pending.get(record.id);
			if (pending) {
				clearTimeout(pending.timer);
				this.#pending.delete(record.id);
				pending.resolve(record as unknown as RpcResponse);
				return;
			}
		}

		if (record.type === "extension_ui_request") {
			this.#handleExtensionUi(record as unknown as RpcExtensionUIRequest);
			return;
		}

		if (record.type === "agent_start") this.#busy = true;
		if (record.type === "agent_settled") this.#busy = false;
		if (record.type === "session_info_changed" && this.#state && typeof record.name === "string") {
			this.#state = { ...this.#state, sessionName: record.name };
		}
		this.#emit({ kind: "record", record });
	}

	#handleExtensionUi(request: RpcExtensionUIRequest): void {
		this.#emit({ kind: "record", record: request as unknown as Record<string, unknown> });
		if (request.method === "notify") return;
		if (!DIALOG_METHODS.has(request.method)) return;
		this.#write({ type: "extension_ui_response", id: request.id, cancelled: true });
	}

	#rejectPending(error: Error): void {
		for (const [id, pending] of this.#pending) {
			clearTimeout(pending.timer);
			this.#pending.delete(id);
			pending.reject(error);
		}
	}

	#emit(event: RuntimeEvent): void {
		for (const listener of this.#listeners) listener(event);
	}
}
