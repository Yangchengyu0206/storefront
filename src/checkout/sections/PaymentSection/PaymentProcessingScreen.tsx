import { BarLoader } from "react-spinners";
import React, { type ReactNode, useState, useCallback, useMemo, useEffect } from "react";
import { Title } from "@/checkout/components";
import { createSafeContext } from "@/checkout/providers/createSafeContext";
import { clearQueryParams, getQueryParams } from "@/checkout/lib/utils/url";

interface PaymentProcessingContextConsumerProps {
	setIsProcessingPayment: (processing: boolean) => void;
}

const [usePaymentProcessingScreen, Provider] = createSafeContext<PaymentProcessingContextConsumerProps>();

export const PaymentProcessingScreen = ({ children }: { children: ReactNode }) => {
	const getInitialProcessing = () => {
		const { processingPayment } = getQueryParams();

		return !!processingPayment;
	};

	const [isProcessingPayment, setIsProcessingPayment] = useState(getInitialProcessing());

	const handleSetProcessing = useCallback((processing: boolean) => {
		setIsProcessingPayment(processing);
	}, []);

	useEffect(() => {
		if (!isProcessingPayment) {
			return;
		}

		// Safety valve: avoid infinite loading overlay.
		const timeoutId = window.setTimeout(() => {
			setIsProcessingPayment(false);
			clearQueryParams("processingPayment");
		}, 30000);

		return () => window.clearTimeout(timeoutId);
	}, [isProcessingPayment]);

	return (
		<Provider value={useMemo(() => ({ setIsProcessingPayment: handleSetProcessing }), [handleSetProcessing])}>
			{isProcessingPayment && (
				<div className="fixed inset-0 z-50 flex flex-col items-center bg-gray-100">
					<div className="flex flex-grow flex-col justify-center pb-40">
						<Title>Almost done…</Title>
						<BarLoader width="100%" />
					</div>
				</div>
			)}
			{children}
		</Provider>
	);
};

export { usePaymentProcessingScreen };
