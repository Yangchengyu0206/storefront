import { GuestOrderLookupForm } from "./GuestOrderLookupForm";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

export const metadata = {
	title: "訂單查詢",
	description: "以訂單編號與訂購時填寫的 Email 查詢訂單進度",
	// 查詢頁沒有可收錄的內容，也不希望被搜尋引擎索引
	robots: { index: false, follow: false },
};

/**
 * 訪客訂單查詢（SF-08 / C-24）。
 *
 * 結帳本來就支援訪客，但 /orders 與 /orders/[id] 都以 `me` 為前提，未登入直接回登入表單。
 * 也就是說訪客付完錢之後，除了信箱那封確認信之外查不到任何進度——而代購的等待期特別長
 * （先賣後買 + 國際物流），客人只能私訊客服追進度，或者直接向發卡行提爭議退款。
 *
 * 查詢邏輯全部在 server side（actions.ts → lib/guest-order-lookup.ts）：
 * 用 app token 查 Saleor，Email 比對在我們這邊做，查無資料與 Email 不符回同一段文字，
 * 並以來源 IP 節流，避免這頁變成訂單編號的存在性探測器。
 */
export default async function GuestOrderLookupPage() {
	return (
		<div className="mx-auto max-w-3xl p-8">
			<h1 className="text-2xl font-bold tracking-tight text-neutral-900">訂單查詢</h1>
			<p className="mt-2 text-sm text-neutral-600">
				沒有註冊帳號也可以查詢。請輸入訂單編號與您在結帳時填寫的 Email。
			</p>

			<GuestOrderLookupForm />

			<p className="mt-8 text-sm text-neutral-500">
				已經有帳號了嗎？
				<LinkWithChannel href="/orders" className="ml-1 underline">
					登入後查看所有訂單
				</LinkWithChannel>
			</p>
		</div>
	);
}
