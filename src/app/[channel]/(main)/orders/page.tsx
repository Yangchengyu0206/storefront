import { CurrentUserOrderListDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { getPaginatedListVariables } from "@/lib/utils";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { LoginForm } from "@/ui/components/LoginForm";
import { OrderListItem } from "@/ui/components/OrderListItem";
import { Pagination } from "@/ui/components/Pagination";

export default async function OrderPage({
	params,
	searchParams,
}: {
	params: Promise<{ channel: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { channel } = await params;

	// 訂單歷史要分頁（SF-09）。原本寫死 `orders(first: 10)` 且沒有任何翻頁入口——
	// 熟客下滿 10 單之後，第 11 單起就從自己的訂單列表上消失了，而畫面上完全看不出
	// 還有更多。代購的回購率本來就高，這個上限很快就會踩到。
	const paginationVariables = getPaginatedListVariables({ params: await searchParams });

	const { me: user } = await executeGraphQL(CurrentUserOrderListDocument, {
		variables: paginationVariables,
		cache: "no-cache",
	});

	if (!user) {
		// 訪客結帳是支援的，所以「沒有帳號」不等於「不能查訂單」。
		// 只給登入表單的話，訪客付完錢就再也查不到進度（SF-08）。
		return (
			<>
				<LoginForm channel={channel} />
				<p className="mx-auto mt-6 max-w-md text-center text-sm text-neutral-600">
					以訪客身分結帳、沒有註冊帳號嗎？
					<LinkWithChannel href="/orders/lookup" className="ml-1 underline">
						用訂單編號與 Email 查詢
					</LinkWithChannel>
				</p>
			</>
		);
	}

	const orders = user.orders?.edges || [];
	const pageInfo = user.orders?.pageInfo;

	return (
		<div className="mx-auto max-w-7xl p-8">
			<h1 className="text-2xl font-bold tracking-tight text-neutral-900">
				{user.firstName ? user.firstName : user.email} 的訂單
			</h1>

			{orders.length === 0 ? (
				<div className="mt-8">
					<div className="rounded border border-neutral-100 bg-white p-4">
						<div className="flex items-center">目前沒有任何訂單</div>
					</div>
				</div>
			) : (
				<>
					<ul className="mt-8 space-y-6">
						{orders.map(({ node: order }) => {
							return <OrderListItem order={order} key={order.id} />;
						})}
					</ul>
					{pageInfo && (pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
						<Pagination pageInfo={pageInfo} />
					)}
				</>
			)}
		</div>
	);
}
