import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
	label: string;
}

export function IconButton({ label, className, type = "button", ...props }: IconButtonProps) {
	return (
		<button
			type={type}
			aria-label={label}
			title={label}
			className={clsx(
				"inline-flex size-8 shrink-0 items-center justify-center rounded-dsw-sm text-dsw-label-secondary",
				"transition-colors hover:bg-dsw-bg-layer-2 hover:text-dsw-label-primary",
				"disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}
