import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AccountMeDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { setLineBinding } from "@/lib/line-binding";

// 「我的帳戶 → 綁定 LINE」：已登入的客人走一次 LINE Login 之後導到這裡。
//
// 跟 /api/auth/bridge 的差別：bridge 是「用 LINE 登入（換一個 Saleor 帳號）」，
// 這裡是「把 LINE 掛到**目前已登入**的帳號上」——大多數客人是用 email 註冊的，
// 不走這條就永遠綁不了（bridge 對既有 email 帳號一律回 email_taken，見 Method A）。
//
// 兩個身分都由伺服器端確認：Saleor 帳號看登入 cookie（me），LINE 身分看 Auth.js session
// （剛完成的 OAuth）。不接受任何從網址或表單帶進來的 userId。
export async function GET(req: NextRequest) {
	const channel =
		req.nextUrl.searchParams.get("channel") || process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "default-channel";
	const back = (q: string) => NextResponse.redirect(new URL(`/${channel}/account?${q}`, req.url));

	const { me } = await executeGraphQL(AccountMeDocument, { cache: "no-store" });
	if (!me) {
		return NextResponse.redirect(new URL(`/${channel}/login`, req.url));
	}

	const session = (await auth()) as { provider?: string; providerAccountId?: string } | null;
	if (session?.provider !== "line" || !session.providerAccountId) {
		return back("line_error=no_session");
	}

	const ok = await setLineBinding({
		saleorUserId: me.id,
		email: me.email,
		lineUserId: session.providerAccountId,
		source: "account",
	});
	return back(ok ? "line=linked" : "line_error=save_failed");
}
