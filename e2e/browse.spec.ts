import { expect, test } from "@playwright/test";

const CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "default-channel";

test.describe("Storefront browse smoke", () => {
	test("products page lists products", async ({ page }) => {
		await page.goto(`/${CHANNEL}/products`);
		const products = page.getByTestId("ProductElement");
		await expect(products.first()).toBeVisible({ timeout: 30_000 });
		expect(await products.count()).toBeGreaterThan(0);
	});

	test("product page shows price and Add to cart", async ({ page }) => {
		await page.goto(`/${CHANNEL}/products`);
		await page.getByTestId("ProductElement").first().locator("a").first().click();
		await page.waitForURL(/\/products\/[^/]+/);
		await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
	});

	test("add to cart puts the item in the cart", async ({ page }) => {
		await page.goto(`/${CHANNEL}/products`);
		await page.getByTestId("ProductElement").first().locator("a").first().click();
		await page.waitForURL(/\/products\/[^/]+/);
		const addButton = page.getByRole("button", { name: "Add to cart" });
		await expect(addButton).toBeEnabled();
		await addButton.click();
		// wait for the server action to finish — the nav cart badge turns to 1
		await expect(page.getByTestId("CartNavItem")).toContainText("1 item", { timeout: 20_000 });
		await page.goto(`/${CHANNEL}/cart`);
		await expect(page.getByTestId("CartProductList")).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId("CheckoutLink")).toBeVisible();
	});
});
