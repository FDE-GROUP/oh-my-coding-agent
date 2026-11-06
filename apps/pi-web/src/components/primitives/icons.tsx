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

export function SendIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="M13.5 2.5 7.25 8.75M13.5 2.5 9.5 13.5l-2.25-4.75L2.5 6.5l11-4Z" />
		</svg>
	);
}

export function StopIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<rect x="4" y="4" width="8" height="8" rx="1.5" />
		</svg>
	);
}

export function ArrowDownIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="M8 3v9.5M3.75 8.5 8 12.75l4.25-4.25" />
		</svg>
	);
}

export function PencilIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="m10.5 2.75 2.75 2.75M2.75 13.25l.75-3 7.5-7.5 2.25 2.25-7.5 7.5-3 .75Z" />
		</svg>
	);
}

export function BellIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<path d="M4 11.5V8a4 4 0 1 1 8 0v3.5l1 1.5H3l1-1.5Z" />
			<path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
		</svg>
	);
}

export function ImageIcon(props: IconProps) {
	return (
		<svg {...base} {...props}>
			<rect x="2" y="3" width="12" height="10" rx="2" />
			<circle cx="5.75" cy="6.5" r="1" />
			<path d="m3.5 11.5 3-3 2.5 2.5 1.75-1.75 1.75 2.25" />
		</svg>
	);
}
