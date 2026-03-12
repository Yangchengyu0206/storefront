import { useEffect, useMemo, useRef, useState } from "react";
import { type CountryCode, usePaymentGatewaysInitializeMutation } from "@/checkout/graphql";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useSubmit } from "@/checkout/hooks/useSubmit";
import { type MightNotExist } from "@/checkout/lib/globalTypes";
import { type ParsedPaymentGateways } from "@/checkout/sections/PaymentSection/types";
import { getFilteredPaymentGateways } from "@/checkout/sections/PaymentSection/utils";

export const usePaymentGatewaysInitialize = () => {
	const {
		checkout: { billingAddress },
	} = useCheckout();
	const {
		checkout: { id: checkoutId, availablePaymentGateways },
	} = useCheckout();

	const billingCountry = billingAddress?.country.code as MightNotExist<CountryCode>;

	const [gatewayConfigs, setGatewayConfigs] = useState<ParsedPaymentGateways>([]);
	const previousBillingCountry = useRef(billingCountry);

	const [{ fetching }, paymentGatewaysInitialize] = usePaymentGatewaysInitializeMutation();

	const filteredGateways = useMemo(() => {
		const filtered = getFilteredPaymentGateways(availablePaymentGateways);
		// 調試資訊：幫助診斷 payment gateway 問題
		if (process.env.NODE_ENV === "development") {
			console.log("🔍 Payment Gateway Debug Info:", {
				"原始 gateways 數量": availablePaymentGateways?.length || 0,
				"原始 gateways IDs": availablePaymentGateways?.map((g) => g.id) || [],
				"過濾後 gateways 數量": filtered.length,
				"過濾後 gateways IDs": filtered.map((g) => g.id),
				"支援的 gateways": [
					"app.saleor.adyen",
					"app.saleor.stripe",
					"saleor.io.dummy-payment-app",
					"mirumee.payments.dummy",
					"app.saleor.ecpay",
				],
			});
		}
		return filtered;
	}, [availablePaymentGateways]);

	const onSubmit = useSubmit<{}, typeof paymentGatewaysInitialize>(
		useMemo(
			() => ({
				hideAlerts: true,
				scope: "paymentGatewaysInitialize",
				shouldAbort: () => filteredGateways.length === 0,
				onSubmit: paymentGatewaysInitialize,
				parse: () => ({
					checkoutId,
					paymentGateways: filteredGateways.map(({ config, id }) => ({
						id,
						data: config,
					})),
				}),
				onSuccess: ({ data }) => {
					const parsedConfigs = (data.gatewayConfigs || []) as ParsedPaymentGateways;

					// 如果沒有可用的 payment gateways，不要拋出錯誤
					// 可能是因為後端沒有配置任何支援的 payment gateway
					// 或者所有 gateways 都被過濾掉了
					if (!parsedConfigs.length) {
						console.warn("⚠️ No available payment gateways after initialization.");
						console.warn("可能的原因：");
						console.warn("1. Saleor 後端沒有配置任何 payment gateway");
						console.warn("2. 後端配置的 gateway ID 不在支援列表中");
						console.warn(
							"   支援的 IDs: app.saleor.adyen, app.saleor.stripe, saleor.io.dummy-payment-app, mirumee.payments.dummy, app.saleor.ecpay",
						);
						console.warn("3. Payment gateway 初始化失敗");
						console.warn("請檢查 Saleor 後端的 Payment Apps 設定");
						setGatewayConfigs([]);
						return;
					}

					if (process.env.NODE_ENV === "development") {
						console.log(
							"✅ Payment gateways initialized successfully:",
							parsedConfigs.map((g) => g.id),
						);
					}

					setGatewayConfigs(parsedConfigs);
				},
				onError: ({ errors }) => {
					console.log({ errors });
				},
			}),
			[filteredGateways, checkoutId, paymentGatewaysInitialize],
		),
	);

	useEffect(() => {
		// 只有在有過濾後的 payment gateways 時才執行初始化
		if (filteredGateways.length > 0) {
			void onSubmit();
		}
	}, [filteredGateways, onSubmit]);

	useEffect(() => {
		if (billingCountry !== previousBillingCountry.current && filteredGateways.length > 0) {
			previousBillingCountry.current = billingCountry;
			void onSubmit();
		}
	}, [billingCountry, filteredGateways.length, onSubmit]);

	return {
		fetching,
		availablePaymentGateways: gatewayConfigs || [],
	};
};
