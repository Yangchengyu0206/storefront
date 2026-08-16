import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions, scrubEvent, sentryEnabled } from "@/lib/sentry-shared";

/**
 * 瀏覽器端 Sentry（SF-07 / C-27）。
 *
 * 這一半才是重點：付款元件、加入購物車、結帳表單全是 client component，
 * 它們壞掉的時候伺服器完全沒有紀錄——客人看到一個壞掉的畫面，我們什麼都不知道。
 *
 * CSP 不用改：next.config.js 的 connect-src 已經含 `https:`，涵蓋 Sentry 的上報端點。
 */
if (sentryEnabled) {
	Sentry.init({
		...baseSentryOptions,
		beforeSend: (event) => scrubEvent(event),
	});
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
