import { createHmac } from "node:crypto";
import { getServerAuthClient } from "@/app/config";

// 把「已被 Auth.js 驗證過的社群身分」換成 Saleor 客戶登入。
//
// Saleor 沒有「幫任意使用者直接發 token」的 API,所以採用穩定衍生密碼:
//   password = HMAC(SECRET, provider:providerAccountId)
// 第一次登入 → accountRegister 建帳號;之後 → tokenCreate 直接登入。
// 不需另外存密碼(只靠一個 server 端 SECRET),也不需資料庫。
//
// 前提:該 channel 的 email 驗證需「關閉」(enable_account_confirmation_by_email=false),
// 社群建立的帳號才會直接啟用。否則 register 會回 requiresConfirmation,需另用 app token 確認。

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
		// channel 開了 email 驗證,社群帳號無法直接啟用
		return { ok: false, error: "needs_confirmation" };
	}

	// 3) 再登入一次
	const second = await authClient.signIn({ email, password }, { cache: "no-store" });
	if (second.data.tokenCreate.token && second.data.tokenCreate.errors.length === 0) {
		return { ok: true };
	}

	// 該 email 之前已用別的方式(如 email/密碼)註冊過,衍生密碼對不上
	return { ok: false, error: alreadyExists ? "email_taken" : "signin_failed" };
}
