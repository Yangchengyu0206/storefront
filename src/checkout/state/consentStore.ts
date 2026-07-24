import { createWithEqualityFn } from "zustand/traditional";

// R7 consent: the customer must explicitly agree to the privacy policy and terms
// before an order can be placed. This store holds that boolean so the payment
// methods (and therefore any "place order" action) stay gated until the box is
// checked. It is intentionally module-level so all payment gateway components
// observe the same value.
//
// 七日鑑賞期除外同意（消保法）：當購物車含經店家標記為「客製化給付」之商品時
// （見 lib/cooling-off），須額外取得客人對「該商品不適用七日鑑賞期」之明示同意。
// `preorderRequired` 由 PreorderExclusionConsent 依購物車內容設定；`preorderConsent`
// 為客人勾選結果。兩者一併納入 PaymentSection 的下單閘門。
interface ConsentStore {
	privacyConsent: boolean;
	setPrivacyConsent: (value: boolean) => void;
	preorderRequired: boolean;
	setPreorderRequired: (value: boolean) => void;
	preorderConsent: boolean;
	setPreorderConsent: (value: boolean) => void;
}

export const useConsentStore = createWithEqualityFn<ConsentStore>(
	(set) => ({
		privacyConsent: false,
		setPrivacyConsent: (value: boolean) => set({ privacyConsent: value }),
		preorderRequired: false,
		setPreorderRequired: (value: boolean) => set({ preorderRequired: value }),
		preorderConsent: false,
		setPreorderConsent: (value: boolean) => set({ preorderConsent: value }),
	}),
	Object.is,
);
