import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export const DEFAULT_CONFIG_PATH = join(homedir(), ".pi-web", "config.json");

export function resolveConfigPath() {
	return process.env.PI_WEB_CONFIG?.trim() || DEFAULT_CONFIG_PATH;
}

export function hashToken(token) {
	return createHash("sha256").update(token).digest("hex");
}

function defaultConfig() {
	const cwd = process.env.PI_WEB_CWD?.trim() || process.env.INIT_CWD?.trim() || process.cwd();
	return {
		host: "127.0.0.1",
		port: 3210,
		publicOrigins: [],
		auth: { secret: "", users: [] },
		workspaces: [{ id: "default", name: basename(cwd), path: cwd }],
		limits: { maxRuntimesPerUser: 2, maxRuntimesTotal: 8 },
		github: { token: "", repos: [] },
		retention: { sessionsDays: 0, auditDays: 0, sharesDays: 0 },
	};
}

function normalize(config) {
	const defaults = defaultConfig();
	return {
		host: typeof config.host === "string" ? config.host : defaults.host,
		port: Number.isInteger(config.port) ? config.port : defaults.port,
		publicOrigins: Array.isArray(config.publicOrigins)
			? config.publicOrigins.filter((item) => typeof item === "string")
			: [],
		auth: {
			secret: typeof config.auth?.secret === "string" ? config.auth.secret : "",
			users: Array.isArray(config.auth?.users)
				? config.auth.users
						.filter((user) => user && typeof user.id === "string" && typeof user.tokenHash === "string")
						.map((user) => ({
							id: user.id,
							name: typeof user.name === "string" ? user.name : user.id,
							role: user.role === "admin" ? "admin" : "member",
							tokenHash: user.tokenHash,
						}))
				: [],
		},
		workspaces:
			Array.isArray(config.workspaces) && config.workspaces.length > 0
				? config.workspaces
						.filter(
							(workspace) => workspace && typeof workspace.id === "string" && typeof workspace.path === "string",
						)
						.map((workspace) => ({
							id: workspace.id,
							name: typeof workspace.name === "string" ? workspace.name : workspace.id,
							path: resolve(workspace.path),
						}))
				: defaults.workspaces,
		github: {
			token: typeof config.github?.token === "string" ? config.github.token : "",
			repos: Array.isArray(config.github?.repos)
				? config.github.repos
						.filter(
							(repo) =>
								repo &&
								typeof repo.id === "string" &&
								typeof repo.owner === "string" &&
								typeof repo.name === "string",
						)
						.map((repo) => ({
							id: repo.id,
							owner: repo.owner,
							name: repo.name,
							branch: typeof repo.branch === "string" ? repo.branch : undefined,
						}))
				: [],
		},
		retention: {
			sessionsDays: Number.isInteger(config.retention?.sessionsDays) ? config.retention.sessionsDays : 0,
			auditDays: Number.isInteger(config.retention?.auditDays) ? config.retention.auditDays : 0,
			sharesDays: Number.isInteger(config.retention?.sharesDays) ? config.retention.sharesDays : 0,
		},
		limits: {
			maxRuntimesPerUser: Number.isInteger(config.limits?.maxRuntimesPerUser)
				? config.limits.maxRuntimesPerUser
				: defaults.limits.maxRuntimesPerUser,
			maxRuntimesTotal: Number.isInteger(config.limits?.maxRuntimesTotal)
				? config.limits.maxRuntimesTotal
				: defaults.limits.maxRuntimesTotal,
		},
	};
}

function writeConfig(path, config) {
	mkdirSync(dirname(path), { recursive: true });
	const temp = `${path}.tmp`;
	writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`);
	chmodSync(temp, 0o600);
	renameSync(temp, path);
}

export function validateConfig(config) {
	const errors = [];
	if (!Number.isInteger(config.port) || config.port <= 0 || config.port > 65535) {
		errors.push(`port 不合法：${config.port}`);
	}
	for (const workspace of config.workspaces) {
		if (!existsSync(workspace.path)) {
			errors.push(`工作区不存在：${workspace.id} → ${workspace.path}`);
			continue;
		}
		if (!statSync(workspace.path).isDirectory()) {
			errors.push(`工作区不是目录：${workspace.id} → ${workspace.path}`);
		}
	}
	if (new Set(config.workspaces.map((workspace) => workspace.id)).size !== config.workspaces.length) {
		errors.push("工作区 id 重复");
	}
	return errors;
}

export function loadConfig() {
	const path = resolveConfigPath();
	let raw;
	let config;
	if (existsSync(path)) {
		try {
			raw = JSON.parse(readFileSync(path, "utf8"));
			config = normalize(raw);
		} catch (error) {
			return { path, config: defaultConfig(), errors: [`配置文件无法解析：${String(error)}`] };
		}
	} else {
		config = defaultConfig();
		raw = config;
	}

	if (config.auth.users.length > 0 && !config.auth.secret) {
		config.auth.secret = randomBytes(32).toString("base64url");
		writeConfig(path, { ...raw, ...config });
	}

	return { path, config, errors: validateConfig(config) };
}
