/**
 * Product detail placeholder.
 *
 * Without this file the segment inherits the grid skeleton from
 * `products/loading.tsx`, which would flash a product grid before a single
 * product page. The shape here mirrors the real two-column detail layout.
 */
export default function Loading() {
	return (
		<section className="mx-auto grid max-w-7xl p-8" aria-busy="true" aria-label="商品載入中">
			<div className="grid animate-pulse gap-2 sm:grid-cols-2 lg:grid-cols-8">
				<div className="md:col-span-1 lg:col-span-5">
					<div className="aspect-square rounded-card bg-ink-100" />
				</div>
				<div className="flex flex-col pt-6 sm:col-span-1 sm:px-6 sm:pt-0 lg:col-span-3 lg:pt-16">
					<div className="h-8 w-4/5 rounded-control bg-ink-100" />
					<div className="mt-4 h-5 w-28 rounded-control bg-ink-100" />
					<div className="mt-8 h-11 w-full rounded-control bg-ink-100" />
					<div className="mt-8 space-y-3">
						<div className="h-3 w-full rounded-control bg-ink-100" />
						<div className="h-3 w-11/12 rounded-control bg-ink-100" />
						<div className="h-3 w-9/12 rounded-control bg-ink-100" />
					</div>
				</div>
			</div>
		</section>
	);
}
