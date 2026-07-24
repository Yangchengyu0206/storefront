import { LinkWithChannel } from "../atoms/LinkWithChannel";
import { ProductImageWrapper } from "@/ui/atoms/ProductImageWrapper";
import { getPreorderInfo, isProductSoldOut } from "@/lib/availability";

import type { ProductListItemFragment } from "@/gql/graphql";
import { formatMoneyRange } from "@/lib/utils";

export function ProductElement({
	product,
	loading,
	priority,
}: { product: ProductListItemFragment } & { loading: "eager" | "lazy"; priority?: boolean }) {
	const soldOut = isProductSoldOut(product);
	const { isPreorder, leadTimeDays } = getPreorderInfo(product);
	return (
		<li data-testid="ProductElement">
			<LinkWithChannel href={`/products/${product.slug}`} key={product.id}>
				<div className={soldOut ? "opacity-60" : undefined}>
					<div className="relative">
						{product?.thumbnail?.url && (
							<ProductImageWrapper
								loading={loading}
								src={product.thumbnail.url}
								alt={product.thumbnail.alt ?? ""}
								width={512}
								height={512}
								sizes={"512px"}
								priority={priority}
							/>
						)}
						{soldOut && (
							<span className="absolute right-2 top-2 rounded bg-neutral-900/80 px-2 py-1 text-xs font-medium text-white">
								已售完
							</span>
						)}
						{isPreorder && (
							<span className="absolute left-2 top-2 rounded bg-teal-600/90 px-2 py-1 text-xs font-medium text-white">
								{leadTimeDays ? `預購・約 ${leadTimeDays} 日出貨` : "預購"}
							</span>
						)}
					</div>
					<div className="mt-2 flex justify-between">
						<div>
							<h3 className="mt-1 text-sm font-semibold text-neutral-900">{product.name}</h3>
							<p className="mt-1 text-sm text-neutral-500" data-testid="ProductElement_Category">
								{product.category?.name}
							</p>
						</div>
						<p className="mt-1 text-sm font-medium text-neutral-900" data-testid="ProductElement_PriceRange">
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
