import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useReducer, useState } from "react";
import { MessageList } from "../components/conversation/MessageList.tsx";
import { fetchSharedSession, openSharedEventStream, type SharedSession } from "../lib/api.ts";
import { type ConversationMessage, conversationReducer, initialConversationState } from "../lib/conversation.ts";

/**
 * 只读分享页面。
 *
 * @internal
 */
export const Route = createFileRoute("/share/$token")({ component: SharePage });

function SharePage() {
	const { token } = Route.useParams();
	const [conversation, dispatch] = useReducer(conversationReducer, initialConversationState);
	const [shared, setShared] = useState<SharedSession | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [streamNonce, setStreamNonce] = useState(0);

	useEffect(() => {
		let cancelled = false;
		fetchSharedSession(token)
			.then((data) => {
				if (cancelled) return;
				setShared(data);
				dispatch({
					type: "snapshot",
					messages: data.snapshot.messages as ConversationMessage[],
					isStreaming: data.snapshot.state.isStreaming,
					streaming: data.snapshot.streaming,
				});
			})
			.catch((caught) => {
				if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
			});
		return () => {
			cancelled = true;
		};
	}, [token]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: streamNonce 用于断档后强制重建事件流。
	useEffect(() => {
		if (!shared) return;
		return openSharedEventStream(token, {
			onSnapshot: (snapshot) => {
				dispatch({
					type: "snapshot",
					messages: snapshot.messages as ConversationMessage[],
					isStreaming: snapshot.state.isStreaming,
					streaming: snapshot.streaming,
				});
			},
			onEvent: (event) => {
				if (event.kind === "record") dispatch({ type: "event", event: event.record });
				if (event.kind === "status" && event.status === "exited") setError("会话已退出");
				if (event.kind === "exit") setError("会话已退出");
			},
			onConnectionError: () => setError("事件流连接中断，正在重试…"),
			onFatal: () => setError("分享会话不可用"),
			onGap: () => setStreamNonce((current) => current + 1),
		});
	}, [shared, token, streamNonce]);

	return (
		<div className="flex h-dvh flex-col bg-dsw-bg-base text-dsw-label-primary">
			<header className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline border-dsw-border-l1 px-3">
				<span className="text-sm font-medium">FDE Code · 只读分享</span>
				{shared && (
					<span className="truncate text-xs text-dsw-label-tertiary">
						{shared.session.name ?? shared.session.id.slice(0, 8)} · {shared.session.workspace}
					</span>
				)}
				<span className="ml-auto rounded-dsw-xs bg-dsw-bg-layer-2 px-1.5 py-0.5 text-[10px] text-dsw-label-tertiary">
					只读
				</span>
			</header>

			{error && (
				<div className="border-b border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 px-4 py-2 text-xs text-dsw-state-error">
					{error}
				</div>
			)}

			{!shared && !error && <p className="p-6 text-sm text-dsw-label-secondary">正在加载分享…</p>}

			{shared && (
				<>
					<MessageList
						messages={conversation.messages}
						streaming={conversation.streaming}
						tools={conversation.tools}
					/>
					<div className="border-t border-hairline border-dsw-border-l1 px-4 py-2 text-center text-[11px] text-dsw-label-tertiary">
						只读分享，不能发送消息或修改会话
					</div>
				</>
			)}
		</div>
	);
}
