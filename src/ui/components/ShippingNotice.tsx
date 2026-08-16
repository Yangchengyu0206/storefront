import { formatMoney } from "@/lib/utils";
import { type ShippingInfo } from "@/lib/shipping-info";

/**
 * 購物車的運費揭露（SF-12 / C-30）。
 *
 * 兩件事：把運費金額講出來，以及在有設定滿額免運時告訴客人「還差多少」。
 * 沒設門檻（free_threshold = 0）就完全不提免運——憑空生一個門檻出來比不講更糟。
 */
export function ShippingNotice({ info, subtotal }: { info: ShippingInfo | null; subtotal: number }) {
	if (!info) {
		// 取不到設定時維持原本的說法，不猜金額
		return <p className="mt-1 text-sm text-neutral-500">運費將於下一步計算</p>;
	}

	const { currency, feeCvs, feeHome, freeThreshold } = info;
	const hasThreshold = freeThreshold > 0;
	const reached = hasThreshold && subtotal >= freeThreshold;
	const remaining = hasThreshold ? Math.max(0, freeThreshold - subtotal) : 0;

	return (
		<div className="mt-1 space-y-1 text-sm">
			<p className="text-neutral-500">
				運費：超商取貨 {formatMoney(feeCvs, currency)}、宅配 {formatMoney(feeHome, currency)}
				（結帳時依您選擇的方式計算）
			</p>
			{reached && <p className="font-medium text-green-700">已達免運門檻，這筆訂單免運費</p>}
			{hasThreshold && !reached && (
				<p className="text-neutral-700">
					再購買 <span className="font-medium">{formatMoney(remaining, currency)}</span> 即可免運 （滿{" "}
					{formatMoney(freeThreshold, currency)}）
				</p>
			)}
		</div>
	);
}
