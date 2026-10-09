import { PurchaseDecisionForm } from "./PurchaseDecisionForm";
import { DecisionUnavailableError, looksLikeToken, viewPurchaseDecision } from "@/lib/purchase-decision";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "缺貨商品處理方式",
	// 一次性個人連結：不收錄、也不要把帶 token 的網址經 Referer 送到別的網站
	robots: { index: false, follow: false },
	referrer: "no-referrer" as const,
};

/**
 * 缺貨自助決策（客人端代購 §2）。
 *
 * 代購「先賣後買」買不到時，原本只能等客服私訊問「要換、要等、還是要退」。店家在後台
 * 按「寄決策連結」，客人在這頁自己選。
 *
 * 這頁的 GET **沒有任何副作用**（email 掃描器會先打開連結）：server component 只做 view，
 * 真正寫入的是 actions.ts 的 POST，而且單次使用。token 放 POST body 送 api-core。
 * 選退款**不會自動退款**——店家收到通知後確認處理。
 */
export default async function PurchaseDecisionPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { t } = await searchParams;
	const token = typeof t === "string" ? t : null;

	let view = null;
	let unavailable: string | null = null;
	if (looksLikeToken(token)) {
		try {
			view = await viewPurchaseDecision(token);
		} catch (e) {
			unavailable = e instanceof DecisionUnavailableError ? e.message : "系統暫時無法處理，請稍後再試。";
		}
	}

	return (
		<div className="mx-auto max-w-2xl p-8">
			<h1 className="text-2xl font-bold tracking-tight text-ink-900">缺貨商品處理方式</h1>

			{view && token ? (
				<>
					<div className="mt-6 rounded-card border border-ink-200 bg-white p-5 shadow-card">
						{view.orderNumber && <p className="text-sm text-ink-500">訂單 #{view.orderNumber}</p>}
						<p className="mt-1 text-lg font-semibold text-ink-900">{view.productName ?? "您訂購的商品"}</p>
						{view.variantName && <p className="text-sm text-ink-600">{view.variantName}</p>}
						<p className="tabular mt-1 text-sm text-ink-600">缺貨數量 {view.quantity}</p>
						<p className="mt-4 text-sm text-ink-700">
							很抱歉，這項商品這次向供應商採購時缺貨。請選擇您希望的處理方式，我們會依您的選擇處理。
						</p>
						{view.expiresDate && (
							<p className="mt-2 text-xs text-ink-500">此連結 {view.expiresDate} 前有效，只能送出一次。</p>
						)}
					</div>
					<PurchaseDecisionForm token={token} view={view} />
				</>
			) : (
				<div className="mt-6 rounded-card border border-ink-200 bg-white p-5 text-sm text-ink-700">
					<p>
						{unavailable ??
							"這個連結已失效：可能已經送出過、已過期，或店家已經為您處理。如需更改或有任何疑問，請直接聯絡客服。"}
					</p>
				</div>
			)}
		</div>
	);
}
