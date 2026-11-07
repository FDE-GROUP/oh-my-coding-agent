import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

// 渲染模型/用户输出的 HTML 前，统一给外链补 target/rel，避免新标签页反向操控 opener。
// addHook 依赖 DOM，仅浏览器端注册；SSR 下 DOMPurify 默认导出无此方法，模块顶层直接调用会抛错。
if (typeof window !== "undefined") {
	DOMPurify.addHook("afterSanitizeAttributes", (node) => {
		if (node.tagName === "A") {
			node.setAttribute("target", "_blank");
			node.setAttribute("rel", "noopener noreferrer");
		}
	});
}

/**
 * 把会话文本按 Markdown 渲染为受 DSH 设计 token 约束的 HTML。
 *
 * @remarks
 * 模型与用户输出可能夹带任意 HTML：先经 marked 解析，再用 DOMPurify 消毒，最后通过
 * dangerouslySetInnerHTML 注入。DOMPurify 依赖 DOM，服务端（无 window）直接返回空串——会话
 * 消息本就只在客户端加载，SSR 阶段不带内容，故不产生水合不一致，也避免服务端触碰 DOMPurify。
 * 仅 assistant 与 user 文本走本组件；thinking 与工具结果是终端输出，保持等宽纯文本。
 *
 * @param text - 原始 Markdown 文本。
 * @returns 渲染后的 Markdown 容器元素。
 * @internal
 */
export function Markdown({ text }: { text: string }) {
	const html = useMemo(() => {
		if (typeof window === "undefined") return "";
		return DOMPurify.sanitize(marked.parse(text, { async: false, gfm: true, breaks: true }));
	}, [text]);
	// biome-ignore lint/security/noDangerouslySetInnerHtml: html 已由 DOMPurify 消毒，注入受控且安全。
	return <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
