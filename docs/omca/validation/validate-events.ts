import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { SessionManager } from "../../../packages/coding-agent/src/core/session-manager.ts";
import { createHarness, getMessageText } from "../../../packages/coding-agent/test/suite/harness.ts";

const root = "/tmp/opencode/pi-validate";
const workspace = join(root, "workspace");
mkdirSync(workspace, { recursive: true });
writeFileSync(join(workspace, "hello.txt"), "hello from validation\n");

const sessionManager = SessionManager.create(workspace, join(root, "sessions"));
const harness = await createHarness({ sessionManager });

// The model reads a file, then answers.
harness.setResponses([
	fauxAssistantMessage([fauxToolCall("read", { path: join(workspace, "hello.txt") })]),
	fauxAssistantMessage("The file says: hello from validation."),
]);

await harness.session.prompt("Read hello.txt and report its content.");

console.log("=== EVENT STREAM ===");
for (const [index, event] of harness.events.entries()) {
	const parts = [`#${String(index).padStart(2, "0")}`, event.type];
	if ("message" in event && event.message) {
		parts.push(`role=${event.message.role}`);
		if (event.message.role === "assistant") {
			for (const block of event.message.content) {
				parts.push(block.type === "toolCall" ? `call=${block.name}` : block.type);
			}
		} else {
			parts.push(`text=${JSON.stringify(getMessageText(event.message).slice(0, 40))}`);
		}
	}
	if ("toolName" in event) parts.push(`tool=${event.toolName}`);
	if ("isError" in event) parts.push(`isError=${event.isError}`);
	if (event.type === "entry_appended") parts.push(`entry=${event.entry.type}`);
	console.log(parts.join("  "));
}

console.log("\n=== AGENT STATE MESSAGES ===");
for (const [index, message] of harness.session.messages.entries()) {
	console.log(`${index} ${message.role}: ${JSON.stringify(getMessageText(message).slice(0, 60))}`);
}

const sessionFile = sessionManager.getSessionFile();
if (!sessionFile) throw new Error("no session file");
const lines = readFileSync(sessionFile, "utf8").trim().split("\n");
console.log(`\n=== SESSION JSONL (${lines.length} lines) ===`);
for (const line of lines) {
	const entry = JSON.parse(line);
	const detail =
		entry.type === "message" ? ` ${entry.message.role}: ${JSON.stringify(getMessageText(entry.message).slice(0, 40))}` : "";
	console.log(`${entry.type}${detail}`);
}

const projection = sessionManager.buildSessionProjection();
console.log("\n=== PROJECTION ENTRIES ===");
for (const entry of projection.entries) {
	const roles = entry.messages.map((message) => message.role).join(",") || "-";
	console.log(`${entry.sourceEntry.type} -> [${roles}]`);
}
console.log("\n=== PROJECTION MESSAGES ===");
for (const [index, message] of projection.messages.entries()) {
	console.log(`${index} ${message.role}: ${JSON.stringify(getMessageText(message).slice(0, 60))}`);
}

const state = harness.session.messages;
const sameLength = projection.messages.length === state.length;
const sameRoles = projection.messages.every((message, index) => message.role === state[index]?.role);
const sameText = projection.messages.every(
	(message, index) => getMessageText(message) === getMessageText(state[index]),
);
console.log(`\nprojection == agent.state.messages: length=${sameLength} roles=${sameRoles} text=${sameText}`);

harness.cleanup();
