"use client";

import { signIn } from "next-auth/react";

// 我的帳戶 → LINE 通知。綁定走一次 LINE Login（/api/auth/link-line 收尾），
// 解除走 server action。綁定狀態由伺服器端讀 private metadata 後傳進來。

const NOTICES: Record<string, { tone: "ok" | "error"; text: string }> = {
	linked: { tone: "ok", text: "已綁定 LINE，之後的訂單通知會傳到你的 LINE。" },
	no_session: { tone: "error", text: "LINE 授權沒有完成，請再試一次。" },
	save_failed: { tone: "error", text: "綁定沒有成功，請稍後再試；若持續發生請聯絡客服。" },
};

export function LineLinkSection({
	channel,
	linked,
	linkedAt,
	notice,
	unlinkAction,
}: {
	channel: string;
	linked: boolean;
	linkedAt: string | null;
	notice?: string;
	unlinkAction: () => Promise<void>;
}) {
	const message = notice ? NOTICES[notice] : undefined;

	return (
		<section className="mt-6 rounded-lg border bg-white p-6">
			<h2 className="text-lg font-semibold text-ink-900">LINE 通知</h2>
			<p className="mt-1 text-sm text-ink-500">
				綁定後，付款成功、出貨、到店取貨、預購到貨等通知會直接傳到你的 LINE。可以隨時解除。
			</p>

			{message ? (
				<p
					role={message.tone === "error" ? "alert" : "status"}
					className={
						message.tone === "error"
							? "mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
							: "mt-4 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-ink-800"
					}
				>
					{message.text}
				</p>
			) : null}

			{linked ? (
				<div className="mt-4 flex flex-wrap items-center gap-4">
					<span className="text-sm text-ink-800">
						✓ 已綁定
						{linkedAt ? (
							<span className="ml-2 text-ink-500">（{new Date(linkedAt).toLocaleDateString("zh-TW")}）</span>
						) : null}
					</span>
					<form action={unlinkAction}>
						<button type="submit" className="text-sm text-ink-500 underline hover:text-ink-900">
							解除綁定
						</button>
					</form>
				</div>
			) : (
				<button
					type="button"
					onClick={() => void signIn("line", { redirectTo: `/api/auth/link-line?channel=${channel}` })}
					className="mt-4 rounded-md border border-[#06C755] px-4 py-2 text-sm font-medium text-[#06C755] transition hover:bg-[#06C755]/5"
				>
					綁定 LINE
				</button>
			)}
		</section>
	);
}
