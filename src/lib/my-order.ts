import "server-only";

import { CurrentUserOrderListDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";

/**
 * 以目前登入的 Saleor session 找「我的」某張訂單（訂單明細頁與自助取消／退換貨 server action 共用）。
 *
 * 只能靠 `me.orders` 找：Saleor 的 `Query.order(id:)` 需要 MANAGE_ORDERS（3.22.16 schema.py:191），
 * storefront 不該持有那個權限。逐頁往後找，上限 10 頁（1000 張）純粹是防呆。
 *
 * 回傳的 `user.email` 是伺服器端 session 的身分——呼叫 api-core 時一律用它，絕不吃 client 輸入。
 */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const fetchOrderPage = (after: string | null) =>
	executeGraphQL(CurrentUserOrderListDocument, {
		variables: { first: PAGE_SIZE, after },
		cache: "no-cache",
	});

type OrderListResult = Awaited<ReturnType<typeof fetchOrderPage>>;
export type MyUser = NonNullable<OrderListResult["me"]>;
export type MyOrder = NonNullable<MyUser["orders"]>["edges"][number]["node"];

export async function findMyOrder(orderId: string): Promise<{ user: MyUser | null; order: MyOrder | null }> {
	let user: OrderListResult["me"] = null;
	let after: string | null = null;

	for (let page = 0; page < MAX_PAGES; page++) {
		const result = await fetchOrderPage(after);
		user = result.me;
		if (!user) return { user: null, order: null };

		const order = (user.orders?.edges || []).map((edge) => edge.node).find((node) => node.id === orderId);
		if (order) return { user, order };

		const pageInfo = user.orders?.pageInfo;
		if (!pageInfo?.hasNextPage) break;
		after = pageInfo.endCursor ?? null;
	}
	return { user, order: null };
}
