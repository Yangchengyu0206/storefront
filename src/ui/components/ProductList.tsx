import { ProductElement } from "./ProductElement";
import { type ProductListItemFragment } from "@/gql/graphql";
import { isProductSoldOut } from "@/lib/availability";

export const ProductList = ({ products }: { products: readonly ProductListItemFragment[] }) => {
	// 售完商品排序至底（穩定排序，原有順序在各分組內保留）
	const sorted = [...products].sort((a, b) => Number(isProductSoldOut(a)) - Number(isProductSoldOut(b)));
	return (
		<ul
			role="list"
			data-testid="ProductList"
			className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
		>
			{sorted.map((product, index) => (
				<ProductElement
					key={product.id}
					product={product}
					priority={index < 2}
					loading={index < 3 ? "eager" : "lazy"}
				/>
			))}
		</ul>
	);
};
