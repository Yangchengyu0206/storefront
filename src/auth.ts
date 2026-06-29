import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LINE from "next-auth/providers/line";

// Auth.js(NextAuth v5)只當「社群 OAuth 中介」:驗證 Google / LINE 身分,
// 之後由 /api/auth/bridge 換成 Saleor 登入(見 lib/saleor-social-bridge.ts)。
//
// 需要的環境變數(Auth.js 會自動讀):
//   AUTH_SECRET           openssl rand -base64 32
//   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET     Google Cloud OAuth client
//   AUTH_LINE_ID / AUTH_LINE_SECRET         LINE Login channel(須與 Messaging API 同 provider)
export const { handlers, signIn, signOut, auth } = NextAuth({
	trustHost: true,
	providers: [
		Google,
		// 要拿到 email 需在 LINE Login channel 申請 email 權限;拿不到時 bridge 會用合成 email
		LINE({ authorization: { params: { scope: "openid profile email" } } }),
	],
	callbacks: {
		jwt({ token, account }) {
			if (account) {
				token.provider = account.provider;
				token.providerAccountId = account.providerAccountId;
			}
			return token;
		},
		session({ session, token }) {
			// 把 provider 與 providerAccountId(Google sub / LINE userId)帶到 session 給 bridge 用
			const s = session as typeof session & { provider?: unknown; providerAccountId?: unknown };
			s.provider = token.provider;
			s.providerAccountId = token.providerAccountId;
			return session;
		},
	},
});
