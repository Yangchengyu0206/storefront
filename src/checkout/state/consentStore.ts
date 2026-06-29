import { createWithEqualityFn } from "zustand/traditional";

// R7 consent: the customer must explicitly agree to the privacy policy and terms
// before an order can be placed. This store holds that single boolean so the
// payment methods (and therefore any "place order" action) stay gated until the
// box is checked. It is intentionally module-level so all payment gateway
// components observe the same value.
interface ConsentStore {
	privacyConsent: boolean;
	setPrivacyConsent: (value: boolean) => void;
}

export const useConsentStore = createWithEqualityFn<ConsentStore>(
	(set) => ({
		privacyConsent: false,
		setPrivacyConsent: (value: boolean) => set({ privacyConsent: value }),
	}),
	Object.is,
);
