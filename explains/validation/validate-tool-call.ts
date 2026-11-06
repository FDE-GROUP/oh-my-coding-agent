import { existsSync } from "node:fs";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { ExtensionAPI } from "../../../packages/coding-agent/src/core/extensions/types.ts";
import { createHarness, getMessageText } from "../../../packages/coding-agent/test/suite/harness.ts";

const calls: string[] = [];
const results: string[] = [];

const validationExtension = (pi: ExtensionAPI): void => {
	pi.registerTool({
		name: "echo",
		label: "echo",
		description: "Echo text.",
		parameters: Type.Object({ text: Type.String() }),
		execute: async (_id, { text }) => ({ content: [{ type: "text", text: `echo: ${text}` }], details: {} }),
	});
	pi.registerTool({
		name: "run_tools",
		label: "run_tools",
		description: "Calls echo through ctx.executeTool().",
		parameters: Type.Object({}),
		exposure: "model-only",
		execute: async (_id, _params, _signal, _onUpdate, ctx) => {
			const outcome = await ctx.executeTool("echo", { text: "nested" });
			const text = (outcome.result.content[0] as { text: string }).text;
			return { content: [{ type: "text", text: `run_tools -> ${text}` }], details: {} };
		},
	});
	pi.on("tool_call", (event) => {
		calls.push(`${event.toolName} parent=${event.parentToolCallId ?? "top"}`);
		if (event.toolName === "write" && String((event.input as { path?: unknown }).path).includes("blocked")) {
			return { block: true, reason: "blocked by validation extension" };
		}
		return undefined;
	});
	pi.on("tool_result", (event) => {
		results.push(`${event.toolName} parent=${event.parentToolCallId ?? "top"} isError=${event.isError}`);
		if (event.toolName === "write" && String((event.input as { path?: unknown }).path).includes("allowed")) {
			return { content: [{ type: "text", text: "rewritten by tool_result hook" }] };
		}
		return undefined;
	});
};

const harness = await createHarness({ extensionFactories: [validationExtension] });
await harness.session.bindExtensions({});

harness.setResponses([
	fauxAssistantMessage([fauxToolCall("write", { path: "blocked.txt", content: "should not exist" })]),
	fauxAssistantMessage([fauxToolCall("write", { path: "allowed.txt", content: "written" })]),
	fauxAssistantMessage([fauxToolCall("run_tools", {})]),
	fauxAssistantMessage("done"),
]);

await harness.session.prompt("run the validation");

console.log("=== tool_call HANDLER ===");
for (const call of calls) console.log(call);

console.log("\n=== tool_result HANDLER ===");
for (const result of results) console.log(result);

console.log("\n=== FILES ===");
console.log(`blocked.txt exists: ${existsSync(join(harness.tempDir, "blocked.txt"))}`);
console.log(`allowed.txt exists: ${existsSync(join(harness.tempDir, "allowed.txt"))}`);

console.log("\n=== TRANSCRIPT TOOL RESULTS ===");
for (const message of harness.session.messages) {
	if (message.role !== "toolResult") continue;
	console.log(
		`${message.toolName} isError=${message.isError} text=${JSON.stringify(getMessageText(message).slice(0, 60))}`,
	);
}

console.log("\n=== FINAL ASSISTANT ===");
console.log(getMessageText(harness.session.messages.at(-1)));

harness.cleanup();
