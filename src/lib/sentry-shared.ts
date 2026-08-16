/**
 * storefront 的 Sentry 共用設定（SF-07 / C-27）。
 *
 * 三個後端服務（backend / api-core / agent-service）早就接了 Sentry，唯獨對外的
 * 這個站沒有——也就是**唯一客人會看到的錯誤，我們是唯一看不到的**。付款流程壞掉、
 * 商品頁報錯，只能等客人來反映。
 *
 * 設定刻意與後端三服務對齊：
 *   - `tracesSampleRate: 0` —— 只做錯誤監控不開 tracing（免費額度留給真的錯誤）
 *   - `sendDefaultPii: false` —— 這裡是消費者網站，不要把 email / 地址送出去
 *   - 只在 production 且有 DSN 時啟用；開發時的錯誤留在 console 就好
 *
 * DSN 用 `NEXT_PUBLIC_` 前綴：瀏覽器端要用，而 DSN 本來就是設計成可公開的
 * （它只能上報，不能讀取）。與後端共用同一個專案時填同一個值即可。
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

export const sentryEnabled = process.env.NODE_ENV === "production" && SENTRY_DSN.length > 0;

/** 事件送出前把可能夾帶個資的欄位濾掉（與 backend `_scrub_before_send` 同一原則）。 */
const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "x-internal-token", "x-install-secret"]);

export function scrubEvent<T extends { request?: unknown }>(event: T): T {
	const request = event.request as
		| { headers?: Record<string, string>; cookies?: unknown; query_string?: unknown }
		| undefined;

	if (request) {
		if (request.headers) {
			for (const key of Object.keys(request.headers)) {
				if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
					request.headers[key] = "[Filtered]";
				}
			}
		}
		// cookie 帶著登入 token；query string 可能帶著重設密碼的 token 與 email
		delete request.cookies;
		if ("query_string" in request) {
			request.query_string = "[Filtered]";
		}
	}

	return event;
}

export const baseSentryOptions = {
	dsn: SENTRY_DSN,
	environment: process.env.NODE_ENV,
	// 只做錯誤監控，不開 tracing
	tracesSampleRate: 0,
	sendDefaultPii: false,
} as const;
