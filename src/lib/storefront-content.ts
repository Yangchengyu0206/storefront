import "server-only";

/**
 * 前台公告列與首頁 Banner——伺服器端向 api-core 取後台「商店設定 → 前台公告與版位」。
 *
 * 走的是既有的 `GET /saleor/shop/shipping-info`（api-core 在同一個回應裡多帶
 * `announcement`／`banners`）：那條路徑本來就在 Cloudflare Tunnel 的 storefront 白名單裡，
 * 不必為了唯讀的版位資料再開一條公開路徑。與 [[shipping-info]] 共用同兩個 env。
 *
 * 取不到（api-core 掛了、設定不全、逾時）一律回「什麼都不顯示」——公告是加值，
 * 不能因為它讓整個商店的版面跟著壞掉。
 */

export interface Announcement {
	text: string;
	/** 站內路徑（/ 開頭）或 http(s) 網址；api-core 已濾掉其他格式。 */
	link: string | null;
	/** 內容指紋：客人關掉後，內容一改就重新出現。 */
	version: string;
}

export interface HomeBanner {
	imageUrl: string;
	title: string;
	link: string | null;
}

export interface StorefrontContent {
	announcement: Announcement | null;
	banners: HomeBanner[];
}

interface ApiCoreContent {
	announcement?: { text?: string; link?: string | null; version?: string } | null;
	banners?: { image_url?: string; title?: string; link?: string | null }[] | null;
}

const EMPTY: StorefrontContent = { announcement: null, banners: [] };

/** 前端再擋一次：只接受站內路徑或 http(s)，其餘一律當沒有連結。 */
export function safeHref(raw: string | null | undefined): string | null {
	const link = (raw ?? "").trim();
	if (!link) return null;
	if (link.startsWith("/") && !link.startsWith("//")) return link;
	if (/^https?:\/\//i.test(link)) return link;
	return null;
}

export async function getStorefrontContent(): Promise<StorefrontContent> {
	const apiBase = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!apiBase || !secret) return EMPTY;

	try {
		const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/saleor/shop/shipping-info`, {
			headers: { "X-Internal-Token": secret },
			// 後台改公告要很快反映；與 getShippingInfo 同一個 URL、同一個快取週期
			next: { revalidate: 60 },
			// 每一頁的版面都會等它，api-core 卡住時不能把整站拖慢
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) return EMPTY;
		const data = (await res.json()) as ApiCoreContent;

		const a = data.announcement;
		const announcement: Announcement | null =
			a && typeof a.text === "string" && a.text.trim()
				? {
						text: a.text.trim(),
						link: safeHref(a.link),
						version: String(a.version ?? "")
							.replace(/[^a-zA-Z0-9-]/g, "")
							.slice(0, 64),
					}
				: null;

		const banners: HomeBanner[] = (Array.isArray(data.banners) ? data.banners : [])
			.filter((b) => typeof b?.image_url === "string" && /^https?:\/\//i.test(b.image_url))
			.slice(0, 3)
			.map((b) => ({
				imageUrl: b.image_url as string,
				title: (b.title ?? "").trim(),
				link: safeHref(b.link),
			}));

		return { announcement, banners };
	} catch {
		return EMPTY;
	}
}
