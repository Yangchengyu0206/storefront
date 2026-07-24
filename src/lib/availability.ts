import { type ProductListItemFragment } from "@/gql/graphql";

// 售完判定與商品詳情頁一致（products/[slug]/page.tsx）：
// 預購（metadata stock_type=preorder）一律視為可訂；其餘看 variants 是否還有 quantityAvailable。
export const isProductSoldOut = (product: ProductListItemFragment): boolean => {
	const isPreorder = product.metadata?.some((m) => m.key === "stock_type" && m.value === "preorder");
	if (isPreorder) return false;
	return !(product.variants?.some((v) => v.quantityAvailable) ?? false);
};

// 預購資訊（與詳情頁 products/[slug]/page.tsx + AvailabilityMessage 一致）：
// stock_type=preorder 為預購；lead_time_days 為到貨天數（供列表卡片顯示 ETA 角標）。
export const getPreorderInfo = (
	product: ProductListItemFragment,
): { isPreorder: boolean; leadTimeDays: number | null } => {
	const isPreorder = product.metadata?.some((m) => m.key === "stock_type" && m.value === "preorder") ?? false;
	if (!isPreorder) {
		return { isPreorder: false, leadTimeDays: null };
	}
	const raw = product.metadata?.find((m) => m.key === "lead_time_days")?.value;
	const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
	return { isPreorder: true, leadTimeDays: Number.isFinite(n) && n > 0 ? n : null };
};
