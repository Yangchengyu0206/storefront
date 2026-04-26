"use client";

import { useEffect, useRef } from "react";
import { gql } from "graphql-tag";
import { useMutation } from "urql";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { getRawQueryParams } from "@/checkout/lib/utils/url";

/**
 * 將綠界物流相關欄位寫入 Checkout metadata（訂單成立後會帶到 Order）。
 * - 有 ecpay_cvs_store_id query（地圖回跳）→ CVS
 * - 否則在有收件地址時預設 HOME + TCAT（L1 測試）
 */
const CHECKOUT_METADATA_UPDATE = gql`
	mutation checkoutMetadataUpdate($id: ID!, $input: [MetadataInput!]!) {
		checkoutMetadataUpdate(id: $id, input: $input) {
			errors {
				field
				message
				code
			}
			checkout {
				id
			}
		}
	}
`;

export function EcpayLogisticsCheckoutSync() {
	const { checkout, refetch } = useCheckout();
	const rawParams = getRawQueryParams() as unknown as Record<string, string>;
	const storeId = rawParams.ecpay_cvs_store_id || "";
	const storeNameParam = rawParams.ecpay_cvs_store_name || "";
	const subParam = rawParams.ecpay_logistics_sub_type || "";
	const [, mutate] = useMutation(CHECKOUT_METADATA_UPDATE);
	const didCvs = useRef(false);
	const didHomeDefault = useRef(false);

	useEffect(() => {
		if (!checkout?.id) {
			return;
		}

		const storeName = storeNameParam || "";
		const sub = subParam || "FAMI";

		const apply = async (input: { key: string; value: string }[]) => {
			const res = await mutate({ id: checkout.id, input });
			const errs = res.data?.checkoutMetadataUpdate?.errors;
			if (!res.error && (!errs || errs.length === 0)) {
				void refetch();
			}
		};

		if (storeId && !didCvs.current) {
			didCvs.current = true;
			let name = storeName.slice(0, 80);
			try {
				name = decodeURIComponent(storeName).slice(0, 80);
			} catch {
				/* keep raw */
			}
			try {
				sessionStorage.setItem(
					`ecpay_cvs_store_${checkout.id}`,
					JSON.stringify({ storeId, storeName: name, subType: sub }),
				);
			} catch {
				/* ignore */
			}
			void apply([
				{ key: "ecpay_logistics_type", value: "CVS" },
				{ key: "ecpay_logistics_sub_type", value: sub },
				{ key: "ecpay_receiver_store_id", value: storeId },
				{ key: "ecpay_receiver_store_name", value: name },
			]);
			return;
		}

		if (!checkout.shippingAddress || didHomeDefault.current) {
			return;
		}
		didHomeDefault.current = true;
		void apply([
			{ key: "ecpay_logistics_type", value: "HOME" },
			{ key: "ecpay_logistics_sub_type", value: "TCAT" },
		]);
	}, [checkout?.id, checkout?.shippingAddress, storeId, storeNameParam, subParam, mutate, refetch]);

	return null;
}
