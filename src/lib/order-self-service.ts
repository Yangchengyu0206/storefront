import "server-only";

/**
 * 會員自助：取消未付款訂單／申請取消已付款訂單／申請退換貨——伺服器端呼叫 api-core
 * `/customers/orders/{status,cancel,rma}`（X-Internal-Token）。
 *
 * 身分：呼叫端一律傳伺服器端 session 的 `me.email`（見 `lib/my-order.ts`），api-core 再用
 * 「訂單編號 + email」比對，查無與不符回同一個 404。`API_CORE_INTERNAL_SECRET` 絕不可進瀏覽器。
 * 對外經 Cloudflare Tunnel，api-core 端已放行 `customers/orders/(status|cancel|rma)`。
 */

export type CancelMode = "cancel" | "request" | "requested" | "contact" | "none";

export interface SelfServiceRmaRequest {
	rmaType: "refund" | "exchange";
	status: string;
	createdDate: string | null;
	lines: { saleorLineId: string | null; name: string | null; quantity: number }[];
}

export interface SelfServiceStatus {
	cancel: { mode: CancelMode; requestedAt: string | null };
	rmaLines: { saleorLineId: string; quantityFulfilled: number; hasOpenRequest: boolean; eligible: boolean }[];
	rmaRequests: SelfServiceRmaRequest[];
}

export type SelfServiceResult =
	| { ok: true; result: "cancelled" | "requested"; requestedAt?: string | null }
	| { ok: false; code: string; message: string };

/** 同一個帳號的寫入節流（單行程記憶體，與訪客查單同款），擋連點與腳本灌單。 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function checkSelfServiceRateLimit(key: string): boolean {
	const now = Date.now();
	const entry = attempts.get(key);
	if (!entry || now > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return true;
	}
	if (entry.count >= MAX_ATTEMPTS) return false;
	entry.count += 1;
	return true;
}

function apiConfig(): { base: string; secret: string } {
	const apiBase = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!apiBase || !secret) {
		throw new Error("自助服務尚未設定完成（缺少 API_CORE_URL 或 API_CORE_INTERNAL_SECRET）");
	}
	return { base: apiBase.replace(/\/$/, ""), secret };
}

async function post(path: string, body: Record<string, unknown>): Promise<Response> {
	const { base, secret } = apiConfig();
	return fetch(`${base}/api/v1/customers/orders/${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Internal-Token": secret },
		body: JSON.stringify(body),
		cache: "no-store",
	});
}

interface ApiStatus {
	cancel: { mode: CancelMode; requested_at: string | null };
	rma: {
		lines: {
			saleor_line_id: string;
			quantity_fulfilled: number;
			has_open_request: boolean;
			eligible: boolean;
		}[];
		requests: {
			rma_type: "refund" | "exchange";
			status: string;
			created_date: string | null;
			lines: { saleor_line_id: string | null; name: string | null; quantity: number }[];
		}[];
	};
}

/** 查無／不符回 null（頁面就不顯示自助區塊）。 */
export async function getSelfServiceStatus(
	orderNumber: string,
	email: string,
): Promise<SelfServiceStatus | null> {
	const res = await post("status", { order_number: orderNumber, email });
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`self-service status ${res.status}`);
	const s = (await res.json()) as ApiStatus;
	return {
		cancel: { mode: s.cancel.mode, requestedAt: s.cancel.requested_at ?? null },
		rmaLines: (s.rma?.lines ?? []).map((l) => ({
			saleorLineId: l.saleor_line_id,
			quantityFulfilled: l.quantity_fulfilled,
			hasOpenRequest: l.has_open_request,
			eligible: l.eligible,
		})),
		rmaRequests: (s.rma?.requests ?? []).map((r) => ({
			rmaType: r.rma_type,
			status: r.status,
			createdDate: r.created_date,
			lines: (r.lines ?? []).map((l) => ({
				saleorLineId: l.saleor_line_id,
				name: l.name,
				quantity: l.quantity,
			})),
		})),
	};
}

const GENERIC_ERROR = "目前無法處理，請稍後再試或聯絡客服。";

async function toResult(res: Response): Promise<SelfServiceResult> {
	if (res.ok) {
		const body = (await res.json()) as { result: "cancelled" | "requested"; requested_at?: string | null };
		return { ok: true, result: body.result, requestedAt: body.requested_at ?? null };
	}
	if (res.status === 409) {
		const body = (await res.json().catch(() => ({}))) as { code?: string; detail?: string };
		return { ok: false, code: body.code ?? "conflict", message: body.detail ?? GENERIC_ERROR };
	}
	if (res.status === 404) return { ok: false, code: "not_found", message: "找不到這張訂單。" };
	return { ok: false, code: "error", message: GENERIC_ERROR };
}

export async function submitCancel(
	orderNumber: string,
	email: string,
	reason: string,
): Promise<SelfServiceResult> {
	return toResult(await post("cancel", { order_number: orderNumber, email, reason }));
}

export async function submitRma(
	orderNumber: string,
	email: string,
	input: {
		rmaType: "refund" | "exchange";
		reasonCode: string;
		note: string;
		lines: { saleorLineId: string; quantity: number }[];
		coolingOffExcludedLineIds: string[];
	},
): Promise<SelfServiceResult> {
	return toResult(
		await post("rma", {
			order_number: orderNumber,
			email,
			rma_type: input.rmaType,
			reason_code: input.reasonCode,
			note: input.note,
			lines: input.lines.map((l) => ({ saleor_line_id: l.saleorLineId, quantity: l.quantity })),
			cooling_off_excluded_line_ids: input.coolingOffExcludedLineIds,
		}),
	);
}
