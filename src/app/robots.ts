import { type MetadataRoute } from "next";
import { STOREFRONT_URL } from "@/lib/env";

/**
 * robots.txt（SF-06）。
 *
 * 原本是 allow: "/" 的樣板，兩個問題：
 *   - 沒有指向 sitemap，等於爬蟲要自己慢慢爬連結才找得到商品頁
 *   - 結帳、訂單、帳戶這些頁面沒有擋。它們需要登入所以不會外流內容，
 *     但被爬到只會產生一堆 404/轉址的無效索引，稀釋掉真正該被收錄的商品頁；
 *     /orders/lookup 更是不該出現在搜尋結果裡（那頁本身也已設 noindex）。
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: [
				"/api/",
				"/checkout",
				"/*/checkout",
				"/*/orders",
				"/*/account",
				"/*/login",
				"/*/purchase-decision",
			],
		},
		sitemap: `${STOREFRONT_URL}/sitemap.xml`,
	};
}
