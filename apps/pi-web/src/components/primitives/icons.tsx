// biome-ignore-all lint/a11y/noSvgWithoutTitle: 图标是装饰元素，语义由外层控件的 aria-label 提供。
import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

const base = {
	width: 16,
	height: 16,
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.4,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	role: "presentation",
	focusable: "false",
	"aria-hidden": true,
} as const;

export function PanelLeftIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<rect x="1.75" y="2.25" width="12.5" height="11.5" rx="2" />
			<path d="M5.75 2.5v11" />
		</svg>
	);
}

export function PlusIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="M8 3.25v9.5M3.25 8h9.5" />
		</svg>
	);
}

export function SunIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<circle cx="8" cy="8" r="3" />
			<path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" />
		</svg>
	);
}

export function MoonIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="M13 9.6A5.6 5.6 0 0 1 6.4 3a5.4 5.4 0 1 0 6.6 6.6Z" />
		</svg>
	);
}

export function MonitorIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.75" />
			<path d="M6 14h4M8 11.25V14" />
		</svg>
	);
}

export function ChevronLeftIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="M9.75 3.5 5.25 8l4.5 4.5" />
		</svg>
	);
}
