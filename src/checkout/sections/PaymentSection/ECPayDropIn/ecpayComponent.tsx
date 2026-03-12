"use client";

import { useState } from "react";
import { getUrlForTransactionInitialize } from "../utils";
import { ecpayGatewayId } from "./types";
import { useECPayReturn } from "./useECPayReturn";
import { Button } from "@/checkout/components";
import { useTransactionInitializeMutation } from "@/checkout/graphql";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";

/**
 * 綠界金流支付組件
 *
 * 流程：
 * 1. 用戶點擊「前往綠界付款」按鈕
 * 2. 調用 transactionInitialize 初始化交易
 * 3. 後端返回綠界支付 URL（通常在 data.redirectUrl 或 data.paymentUrl）
 * 4. 重定向到綠界支付頁面
 * 5. 用戶在綠界完成付款後，綠界會回調到後端
 * 6. 後端處理完成後，前端可能需要處理返回結果
 *
 * 支援動態 Gateway ID：
 * - 可以通過 config.id 接收不同的 gateway ID
 * - 如果沒有提供 config.id，則使用預設的 ecpayGatewayId
 * - 這樣可以讓 Dummy Gateway 等其他 gateway 也使用這個組件
 */
interface ECPayComponentProps {
	config?: {
		id: string;
		data?: Record<string, any>;
		[key: string]: any; // 允許其他屬性，因為 gateway 可能包含更多資訊
	};
}

export const ECPayComponent = ({ config }: ECPayComponentProps = {}) => {
	const { showCustomErrors } = useAlerts();
	const { checkout } = useCheckout();
	const [transactionInitializeState, transactionInitialize] = useTransactionInitializeMutation();
	const { onCheckoutComplete, completingCheckout } = useCheckoutComplete();
	const [isProcessing, setIsProcessing] = useState(false);

	// 處理從綠界返回後的結帳完成流程
	useECPayReturn();

	const isInProgress = completingCheckout || transactionInitializeState.fetching || isProcessing;

	const handlePaymentClick = async () => {
		try {
			setIsProcessing(true);

			// 準備返回 URL（當用戶從綠界返回時使用）
			const { newUrl: returnUrl } = getUrlForTransactionInitialize();

			// 【關鍵修改】決定要使用的 Gateway ID
			// 如果 config.id 存在（代表是從 Dummy 或其他 gateway 借殼進來的），就用它
			// 如果不存在，才用原本寫死的 ecpayGatewayId (作為備案)
			const activeGatewayId = config?.id || ecpayGatewayId;

			console.log("使用 Gateway ID:", activeGatewayId, "來源:", config?.id ? "config" : "預設");

			// 初始化交易
			const response = await transactionInitialize({
				checkoutId: checkout.id,
				amount: checkout.totalPrice.gross.amount,
				paymentGateway: {
					// 【關鍵修改】使用動態 ID
					id: activeGatewayId,
					data: {
						// 傳遞返回 URL 給後端，後端可以將此 URL 設定為綠界的 ReturnURL
						returnUrl: returnUrl,
						// 如果 config 中有額外的 data，也可以合併進去
						...(config?.data || {}),
					},
				},
			});

			if (response.error) {
				console.error("綠界金流初始化失敗:", response.error);
				showCustomErrors([{ message: response.error.message || "支付初始化失敗，請稍後再試" }]);
				setIsProcessing(false);
				return;
			}

			const transactionData = response.data?.transactionInitialize;

			// 檢查是否有錯誤
			if (transactionData?.errors?.length) {
				const errorMessages = transactionData.errors.map((err) => ({
					message: err.message || "支付初始化失敗",
				}));
				showCustomErrors(errorMessages);
				setIsProcessing(false);
				return;
			}

			// 檢查交易事件類型
			const transactionEvent = transactionData?.transactionEvent;

			// 【修正重點 1】確保 data 被正確解析
			// Saleor 的 transactionInitialize 回傳的 data 欄位，在某些版本或配置下，
			// 會是一個 JSON 字串 (String) 而不是直接的物件 (Object)
			let actionData: any = transactionData?.data;

			if (typeof actionData === "string") {
				try {
					actionData = JSON.parse(actionData);
				} catch (e) {
					console.error("無法解析 Transaction Data JSON:", e);
					actionData = null;
				}
			}

			// 如果後端要求重定向到支付頁面
			if (
				transactionEvent?.type === "CHARGE_ACTION_REQUIRED" ||
				transactionEvent?.type === "AUTHORIZATION_ACTION_REQUIRED"
			) {
				// 【修正重點 2】擴大搜尋範圍，確保抓到後端傳來的 key
				// 優先順序：url > redirectUrl > paymentUrl
				const redirectUrl =
					actionData?.url ||
					actionData?.redirectUrl ||
					actionData?.paymentUrl ||
					actionData?.ecpayUrl ||
					actionData?.checkoutUrl;

				if (redirectUrl) {
					console.log("正在轉跳至:", redirectUrl);

					// 儲存 transaction ID 以便後續處理
					if (transactionData?.transaction?.id) {
						sessionStorage.setItem("ecpayTransactionId", transactionData.transaction.id);
					}

					// 【修正重點 3】處理相對路徑問題 (如果後端只回傳 /api/v1/...)
					// 如果 redirectUrl 是以 / 開頭，代表它是相對路徑，需要補上後端的 Domain
					let finalRedirectUrl: string;
					if (redirectUrl.startsWith("/")) {
						// 優先使用 NEXT_PUBLIC_API_URL（後端 API），如果沒有則使用 Saleor API URL
						const backendUrl =
							process.env.NEXT_PUBLIC_API_URL ||
							process.env.NEXT_PUBLIC_SALEOR_API_URL ||
							"http://localhost:8000";
						finalRedirectUrl = `${backendUrl}${redirectUrl}`;
					} else {
						finalRedirectUrl = redirectUrl;
					}

					// 重定向到綠界支付頁面
					window.location.href = finalRedirectUrl;
					return;
				} else {
					console.warn("後端要求轉跳，但沒有提供 URL。解析後的 Data:", actionData);
					showCustomErrors([{ message: "系統錯誤：未收到支付轉跳網址" }]);
					setIsProcessing(false);
					return;
				}
			}

			// 如果不需要重定向（例如：已經完成支付），直接完成結帳
			// 這種情況較少見，但某些支付方式可能支援
			if (transactionEvent?.type === "CHARGE_SUCCESS" || transactionEvent?.type === "AUTHORIZATION_SUCCESS") {
				const completionResponse = await onCheckoutComplete();
				if (completionResponse?.apiErrors) {
					completionResponse.apiErrors.forEach((error) => {
						showCustomErrors([{ message: error.message }]);
					});
				}
				setIsProcessing(false);
				return;
			}

			// 如果沒有明確的處理方式，顯示錯誤
			console.warn("未預期的交易事件類型:", transactionEvent);
			showCustomErrors([{ message: "支付處理發生未預期的錯誤，請稍後再試" }]);
			setIsProcessing(false);
		} catch (err) {
			console.error("綠界金流處理錯誤:", err);
			showCustomErrors([{ message: "發生未預期的錯誤，請稍後再試" }]);
			setIsProcessing(false);
		}
	};

	if (isInProgress) {
		return <Button variant="primary" disabled={true} label="處理中..." />;
	}

	return <Button variant="primary" onClick={handlePaymentClick} label="前往綠界付款" />;
};
