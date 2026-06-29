import { type ReactNode } from "react";
import { LegalNav } from "@/ui/components/LegalNav";

export default function LegalLayout({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
			<div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
				<aside className="lg:sticky lg:top-24 lg:self-start">
					<h2 className="px-3 pb-2 text-sm font-semibold text-neutral-900">法律資訊</h2>
					<LegalNav />
				</aside>
				<article className="prose prose-neutral max-w-none prose-headings:scroll-mt-24 prose-h1:mb-2 prose-a:text-neutral-900">
					{children}
				</article>
			</div>
		</div>
	);
}
