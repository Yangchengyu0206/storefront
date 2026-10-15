import { createHmac } from "node:crypto";
import { getServerAuthClient } from "@/app/config";
import { confirmAccountUrl } from "@/lib/account-confirm";
import { saleorUserIdFromToken, setLineBinding } from "@/lib/line-binding";

// 把「已被 Auth.js 驗證過的社群身分」換成 Saleor 客戶登入。
//
// Saleor 沒有「幫任意使用者直接發 token」的 API,所以採用穩定衍生密碼:
//   password = HMAC(SECRET, provider:providerAccountId)
// 第一次登入 → accountRegister 建帳號;之後 → tokenCreate 直接登入。
// 不需另外存密碼(只靠一個 server 端 SECRET),也不需資料庫。
//
// confirm-conflict 解法:accountRegister 一律設好衍生密碼;若 channel 開了 email 驗證
// 導致帳號未啟用,改用 app token(MANAGE_USERS)直接啟用(Google email 已由 OAuth 驗證,
// 見 auth.ts signIn 安全閘)。channel 的 email 註冊確認信因此可維持開啟,兩者不衝突。
// 例外:LINE 帶真實 email 的新帳號不代為啟用,要客人點 Saleor 確認信(見 bridgeSocialLogin)。

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
	redirectUrl: string;
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

// 把「剛由 accountRegister 建立、卡在 email 確認」的帳號直接啟用（OAuth 已驗過 email，
// 見 auth.ts signIn 安全閘），channel 的註冊確認信可以維持開啟。
// 啟用需要 MANAGE_USERS——storefront 不持有全權 token，由 api-core 代做
// （api-core 那邊另有守門：只啟用剛建立、非員工的帳號）。
async function activateNewAccount(email: string, password: string): Promise<boolean> {
	const base = process.env.API_CORE_URL || process.env.NEXT_PUBLIC_API_URL;
	const secret = process.env.API_CORE_INTERNAL_SECRET;
	if (!base || !secret) return false;
	const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/customers/social/activate`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Internal-Token": secret },
		cache: "no-store",
		// 帶上橋接設的密碼：api-core 用它向 Saleor 證明帳號是我們剛建的，不是別人用同一個
		// email 預先註冊的（Saleor 3.22.16 的 accountRegister 不回 UNIQUE，下面的 alreadyExists 判斷擋不到）。
		body: JSON.stringify({ email, password }),
	});
	if (!res.ok) return false;
	return ((await res.json()) as { active?: boolean }).active === true;
}

// 用 LINE 登入的帳號順手完成 LINE 綁定（通知用）。這個 userId 是 OAuth 剛驗過的本人。
// 寫入失敗不影響登入——客人之後仍可在「我的帳戶」重新綁定。
async function recordLineBinding(
	provider: string,
	providerAccountId: string,
	email: string,
	saleorToken: string,
): Promise<void> {
	if (provider !== "line") return;
	try {
		const saleorUserId = saleorUserIdFromToken(saleorToken);
		if (saleorUserId) {
			await setLineBinding({ saleorUserId, email, lineUserId: providerAccountId, source: "login" });
		}
	} catch {
		// 刻意吞掉：綁定是附帶功能，不能讓登入失敗
	}
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
	const realEmail = params.email?.trim() || "";
	const email = realEmail || `${provider}_${providerAccountId}@social.local`;
	// LINE 的 ID token 沒有 email_verified，官方文件也沒保證回傳的 email 已驗證（2026-10-09 安全稽核
	// 待驗證線索）。而帳號一被確認，Saleor 就會把「同 email 的所有訪客舊訂單」歸到這個帳號
	// （match_orders_with_new_user）。所以 LINE 帶真實 email 的新帳號不代為啟用，改走 Saleor 確認信：
	// 客人點了信才算證明擁有這個信箱。Google 有 email_verified（auth.ts 已擋），合成 email 不對應任何訂單。
	const mustProveEmail = provider === "line" && Boolean(realEmail);
	const firstName = params.firstName?.trim() ?? "";
	const password = derivePassword(provider, providerAccountId);

	const authClient = await getServerAuthClient();

	// 1) 老用戶:直接登入(signIn 會把 Saleor token 寫進 cookie)
	const first = await authClient.signIn({ email, password }, { cache: "no-store" });
	if (first.data.tokenCreate.token && first.data.tokenCreate.errors.length === 0) {
		await recordLineBinding(provider, providerAccountId, email, first.data.tokenCreate.token);
		return { ok: true };
	}
	// ACCOUNT_NOT_CONFIRMED 只在密碼正確時才會回（api-core 啟用端點也靠這點），所以這是我們
	// 先前替這個 LINE 身分建的帳號，還在等客人點確認信——不是別人的帳號。
	// （auth-sdk 的 tokenCreate 有查 code，只是型別只宣告了 message。）
	const firstErrors = first.data.tokenCreate.errors as { code?: string }[];
	if (mustProveEmail && firstErrors.some((e) => e.code === "ACCOUNT_NOT_CONFIRMED")) {
		return { ok: false, error: "confirm_email_pending" };
	}

	// 2) 沒帳號 → 註冊
	// redirectUrl：channel 開著註冊確認信時 Saleor 規定必填（缺了整個 accountRegister 回
	// REQUIRED，新客人第一次社群登入必定失敗）。Saleor 會在後面接 ?email=&token=，由
	// /api/auth/confirm-account 呼叫 confirmAccount。
	const reg = await registerSaleorAccount({
		email,
		password,
		firstName,
		channel,
		redirectUrl: confirmAccountUrl(channel),
	});
	const payload = reg.data?.accountRegister;
	if (reg.errors?.length || !payload) {
		return { ok: false, error: "register_failed" };
	}

	const alreadyExists = payload.errors.some((e) => e.code === "UNIQUE");
	if (payload.errors.length > 0 && !alreadyExists) {
		return { ok: false, error: payload.errors[0].code || "register_failed" };
	}
	// LINE 帶真實 email：不代為啟用，交給 Saleor 確認信（見上方 mustProveEmail），下面再登入一次分辨結果。
	if (payload.requiresConfirmation && !alreadyExists && !mustProveEmail) {
		// 只啟用「這次新建」的帳號。email 已存在時那是別人（或客人自己）先前用密碼註冊、
		// 還沒驗證的帳號，密碼不是我們設的——啟用它等於把帳號交給當初註冊的人。
		const activated = await activateNewAccount(email, password);
		if (!activated) {
			return { ok: false, error: "activation_failed" };
		}
	}

	// 3) 再登入一次
	const second = await authClient.signIn({ email, password }, { cache: "no-store" });
	if (second.data.tokenCreate.token && second.data.tokenCreate.errors.length === 0) {
		await recordLineBinding(provider, providerAccountId, email, second.data.tokenCreate.token);
		return { ok: true };
	}
	// 新帳號確實建好了、在等確認信（密碼對才會回 ACCOUNT_NOT_CONFIRMED）。若 email 是別人既有帳號，
	// 這裡會是密碼錯誤——Saleor 3.22.16 的 accountRegister 不回 UNIQUE，只能靠這次登入分辨。
	const secondErrors = second.data.tokenCreate.errors as { code?: string }[];
	if (mustProveEmail) {
		return {
			ok: false,
			error: secondErrors.some((e) => e.code === "ACCOUNT_NOT_CONFIRMED")
				? "confirm_email_pending"
				: "email_taken",
		};
	}

	// Method A(最安全):該 email 之前已用 email/密碼註冊過 → 不碰既有帳號密碼,
	// 回 email_taken 讓前端提示改用原本方式登入(不做靜默改密碼的自動綁定)。
	return { ok: false, error: alreadyExists ? "email_taken" : "signin_failed" };
}
