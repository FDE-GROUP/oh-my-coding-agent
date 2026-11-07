import { describe, expect, it } from "vitest";
import { governanceEventFromRecord } from "../src/components/conversation/GovernancePanel.tsx";

describe("governanceEventFromRecord", () => {
	it("maps tool_governance records of all three actions", () => {
		for (const action of ["block", "args-mutated", "result-rewritten"] as const) {
			const event = governanceEventFromRecord({
				type: "tool_governance",
				toolCallId: "call-1",
				parentToolCallId: "parent-1",
				toolName: "write",
				action,
				extensionPath: "/tmp/ext.ts",
				summary: "blocked by test",
			});
			expect(event?.action).toBe(action);
			expect(event?.toolName).toBe("write");
			expect(event?.parentToolCallId).toBe("parent-1");
			expect(event?.extensionPath).toBe("/tmp/ext.ts");
		}
	});

	it("returns null for non-governance and malformed records", () => {
		expect(governanceEventFromRecord({ type: "message_update" })).toBeNull();
		expect(governanceEventFromRecord({ type: "tool_governance", action: "unknown" })).toBeNull();
	});
});
