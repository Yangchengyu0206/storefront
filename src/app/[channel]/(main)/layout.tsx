import { type ReactNode } from "react";
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
			<Header channel={channel} />
			<div className="flex min-h-[calc(100dvh-64px)] flex-col">
				<main className="flex-1">{props.children}</main>
				<Footer channel={channel} />
			</div>
		</>
	);
}
