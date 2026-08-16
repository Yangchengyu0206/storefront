import { ProductListByCollectionDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { ProductList } from "@/ui/components/ProductList";

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata = {
	title: storeName,
	description: `${storeName}｜線上購物`,
};

export default async function Page(props: { params: Promise<{ channel: string }> }) {
	const params = await props.params;
	const data = await executeGraphQL(ProductListByCollectionDocument, {
		variables: {
			slug: "featured-products",
			channel: params.channel,
		},
		revalidate: 60,
		withAuth: false, // 公開目錄查詢不帶 cookie 認證，讓 fetch 快取生效
	});

	const products = data.collection?.products?.edges.map(({ node: product }) => product) ?? [];

	return (
		<section className="mx-auto max-w-7xl p-8 pb-16">
			<h2 className="sr-only">商品列表</h2>
			{products.length > 0 ? (
				<ProductList products={products} />
			) : (
				// The page used to `return null` here, so a store with no featured
				// collection rendered a blank white screen under the header and read
				// as a broken site (redesign-skill: "No empty states").
				<div className="flex flex-col items-center gap-3 rounded-card border border-ink-200 bg-white px-6 py-20 text-center">
					<p className="text-base font-semibold text-ink-900">目前還沒有精選商品</p>
					<p className="max-w-sm text-sm text-ink-500">
						新品上架後會出現在這裡。你可以先從上方選單瀏覽全部分類。
					</p>
				</div>
			)}
		</section>
	);
}
