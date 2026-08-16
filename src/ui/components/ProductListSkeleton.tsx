/**
 * Placeholder shaped like the product grid it replaces.
 *
 * The template shipped a centred spinner for every route transition, which
 * tells the shopper nothing about what is coming and lets the page jump when
 * the real grid lands. This holds the grid's geometry so the layout settles
 * (redesign-skill: "Replace generic circular spinners with skeleton loaders
 * that match the layout shape").
 */
export function ProductListSkeleton({ count = 6 }: { count?: number }) {
	return (
		<ul
			role="list"
			aria-busy="true"
			aria-label="商品載入中"
			className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
		>
			{Array.from({ length: count }, (_, i) => (
				<li key={i} className="animate-pulse">
					<div className="aspect-square rounded-card bg-ink-100" />
					<div className="mt-3 flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<div className="h-4 w-3/4 rounded-control bg-ink-100" />
							<div className="mt-2 h-3 w-1/3 rounded-control bg-ink-100" />
						</div>
						<div className="h-4 w-16 shrink-0 rounded-control bg-ink-100" />
					</div>
				</li>
			))}
		</ul>
	);
}
