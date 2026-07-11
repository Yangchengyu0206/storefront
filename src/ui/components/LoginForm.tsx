"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/[channel]/(main)/login/actions";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { SocialLoginButtons } from "@/ui/components/SocialLoginButtons";

export function LoginForm({ channel }: { channel: string }) {
	const [state, formAction, pending] = useActionState<LoginState, FormData>(
		loginAction.bind(null, channel),
		undefined,
	);

	return (
		<div className="mx-auto mt-16 w-full max-w-md">
			<h1 className="mb-6 text-center text-2xl font-semibold text-neutral-900">登入</h1>

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

				<div className="mb-6">
					<div className="mb-1 flex items-center justify-between">
						<label htmlFor="password" className="block text-sm font-medium text-neutral-700">
							密碼
						</label>
						<LinkWithChannel
							href="/forgot-password"
							className="text-sm text-neutral-500 underline hover:text-neutral-900"
						>
							忘記密碼?
						</LinkWithChannel>
					</div>
					<input
						required
						id="password"
						type="password"
						name="password"
						autoComplete="current-password"
						autoCapitalize="off"
						placeholder="請輸入密碼"
						className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-2 focus:border-neutral-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={pending}
					className="w-full rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{pending ? "登入中…" : "登入"}
				</button>

				<SocialLoginButtons channel={channel} />
			</form>

			<p className="mt-6 text-center text-sm text-neutral-600">
				還沒有帳號?{" "}
				<LinkWithChannel href="/register" className="font-medium text-neutral-900 underline">
					立即註冊
				</LinkWithChannel>
			</p>
		</div>
	);
}
