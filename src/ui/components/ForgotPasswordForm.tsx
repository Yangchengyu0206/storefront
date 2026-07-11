"use client";

import { useActionState } from "react";
import {
	forgotPasswordAction,
	type ForgotPasswordState,
} from "@/app/[channel]/(main)/forgot-password/actions";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

export function ForgotPasswordForm({ channel }: { channel: string }) {
	const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
		forgotPasswordAction.bind(null, channel),
		undefined,
	);

	if (state?.sent) {
		return (
			<div className="mx-auto mt-16 w-full max-w-md">
				<div className="rounded-lg border bg-white p-8 text-center shadow-sm">
					<h1 className="mb-3 text-2xl font-semibold text-neutral-900">已寄出重設連結</h1>
					<p className="text-sm leading-6 text-neutral-600">
						如果這個 Email 有註冊過,我們已寄出重設密碼的連結,
						<br />
						請到信箱點擊信中連結完成重設(也記得看一下垃圾信件匣)。
					</p>
					<p className="mt-6 text-sm text-neutral-600">
						<LinkWithChannel href="/login" className="font-medium text-neutral-900 underline">
							回登入頁
						</LinkWithChannel>
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-16 w-full max-w-md">
			<h1 className="mb-2 text-center text-2xl font-semibold text-neutral-900">忘記密碼</h1>
			<p className="mb-6 text-center text-sm text-neutral-600">
				輸入註冊時使用的 Email,我們會寄重設密碼的連結給你。
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

				<div className="mb-6">
					<label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
						Email
					</label>
					<input
						required
						id="email"
						type="email"
						name="email"
						autoComplete="email"
						placeholder="you@example.com"
						className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-2 focus:border-neutral-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={pending}
					className="w-full rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{pending ? "寄送中…" : "寄送重設連結"}
				</button>
			</form>

			<p className="mt-6 text-center text-sm text-neutral-600">
				想起密碼了?{" "}
				<LinkWithChannel href="/login" className="font-medium text-neutral-900 underline">
					回登入頁
				</LinkWithChannel>
			</p>
		</div>
	);
}
