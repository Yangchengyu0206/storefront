import { type ReactNode } from "react";
import { AnnouncementBar } from "@/ui/components/AnnouncementBar";
import { Footer } from "@/ui/components/Footer";
import { Header } from "@/ui/components/Header";

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata = {
	title: storeName,
	description: `${storeName}｜線上購物`,
};

export default async function RootLayout(props: {
	children: ReactNode;
	params: Promise<{ channel: string }>;
}) {
	const channel = (await props.params).channel;

	return (
		<>
			{/* First tab stop on every page. Without it a keyboard user has to walk
			    the whole nav before reaching content on every navigation. */}
			<a href="#main" className="skip-link">
				跳到主要內容
			</a>
			{/* 後台「前台公告與版位」設定的公告列；沒設定時不佔任何空間 */}
			<AnnouncementBar />
			<Header channel={channel} />
			<div className="flex min-h-[calc(100dvh-64px)] flex-col">
				<main id="main" className="flex-1">
					{props.children}
				</main>
				<Footer channel={channel} />
			</div>
		</>
	);
}
