// biome-ignore-all lint/suspicious/noArrayIndexKey: Pi 消息与内容块没有稳定 id，只能按位置渲染。
import { useEffect, useRef, useState } from "react";
import type { ConversationMessage, StreamingMessage } from "../../lib/conversation.ts";
import { IconButton } from "../primitives/IconButton.tsx";
import { ArrowDownIcon } from "../primitives/icons.tsx";

function TextBlock({ text }: { text: string }) {
	return <p className="whitespace-pre-wrap break-words text-sm leading-6">{text}</p>;
}

function ThinkingBlock({ thinking }: { thinking: string }) {
	if (thinking.length === 0) return null;
	return (
		<details className="group rounded-dsw-sm border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1">
			<summary className="cursor-pointer select-none px-3 py-2 text-xs text-dsw-label-secondary">思考</summary>
			<pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-3 pb-3 font-mono text-xs leading-5 text-dsw-label-secondary">
				{thinking}
			</pre>
		</details>
	);
}

function ToolCallRow({ name }: { name: string }) {
	return (
		<div className="inline-flex w-fit items-center gap-2 rounded-dsw-sm border border-hairline border-dsw-border-l1 px-2 py-1 text-xs text-dsw-label-secondary">
			<span className="size-1.5 rounded-full bg-dsw-state-business" />
			工具调用 · <span className="font-mono text-dsw-label-primary">{name}</span>
		</div>
	);
}

type RenderableMessage = Extract<ConversationMessage, { role: "user" | "assistant" }>;

function MessageContent({ message }: { message: RenderableMessage }) {
	if (typeof message.content === "string") {
		return <TextBlock text={message.content} />;
	}
	return (
		<div className="flex flex-col gap-2">
			{message.content.map((block, index) => {
				if (block.type === "text") return <TextBlock key={index} text={block.text} />;
				if (block.type === "thinking") return <ThinkingBlock key={index} thinking={block.thinking} />;
				if (block.type === "toolCall") return <ToolCallRow key={index} name={block.name} />;
				if (block.type === "image") {
					return (
						<span key={index} className="text-xs text-dsw-label-tertiary">
							[图片]
						</span>
					);
				}
				return null;
			})}
		</div>
	);
}

function RoleLabel({ author }: { author: string }) {
	const label = author === "assistant" ? "Pi" : author === "user" ? "你" : author;
	return <span className="text-[11px] font-medium tracking-wide text-dsw-label-tertiary">{label}</span>;
}

function MessageRow({ message }: { message: ConversationMessage }) {
	if (message.role !== "user" && message.role !== "assistant" && message.role !== "toolResult") return null;

	if (message.role === "toolResult") {
		const text = Array.isArray(message.content)
			? message.content
					.filter((block) => block.type === "text")
					.map((block) => (block.type === "text" ? block.text : ""))
					.join("\n")
			: String(message.content);
		return (
			<details className="rounded-dsw-sm border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1">
				<summary className="cursor-pointer select-none px-3 py-2 text-xs text-dsw-label-secondary">
					工具结果 · <span className="font-mono">{message.toolName}</span>
				</summary>
				<pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-3 pb-3 font-mono text-xs leading-5 text-dsw-label-secondary">
					{text}
				</pre>
			</details>
		);
	}

	return (
		<article className="flex flex-col gap-2">
			<RoleLabel author={message.role} />
			<div
				className={
					message.role === "user"
						? "rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 px-4 py-3"
						: "px-1"
				}
			>
				<MessageContent message={message} />
			</div>
		</article>
	);
}

function StreamingRow({ streaming }: { streaming: StreamingMessage }) {
	const empty = streaming.text.length === 0 && streaming.thinking.length === 0;
	return (
		<article className="flex flex-col gap-2">
			<RoleLabel author="assistant" />
			<div className="flex flex-col gap-2 px-1">
				<ThinkingBlock thinking={streaming.thinking} />
				{streaming.text.length > 0 && <TextBlock text={streaming.text} />}
				{empty && <p className="animate-pulse text-sm text-dsw-label-tertiary">正在思考…</p>}
			</div>
		</article>
	);
}

export interface MessageListProps {
	messages: ConversationMessage[];
	streaming: StreamingMessage | null;
}

export function MessageList({ messages, streaming }: MessageListProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [nearBottom, setNearBottom] = useState(true);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 新消息或流式增量到达时触发滚动。
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !nearBottom) return;
		container.scrollTop = container.scrollHeight;
	}, [messages, streaming, nearBottom]);

	function onScroll() {
		const container = containerRef.current;
		if (!container) return;
		const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
		setNearBottom(distance < 96);
	}

	return (
		<div className="relative min-h-0 flex-1">
			<div ref={containerRef} onScroll={onScroll} className="h-full overflow-y-auto px-4 py-6">
				<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
					{messages.map((message, index) => (
						<MessageRow key={index} message={message} />
					))}
					{streaming && <StreamingRow streaming={streaming} />}
				</div>
			</div>

			{!nearBottom && (
				<IconButton
					label="回到底部"
					className="absolute bottom-4 left-1/2 -translate-x-1/2 border border-hairline border-dsw-border-l1 bg-dsw-bg-base shadow-dsw-panel"
					onClick={() => {
						const container = containerRef.current;
						if (!container) return;
						container.scrollTop = container.scrollHeight;
						setNearBottom(true);
					}}
				>
					<ArrowDownIcon />
				</IconButton>
			)}
		</div>
	);
}
