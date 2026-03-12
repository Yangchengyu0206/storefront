import { useEffect, useRef } from "react";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { useTransactionProcessMutation } from "@/checkout/graphql";
import { getQueryParams } from "@/checkout/lib/utils/url";

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
			try {
				// 先同步 Saleor 的交易狀態
				const processResult = await transactionProcess({ id: resolvedTransactionId });

				if (processResult.error) {
					console.error("Transaction process failed:", processResult.error);
					isProcessingRef.current = false;
					return;
				}

				const processErrors = processResult.data?.transactionProcess?.errors;
				if (processErrors?.length) {
					console.error("Transaction process errors:", processErrors);
					isProcessingRef.current = false;
					return;
				}

				// 清除 sessionStorage 中的 transaction ID
				sessionStorage.removeItem("ecpayTransactionId");

				// 完成結帳
				await onCheckoutComplete();
			} catch (error) {
				console.error("Error during checkout completion:", error);
				isProcessingRef.current = false;
			}
		};

		void processAndComplete();
	}, [completingCheckout, onCheckoutComplete, processingTransaction, transactionProcess]);
};
