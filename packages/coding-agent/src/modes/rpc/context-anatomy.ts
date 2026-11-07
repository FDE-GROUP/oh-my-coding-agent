/**
 * Context anatomy for the `get_context_anatomy` RPC command.
 *
 * Assembles what the model sees in the next request — system prompt sections,
 * declared tools, message history, and token estimates — from read-only session
 * state. Pure reads: calling it never mutates the session, its entries, or the
 * transcript, and never issues a provider request.
 */
import { getCurrentSystemMessage } from "@earendil-works/pi-ai";
import type { AgentSession } from "../../core/agent-session.ts";
import { estimateProjectedContextTokens, estimateTokens } from "../../core/compaction/compaction.ts";

/** One named system prompt section with its size and estimated token cost. */
export interface ContextAnatomySection {
	name: string;
	chars: number;
	estTokens: number;
}

/** Total context estimate with the basis it was computed from. */
export interface ContextAnatomyTotal {
	tokens: number;
	contextWindow?: number;
	percent?: number;
	/**
	 * "usage-anchored": the last trusted provider usage plus estimated trailing tokens.
	 * "estimated": chars/4 heuristic over the whole projection (no usage, or invalidated by
	 * a later context_edit/compaction).
	 */
	basis: "usage-anchored" | "estimated";
}

/** Breakdown of the projected request context. */
export interface ContextAnatomy {
	/** Named prompt sections of the current system message, in declaration order. */
	sections: ContextAnatomySection[];
	/** Base instruction text of the system message (`content`). */
	baseContent: { chars: number; estTokens: number };
	/** Tools declared available at this point (`toolsAdded` after replay). */
	tools: { name: string }[];
	/** Non-system messages in the projection. */
	messages: { count: number; estTokens: number };
	compaction: { active: boolean };
	total: ContextAnatomyTotal;
}

function contentChars(content: string | { text?: string }[]): number {
	if (typeof content === "string") return content.length;
	return content.reduce((sum, block) => sum + (block.text?.length ?? 0), 0);
}

/** Build the context anatomy of the session's current branch. Read-only. */
export function buildContextAnatomy(session: AgentSession): ContextAnatomy {
	const sessionManager = session.sessionManager;
	const projection = sessionManager.buildSessionProjection();
	const estimate = estimateProjectedContextTokens(projection, sessionManager.getBranch());
	const system = getCurrentSystemMessage(projection.messages);

	const sections: ContextAnatomySection[] = Object.entries(system?.sections ?? {}).map(([name, value]) => {
		const chars = value?.length ?? 0;
		return { name, chars, estTokens: Math.ceil(chars / 4) };
	});

	const baseChars = system ? contentChars(system.content) : 0;

	let messageCount = 0;
	let messageTokens = 0;
	for (const message of projection.messages) {
		if (message.role === "system") continue;
		messageCount += 1;
		messageTokens += estimateTokens(message);
	}

	const usage = session.getContextUsage();

	return {
		sections,
		baseContent: { chars: baseChars, estTokens: Math.ceil(baseChars / 4) },
		tools: (system?.toolsAdded ?? []).map((tool) => ({ name: tool.name })),
		messages: { count: messageCount, estTokens: messageTokens },
		compaction: { active: session.isCompacting },
		total: {
			tokens: usage?.tokens ?? estimate.tokens,
			...(usage && usage.contextWindow > 0 ? { contextWindow: usage.contextWindow } : {}),
			...(usage && usage.percent !== null ? { percent: usage.percent } : {}),
			basis: estimate.usageTokens > 0 ? "usage-anchored" : "estimated",
		},
	};
}
