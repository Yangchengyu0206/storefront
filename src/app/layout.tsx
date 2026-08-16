import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense, type ReactNode } from "react";
import { type Metadata } from "next";
import { DraftModeNotification } from "@/ui/components/DraftModeNotification";
import { STOREFRONT_URL } from "@/lib/env";

// Latin faces. Inter was the previous default and is the single most common
// LLM/template typeface; Geist has more character at display sizes and keeps
// digits even in price columns. CJK resolves to the platform face, see the
// font stack in tailwind.config.ts.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata: Metadata = {
	title: storeName,
	description: `${storeName}｜線上購物`,
	metadataBase: new URL(STOREFRONT_URL),
};

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	return (
		<html lang="zh-Hant" className={`${sans.variable} ${mono.variable} min-h-dvh`}>
			<body className="min-h-dvh font-sans">
				{children}
				<Suspense>
					<DraftModeNotification />
				</Suspense>
			</body>
		</html>
	);
}
