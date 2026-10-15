import { type NextRequest, NextResponse } from "next/server";
import { confirmSaleorAccount } from "@/lib/account-confirm";
import { safeChannel } from "@/lib/safe-channel";

// Saleor 註冊確認信的落點（見 lib/account-confirm.ts）。email 註冊與 LINE 首次登入都走這裡：
// 確認成功回登入頁顯示「已確認」，失敗（token 錯／過期）回登入頁顯示錯誤。
export async function GET(req: NextRequest) {
	const params = req.nextUrl.searchParams;
	const channel = safeChannel(params.get("channel"));
	const ok = await confirmSaleorAccount(params.get("email") ?? "", params.get("token") ?? "");
	const q = ok ? "notice=email_confirmed" : "social_error=confirm_failed";
	return NextResponse.redirect(new URL(`/${channel}/login?${q}`, req.url));
}
