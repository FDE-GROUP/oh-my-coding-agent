export interface UserConfig {
	id: string;
	name: string;
	role: "admin" | "member";
	tokenHash: string;
}

export interface WorkspaceConfig {
	id: string;
	name: string;
	path: string;
}

export interface AppConfig {
	host: string;
	port: number;
	publicOrigins: string[];
	auth: {
		secret: string;
		users: UserConfig[];
	};
	workspaces: WorkspaceConfig[];
	limits: {
		maxRuntimesPerUser: number;
		maxRuntimesTotal: number;
	};
	github: {
		token: string;
		repos: Array<{ id: string; owner: string; name: string; branch?: string }>;
	};
	retention: {
		sessionsDays: number;
		auditDays: number;
		sharesDays: number;
	};
}

export interface LoadedConfig {
	path: string;
	config: AppConfig;
	errors: string[];
}

export const DEFAULT_CONFIG_PATH: string;
export function resolveConfigPath(): string;
export function hashToken(token: string): string;
export function validateConfig(config: AppConfig): string[];
export function loadConfig(): LoadedConfig;
