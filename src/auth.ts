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
		// bot_prompt=aggressive:授權畫面同時詢問「加官方帳號好友」——沒加好友的人推播不到。
		// 要在 LINE Login channel 設定「Linked OA」指向客人用的官方帳號才會出現。
		LINE({ authorization: { params: { scope: "openid profile email", bot_prompt: "aggressive" } } }),
	],
	callbacks: {
		// 安全閘:只允許「OAuth provider 已驗證 email」的身分進入 Saleor 橋接。
		// 未驗證 email 一律拒絕,避免被拿來綁定/建立既有 email 的 Saleor 帳號(帳號劫持防護)。
		signIn({ account, profile }) {
			if (account?.provider === "google") {
				// Google 一定會回 email_verified;非 true 直接拒絕
				return profile?.email_verified === true;
			}
			if (account?.provider === "line") {
				// LINE 的 ID token 沒有 email_verified,官方也沒保證 email 已驗證。放行,但 bridge 對
				// 帶真實 email 的新帳號不代為啟用,要客人點 Saleor 確認信(證明擁有信箱)才會啟用並
				// 歸戶舊訂單;拿不到 email 時用合成 email(provider_id@social.local),不觸及任何真實帳號。
				return true;
			}
			return true;
		},
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
