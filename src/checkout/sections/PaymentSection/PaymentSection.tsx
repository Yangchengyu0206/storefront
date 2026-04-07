import React from "react";
import { PaymentMethods } from "./PaymentMethods";
import { useECPayReturn } from "./ECPayDropIn/useECPayReturn";
import { Divider } from "@/checkout/components/Divider";
import { Title } from "@/checkout/components/Title";

export const PaymentSection = () => {
	// Keep return processing at section level so it runs
	// even if ECPay gateway component is not currently rendered.
	useECPayReturn();

	return (
		<>
			<Divider />
			<div className="py-4" data-testid="paymentMethods">
				<Title>Payment methods</Title>
				<PaymentMethods />
			</div>
		</>
	);
};
