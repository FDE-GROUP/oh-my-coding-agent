import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { SessionRuntime } from "../src/server/runtime.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const piBin = join(repoRoot, "node_modules/.bin/pi");
const extension = fileURLToPath(new URL("./faux-extension.ts", import.meta.url));

function sessionDir(): string {
	return mkdtempSync(join(tmpdir(), "fdecode-assembly-"));
}

function cwd(): string {
	const dir = mkdtempSync(join(tmpdir(), "fdecode-assembly-cwd-"));
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

describe("get_assembly via SessionRuntime", () => {
	let runtime: SessionRuntime | undefined;

	afterEach(async () => {
		await runtime?.dispose();
		runtime = undefined;
	});

	it("lists the loaded extension with its command registration", async () => {
		const dir = sessionDir();
		runtime = createRuntime(dir);

		const response = await runtime.command({ type: "get_assembly" });
		expect(response.success).toBe(true);

		const faux = response.data.extensions.find((item) => item.path.includes("faux-extension"));
		expect(faux).toBeDefined();
		expect(faux?.commands).toContain("uispike");

		expect(Array.isArray(response.data.mcp.servers)).toBe(true);
		expect(response.data.settings.sources.globalPath).toContain("settings.json");
		expect(typeof response.data.settings.effective).toBe("object");
	});
});
