"use server";

import { revalidatePath } from "next/cache";
import { isCoolingOffExcluded } from "@/lib/cooling-off";
import { findMyOrder } from "@/lib/my-order";
import {
	type SelfServiceResult,
	checkSelfServiceRateLimit,
	submitCancel,
	submitRma,
} from "@/lib/order-self-service";

// 會員自助取消／退換貨申請。client 只傳「哪張單（Saleor order global ID）」與表單內容；
// 訂單編號、email、鑑賞期除外旗標全部在這裡由伺服器端的 Saleor session 重新取得——
// 找不到（不是你的單、沒登入）一律回同一句話。

const NOT_FOUND: SelfServiceResult = {
	ok: false,
	code: "not_found",
	message: "找不到這張訂單，請重新整理後再試。",
};
const RATE_LIMITED: SelfServiceResult = {
	ok: false,
	code: "rate_limited",
	message: "操作次數過多，請稍後再試。",
};
const UNAVAILABLE: SelfServiceResult = {
	ok: false,
	code: "error",
	message: "目前無法處理，請稍後再試或聯絡客服。",
};

async function resolveMine(orderId: string) {
	const { user, order } = await findMyOrder(orderId);
	if (!user?.email || !order) return null;
	return { email: user.email, order };
}

export async function cancelOrderAction(input: {
	channel: string;
	orderId: string;
	reason: string;
}): Promise<SelfServiceResult> {
	const mine = await resolveMine(input.orderId);
	if (!mine) return NOT_FOUND;
	if (!checkSelfServiceRateLimit(`cancel:${mine.email.toLowerCase()}`)) return RATE_LIMITED;
	try {
		const result = await submitCancel(String(mine.order.number), mine.email, input.reason.slice(0, 1000));
		revalidatePath(`/${input.channel}/orders/${encodeURIComponent(input.orderId)}`);
		return result;
	} catch (e) {
		console.error("[orders/[id]] 取消失敗", e);
		return UNAVAILABLE;
	}
}

export async function requestRmaAction(input: {
	channel: string;
	orderId: string;
	rmaType: "refund" | "exchange";
	reasonCode: string;
	note: string;
	lines: { saleorLineId: string; quantity: number }[];
}): Promise<SelfServiceResult> {
	const mine = await resolveMine(input.orderId);
	if (!mine) return NOT_FOUND;
	if (!checkSelfServiceRateLimit(`rma:${mine.email.toLowerCase()}`)) return RATE_LIMITED;

	// 鑑賞期除外（下單前已載明）由伺服器端讀商品 metadata 判定，不吃 client 傳來的旗標
	const requested = new Set(input.lines.map((l) => l.saleorLineId));
	const coolingOffExcludedLineIds = mine.order.lines
		.filter((l) => requested.has(l.id) && isCoolingOffExcluded(l.variant?.product.metadata))
		.map((l) => l.id);

	try {
		const result = await submitRma(String(mine.order.number), mine.email, {
			rmaType: input.rmaType,
			reasonCode: input.reasonCode,
			note: input.note.slice(0, 2000),
			lines: input.lines,
			coolingOffExcludedLineIds,
		});
		revalidatePath(`/${input.channel}/orders/${encodeURIComponent(input.orderId)}`);
		return result;
	} catch (e) {
		console.error("[orders/[id]] 退換貨申請失敗", e);
		return UNAVAILABLE;
	}
}
