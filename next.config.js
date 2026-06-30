/** @type {import('next').NextConfig} */

// Security response headers applied to all routes.
// CSP is pragmatic: it must NOT break the storefront (Next.js + Saleor + ECPay + Stripe/Adyen),
// while guaranteeing the key anti-clickjacking control `frame-ancestors 'none'`.
const ContentSecurityPolicy = [
	"default-src 'self'",
	// next/image is configured with remotePatterns hostname "*", so allow any https image host + data/blob.
	"img-src 'self' data: blob: https:",
	// Next.js + Stripe/Adyen/ECPay client SDKs need inline + eval.
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self' data:",
	// GraphQL (Saleor), api-core, payment provider XHRs.
	"connect-src 'self' https:",
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
