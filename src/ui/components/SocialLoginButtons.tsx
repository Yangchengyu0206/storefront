"use client";

import { signIn } from "next-auth/react";

// 社群登入(Approach A:Auth.js 接 Google/LINE → /api/auth/bridge 換成 Saleor 登入)。
//
// 點亮條件(預設關,避免未設定前壞畫面):
//   NEXT_PUBLIC_SOCIAL_LOGIN_ENABLED=true
// 並設好 AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_LINE_ID / AUTH_LINE_SECRET
// 與 SALEOR_SOCIAL_BRIDGE_SECRET(見 lib/saleor-social-bridge.ts)。

const enabled = process.env.NEXT_PUBLIC_SOCIAL_LOGIN_ENABLED === "true";

const buttonClass =
	"flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 font-medium text-neutral-800 transition hover:bg-neutral-50";

export function SocialLoginButtons({ channel }: { channel: string }) {
	if (!enabled) {
		return null;
	}

	const redirectTo = `/api/auth/bridge?channel=${channel}`;

	return (
		<div className="mt-6">
			<div className="relative mb-4 text-center">
				<span className="relative z-10 bg-white px-3 text-xs text-neutral-400">或使用社群帳號</span>
				<span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-neutral-200" />
			</div>

			<div className="space-y-2">
				<button type="button" className={buttonClass} onClick={() => void signIn("google", { redirectTo })}>
					使用 Google 登入
				</button>
				<button
					type="button"
					className={`${buttonClass} border-[#06C755] text-[#06C755] hover:bg-[#06C755]/5`}
					onClick={() => void signIn("line", { redirectTo })}
				>
					使用 LINE 登入
				</button>
			</div>
		</div>
	);
}
