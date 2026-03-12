import { useMemo } from "react";
import { paymentMethodToComponent } from "./supportedPaymentApps";
import { PaymentSectionSkeleton } from "@/checkout/sections/PaymentSection/PaymentSectionSkeleton";
import { usePayments } from "@/checkout/sections/PaymentSection/usePayments";
import { useCheckoutUpdateState } from "@/checkout/state/updateStateStore";

export const PaymentMethods = () => {
	const { availablePaymentGateways, fetching } = usePayments();
	const {
		changingBillingCountry,
		updateState: { checkoutDeliveryMethodUpdate },
	} = useCheckoutUpdateState();
	console.log("後端回傳的所有 Gateway:", availablePaymentGateways);
	console.log("前端定義的 Component Map:", paymentMethodToComponent);
	const gatewaysWithDefinedComponent = useMemo(
		() => availablePaymentGateways.filter((gateway) => gateway.id in paymentMethodToComponent),
		[availablePaymentGateways],
	);
	console.log("過濾後的 Gateway:", gatewaysWithDefinedComponent);
	// delivery methods change total price so we want to wait until the change is done
	if (changingBillingCountry || fetching || checkoutDeliveryMethodUpdate === "loading") {
		return <PaymentSectionSkeleton />;
	}

	return (
		<div className="gap-y-8">
			{gatewaysWithDefinedComponent.map((gateway) => {
				const Component = paymentMethodToComponent[gateway.id];
				return (
					<Component
						key={gateway.id}
						// @ts-expect-error -- gateway matches the id but TypeScript doesn't know that
						config={gateway}
					/>
				);
			})}
		</div>
	);
};
