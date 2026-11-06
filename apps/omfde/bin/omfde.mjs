#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const localBin = join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "pi.cmd" : "pi");
const command = existsSync(localBin) ? localBin : "pi";

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();

const child = spawn(command, args, {
	stdio: "inherit",
	env: { ...process.env, OMFDE_PLATFORM: "1" },
});

child.on("error", (error) => {
	console.error(`omfde: failed to start pi: ${error.message}`);
	process.exit(1);
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
