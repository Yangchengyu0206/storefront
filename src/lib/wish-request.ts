import "server-only";

/**
 * 許願／報價單——伺服器端送到 api-core `POST /customers/wish-requests`（X-Internal-Token）。
 *
 * 客人丟「商品連結／截圖＋規格＋聯絡方式」問多少錢，老闆在後台「許願單」頁報價。
 * 不需要登入；`accountEmail` 只能由伺服器端從 Saleor session（`me.email`）帶入，
 * 表單本身沒有這個欄位——不吃 client 送來的身分。
 *
 * 與 [[guest-order-lookup]] 共用 API_CORE_URL／API_CORE_INTERNAL_SECRET，這支是 server-only：
 * secret 絕不可以進到瀏覽器。
 */

export const WISH_MAX_IMAGES = 3;
/** 瀏覽器端縮圖後的上限；api-core 另有 450KB 的硬上限（以 magic bytes 驗型別）。 */
export const WISH_MAX_IMAGE_BYTES = 400_000;

export interface WishSubmission {
	productUrl: string | null;
	description: string;
	color: string | null;
	size: string | null;
	quantity: number;
	contactName: string;
	contactEmail: string;
	contactLineId: string | null;
	accountEmail: string | null;
	imagesBase64: string[];
}

export type WishResult = { ok: true; reference: string } | { ok: false; error: string };

/** 同一 IP 的送出節流：許願單會推播給老闆，不擋的話一支腳本就能洗版。 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkWishRateLimit(clientKey: string): boolean {
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

export async function submitWishRequest(input: WishSubmission): Promise<WishResult> {
	const apiBase = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!apiBase || !secret) {
		// 設定不全不要假裝送出成功——客人會以為老闆收到了
		return { ok: false, error: "許願功能尚未設定完成，請改用 Email 或 LINE 聯絡我們。" };
	}

	try {
		const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/customers/wish-requests`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Internal-Token": secret },
			body: JSON.stringify({
				product_url: input.productUrl,
				description: input.description,
				color: input.color,
				size: input.size,
				quantity: input.quantity,
				contact_name: input.contactName,
				contact_email: input.contactEmail,
				contact_line_id: input.contactLineId,
				consent: true,
				account_email: input.accountEmail,
				images: input.imagesBase64,
			}),
			cache: "no-store",
		});
		if (res.status === 422) {
			const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
			// api-core 的 422 有兩種：我們自己的中文訊息（字串），或 pydantic 的欄位錯誤（陣列）
			return {
				ok: false,
				error: typeof body.detail === "string" ? body.detail : "有欄位格式不正確，請檢查後再送出。",
			};
		}
		if (!res.ok) {
			return { ok: false, error: "暫時無法送出，請稍後再試。" };
		}
		const data = (await res.json()) as { reference?: string };
		return { ok: true, reference: String(data.reference ?? "") };
	} catch {
		return { ok: false, error: "暫時無法送出，請稍後再試。" };
	}
}
