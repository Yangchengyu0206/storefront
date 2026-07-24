"use client";

import { useEffect } from "react";
import { gql } from "graphql-tag";
import { useMutation, useQuery } from "urql";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { useConsentStore } from "@/checkout/state/consentStore";
import { COOLING_OFF_EXCLUDED_KEY, isCoolingOffExcluded } from "@/lib/cooling-off";

/**
 * 七日鑑賞期「除外」告知＋勾選存證（消保法）。
 *
 * 觸發：購物車含經店家於 Saleor 商品 metadata 標記 `cooling_off_excluded=true` 之
 *   商品（＝店家已判定確屬「依消費者要求之客製化給付」合理例外）。
 * 行為：於付款前顯示除外告知，要求客人明示同意；未勾選則 PaymentSection 不放行付款。
 * 存證：勾選狀態即時寫入 Checkout metadata（`preorder_exclusion.*`），訂單成立後
 *   帶到 Order，作為契約成立前已明示除外並取得同意之證據。
 *
 * 注意：checkout SPA 的 CheckoutLineFragment 未含 product metadata，且其 codegen
 *   未接線（graphql/index.ts 為凍結生成檔），故此處以手寫 gql 另查（同 InvoiceSection 模式）。
 */

const PREORDER_LINES_QUERY = gql`
	query PreorderExclusionLines($id: ID!) {
		checkout(id: $id) {
			id
			lines {
				id
				variant {
					product {
						name
						metadata {
							key
							value
						}
					}
				}
			}
		}
	}
`;

const CHECKOUT_METADATA_UPDATE = gql`
	mutation preorderExclusionMetadataUpdate($id: ID!, $input: [MetadataInput!]!) {
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

type LinesQueryResult = {
	checkout?: {
		lines?: Array<{
			variant?: {
				product?: {
					name?: string | null;
					metadata?: Array<{ key: string; value: string }> | null;
				} | null;
			} | null;
		} | null> | null;
	} | null;
};

const defaultChannel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL ?? "default-channel";
const returnsExceptionsHref = `/${defaultChannel}/legal/returns#exceptions`;

export const PreorderExclusionConsent = () => {
	const { checkout } = useCheckout();
	const checkoutId = checkout?.id;

	const preorderRequired = useConsentStore((state) => state.preorderRequired);
	const setPreorderRequired = useConsentStore((state) => state.setPreorderRequired);
	const preorderConsent = useConsentStore((state) => state.preorderConsent);
	const setPreorderConsent = useConsentStore((state) => state.setPreorderConsent);

	const [{ data }] = useQuery<LinesQueryResult>({
		query: PREORDER_LINES_QUERY,
		variables: { id: checkoutId },
		pause: !checkoutId,
		// 商品旗標不常變，快取即可；避免每次進結帳都重打。
		requestPolicy: "cache-first",
	});

	const [, mutate] = useMutation(CHECKOUT_METADATA_UPDATE);

	// 找出被標記為除外的商品名稱清單（供告知文字與存證使用）。
	const excludedNames =
		data?.checkout?.lines
			?.map((line) => line?.variant?.product)
			.filter((product) => isCoolingOffExcluded(product?.metadata))
			.map((product) => product?.name?.trim())
			.filter((name): name is string => !!name) ?? [];
	const hasExcluded = excludedNames.length > 0;

	// 同步「是否需要除外同意」到 store，供 PaymentSection 的下單閘門判斷。
	useEffect(() => {
		setPreorderRequired(hasExcluded);
		// 購物車不再含除外商品時，清掉舊的勾選狀態，避免殘留同意誤放行。
		if (!hasExcluded) setPreorderConsent(false);
	}, [hasExcluded, setPreorderRequired, setPreorderConsent]);

	if (!preorderRequired) return null;

	const handleToggle = (checked: boolean) => {
		setPreorderConsent(checked);
		if (!checkoutId) return;
		// 存證：即時寫回 checkout metadata（帶到 order）。
		const input = [
			{ key: "preorder_exclusion.consent", value: checked ? "true" : "false" },
			{ key: "preorder_exclusion.at", value: checked ? new Date().toISOString() : "" },
			{
				key: "preorder_exclusion.items",
				value: checked ? excludedNames.join(" / ").slice(0, 900) : "",
			},
			{ key: "preorder_exclusion.basis", value: checked ? COOLING_OFF_EXCLUDED_KEY : "" },
		];
		void mutate({ id: checkoutId, input });
	};

	return (
		<div
			className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4"
			data-testid="preorderExclusionNotice"
		>
			<p className="text-sm font-medium text-amber-900">關於七日鑑賞期之特別告知</p>
			<p className="mt-1 text-sm text-amber-900">
				您本次訂單包含下列<strong>依您指定向海外採購之客製化給付</strong>商品，依《消費者保護法》及
				「通訊交易解除權合理例外情事適用準則」，此類商品
				<strong>不適用七日鑑賞期</strong>（非因商品瑕疵不得無條件退貨）：
			</p>
			<ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
				{excludedNames.map((name) => (
					<li key={name}>{name}</li>
				))}
			</ul>
			<label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
				<input
					type="checkbox"
					className="mt-0.5"
					checked={preorderConsent}
					onChange={(e) => handleToggle(e.target.checked)}
					aria-required="true"
					data-testid="preorderConsentCheckbox"
				/>
				<span>
					我已知悉並同意上列商品屬客製化給付，不適用七日鑑賞期；相關權益詳見{" "}
					<a href={returnsExceptionsHref} target="_blank" rel="noopener noreferrer" className="underline">
						退換貨與退款政策
					</a>
					。
				</span>
			</label>
		</div>
	);
};
