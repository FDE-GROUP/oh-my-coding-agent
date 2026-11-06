import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { fauxAssistantMessage, fauxToolCall, registerFauxProvider } from "@earendil-works/pi-ai/compat";

export default function (pi: ExtensionAPI) {
	const faux = registerFauxProvider({ tokensPerSecond: 20 });
	faux.setResponses([
		fauxAssistantMessage([fauxToolCall("read", { path: "hello.txt" })]),
		fauxAssistantMessage("hello from faux"),
		fauxAssistantMessage("resume answer"),
		fauxAssistantMessage("third answer"),
	]);

	pi.registerProvider("fauxspike", {
		name: "Faux Spike",
		baseUrl: "http://localhost:0",
		apiKey: "spike",
		api: faux.api as never,
		models: [
			{
				id: "faux-1",
				name: "Faux One",
				reasoning: false,
				input: ["text"],
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				contextWindow: 200000,
				maxTokens: 8192,
			},
		],
	});

	pi.registerCommand("uispike", {
		description: "Exercise the extension UI subprotocol",
		handler: async (_args, ctx) => {
			const confirmed = await ctx.ui.confirm("Spike confirm", "Continue?");
			ctx.ui.notify(`confirm result: ${confirmed}`, confirmed ? "info" : "warning");
		},
	});
}
