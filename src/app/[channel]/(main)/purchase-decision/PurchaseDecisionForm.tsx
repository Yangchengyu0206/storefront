"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { type DecisionState, submitDecisionAction } from "./actions";
import type { DecisionChoice, PurchaseDecisionView } from "@/lib/purchase-decision";

const initialState: DecisionState = { error: null, result: null };

function fmtMoney(amount: number, currency: string) {
	return new Intl.NumberFormat("zh-TW", { style: "currency", currency, maximumFractionDigits: 0 }).format(
		amount,
	);
}

function optionCopy(choice: DecisionChoice, view: PurchaseDecisionView): { title: string; detail: string } {
	switch (choice) {
		case "substitute":
			return {
				title: `改成「${view.replacementName ?? "店家建議的替代品"}」`,
				detail: "改出店家提議的替代商品，其他內容不變。",
			};
		case "wait":
			return {
				title: "等下一趟採購",
				detail: "我們會在下一趟採購時再幫您買，到貨時間會比原本晚。",
			};
		case "refund":
			return {
				title: "退款",
				detail:
					view.estimatedRefundAmount !== null
						? `退回這項商品的金額（約 ${fmtMoney(
								view.estimatedRefundAmount,
								view.currency,
							)}），店家確認後處理。`
						: "退回這項商品的金額，店家確認後處理。",
			};
	}
}

function SubmitButton({ disabled }: { disabled: boolean }) {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={disabled || pending}
			className="rounded-control bg-ink-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
		>
			{pending ? "送出中…" : "確認送出"}
		</button>
	);
}

function Done({ state }: { state: DecisionState }) {
	const r = state.result;
	if (!r) return null;
	const message =
		r.choice === "refund"
			? r.estimatedRefundAmount !== null
				? `已收到您的選擇：退款（約 ${fmtMoney(
						r.estimatedRefundAmount,
						r.currency,
					)}）。店家確認後會為您處理退款，完成時會再通知您。`
				: "已收到您的選擇：退款。店家確認後會為您處理退款，完成時會再通知您。"
			: r.choice === "wait"
				? "已收到您的選擇：等下一趟採購。到貨後會照常為您安排出貨。"
				: `已收到您的選擇：改成「${r.replacementName ?? "替代品"}」。`;
	return (
		<div role="status" className="mt-6 rounded-card bg-accent-subtle p-5 text-sm text-accent">
			<p className="font-medium">{message}</p>
			<p className="mt-2 text-ink-600">這個連結只能送出一次。若想更改，請直接聯絡客服。</p>
		</div>
	);
}

export function PurchaseDecisionForm({ token, view }: { token: string; view: PurchaseDecisionView }) {
	const [state, formAction] = useActionState(submitDecisionAction, initialState);
	const [choice, setChoice] = useState<DecisionChoice | null>(null);

	if (state.result) return <Done state={state} />;

	return (
		<form action={formAction} className="mt-6 space-y-5">
			<input type="hidden" name="token" value={token} />
			<fieldset>
				<legend className="text-sm font-medium text-ink-900">請選擇處理方式</legend>
				<div className="mt-3 space-y-3">
					{view.choices.map((c) => {
						const copy = optionCopy(c, view);
						return (
							<label
								key={c}
								className={clsx(
									"flex cursor-pointer gap-3 rounded-card border p-4 transition-colors",
									choice === c ? "border-accent bg-accent-subtle" : "border-ink-200 hover:border-ink-400",
								)}
							>
								<input
									type="radio"
									name="choice"
									value={c}
									checked={choice === c}
									onChange={() => setChoice(c)}
									className="mt-1 accent-current"
								/>
								<span>
									<span className="block text-sm font-medium text-ink-900">{copy.title}</span>
									<span className="mt-1 block text-sm text-ink-600">{copy.detail}</span>
								</span>
							</label>
						);
					})}
				</div>
			</fieldset>

			<div>
				<label htmlFor="note" className="block text-sm font-medium text-ink-700">
					想對店家說的話（選填）
				</label>
				<textarea
					id="note"
					name="note"
					rows={3}
					maxLength={500}
					className="mt-1 block w-full rounded-control border border-ink-300 px-3 py-2 text-sm focus:border-ink-500"
				/>
			</div>

			{state.error && (
				<p role="alert" className="rounded-control bg-amber-50 p-3 text-sm text-amber-900">
					{state.error}
				</p>
			)}

			<div className="flex flex-wrap items-center gap-4">
				<SubmitButton disabled={choice === null} />
				<p className="text-xs text-ink-500">送出後就不能用這個連結更改。</p>
			</div>
		</form>
	);
}
