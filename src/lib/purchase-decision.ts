import "server-only";

/**
 * 缺貨自助決策連結（客人端代購 §2）——伺服器端呼叫 api-core。
 *
 * 店家在後台按「寄決策連結」，客人收到 `/{channel}/purchase-decision?t=…`。這頁的
 * server component／server action 把 token 放在 **POST body** 打 api-core
 * `/customers/purchase-decision/{view,submit}`（不放 URL：api-core 的 access log 只遮
 * `secret=`）。view 不消耗 token（email 掃描器會先打開連結），只有 submit 算數、單次使用。
 *
 * token 無效／過期／已用／店家已處理，api-core 一律回同一個 404 → 這裡回 null。
 * 這支是 server-only：`API_CORE_INTERNAL_SECRET` 絕不可以進到瀏覽器。
 */

export type DecisionChoice = "substitute" | "refund" | "wait";

const CHOICES: readonly DecisionChoice[] = ["substitute", "refund", "wait"];

export function isDecisionChoice(v: unknown): v is DecisionChoice {
	return typeof v === "string" && (CHOICES as readonly string[]).includes(v);
}

export interface PurchaseDecisionView {
	orderNumber: string | null;
	productName: string | null;
	variantName: string | null;
	quantity: number;
	choices: DecisionChoice[];
	replacementName: string | null;
	estimatedRefundAmount: number | null;
	currency: string;
	expiresDate: string | null;
}

export interface PurchaseDecisionResult {
	choice: DecisionChoice;
	orderNumber: string | null;
	productName: string | null;
	replacementName: string | null;
	estimatedRefundAmount: number | null;
	currency: string;
}

/** 同一 IP 的節流。token 有 256 位元猜不到，這裡只是擋濫打 api-core。 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

export function checkDecisionRateLimit(clientKey: string): boolean {
	const now = Date.now();
	const entry = attempts.get(clientKey);
	if (!entry || now > entry.resetAt) {
		attempts.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
		return true;
	}
	if (entry.count >= MAX_ATTEMPTS) return false;
	entry.count += 1;
	return true;
}

/** 擋掉明顯不是我們發的字串（與 api-core `looks_like_token` 同一規則），省一趟 api-core。 */
export function looksLikeToken(token: unknown): token is string {
	return typeof token === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(token);
}

export class DecisionUnavailableError extends Error {}

async function callApiCore(path: "view" | "submit", body: Record<string, unknown>): Promise<unknown> {
	const apiBase = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!apiBase || !secret) {
		// 設定不全不要假裝「連結失效」——那會讓設定問題被誤判成客人的連結過期。
		throw new DecisionUnavailableError("此功能尚未設定完成，請直接聯絡客服。");
	}
	const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/customers/purchase-decision/${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Internal-Token": secret },
		body: JSON.stringify(body),
		cache: "no-store",
	});
	if (res.status === 404) return null;
	if (res.status === 422) throw new DecisionUnavailableError("這個商品不提供這個選項，請重新選擇。");
	if (!res.ok) throw new DecisionUnavailableError("系統暫時無法處理，請稍後再試。");
	return res.json();
}

interface ApiView {
	order_number: string | null;
	product_name: string | null;
	variant_name: string | null;
	quantity: number;
	choices: string[];
	replacement_name: string | null;
	estimated_refund_amount: number | null;
	currency: string | null;
	expires_date: string | null;
}

interface ApiResult {
	choice: string;
	order_number: string | null;
	product_name: string | null;
	replacement_name: string | null;
	estimated_refund_amount: number | null;
	currency: string | null;
}

export async function viewPurchaseDecision(token: string): Promise<PurchaseDecisionView | null> {
	const v = (await callApiCore("view", { token })) as ApiView | null;
	if (!v) return null;
	return {
		orderNumber: v.order_number,
		productName: v.product_name,
		variantName: v.variant_name,
		quantity: v.quantity,
		choices: (v.choices ?? []).filter(isDecisionChoice),
		replacementName: v.replacement_name,
		estimatedRefundAmount: v.estimated_refund_amount,
		currency: v.currency || "TWD",
		expiresDate: v.expires_date,
	};
}

export async function submitPurchaseDecision(
	token: string,
	choice: DecisionChoice,
	note: string,
): Promise<PurchaseDecisionResult | null> {
	const r = (await callApiCore("submit", { token, choice, note: note || null })) as ApiResult | null;
	if (!r || !isDecisionChoice(r.choice)) return null;
	return {
		choice: r.choice,
		orderNumber: r.order_number,
		productName: r.product_name,
		replacementName: r.replacement_name,
		estimatedRefundAmount: r.estimated_refund_amount,
		currency: r.currency || "TWD",
	};
}
