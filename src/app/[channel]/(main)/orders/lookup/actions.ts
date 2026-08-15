"use server";

import { headers } from "next/headers";
import { checkLookupRateLimit, lookupGuestOrder, type GuestOrderResult } from "@/lib/guest-order-lookup";

export interface LookupState {
	error: string | null;
	order: GuestOrderResult | null;
}

export const initialLookupState: LookupState = { error: null, order: null };

/** 查無資料與 Email 不符**共用同一段文字**，避免這頁變成訂單存在性探測器。 */
const NOT_FOUND_MESSAGE =
	"查不到符合的訂單。請確認訂單編號與「訂購時填寫的 Email」都正確——兩者必須屬於同一筆訂單。";

export async function lookupOrderAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
	const orderNumber = String(formData.get("orderNumber") ?? "");
	const email = String(formData.get("email") ?? "");

	if (!orderNumber.trim() || !email.trim()) {
		return { error: "請填寫訂單編號與 Email。", order: null };
	}

	// 節流以來源 IP 為單位：訂單編號是連號的，沒有節流的話配上常見 Email 就能枚舉。
	// 與 backend 的登入限流同一個判斷順序——CF-Connecting-IP 優先，否則取 XFF 最右跳
	// （最左側是呼叫端自己送的，可以偽造）。
	const hdrs = await headers();
	const clientKey =
		hdrs.get("cf-connecting-ip")?.trim() ||
		hdrs.get("x-forwarded-for")?.split(",").pop()?.trim() ||
		"unknown";
	if (!checkLookupRateLimit(clientKey)) {
		return { error: "查詢次數過多，請稍後再試。", order: null };
	}

	try {
		const order = await lookupGuestOrder(orderNumber, email);
		return order ? { error: null, order } : { error: NOT_FOUND_MESSAGE, order: null };
	} catch (e) {
		return {
			error: e instanceof Error ? e.message : "訂單查詢暫時無法使用，請稍後再試。",
			order: null,
		};
	}
}
