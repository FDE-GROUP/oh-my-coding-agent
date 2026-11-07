/**
 * Assembly info for the `get_assembly` RPC command.
 *
 * Assembles what is loaded into the session and where it came from: extensions with
 * their registrations, MCP servers from config files and extension registration, and
 * the three settings layers. Pure reads: calling it never mutates the session and
 * never issues a provider request.
 */
import { join } from "node:path";
import { getAgentDir } from "../../config.ts";
import type { AgentSession } from "../../core/agent-session.ts";
import { loadMcpConfig } from "../../extensions/mcp/config.ts";

/** One loaded extension with everything it registered. */
export interface AssemblyExtension {
	path: string;
	/** Human-readable origin of the extension (settings, package, directory, …). */
	source: string;
	tools: string[];
	commands: string[];
	/** Names of extension events this extension handles. */
	hooks: string[];
}

/** One MCP server known to the session. */
export interface AssemblyMcpServer {
	name: string;
	/** Config file that defined it, or the registering extension's path. */
	source: string;
	scope: "global" | "project" | "extension";
	exposure?: string;
	enabled?: boolean;
	/**
	 * Always null in v1: connection state lives inside the MCP extension and is not
	 * exposed yet. Surfacing it requires an extension-side convention (see the
	 * agent-visibility plan, D2).
	 */
	state: null;
}

/** The three settings layers plus their conventional file locations. */
export interface AssemblySettings {
	effective: Record<string, unknown>;
	global: Record<string, unknown>;
	project: Record<string, unknown>;
	sources: { globalPath: string; projectPath: string };
}

/** What is assembled into the session, and where each piece came from. */
export interface AssemblyInfo {
	extensions: AssemblyExtension[];
	/** Extensions that failed to load, with the error. */
	extensionErrors: Array<{ path: string; error: string }>;
	mcp: {
		servers: AssemblyMcpServer[];
		/** Config parse/validation errors from mcp.json files. */
		errors: string[];
	};
	settings: AssemblySettings;
}

/**
 * Build the assembly info of the session. Read-only.
 *
 * @remarks
 * Connection state of MCP servers is not included (always `state: null`): the MCP
 * extension owns it internally. The extension list comes from the resource loader's
 * last load; registration maps are read live from the loaded extension objects.
 */
export function buildAssembly(session: AgentSession): AssemblyInfo {
	const loaded = session.resourceLoader.getExtensions();

	const extensions: AssemblyExtension[] = loaded.extensions.map((extension) => ({
		path: extension.path,
		source: extension.sourceInfo.source,
		tools: [...extension.tools.keys()],
		commands: [...extension.commands.keys()],
		hooks: [...extension.handlers.keys()],
	}));

	const sessionManager = session.sessionManager;
	const settingsManager = session.settingsManager;
	const cwd = sessionManager.getCwd();
	const mcpConfig = loadMcpConfig({
		agentDir: getAgentDir(),
		cwd,
		projectTrusted: settingsManager.isProjectTrusted(),
	});

	const servers: AssemblyMcpServer[] = mcpConfig.servers.map((entry) => ({
		name: entry.name,
		source: entry.source,
		scope: entry.scope ?? (entry.source === "extension" ? "extension" : "global"),
		...(entry.config.exposure !== undefined ? { exposure: entry.config.exposure } : {}),
		...("enabled" in entry.config && entry.config.enabled !== undefined ? { enabled: entry.config.enabled } : {}),
		state: null,
	}));

	return {
		extensions,
		extensionErrors: loaded.errors.map((error) => ({ path: error.path, error: error.error })),
		mcp: { servers, errors: mcpConfig.errors },
		settings: {
			effective: settingsManager.getSettings() as Record<string, unknown>,
			global: settingsManager.getGlobalSettings() as Record<string, unknown>,
			project: settingsManager.getProjectSettings() as Record<string, unknown>,
			sources: {
				globalPath: join(getAgentDir(), "settings.json"),
				projectPath: join(cwd, ".pi", "settings.json"),
			},
		},
	};
}
