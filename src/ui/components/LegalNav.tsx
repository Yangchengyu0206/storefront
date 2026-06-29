"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LinkWithChannel } from "../atoms/LinkWithChannel";
import { legalHref, legalPages } from "@/lib/legal";

export function LegalNav() {
	const pathname = usePathname();

	return (
		<nav aria-label="法律資訊" className="space-y-1">
			{legalPages.map((page) => {
				const href = legalHref(page.slug);
				const isActive = pathname?.endsWith(href);
				return (
					<LinkWithChannel
						key={page.slug}
						href={href}
						aria-current={isActive ? "page" : undefined}
						className={clsx(
							"block rounded-md px-3 py-2 text-sm transition-colors",
							isActive
								? "bg-neutral-100 font-medium text-neutral-900"
								: "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
						)}
					>
						{page.title}
					</LinkWithChannel>
				);
			})}
		</nav>
	);
}
