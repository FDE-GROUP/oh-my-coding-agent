import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { describe, expect, test } from "vitest";
import type { ExtensionAPI } from "../src/core/extensions/types.ts";
import { buildContextAnatomy } from "../src/modes/rpc/context-anatomy.ts";
import { createHarness } from "./suite/harness.ts";

const anatomyExtension = (pi: ExtensionAPI): void => {
	pi.registerTool({
		name: "echo",
		label: "echo",
		description: "Echo text.",
		parameters: Type.Object({ text: Type.String() }),
		execute: async (_id, { text }) => ({ content: [{ type: "text", text: `echo: ${text}` }], details: {} }),
	});
};

describe("get_context_anatomy", () => {
	test("assembles anatomy from a live session without side effects", async () => {
		const harness = await createHarness({ extensionFactories: [anatomyExtension] });
		await harness.session.bindExtensions({});
		harness.setResponses([
			fauxAssistantMessage([fauxToolCall("echo", { text: "hi" })]),
			fauxAssistantMessage("done"),
		]);
		await harness.session.prompt("run anatomy test");

		const entriesBefore = JSON.stringify(harness.sessionManager.getEntries());
		const messagesBefore = harness.session.messages.length;

		const anatomy = buildContextAnatomy(harness.session);

		// Read-only: transcript entries and messages unchanged, no provider request issued.
		expect(JSON.stringify(harness.sessionManager.getEntries())).toBe(entriesBefore);
		expect(harness.session.messages.length).toBe(messagesBefore);
		expect(harness.faux.getPendingResponseCount()).toBe(0);

		const sectionNames = anatomy.sections.map((section) => section.name);
		expect(sectionNames).toContain("preamble");
		expect(anatomy.tools.map((tool) => tool.name)).toContain("echo");
		expect(anatomy.messages.count).toBeGreaterThan(0);
		expect(anatomy.messages.estTokens).toBeGreaterThan(0);
		expect(anatomy.total.tokens).toBeGreaterThan(0);
		expect(["usage-anchored", "estimated"]).toContain(anatomy.total.basis);
		expect(anatomy.compaction.active).toBe(false);
		for (const section of anatomy.sections) {
			expect(section.estTokens).toBe(Math.ceil(section.chars / 4));
		}

		harness.cleanup();
	});

	test("reports estimated basis on a fresh session without usage", async () => {
		const harness = await createHarness({});
		await harness.session.bindExtensions({});

		const anatomy = buildContextAnatomy(harness.session);

		expect(anatomy.total.basis).toBe("estimated");
		expect(anatomy.messages.count).toBe(0);
		expect(anatomy.compaction.active).toBe(false);

		harness.cleanup();
	});
});
