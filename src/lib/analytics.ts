// 行銷追蹤（GA4 + Meta Pixel）的共用小工具。
//
// 兩個 ID 都是選填的環境變數：沒設就整套不載入、下面的 track* 全部變成 no-op，
// 不會在客人的瀏覽器留下任何第三方 cookie。載入腳本的地方在 ui/components/Analytics.tsx。
//
// 只在 client 端呼叫（window.gtag / window.fbq 由 next/script 注入）；在 server 端呼叫是安全的 no-op。

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
export const ANALYTICS_ENABLED = !!(GA4_ID || META_PIXEL_ID);

type Gtag = (command: "event" | "config" | "js" | "consent" | "set", ...args: unknown[]) => void;
type Fbq = (command: "init" | "track" | "trackCustom", ...args: unknown[]) => void;

declare global {
	interface Window {
		gtag?: Gtag;
		fbq?: Fbq;
	}
}

export type AnalyticsItem = {
	id: string;
	name: string;
	price?: number | null;
	quantity?: number;
	variant?: string | null;
};

function gtag(...args: Parameters<Gtag>) {
	if (typeof window === "undefined" || !GA4_ID || typeof window.gtag !== "function") return;
	window.gtag(...args);
}

function fbq(...args: Parameters<Fbq>) {
	if (typeof window === "undefined" || !META_PIXEL_ID || typeof window.fbq !== "function") return;
	window.fbq(...args);
}

function toGaItems(items: AnalyticsItem[]) {
	return items.map((i) => ({
		item_id: i.id,
		item_name: i.name,
		...(i.variant ? { item_variant: i.variant } : {}),
		...(typeof i.price === "number" ? { price: i.price } : {}),
		quantity: i.quantity ?? 1,
	}));
}

function sumValue(items: AnalyticsItem[]) {
	return items.reduce((acc, i) => acc + (i.price ?? 0) * (i.quantity ?? 1), 0);
}

export function trackPageView(path: string) {
	gtag("event", "page_view", {
		page_location: typeof window !== "undefined" ? window.location.href : path,
		page_path: path,
		page_title: typeof document !== "undefined" ? document.title : undefined,
	});
	fbq("track", "PageView");
}

export function trackViewItem(item: AnalyticsItem, currency: string | null | undefined) {
	gtag("event", "view_item", {
		currency: currency || undefined,
		value: item.price ?? undefined,
		items: toGaItems([item]),
	});
	fbq("track", "ViewContent", {
		content_ids: [item.id],
		content_name: item.name,
		content_type: "product",
		value: item.price ?? undefined,
		currency: currency || undefined,
	});
}

export function trackAddToCart(item: AnalyticsItem, currency: string | null | undefined) {
	const value = sumValue([item]);
	gtag("event", "add_to_cart", {
		currency: currency || undefined,
		value,
		items: toGaItems([item]),
	});
	fbq("track", "AddToCart", {
		content_ids: [item.id],
		content_name: item.name,
		content_type: "product",
		value,
		currency: currency || undefined,
	});
}

export function trackPurchase(params: {
	transactionId: string;
	value: number;
	currency: string;
	shipping?: number;
	tax?: number;
	items?: AnalyticsItem[];
}) {
	const items = params.items ?? [];
	gtag("event", "purchase", {
		transaction_id: params.transactionId,
		value: params.value,
		currency: params.currency,
		...(typeof params.shipping === "number" ? { shipping: params.shipping } : {}),
		...(typeof params.tax === "number" ? { tax: params.tax } : {}),
		items: toGaItems(items),
	});
	fbq(
		"track",
		"Purchase",
		{
			value: params.value,
			currency: params.currency,
			content_ids: items.map((i) => i.id),
			content_type: "product",
			num_items: items.reduce((acc, i) => acc + (i.quantity ?? 1), 0),
		},
		// Meta 用 eventID 去重（同一張單重新整理確認頁時不重複計）。
		{ eventID: `order-${params.transactionId}` },
	);
}
