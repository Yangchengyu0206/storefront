"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/[channel]/(main)/login/actions";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { SocialLoginButtons } from "@/ui/components/SocialLoginButtons";

// /api/auth/bridge 失敗時帶回來的 social_error（見 lib/saleor-social-bridge.ts）。
// 過去登入頁完全不讀它：社群登入失敗只會被默默丟回登入頁，客人不知道發生什麼事。
const SOCIAL_ERRORS: Record<string, string> = {
	email_taken: "這個 Email 已經用密碼註冊過了，請改用 Email 和密碼登入。登入後可在「我的帳戶」綁定 LINE。",
	no_session: "社群登入沒有完成，請再試一次。",
	missing_identity: "社群登入沒有完成，請再試一次。",
	confirm_email_pending:
		"我們已寄一封確認信到你 LINE 帳號的 Email。請點信中的連結完成驗證，再用 LINE 登入一次。",
	confirm_failed: "確認連結無效或已過期，請再試一次；若仍無法完成，請聯絡客服。",
};
// 非錯誤的提示（綠色）。
const NOTICES: Record<string, string> = {
	email_confirmed: "Email 已確認完成，請重新登入（用 LINE 註冊的請再按一次 LINE 登入）。",
};
const SOCIAL_ERROR_FALLBACK = "社群登入暫時無法使用，請改用 Email 登入。";

export function LoginForm({
	channel,
	socialError,
	notice,
}: {
	channel: string;
	socialError?: string;
	notice?: string;
}) {
	const [state, formAction, pending] = useActionState<LoginState, FormData>(
		loginAction.bind(null, channel),
		undefined,
	);
	const error =
		state?.error ?? (socialError ? SOCIAL_ERRORS[socialError] ?? SOCIAL_ERROR_FALLBACK : undefined);
	const info = !error && notice ? NOTICES[notice] : undefined;

	return (
		<div className="mx-auto mt-16 w-full max-w-md">
			<h1 className="mb-6 text-center text-2xl font-semibold text-ink-900">登入</h1>

			<form className="rounded-lg border bg-white p-8 shadow-sm" action={formAction}>
				{error ? (
					<p
						role="alert"
						className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					>
						{error}
					</p>
				) : null}
				{info ? (
					<p
						role="status"
						className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
					>
						{info}
					</p>
				) : null}

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

				<div className="mb-6">
					<div className="mb-1 flex items-center justify-between">
						<label htmlFor="password" className="block text-sm font-medium text-ink-700">
							密碼
						</label>
						<LinkWithChannel
							href="/forgot-password"
							className="text-sm text-ink-500 underline hover:text-ink-900"
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
						className="w-full rounded-md border border-ink-300 bg-ink-50 px-4 py-2 focus:border-ink-800 focus:bg-white focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={pending}
					className="w-full rounded-md bg-ink-900 px-4 py-2.5 font-medium text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{pending ? "登入中…" : "登入"}
				</button>

				<SocialLoginButtons channel={channel} />
			</form>

			<p className="mt-6 text-center text-sm text-ink-600">
				還沒有帳號?{" "}
				<LinkWithChannel href="/register" className="font-medium text-ink-900 underline">
					立即註冊
				</LinkWithChannel>
			</p>
		</div>
	);
}
