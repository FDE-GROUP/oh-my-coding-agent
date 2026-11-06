import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Registers the base omfde platform extension. */
export default function omfdeCore(pi: ExtensionAPI): void {
	pi.registerCommand("omfde", {
		description: "Show omfde platform status",
		handler: async (_args, ctx) => {
			ctx.ui.notify("omfde platform extension is loaded", "info");
		},
	});
}
