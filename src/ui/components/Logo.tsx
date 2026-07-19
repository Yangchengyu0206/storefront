"use client";

import { usePathname } from "next/navigation";
import { LinkWithChannel } from "../atoms/LinkWithChannel";

// 店名以 env 驅動（頁尾亦使用 NEXT_PUBLIC_SELLER_NAME）；未設定時退回中性字樣，避免露出 demo 品牌
const companyName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const Logo = () => {
	const pathname = usePathname();

	if (pathname === "/") {
		return (
			<h1 className="flex items-center font-bold" aria-label="homepage">
				{companyName}
			</h1>
		);
	}
	return (
		<div className="flex items-center font-bold">
			<LinkWithChannel aria-label="homepage" href="/">
				{companyName}
			</LinkWithChannel>
		</div>
	);
};
