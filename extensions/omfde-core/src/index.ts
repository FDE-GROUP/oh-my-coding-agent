import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * 注册 omfde 平台的基础扩展。
 *
 * @remarks
 * 当前只注册 `/omfde` 命令作为加载探针。平台能力后续通过扩展接入，不修改 Pi 内核。
 *
 * @param pi - Pi 扩展 API。
 * @public
 */
export default function omfdeCore(pi: ExtensionAPI): void {
	pi.registerCommand("omfde", {
		description: "Show omfde platform status",
		handler: async (_args, ctx) => {
			ctx.ui.notify("omfde platform extension is loaded", "info");
		},
	});
}
