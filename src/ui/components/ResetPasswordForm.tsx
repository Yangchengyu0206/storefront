"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "@/app/[channel]/(main)/reset-password/actions";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

export function ResetPasswordForm({
	channel,
	email,
	token,
}: {
	channel: string;
	email: string;
	token: string;
}) {
	const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
		resetPasswordAction.bind(null, channel),
		undefined,
	);

	// 沒帶 email/token(直接輸入網址或連結被截斷)→ 引導重新申請
	if (!email || !token) {
		return (
			<div className="mx-auto mt-16 w-full max-w-md">
				<div className="rounded-lg border bg-white p-8 text-center shadow-sm">
					<h1 className="mb-3 text-2xl font-semibold text-neutral-900">連結無效</h1>
					<p className="text-sm leading-6 text-neutral-600">
						這個重設密碼連結不完整或已失效,
						<br />
						請重新申請一次。
					</p>
					<p className="mt-6 text-sm text-neutral-600">
						<LinkWithChannel href="/forgot-password" className="font-medium text-neutral-900 underline">
							重新申請重設密碼
						</LinkWithChannel>
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-16 w-full max-w-md">
			<h1 className="mb-2 text-center text-2xl font-semibold text-neutral-900">重設密碼</h1>
			<p className="mb-6 text-center text-sm text-neutral-600">
				為 <span className="font-medium text-neutral-900">{email}</span> 設定新密碼。
			</p>

			<form className="rounded-lg border bg-white p-8 shadow-sm" action={formAction}>
				{state?.error ? (
					<p
						role="alert"
						className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					>
						{state.error}
					</p>
				) : null}

				<input type="hidden" name="email" value={email} />
				<input type="hidden" name="token" value={token} />

				<div className="mb-4">
					<label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700">
						新密碼
					</label>
					<input
						required
						id="password"
						type="password"
						name="password"
						autoComplete="new-password"
						autoCapitalize="off"
						minLength={8}
						placeholder="至少 8 個字元"
						className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-2 focus:border-neutral-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<div className="mb-6">
					<label htmlFor="confirm" className="mb-1 block text-sm font-medium text-neutral-700">
						再輸入一次新密碼
					</label>
					<input
						required
						id="confirm"
						type="password"
						name="confirm"
						autoComplete="new-password"
						autoCapitalize="off"
						minLength={8}
						placeholder="請再輸入一次"
						className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-2 focus:border-neutral-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={pending}
					className="w-full rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{pending ? "重設中…" : "重設密碼並登入"}
				</button>
			</form>
		</div>
	);
}
