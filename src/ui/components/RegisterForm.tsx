"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/app/[channel]/(main)/register/actions";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { SocialLoginButtons } from "@/ui/components/SocialLoginButtons";

export function RegisterForm({ channel }: { channel: string }) {
	const [state, formAction, pending] = useActionState<RegisterState, FormData>(
		registerAction.bind(null, channel),
		undefined,
	);

	if (state?.needsConfirmation) {
		return (
			<div className="mx-auto mt-16 w-full max-w-md text-center">
				<h1 className="mb-4 text-2xl font-semibold text-ink-900">註冊成功 🎉</h1>
				<p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
					我們已寄出一封驗證信,請到信箱點擊連結完成啟用,即可登入。
				</p>
				<p className="mt-6 text-sm text-ink-600">
					已完成驗證?{" "}
					<LinkWithChannel href="/login" className="font-medium text-ink-900 underline">
						前往登入
					</LinkWithChannel>
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-16 w-full max-w-md">
			<h1 className="mb-6 text-center text-2xl font-semibold text-ink-900">註冊</h1>

			<form className="rounded-lg border bg-white p-8 shadow-sm" action={formAction}>
				{state?.error ? (
					<p
						role="alert"
						className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					>
						{state.error}
					</p>
				) : null}

				<div className="mb-4">
					<label htmlFor="firstName" className="mb-1 block text-sm font-medium text-ink-700">
						姓名
					</label>
					<input
						id="firstName"
						type="text"
						name="firstName"
						autoComplete="name"
						placeholder="您的稱呼"
						className="w-full rounded-md border border-ink-300 bg-ink-50 px-4 py-2 focus:border-ink-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<div className="mb-4">
					<label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-700">
						Email
					</label>
					<input
						required
						id="email"
						type="email"
						name="email"
						autoComplete="email"
						placeholder="you@example.com"
						className="w-full rounded-md border border-ink-300 bg-ink-50 px-4 py-2 focus:border-ink-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<div className="mb-4">
					<label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-700">
						密碼
					</label>
					<input
						required
						id="password"
						type="password"
						name="password"
						autoComplete="new-password"
						autoCapitalize="off"
						placeholder="至少 8 個字元"
						className="w-full rounded-md border border-ink-300 bg-ink-50 px-4 py-2 focus:border-ink-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<div className="mb-6">
					<label htmlFor="confirm" className="mb-1 block text-sm font-medium text-ink-700">
						確認密碼
					</label>
					<input
						required
						id="confirm"
						type="password"
						name="confirm"
						autoComplete="new-password"
						autoCapitalize="off"
						placeholder="再輸入一次密碼"
						className="w-full rounded-md border border-ink-300 bg-ink-50 px-4 py-2 focus:border-ink-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={pending}
					className="w-full rounded-md bg-ink-900 px-4 py-2.5 font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{pending ? "註冊中…" : "註冊"}
				</button>

				<SocialLoginButtons channel={channel} />
			</form>

			<p className="mt-6 text-center text-sm text-ink-600">
				已經有帳號?{" "}
				<LinkWithChannel href="/login" className="font-medium text-ink-900 underline">
					前往登入
				</LinkWithChannel>
			</p>
		</div>
	);
}
