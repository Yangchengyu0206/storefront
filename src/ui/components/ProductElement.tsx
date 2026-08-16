import { LinkWithChannel } from "../atoms/LinkWithChannel";
import { ProductImageWrapper } from "@/ui/atoms/ProductImageWrapper";
import { getPreorderInfo, isProductSoldOut } from "@/lib/availability";

import type { ProductListItemFragment } from "@/gql/graphql";
import { formatMoneyRange } from "@/lib/utils";

/**
 * Product card. This is the most-rendered component on the store, so the
 * interaction work here is worth more than anywhere else.
 *
 * What changed from the template version (redesign-skill "Interactivity and
 * States"): the card had no hover, no press, and no focus treatment at all, so
 * a grid of products felt like a static printout. It now lifts on hover, the
 * photo pushes in slightly, the whole tile is a visible focus target for
 * keyboard users, and it gives under a press.
 */
export function ProductElement({
	product,
	loading,
	priority,
}: { product: ProductListItemFragment } & { loading: "eager" | "lazy"; priority?: boolean }) {
	const soldOut = isProductSoldOut(product);
	const { isPreorder, leadTimeDays } = getPreorderInfo(product);

	return (
		<li data-testid="ProductElement">
			<LinkWithChannel
				href={`/products/${product.slug}`}
				key={product.id}
				className="group block rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
			>
				<div
					className="transition duration-200 ease-standard group-hover:-translate-y-0.5 group-active:translate-y-0"
					aria-hidden={undefined}
				>
					<div className="relative overflow-hidden rounded-card bg-ink-100 shadow-card transition-shadow duration-200 ease-standard group-hover:shadow-lift">
						{product?.thumbnail?.url && (
							<ProductImageWrapper
								loading={loading}
								src={product.thumbnail.url}
								alt={product.thumbnail.alt ?? product.name}
								width={512}
								height={512}
								sizes={"(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"}
								priority={priority}
								className={soldOut ? "opacity-70 saturate-50" : undefined}
							/>
						)}
						{soldOut && (
							<span className="absolute right-2 top-2 rounded-control bg-ink-900/85 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
								已售完
							</span>
						)}
						{isPreorder && !soldOut && (
							<span className="absolute left-2 top-2 rounded-control bg-accent/95 px-2 py-1 text-xs font-medium text-accent-fg backdrop-blur-sm">
								{leadTimeDays ? `預購・約 ${leadTimeDays} 日出貨` : "預購"}
							</span>
						)}
					</div>

					{/* Name and price share a baseline so a row of cards lines up even
					    when product names wrap to different heights. */}
					<div className="mt-3 flex items-start justify-between gap-3">
						<div className="min-w-0">
							<h3
								className={`text-sm font-semibold ${
									soldOut ? "text-ink-500" : "text-ink-900"
								} transition-colors duration-200 group-hover:text-accent`}
							>
								{product.name}
							</h3>
							{product.category?.name && (
								<p className="mt-1 text-sm text-ink-500" data-testid="ProductElement_Category">
									{product.category.name}
								</p>
							)}
						</div>
						<p
							className={`tabular shrink-0 text-sm font-medium ${
								soldOut ? "text-ink-400 line-through" : "text-ink-900"
							}`}
							data-testid="ProductElement_PriceRange"
						>
							{formatMoneyRange({
								start: product?.pricing?.priceRange?.start?.gross,
								stop: product?.pricing?.priceRange?.stop?.gross,
							})}
						</p>
					</div>
				</div>
			</LinkWithChannel>
		</li>
	);
}
