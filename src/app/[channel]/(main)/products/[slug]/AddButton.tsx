"use client";

import { useFormStatus } from "react-dom";
import { type AnalyticsItem, trackAddToCart } from "@/lib/analytics";

export function AddButton({
	disabled,
	trackItem,
	trackCurrency,
}: {
	disabled?: boolean;
	/** 行銷追蹤用（GA4 add_to_cart / Meta AddToCart）；追蹤未啟用時 trackAddToCart 是 no-op。 */
	trackItem?: AnalyticsItem;
	trackCurrency?: string | null;
}) {
	const { pending } = useFormStatus();
	const isButtonDisabled = disabled || pending;

	return (
		<button
			type="submit"
			// 用 testid 而不是讓 e2e 靠按鈕文字選取：文案一改（例如這次 "Add to cart"
			// 改成「加入購物車」）三條測試就會同時斷掉，而那跟測試想驗的行為無關。
			data-testid="AddToCartButton"
			aria-disabled={isButtonDisabled}
			aria-busy={pending}
			onClick={(e) => {
				if (isButtonDisabled) {
					e.preventDefault();
					return;
				}
				if (trackItem) trackAddToCart({ ...trackItem, quantity: 1 }, trackCurrency);
			}}
			className="h-12 items-center rounded-md bg-ink-900 px-6 py-3 text-base font-medium leading-6 text-white shadow hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-70 hover:disabled:bg-ink-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-70 hover:aria-disabled:bg-ink-700"
		>
			{pending ? (
				<div className="inline-flex items-center">
					<svg
						className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>加入中…</span>
				</div>
			) : (
				<span>加入購物車</span>
			)}
		</button>
	);
}
