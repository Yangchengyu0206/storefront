"use client";

import { dummyGatewayId } from "./types";
import { Button } from "@/checkout/components";
import { useTransactionInitializeMutation } from "@/checkout/graphql";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";

// Basic implementation of the test gateway:
// https://github.com/saleor/dummy-payment-app/

export const DummyComponent = () => {
	const { showCustomErrors } = useAlerts();

	const { checkout } = useCheckout();
	const [transactionInitializeState, transactionInitialize] = useTransactionInitializeMutation();
	const {onCheckoutComplete, completingCheckout} = useCheckoutComplete()
	const isInProgress = completingCheckout || transactionInitializeState.fetching;

	const onInitalizeClick = async () => {
		try {
			const response = await transactionInitialize({
				checkoutId: checkout.id,
				paymentGateway: {
					id: dummyGatewayId,
					data: {
						"event": {
							"includePspReference": true,
							"type": "CHARGE_SUCCESS"
						}
					},
				},
			});

			if (response.error) {
				console.error("There was a problem with Dummy Payment Gateway:", response.error);
				showCustomErrors([{ message: response.error.message || "Payment failed" }]);
				return;
			}

			// Check for backend redirection instruction
			// The backend might return CHARGE_ACTION_REQUIRED or AUTHORIZATION_ACTION_REQUIRED
			// and provide a URL in the `data` field to redirect the user.
			const transactionEvent = response.data?.transactionInitialize?.transactionEvent;
			const data = response.data?.transactionInitialize?.data as Record<string, any> | undefined;

			if (transactionEvent?.type === "CHARGE_ACTION_REQUIRED" || transactionEvent?.type === "AUTHORIZATION_ACTION_REQUIRED") {
				// Assuming the redirect URL is provided in a field named 'redirectUrl' or 'paymentUrl' in the data JSON.
				// Adjust this field name according to your specific backend implementation.
				const redirectUrl = data?.redirectUrl || data?.paymentUrl;

				if (redirectUrl) {
					window.location.href = redirectUrl;
					return;
				} else {
					// Logic for other types of actions if needed
					console.warn("Action required but no redirect URL found in data:", data);
				}
			}

			const completionResponse = await onCheckoutComplete();
			if(completionResponse?.apiErrors){
				completionResponse.apiErrors.forEach((error) => {
					showCustomErrors([{ message: error.message }]);
				});
			}

		} catch (err) {
			console.error("There was a problem with Dummy Payment Gateway:", err);
			showCustomErrors([{ message: "An unexpected error occurred" }]);
		}
	}

	if(isInProgress){
		return <Button variant="primary" disabled={true} label="Processing payment..."/>
	}

	return (
		<Button variant="primary" onClick={onInitalizeClick} label="Make payment and create order"/>		
	);
};
