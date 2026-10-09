"use server";

import { headers } from "next/headers";
import {
	checkDecisionRateLimit,
	DecisionUnavailableError,
	isDecisionChoice,
	looksLikeToken,
	submitPurchaseDecision,
	type PurchaseDecisionResult,
} from "@/lib/purchase-decision";

export interface DecisionState {
	error: string | null;
	result: PurchaseDecisionResult | null;
}

/** 連結失效（不存在／過期／已用／店家已處理）共用同一段文字。 */
const INVALID_MESSAGE =
	"這個連結已失效：可能已經送出過、已過期，或店家已經為您處理。如需更改請直接聯絡客服。";

const NOTE_MAX = 500;

export async function submitDecisionAction(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
	const token = formData.get("token");
	const choice = formData.get("choice");
	const note = String(formData.get("note") ?? "")
		.trim()
		.slice(0, NOTE_MAX);

	if (!isDecisionChoice(choice)) {
		return { error: "請先選擇一個處理方式。", result: null };
	}
	if (!looksLikeToken(token)) {
		return { error: INVALID_MESSAGE, result: null };
	}

	// CF-Connecting-IP 優先，否則取 XFF 最右跳（最左側可偽造）——與訪客查單同一個判斷
	const hdrs = await headers();
	const clientKey =
		hdrs.get("cf-connecting-ip")?.trim() ||
		hdrs.get("x-forwarded-for")?.split(",").pop()?.trim() ||
		"unknown";
	if (!checkDecisionRateLimit(clientKey)) {
		return { error: "操作次數過多，請稍後再試。", result: null };
	}

	try {
		const result = await submitPurchaseDecision(token, choice, note);
		return result ? { error: null, result } : { error: INVALID_MESSAGE, result: null };
	} catch (e) {
		return {
			error: e instanceof DecisionUnavailableError ? e.message : "系統暫時無法處理，請稍後再試。",
			result: null,
		};
	}
}
