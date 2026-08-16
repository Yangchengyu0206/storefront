import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense, type ReactNode } from "react";
import { type Metadata } from "next";
import { DraftModeNotification } from "@/ui/components/DraftModeNotification";
import { STOREFRONT_URL } from "@/lib/env";

const inter = Inter({ subsets: ["latin"] });

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata: Metadata = {
	title: storeName,
	description: `${storeName}｜線上購物`,
	metadataBase: new URL(STOREFRONT_URL),
};

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	return (
		<html lang="zh-Hant" className="min-h-dvh">
			<body className={`${inter.className} min-h-dvh`}>
				{children}
				<Suspense>
					<DraftModeNotification />
				</Suspense>
			</body>
		</html>
	);
}
