import { useEffect, useRef } from "react";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { useTransactionProcessMutation } from "@/checkout/graphql";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { clearQueryParams, getQueryParams } from "@/checkout/lib/utils/url";

/**
 * 處理從綠界返回後的結帳完成流程
 *
 * 當用戶從綠界支付頁面返回時：
 * 1. 檢查 URL 參數中是否有 transactionId 或 processingPayment
 * 2. 調用 transactionProcess 同步交易狀態
 * 3. 完成結帳
 */
export const useECPayReturn = () => {
	const { completingCheckout, onCheckoutComplete } = useCheckoutComplete();
	const { showCustomErrors } = useAlerts();
	const [{ fetching: processingTransaction }, transactionProcess] = useTransactionProcessMutation();
	const isProcessingRef = useRef(false);

	useEffect(() => {
		const { processingPayment, transaction } = getQueryParams();

		// 檢查是否是從綠界返回
		// 可以通過 processingPayment 參數或 transaction 參數來判斷
		if (!processingPayment && !transaction) {
			return;
		}

		// 防止重複執行
		if (isProcessingRef.current || completingCheckout || processingTransaction) {
			return;
		}

		// 從 sessionStorage 或 URL 參數取得 transaction ID
		const transactionIdFromStorage = sessionStorage.getItem("ecpayTransactionId");
		const transactionIdFromQuery = typeof transaction === "string" ? transaction : undefined;
		const resolvedTransactionId = transactionIdFromStorage ?? transactionIdFromQuery;

		if (!resolvedTransactionId) {
			console.warn("從綠界返回但找不到 transactionId", {
				transaction,
				sessionStorage: transactionIdFromStorage,
			});
			return;
		}

		isProcessingRef.current = true;

		const processAndComplete = async () => {
			const finishWithFailure = (reason: string, details?: unknown) => {
				console.error(reason, details);
				// B4-13：付款回跳處理失敗時，過去只 console.error 後靜默清掉參數，客人不知道
				// 錢扣了沒、訂單成立了沒。改為明確提示，並附交易編號供客服查詢。
				showCustomErrors([
					{
						message:
							"付款結果確認失敗。若您已完成付款請勿重複付款，稍候重新整理頁面，" +
							`或聯絡客服並提供交易編號：${resolvedTransactionId}`,
					},
				]);
				sessionStorage.removeItem("ecpayTransactionId");
				clearQueryParams("processingPayment", "transaction");
				isProcessingRef.current = false;
			};

			try {
				// 先同步 Saleor 的交易狀態（加上短重試，降低回跳時序造成的偶發失敗）
				let processResult: Awaited<ReturnType<typeof transactionProcess>> | undefined;
				for (let attempt = 1; attempt <= 3; attempt++) {
					processResult = await transactionProcess({ id: resolvedTransactionId });
					const processErrors = processResult.data?.transactionProcess?.errors;
					if (!processResult.error && !processErrors?.length) {
						break;
					}
					if (attempt < 3) {
						await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

				if (!processResult) {
					finishWithFailure("Transaction process did not return any result");
					return;
				}

				if (processResult.error) {
					finishWithFailure("Transaction process failed:", processResult.error);
					return;
				}

				const processErrors = processResult.data?.transactionProcess?.errors;
				if (processErrors?.length) {
					finishWithFailure("Transaction process errors:", processErrors);
					return;
				}

				// 清除 sessionStorage 中的 transaction ID
				sessionStorage.removeItem("ecpayTransactionId");

				// 完成結帳
				await onCheckoutComplete();
			} catch (error) {
				finishWithFailure("Error during checkout completion:", error);
			}
		};

		void processAndComplete();
	}, [completingCheckout, onCheckoutComplete, processingTransaction, transactionProcess, showCustomErrors]);
};
