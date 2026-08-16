import { type FC, type ReactNode, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: ReactNode;
	variant?: "primary" | "secondary" | "tertiary";
	ariaLabel?: string;
	ariaDisabled?: boolean;
}

export const Button: FC<ButtonProps> = ({
	label,
	className,
	variant = "primary",
	disabled = false,
	children: _children,
	type = "button",
	ariaLabel,
	ariaDisabled,
	...rest
}) => {
	const classes = clsx(
		"inline-flex h-10 items-center justify-center whitespace-nowrap rounded-control border",
		// Every control gets the same three things: a visible keyboard focus
		// ring, a smooth colour transition, and physical give on press. The
		// template shipped `active:outline-none`, which removed the only focus
		// affordance the checkout had (taste-skill §4.5).
		"transition duration-150 ease-standard",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
		"active:translate-y-px disabled:active:translate-y-0 motion-reduce:active:translate-y-0",
		{
			"bg-ink-900 hover:bg-ink-800 disabled:bg-ink-700 text-white px-4 aria-disabled:cursor-not-allowed aria-disabled:opacity-70 hover:aria-disabled:bg-ink-700":
				variant === "primary",
			"border-ink-600 hover:border-ink-700 hover:bg-ink-300 active:bg-ink-300 disabled:border-ink-300 aria-disabled:border-ink-300 bg-transparent disabled:bg-transparent aria-disabled:bg-transparent px-4":
				variant === "secondary",
			"h-auto border-none bg-transparent p-0": variant === "tertiary",
		},
		className,
	);

	return (
		<button
			aria-label={ariaLabel}
			aria-disabled={ariaDisabled}
			disabled={disabled}
			className={classes}
			type={type === "submit" ? "submit" : "button"}
			{...rest}
		>
			{typeof label === "string" ? <span className="font-semibold">{label}</span> : label}
		</button>
	);
};
