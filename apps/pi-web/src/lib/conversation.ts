/**
 * 对话状态归约。
 *
 * @remarks
 * 只处理 UI 需要的事实：消息列表、流式文本、运行状态。工具卡片的细节在
 * S4 扩展；收到 `message_end` 后以 Pi 的权威消息替换本地流式内容。
 *
 * @internal
 */
import type { RpcMessages } from "../server/runtime.ts";

/**
 * 一条对话消息。
 *
 * @internal
 */
export type ConversationMessage = RpcMessages[number];

/**
 * 流式中的 assistant 内容。
 *
 * @internal
 */
export interface StreamingMessage {
	text: string;
	thinking: string;
}

/**
 * 对话状态。
 *
 * @internal
 */
export interface ConversationState {
	messages: ConversationMessage[];
	streaming: StreamingMessage | null;
	status: "idle" | "streaming";
}

/**
 * 对话动作。
 *
 * @internal
 */
export type ConversationAction =
	| { type: "snapshot"; messages: ConversationMessage[]; isStreaming: boolean }
	| { type: "event"; event: Record<string, unknown> }
	| { type: "reset" };

/**
 * 初始对话状态。
 *
 * @internal
 */
export const initialConversationState: ConversationState = {
	messages: [],
	streaming: null,
	status: "idle",
};

function sameMessage(left: ConversationMessage, right: ConversationMessage): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function appendMessage(state: ConversationState, message: ConversationMessage): ConversationState {
	const last = state.messages.at(-1);
	if (last && sameMessage(last, message)) return state;
	return { ...state, messages: [...state.messages, message] };
}

function handleUpdate(state: ConversationState, record: Record<string, unknown>): ConversationState {
	const update = record.assistantMessageEvent as { type?: string; delta?: string } | undefined;
	if (!update) return state;
	const streaming = state.streaming ?? { text: "", thinking: "" };
	if (update.type === "text_delta" && typeof update.delta === "string") {
		return { ...state, streaming: { ...streaming, text: streaming.text + update.delta } };
	}
	if (update.type === "thinking_delta" && typeof update.delta === "string") {
		return { ...state, streaming: { ...streaming, thinking: streaming.thinking + update.delta } };
	}
	return state;
}

/**
 * 归约一条 SSE 事件或快照。
 *
 * @param state - 当前对话状态。
 * @param action - 快照、事件或重置。
 * @returns 新的对话状态。
 * @internal
 */
export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
	if (action.type === "reset") return initialConversationState;

	if (action.type === "snapshot") {
		return {
			messages: action.messages,
			streaming: null,
			status: action.isStreaming ? "streaming" : "idle",
		};
	}

	const record = action.event;
	const type = record.type;
	if (typeof type !== "string") return state;

	if (type === "agent_start") return { ...state, status: "streaming" };
	if (type === "agent_settled") return { ...state, status: "idle", streaming: null };

	if (type === "message_start") {
		const message = record.message as ConversationMessage | undefined;
		if (message?.role === "assistant") return { ...state, streaming: { text: "", thinking: "" } };
		return state;
	}

	if (type === "message_update") return handleUpdate(state, record);

	if (type === "message_end") {
		const message = record.message as ConversationMessage | undefined;
		if (!message) return state;
		if (message.role === "assistant") {
			return { ...appendMessage(state, message), streaming: null };
		}
		return appendMessage(state, message);
	}

	if (type === "session_info_changed" && typeof record.name === "string") {
		return state;
	}

	return state;
}
