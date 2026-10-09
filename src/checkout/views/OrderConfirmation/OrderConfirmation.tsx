import { Suspense, useEffect } from "react";
import { trackPurchase, ANALYTICS_ENABLED } from "@/lib/analytics";
import { Summary, SummarySkeleton } from "@/checkout/sections/Summary";
import { OrderInfo } from "@/checkout/sections/OrderInfo";
import { useOrder } from "@/checkout/hooks/useOrder";
import { useUser } from "@/checkout/hooks/useUser";

export const OrderConfirmation = () => {
	const { order } = useOrder();
	const { user, authenticated } = useUser();

	// 行銷追蹤：GA4 purchase / Meta Purchase。同一張單只送一次（重新整理確認頁不重複計），
	// 只在訂單確實屬於目前瀏覽者（下方兩個守門都過）時送。追蹤未啟用時直接略過。
	const ownsOrder =
		!!order && !(authenticated && order.userEmail && user?.email && order.userEmail !== user.email);
	useEffect(() => {
		if (!ANALYTICS_ENABLED || !order || !ownsOrder) return;
		const key = `analytics:purchase:${order.id}`;
		try {
			if (window.localStorage.getItem(key)) return;
		} catch {
			// 無痕模式等拿不到 storage：照送，最多重複計一次。
		}
		const timer = window.setTimeout(() => {
			trackPurchase({
				transactionId: String(order.number ?? order.id),
				value: order.total?.gross?.amount ?? 0,
				currency: order.total?.gross?.currency ?? "TWD",
				shipping: order.shippingPrice?.gross?.amount,
				tax: order.total?.tax?.amount,
				items: (order.lines ?? []).map((line) => ({
					id: line.id,
					name: line.productName,
					price: line.unitPrice?.gross?.amount ?? null,
					quantity: line.quantity,
				})),
			});
			try {
				window.localStorage.setItem(key, "1");
			} catch {
				// 同上
			}
		}, 1500); // 等 afterInteractive 的追蹤腳本初始化
		return () => window.clearTimeout(timer);
	}, [order, ownsOrder]);

	// SECURITY (order IDOR): the order id comes from a URL query param, so a
	// visitor could try to view another customer's order by guessing/enumerating
	// ids. Saleor's API already scopes `order(id:)` to the owner or the matching
	// anonymous checkout session, but we add a defense-in-depth ownership check:
	// when a user is signed in, the order's userEmail MUST match theirs before we
	// render any order details. Guest orders rely on the server-side session
	// restriction (the API returns null for non-matching sessions, so `order`
	// will be undefined and we show the not-found state below).
	if (!order) {
		return (
			<main className="py-8">
				<p className="text-lg font-bold">找不到訂單</p>
				<p className="mt-2 text-base">此訂單不存在，或您沒有檢視權限。</p>
			</main>
		);
	}

	if (authenticated && order.userEmail && user?.email && order.userEmail !== user.email) {
		return (
			<main className="py-8">
				<p className="text-lg font-bold">無法檢視此訂單</p>
				<p className="mt-2 text-base">此訂單不屬於目前登入的帳號。</p>
			</main>
		);
	}

	return (
		<main className="grid grid-cols-1 gap-x-16 lg:grid-cols-2">
			<div>
				<header>
					<p className="mb-2 text-lg font-bold" data-testid="orderConfrmationTitle">
						Order #{order.number} confirmed
					</p>
					<p className="text-base">
						Thank you for placing your order. We&apos;ve received it and we will contact you as soon as your
						package is shipped. A confirmation email has been sent to {order.userEmail}.
					</p>
				</header>
				<OrderInfo />
			</div>
			<Suspense fallback={<SummarySkeleton />}>
				<Summary
					{...order}
					// for now there can only be one voucher per order in the api
					discount={order?.discounts?.find(({ type }) => type === "VOUCHER")?.amount}
					voucherCode={order?.voucher?.code}
					totalPrice={order?.total}
					subtotalPrice={order?.subtotal}
					editable={false}
				/>
			</Suspense>
		</main>
	);
};
