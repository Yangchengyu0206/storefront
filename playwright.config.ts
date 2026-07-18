import { defineConfig, devices } from "@playwright/test";

/**
 * Storefront E2E — real end-to-end against the local stack (NO API mocks).
 *
 * Prerequisites (all must be running):
 *   - saleor-platform (Saleor GraphQL on :8000)
 *   - full-stack api-core (:8002) reachable from Saleor for ECPay payment
 *     (production tunnel: cloudflared `ops-tunnel` → core.yangtech.org)
 *   - full-stack .env has ECPay SANDBOX credentials + ENVIRONMENT=local
 *
 * Run: pnpm test:e2e
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 90_000,
	reporter: process.env.CI ? "line" : [["line"], ["html", { open: "never" }]],
	use: {
		baseURL: process.env.STOREFRONT_URL || "http://localhost:3000",
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: true,
		timeout: 240_000,
	},
});
