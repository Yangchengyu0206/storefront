// 每一行的代購採購進度（客人看的版本）。資料來自 api-core `POST /saleor/orders/guest-lookup`
// 的 `lines[].progress`，狀態對映與欄位白名單在 api-core `services/order_progress.py`。
// 這支不是 server-only：型別與文案要給 client 元件（訪客查單表單）用。

export const PROGRESS_STATUSES = [
	"shipped",
	"processing",
	"in_stock",
	"pending",
	"ordered",
	"arrived",
	"not_found",
	"substituted",
	"cancelled",
] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const CUSTOMER_DECISIONS = ["substitute", "refund", "wait"] as const;
export type CustomerDecision = (typeof CUSTOMER_DECISIONS)[number];

export interface OrderLineProgressData {
	status: ProgressStatus;
	/** 這一行要代購的件數（缺口量，可小於行數量＝部分現貨）。 */
	purchaseQuantity: number | null;
	/** YYYY-MM-DD */
	expectedArrivalDate: string | null;
	/** YYYY-MM-DD */
	arrivedDate: string | null;
	customerDecision: CustomerDecision | null;
	replacementName: string | null;
}

export function isProgressStatus(v: unknown): v is ProgressStatus {
	return typeof v === "string" && (PROGRESS_STATUSES as readonly string[]).includes(v);
}

export function isCustomerDecision(v: unknown): v is CustomerDecision {
	return typeof v === "string" && (CUSTOMER_DECISIONS as readonly string[]).includes(v);
}

/** Order.shipment_status（api-core／backend 的出貨推導）→ 客人看的文字；未知值回 null（不顯示內部字串）。 */
export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
	pending: "待處理",
	waiting_for_inventory: "等待到貨（代購／預購中）",
	ready_to_ship: "準備出貨",
	shipped: "已出貨",
	returned_to_sender: "已退回",
	returned: "已退貨",
	replaced: "已換貨",
	cancelled: "已取消",
};

export function shipmentStatusLabel(status: string | null | undefined): string | null {
	if (!status) return null;
	return SHIPMENT_STATUS_LABEL[status] ?? null;
}
