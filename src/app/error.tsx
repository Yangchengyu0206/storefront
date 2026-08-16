"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * 全站錯誤頁（SF-11）。
 *
 * 原本這頁把 `error.message` 直接印在畫面上。兩個問題：
 *   1. 那是英文的原始技術訊息（GraphQL 錯誤、fetch failed…），客人看不懂，
 *      而且在購物網站上出現這種畫面正是典型的「這站沒做完／可能是詐騙」訊號。
 *   2. client component 的錯誤訊息**不會**被 Next.js 遮蔽（只有 server component
 *      的會替換成 digest），所以內部細節會真的送到客人眼前。
 *
 * 改成：對客人講人話，把技術細節留在 console 給我們自己看，並顯示 digest
 * 當作客服對帳用的代碼——客人回報時能講出一組編號，比「就是壞了」好追太多。
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error);
		// 錯誤邊界抓到的東西不會自己進 Sentry，要在這裡明送一次（SF-07）。
		// 這頁被看到就代表客人真的撞牆了，是最該被記錄的一類事件。
		Sentry.captureException(error);
	}, [error]);

	return (
		<div className="bg-white">
			<div className="mx-auto max-w-7xl px-6 py-12">
				<h1 className="text-2xl font-bold leading-10 tracking-tight text-neutral-800">
					這個頁面暫時出了點問題
				</h1>
				<p className="mt-6 max-w-2xl text-base leading-7 text-neutral-600">
					請稍後再試一次。如果一直遇到同樣的情況，歡迎聯絡客服，我們會協助處理。
				</p>
				{error.digest && (
					<p className="mt-3 text-sm text-neutral-500">
						聯絡客服時可提供這組代碼：<code className="font-mono">{error.digest}</code>
					</p>
				)}
				<button
					className="mt-8 h-10 rounded-md bg-neutral-900 px-6 font-semibold text-white hover:bg-neutral-800"
					onClick={() => reset()}
				>
					重新載入
				</button>
			</div>
		</div>
	);
}
