import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { type RuntimeEvent, SessionRuntime } from "../src/server/runtime.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const piBin = join(repoRoot, "node_modules/.bin/pi");
const extension = fileURLToPath(new URL("./faux-extension.ts", import.meta.url));

function sessionDir(): string {
	return mkdtempSync(join(tmpdir(), "fdecode-anatomy-"));
}

function cwd(): string {
	const dir = mkdtempSync(join(tmpdir(), "fdecode-anatomy-cwd-"));
	writeFileSync(join(dir, "hello.txt"), "hello from test\n");
	return dir;
}

function createRuntime(dir: string): SessionRuntime {
	return new SessionRuntime({
		cwd: cwd(),
		piBin,
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

async function waitForSettle(events: RuntimeEvent[], timeoutMs = 30_000): Promise<void> {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (events.some((event) => event.kind === "record" && event.record.type === "agent_settled")) return;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error("等待运行时事件超时");
}

describe("get_context_anatomy via SessionRuntime", () => {
	let runtime: SessionRuntime | undefined;

	afterEach(async () => {
		await runtime?.dispose();
		runtime = undefined;
	});

	it("returns the context anatomy of a live session", async () => {
		const dir = sessionDir();
		runtime = createRuntime(dir);
		const { events } = collect(runtime);

		const before = await runtime.command({ type: "get_context_anatomy" });
		expect(before.success).toBe(true);
		// 首条 prompt 之前投影为空：还没有 system message。
		expect(before.data.total.basis).toBe("estimated");
		expect(before.data.messages.count).toBe(0);
		expect(before.data.sections).toEqual([]);

		await runtime.command({ type: "prompt", message: "hello" });
		await waitForSettle(events);

		const after = await runtime.command({ type: "get_context_anatomy" });
		expect(after.success).toBe(true);
		const sectionNames = after.data.sections.map((section) => section.name);
		expect(sectionNames).toContain("preamble");
		expect(after.data.messages.count).toBeGreaterThan(0);
		expect(after.data.messages.estTokens).toBeGreaterThan(0);
		expect(after.data.total.tokens).toBeGreaterThan(0);
		expect(["usage-anchored", "estimated"]).toContain(after.data.total.basis);
		expect(Array.isArray(after.data.tools)).toBe(true);
		expect(after.data.tools.map((tool) => tool.name)).toContain("read");
		expect(after.data.compaction.active).toBe(false);
	});
});
