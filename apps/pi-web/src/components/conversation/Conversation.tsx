import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
	cloneSession,
	createSession,
	expandProjectFiles,
	forkSession,
	openEventStream,
	resumeSession,
	searchProjectFiles,
	sendCommand,
} from "../../lib/api.ts";
import { type ConversationMessage, conversationReducer, initialConversationState } from "../../lib/conversation.ts";
import type { ImageAttachment } from "../../lib/images.ts";
import type { Health } from "../../server/health.ts";
import type { RpcSessionStats } from "../../server/runtime.ts";
import { type CommandSummary, Composer, type QueueMode } from "./Composer.tsx";
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
	onSessionSwitch: (id: string) => void;
}

export function Conversation({ health, sessionId, onSessionCreated, onSessionSwitch }: ConversationProps) {
	const [conversation, dispatch] = useReducer(conversationReducer, initialConversationState);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [models, setModels] = useState<ModelSummary[]>([]);
	const [model, setModel] = useState<ModelSummary | null>(null);
	const [stats, setStats] = useState<RpcSessionStats | null>(null);
	const [notices, setNotices] = useState<Array<{ id: number; message: string; type: string }>>([]);
	const [crashed, setCrashed] = useState(false);
	const [connectionNonce, setConnectionNonce] = useState(0);
	const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
	const [commands, setCommands] = useState<CommandSummary[]>([]);
	const [forkMessages, setForkMessages] = useState<Array<{ entryId: string; text: string }>>([]);
	const noticeId = useRef(0);
	const activeIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (notices.length === 0) return;
		const timer = setTimeout(() => setNotices((current) => current.slice(1)), 5000);
		return () => clearTimeout(timer);
	}, [notices]);

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
		setAttachments([]);
		setCommands([]);
		setForkMessages([]);
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
		let cancelled = false;
		sendCommand(activeId, { type: "get_commands" })
			.then((response) => {
				if (cancelled) return;
				const list = (response as { commands: CommandSummary[] }).commands ?? [];
				setCommands(list);
			})
			.catch(() => undefined);
		sendCommand(activeId, { type: "get_fork_messages" })
			.then((response) => {
				if (cancelled) return;
				const list = (response as { messages: Array<{ entryId: string; text: string }> }).messages ?? [];
				setForkMessages(list);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [activeId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: connectionNonce 用于崩溃后强制重建事件流。
	useEffect(() => {
		if (!activeId) return;
		return openEventStream(activeId, {
			onSnapshot: (snapshot) => {
				setError(null);
				setCrashed(false);
				setStats(snapshot.stats);
				setModel(
					snapshot.state.model
						? {
								provider: snapshot.state.model.provider,
								id: snapshot.state.model.id,
								name: snapshot.state.model.name,
								input: snapshot.state.model.input,
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
					if (
						event.record.type === "extension_ui_request" &&
						event.record.method === "notify" &&
						typeof event.record.message === "string"
					) {
						const type = typeof event.record.notifyType === "string" ? event.record.notifyType : "info";
						setNotices((current) => [
							...current.slice(-3),
							{ id: ++noticeId.current, message: String(event.record.message), type },
						]);
					}
					if (event.record.type === "agent_settled") {
						sendCommand(activeId, { type: "get_session_stats" })
							.then((response) => setStats(response as RpcSessionStats))
							.catch(() => undefined);
						sendCommand(activeId, { type: "get_fork_messages" })
							.then((response) => {
								const list =
									(response as { messages: Array<{ entryId: string; text: string }> }).messages ?? [];
								setForkMessages(list);
							})
							.catch(() => undefined);
					}
				}
				if (event.kind === "exit") {
					setCrashed(true);
					setError(event.error ? `Pi 已退出：${event.error}` : "Pi 已退出");
				}
			},
			onConnectionError: () => setError("事件流连接中断，正在重试…"),
		});
	}, [activeId, connectionNonce]);

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
		async (text: string, mode: QueueMode, images: ImageAttachment[]): Promise<boolean> => {
			setError(null);
			try {
				const id = await ensureSession();
				const payload = images.map((image) => ({
					type: "image" as const,
					mimeType: image.mimeType,
					data: image.data,
				}));
				if (conversation.status === "streaming") {
					await sendCommand(
						id,
						mode === "followUp"
							? { type: "follow_up", message: text, images: payload }
							: { type: "steer", message: text, images: payload },
					);
				} else {
					await sendCommand(id, { type: "prompt", message: text, images: payload });
				}
				return true;
			} catch (caught) {
				setError(errorText(caught));
				return false;
			}
		},
		[conversation.status, ensureSession],
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

	const restart = useCallback(async () => {
		const id = activeIdRef.current;
		if (!id) return;
		setError(null);
		try {
			await resumeSession(id);
			setCrashed(false);
			setConnectionNonce((current) => current + 1);
		} catch (caught) {
			setCrashed(true);
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
				input: string[];
			};
			setModel({
				provider: selected.provider,
				id: selected.id,
				name: selected.name,
				input: selected.input,
			});
		} catch (caught) {
			setError(errorText(caught));
		}
	}, []);

	const handleFork = useCallback(
		async (entryId: string) => {
			const id = activeIdRef.current;
			if (!id) return;
			setError(null);
			try {
				const created = await forkSession(id, entryId);
				onSessionSwitch(created.id);
			} catch (caught) {
				setError(errorText(caught));
			}
		},
		[onSessionSwitch],
	);

	const handleClone = useCallback(async () => {
		const id = activeIdRef.current;
		if (!id) return;
		setError(null);
		try {
			const created = await cloneSession(id);
			onSessionSwitch(created.id);
		} catch (caught) {
			setError(errorText(caught));
		}
	}, [onSessionSwitch]);

	const addNotes = useCallback((notes: string[]) => {
		if (notes.length === 0) return;
		setNotices((current) => [
			...current.slice(-3),
			...notes.map((note) => ({ id: ++noticeId.current, message: note, type: "warning" })),
		]);
	}, []);

	const streaming = conversation.status === "streaming";
	const empty = conversation.messages.length === 0 && !streaming;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{error && (
				<div className="flex items-center gap-3 border-b border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 px-4 py-2 text-xs text-dsw-state-error">
					<span className="min-w-0 flex-1">{error}</span>
					{crashed && (
						<button
							type="button"
							className="shrink-0 rounded-dsw-xs border border-dsw-border-l2 px-2 py-0.5 text-dsw-label-primary"
							onClick={() => void restart()}
						>
							重新启动
						</button>
					)}
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
					forkMessages={forkMessages}
					onFork={(entryId) => void handleFork(entryId)}
				/>
			)}

			<Composer
				disabled={creating}
				streaming={streaming}
				queued={conversation.queue.steering.length + conversation.queue.followUp.length}
				supportsImages={model?.input?.includes("image") ?? false}
				commands={commands}
				attachments={attachments}
				onAttachmentsChange={setAttachments}
				onSearchFiles={(query) => (activeId ? searchProjectFiles(activeId, query) : Promise.resolve([]))}
				onExpandFiles={(paths) =>
					activeId
						? expandProjectFiles(activeId, paths)
						: Promise.resolve({ text: "", images: [], notes: ["先发送一条消息创建会话，再引用文件"] })
				}
				onNotes={addNotes}
				onSend={send}
				onAbort={abort}
			/>
			<SessionBar
				models={models}
				model={model}
				stats={stats}
				onSelectModel={selectModel}
				onClone={() => void handleClone()}
				canClone={conversation.messages.length > 0}
			/>

			{notices.length > 0 && (
				<div className="pointer-events-none fixed right-4 top-14 z-50 flex w-80 flex-col gap-2">
					{notices.map((notice) => (
						<div
							key={notice.id}
							className={
								notice.type === "error"
									? "rounded-dsw-card border border-dsw-state-error bg-dsw-bg-base px-3 py-2 text-xs text-dsw-state-error shadow-dsw-panel"
									: notice.type === "warning"
										? "rounded-dsw-card border border-dsw-state-warn bg-dsw-bg-base px-3 py-2 text-xs text-dsw-state-warn shadow-dsw-panel"
										: "rounded-dsw-card border border-dsw-border-l1 bg-dsw-bg-base px-3 py-2 text-xs text-dsw-label-secondary shadow-dsw-panel"
							}
						>
							{notice.message}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
