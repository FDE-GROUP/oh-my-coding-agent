import { defineConfig } from "blume";

export default defineConfig({
	title: "oh-my-fde 文档",
	description:
		"omfde（Pi 的企业内部 FDE 平台）项目文档、仓库 Wiki 与架构知识卡，供人与 coding agent 双读。",
	content: {
		root: "content",
	},
	// 仓库链接：驱动页脚 repo 链接与 agent manifest 的 repository 字段。
	// 内容页是 gitignore 的生成产物，故不产生 Edit on GitHub 链接（Blume 自动跳过被 git 忽略的文件）。
	github: {
		owner: "FDE-GROUP",
		repo: "oh-my-fde",
		branch: "main",
	},
	// 顶层三区用 header tabs：每个 tab 的 path 对应 content/ 下的分区文件夹，并把侧栏限定到该区。
	// 421 页跨三个来源，tabs 比单一侧栏更清晰（Blume 建议用 tabs 拆分大站的独立区域）。
	// docs/explains 的 00-27 顺序由数字前缀自动解析，无需在此声明。
	navigation: {
		tabs: [
			{ label: "项目文档", path: "/docs" },
			{ label: "仓库 Wiki", path: "/wiki" },
			{ label: "架构知识卡", path: "/knowledge" },
		],
	},
	markdown: {
		// 清洗后的 file:// → GitHub blob 外链在新标签打开，读者不离开文档站。
		externalLinks: true,
	},
	seo: {
		// OG 图会让 dist 膨胀到 ~100M（每页一张 PNG）；文档站社交分享价值低，关闭以保持产物精简、
		// 发布到 pages 分支不给仓库增负，构建也更快。
		og: { enabled: false },
		// robots 保留默认（Content-Signal: ai-train=yes），与“文档内容全部公开”的既定口径一致；
		// Blume 只提供 robots 开/关，无细粒度 ai-train 旋钮。
		robots: true,
		sitemap: true,
	},
	agents: {
		llmsTxt: true,
		catalog: true,
		skillMd: true,
		// 纯静态形态：不开 MCP server（需 server output）；保留日后经 deployment adapter 升级的路径。
		mcp: { enabled: false },
	},
	deployment: {
		site: "https://fde-group.github.io",
		base: "/oh-my-fde",
	},
	i18n: {
		defaultLocale: "zh-CN",
		locales: [{ code: "zh-CN", label: "简体中文" }],
	},
});
