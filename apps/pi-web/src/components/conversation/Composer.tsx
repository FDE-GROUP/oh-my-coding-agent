import { useEffect, useRef, useState } from "react";
import { IconButton } from "../primitives/IconButton.tsx";
import { SendIcon, StopIcon } from "../primitives/icons.tsx";

export interface ComposerProps {
	disabled: boolean;
	streaming: boolean;
	onSend: (text: string) => void;
	onAbort: () => void;
}

export function Composer({ disabled, streaming, onSend, onAbort }: ComposerProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 输入变化后需要重新计算 textarea 高度。
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
	}, [value]);

	function submit() {
		const text = value.trim();
		if (text.length === 0 || disabled) return;
		onSend(text);
		setValue("");
	}

	return (
		<div className="border-t border-hairline border-dsw-border-l1 px-4 py-3">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
				<div className="flex items-end gap-2 rounded-dsw-card border border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 p-2 focus-within:border-dsw-border-l3">
					<textarea
						ref={textareaRef}
						rows={1}
						value={value}
						disabled={disabled}
						placeholder={streaming ? "运行中，可继续输入以排队" : "输入任务，Enter 发送"}
						onChange={(event) => setValue(event.target.value)}
						onKeyDown={(event) => {
							if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
							event.preventDefault();
							submit();
						}}
						className="max-h-48 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-dsw-label-primary outline-none placeholder:text-dsw-label-tertiary disabled:opacity-60"
					/>
					{streaming ? (
						<IconButton label="停止" onClick={onAbort}>
							<StopIcon />
						</IconButton>
					) : (
						<IconButton label="发送" disabled={disabled || value.trim().length === 0} onClick={submit}>
							<SendIcon />
						</IconButton>
					)}
				</div>
				<p className="px-1 text-[11px] text-dsw-label-tertiary">Enter 发送 · Shift+Enter 换行</p>
			</div>
		</div>
	);
}
