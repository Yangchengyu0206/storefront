import { WishRequestForm } from "./WishRequestForm";
import { CurrentUserDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";

const storeName = process.env.NEXT_PUBLIC_SELLER_NAME || "商店";

export const metadata = {
	title: `許願／詢價 · ${storeName}`,
	description: `找不到想要的商品？丟連結或截圖給${storeName}，我們幫您問貨源與價格。`,
};

/**
 * 許願／報價入口（功能缺口研究 §2b）。
 *
 * 代購客人最常問的是「這個你們買得到嗎、多少錢」。這頁讓客人丟連結／截圖＋規格＋聯絡方式，
 * 送到後台「許願單」頁由老闆報價；不需要登入。
 *
 * 送出走 server action（actions.ts → lib/wish-request.ts → api-core），有每 IP 節流與蜜罐欄位。
 * 已登入時只用 `me.email` 預填聯絡 Email；真正寫進「已登入會員」欄位的值由 server action
 * 自己再查一次 session，不吃表單送來的身分。
 */
export default async function WishPage(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 200) : "";

	let defaultEmail = "";
	try {
		const { me } = await executeGraphQL(CurrentUserDocument, { cache: "no-cache" });
		defaultEmail = me?.email ?? "";
	} catch {
		// 查不到 session 就當訪客
	}

	return (
		<div className="mx-auto max-w-3xl p-8">
			<h1 className="text-2xl font-bold tracking-tight text-ink-900">許願／詢價</h1>
			<p className="mt-2 text-sm text-ink-600">
				在國外看到想要的東西，或是店裡找不到？貼上商品連結或截圖，告訴我們顏色、尺寸與數量，
				我們會確認貨源並用 Email 回覆報價。送出許願不需要付款，也不代表成立訂單。
			</p>

			<WishRequestForm defaultEmail={defaultEmail} defaultDescription={q} />
		</div>
	);
}
