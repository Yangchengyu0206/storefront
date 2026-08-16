"use client";

import clsx from "clsx";
import { type ReactElement } from "react";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import useSelectedPathname from "@/hooks/useSelectedPathname";

export function NavLink({ href, children }: { href: string; children: ReactElement | string }) {
	const pathname = useSelectedPathname();
	const isActive = pathname === href;

	return (
		<li className="inline-flex">
			<LinkWithChannel
				href={href}
				aria-current={isActive ? "page" : undefined}
				className={clsx(
					isActive
						? "border-accent text-ink-900"
						: "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-900",
					"inline-flex items-center border-b-2 pt-px text-sm font-medium transition-colors duration-150",
					"focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
				)}
			>
				{children}
			</LinkWithChannel>
		</li>
	);
}
