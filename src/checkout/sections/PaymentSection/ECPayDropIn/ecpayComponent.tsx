"use client";

import { useState } from "react";
import { useClient } from "urql";
import { getUrlForTransactionInitialize } from "../utils";
import { ecpayGatewayId } from "./types";
import { Button } from "@/checkout/components";
import {
	CheckoutDocument,
	type CheckoutQuery,
	type CheckoutQueryVariables,
	useTransactionInitializeMutation,
} from "@/checkout/graphql";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { flushPendingMetadata } from "@/checkout/lib/pendingMetadata";
import { getFormattedMoney } from "@/checkout/lib/utils/money";
import { extractCheckoutIdFromUrl } from "@/checkout/lib/utils/url";
import { type CheckoutUpdateStateScope, useCheckoutUpdateState } from "@/checkout/state/updateStateStore";
import { API_BASE_URL } from "@/lib/env";

/**
 * 會改變 checkout 總額的更新。任一個還在路上，畫面上的總額就可能還沒含運費／折扣，
 * 這時候不准付款（2026-10-09 沙盒實測：選完超商取貨 1.5 秒就按付款，綠界收 30、
 * 訂單總額 90）。只列跟金額有關的 scope——email、登入那些若卡在 loading 不該連帶鎖死付款。
 */
const TOTAL_AFFECTING_SCOPES: CheckoutUpdateStateScope[] = [
	"checkoutShippingUpdate",
	"checkoutBillingUpdate",
	"checkoutDeliveryMethodUpdate",
	"checkoutLinesUpdate",
	"checkoutLinesDelete",
	"checkoutAddPromoCode",
];

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
	const urqlClient = useClient();
	const { updateState, loadingCheckout } = useCheckoutUpdateState();
	const [transactionInitializeState, transactionInitialize] = useTransactionInitializeMutation();
	const { onCheckoutComplete, completingCheckout } = useCheckoutComplete();
	const [isProcessing, setIsProcessing] = useState(false);

	const isInProgress = completingCheckout || transactionInitializeState.fetching || isProcessing;
	// checkout 正在重抓（mutation 成功後 urql 會把 query 標 stale 再重抓）或有改金額的更新沒回來
	const isUpdatingTotal =
		loadingCheckout || TOTAL_AFFECTING_SCOPES.some((scope) => updateState[scope] === "loading");
	// 運送方式在 server 端還沒設定 = 總額還不含運費（Saleor transactionInitialize 本身不檢查這個）
	const isMissingDeliveryMethod = checkout.isShippingRequired && !checkout.deliveryMethod;

	const handlePaymentClick = async () => {
		// 客人按下去當下看到的總額；下面跟 server 最新值比對用
		const displayedTotal = checkout.totalPrice.gross.amount;
		try {
			setIsProcessing(true);

			// 交易一旦送出，checkout metadata 就定案了（Saleor 在 checkoutComplete 時把它複製到
			// order，api-core 之後只讀得到 order 那份）。發票選項是 600ms debounce 寫回的，
			// 除外同意是勾選當下 fire-and-forget——兩者都可能還在路上。先等它們寫完。
			await flushPendingMetadata();

			// 付款金額一律以 Saleor 當下的 checkout 為準，不信前端快取。
			// 用跟 useCheckout 相同的 variables 打 network-only，結果也會回寫到畫面上的摘要。
			const fresh = await urqlClient
				.query<CheckoutQuery, CheckoutQueryVariables>(
					CheckoutDocument,
					{ id: extractCheckoutIdFromUrl(), languageCode: "EN_US" },
					{ requestPolicy: "network-only" },
				)
				.toPromise();
			const freshCheckout = fresh.data?.checkout;
			if (fresh.error || !freshCheckout) {
				showCustomErrors([{ message: "無法確認訂單金額，請稍後再試" }]);
				setIsProcessing(false);
				return;
			}
			if (freshCheckout.isShippingRequired && !freshCheckout.deliveryMethod) {
				showCustomErrors([{ message: "請先選擇運送方式" }]);
				setIsProcessing(false);
				return;
			}
			const amount = freshCheckout.totalPrice.gross.amount;
			if (amount !== displayedTotal) {
				// 畫面已被上面的查詢更新成新總額；讓客人看清楚再按一次，不要默默收不同的錢
				showCustomErrors([
					{
						message: `訂單金額已更新為 ${getFormattedMoney(
							freshCheckout.totalPrice.gross,
						)}，請確認後再按一次付款`,
					},
				]);
				setIsProcessing(false);
				return;
			}

			// 準備返回 URL（當用戶從綠界返回時使用）
			const { newUrl: returnUrl } = getUrlForTransactionInitialize();

			// 【關鍵修改】決定要使用的 Gateway ID
			// 如果 config.id 存在（代表是從 Dummy 或其他 gateway 借殼進來的），就用它
			// 如果不存在，才用原本寫死的 ecpayGatewayId (作為備案)
			const activeGatewayId = config?.id || ecpayGatewayId;

			if (process.env.NODE_ENV !== "production") {
				console.log("使用 Gateway ID:", activeGatewayId, "來源:", config?.id ? "config" : "預設");
			}

			// 初始化交易。amount 刻意明確帶（不省略）：省略時 Saleor 會用「總額 − 既有交易的
			// charged/pending」，客人之前放棄的綠界付款頁留下的 charge_pending 會被扣掉，反而少收。
			const response = await transactionInitialize({
				checkoutId: checkout.id,
				amount,
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
					if (process.env.NODE_ENV !== "production") {
						console.log("正在轉跳至:", redirectUrl);
					}

					// 儲存 transaction ID 以便後續處理
					if (transactionData?.transaction?.id) {
						sessionStorage.setItem("ecpayTransactionId", transactionData.transaction.id);
					}

					// 【修正重點 3】處理相對路徑問題 (如果後端只回傳 /api/v1/...)
					// 如果 redirectUrl 是以 / 開頭，代表它是相對路徑，需要補上後端的 Domain
					let finalRedirectUrl: string;
					if (redirectUrl.startsWith("/")) {
						// 相對路徑補上 api-core 的對外位址。
						// 這裡原本還會退回 Saleor API URL 再退回 localhost:8000——但 `/api/v1/...`
						// 這種路徑打到 Saleor 只會 404，打到客人自己的 localhost 則是完全沒反應，
						// 兩個 fallback 都只是把「設定沒填」偽裝成「付款壞了」。改由 lib/env 統一
						// 把關：正式環境沒設就 build 不過去。
						finalRedirectUrl = `${API_BASE_URL}${redirectUrl}`;
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

	if (isUpdatingTotal) {
		return <Button variant="primary" disabled={true} label="更新金額中…" />;
	}

	if (isMissingDeliveryMethod) {
		return <Button variant="primary" disabled={true} label="請先選擇運送方式" />;
	}

	return <Button variant="primary" onClick={handlePaymentClick} label="前往綠界付款" />;
};
