import { describe, expect, it } from "vitest";
import {
	type ConversationMessage,
	conversationReducer,
	initialConversationState,
} from "../src/lib/conversation.ts";

function userMessage(text: string): ConversationMessage {
	return { role: "user", content: text, timestamp: 1 } as ConversationMessage;
}

function assistantMessage(text: string): ConversationMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "faux",
		provider: "faux",
		model: "faux-1",
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
		stopReason: "stop",
		timestamp: 2,
	} as ConversationMessage;
}

describe("conversationReducer", () => {
	it("applies snapshots", () => {
		const state = conversationReducer(initialConversationState, {
			type: "snapshot",
			messages: [userMessage("hi")],
			isStreaming: true,
		});
		expect(state.messages).toHaveLength(1);
		expect(state.status).toBe("streaming");
	});

	it("accumulates text and thinking deltas", () => {
		let state = conversationReducer(initialConversationState, {
			type: "event",
			event: { type: "message_start", message: assistantMessage("") },
		});
		state = conversationReducer(state, {
			type: "event",
			event: { type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "hello " } },
		});
		state = conversationReducer(state, {
			type: "event",
			event: { type: "message_update", assistantMessageEvent: { type: "thinking_delta", delta: "plan" } },
		});
		state = conversationReducer(state, {
			type: "event",
			event: { type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "world" } },
		});
		expect(state.streaming?.text).toBe("hello world");
		expect(state.streaming?.thinking).toBe("plan");
	});

	it("replaces the stream with the authoritative message", () => {
		let state = conversationReducer(initialConversationState, {
			type: "event",
			event: { type: "message_start", message: assistantMessage("") },
		});
		state = conversationReducer(state, {
			type: "event",
			event: { type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "he" } },
		});
		state = conversationReducer(state, {
			type: "event",
			event: { type: "message_end", message: assistantMessage("hello") },
		});
		expect(state.streaming).toBeNull();
		expect(state.messages).toHaveLength(1);
	});

	it("deduplicates an identical message", () => {
		const message = assistantMessage("hello");
		let state = conversationReducer(initialConversationState, {
			type: "event",
			event: { type: "message_end", message },
		});
		state = conversationReducer(state, { type: "event", event: { type: "message_end", message } });
		expect(state.messages).toHaveLength(1);
	});

	it("clears streaming on settle", () => {
		let state = conversationReducer(initialConversationState, {
			type: "event",
			event: { type: "agent_start" },
		});
		state = conversationReducer(state, {
			type: "event",
			event: { type: "agent_settled", aborted: false },
		});
		expect(state.status).toBe("idle");
		expect(state.streaming).toBeNull();
	});

	it("tracks tool execution lifecycle", () => {
		let state = conversationReducer(initialConversationState, {
			type: "event",
			event: {
				type: "tool_execution_start",
				toolCallId: "call-1",
				toolName: "read",
				args: { path: "a.txt" },
			},
		});
		expect(state.tools["call-1"]?.status).toBe("running");

		state = conversationReducer(state, {
			type: "event",
			event: {
				type: "tool_execution_update",
				toolCallId: "call-1",
				toolName: "read",
				partialResult: { content: [{ type: "text", text: "partial" }] },
			},
		});
		expect(state.tools["call-1"]?.partialOutput).toBe("partial");

		state = conversationReducer(state, {
			type: "event",
			event: {
				type: "tool_execution_end",
				toolCallId: "call-1",
				toolName: "read",
				result: { content: [{ type: "text", text: "final" }] },
				isError: false,
				durationMs: 42,
			},
		});
		expect(state.tools["call-1"]).toMatchObject({ status: "done", output: "final", durationMs: 42 });
	});

	it("marks tool errors", () => {
		let state = conversationReducer(initialConversationState, {
			type: "event",
			event: { type: "tool_execution_start", toolCallId: "call-2", toolName: "bash", args: {} },
		});
		state = conversationReducer(state, {
			type: "event",
			event: {
				type: "tool_execution_end",
				toolCallId: "call-2",
				toolName: "bash",
				result: { content: [{ type: "text", text: "boom" }] },
				isError: true,
			},
		});
		expect(state.tools["call-2"]?.status).toBe("error");
	});
});
