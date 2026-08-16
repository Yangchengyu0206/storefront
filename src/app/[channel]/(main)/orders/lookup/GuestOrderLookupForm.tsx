"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialLookupState, lookupOrderAction } from "./actions";
import type { GuestOrderResult } from "@/lib/guest-order-lookup";

const STATUS_LABEL: Record<string, string> = {
	UNCONFIRMED: "待確認",
	UNFULFILLED: "備貨中",
	PARTIALLY_FULFILLED: "部分出貨",
	FULFILLED: "已出貨",
	CANCELED: "已取消",
	RETURNED: "已退貨",
	PARTIALLY_RETURNED: "部分退貨",
	DRAFT: "草稿",
	EXPIRED: "已逾期",
};

const PAYMENT_LABEL: Record<string, string> = {
	NOT_CHARGED: "尚未付款",
	PENDING: "付款處理中",
	PARTIALLY_CHARGED: "部分付款",
	FULLY_CHARGED: "已付款",
	PARTIALLY_REFUNDED: "部分退款",
	FULLY_REFUNDED: "已全額退款",
	REFUSED: "付款遭拒",
	CANCELLED: "已取消",
};

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			className="rounded bg-ink-900 px-6 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
		>
			{pending ? "查詢中…" : "查詢訂單"}
		</button>
	);
}

function OrderResult({ order }: { order: GuestOrderResult }) {
	const fmt = (n: number, c: string) =>
		new Intl.NumberFormat("zh-TW", { style: "currency", currency: c }).format(n);

	return (
		<div className="mt-8 rounded border border-ink-200 bg-white p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-100 pb-4">
				<h2 className="text-lg font-semibold text-ink-900">訂單 #{order.number}</h2>
				{order.created && (
					<p className="text-sm text-ink-500">{new Date(order.created).toLocaleString("zh-TW")}</p>
				)}
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
				<div>
					<dt className="text-ink-500">訂單狀態</dt>
					<dd className="mt-1 font-medium text-ink-900">{STATUS_LABEL[order.status] ?? order.status}</dd>
				</div>
				<div>
					<dt className="text-ink-500">付款狀態</dt>
					<dd className="mt-1 font-medium text-ink-900">
						{PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
					</dd>
				</div>
				<div>
					<dt className="text-ink-500">訂單金額</dt>
					<dd className="mt-1 font-medium text-ink-900">{fmt(order.totalAmount, order.currency)}</dd>
				</div>
			</dl>

			{order.trackingNumbers.length > 0 && (
				<div className="mt-4 rounded bg-ink-50 p-3 text-sm">
					<span className="text-ink-500">物流追蹤號：</span>
					<span className="font-medium text-ink-900">{order.trackingNumbers.join("、")}</span>
				</div>
			)}

			<ul className="mt-6 divide-y divide-ink-100 border-t border-ink-100">
				{order.lines.map((line, i) => (
					<li key={`${line.productName}-${i}`} className="flex justify-between py-3 text-sm">
						<div>
							<p className="font-medium text-ink-900">{line.productName}</p>
							{line.variantName && <p className="text-ink-500">{line.variantName}</p>}
							<p className="text-ink-500">數量 {line.quantity}</p>
						</div>
						{/* 幣別在訂單層，行項不重複帶（一張訂單不會混幣別） */}
						<p className="whitespace-nowrap font-medium text-ink-900">
							{fmt(line.totalAmount, order.currency)}
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}

export function GuestOrderLookupForm() {
	const [state, formAction] = useActionState(lookupOrderAction, initialLookupState);

	return (
		<>
			<form action={formAction} className="mt-6 space-y-4">
				<div>
					<label htmlFor="orderNumber" className="block text-sm font-medium text-ink-700">
						訂單編號
					</label>
					<input
						id="orderNumber"
						name="orderNumber"
						required
						placeholder="例如 1024"
						className="mt-1 block w-full rounded border border-ink-300 px-3 py-2 text-sm focus:border-ink-500 focus:outline-none"
					/>
				</div>
				<div>
					<label htmlFor="email" className="block text-sm font-medium text-ink-700">
						訂購時填寫的 Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						placeholder="you@example.com"
						className="mt-1 block w-full rounded border border-ink-300 px-3 py-2 text-sm focus:border-ink-500 focus:outline-none"
					/>
				</div>
				<SubmitButton />
			</form>

			{state.error && (
				<p className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.error}</p>
			)}
			{state.order && <OrderResult order={state.order} />}
		</>
	);
}
