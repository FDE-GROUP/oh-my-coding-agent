import { existsSync } from "node:fs";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, test } from "vitest";
import type { ExtensionAPI } from "../src/core/extensions/types.ts";
import { createHarness, getMessageText } from "./suite/harness.ts";

const governanceExtension = (pi: ExtensionAPI): void => {
	pi.on("tool_call", (event) => {
		if (event.toolName !== "write") return undefined;
		const path = String((event.input as { path?: unknown }).path);
		if (path.startsWith("blocked")) return { block: true, reason: "blocked by governance test" };
		if (path.startsWith("argmut")) (event.input as { content?: string }).content = "mutated by hook";
		return undefined;
	});
	pi.on("tool_result", (event) => {
		if (event.toolName === "write" && String((event.input as { path?: unknown }).path).startsWith("resrewrite")) {
			return { content: [{ type: "text", text: "rewritten by governance test" }] };
		}
		return undefined;
	});
};

describe("tool_governance events", () => {
	test("block, args mutation, and result rewrite each leave a governance trace", async () => {
		const harness = await createHarness({ extensionFactories: [governanceExtension] });
		await harness.session.bindExtensions({});
		harness.setResponses([
			fauxAssistantMessage([fauxToolCall("write", { path: "blocked.txt", content: "no" })]),
			fauxAssistantMessage([fauxToolCall("write", { path: "argmut.txt", content: "original" })]),
			fauxAssistantMessage([fauxToolCall("write", { path: "resrewrite.txt", content: "original" })]),
			fauxAssistantMessage("done"),
		]);
		await harness.session.prompt("governance test");

		const events = harness.eventsOfType("tool_governance");
		const actions = events.map((event) => event.action);
		expect(actions).toContain("block");
		expect(actions).toContain("args-mutated");
		expect(actions).toContain("result-rewritten");

		for (const event of events) {
			expect(event.extensionPath).toBeTruthy();
			expect(event.summary.length).toBeLessThanOrEqual(201);
			expect(event.toolName).toBe("write");
		}

		const block = events.find((event) => event.action === "block");
		expect(block?.summary).toContain("blocked by governance test");
		const mutated = events.find((event) => event.action === "args-mutated");
		expect(mutated?.summary).toContain("content");

		// 原结果摘要保留在 toolResult details.governance;文件未被 block 写入。
		const rewritten = harness.session.messages.find(
			(message) => message.role === "toolResult" && getMessageText(message).includes("rewritten by governance test"),
		);
		expect(rewritten).toBeDefined();
		const details = (rewritten as { details?: { governance?: { original?: string } } }).details;
		expect(details?.governance?.original).toBeTruthy();

		expect(existsSync(`${harness.tempDir}/blocked.txt`)).toBe(false);
		expect(existsSync(`${harness.tempDir}/argmut.txt`)).toBe(true);

		harness.cleanup();
	});

	test("clean passes emit no governance events and the event surface is otherwise unchanged", async () => {
		const harness = await createHarness({});
		await harness.session.bindExtensions({});
		harness.setResponses([fauxAssistantMessage("done")]);
		await harness.session.prompt("clean run");

		expect(harness.eventsOfType("tool_governance")).toHaveLength(0);
		expect(harness.eventsOfType("agent_settled")).toHaveLength(1);

		harness.cleanup();
	});
});
