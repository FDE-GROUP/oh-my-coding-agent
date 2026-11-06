#!/usr/bin/env node
/**
 * omfde platform launcher.
 *
 * Resolves the workspace `pi` binary, forwards CLI arguments, and preserves the
 * child's exit code or signal so omfde behaves like a direct Pi invocation.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve from this file rather than cwd so the launcher works from any directory.
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
// Prefer the workspace-linked binary; fall back to PATH for installed packages.
const localBin = join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "pi.cmd" : "pi");
const command = existsSync(localBin) ? localBin : "pi";

const args = process.argv.slice(2);
// pnpm forwards its `--` separator to the script; strip it before handing args to Pi.
if (args[0] === "--") args.shift();

const child = spawn(command, args, {
	stdio: "inherit",
	// Let platform extensions distinguish omfde from a direct Pi launch.
	env: { ...process.env, OMFDE_PLATFORM: "1" },
});

child.on("error", (error) => {
	console.error(`omfde: failed to start pi: ${error.message}`);
	process.exit(1);
});

child.on("exit", (code, signal) => {
	// Preserve Ctrl+C and other termination signals for the parent shell.
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
