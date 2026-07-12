"use client";

import { useEffect, useRef, useState } from "react";
import { gql } from "graphql-tag";
import { useMutation } from "urql";
import { useCheckout } from "@/checkout/hooks/useCheckout";
import { Title } from "@/checkout/components/Title";
import { Divider } from "@/checkout/components";

/**
 * 電子發票選項——寫入 Checkout metadata（訂單成立後帶到 Order，api-core 開發票時讀取）。
 * 契約見 api-core einvoice_service._carrier_params（invoice.type / carrier / tax_id / title / love_code）。
 * 格式錯或未選 → api-core 端降級綠界載具保底，前端只做基本提示不硬擋。
 */
const CHECKOUT_METADATA_UPDATE = gql`
	mutation invoiceMetadataUpdate($id: ID!, $input: [MetadataInput!]!) {
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

type InvoiceType = "cloud" | "mobile" | "citizen" | "company" | "donate";

const OPTIONS: { value: InvoiceType; label: string; hint?: string }[] = [
	{ value: "cloud", label: "會員載具（寄到 Email）" },
	{ value: "mobile", label: "手機條碼", hint: "/ 開頭共 8 碼，例 /ABC.123" },
	{ value: "citizen", label: "自然人憑證", hint: "2 碼英文 + 14 碼數字" },
	{ value: "company", label: "公司統編（紙本發票）", hint: "8 碼統一編號" },
	{ value: "donate", label: "捐贈發票", hint: "3–7 碼愛心碼" },
];

const inputCls =
	"w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-800 focus:outline-none";

export function InvoiceSection() {
	const { checkout } = useCheckout();
	const [, mutate] = useMutation(CHECKOUT_METADATA_UPDATE);

	const [type, setType] = useState<InvoiceType>("cloud");
	const [carrier, setCarrier] = useState("");
	const [taxId, setTaxId] = useState("");
	const [title, setTitle] = useState("");
	const [loveCode, setLoveCode] = useState("");

	const storageKey = checkout?.id ? `invoice_opts_${checkout.id}` : "";

	// 抗綠界地圖回跳：從 sessionStorage 還原上次選擇
	useEffect(() => {
		if (!storageKey) return;
		try {
			const saved = sessionStorage.getItem(storageKey);
			if (saved) {
				const o = JSON.parse(saved) as Record<string, string>;
				if (o.type) setType(o.type as InvoiceType);
				setCarrier(o.carrier ?? "");
				setTaxId(o.taxId ?? "");
				setTitle(o.title ?? "");
				setLoveCode(o.loveCode ?? "");
			}
		} catch {
			/* ignore */
		}
	}, [storageKey]);

	// 選項變更 → debounce 寫回 checkout metadata（＋ sessionStorage 備援）
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => {
		if (!checkout?.id) return;
		if (storageKey) {
			try {
				sessionStorage.setItem(storageKey, JSON.stringify({ type, carrier, taxId, title, loveCode }));
			} catch {
				/* ignore */
			}
		}
		clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			const input = [
				{ key: "invoice.type", value: type },
				{ key: "invoice.carrier", value: type === "mobile" || type === "citizen" ? carrier.trim() : "" },
				{ key: "invoice.tax_id", value: type === "company" ? taxId.trim() : "" },
				{ key: "invoice.title", value: type === "company" ? title.trim() : "" },
				{ key: "invoice.love_code", value: type === "donate" ? loveCode.trim() : "" },
			];
			void mutate({ id: checkout.id, input });
		}, 600);
		return () => clearTimeout(timer.current);
	}, [checkout?.id, storageKey, type, carrier, taxId, title, loveCode, mutate]);

	return (
		<>
			<Divider />
			<div className="py-4" data-testid="invoiceSection">
				<Title>電子發票</Title>
				<div className="flex flex-col gap-2">
					{OPTIONS.map((opt) => (
						<label key={opt.value} className="flex items-center gap-2 text-sm">
							<input
								type="radio"
								name="invoiceType"
								value={opt.value}
								checked={type === opt.value}
								onChange={() => setType(opt.value)}
							/>
							<span>{opt.label}</span>
							{opt.hint && <span className="text-xs text-neutral-400">（{opt.hint}）</span>}
						</label>
					))}
				</div>

				{(type === "mobile" || type === "citizen") && (
					<input
						className={`${inputCls} mt-3`}
						placeholder={type === "mobile" ? "手機條碼，例 /ABC.123" : "自然人憑證條碼（16 碼）"}
						value={carrier}
						onChange={(e) => setCarrier(e.target.value)}
						autoCapitalize="characters"
					/>
				)}

				{type === "company" && (
					<div className="mt-3 flex flex-col gap-2">
						<input
							className={inputCls}
							placeholder="統一編號（8 碼數字）"
							inputMode="numeric"
							maxLength={8}
							value={taxId}
							onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
						/>
						<input
							className={inputCls}
							placeholder="發票抬頭（公司名稱）"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
				)}

				{type === "donate" && (
					<input
						className={`${inputCls} mt-3`}
						placeholder="愛心碼（3–7 碼數字）"
						inputMode="numeric"
						value={loveCode}
						onChange={(e) => setLoveCode(e.target.value.replace(/\D/g, ""))}
					/>
				)}
			</div>
		</>
	);
}
