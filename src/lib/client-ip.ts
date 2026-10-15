/**
 * 公開 server action 的節流鍵（訪客查單、缺貨決策、許願單）。
 *
 * storefront 部署在 Vercel（2026-09-05 定案）。CF-Connecting-IP 只有在「所有流量一定經過
 * Cloudflare 代理」時才可信——直連 Vercel（含 *.vercel.app 網址）時它是客戶端自己送的，
 * 每次換一個值就能繞過節流（2026-10-09 安全稽核待驗證線索）。所以：
 *   1. 預設用 Vercel 平台自己填的 x-real-ip / x-vercel-forwarded-for
 *   2. 只有 TRUST_CF_CONNECTING_IP=true（確定只經 Cloudflare 進來）才優先信 CF-Connecting-IP
 *   3. 都沒有才退回 X-Forwarded-For 最右跳（最左側可偽造）
 * 這只是第一層；api-core 另以被查的訂單編號／email 限制失敗次數。
 */
export function clientKeyFromHeaders(hdrs: Headers): string {
	const pick = (name: string) => hdrs.get(name)?.split(",")[0]?.trim() || "";
	if (process.env.TRUST_CF_CONNECTING_IP === "true") {
		const cf = pick("cf-connecting-ip");
		if (cf) return cf;
	}
	return (
		pick("x-real-ip") ||
		pick("x-vercel-forwarded-for") ||
		hdrs.get("x-forwarded-for")?.split(",").pop()?.trim() ||
		"unknown"
	);
}
