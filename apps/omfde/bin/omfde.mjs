#!/usr/bin/env node
/**
 * omfde platform launcher.
 *
 * Defaults to the Pi Web UI. `--tui` falls back to a direct Pi TUI launch with
 * OMFDE_PLATFORM=1. The launcher only orchestrates processes; it does not import
 * Pi or the Web UI server.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const piBin = join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "pi.cmd" : "pi");
const webEntry = join(repoRoot, "apps", "pi-web", "server.mjs");
const webDist = join(repoRoot, "apps", "pi-web", "dist", "server", "server.js");

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();

let tui = false;
let open = true;
let host;
let port;
let configPath;
const tuiArgs = [];

function usage() {
	console.log(`Usage: omfde [options] [--tui] [pi args...]

Options:
  --tui            Start the Pi TUI instead of the Web UI
  --port <n>       Web UI port
  --host <h>       Web UI host
  --config <path>  PI_WEB_CONFIG path
  --no-open        Do not open the browser
  -h, --help       Show this help`);
}

for (let index = 0; index < args.length; index++) {
	const arg = args[index];
	if (arg === "--tui") {
		tui = true;
	} else if (arg === "--no-open") {
		open = false;
	} else if (arg === "--open") {
		open = true;
	} else if (arg === "--port" && index + 1 < args.length) {
		port = args[++index];
	} else if (arg === "--host" && index + 1 < args.length) {
		host = args[++index];
	} else if (arg === "--config" && index + 1 < args.length) {
		configPath = args[++index];
	} else if (arg === "--help" || arg === "-h") {
		usage();
		process.exit(0);
	} else if (tui) {
		tuiArgs.push(arg);
	} else {
		console.error(`omfde: unknown option in Web UI mode: ${arg}`);
		console.error("omfde: use --tui to pass Pi arguments.");
		process.exit(1);
	}
}

function exitWithChild(child) {
	child.on("error", (error) => {
		console.error(`omfde: failed to start: ${error.message}`);
		process.exit(1);
	});
	child.on("exit", (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 0);
	});
	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.on(signal, () => {
			if (!child.killed) child.kill(signal);
		});
	}
}

function readJson(path) {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
}

function resolveEndpoint() {
	const configFile = configPath ?? process.env.PI_WEB_CONFIG ?? join(homedir(), ".pi-web", "config.json");
	const config = readJson(configFile) ?? {};
	const resolvedHost = host ?? process.env.PI_WEB_HOST ?? config.host ?? "127.0.0.1";
	const resolvedPort = port ?? process.env.PI_WEB_PORT ?? process.env.PORT ?? config.port ?? 3210;
	const displayHost = resolvedHost === "0.0.0.0" || resolvedHost === "::" ? "127.0.0.1" : resolvedHost;
	return { host: resolvedHost, port: resolvedPort, url: `http://${displayHost}:${resolvedPort}` };
}

function openBrowser(url) {
	const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
	const commandArgs = process.platform === "win32" ? ["/c", "start", "", url] : [url];
	try {
		const child = spawn(command, commandArgs, { detached: true, stdio: "ignore" });
		child.on("error", () => undefined);
		child.unref();
	} catch {
		// The printed URL is enough when no browser opener exists.
	}
}

if (tui) {
	const command = existsSync(piBin) ? piBin : "pi";
	const child = spawn(command, tuiArgs, {
		stdio: "inherit",
		env: { ...process.env, OMFDE_PLATFORM: "1" },
	});
	exitWithChild(child);
} else {
	if (!existsSync(webDist)) {
		console.error("omfde: Web UI 尚未构建。");
		console.error("omfde: 先运行 pnpm --filter @omfde/pi-web build，或使用 omfde --tui。");
		process.exit(1);
	}
	const endpoint = resolveEndpoint();
	const env = {
		...process.env,
		OMFDE_PLATFORM: "1",
		PI_WEB_CWD: process.env.PI_WEB_CWD ?? process.cwd(),
	};
	if (host) env.PI_WEB_HOST = host;
	if (port) env.PI_WEB_PORT = String(port);
	if (configPath) env.PI_WEB_CONFIG = configPath;

	const child = spawn(process.execPath, [webEntry], { stdio: "inherit", env });
	exitWithChild(child);
	console.log(`omfde: Web UI ${endpoint.url}`);
	if (open) {
		setTimeout(() => openBrowser(endpoint.url), 800).unref();
	}
}
