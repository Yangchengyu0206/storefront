import { Logo } from "./Logo";
import { Nav } from "./nav/Nav";

export function Header({ channel }: { channel: string }) {
	return (
		// The translucent bar had no edge, so it dissolved into pale product
		// photography as the page scrolled under it. A hairline plus a stronger
		// scrim keeps it readable without adding weight.
		<header className="sticky top-0 z-20 border-b border-ink-200/70 bg-ink-50/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink-50/70">
			<div className="mx-auto max-w-7xl px-3 sm:px-8">
				<div className="flex h-16 justify-between gap-4 md:gap-8">
					<Logo />
					<Nav channel={channel} />
				</div>
			</div>
		</header>
	);
}
