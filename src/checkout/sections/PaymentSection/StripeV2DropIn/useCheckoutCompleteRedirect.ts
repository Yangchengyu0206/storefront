import { useCallback, useEffect, useRef } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { useTransactionProcessMutation } from "@/checkout/graphql";
import { clearQueryParams, getQueryParams } from "@/checkout/lib/utils/url";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { usePaymentProcessingScreen } from "@/checkout/sections/PaymentSection/PaymentProcessingScreen";

export const useCheckoutCompleteRedirect = () => {
	const stripe = useStripe();
	const { completingCheckout, onCheckoutComplete } = useCheckoutComplete();
	const [{ fetching: processingTransaction }, transactionProcess] = useTransactionProcessMutation();
	const { showCustomErrors } = useAlerts();
	const { setIsProcessingPayment } = usePaymentProcessingScreen();
	const isProcessingRef = useRef(false);

	const stopProcessing = useCallback(() => {
		sessionStorage.removeItem("transactionId");
		clearQueryParams("processingPayment", "transaction");
		setIsProcessingPayment(false);
	}, [setIsProcessingPayment]);

	const handleProcessError = useCallback(
		(messages?: (string | null | undefined)[]) => {
			const formattedMessages = messages?.filter(Boolean).map((message) => ({ message: message })) ?? [
				{ message: "Payment could not be verified. Please try again." },
			];

			showCustomErrors(formattedMessages);
			stopProcessing();
		},
		[showCustomErrors, stopProcessing],
	);

	useEffect(() => {
		const { paymentIntent, paymentIntentClientSecret, processingPayment, transaction } = getQueryParams();

		// Check if we're returning from a Stripe redirect
		if (!paymentIntent || !paymentIntentClientSecret || !processingPayment) {
			return;
		}

		if (!stripe) {
			return;
		}

		// Prevent multiple executions
		if (isProcessingRef.current || completingCheckout || processingTransaction) {
			return;
		}

		const transactionId = sessionStorage.getItem("transactionId");
		const transactionIdFromQuery = typeof transaction === "string" ? transaction : undefined;
		const resolvedTransactionId = transactionId ?? transactionIdFromQuery;

		if (!resolvedTransactionId) {
			console.error("Missing transactionId in sessionStorage and query params after Stripe redirect", {
				transaction,
			});
			handleProcessError(["Missing payment confirmation. Please try again."]);
			return;
		}

		isProcessingRef.current = true;

		const processAndComplete = async () => {
			try {
				// First, sync Saleor with Stripe's payment status via transactionProcess
				const processResult = await transactionProcess({ id: resolvedTransactionId });

				if (processResult.error) {
					console.error("Transaction process failed:", processResult.error);
					isProcessingRef.current = false;
					handleProcessError([
						processResult.error.message ?? "Could not process payment confirmation. Please try again.",
					]);
					return;
				}

				const processErrors = processResult.data?.transactionProcess?.errors;
				if (processErrors?.length) {
					console.error("Transaction process errors:", processErrors);
					isProcessingRef.current = false;
					handleProcessError(
						processErrors.map((error) => error.message ?? "Payment was not completed successfully."),
					);
					return;
				}

				type TransactionProcessData = {
					paymentIntent?: {
						stripeClientSecret?: string;
					};
				};

				const processData = processResult.data?.transactionProcess?.data as
					| TransactionProcessData
					| undefined;

				const serverClientSecret = processData?.paymentIntent?.stripeClientSecret;

				if (serverClientSecret) {
					const intentResult = await stripe.retrievePaymentIntent(serverClientSecret);

					if (intentResult.error) {
						console.error("Unable to retrieve PaymentIntent:", intentResult.error);
					} else {
						console.info("Retrieved PaymentIntent status:", intentResult.paymentIntent?.status);
					}
				}

				// Clear transaction identifier once we finalize
				sessionStorage.removeItem("transactionId");

				// Now complete the checkout
				await onCheckoutComplete();
			} catch (error) {
				console.error("Error during checkout completion:", error);
				isProcessingRef.current = false;
				handleProcessError(["Payment could not be completed. Please try again."]);
			}
		};

		void processAndComplete();
	}, [
		completingCheckout,
		handleProcessError,
		onCheckoutComplete,
		processingTransaction,
		stripe,
		transactionProcess,
	]);
};
