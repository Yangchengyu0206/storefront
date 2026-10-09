/**
 * ATM 虛擬帳號／超商代碼的待繳費資訊。
 *
 * 客人在綠界選 ATM 或超商代碼取號後，api-core 會替他完成結帳，並把繳費資訊寫進
 * 訂單的「公開」metadata（full-stack api-core `deferred_payment.payment_metadata`）。
 * key 前綴與欄位名稱兩邊必須一致，改名要一起改。
 */

export const PAYMENT_META_PREFIX = "ecpay_payment.";

export type PaymentPending = {
	method: "ATM" | "CVS" | "BARCODE";
	bankCode?: string;
	vaccount?: string;
	paymentNo?: string;
	expireDate?: string;
	amount?: string;
	currency?: string;
};

type MetadataItem = { key: string; value: string } | null | undefined;

/** 已付清（或溢付）就不再顯示繳費資訊。 */
export const isSettled = (chargeStatus?: string | null, isPaid?: boolean | null) =>
	!!isPaid || chargeStatus === "FULL" || chargeStatus === "OVERCHARGED";

export function parsePaymentPending(metadata?: ReadonlyArray<MetadataItem> | null): PaymentPending | null {
	const meta: Record<string, string> = {};
	for (const item of metadata ?? []) {
		if (item?.key?.startsWith(PAYMENT_META_PREFIX)) {
			meta[item.key.slice(PAYMENT_META_PREFIX.length)] = item.value;
		}
	}
	const method = (meta.method || "").toUpperCase();
	if (method === "ATM" && meta.vaccount) {
		return {
			method: "ATM",
			bankCode: meta.bank_code,
			vaccount: meta.vaccount,
			expireDate: meta.expire_date,
			amount: meta.amount,
			currency: meta.currency,
		};
	}
	if ((method === "CVS" || method === "BARCODE") && meta.payment_no) {
		return {
			method,
			paymentNo: meta.payment_no,
			expireDate: meta.expire_date,
			amount: meta.amount,
			currency: meta.currency,
		};
	}
	return null;
}
