import { ClockIcon, XIcon } from "lucide-react";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

type Props = {
	isAvailable: boolean;
	isPreorder?: boolean;
	leadTimeDays?: number | null;
};

const pClasses = "ml-1 text-sm font-semibold text-ink-500";

export const AvailabilityMessage = ({ isAvailable, isPreorder, leadTimeDays }: Props) => {
	// 預購：一律可訂，顯示「預計X日出貨」（代購「先賣後買」）
	if (isPreorder) {
		const lead =
			typeof leadTimeDays === "number" && leadTimeDays > 0
				? `預購・預計 ${leadTimeDays} 日出貨`
				: "預購商品・下單後安排採購";
		return (
			<div className="mt-6">
				<div className="flex items-center">
					<ClockIcon className="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
					<p className={pClasses}>{lead}</p>
				</div>
				{/* 代購「先賣後買」的事先告知：供應商缺貨時可能買不到（服務條款第三條）。 */}
				<p className="ml-6 mt-2 text-sm text-ink-500" data-testid="preorderSupplierNotice">
					代購商品可能因供應商缺貨而無法購得，屆時將通知您選擇換貨、等待或退款。詳見{" "}
					<LinkWithChannel href="/legal/terms" className="underline">
						服務條款
					</LinkWithChannel>
					與{" "}
					<LinkWithChannel href="/legal/returns" className="underline">
						退換貨與退款政策
					</LinkWithChannel>
					。
				</p>
			</div>
		);
	}
	// 現貨：賣完顯示售完
	if (!isAvailable) {
		return (
			<div className="mt-6 flex items-center">
				<XIcon className="h-5 w-5 flex-shrink-0 text-ink-50" aria-hidden="true" />
				<p className={pClasses}>已售完</p>
			</div>
		);
	}
	return <></>;
};
