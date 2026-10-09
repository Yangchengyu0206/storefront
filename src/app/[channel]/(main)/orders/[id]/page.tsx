import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDate, formatMoney, getHrefForVariant } from "@/lib/utils";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { LoginForm } from "@/ui/components/LoginForm";
import { PaymentStatus } from "@/ui/components/PaymentStatus";
import { OrderLineProgress } from "@/ui/components/OrderLineProgress";
import { type GuestOrderLine, lookupGuestOrder } from "@/lib/guest-order-lookup";
import { displayVariantName } from "@/lib/variant-name";
import { isCoolingOffExcluded } from "@/lib/cooling-off";
import { findMyOrder } from "@/lib/my-order";
import { type SelfServiceStatus, getSelfServiceStatus } from "@/lib/order-self-service";
import { OrderSelfService } from "@/ui/components/OrderSelfService";

// B4-13：消費者自助訂單明細頁。重用 CurrentUserOrderList 查詢與 OrderDetails fragment。
// 2026-07-12：fragment 已擴充 status / fulfillments（trackingNumber）/ shippingAddress，
// 出貨與物流追蹤區塊上線（原為占位文字）。
export default async function OrderDetailPage(props: { params: Promise<{ id: string; channel: string }> }) {
	const params = await props.params;
	const orderId = decodeURIComponent(params.id);

	// 只能靠 `me.orders` 找訂單（Saleor `Query.order(id:)` 需要 MANAGE_ORDERS）；
	// 逐頁找的邏輯與自助取消／退換貨的 server action 共用 `lib/my-order.ts`。
	const { user, order } = await findMyOrder(orderId);

	if (!user) {
		return <LoginForm channel={params.channel} />;
	}

	if (!order) {
		notFound();
	}

	// 每一行的代購採購進度：Saleor 沒有這份資料，向 api-core 的訪客查單端點拿
	// （它讀 backend 的採購表，只回客人安全欄位）。email 一律用 server 端 `me` 的值，
	// 絕不吃 client 輸入。api-core 掛掉／沒設定／查不到（例如客人改過帳號 email）時
	// 不影響頁面，只是不顯示進度。
	const progressByLine = new Map<string, GuestOrderLine>();
	if (user.email) {
		try {
			const lookup = await lookupGuestOrder(String(order.number), user.email);
			for (const line of lookup?.lines ?? []) {
				if (line.saleorLineId) progressByLine.set(line.saleorLineId, line);
			}
		} catch (e) {
			console.warn("[orders/[id]] 讀取採購進度失敗，降級為不顯示進度", e);
		}
	}
	const hasProgress = [...progressByLine.values()].some((l) => l.progress);

	// 自助取消／退換貨：能不能做由 api-core 判定，同樣只用 server 端 `me.email`。
	// api-core 掛掉時整塊不顯示，頁尾仍有「聯絡客服」。
	let selfService: SelfServiceStatus | null = null;
	if (user.email) {
		try {
			selfService = await getSelfServiceStatus(String(order.number), user.email);
		} catch (e) {
			console.warn("[orders/[id]] 讀取自助服務狀態失敗，隱藏取消／退換貨區塊", e);
		}
	}
	const rmaLineById = new Map((selfService?.rmaLines ?? []).map((l) => [l.saleorLineId, l]));

	return (
		<div className="mx-auto max-w-5xl p-8">
			<LinkWithChannel href="/orders" className="text-sm text-ink-500 hover:text-ink-700">
				&larr; 返回我的訂單
			</LinkWithChannel>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-bold tracking-tight text-ink-900">訂單 #{order.number}</h1>
				<PaymentStatus status={order.paymentStatus} />
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-4 rounded border border-ink-100 bg-white p-4 text-sm sm:grid-cols-3">
				<div className="flex flex-col gap-1">
					<dt className="font-medium text-ink-900">下單日期</dt>
					<dd className="text-ink-600">
						<time dateTime={order.created}>{formatDate(new Date(order.created))}</time>
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt className="font-medium text-ink-900">付款狀態</dt>
					<dd className="text-ink-600">
						<PaymentStatus status={order.paymentStatus} />
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt className="font-medium text-ink-900">訂單總額</dt>
					<dd className="text-ink-900">
						{formatMoney(order.total.gross.amount, order.total.gross.currency)}
					</dd>
				</div>
			</dl>

			<div className="mt-8 rounded border border-ink-100 bg-white">
				<table className="w-full text-sm text-ink-500">
					<thead className="sr-only">
						<tr>
							<td>商品</td>
							<td>數量與單價</td>
							<td>小計</td>
						</tr>
					</thead>
					<tbody className="divide-y">
						{order.lines.map((item, idx) => {
							if (!item.variant) {
								return null;
							}
							const product = item.variant.product;
							const variantLabel = displayVariantName(item.variant.name);
							const progressLine = progressByLine.get(item.id);
							return (
								<tr key={item.id || idx}>
									<td className="py-6 pl-6 pr-6 md:w-[60%]">
										<div className="flex flex-row items-center">
											{product.thumbnail && (
												<div className="mr-4 aspect-square h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border bg-ink-50">
													<Image
														src={product.thumbnail.url}
														alt={product.thumbnail.alt ?? ""}
														width={200}
														height={200}
														className="h-full w-full object-contain object-center"
													/>
												</div>
											)}
											<div>
												<LinkWithChannel
													href={getHrefForVariant({
														productSlug: product.slug,
														variantId: item.variant.id,
													})}
													className="font-medium text-ink-900"
												>
													{product.name}
												</LinkWithChannel>
												{variantLabel && variantLabel !== item.variant.id && (
													<p className="mt-1">規格：{variantLabel}</p>
												)}
												<OrderLineProgress
													progress={progressLine?.progress}
													quantity={item.quantity}
													quantityFulfilled={item.quantityFulfilled}
												/>
											</div>
										</div>
									</td>
									<td className="py-6 pr-6 max-md:hidden">
										{item.quantity} ×{" "}
										{item.variant.pricing?.price &&
											formatMoney(
												item.variant.pricing.price.gross.amount,
												item.variant.pricing.price.gross.currency,
											)}
									</td>
									<td className="py-6 pr-6 text-end text-ink-900">
										{item.variant.pricing?.price &&
											formatMoney(
												item.variant.pricing.price.gross.amount * item.quantity,
												item.variant.pricing.price.gross.currency,
											)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				<dl className="flex justify-between border-t px-6 py-6 text-sm font-medium text-ink-900">
					<dt>總計（含運費）</dt>
					<dd>{formatMoney(order.total.gross.amount, order.total.gross.currency)}</dd>
				</dl>
			</div>

			<div className="mt-8 rounded border border-ink-100 bg-white p-6">
				<h2 className="text-sm font-semibold text-ink-900">出貨與物流追蹤</h2>
				<p className="mt-2 text-sm text-ink-600">
					出貨狀態：
					<span className="font-medium text-ink-900">{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
				</p>
				{order.shippingAddress && (
					<p className="mt-1 text-sm text-ink-600">
						收件：{order.shippingAddress.lastName}
						{order.shippingAddress.firstName}，{order.shippingAddress.postalCode} {order.shippingAddress.city}
						{order.shippingAddress.streetAddress1}
					</p>
				)}
				{order.fulfillments.length > 0 ? (
					<ul className="mt-3 divide-y text-sm">
						{order.fulfillments.map((f) => (
							<li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
								<span className="text-ink-900">{FULFILLMENT_STATUS_LABEL[f.status] ?? f.status}</span>
								{f.trackingNumber ? (
									<span className="text-ink-600">
										物流編號 / 取貨編號：
										<span className="select-all font-medium text-ink-900">{f.trackingNumber}</span>
									</span>
								) : (
									<span className="text-ink-400">尚未取得物流編號</span>
								)}
								{f.created && (
									<time dateTime={f.created} className="text-ink-400">
										{formatDate(new Date(f.created))}
									</time>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="mt-3 text-sm text-ink-400">
						{hasProgress
							? "尚未出貨。各品項的採購與到貨進度請見上方明細，到齊後會依訂單順序出貨並通知你。"
							: "尚未出貨。到貨後會依訂單順序出貨並通知你。"}
					</p>
				)}
			</div>

			{selfService && (
				<OrderSelfService
					channel={params.channel}
					orderId={order.id}
					orderNumber={String(order.number)}
					cancelMode={selfService.cancel.mode}
					cancelRequestedAt={selfService.cancel.requestedAt}
					rmaRequests={selfService.rmaRequests}
					lines={order.lines.map((line) => {
						const rma = rmaLineById.get(line.id);
						const label = displayVariantName(line.variant?.name ?? null);
						return {
							saleorLineId: line.id,
							name: line.variant?.product.name ?? "商品",
							variantLabel: label && label !== line.variant?.id ? label : null,
							quantityFulfilled: rma?.quantityFulfilled ?? line.quantityFulfilled,
							eligible: rma?.eligible ?? false,
							hasOpenRequest: rma?.hasOpenRequest ?? false,
							coolingOffExcluded: isCoolingOffExcluded(line.variant?.product.metadata),
						};
					})}
				/>
			)}

			<p className="mt-6 text-xs text-ink-400">如需協助，請聯絡客服並提供訂單編號 #{order.number}。</p>
		</div>
	);
}

// Saleor OrderStatus / FulfillmentStatus → 繁中顯示
const ORDER_STATUS_LABEL: Record<string, string> = {
	UNCONFIRMED: "待確認",
	UNFULFILLED: "備貨中",
	PARTIALLY_FULFILLED: "部分出貨",
	FULFILLED: "已出貨",
	PARTIALLY_RETURNED: "部分退貨",
	RETURNED: "已退貨",
	CANCELED: "已取消",
	EXPIRED: "已逾期",
};

const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
	FULFILLED: "已出貨",
	WAITING_FOR_APPROVAL: "待確認",
	CANCELED: "已取消",
	REFUNDED: "已退款",
	RETURNED: "已退貨",
	REPLACED: "已換貨",
	REFUNDED_AND_RETURNED: "已退款退貨",
};
