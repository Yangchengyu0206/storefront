import { useCallback, useEffect, useRef } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { useTransactionProcessMutation } from "@/checkout/graphql";
import { clearQueryParams, getQueryParams } from "@/checkout/lib/utils/url";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { usePaymentProcessingScreen } from "@/checkout/sections/PaymentSection/PaymentProcessingScreen";

const DEFAULT_PAYMENT_ERROR_MESSAGE = "Payment could not be verified. Please try again.";

const normalizeErrorMessages = (messages?: string | (string | null | undefined)[]) => {
	const normalizedMessages = Array.isArray(messages)
		? messages
		: typeof messages === "string"
			? [messages]
			: [];

	const formattedMessages = normalizedMessages.flatMap((msg) =>
		typeof msg === "string" && msg.length > 0 ? [{ message: msg }] : [],
	);

	// Always surface a user-friendly message, even if nothing usable was provided
	return formattedMessages.length ? formattedMessages : [{ message: DEFAULT_PAYMENT_ERROR_MESSAGE }];
};

export const useCheckoutCompleteRedirect = () => {
	const stripe = useStripe();
	const { completingCheckout, onCheckoutComplete } = useCheckoutComplete();
	const [{ fetching: processingTransaction }, transactionProcess] = useTransactionProcessMutation();
	const { showCustomErrors } = useAlerts();
	const { setIsProcessingPayment } = usePaymentProcessingScreen();
	const isProcessingRef = useRef(false);

	const resetProcessingState = useCallback(() => {
		// ref is mutable and intentionally kept out of deps
		isProcessingRef.current = false;
		sessionStorage.removeItem("transactionId");
		clearQueryParams("processingPayment", "transaction");
		setIsProcessingPayment(false);
	}, [setIsProcessingPayment]);

	const handleProcessError = useCallback(
		(messages?: string | (string | null | undefined)[]) => {
			showCustomErrors(normalizeErrorMessages(messages));
			resetProcessingState();
		},
		[resetProcessingState, showCustomErrors],
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
			handleProcessError("Unable to verify payment. Please return to checkout and try again.");
			return;
		}

		isProcessingRef.current = true;

		const processAndComplete = async () => {
			try {
				// First, sync Saleor with Stripe's payment status via transactionProcess
				const processResult = await transactionProcess({ id: resolvedTransactionId });

				if (processResult.error) {
					console.error("Transaction process failed:", processResult.error);
					handleProcessError(processResult.error.message);
					return;
				}

				const processErrors = processResult.data?.transactionProcess?.errors;
				if (processErrors?.length) {
					console.error("Transaction process errors:", processErrors);
					handleProcessError(processErrors.map((error) => error?.message));
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
				handleProcessError(DEFAULT_PAYMENT_ERROR_MESSAGE);
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
