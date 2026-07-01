/** @type {import('next').NextConfig} */

// Security response headers applied to all routes.
// CSP is pragmatic: it must NOT break the storefront (Next.js + Saleor + ECPay + Stripe/Adyen),
// while guaranteeing the key anti-clickjacking control `frame-ancestors 'none'`.

const isDev = process.env.NODE_ENV !== "production";

// The Saleor GraphQL endpoint the browser talks to. In prod this is https (already covered by
// the `https:` source), but in local dev it is plain http://localhost:8000 which is NOT matched
// by `'self'` (different port) nor by `https:` — so it must be allowed explicitly or every
// client-side GraphQL/checkout request is blocked by connect-src.
let saleorOrigin = "";
try {
	saleorOrigin = new URL(process.env.NEXT_PUBLIC_SALEOR_API_URL || "").origin;
} catch {
	saleorOrigin = "";
}

const connectSrc = [
	"'self'",
	"https:",
	saleorOrigin, // explicit Saleor origin (http://localhost:8000 in dev; redundant-but-harmless https in prod)
	// Local dev also needs plain-http localhost APIs + websockets for Next.js HMR/Fast Refresh.
	isDev ? "http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*" : "",
]
	.filter(Boolean)
	.join(" ");

const ContentSecurityPolicy = [
	"default-src 'self'",
	// next/image is configured with remotePatterns hostname "*", so allow any https image host + data/blob.
	// Dev also serves Saleor product media over http://localhost:8000, which `https:` does not cover.
	`img-src 'self' data: blob: https:${isDev ? " http://localhost:* http://127.0.0.1:*" : ""}`,
	// Next.js + Stripe/Adyen/ECPay client SDKs need inline + eval.
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self' data:",
	// GraphQL (Saleor), api-core, payment provider XHRs.
	`connect-src ${connectSrc}`,
	// Payment provider iframes (Stripe / Adyen) + ECPay payment pages.
	"frame-src 'self' https://js.stripe.com https://*.adyen.com https://payment.ecpay.com.tw https://payment-stage.ecpay.com.tw",
	// The key anti-clickjacking control.
	"frame-ancestors 'none'",
	"base-uri 'self'",
	// Allow form posts back to self and ECPay payment endpoints.
	"form-action 'self' https://payment.ecpay.com.tw https://payment-stage.ecpay.com.tw",
]
	.join("; ")
	.concat(";");

const securityHeaders = [
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{
		key: "X-Frame-Options",
		value: "DENY",
	},
	{
		key: "X-Content-Type-Options",
		value: "nosniff",
	},
	{
		key: "Referrer-Policy",
		value: "strict-origin-when-cross-origin",
	},
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=()",
	},
	{
		key: "Content-Security-Policy",
		value: ContentSecurityPolicy,
	},
];

const config = {
	images: {
		remotePatterns: [
			{
				hostname: "*",
			},
		],
	},
	experimental: {
		typedRoutes: false,
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: securityHeaders,
			},
		];
	},
	// used in the Dockerfile
	output:
		process.env.NEXT_OUTPUT === "standalone"
			? "standalone"
			: process.env.NEXT_OUTPUT === "export"
				? "export"
				: undefined,
};

export default config;
