import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderDirection, ProductOrderField, SearchProductsDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { Pagination } from "@/ui/components/Pagination";
import { ProductList } from "@/ui/components/ProductList";
import { getPaginatedListVariables } from "@/lib/utils";

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata = {
	title: `搜尋商品 · ${storeName}`,
	description: `在${storeName}搜尋商品`,
};

export default async function Page(props: {
	searchParams: Promise<Record<"query" | "cursor" | "direction", string | string[] | undefined>>;
	params: Promise<{ channel: string }>;
}) {
	const [searchParams, params] = await Promise.all([props.searchParams, props.params]);

	const searchValue = searchParams.query;

	if (!searchValue) {
		notFound();
	}

	if (Array.isArray(searchValue)) {
		const firstValidSearchValue = searchValue.find((v) => v.length > 0);
		if (!firstValidSearchValue) {
			notFound();
		}
		// 少了 channel 前綴會轉到 404（與 canonical 同一根因）。
		redirect(`/${params.channel}/search?${new URLSearchParams({ query: firstValidSearchValue }).toString()}`);
	}

	const paginationVariables = getPaginatedListVariables({ params: searchParams });

	const { products } = await executeGraphQL(SearchProductsDocument, {
		variables: {
			search: searchValue,
			channel: params.channel,
			// 搜尋結果依相關度排序（SF-10）。
			// 原本是 RATING + ASC——評分**由低到高**，也就是把最差的排在最前面；
			// 而這個商品庫根本沒有評分資料，實際效果是「以一個全為 null 的欄位排序」＝
			// 順序等同隨機。客人搜尋後看到的第一批商品跟他打的字沒有關係。
			// RANK 是 Saleor 專為 search 提供的相關度分數（sorters.py: RANK = search_rank），
			// 分數越高越相關，所以要 DESC。
			sortBy: ProductOrderField.Rank,
			sortDirection: OrderDirection.Desc,
			...paginationVariables,
		},
		revalidate: 60,
		withAuth: false, // 公開搜尋不帶 cookie 認證，讓 fetch 快取生效
	});

	if (!products) {
		notFound();
	}

	return (
		<section className="mx-auto max-w-7xl p-8 pb-16">
			{products.totalCount && products.totalCount > 0 ? (
				<div>
					<h1 className="pb-8 text-xl font-semibold">「{searchValue}」的搜尋結果</h1>
					<ProductList products={products.edges.map((e) => e.node)} />
					<Pagination pageInfo={products.pageInfo} />
				</div>
			) : (
				<div className="mx-auto max-w-lg py-16 text-center">
					<h1 className="text-xl font-semibold">找不到「{searchValue}」的相關商品</h1>
					<p className="mt-3 text-sm text-ink-600">
						可以試試看更簡短的關鍵字，或是換個說法（例如只打品牌或品項名稱）。
					</p>
					<div className="mt-8 rounded-card border border-ink-200 bg-white p-6">
						<p className="text-sm font-medium text-ink-900">店裡沒有？我們可以幫您找</p>
						<p className="mt-1 text-sm text-ink-600">丟商品連結或截圖給我們，確認貨源後用 Email 回覆報價。</p>
						<Link
							href={`/${encodeURIComponent(params.channel)}/wish?${new URLSearchParams({
								q: searchValue,
							}).toString()}`}
							className="mt-4 inline-block rounded-control bg-ink-900 px-5 py-2 text-sm font-medium text-white hover:bg-ink-800"
						>
							許願／詢價
						</Link>
					</div>
				</div>
			)}
		</section>
	);
}
