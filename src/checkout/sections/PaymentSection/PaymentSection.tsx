import React from "react";
import { PaymentMethods } from "./PaymentMethods";
import { useECPayReturn } from "./ECPayDropIn/useECPayReturn";
import { PreorderExclusionConsent } from "./PreorderExclusionConsent";
import { Divider } from "@/checkout/components/Divider";
import { Title } from "@/checkout/components/Title";
import { useConsentStore } from "@/checkout/state/consentStore";

// R7 consent: links to the legal pages. The checkout app lives at /checkout
// (no channel segment), so we build the channel-scoped legal URLs from the
// public default-channel env var.
const defaultChannel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL ?? "default-channel";
const privacyHref = `/${defaultChannel}/legal/privacy`;
const termsHref = `/${defaultChannel}/legal/terms`;

export const PaymentSection = () => {
	// Keep return processing at section level so it runs
	// even if ECPay gateway component is not currently rendered.
	useECPayReturn();

	const privacyConsent = useConsentStore((state) => state.privacyConsent);
	const setPrivacyConsent = useConsentStore((state) => state.setPrivacyConsent);
	const preorderRequired = useConsentStore((state) => state.preorderRequired);
	const preorderConsent = useConsentStore((state) => state.preorderConsent);

	// 下單閘門：隱私/條款同意為必要；若購物車含除外商品，另需除外同意。
	const canPay = privacyConsent && (!preorderRequired || preorderConsent);

	return (
		<>
			<Divider />
			<div className="py-4" data-testid="paymentMethods">
				<Title>Payment methods</Title>

				{/* R7: explicit consent gate — the order cannot proceed until checked. */}
				<label className="mb-4 flex items-start gap-2 text-sm text-neutral-700" data-testid="consentCheckbox">
					<input
						type="checkbox"
						className="mt-0.5"
						checked={privacyConsent}
						onChange={(e) => setPrivacyConsent(e.target.checked)}
						aria-required="true"
					/>
					<span>
						我已閱讀並同意{" "}
						<a href={privacyHref} target="_blank" rel="noopener noreferrer" className="underline">
							隱私權政策
						</a>{" "}
						與{" "}
						<a href={termsHref} target="_blank" rel="noopener noreferrer" className="underline">
							服務條款
						</a>
						，並了解本服務涉及跨境代購之相關約定。
					</span>
				</label>

				{/* 除外告知＋勾選存證：僅在購物車含客製化給付商品時顯示。 */}
				<PreorderExclusionConsent />

				{canPay ? (
					<PaymentMethods />
				) : (
					<p className="text-sm text-neutral-500" data-testid="consentRequiredNotice">
						{preorderRequired && !preorderConsent && privacyConsent
							? "本次訂單包含不適用七日鑑賞期之客製化給付商品，請先勾選上方除外同意，即可完成下單。"
							: "請先勾選上方同意條款，即可選擇付款方式並完成下單。"}
					</p>
				)}
			</div>
		</>
	);
};
