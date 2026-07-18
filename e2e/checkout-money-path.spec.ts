import { expect, test, type Page } from "@playwright/test";

/**
 * 金錢路徑 E2E（真後端，無 mock）：
 *   瀏覽 → 加入購物車 → 結帳 → 填地址 → 選運送 → 發票選項（統編）→ 同意條款 → 付款按鈕
 *
 * 分兩段：
 *  1. 「結帳流程到付款按鈕」— 只依賴本機 stack（Saleor + storefront），必須全綠。
 *  2. 「跳轉 ECPay 沙盒頁」— 需要 Saleor 能呼叫 ECPay payment app（api-core），
 *     亦即 cloudflared tunnel（core.yangtech.org）在跑。預設跳過；
 *     用 `E2E_ECPAY=1 pnpm test:e2e` 開啟。到達 ECPay 付款頁即通過，不真的刷卡。
 */

const CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "default-channel";

async function addFirstProductToCart(page: Page) {
	await page.goto(`/${CHANNEL}/products`);
	await page.getByTestId("ProductElement").first().locator("a").first().click();
	await page.waitForURL(/\/products\/[^/]+/);
	const addButton = page.getByRole("button", { name: "Add to cart" });
	await expect(addButton).toBeEnabled();
	await addButton.click();
	// wait for the server action to finish — the nav cart badge turns to 1
	await expect(page.getByTestId("CartNavItem")).toContainText("1 item", { timeout: 20_000 });
	await page.goto(`/${CHANNEL}/cart`);
	await expect(page.getByTestId("CheckoutLink")).toBeVisible({ timeout: 20_000 });
	await page.getByTestId("CheckoutLink").click();
	await page.waitForURL(/\/checkout\?checkout=/);
}

async function fillContactAndAddress(page: Page) {
	const email = page.locator('input[name="email"]');
	await expect(email).toBeVisible({ timeout: 30_000 });
	await email.fill(`e2e+${Date.now()}@example.com`);

	const shipping = page.getByTestId("shippingAddressSection");
	await expect(shipping).toBeVisible();

	const fill = async (name: string, value: string) => {
		const input = shipping.locator(`input[name="${name}"]`);
		if ((await input.count()) > 0) await input.first().fill(value);
	};
	const country = shipping.locator('select[name="countryCode"]');
	if ((await country.count()) > 0) {
		await country.selectOption("TW").catch(() => {});
	}
	await fill("firstName", "測試");
	await fill("lastName", "買家");
	await fill("streetAddress1", "信義路100號");
	await fill("city", "大安區");
	await fill("postalCode", "106");
	await fill("phone", "0912345678");
	// TW countryArea renders as a <select> with Chinese county names
	const county = shipping.locator('select[name="countryArea"]');
	if ((await county.count()) > 0) {
		await county.selectOption({ label: "台北市" }).catch(async () => {
			const options = await county.locator("option").allTextContents();
			const firstReal = options.find((o) => o.trim() && !o.includes("—"));
			if (firstReal) await county.selectOption({ label: firstReal });
		});
	}
	// blur to trigger the checkout address auto-save
	await page.keyboard.press("Tab");
}

async function pickDeliveryAndInvoice(page: Page) {
	// delivery method — prefer a non-CVS option to avoid the ECPay store-picker window
	const delivery = page.getByTestId("deliveryMethods");
	await expect(delivery).toBeVisible({ timeout: 30_000 });
	const methods = delivery.locator('input[name="selectedMethodId"]');
	await expect(methods.first()).toBeAttached({ timeout: 30_000 });
	const count = await methods.count();
	let picked = false;
	for (let i = 0; i < count; i++) {
		const id = await methods.nth(i).getAttribute("id");
		const label = id ? await delivery.locator(`label[for="${id}"]`).textContent() : "";
		if (label && !label.includes("超商")) {
			await methods.nth(i).check();
			picked = true;
			break;
		}
	}
	if (!picked) await methods.first().check({ force: true });

	// invoice options: switch to 公司統編 and fill a valid tax id
	const invoice = page.getByTestId("invoiceSection");
	await expect(invoice).toBeVisible();
	await invoice.locator('input[name="invoiceType"][value="company"]').check();
	await invoice.getByPlaceholder("統一編號（8 碼數字）").fill("12345675");
	await invoice.getByPlaceholder("發票抬頭（公司名稱）").fill("測試公司");
	// wait out the 600ms debounce that writes invoice.* into checkout metadata
	await page.waitForTimeout(900);
}

async function revealPayButton(page: Page) {
	await page.getByTestId("consentCheckbox").check();
	const payButton = page.getByRole("button", { name: "前往綠界付款" });
	await expect(payButton, "付款按鈕沒出現 — 檢查 Saleor payment gateway 設定").toBeVisible({
		timeout: 30_000,
	});
	return payButton;
}

test.describe("金錢路徑", () => {
	test("結帳流程：加購 → 地址 → 運送 → 發票統編 → 付款按鈕出現", async ({ page }) => {
		await addFirstProductToCart(page);
		await fillContactAndAddress(page);
		await pickDeliveryAndInvoice(page);
		const payButton = await revealPayButton(page);
		await expect(payButton).toBeEnabled();
	});

	test("跳轉 ECPay 沙盒付款頁（需 cloudflared tunnel）", async ({ page }) => {
		test.skip(
			process.env.E2E_ECPAY !== "1",
			"需要 cloudflared tunnel（core.yangtech.org）讓 Saleor 呼叫 api-core；開啟方式：E2E_ECPAY=1",
		);
		await addFirstProductToCart(page);
		await fillContactAndAddress(page);
		await pickDeliveryAndInvoice(page);
		const payButton = await revealPayButton(page);
		await payButton.click();

		// full-page redirect to the ECPay (sandbox) cashier
		await page.waitForURL(/payment(-stage)?\.ecpay\.com\.tw/, { timeout: 45_000 }).catch(() => {
			throw new Error(
				`沒有跳轉到 ECPay。目前 URL: ${page.url()} — 檢查 cloudflared tunnel 與 api-core 是否在跑、ENVIRONMENT=local、ECPay 沙盒憑證。`,
			);
		});
		expect(page.url()).toMatch(/ecpay\.com\.tw/);
	});
});
