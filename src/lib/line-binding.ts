import "server-only";

// 客人帳號 ↔ LINE userId 的綁定（LINE 規劃第 2 階段）。
//
// 存在 api-core 的 customer_line_binding 表，經內部端點讀寫——跟訪客查訂單同一個模式
// （見 guest-order-lookup.ts）：
//   - 寫 Saleor User metadata 需要 MANAGE_USERS 的全權 app token，storefront 不持有它
//     （上 Vercel 後是對外服務，被打穿就等於 Saleor 全開）
//   - 通知與分眾群發在後台那一側查得到，不必每則訊息都問 Saleor
//
// 呼叫端負責先完成 LINE OAuth，所以寫進去的 userId 一定屬於正在操作的那個人。
//
// ⚠ LINE 的 userId 是「每個 provider 一組」。這裡拿到的是 LINE Login channel 的 userId，
//   要能推播，LINE Login channel 必須跟客人用的官方帳號（Messaging API channel）
//   在同一個 provider 底下。

export type LineLinkSource = "login" | "account";

export type LineBinding = { linked: false } | { linked: true; linkedAt: string | null };

function apiCore(): { base: string; secret: string } | null {
	const base = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!base || !secret) return null;
	return { base: base.replace(/\/$/, ""), secret };
}

async function call(method: "GET" | "PUT" | "DELETE", saleorUserId: string, body?: unknown) {
	const cfg = apiCore();
	if (!cfg) return null;
	const res = await fetch(`${cfg.base}/api/v1/customers/line-binding/${encodeURIComponent(saleorUserId)}`, {
		method,
		headers: { "Content-Type": "application/json", "X-Internal-Token": cfg.secret },
		cache: "no-store",
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!res.ok) return null;
	return (await res.json()) as { linked: boolean; linked_at?: string };
}

/** 綁定功能是否可用：要有 LINE Login channel 與 api-core 連線設定。 */
export function lineBindingAvailable(): boolean {
	return Boolean(process.env.AUTH_LINE_ID && apiCore());
}

export async function getLineBinding(saleorUserId: string): Promise<LineBinding> {
	const r = await call("GET", saleorUserId);
	return r?.linked ? { linked: true, linkedAt: r.linked_at ?? null } : { linked: false };
}

export async function setLineBinding(params: {
	saleorUserId: string;
	email: string;
	lineUserId: string;
	source: LineLinkSource;
}): Promise<boolean> {
	const r = await call("PUT", params.saleorUserId, {
		line_user_id: params.lineUserId,
		email: params.email,
		source: params.source,
	});
	return r?.linked === true;
}

export async function clearLineBinding(saleorUserId: string): Promise<boolean> {
	const r = await call("DELETE", saleorUserId);
	return r !== null;
}

/**
 * 從 Saleor 剛發的 access token 取出 user id（社群登入橋接用，那時還沒有 me）。
 * 這個 token 是本次請求中伺服器直接向 Saleor 換來的，不是外部傳進來的，所以只解碼不驗簽。
 * payload 欄位見 Saleor 3.22.16 core/jwt.py::jwt_user_payload（user_id 是 global ID）。
 */
export function saleorUserIdFromToken(token: string): string | null {
	try {
		const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as {
			user_id?: unknown;
		};
		return typeof payload.user_id === "string" ? payload.user_id : null;
	} catch {
		return null;
	}
}
