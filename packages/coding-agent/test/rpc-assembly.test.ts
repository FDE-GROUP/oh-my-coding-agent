import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, test } from "vitest";
import type { ExtensionAPI } from "../src/core/extensions/types.ts";
import { buildAssembly } from "../src/modes/rpc/assembly.ts";
import { createHarness } from "./suite/harness.ts";

const assemblyExtension = (pi: ExtensionAPI): void => {
	pi.registerTool({
		name: "echo",
		label: "echo",
		description: "Echo text.",
		parameters: Type.Object({ text: Type.String() }),
		execute: async (_id, { text }) => ({ content: [{ type: "text", text: `echo: ${text}` }], details: {} }),
	});
	pi.registerCommand("hello", {
		description: "Say hello",
		handler: async (_args, ctx) => {
			ctx.ui.notify("hello", "info");
		},
	});
	pi.on("tool_call", () => undefined);
};

describe("get_assembly", () => {
	test("lists extensions with registrations and settings layers without side effects", async () => {
		const harness = await createHarness({ extensionFactories: [assemblyExtension] });
		await harness.session.bindExtensions({});
		harness.setResponses([fauxAssistantMessage("done")]);
		await harness.session.prompt("assembly test");

		const entriesBefore = JSON.stringify(harness.sessionManager.getEntries());

		const assembly = buildAssembly(harness.session);

		expect(JSON.stringify(harness.sessionManager.getEntries())).toBe(entriesBefore);

		const extension = assembly.extensions.find((item) => item.tools.includes("echo"));
		expect(extension).toBeDefined();
		expect(extension?.commands).toContain("hello");
		expect(extension?.hooks).toContain("tool_call");
		expect(extension?.source).toBeTruthy();

		expect(Array.isArray(assembly.extensionErrors)).toBe(true);
		expect(Array.isArray(assembly.mcp.servers)).toBe(true);
		expect(Array.isArray(assembly.mcp.errors)).toBe(true);
		for (const server of assembly.mcp.servers) {
			expect(server.state).toBeNull();
			expect(["global", "project", "extension"]).toContain(server.scope);
		}

		expect(typeof assembly.settings.effective).toBe("object");
		expect(typeof assembly.settings.global).toBe("object");
		expect(typeof assembly.settings.project).toBe("object");
		expect(assembly.settings.sources.globalPath).toContain("settings.json");
		expect(assembly.settings.sources.projectPath).toContain(".pi");

		harness.cleanup();
	});
});
