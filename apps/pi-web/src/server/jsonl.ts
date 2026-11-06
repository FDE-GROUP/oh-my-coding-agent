/**
 * JSONL 分帧工具。
 *
 * @remarks
 * RPC 只把 LF 当作记录边界。不能使用 `readline`，它还会在 U+2028 和
 * U+2029 处切断，而这两个字符可以合法出现在 JSON 字符串里。
 *
 * @internal
 */

/**
 * 增量分帧器。
 *
 * @internal
 */
export interface JsonlSplitter {
	/**
	 * 追加一段文本。
	 *
	 * @param chunk - 新到达的文本片段。
	 * @returns 本次完整读出的记录，已去掉行尾 CR。
	 */
	push(chunk: string): string[];

	/**
	 * 取出缓冲区中最后一条未以 LF 结束的记录。
	 *
	 * @returns 剩余记录；为空时返回空数组。
	 */
	flush(): string[];
}

const LF = "\n";

/**
 * 创建一个 JSONL 分帧器。
 *
 * @returns 可增量写入的分帧器。
 * @internal
 */
export function createJsonlSplitter(): JsonlSplitter {
	let buffer = "";

	return {
		push(chunk: string): string[] {
			buffer += chunk;
			const lines: string[] = [];
			let index = buffer.indexOf(LF);
			while (index !== -1) {
				const line = buffer.slice(0, index).replace(/\r$/, "");
				buffer = buffer.slice(index + 1);
				if (line.length > 0) lines.push(line);
				index = buffer.indexOf(LF);
			}
			return lines;
		},

		flush(): string[] {
			const line = buffer.replace(/\r$/, "");
			buffer = "";
			return line.length > 0 ? [line] : [];
		},
	};
}
