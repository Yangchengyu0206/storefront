"use client";

import { useState } from "react";
import { type PaymentPending } from "@/lib/payment-pending";

/**
 * 待繳費資訊卡（ATM 虛擬帳號／超商代碼）。純顯示，資料來源由呼叫端負責：
 * 結帳完成頁讀訂單 metadata；會員訂單頁、訪客查單之後也可直接套用。
 */

const CopyButton = ({ value }: { value: string }) => {
	const [copied, setCopied] = useState(false);
	// 手機連區網 http:// 時 navigator.clipboard 是 undefined——沒有就不顯示按鈕，
	// 帳號本身用 select-all 讓客人長按就能整串選取。
	if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return null;
	return (
		<button
			type="button"
			className="ml-2 rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100"
			onClick={() => {
				void navigator.clipboard.writeText(value).then(() => {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1500);
				});
			}}
		>
			{copied ? "已複製" : "複製"}
		</button>
	);
};

const Row = ({ label, value, copy = false }: { label: string; value?: string; copy?: boolean }) =>
	value ? (
		<div className="flex flex-wrap items-center gap-x-3 py-1">
			<dt className="w-20 shrink-0 text-sm text-neutral-500">{label}</dt>
			<dd className="flex items-center font-mono text-base tracking-wide text-neutral-900">
				<span className="select-all">{value}</span>
				{copy && <CopyButton value={value} />}
			</dd>
		</div>
	) : null;

const formatAmount = (amount?: string, currency?: string) => {
	const n = Number(amount);
	if (!amount || Number.isNaN(n)) return undefined;
	return `${currency || "TWD"} ${n.toLocaleString("zh-TW")}`;
};

export const PaymentPendingInfo = ({ info }: { info: PaymentPending }) => {
	const isAtm = info.method === "ATM";
	return (
		<div
			className="rounded-lg border border-amber-300 bg-amber-50 p-4"
			data-testid="paymentPendingInfo"
			role="region"
			aria-label="繳費資訊"
		>
			<p className="font-bold text-amber-900">請於期限內完成繳費</p>
			<p className="mt-1 text-sm text-amber-900">
				{isAtm
					? "請用網路銀行、ATM 或臨櫃轉帳到下列帳號。我們收到款項後會立即為您處理訂單。"
					: "請到 7-ELEVEN、全家、萊爾富或 OK 超商的多媒體機台輸入繳費代碼，列印繳費單後至櫃檯繳費。"}
			</p>
			<dl className="mt-3">
				<Row label="付款方式" value={isAtm ? "ATM 轉帳" : "超商代碼繳費"} />
				{isAtm && <Row label="銀行代碼" value={info.bankCode} copy />}
				{isAtm && <Row label="轉帳帳號" value={info.vaccount} copy />}
				{!isAtm && <Row label="繳費代碼" value={info.paymentNo} copy />}
				<Row label="繳費金額" value={formatAmount(info.amount, info.currency)} />
				<Row label="繳費期限" value={info.expireDate} />
			</dl>
			<p className="mt-3 text-xs text-amber-800">
				這組帳號／代碼只適用這筆訂單，金額須完全相同；逾期未繳將失效，請勿重複繳費。建議截圖保存這組繳費資訊。
			</p>
		</div>
	);
};
