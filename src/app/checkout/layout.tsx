import { type ReactNode } from "react";
import { AuthProvider } from "@/ui/components/AuthProvider";

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata = {
	title: `結帳 · ${storeName}`,
	description: `${storeName}｜線上購物`,
};

export default function RootLayout(props: { children: ReactNode }) {
	return (
		<main>
			<AuthProvider>{props.children}</AuthProvider>
		</main>
	);
}
