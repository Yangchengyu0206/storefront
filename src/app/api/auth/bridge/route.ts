import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { bridgeSocialLogin } from "@/lib/saleor-social-bridge";

// Auth.js 完成 Google/LINE 登入後會導到這裡。
// 這裡讀出已驗證的社群身分 → 換成 Saleor 登入(寫 cookie)→ 導回首頁。
// 用 route handler(不是 page)才能在伺服器端寫 cookie。
export async function GET(req: NextRequest) {
	const channel =
		req.nextUrl.searchParams.get("channel") || process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "default-channel";

	const session = await auth();
	const provider = (session as { provider?: string } | null)?.provider;
	const providerAccountId = (session as { providerAccountId?: string } | null)?.providerAccountId;

	if (!session?.user || !provider || !providerAccountId) {
		return NextResponse.redirect(new URL(`/${channel}/login?social_error=no_session`, req.url));
	}

	const result = await bridgeSocialLogin({
		provider,
		providerAccountId,
		email: session.user.email,
		firstName: session.user.name,
		channel,
	});

	const dest = result.ok
		? `/${channel}`
		: `/${channel}/login?social_error=${encodeURIComponent(result.error)}`;
	return NextResponse.redirect(new URL(dest, req.url));
}
