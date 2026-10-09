"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Dialog } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { cancelOrderAction, requestRmaAction } from "@/app/[channel]/(main)/orders/[id]/actions";
import type { CancelMode, SelfServiceResult, SelfServiceRmaRequest } from "@/lib/order-self-service";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

// 會員訂單頁的自助區塊：取消（未付款直接取消／已付款申請取消）與退換貨申請＋進度。
// 能不能做由 api-core 判定（server 端傳進來的 mode／eligible），這裡只負責畫與送出；
// 送出時 server action 會再用登入身分重查一次，不信任這裡的任何狀態。

const RMA_REASONS: { code: string; label: string }[] = [
	{ code: "defective", label: "商品瑕疵或損壞" },
	{ code: "wrong_item", label: "寄錯商品或規格" },
	{ code: "not_as_described", label: "與商品描述不符" },
	{ code: "missing_parts", label: "缺件或少寄" },
	{ code: "changed_mind", label: "不想要了（七日鑑賞期）" },
	{ code: "other", label: "其他" },
];

const RMA_STATUS_LABEL: Record<string, string> = {
	requested: "待客服審核",
	approved: "已核可，請依客服指示寄回",
	received: "已收到退回商品，處理中",
	resolved: "已處理",
	closed: "已完成",
	rejected: "未通過",
	cancelled: "已取消",
};

export interface SelfServiceLine {
	saleorLineId: string;
	name: string;
	variantLabel: string | null;
	quantityFulfilled: number;
	eligible: boolean;
	hasOpenRequest: boolean;
	coolingOffExcluded: boolean;
}

interface Props {
	channel: string;
	orderId: string;
	orderNumber: string;
	cancelMode: CancelMode;
	cancelRequestedAt: string | null;
	lines: SelfServiceLine[];
	rmaRequests: SelfServiceRmaRequest[];
}

const buttonPrimary =
	"rounded-control bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50";
const buttonSecondary =
	"rounded-control border border-ink-200 px-4 py-2 text-sm font-medium text-ink-800 transition hover:bg-ink-50 disabled:opacity-50";
const buttonDanger =
	"rounded-control border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50";

function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
	const cls =
		tone === "error"
			? "border-red-200 bg-red-50 text-red-700"
			: tone === "ok"
				? "border-accent/30 bg-accent/5 text-ink-800"
				: "border-ink-100 bg-ink-50 text-ink-700";
	return (
		<p
			role={tone === "error" ? "alert" : "status"}
			className={`mt-3 rounded-control border px-3 py-2 text-sm ${cls}`}
		>
			{children}
		</p>
	);
}

function Modal({
	open,
	onClose,
	title,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}) {
	return (
		<Dialog open={open} onClose={onClose} className="relative z-50">
			<div className="fixed inset-0 bg-ink-950/40" aria-hidden="true" />
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<Dialog.Panel className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-sheet bg-white p-6 shadow-sheet">
					<Dialog.Title className="text-lg font-semibold text-ink-900">{title}</Dialog.Title>
					{children}
				</Dialog.Panel>
			</div>
		</Dialog>
	);
}

export function OrderSelfService(props: Props) {
	const hasShippedLines = props.lines.some((l) => l.quantityFulfilled > 0);
	if (props.cancelMode === "none" && !hasShippedLines && props.rmaRequests.length === 0) return null;

	return (
		<div className="mt-8 rounded border border-ink-100 bg-white p-6">
			<h2 className="text-sm font-semibold text-ink-900">訂單服務</h2>
			<CancelSection {...props} />
			{(hasShippedLines || props.rmaRequests.length > 0) && <RmaSection {...props} />}
		</div>
	);
}

function CancelSection({ channel, orderId, orderNumber, cancelMode, cancelRequestedAt }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [result, setResult] = useState<SelfServiceResult | null>(null);
	const [pending, startTransition] = useTransition();

	if (result?.ok) {
		return (
			<Notice tone="ok">
				{result.result === "cancelled"
					? `訂單 #${orderNumber} 已取消。`
					: "已送出取消申請，客服確認後會以 Email 與你聯絡；同意取消後款項將退回原付款方式。"}
			</Notice>
		);
	}

	if (cancelMode === "requested") {
		return (
			<Notice tone="info">
				{cancelRequestedAt ? `已於 ${cancelRequestedAt} ` : "已"}
				送出取消申請，客服確認後會與你聯絡。
			</Notice>
		);
	}
	if (cancelMode === "contact") {
		return (
			<p className="mt-3 text-sm text-ink-600">
				這張訂單已開始採購或出貨，無法線上取消。如需協助，請聯絡客服並提供訂單編號 #{orderNumber}。
			</p>
		);
	}
	if (cancelMode !== "cancel" && cancelMode !== "request") return null;

	const isDirect = cancelMode === "cancel";
	const submit = () =>
		startTransition(async () => {
			const r = await cancelOrderAction({ channel, orderId, reason });
			setResult(r);
			if (r.ok) {
				setOpen(false);
				router.refresh();
			}
		});

	return (
		<div className="mt-3">
			<p className="text-sm text-ink-600">
				{isDirect
					? "這張訂單尚未付款，可以直接取消。"
					: "這張訂單已付款，可以申請取消；客服確認後會退款至原付款方式。已開始採購的商品無法取消。"}
			</p>
			<button type="button" className={`mt-3 ${buttonDanger}`} onClick={() => setOpen(true)}>
				{isDirect ? "取消訂單" : "申請取消"}
			</button>
			{result && !result.ok && !open && <Notice tone="error">{result.message}</Notice>}

			<Modal
				open={open}
				onClose={() => !pending && setOpen(false)}
				title={isDirect ? "取消訂單" : "申請取消訂單"}
			>
				<p className="mt-2 text-sm text-ink-600">
					{isDirect
						? `確定要取消訂單 #${orderNumber}？取消後無法復原，如仍需要請重新下單。`
						: `送出後由客服確認，系統不會立即取消或退款。確定要申請取消訂單 #${orderNumber}？`}
				</p>
				<label className="mt-4 block text-sm font-medium text-ink-900" htmlFor="cancel-reason">
					取消原因{isDirect ? "（選填）" : ""}
				</label>
				<textarea
					id="cancel-reason"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					maxLength={500}
					rows={3}
					className="mt-1 w-full rounded-control border border-ink-200 p-2 text-sm"
				/>
				{result && !result.ok && <Notice tone="error">{result.message}</Notice>}
				<div className="mt-5 flex justify-end gap-3">
					<button type="button" className={buttonSecondary} disabled={pending} onClick={() => setOpen(false)}>
						返回
					</button>
					<button
						type="button"
						className={buttonPrimary}
						disabled={pending || (!isDirect && !reason.trim())}
						onClick={submit}
					>
						{pending ? "處理中…" : isDirect ? "確認取消" : "送出申請"}
					</button>
				</div>
			</Modal>
		</div>
	);
}

function RmaSection({ channel, orderId, lines, rmaRequests }: Props) {
	const router = useRouter();
	const eligible = lines.filter((l) => l.eligible);
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<Record<string, number>>({});
	const [rmaType, setRmaType] = useState<"refund" | "exchange">("refund");
	const [reasonCode, setReasonCode] = useState("");
	const [note, setNote] = useState("");
	const [result, setResult] = useState<SelfServiceResult | null>(null);
	const [pending, startTransition] = useTransition();

	const chosen = Object.entries(selected).filter(([, q]) => q > 0);
	const showsCoolingOffNote = eligible.some(
		(l) => l.coolingOffExcluded && (selected[l.saleorLineId] ?? 0) > 0,
	);

	const submit = () =>
		startTransition(async () => {
			const r = await requestRmaAction({
				channel,
				orderId,
				rmaType,
				reasonCode,
				note,
				lines: chosen.map(([saleorLineId, quantity]) => ({ saleorLineId, quantity })),
			});
			setResult(r);
			if (r.ok) {
				setOpen(false);
				setSelected({});
				setNote("");
				setReasonCode("");
				router.refresh();
			}
		});

	return (
		<div className="mt-6 border-t border-ink-100 pt-5">
			<h3 className="text-sm font-semibold text-ink-900">退換貨</h3>

			{rmaRequests.length > 0 && (
				<ul className="mt-3 divide-y divide-ink-100 text-sm">
					{rmaRequests.map((r, i) => (
						<li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
							<span className="font-medium text-ink-900">{r.rmaType === "exchange" ? "換貨" : "退貨"}</span>
							<span className="text-ink-600">
								{r.lines.map((l) => `${l.name ?? "商品"} ×${l.quantity}`).join("、")}
							</span>
							<span className="text-ink-900">{RMA_STATUS_LABEL[r.status] ?? r.status}</span>
							{r.createdDate && (
								<time dateTime={r.createdDate} className="text-ink-400">
									{r.createdDate}
								</time>
							)}
						</li>
					))}
				</ul>
			)}

			{result?.ok && (
				<Notice tone="ok">
					已收到你的退換貨申請，客服審核後會以 Email 通知寄回方式。請先保留商品與完整包裝。
				</Notice>
			)}
			{result && !result.ok && !open && <Notice tone="error">{result.message}</Notice>}

			{eligible.length > 0 ? (
				<button type="button" className={`mt-3 ${buttonSecondary}`} onClick={() => setOpen(true)}>
					申請退換貨
				</button>
			) : (
				rmaRequests.length === 0 && <p className="mt-2 text-sm text-ink-500">目前沒有可申請退換貨的商品。</p>
			)}
			<p className="mt-2 text-xs text-ink-400">
				退換貨規則請見
				<LinkWithChannel href="/legal/returns" className="underline hover:text-ink-700">
					退換貨與退款政策
				</LinkWithChannel>
				。
			</p>

			<Modal open={open} onClose={() => !pending && setOpen(false)} title="申請退換貨">
				<fieldset className="mt-4">
					<legend className="text-sm font-medium text-ink-900">要退換的商品</legend>
					<ul className="mt-2 space-y-2">
						{lines
							.filter((l) => l.quantityFulfilled > 0)
							.map((l) => {
								const qty = selected[l.saleorLineId] ?? 0;
								const inputId = `rma-${l.saleorLineId}`;
								return (
									<li key={l.saleorLineId} className="flex items-center gap-3 text-sm">
										<input
											id={inputId}
											type="checkbox"
											disabled={!l.eligible}
											checked={qty > 0}
											onChange={(e) =>
												setSelected((s) => ({ ...s, [l.saleorLineId]: e.target.checked ? 1 : 0 }))
											}
										/>
										<label htmlFor={inputId} className={l.eligible ? "text-ink-900" : "text-ink-400"}>
											{l.name}
											{l.variantLabel ? `（${l.variantLabel}）` : ""}
											{l.hasOpenRequest && "・已有處理中的申請"}
										</label>
										{qty > 0 && l.quantityFulfilled > 1 && (
											<select
												aria-label={`${l.name} 數量`}
												value={qty}
												onChange={(e) =>
													setSelected((s) => ({ ...s, [l.saleorLineId]: Number(e.target.value) }))
												}
												className="tabular ml-auto rounded-control border border-ink-200 px-2 py-1"
											>
												{Array.from({ length: l.quantityFulfilled }, (_, i) => i + 1).map((n) => (
													<option key={n} value={n}>
														{n}
													</option>
												))}
											</select>
										)}
									</li>
								);
							})}
					</ul>
				</fieldset>

				{showsCoolingOffNote && (
					<div className="mt-4 rounded-control border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
						你選的商品中，有下單前已載明「依指定代購、不適用七日鑑賞期」的品項。仍可送出申請（例如商品瑕疵、寄錯），
						由客服依
						<LinkWithChannel href="/legal/returns#exceptions" className="underline">
							退換貨政策
						</LinkWithChannel>
						審核；若只是不想要了，可能無法受理。
					</div>
				)}

				<fieldset className="mt-4">
					<legend className="text-sm font-medium text-ink-900">申請類型</legend>
					<div className="mt-2 flex gap-6 text-sm">
						{(
							[
								["refund", "退貨退款"],
								["exchange", "換貨"],
							] as const
						).map(([value, label]) => (
							<label key={value} className="flex items-center gap-2">
								<input
									type="radio"
									name="rma-type"
									value={value}
									checked={rmaType === value}
									onChange={() => setRmaType(value)}
								/>
								{label}
							</label>
						))}
					</div>
				</fieldset>

				<label className="mt-4 block text-sm font-medium text-ink-900" htmlFor="rma-reason">
					原因
				</label>
				<select
					id="rma-reason"
					value={reasonCode}
					onChange={(e) => setReasonCode(e.target.value)}
					className="mt-1 w-full rounded-control border border-ink-200 p-2 text-sm"
				>
					<option value="">請選擇</option>
					{RMA_REASONS.map((r) => (
						<option key={r.code} value={r.code}>
							{r.label}
						</option>
					))}
				</select>

				<label className="mt-4 block text-sm font-medium text-ink-900" htmlFor="rma-note">
					補充說明（選填）
				</label>
				<textarea
					id="rma-note"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					maxLength={500}
					rows={3}
					placeholder="例如：瑕疵位置、想換的尺寸。需要照片時客服會再與你聯絡。"
					className="mt-1 w-full rounded-control border border-ink-200 p-2 text-sm"
				/>

				{result && !result.ok && <Notice tone="error">{result.message}</Notice>}
				<div className="mt-5 flex justify-end gap-3">
					<button type="button" className={buttonSecondary} disabled={pending} onClick={() => setOpen(false)}>
						返回
					</button>
					<button
						type="button"
						className={buttonPrimary}
						disabled={pending || chosen.length === 0 || !reasonCode}
						onClick={submit}
					>
						{pending ? "送出中…" : "送出申請"}
					</button>
				</div>
			</Modal>
		</div>
	);
}
