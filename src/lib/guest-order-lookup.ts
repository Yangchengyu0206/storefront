import "server-only";

/**
 * 訪客訂單查詢（SF-08 / C-24）——伺服器端呼叫 api-core 代查。
 *
 * 為什麼不直接查 Saleor：查訂單需要 MANAGE_ORDERS 權限。要嘛把全權 app token 放進
 * 對外的 storefront（它一旦被打穿，Saleor 就全開），要嘛由已經持有該權限、且不直接
 * 面向公網的 api-core 代查。選後者。
 * （實測也證實 storefront 的 SALEOR_APP_TOKEN 是空的，直接查會 PermissionDenied。）
 *
 * 這支是 server-only：`API_CORE_INTERNAL_SECRET` 絕不可以進到瀏覽器。
 */

import { type OrderLineProgressData, isCustomerDecision, isProgressStatus } from "@/lib/order-progress";
import { displayVariantName } from "@/lib/variant-name";

export interface GuestOrderLine {
	/** Saleor OrderLine global ID——會員訂單頁靠它跟 Saleor 的 lines 對上。 */
	saleorLineId: string | null;
	productName: string;
	variantName: string | null;
	quantity: number;
	quantityFulfilled: number;
	totalAmount: number;
	/** 代購採購進度；null＝不顯示（未付款／已取消，或 api-core 舊版沒回）。 */
	progress: OrderLineProgressData | null;
}

export interface GuestOrderResult {
	number: string;
	created: string | null;
	status: string;
	paymentStatus: string;
	isPaid: boolean;
	shipmentStatus: string | null;
	totalAmount: number;
	currency: string;
	lines: GuestOrderLine[];
	trackingNumbers: string[];
}

/** 同一 IP 的查詢節流，擋掉「連號訂單編號 + 常見 email」的暴力枚舉。 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function checkLookupRateLimit(clientKey: string): boolean {
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

interface ApiCoreOrder {
	number: string;
	created: string | null;
	status: string;
	payment_status: string;
	is_paid: boolean;
	shipment_status: string | null;
	total_amount: number;
	currency: string;
	tracking_numbers: string[];
	lines: {
		saleor_line_id?: string | null;
		product_name: string;
		variant_name: string | null;
		quantity: number;
		quantity_fulfilled?: number | null;
		total_amount: number;
		progress?: ApiCoreLineProgress | null;
	}[];
}

/** api-core `services/order_progress.py` 的回傳形狀（欄位白名單由 api-core 決定）。 */
interface ApiCoreLineProgress {
	status: string;
	purchase_quantity: number | null;
	expected_arrival_date: string | null;
	arrived_date: string | null;
	customer_decision: string | null;
	replacement_name: string | null;
}

function mapProgress(p: ApiCoreLineProgress | null | undefined): OrderLineProgressData | null {
	if (!p || !isProgressStatus(p.status)) return null;
	return {
		status: p.status,
		purchaseQuantity: p.purchase_quantity ?? null,
		expectedArrivalDate: p.expected_arrival_date ?? null,
		arrivedDate: p.arrived_date ?? null,
		customerDecision: isCustomerDecision(p.customer_decision) ? p.customer_decision : null,
		replacementName: p.replacement_name ?? null,
	};
}

export async function lookupGuestOrder(orderNumber: string, email: string): Promise<GuestOrderResult | null> {
	const apiBase = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!apiBase || !secret) {
		// 設定不全時不要假裝「查無此訂單」——那會讓設定問題被誤判成客人打錯字，
		// 而且沒有人會發現這個功能其實從來沒有生效過。
		throw new Error("訂單查詢尚未設定完成（缺少 API_CORE_URL 或 API_CORE_INTERNAL_SECRET）");
	}

	const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/saleor/orders/guest-lookup`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Internal-Token": secret,
		},
		body: JSON.stringify({ order_number: orderNumber, email }),
		cache: "no-store",
	});

	// api-core 對「查無訂單」與「Email 不符」都回 404，這裡一併當成 null，
	// 呼叫端顯示同一段文字。
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error("訂單查詢暫時無法使用，請稍後再試。");
	}

	const o = (await res.json()) as ApiCoreOrder;
	return {
		number: o.number,
		created: o.created,
		status: o.status,
		paymentStatus: o.payment_status,
		isPaid: o.is_paid,
		shipmentStatus: o.shipment_status,
		totalAmount: o.total_amount,
		currency: o.currency,
		trackingNumbers: o.tracking_numbers ?? [],
		lines: (o.lines ?? []).map((l) => ({
			saleorLineId: l.saleor_line_id ?? null,
			productName: l.product_name,
			// 預設變體的 name 是 global ID，不給客人看
			variantName: displayVariantName(l.variant_name),
			quantity: l.quantity,
			quantityFulfilled: l.quantity_fulfilled ?? 0,
			totalAmount: l.total_amount,
			progress: mapProgress(l.progress),
		})),
	};
}
