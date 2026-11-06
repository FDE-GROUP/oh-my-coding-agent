/**
 * 交接文档生成。
 *
 * @remarks
 * 只从会话消息和工具参数中提取结构化信息；不读取环境变量。导出前对常见
 * 密钥模式做脱敏。
 *
 * @internal
 */
import type { SessionSnapshot } from "./runtime.ts";

/**
 * 交接文档上下文。
 *
 * @internal
 */
export interface HandoffContext {
	sessionId: string;
	workspace: string;
	owner: string;
}

interface ToolCallSummary {
	name: string;
	detail: string;
}

interface ToolResultSummary {
	isError: boolean;
}

function textOf(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((block) => {
			if (!block || typeof block !== "object") return "";
			const candidate = block as { type?: string; text?: string; thinking?: string };
			if (candidate.type === "text" && typeof candidate.text === "string") return candidate.text;
			if (candidate.type === "thinking" && typeof candidate.thinking === "string") return candidate.thinking;
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function argSummary(name: string, args: unknown): string {
	if (!args || typeof args !== "object") return "";
	const record = args as Record<string, unknown>;
	if (name === "write" || name === "edit") {
		const path = typeof record.path === "string" ? record.path : "(unknown)";
		return path;
	}
	if (name === "bash" && typeof record.command === "string") {
		const command = record.command.replace(/\s+/g, " ").trim();
		return command.length > 160 ? `${command.slice(0, 160)}…` : command;
	}
	const json = JSON.stringify(args);
	return json.length > 160 ? `${json.slice(0, 160)}…` : json;
}

function extractRisks(text: string): string[] {
	const risks: string[] = [];
	let inRiskSection = false;
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (/^#{1,6}\s/.test(trimmed)) {
			inRiskSection = /风险|下一步|未完成|TODO|next/i.test(trimmed);
			continue;
		}
		if (!trimmed) continue;
		if (inRiskSection || /TODO|风险|未完成/i.test(trimmed)) risks.push(trimmed.replace(/^[-*]\s*/, ""));
	}
	return [...new Set(risks)];
}

function redact(text: string): string {
	return text.replace(
		/(sk-[A-Za-z0-9]{20,}|api[_-]?key\s*[=:]\s*\S+|token\s*[=:]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/gi,
		"[已隐藏]",
	);
}

/**
 * 生成交接文档。
 *
 * @param snapshot - 会话快照。
 * @param context - 会话 id、工作区与所有者。
 * @returns Markdown 文本。
 * @internal
 */
export function generateHandoff(snapshot: SessionSnapshot, context: HandoffContext): string {
	const messages = snapshot.messages.filter((message) => message.role !== "system");
	const users = messages.filter((message) => message.role === "user").map((message) => textOf(message.content));
	const assistants = messages.filter((message) => message.role === "assistant");
	const lastAssistant = assistants.length > 0 ? textOf(assistants.at(-1)?.content) : "";
	const toolCalls: ToolCallSummary[] = [];
	const toolResults = new Map<string, ToolResultSummary>();
	const changedFiles = new Set<string>();

	for (const message of messages) {
		if (message.role === "assistant" && Array.isArray(message.content)) {
			for (const block of message.content) {
				if (block.type !== "toolCall") continue;
				toolCalls.push({ name: block.name, detail: argSummary(block.name, block.arguments) });
				const path = (block.arguments as { path?: unknown } | undefined)?.path;
				if (typeof path === "string" && (block.name === "write" || block.name === "edit")) changedFiles.add(path);
			}
		}
		if (message.role === "toolResult") {
			toolResults.set(message.toolCallId, { isError: message.isError });
		}
	}

	const risks = extractRisks(lastAssistant);
	const failedTools = [...toolResults.values()].filter((result) => result.isError).length;
	const title = users[0]?.split("\n")[0]?.trim() || "会话交接";
	const lines = [
		`# 交接：${title}`,
		"",
		`- 会话：${context.sessionId}`,
		`- 工作区：${context.workspace}`,
		`- 所有者：${context.owner}`,
		`- 模型：${snapshot.state.model ? `${snapshot.state.model.provider}/${snapshot.state.model.id}` : "未知"}`,
		`- 消息数：${messages.length}`,
		`- 工具调用：${toolCalls.length}`,
		"",
		"## 目标",
		...(users.length > 0 ? users.map((text) => `- ${text.replace(/\n/g, " ")}`) : ["- （无）"]),
		"",
		"## 结论",
		lastAssistant || "（无助手结论）",
		"",
		"## 工具调用",
		...(toolCalls.length > 0
			? [
					...toolCalls.map((call) => `- ${call.name}${call.detail ? `：${call.detail}` : ""}`),
					...(failedTools > 0 ? [`- 失败工具：${failedTools}`] : []),
				]
			: ["- （无）"]),
		"",
		"## 改动文件",
		...(changedFiles.size > 0 ? [...changedFiles].map((file) => `- ${file}`) : ["- （无）"]),
		"",
		"## 风险与下一步",
		...(risks.length > 0 ? risks.map((line) => `- ${line}`) : ["- （需要人工补充）"]),
		"",
	];

	const result = lines.join("\n");
	return redact(result);
}
