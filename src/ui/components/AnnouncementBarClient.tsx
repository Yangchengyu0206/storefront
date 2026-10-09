"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

const STORAGE_KEY = "announcement-dismissed";
const BAR_ID = "store-announcement";

function readDismissed(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		// 無痕模式／封鎖網站資料時 localStorage 會丟例外——當作沒關過
		return null;
	}
}

/**
 * 公告列（可關閉）。關閉狀態存在 localStorage，鍵值是公告內容指紋：
 * 後台改了文字就會重新出現；存取失敗（無痕、封鎖）就只在這一頁關掉。
 *
 * 首次繪製前的隱藏由下方的行內 script 處理（伺服器端讀不到 localStorage，
 * 不這樣做的話，關過的人每換一頁都會看到公告閃一下）。
 */
export function AnnouncementBarClient({
	text,
	link,
	version,
}: {
	text: string;
	link: string | null;
	version: string;
}) {
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (readDismissed() === version) setDismissed(true);
	}, [version]);

	if (dismissed) return null;

	const external = link ? /^https?:\/\//i.test(link) : false;
	const content = <span className="line-clamp-2 sm:line-clamp-1">{text}</span>;

	return (
		<>
			<div
				id={BAR_ID}
				role="region"
				aria-label="商店公告"
				className="relative bg-accent text-accent-fg"
				suppressHydrationWarning
			>
				<div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-10 py-2 text-center text-sm">
					{link ? (
						external ? (
							<a
								href={link}
								target="_blank"
								rel="noopener noreferrer"
								className="underline-offset-4 hover:underline"
							>
								{content}
							</a>
						) : (
							<Link href={link} className="underline-offset-4 hover:underline">
								{content}
							</Link>
						)
					) : (
						content
					)}
				</div>
				<button
					type="button"
					aria-label="關閉公告"
					onClick={() => {
						try {
							window.localStorage.setItem(STORAGE_KEY, version);
						} catch {
							// 存不了就只關這一次
						}
						setDismissed(true);
					}}
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-1.5 text-accent-fg/80 hover:bg-accent-fg/10 hover:text-accent-fg"
				>
					<XIcon className="h-4 w-4" aria-hidden="true" />
				</button>
			</div>
			<script
				// 在第一次繪製前就把「已關過」的公告藏起來；任何錯誤都吞掉
				dangerouslySetInnerHTML={{
					__html: `try{if(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})===${JSON.stringify(
						version,
					)}){var e=document.getElementById(${JSON.stringify(
						BAR_ID,
					)});if(e)e.style.display="none"}}catch(_){}`,
				}}
			/>
		</>
	);
}
