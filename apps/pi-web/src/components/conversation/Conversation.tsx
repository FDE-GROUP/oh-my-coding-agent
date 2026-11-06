import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createSession, openEventStream, resumeSession, sendCommand } from "../../lib/api.ts";
import { type ConversationMessage, conversationReducer, initialConversationState } from "../../lib/conversation.ts";
import type { Health } from "../../server/health.ts";
import type { RpcSessionStats } from "../../server/runtime.ts";
import { Composer } from "./Composer.tsx";
import { ConversationPlaceholder } from "./ConversationPlaceholder.tsx";
import { MessageList } from "./MessageList.tsx";
import { type ModelSummary, SessionBar } from "./SessionBar.tsx";

function errorText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export interface ConversationProps {
	health: Health;
	sessionId?: string;
	onSessionCreated: (id: string) => void;
}

export function Conversation({ health, sessionId, onSessionCreated }: ConversationProps) {
	const [conversation, dispatch] = useReducer(conversationReducer, initialConversationState);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [models, setModels] = useState<ModelSummary[]>([]);
	const [model, setModel] = useState<ModelSummary | null>(null);
	const [stats, setStats] = useState<RpcSessionStats | null>(null);
	const activeIdRef = useRef<string | null>(null);

	useEffect(() => {
		activeIdRef.current = activeId;
	}, [activeId]);

	useEffect(() => {
		if (!sessionId) {
			setActiveId(null);
			dispatch({ type: "reset" });
			return;
		}
		let cancelled = false;
		setError(null);
		dispatch({ type: "reset" });
		resumeSession(sessionId)
			.then((created) => {
				if (!cancelled) setActiveId(created.id);
			})
			.catch((caught) => {
				if (!cancelled) setError(errorText(caught));
			});
		return () => {
			cancelled = true;
		};
	}, [sessionId]);

	useEffect(() => {
		if (!activeId) return;
		let cancelled = false;
		sendCommand(activeId, { type: "get_available_models" })
			.then((response) => {
				if (cancelled) return;
				const list = (response as { models: ModelSummary[] }).models ?? [];
				setModels(
					list.map((item) => ({
						provider: item.provider,
						id: item.id,
						name: item.name,
					})),
				);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [activeId]);

	useEffect(() => {
		if (!activeId) return;
		return openEventStream(activeId, {
			onSnapshot: (snapshot) => {
				setError(null);
				setStats(snapshot.stats);
				setModel(
					snapshot.state.model
						? {
								provider: snapshot.state.model.provider,
								id: snapshot.state.model.id,
								name: snapshot.state.model.name,
							}
						: null,
				);
				dispatch({
					type: "snapshot",
					messages: snapshot.messages as ConversationMessage[],
					isStreaming: snapshot.state.isStreaming,
				});
			},
			onEvent: (event) => {
				if (event.kind === "record") {
					dispatch({ type: "event", event: event.record });
					if (event.record.type === "agent_settled") {
						sendCommand(activeId, { type: "get_session_stats" })
							.then((response) => setStats(response as RpcSessionStats))
							.catch(() => undefined);
					}
				}
				if (event.kind === "exit") {
					setError(event.error ? `Pi 已退出：${event.error}` : "Pi 已退出");
				}
			},
			onConnectionError: () => setError("事件流连接中断，正在重试…"),
		});
	}, [activeId]);

	const ensureSession = useCallback(async (): Promise<string> => {
		if (activeIdRef.current) return activeIdRef.current;
		setCreating(true);
		try {
			const created = await createSession();
			activeIdRef.current = created.id;
			setActiveId(created.id);
			onSessionCreated(created.id);
			return created.id;
		} finally {
			setCreating(false);
		}
	}, [onSessionCreated]);

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
		const id = activeIdRef.current;
		if (!id) return;
		try {
			await sendCommand(id, { type: "abort" });
		} catch (caught) {
			setError(errorText(caught));
		}
	}, []);

	const selectModel = useCallback(async (provider: string, id: string) => {
		const session = activeIdRef.current;
		if (!session) return;
		try {
			const selected = (await sendCommand(session, { type: "set_model", provider, modelId: id })) as {
				provider: string;
				id: string;
				name: string;
			};
			setModel({ provider: selected.provider, id: selected.id, name: selected.name });
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
				<MessageList
					messages={conversation.messages}
					streaming={conversation.streaming}
					tools={conversation.tools}
				/>
			)}

			<Composer disabled={creating} streaming={streaming} onSend={send} onAbort={abort} />
			<SessionBar models={models} model={model} stats={stats} onSelectModel={selectModel} />
		</div>
	);
}
