import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { type RuntimeEvent, SessionRuntime } from "../src/server/runtime.ts";
import { RuntimeManager } from "../src/server/runtime-manager.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const piBin = join(repoRoot, "node_modules/.bin/pi");
const extension = fileURLToPath(new URL("./faux-extension.ts", import.meta.url));

function sessionDir(): string {
	return mkdtempSync(join(tmpdir(), "fdecode-sessions-"));
}

function cwd(): string {
	const dir = mkdtempSync(join(tmpdir(), "fdecode-cwd-"));
	writeFileSync(join(dir, "hello.txt"), "hello from test\n");
	return dir;
}

function createRuntime(dir: string, sessionPath?: string): SessionRuntime {
	return new SessionRuntime({
		cwd: cwd(),
		piBin,
		sessionPath,
		piArgs: [
			"--no-extensions",
			"-e",
			extension,
			"--session-dir",
			dir,
			"--provider",
			"fauxspike",
			"--model",
			"faux-1",
		],
	});
}

function collect(runtime: SessionRuntime): { events: RuntimeEvent[]; stop: () => void } {
	const events: RuntimeEvent[] = [];
	const stop = runtime.subscribe((event) => events.push(event));
	return { events, stop };
}

async function waitFor(
	events: RuntimeEvent[],
	predicate: (event: RuntimeEvent) => boolean,
	timeoutMs = 30_000,
	since = 0,
): Promise<RuntimeEvent> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		const found = [...events.slice(since)].reverse().find(predicate);
		if (found) return found;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error("等待运行时事件超时");
}

function messageText(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const content = (message as { content?: unknown }).content;
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((block) => (block && typeof block === "object" && (block as { type?: string }).type === "text" ? (block as { text?: string }).text ?? "" : ""))
		.join("");
}

async function promptAndSettle(runtime: SessionRuntime, events: RuntimeEvent[], text: string): Promise<void> {
	const mark = events.length;
	await runtime.command({ type: "prompt", message: text });
	await waitFor(events, (event) => event.kind === "record" && event.record.type === "agent_settled", 60_000, mark);
}

describe("SessionRuntime", () => {
	let runtime: SessionRuntime | undefined;

	afterEach(async () => {
		await runtime?.dispose();
		runtime = undefined;
	});

	it("initializes, streams a turn, cancels extension dialogs, and resumes", async () => {
		const dir = sessionDir();
		runtime = createRuntime(dir);
		const { events } = collect(runtime);

		const state = await runtime.initialize();
		expect(state.sessionId).toBeTruthy();
		expect(runtime.status).toBe("ready");

		await runtime.command({ type: "prompt", message: "hello" });
		await waitFor(
			events,
			(event) => event.kind === "record" && event.record.type === "agent_settled",
		);

		const snapshot = await runtime.snapshot();
		expect(snapshot.messages.some((message) => message.role === "assistant")).toBe(true);
		expect(snapshot.messages.some((message) => message.role === "toolResult")).toBe(true);
		expect(snapshot.stats.totalMessages).toBeGreaterThan(0);

		const toolStart = events.find(
			(event) => event.kind === "record" && event.record.type === "tool_execution_start",
		);
		const toolEnd = events.find(
			(event) => event.kind === "record" && event.record.type === "tool_execution_end",
		);
		expect(toolStart).toBeTruthy();
		expect(toolEnd).toBeTruthy();

		await runtime.command({ type: "prompt", message: "/uispike" });
		const dialog = await waitFor(
			events,
			(event) =>
				event.kind === "record" &&
				event.record.type === "extension_ui_request" &&
				event.record.method === "confirm",
		);
		expect(dialog).toBeTruthy();

		const sessionFile = snapshot.state.sessionFile;
		expect(sessionFile).toBeTruthy();
		await runtime.dispose();

		runtime = createRuntime(dir, sessionFile);
		const resumed = await runtime.initialize();
		expect(resumed.sessionId).toBe(state.sessionId);
		expect(resumed.messageCount).toBeGreaterThan(0);
	});

	it("sweeps idle runtimes", async () => {
		const manager = new RuntimeManager({
			idleMs: 0,
			sweepMs: 3_600_000,
			runtimeOptions: {
				cwd: cwd(),
				piBin,
				piArgs: [
					"--no-extensions",
					"-e",
					extension,
					"--session-dir",
					sessionDir(),
					"--provider",
					"fauxspike",
					"--model",
					"faux-1",
				],
			},
		});
		try {
			const created = await manager.create();
			expect(manager.size).toBe(1);
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(await manager.sweep()).toBe(1);
			expect(manager.size).toBe(0);
			expect(created.status).toBe("exited");
		} finally {
			await manager.closeAll();
		}
	});

	it("forks and clones the active branch", async () => {
		const dir = sessionDir();
		runtime = createRuntime(dir);
		const { events } = collect(runtime);
		const initial = await runtime.initialize();

		await promptAndSettle(runtime, events, "one");
		await promptAndSettle(runtime, events, "two");

		const forkMessages = await runtime.command({ type: "get_fork_messages" });
		const last = forkMessages.data.messages.at(-1);
		expect(last).toBeTruthy();
		const fork = await runtime.command({ type: "fork", entryId: last?.entryId ?? "" });
		expect(fork.data.cancelled).toBe(false);

		const forkedState = await runtime.command({ type: "get_state" });
		expect(forkedState.data.sessionId).not.toBe(initial.sessionId);
		expect(runtime.state?.sessionId).toBe(forkedState.data.sessionId);

		const forked = await runtime.snapshot();
		const users = forked.messages.filter((message) => message.role === "user").map(messageText);
		expect(users).toContain("one");
		expect(users).not.toContain("two");

		const beforeClone = forked.state.sessionId;
		const clone = await runtime.command({ type: "clone" });
		expect(clone.data.cancelled).toBe(false);
		const clonedState = await runtime.command({ type: "get_state" });
		expect(clonedState.data.sessionId).not.toBe(beforeClone);
	});

	it("rekeys and lists runtimes", async () => {
		const manager = new RuntimeManager({
			sweepMs: 3_600_000,
			runtimeOptions: {
				cwd: cwd(),
				piBin,
				piArgs: [
					"--no-extensions",
					"-e",
					extension,
					"--session-dir",
					sessionDir(),
					"--provider",
					"fauxspike",
					"--model",
					"faux-1",
				],
			},
		});
		try {
			const created = await manager.create();
			const id = created.sessionId;
			expect(id).toBeTruthy();
			manager.rekey(id ?? "", "rekeyed");
			expect(manager.get(id ?? "")).toBeUndefined();
			expect(manager.get("rekeyed")).toBe(created);
			expect(manager.list().map((entry) => entry.id)).toContain("rekeyed");
		} finally {
			await manager.closeAll();
		}
	});
});
