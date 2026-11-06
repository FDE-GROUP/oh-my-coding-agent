import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { createHarness, getMessageText } from "../../../packages/coding-agent/test/suite/harness.ts";

function text(message: unknown): string {
	return getMessageText(message).slice(0, 50);
}

// ---------------------------------------------------------------- context_edit
{
	const root = "/tmp/opencode/pi-validate-edit";
	mkdirSync(root, { recursive: true });
	writeFileSync(join(root, "note.txt"), "x\n");
	const harness = await createHarness();
	harness.setResponses([fauxAssistantMessage("original answer")]);
	await harness.session.prompt("original prompt");

	const entries = harness.sessionManager.getEntries();
	const userEntry = entries.find((entry) => entry.type === "message" && entry.message.role === "user");
	if (!userEntry) throw new Error("no user entry");
	const before = harness.sessionManager.buildSessionProjection().messages;
	const originalText = text(before.find((message) => message.role === "user"));

	harness.sessionManager.appendContextEdit(userEntry.id, { content: "edited prompt" });
	const after = harness.sessionManager.buildSessionProjection().messages;
	const editedText = text(after.find((message) => message.role === "user"));
	const rawEntry = harness.sessionManager.getEntries().find((entry) => entry.id === userEntry.id);

	console.log("=== CONTEXT EDIT ===");
	console.log(`projection before: ${JSON.stringify(originalText)}`);
	console.log(`projection after:  ${JSON.stringify(editedText)}`);
	console.log(
		`stored entry:       ${JSON.stringify(rawEntry?.type === "message" ? text(rawEntry.message) : "?")}`,
	);
	console.log(`entries:            ${harness.sessionManager.getEntries().map((entry) => entry.type).join(", ")}`);
	harness.cleanup();
}

// ------------------------------------------------------------------ compaction
{
	const root = "/tmp/opencode/pi-validate-compact";
	mkdirSync(root, { recursive: true });
	const harness = await createHarness({
		settings: { compaction: { enabled: true, reserveTokens: 1, keepRecentTokens: 1 } },
	});
	harness.setResponses([
		fauxAssistantMessage("first answer"),
		fauxAssistantMessage("second answer"),
		fauxAssistantMessage("## Goal\nSummarized history."),
		fauxAssistantMessage("## Original Request\nSummarized turn prefix."),
	]);
	await harness.session.prompt("first prompt");
	await harness.session.prompt("second prompt");

	await harness.session.compact();

	const compaction = harness.sessionManager.getEntries().find((entry) => entry.type === "compaction");
	const projection = harness.sessionManager.buildSessionProjection();
	console.log("\n=== COMPACTION ===");
	console.log(`entries: ${harness.sessionManager.getEntries().map((entry) => entry.type).join(", ")}`);
	console.log(`firstKeptEntryId: ${compaction?.type === "compaction" ? compaction.firstKeptEntryId : "missing"}`);
	console.log(`summary: ${compaction?.type === "compaction" ? JSON.stringify(compaction.summary.slice(0, 40)) : "-"}`);
	console.log(
		`systemMessage: ${compaction?.type === "compaction" && compaction.systemMessage ? "present" : "missing"}`,
	);
	console.log(`projection roles: ${projection.messages.map((message) => message.role).join(", ")}`);
	console.log(`first message role: ${projection.messages[0]?.role}`);
	console.log(
		`has compactionSummary: ${projection.messages.some((message) => message.role === "compactionSummary")}`,
	);
	console.log(`projection entries: ${projection.entries.map((entry) => entry.sourceEntry.type).join(", ")}`);
	harness.cleanup();
}
