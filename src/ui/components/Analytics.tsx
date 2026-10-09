"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { GA4_ID, META_PIXEL_ID, ANALYTICS_ENABLED, trackPageView } from "@/lib/analytics";

/**
 * GA4 + Meta Pixel 載入器（env 閘門：NEXT_PUBLIC_GA4_ID / NEXT_PUBLIC_META_PIXEL_ID，皆未設定時不渲染任何東西）。
 *
 * App Router 換頁不會重新載入整頁，所以 page_view / PageView 不靠兩家腳本自己送
 * （GA4 config 關掉 send_page_view、Pixel init 後不直接 track），而是由下面的
 * effect 在每次 pathname / query 變動時送一次——第一次載入也是同一條路徑，不會重複。
 *
 * CSP：next.config.js 的 script-src / connect-src / img-src 已含 `https:`，
 * googletagmanager.com、google-analytics.com、connect.facebook.net、facebook.com 不用另外放行。
 */
export function Analytics() {
	if (!ANALYTICS_ENABLED) return null;

	return (
		<>
			{GA4_ID && (
				<>
					<Script
						id="ga4-src"
						src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`}
						strategy="afterInteractive"
					/>
					<Script id="ga4-init" strategy="afterInteractive">
						{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(
							GA4_ID,
						)},{send_page_view:false});`}
					</Script>
				</>
			)}
			{META_PIXEL_ID && (
				<Script id="meta-pixel-init" strategy="afterInteractive">
					{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(
						META_PIXEL_ID,
					)});`}
				</Script>
			)}
			<PageViewTracker />
		</>
	);
}

function PageViewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const query = searchParams?.toString();

	useEffect(() => {
		if (!pathname) return;
		const path = query ? `${pathname}?${query}` : pathname;
		// afterInteractive 的初始化腳本可能比第一次 effect 晚一點跑完；
		// window.gtag / fbq 的佇列 stub 一出現就送，最多等 ~5 秒。
		let tries = 0;
		let timer = 0;
		const send = () => {
			const gaReady = !GA4_ID || typeof window.gtag === "function";
			const fbReady = !META_PIXEL_ID || typeof window.fbq === "function";
			if ((gaReady && fbReady) || tries >= 50) {
				trackPageView(path);
				return;
			}
			tries += 1;
			timer = window.setTimeout(send, 100);
		};
		timer = window.setTimeout(send, 0);
		return () => window.clearTimeout(timer);
	}, [pathname, query]);

	return null;
}
