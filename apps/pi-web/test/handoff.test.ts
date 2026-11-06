import { describe, expect, it } from "vitest";
import { generateHandoff } from "../src/server/handoff.ts";
import type { SessionSnapshot } from "../src/server/runtime.ts";

function snapshot(messages: unknown[]): SessionSnapshot {
	return {
		state: {
			sessionId: "session-1",
			thinkingLevel: "off",
			isStreaming: false,
			isCompacting: false,
			steeringMode: "all",
			followUpMode: "all",
			autoCompactionEnabled: true,
			messageCount: messages.length,
			pendingMessageCount: 0,
			model: { provider: "faux", id: "faux-1" },
		},
		messages,
		stats: {},
	} as unknown as SessionSnapshot;
}

describe("handoff", () => {
	it("extracts goals, tools, files, risks, and redacts secrets", () => {
		const secret = `sk-${"a".repeat(24)}`;
		const markdown = generateHandoff(
			snapshot([
				{ role: "user", content: "修复导入循环\n并补充测试" },
				{
					role: "assistant",
					content: [{ type: "toolCall", id: "call-1", name: "write", arguments: { path: "src/import.ts" } }],
				},
				{ role: "toolResult", toolCallId: "call-1", toolName: "write", content: [], isError: false },
				{
					role: "assistant",
					content: [
						{
							type: "text",
							text: `已修复导入。\n\n## 风险和下一步\n- 需要补充回归测试\n- TODO 运行检查\n${secret}`,
						},
					],
				},
			]),
			{ sessionId: "session-1", workspace: "/work", owner: "alice" },
		);

		expect(markdown).toContain("修复导入循环");
		expect(markdown).toContain("write：src/import.ts");
		expect(markdown).toContain("src/import.ts");
		expect(markdown).toContain("需要补充回归测试");
		expect(markdown).toContain("TODO 运行检查");
		expect(markdown).not.toContain(secret);
		expect(markdown).toContain("[已隐藏]");
	});
});
