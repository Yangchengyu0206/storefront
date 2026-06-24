import { ClockIcon, XIcon } from "lucide-react";

type Props = {
	isAvailable: boolean;
	isPreorder?: boolean;
	leadTimeDays?: number | null;
};

const pClasses = "ml-1 text-sm font-semibold text-neutral-500";

export const AvailabilityMessage = ({ isAvailable, isPreorder, leadTimeDays }: Props) => {
	// 預購：一律可訂，顯示「預計X日出貨」（代購「先賣後買」）
	if (isPreorder) {
		const lead =
			typeof leadTimeDays === "number" && leadTimeDays > 0
				? `預購・預計 ${leadTimeDays} 日出貨`
				: "預購商品・下單後安排採購";
		return (
			<div className="mt-6 flex items-center">
				<ClockIcon className="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
				<p className={pClasses}>{lead}</p>
			</div>
		);
	}
	// 現貨：賣完顯示售完
	if (!isAvailable) {
		return (
			<div className="mt-6 flex items-center">
				<XIcon className="h-5 w-5 flex-shrink-0 text-neutral-50" aria-hidden="true" />
				<p className={pClasses}>Out of stock</p>
			</div>
		);
	}
	return <></>;
};
