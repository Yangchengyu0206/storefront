import { createHmac } from "node:crypto";
import { getServerAuthClient } from "@/app/config";

// 把「已被 Auth.js 驗證過的社群身分」換成 Saleor 客戶登入。
//
// Saleor 沒有「幫任意使用者直接發 token」的 API,所以採用穩定衍生密碼:
//   password = HMAC(SECRET, provider:providerAccountId)
// 第一次登入 → accountRegister 建帳號;之後 → tokenCreate 直接登入。
// 不需另外存密碼(只靠一個 server 端 SECRET),也不需資料庫。
//
// confirm-conflict 解法:accountRegister 一律設好衍生密碼;若 channel 開了 email 驗證
// 導致帳號未啟用,改用 app token(MANAGE_USERS)直接啟用(社群 email 已由 OAuth 驗證,
// 見 auth.ts signIn 安全閘)。channel 的 email 註冊確認信因此可維持開啟,兩者不衝突。

const SECRET = process.env.SALEOR_SOCIAL_BRIDGE_SECRET ?? "";

export function derivePassword(provider: string, providerAccountId: string): string {
	const h = createHmac("sha256", SECRET).update(`${provider}:${providerAccountId}`).digest("base64url");
	// 前綴確保符合 Saleor 密碼規則(長度 + 大小寫/數字/符號)
	return `Aa1!${h.slice(0, 28)}`;
}

type AccountRegisterResult = {
	data?: {
		accountRegister?: {
			requiresConfirmation: boolean;
			errors: { code: string; field: string | null; message: string | null }[];
		};
	};
	errors?: { message: string }[];
};

const ACCOUNT_REGISTER = /* GraphQL */ `
	mutation SocialAccountRegister($input: AccountRegisterInput!) {
		accountRegister(input: $input) {
			requiresConfirmation
			errors {
				code
				field
				message
			}
		}
	}
`;

async function registerSaleorAccount(input: {
	email: string;
	password: string;
	firstName: string;
	channel: string;
}): Promise<AccountRegisterResult> {
	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!apiUrl) {
		return { errors: [{ message: "missing NEXT_PUBLIC_SALEOR_API_URL" }] };
	}
	const res = await fetch(apiUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		cache: "no-store",
		body: JSON.stringify({ query: ACCOUNT_REGISTER, variables: { input } }),
	});
	return (await res.json()) as AccountRegisterResult;
}

// 用 app token(MANAGE_USERS)把「開了 email 驗證的 channel 下 accountRegister 建立的
// 未啟用帳號」直接啟用。社群身分的 email 已由 OAuth provider 驗證(見 auth.ts signIn 安全閘),
// 不需再寄 Saleor 確認信 → channel 的 email 註冊確認信可維持開啟,兩者不衝突。
async function activateAccountViaApp(email: string): Promise<boolean> {
	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	const appToken = process.env.SALEOR_APP_TOKEN;
	if (!apiUrl || !appToken) return false;
	// 1) 查 user id
	const q = /* GraphQL */ `query BridgeGetUser($email: String!) { user(email: $email) { id isActive } }`;
	const uRes = await fetch(apiUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${appToken}` },
		cache: "no-store",
		body: JSON.stringify({ query: q, variables: { email } }),
	});
	const uJson = (await uRes.json()) as { data?: { user?: { id: string; isActive: boolean } | null } };
	const user = uJson.data?.user;
	if (!user) return false;
	if (user.isActive) return true;
	// 2) customerUpdate 啟用
	const m = /* GraphQL */ `mutation BridgeActivate($id: ID!) { customerUpdate(id: $id, input: { isActive: true }) { user { isActive } errors { code } } }`;
	const aRes = await fetch(apiUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${appToken}` },
		cache: "no-store",
		body: JSON.stringify({ query: m, variables: { id: user.id } }),
	});
	const aJson = (await aRes.json()) as {
		data?: { customerUpdate?: { user?: { isActive: boolean } | null; errors: { code: string }[] } };
	};
	return aJson.data?.customerUpdate?.user?.isActive === true;
}

export type BridgeResult = { ok: true } | { ok: false; error: string };

export async function bridgeSocialLogin(params: {
	provider: string;
	providerAccountId: string;
	email?: string | null;
	firstName?: string | null;
	channel: string;
}): Promise<BridgeResult> {
	if (!SECRET) {
		return { ok: false, error: "missing_bridge_secret" };
	}
	if (!params.provider || !params.providerAccountId) {
		return { ok: false, error: "missing_identity" };
	}

	const { provider, providerAccountId, channel } = params;
	// LINE 常拿不到 email → 用 provider + userId 合成穩定 email
	const email = params.email?.trim() || `${provider}_${providerAccountId}@social.local`;
	const firstName = params.firstName?.trim() ?? "";
	const password = derivePassword(provider, providerAccountId);

	const authClient = await getServerAuthClient();

	// 1) 老用戶:直接登入(signIn 會把 Saleor token 寫進 cookie)
	const first = await authClient.signIn({ email, password }, { cache: "no-store" });
	if (first.data.tokenCreate.token && first.data.tokenCreate.errors.length === 0) {
		return { ok: true };
	}

	// 2) 沒帳號 → 註冊
	const reg = await registerSaleorAccount({ email, password, firstName, channel });
	const payload = reg.data?.accountRegister;
	if (reg.errors?.length || !payload) {
		return { ok: false, error: "register_failed" };
	}

	const alreadyExists = payload.errors.some((e) => e.code === "UNIQUE");
	if (payload.errors.length > 0 && !alreadyExists) {
		return { ok: false, error: payload.errors[0].code || "register_failed" };
	}
	if (payload.requiresConfirmation) {
		// OAuth 已驗證 email(auth.ts 安全閘)→ 用 app token 直接啟用,不寄確認信。
		const activated = await activateAccountViaApp(email);
		if (!activated) {
			return { ok: false, error: "activation_failed" };
		}
	}

	// 3) 再登入一次
	const second = await authClient.signIn({ email, password }, { cache: "no-store" });
	if (second.data.tokenCreate.token && second.data.tokenCreate.errors.length === 0) {
		return { ok: true };
	}

	// Method A(最安全):該 email 之前已用 email/密碼註冊過 → 不碰既有帳號密碼,
	// 回 email_taken 讓前端提示改用原本方式登入(不做靜默改密碼的自動綁定)。
	return { ok: false, error: alreadyExists ? "email_taken" : "signin_failed" };
}
