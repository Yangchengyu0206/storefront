import { type MetadataRoute } from "next";
import { DefaultChannelSlug } from "@/app/config";
import {
	SitemapCategoriesDocument,
	type SitemapCategoriesQuery,
	SitemapProductsDocument,
	type SitemapProductsQuery,
} from "@/gql/graphql";
import { STOREFRONT_URL } from "@/lib/env";
import { executeGraphQL } from "@/lib/graphql";
import { legalHref, legalPages } from "@/lib/legal";

/**
 * sitemap.xml（SF-06）。
 *
 * 在這之前整站沒有 sitemap。搭配 canonical 一起看才知道問題有多具體：
 * canonical 先前指向 404（SF-05，已修），而沒有 sitemap 就代表 Google 只能靠爬連結
 * 慢慢發現商品頁——對一個剛上線、外部連結是零的站，實務上等於不會被收錄。
 *
 * 每頁 100 筆往後翻，上限 50 頁（5000 個商品）。之所以設上限：sitemap 是 build/請求
 * 時同步產生的，商品真的長到那個量級時應該改成分割 sitemap，而不是讓這支無聲地
 * 跑上幾十秒。到達上限時會 warn，不會靜靜地少收錄一半。
 */

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

// 一天重算一次就夠。
// ⚠️ 必須是字面量：Next.js 用靜態分析讀這個 export，寫成 `60 * 60 * 24` 會在 build 時
// 報 `Unsupported node type "BinaryExpression"`（實際踩過）。
export const revalidate = 86400;

async function collectProducts(): Promise<{ slug: string; updatedAt?: string | null }[]> {
	const out: { slug: string; updatedAt?: string | null }[] = [];
	let after: string | null = null;

	for (let page = 0; page < MAX_PAGES; page++) {
		// 明寫回傳型別：`after` 是從這次結果算出來、又餵回下一次呼叫的，
		// 不標註的話 TS 會判定循環推導（TS7022）。
		const result: SitemapProductsQuery = await executeGraphQL(SitemapProductsDocument, {
			variables: { first: PAGE_SIZE, after, channel: DefaultChannelSlug },
			revalidate,
			withAuth: false,
		});
		const products = result.products;
		if (!products) break;

		for (const edge of products.edges) {
			out.push({ slug: edge.node.slug, updatedAt: edge.node.updatedAt });
		}

		if (!products.pageInfo.hasNextPage) return out;
		after = products.pageInfo.endCursor ?? null;
	}

	console.warn(
		`[sitemap] 商品數超過 ${PAGE_SIZE * MAX_PAGES} 筆，後面的沒有列進 sitemap。` +
			"到這個量級應該改成分割 sitemap（sitemap index）。",
	);
	return out;
}

async function collectCategories(): Promise<string[]> {
	const out: string[] = [];
	let after: string | null = null;

	for (let page = 0; page < MAX_PAGES; page++) {
		const result: SitemapCategoriesQuery = await executeGraphQL(SitemapCategoriesDocument, {
			variables: { first: PAGE_SIZE, after },
			revalidate,
			withAuth: false,
		});
		const categories = result.categories;
		if (!categories) break;

		out.push(...categories.edges.map((edge) => edge.node.slug));

		if (!categories.pageInfo.hasNextPage) break;
		after = categories.pageInfo.endCursor ?? null;
	}
	return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = `${STOREFRONT_URL}/${DefaultChannelSlug}`;

	const [products, categories] = await Promise.all([collectProducts(), collectCategories()]);

	return [
		{ url: base, changeFrequency: "daily", priority: 1 },
		// 法務頁不常變但要能被查到（消保法要求可供查詢）
		...legalPages.map((page) => ({
			url: `${STOREFRONT_URL}${legalHref(page.slug)}`,
			changeFrequency: "yearly" as const,
			priority: 0.3,
		})),
		...categories.map((slug) => ({
			url: `${base}/categories/${encodeURIComponent(slug)}`,
			changeFrequency: "weekly" as const,
			priority: 0.6,
		})),
		...products.map((product) => ({
			url: `${base}/products/${encodeURIComponent(product.slug)}`,
			lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
			changeFrequency: "weekly" as const,
			priority: 0.8,
		})),
	];
}
