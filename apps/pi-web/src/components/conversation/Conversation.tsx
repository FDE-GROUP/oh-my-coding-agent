import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createSession, openEventStream, sendCommand } from "../../lib/api.ts";
import { type ConversationMessage, conversationReducer, initialConversationState } from "../../lib/conversation.ts";
import type { Health } from "../../server/health.ts";
import { Composer } from "./Composer.tsx";
import { ConversationPlaceholder } from "./ConversationPlaceholder.tsx";
import { MessageList } from "./MessageList.tsx";

function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function Conversation({ health }: { health: Health }) {
	const [conversation, dispatch] = useReducer(conversationReducer, initialConversationState);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const sessionRef = useRef<string | null>(null);

	useEffect(() => {
		if (!sessionId) return;
		return openEventStream(sessionId, {
			onSnapshot: (snapshot) => {
				setError(null);
				dispatch({
					type: "snapshot",
					messages: snapshot.messages as ConversationMessage[],
					isStreaming: snapshot.state.isStreaming,
				});
			},
			onEvent: (event) => {
				if (event.kind === "record") dispatch({ type: "event", event: event.record });
				if (event.kind === "exit") {
					setError(event.error ? `Pi 已退出：${event.error}` : "Pi 已退出");
				}
			},
			onConnectionError: () => setError("事件流连接中断，正在重试…"),
		});
	}, [sessionId]);

	const ensureSession = useCallback(async (): Promise<string> => {
		if (sessionRef.current) return sessionRef.current;
		setCreating(true);
		try {
			const created = await createSession();
			sessionRef.current = created.id;
			setSessionId(created.id);
			return created.id;
		} finally {
			setCreating(false);
		}
	}, []);

	const send = useCallback(
		async (text: string) => {
			setError(null);
			try {
				const id = await ensureSession();
				await sendCommand(id, { type: "prompt", message: text });
			} catch (caught) {
				setError(errorText(caught));
			}
		},
		[ensureSession],
	);

	const abort = useCallback(async () => {
		const id = sessionRef.current;
		if (!id) return;
		try {
			await sendCommand(id, { type: "abort" });
		} catch (caught) {
			setError(errorText(caught));
		}
	}, []);

	const streaming = conversation.status === "streaming";
	const empty = conversation.messages.length === 0 && !streaming;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{error && (
				<div className="border-b border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 px-4 py-2 text-xs text-dsw-state-error">
					{error}
				</div>
			)}

			{empty ? (
				<div className="flex min-h-0 flex-1 overflow-auto">
					<ConversationPlaceholder health={health} />
				</div>
			) : (
				<MessageList messages={conversation.messages} streaming={conversation.streaming} />
			)}

			<Composer disabled={creating} streaming={streaming} onSend={send} onAbort={abort} />
		</div>
	);
}
