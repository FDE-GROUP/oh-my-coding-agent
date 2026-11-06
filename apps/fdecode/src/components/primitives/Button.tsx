import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
	primary: "bg-dsw-label-primary text-dsw-label-inverted hover:opacity-90",
	secondary: "bg-dsw-bg-layer-2 text-dsw-label-primary hover:bg-dsw-bg-layer-3",
	ghost: "text-dsw-label-secondary hover:bg-dsw-bg-layer-2 hover:text-dsw-label-primary",
};

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonProps) {
	return (
		<button
			type={type}
			className={clsx(
				"inline-flex h-10 items-center justify-center gap-1.5 rounded-dsw-sm px-3 text-sm font-medium transition-colors",
				"disabled:pointer-events-none disabled:opacity-50",
				variants[variant],
				className,
			)}
			{...props}
		/>
	);
}
