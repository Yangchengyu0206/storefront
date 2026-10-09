import clsx from "clsx";
import type { OrderLineProgressData } from "@/lib/order-progress";

// 每一行的代購採購進度。訪客查單與會員訂單頁共用。
// 文案沿用 LINE 客服 bot 與後台「回報客人」的說法，讓客人在不同管道看到的一致。

type Tone = "done" | "wait" | "alert" | "muted";

const toneClass: Record<Tone, string> = {
	done: "bg-accent-subtle text-accent",
	wait: "bg-ink-100 text-ink-700",
	alert: "bg-amber-50 text-amber-900",
	muted: "bg-ink-50 text-ink-500",
};

function fmtDate(iso: string | null): string | null {
	if (!iso) return null;
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return null;
	return `${Number(m[2])}/${Number(m[3])}`;
}

function describe(p: OrderLineProgressData): { label: string; detail?: string; tone: Tone } {
	switch (p.status) {
		case "shipped":
			return { label: "已出貨", tone: "done" };
		case "arrived": {
			const d = fmtDate(p.arrivedDate);
			return { label: "已到貨，準備出貨", detail: d ? `${d} 到貨` : undefined, tone: "done" };
		}
		case "in_stock":
			return { label: "現貨備貨中", tone: "wait" };
		case "processing":
			return { label: "處理中", detail: "我們正在安排採購與備貨", tone: "wait" };
		case "pending":
			return { label: "等待採購", tone: "wait" };
		case "ordered": {
			const d = fmtDate(p.expectedArrivalDate);
			return {
				label: "已向供應商訂貨，運送中",
				detail: d ? `預計 ${d} 左右到貨` : undefined,
				tone: "wait",
			};
		}
		case "not_found": {
			if (p.customerDecision === "refund") {
				return { label: "供應商缺貨", detail: "將為您辦理此品項退款", tone: "alert" };
			}
			if (p.customerDecision === "wait") {
				return { label: "供應商缺貨", detail: "依您的選擇，等待下一批到貨", tone: "alert" };
			}
			if (p.customerDecision === "substitute" && p.replacementName) {
				return { label: "供應商缺貨", detail: `將為您改為「${p.replacementName}」`, tone: "alert" };
			}
			return {
				label: "供應商缺貨",
				detail: "客服會與您聯繫，確認換貨、等待或退款",
				tone: "alert",
			};
		}
		case "substituted":
			return {
				label: "已改為替代品",
				detail: p.replacementName ? `「${p.replacementName}」` : undefined,
				tone: "alert",
			};
		case "cancelled":
			return { label: "此品項已取消", detail: "如有疑問請聯絡客服", tone: "muted" };
	}
}

export function OrderLineProgress({
	progress,
	quantity,
	quantityFulfilled,
	className,
}: {
	progress: OrderLineProgressData | null | undefined;
	quantity: number;
	quantityFulfilled?: number | null;
	className?: string;
}) {
	if (!progress) return null;
	const { label, detail, tone } = describe(progress);
	const fulfilled = quantityFulfilled ?? 0;
	const partialShipped = progress.status !== "shipped" && fulfilled > 0 && fulfilled < quantity;
	const partialPurchase =
		(progress.status === "pending" || progress.status === "ordered") &&
		progress.purchaseQuantity !== null &&
		progress.purchaseQuantity > 0 &&
		progress.purchaseQuantity < quantity;

	return (
		<div className={clsx("mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs", className)}>
			<span
				className={clsx("rounded-full px-2 py-0.5 font-medium", toneClass[tone])}
				data-testid="orderLineProgress"
				data-status={progress.status}
			>
				{label}
			</span>
			{detail && <span className="text-ink-500">{detail}</span>}
			{partialPurchase && (
				<span className="text-ink-500">（其中 {progress.purchaseQuantity} 件代購中，其餘為現貨）</span>
			)}
			{partialShipped && (
				<span className="tabular text-ink-500">
					已出貨 {fulfilled} / {quantity}
				</span>
			)}
		</div>
	);
}
