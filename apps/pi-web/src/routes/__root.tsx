import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { THEME_INIT_SCRIPT } from "../lib/theme.ts";
import appCss from "../styles/app.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
			{ name: "theme-color", content: "#16181d" },
			{ title: "Pi Web" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "manifest", href: "/manifest.webmanifest" },
			{ rel: "icon", href: "/icons/icon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/icons/icon.svg" },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN" data-theme="light" suppressHydrationWarning>
			<head>
				<HeadContent />
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: 静态主题初始化脚本，内容由本模块常量提供 */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
