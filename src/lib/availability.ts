import { type ProductListItemFragment } from "@/gql/graphql";

// 售完判定與商品詳情頁一致（products/[slug]/page.tsx）：
// 預購（metadata stock_type=preorder）一律視為可訂；其餘看 variants 是否還有 quantityAvailable。
export const isProductSoldOut = (product: ProductListItemFragment): boolean => {
	const isPreorder = product.metadata?.some((m) => m.key === "stock_type" && m.value === "preorder");
	if (isPreorder) return false;
	return !(product.variants?.some((v) => v.quantityAvailable) ?? false);
};
