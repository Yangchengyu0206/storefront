import { type StorageRepository } from "@saleor/auth-sdk";

/**
 * Secure-ish browser storage for the Saleor refresh token.
 *
 * SECURITY CONTEXT (R5 / refresh-token storage hardening):
 * The @saleor/auth-sdk browser client defaults to `window.localStorage` for the
 * refresh token. localStorage is readable by any script on the page, so a single
 * XSS vulnerability lets an attacker bulk-exfiltrate the long-lived refresh token.
 *
 * The SDK's `StorageRepository` interface is strictly SYNCHRONOUS
 * (getItem/setItem/removeItem) and the refresh flow runs entirely client-side via
 * `fetchWithAuth`. A true HttpOnly cookie is, by design, NOT readable from client
 * JS, so it cannot back a synchronous client-side storage without routing every
 * token refresh through a server proxy — a large, risky change for this phase.
 *
 * As the achievable mitigation this phase we store the refresh token in a
 * first-party cookie scoped with `SameSite=Strict; Secure; Path=/`:
 *   - Not sent on cross-site requests (blunts CSRF / cross-site leakage).
 *   - Only sent over HTTPS.
 *   - Short-lived (maxAge below) so a stolen token expires sooner than the
 *     default localStorage value that lives until explicit sign-out.
 *
 * RESIDUAL RISK (documented intentionally): the cookie is still a NON-HttpOnly
 * cookie, therefore an attacker with script execution on our origin can still
 * read `document.cookie`. This is strictly better than localStorage (scoping +
 * expiry) but is NOT a complete fix. The complete fix is an HttpOnly cookie set
 * by a Next.js route handler plus a server-side refresh proxy; that is tracked as
 * a fast-follow and is deliberately out of scope here.
 */

const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const isBrowser = () => typeof document !== "undefined";

const readCookie = (name: string): string | null => {
	if (!isBrowser()) return null;
	const prefix = `${encodeURIComponent(name)}=`;
	const cookies = document.cookie ? document.cookie.split("; ") : [];
	for (const cookie of cookies) {
		if (cookie.startsWith(prefix)) {
			return decodeURIComponent(cookie.slice(prefix.length));
		}
	}
	return null;
};

const writeCookie = (name: string, value: string): void => {
	if (!isBrowser()) return;
	const secure = window.location.protocol === "https:" ? "; Secure" : "";
	document.cookie =
		`${encodeURIComponent(name)}=${encodeURIComponent(value)}` +
		`; Path=/; Max-Age=${REFRESH_COOKIE_MAX_AGE_SECONDS}; SameSite=Strict${secure}`;
};

const deleteCookie = (name: string): void => {
	if (!isBrowser()) return;
	document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Strict`;
};

/**
 * A synchronous StorageRepository backed by first-party cookies, suitable for
 * passing as `refreshTokenStorage` to `createSaleorAuthClient` in the browser.
 */
export const secureCookieStorage: StorageRepository = {
	getItem: (key: string) => readCookie(key),
	setItem: (key: string, value: string) => writeCookie(key, value),
	removeItem: (key: string) => deleteCookie(key),
};
