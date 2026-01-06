"use client";

import { dummyGatewayId } from "./types";
import { Button } from "@/checkout/components";
import { useTransactionInitializeMutation } from "@/checkout/graphql";
import { useAlerts } from "@/checkout/hooks/useAlerts";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useCheckoutComplete } from "@/checkout/hooks/useCheckoutComplete";
import { legacyDummyGatewayId } from "@/checkout/sections/PaymentSection/utils";
import { useCheckoutUpdateState } from "@/checkout/state/updateStateStore";

// Basic implementation of the test gateway:
// https://github.com/saleor/dummy-payment-app/

export const DummyComponent = () => {
	const { showCustomErrors } = useAlerts();

	const { checkout } = useCheckout();
	const { updateState } = useCheckoutUpdateState();
	const [transactionInitializeState, transactionInitialize] = useTransactionInitializeMutation();
	const { onCheckoutComplete, completingCheckout } = useCheckoutComplete();
	const isInProgress = completingCheckout || transactionInitializeState.fetching;

	const onInitalizeClick = async () => {
		try {
			// ⚠️ 步驟 0: 檢查並等待 billing address 保存完成
			if (process.env.NODE_ENV === "development") {
				console.log("🔍 檢查 Billing Address 狀態:", {
					billingAddress: checkout.billingAddress
						? {
								id: checkout.billingAddress.id,
								firstName: checkout.billingAddress.firstName,
								lastName: checkout.billingAddress.lastName,
								city: checkout.billingAddress.city,
								country: checkout.billingAddress.country.code,
								streetAddress1: checkout.billingAddress.streetAddress1,
							}
						: null,
					updateState: updateState.checkoutBillingUpdate,
				});
			}

			// 如果正在保存，等待完成（最多等待 5 秒）
			if (updateState.checkoutBillingUpdate === "loading") {
				if (process.env.NODE_ENV === "development") {
					console.log("⏳ 等待 Billing Address 保存完成...");
				}
				await new Promise<void>((resolve) => {
					let attempts = 0;
					const maxAttempts = 50; // 5 秒 (50 * 100ms)
					const checkInterval = setInterval(() => {
						attempts++;
						if (updateState.checkoutBillingUpdate !== "loading" || attempts >= maxAttempts) {
							clearInterval(checkInterval);
							if (process.env.NODE_ENV === "development") {
								console.log("✅ 等待完成，狀態:", updateState.checkoutBillingUpdate);
							}
							resolve();
						}
					}, 100);
				});
			}

			// 檢查 billing address 是否已設置
			if (!checkout.billingAddress) {
				// 如果保存狀態是 "error"，表示保存失敗了
				if (updateState.checkoutBillingUpdate === "error") {
					if (process.env.NODE_ENV === "development") {
						console.error("❌ Billing address 保存失敗:", {
							checkoutId: checkout.id,
							billingAddress: checkout.billingAddress,
							updateState: updateState.checkoutBillingUpdate,
							可能的原因: [
								"1. 表單驗證失敗（檢查是否有必填欄位未填寫，例如 State/Province）",
								"2. 後端驗證失敗（檢查 Network 標籤中的錯誤詳情）",
								"3. 網絡錯誤（檢查瀏覽器 Console 和 Network 標籤）",
							],
							建議: [
								"1. 檢查表單中是否有紅色錯誤提示",
								"2. 確保所有必填欄位都已填寫（特別是 State/Province）",
								"3. 打開瀏覽器 Network 標籤，查看 checkoutBillingAddressUpdate 請求的錯誤詳情",
								"4. 嘗試重新填寫表單並等待自動保存完成",
							],
						});
					}
					showCustomErrors([
						{
							message:
								"Failed to save billing address. Please check that all required fields are filled (especially State/Province) and try again. Check the browser console for details.",
						},
					]);
					return;
				}

				// 如果保存狀態不是 "error"，可能是還沒保存
				if (process.env.NODE_ENV === "development") {
					console.error("❌ Billing address is not set:", {
						checkoutId: checkout.id,
						billingAddress: checkout.billingAddress,
						updateState: updateState.checkoutBillingUpdate,
						可能的原因: [
							"1. 表單填寫了但自動保存還沒完成（請等待幾秒後再試）",
							"2. 表單驗證失敗（檢查是否有必填欄位未填寫，例如 State）",
							"3. 自動保存失敗（檢查瀏覽器 Console 是否有錯誤）",
						],
					});
				}
				showCustomErrors([
					{
						message:
							"Billing address is required. Please ensure all required fields are filled and wait a moment for the form to save automatically before proceeding.",
					},
				]);
				return;
			}

			if (process.env.NODE_ENV === "development") {
				console.log("✅ Billing Address 已設置:", {
					id: checkout.billingAddress.id,
					city: checkout.billingAddress.city,
					country: checkout.billingAddress.country.code,
				});
			}

			// 從 checkout 中獲取實際的 Dummy Payment Gateway ID
			// 可能是新版的 saleor.io.dummy-payment-app 或舊版的 mirumee.payments.dummy
			const availableGateway = checkout.availablePaymentGateways?.find(
				(g) => g.id === dummyGatewayId || g.id === legacyDummyGatewayId,
			);
			const gatewayId = availableGateway?.id || dummyGatewayId;

			// 詳細的調試資訊
			if (process.env.NODE_ENV === "development") {
				console.log("🔍 Payment Gateway Debug (Before transactionInitialize):", {
					gatewayId,
					"使用的 gateway ID": gatewayId,
					"是否從 availablePaymentGateways 找到": !!availableGateway,
					"所有可用的 gateways":
						checkout.availablePaymentGateways?.map((g) => ({
							id: g.id,
							name: g.name,
						})) || [],
					"支援的 Dummy IDs": [dummyGatewayId, legacyDummyGatewayId],
					"checkout.availablePaymentGateways 是否為空": !checkout.availablePaymentGateways?.length,
				});
			}

			// 如果沒有找到可用的 gateway，顯示警告
			if (!availableGateway) {
				console.warn("⚠️ 警告：沒有在 checkout.availablePaymentGateways 中找到 Dummy Payment Gateway");
				console.warn("這可能導致後端返回 NOT_FOUND 錯誤");
				console.warn("請檢查：");
				console.warn("1. Saleor 後端是否已安裝並啟用 Dummy Payment App");
				console.warn("2. App 的 ID 是否為以下之一：");
				console.warn(`   - ${dummyGatewayId}`);
				console.warn(`   - ${legacyDummyGatewayId}`);
				console.warn("3. 當前 checkout 的 availablePaymentGateways:", checkout.availablePaymentGateways);
			}

			// 步驟 1: 初始化交易
			const initializeResult = await transactionInitialize({
				checkoutId: checkout.id,
				amount: checkout.totalPrice.gross.amount, // 傳遞結帳總金額
				paymentGateway: {
					id: gatewayId, // 使用實際的 gateway ID
					data: {
						event: {
							includePspReference: true,
							type: "AUTHORIZATION_SUCCESS",
						},
					},
				},
			});

			// 檢查 transactionInitialize 是否成功
			if (initializeResult.error) {
				if (process.env.NODE_ENV === "development") {
					console.warn("Transaction initialize error:", initializeResult.error);
				}
				showCustomErrors([{ message: "Payment initialization failed. Please try again." }]);
				return;
			}

			const transactionData = initializeResult.data?.transactionInitialize;
			if (!transactionData) {
				if (process.env.NODE_ENV === "development") {
					console.warn("No transaction data returned");
				}
				showCustomErrors([{ message: "Payment initialization failed. Please try again." }]);
				return;
			}

			if (transactionData.errors?.length) {
				// 顯示詳細的錯誤資訊
				const errorMessages = transactionData.errors.map((e) => ({
					message: e.message || `Payment initialization failed: ${e.code || "Unknown error"}`,
					code: e.code,
					field: e.field,
				}));

				// 詳細的錯誤日誌（使用 console.warn 避免被當作未處理的錯誤）
				if (process.env.NODE_ENV === "development") {
					console.warn("❌ Transaction initialize errors:");
					console.warn("錯誤詳情:", transactionData.errors);
					console.warn("結帳資訊:", {
						checkoutId: checkout.id,
						amount: checkout.totalPrice.gross.amount,
						currency: checkout.totalPrice.gross.currency,
						gatewayId: gatewayId,
						availableGateways:
							checkout.availablePaymentGateways?.map((g) => ({
								id: g.id,
								name: g.name,
							})) || [],
					});
					// 逐個顯示錯誤
					transactionData.errors.forEach((error, index) => {
						console.warn(`錯誤 ${index + 1}:`, {
							code: error.code,
							message: error.message,
							field: error.field,
						});
					});

					// 如果是 NOT_FOUND 錯誤，提供詳細的診斷資訊
					const notFoundError = transactionData.errors.find((e) => e.code === "NOT_FOUND");
					if (notFoundError) {
						console.error("🔴 NOT_FOUND 錯誤診斷：");
						console.error("前端發送的 gateway ID:", gatewayId);
						console.error("後端可用的 gateways:", checkout.availablePaymentGateways?.map((g) => g.id) || []);
						console.error("可能的原因：");
						console.error("1. Saleor 後端沒有安裝 Dummy Payment App");
						console.error("2. Dummy Payment App 已安裝但未啟用");
						console.error("3. App 的 ID 與前端發送的不匹配");
						console.error("4. App 未正確配置或未訂閱 webhook");
						console.error("解決方案：");
						console.error("1. 在 Saleor Dashboard 中檢查 Payment Apps");
						console.error("2. 確認 Dummy Payment App 已安裝並啟用");
						console.error("3. 檢查 App 的 ID 是否為以下之一：");
						console.error(`   - ${dummyGatewayId}`);
						console.error(`   - ${legacyDummyGatewayId}`);
						console.error("4. 確認 App 已正確配置 webhook URL");
					}
				}

				showCustomErrors(errorMessages);
				return;
			}

			// 調試資訊 - 檢查 authorizedAmount
			if (process.env.NODE_ENV === "development") {
				// 需要查詢 transaction 的完整信息來檢查 authorizedAmount
				// 因為 transactionInitialize mutation 沒有返回 authorizedAmount
				console.log("✅ Transaction initialized:", {
					transactionId: transactionData.transaction?.id,
					actions: transactionData.transaction?.actions,
					eventType: transactionData.transactionEvent?.type,
					checkoutTotal: checkout.totalPrice.gross.amount,
					checkoutCurrency: checkout.totalPrice.gross.currency,
					sentAmount: checkout.totalPrice.gross.amount,
					eventData: transactionData.data,
					警告: "如果後端沒有正確處理 webhook，authorizedAmount 可能為 null",
					建議: [
						"1. 檢查後端 TRANSACTION_INITIALIZE_SESSION webhook handler",
						"2. 確認後端返回的響應包含 'amount' 和 'data.event.type: AUTHORIZATION_SUCCESS'",
						"3. 在 Saleor Dashboard 中檢查 Transaction 的 authorizedAmount",
					],
				});
			}

			// 步驟 2: 完成結帳
			// 在 checkoutComplete 之前，再次檢查 transaction 狀態
			if (process.env.NODE_ENV === "development") {
				console.log("🔍 準備執行 checkoutComplete:", {
					checkoutId: checkout.id,
					checkoutTotal: checkout.totalPrice.gross.amount,
					transactionId: transactionData.transaction?.id,
					注意: "Saleor 會檢查 transaction.authorizedAmount 是否 >= checkout.total",
					如果失敗: "可能是後端沒有正確設置 authorizedAmount",
				});
			}

			const completeResult = await onCheckoutComplete();

			// 檢查 checkoutComplete 是否成功
			if (completeResult?.hasErrors) {
				// 詳細的錯誤處理
				const errors = completeResult.apiErrors || [];
				const graphqlErrors = completeResult.graphqlErrors || [];
				const customErrors = completeResult.customErrors || [];

				if (process.env.NODE_ENV === "development") {
					console.error("❌ checkoutComplete 錯誤:", {
						完整錯誤對象: completeResult,
						apiErrors: errors,
						graphqlErrors: graphqlErrors,
						customErrors: customErrors,
						可能的原因: [
							"1. transaction.authorizedAmount 為 null（後端沒有正確處理 webhook）",
							"2. transaction.authorizedAmount < checkout.total（金額不匹配）",
							"3. 後端返回的事件類型不是 AUTHORIZATION_SUCCESS",
							"4. 後端沒有正確處理 TRANSACTION_INITIALIZE_SESSION webhook",
						],
						建議: [
							"1. 檢查後端 TRANSACTION_INITIALIZE_SESSION webhook handler",
							"2. 確認後端返回格式正確（參考 BACKEND_PAYMENT_FIX.md）",
							"3. 在 Saleor Dashboard 檢查 Transaction 詳情",
							"4. 檢查後端日誌，確認 webhook 是否被正確處理",
						],
					});
				}

				// 處理各種類型的錯誤
				if (errors.length > 0) {
					errors.forEach((error: any) => {
						const errorMessage =
							error?.message ||
							error?.code ||
							"The authorized amount doesn't cover the checkout's total amount.";
						showCustomErrors([{ message: errorMessage }]);
					});
				} else if (graphqlErrors.length > 0) {
					graphqlErrors.forEach((error: any) => {
						const errorMessage = error?.message || "Payment processing failed.";
						showCustomErrors([{ message: errorMessage }]);
					});
				} else if (customErrors.length > 0) {
					customErrors.forEach((error: any) => {
						const errorMessage = error?.message || "Payment processing failed.";
						showCustomErrors([{ message: errorMessage }]);
					});
				} else {
					// 如果沒有具體錯誤信息，顯示通用錯誤
					showCustomErrors([
						{
							message:
								"The authorized amount doesn't cover the checkout's total amount. Please check the backend webhook handler.",
						},
					]);
				}
			}
		} catch (err) {
			if (process.env.NODE_ENV === "development") {
				console.warn("There was a problem with Dummy Payment Gateway:", err);
			}
			showCustomErrors([{ message: "Payment processing failed. Please try again." }]);
		}
	};

	if (isInProgress) {
		return <Button variant="primary" disabled={true} label="Processing payment..." />;
	}

	return <Button variant="primary" onClick={onInitalizeClick} label="Make payment and create order" />;
};
