"use client";

import { useEffect } from "react";
import { type AnalyticsItem, ANALYTICS_ENABLED, trackViewItem } from "@/lib/analytics";

/** 商品頁掛一個：載入（或換變體）時送 GA4 view_item / Meta ViewContent。追蹤未啟用時什麼都不做。 */
export function TrackViewItem({ item, currency }: { item: AnalyticsItem; currency?: string | null }) {
	const { id, name, price, variant } = item;
	useEffect(() => {
		if (!ANALYTICS_ENABLED) return;
		// 等 afterInteractive 的初始化腳本跑完（最多 ~5 秒）。
		let tries = 0;
		let timer = 0;
		const send = () => {
			if (typeof window.gtag === "function" || typeof window.fbq === "function" || tries >= 50) {
				trackViewItem({ id, name, price, variant }, currency);
				return;
			}
			tries += 1;
			timer = window.setTimeout(send, 100);
		};
		timer = window.setTimeout(send, 0);
		return () => window.clearTimeout(timer);
	}, [id, name, price, variant, currency]);

	return null;
}
