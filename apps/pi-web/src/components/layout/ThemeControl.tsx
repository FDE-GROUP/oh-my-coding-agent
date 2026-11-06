import { useEffect, useState } from "react";
import { applyTheme, readThemePreference, type ThemePreference, watchSystemTheme } from "../../lib/theme.ts";
import { IconButton } from "../primitives/IconButton.tsx";
import { MonitorIcon, MoonIcon, SunIcon } from "../primitives/icons.tsx";

const OPTIONS = [
	{ value: "system", label: "跟随系统", Icon: MonitorIcon },
	{ value: "light", label: "浅色", Icon: SunIcon },
	{ value: "dark", label: "深色", Icon: MoonIcon },
] as const;

export function ThemeControl({ collapsed }: { collapsed: boolean }) {
	const [preference, setPreference] = useState<ThemePreference>("system");

	useEffect(() => {
		const saved = readThemePreference();
		setPreference(saved);
		applyTheme(saved);
	}, []);

	useEffect(() => {
		if (preference !== "system") return;
		return watchSystemTheme(() => applyTheme("system"));
	}, [preference]);

	function select(value: ThemePreference) {
		setPreference(value);
		applyTheme(value);
	}

	if (collapsed) {
		const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0];
		return (
			<IconButton
				label={`主题：${current.label}`}
				onClick={() => {
					const index = OPTIONS.findIndex((option) => option.value === preference);
					select(OPTIONS[(index + 1) % OPTIONS.length].value);
				}}
			>
				<current.Icon />
			</IconButton>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<span className="text-xs text-dsw-label-tertiary">主题</span>
			<div className="flex rounded-dsw-sm bg-dsw-bg-layer-2 p-0.5">
				{OPTIONS.map(({ value, label, Icon }) => (
					<button
						key={value}
						type="button"
						aria-pressed={preference === value}
						title={label}
						onClick={() => select(value)}
						className={
							preference === value
								? "flex h-7 flex-1 items-center justify-center gap-1 rounded-dsw-xs bg-dsw-bg-layer-1 text-xs text-dsw-label-primary shadow-dsw-soft"
								: "flex h-7 flex-1 items-center justify-center gap-1 rounded-dsw-xs text-xs text-dsw-label-secondary hover:text-dsw-label-primary"
						}
					>
						<Icon width={14} height={14} />
						<span className="sr-only">{label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
