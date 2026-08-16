import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions, scrubEvent, sentryEnabled } from "@/lib/sentry-shared";

/**
 * 伺服器端 Sentry（SF-07 / C-27）。Next.js 會在啟動時呼叫 register()。
 *
 * 刻意**不**掛 `withSentryConfig` build plugin：那個 plugin 的主要價值是上傳 source map，
 * 而上傳需要 SENTRY_AUTH_TOKEN 與 org/project 設定。沒有它錯誤照樣收得到，只是堆疊會
 * 是壓縮過的。等真的需要看到原始行號時再補設定即可——現在的目標是「錯誤不再只有客人
 * 知道」，不是完美的堆疊。
 */
export async function register() {
	if (!sentryEnabled) return;

	Sentry.init({
		...baseSentryOptions,
		beforeSend: (event) => scrubEvent(event),
	});
}

/**
 * App Router 的 server component / route handler 錯誤入口。
 * 沒有這個 hook，SSR 階段的錯誤只會停在容器 log 裡。
 */
export const onRequestError = Sentry.captureRequestError;
