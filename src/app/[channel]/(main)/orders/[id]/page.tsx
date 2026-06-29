import Image from "next/image";
import { notFound } from "next/navigation";
import { CurrentUserOrderListDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { formatDate, formatMoney, getHrefForVariant } from "@/lib/utils";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { LoginForm } from "@/ui/components/LoginForm";
import { PaymentStatus } from "@/ui/components/PaymentStatus";

// B4-13：消費者自助訂單明細頁（原本是 TODO）。重用既有 CurrentUserOrderList 查詢與
// OrderDetails fragment（免跑 codegen 即可編譯）。
// 註：出貨/物流追蹤/退款進度等欄位需擴充 OrderDetailsFragment（status / fulfillments {
//     status, trackingNumber } / shippingAddress）並重跑 `npm run codegen` 後再補上；
//     代購預購週期長，補上物流追蹤是後續高價值增強。
export default async function OrderDetailPage(props: { params: Promise<{ id: string; channel: string }> }) {
	const params = await props.params;
	const orderId = decodeURIComponent(params.id);

	const { me: user } = await executeGraphQL(CurrentUserOrderListDocument, {
		cache: "no-cache",
	});

	if (!user) {
		return <LoginForm channel={params.channel} />;
	}

	const order = (user.orders?.edges || []).map((edge) => edge.node).find((node) => node.id === orderId);

	if (!order) {
		notFound();
	}

	return (
		<div className="mx-auto max-w-5xl p-8">
			<LinkWithChannel href="/orders" className="text-sm text-neutral-500 hover:text-neutral-700">
				&larr; 返回我的訂單
			</LinkWithChannel>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-bold tracking-tight text-neutral-900">訂單 #{order.number}</h1>
				<PaymentStatus status={order.paymentStatus} />
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-4 rounded border border-neutral-100 bg-white p-4 text-sm sm:grid-cols-3">
				<div className="flex flex-col gap-1">
					<dt className="font-medium text-neutral-900">下單日期</dt>
					<dd className="text-neutral-600">
						<time dateTime={order.created}>{formatDate(new Date(order.created))}</time>
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt className="font-medium text-neutral-900">付款狀態</dt>
					<dd className="text-neutral-600">
						<PaymentStatus status={order.paymentStatus} />
					</dd>
				</div>
				<div className="flex flex-col gap-1">
					<dt className="font-medium text-neutral-900">訂單總額</dt>
					<dd className="text-neutral-900">
						{formatMoney(order.total.gross.amount, order.total.gross.currency)}
					</dd>
				</div>
			</dl>

			<div className="mt-8 rounded border border-neutral-100 bg-white">
				<table className="w-full text-sm text-neutral-500">
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
							return (
								<tr key={item.variant.id || idx}>
									<td className="py-6 pl-6 pr-6 md:w-[60%]">
										<div className="flex flex-row items-center">
											{product.thumbnail && (
												<div className="mr-4 aspect-square h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border bg-neutral-50">
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
													className="font-medium text-neutral-900"
												>
													{product.name}
												</LinkWithChannel>
												{item.variant.name !== item.variant.id && Boolean(item.variant.name) && (
													<p className="mt-1">規格：{item.variant.name}</p>
												)}
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
									<td className="py-6 pr-6 text-end text-neutral-900">
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
				<dl className="flex justify-between border-t px-6 py-6 text-sm font-medium text-neutral-900">
					<dt>總計（含運費）</dt>
					<dd>{formatMoney(order.total.gross.amount, order.total.gross.currency)}</dd>
				</dl>
			</div>

			<p className="mt-6 text-xs text-neutral-400">
				出貨與物流追蹤進度即將上線；如需協助，請聯絡客服並提供訂單編號 #{order.number}。
			</p>
		</div>
	);
}
