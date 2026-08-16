import "server-only";

/**
 * 運費揭露資訊（SF-12 / C-30）——伺服器端向 api-core 取後台設定。
 *
 * 為什麼要：購物車原本只寫「運費將於下一步計算」，也就是客人得先把地址與付款方式
 * 全部填完才知道總共要付多少。運費不透明是購物車放棄率最主要的成因之一，而這個站
 * 賣的是代購，客人本來就已經在忍受長等待期，不該再加一個「不知道要付多少」。
 *
 * 為什麼不查 Saleor：運費與免運門檻雖然會被推到 Saleor 的 shipping method channel
 * listing，但讀那些資料需要 MANAGE_SHIPPING；真相源本來就在我們自己的 shop_setting。
 * 與訪客訂單查詢（[[guest-order-lookup]]）走同一條 api-core 內部通道，共用同兩個 env。
 *
 * 取不到就回 null，呼叫端一律降級成「不顯示」——運費是會影響客人決策的數字，
 * 寧可維持原本的「下一步計算」，也不要顯示一個可能過期或猜出來的金額。
 */

export interface ShippingInfo {
	currency: string;
	feeCvs: number;
	feeHome: number;
	/** 0 代表沒有設定滿額免運；呼叫端此時不得顯示任何免運文案。 */
	freeThreshold: number;
}

interface ApiCoreShippingInfo {
	currency: string;
	fee_cvs: number;
	fee_home: number;
	free_threshold: number;
}

export async function getShippingInfo(): Promise<ShippingInfo | null> {
	const apiBase = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!apiBase || !secret) return null;

	try {
		const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/saleor/shop/shipping-info`, {
			headers: { "X-Internal-Token": secret },
			// 運費不常改，但改了要快點反映（後台存檔後最多 5 分鐘）
			next: { revalidate: 300 },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as ApiCoreShippingInfo;
		return {
			currency: data.currency,
			feeCvs: data.fee_cvs,
			feeHome: data.fee_home,
			freeThreshold: data.free_threshold,
		};
	} catch {
		return null;
	}
}
