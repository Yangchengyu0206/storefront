"use server";

import { redirect } from "next/navigation";
import { getServerAuthClient } from "@/app/config";

export type RegisterState = { error?: string; needsConfirmation?: boolean } | undefined;

const ACCOUNT_REGISTER_MUTATION = /* GraphQL */ `
	mutation AccountRegister($input: AccountRegisterInput!) {
		accountRegister(input: $input) {
			requiresConfirmation
			errors {
				field
				message
				code
			}
		}
	}
`;

type AccountRegisterResult = {
	data?: {
		accountRegister?: {
			requiresConfirmation: boolean;
			errors: { field: string | null; message: string | null; code: string }[];
		};
	};
	errors?: { message: string }[];
};

export async function registerAction(
	channel: string,
	_prevState: RegisterState,
	formData: FormData,
): Promise<RegisterState> {
	const firstName = formData.get("firstName")?.toString().trim() ?? "";
	const email = formData.get("email")?.toString().trim();
	const password = formData.get("password")?.toString() ?? "";
	const confirm = formData.get("confirm")?.toString() ?? "";

	if (!email || !password) {
		return { error: "請填寫 Email 與密碼。" };
	}
	if (password.length < 8) {
		return { error: "密碼至少需要 8 個字元。" };
	}
	if (!(/[A-Za-z]/.test(password) && /\d/.test(password))) {
		return { error: "密碼須同時包含英文字母與數字。" };
	}
	if (password !== confirm) {
		return { error: "兩次輸入的密碼不一致。" };
	}

	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!apiUrl) {
		return { error: "系統設定有誤(缺少 Saleor API URL),請聯絡客服。" };
	}

	const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";
	const redirectUrl = `${storefrontUrl}/${channel}/login`;

	let result: AccountRegisterResult;
	try {
		const res = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({
				query: ACCOUNT_REGISTER_MUTATION,
				variables: { input: { email, password, firstName, channel, redirectUrl } },
			}),
		});
		result = (await res.json()) as AccountRegisterResult;
	} catch {
		return { error: "連線失敗,請稍後再試。" };
	}

	const payload = result.data?.accountRegister;
	if (result.errors?.length || !payload) {
		return { error: "註冊失敗,請稍後再試。" };
	}

	if (payload.errors.length > 0) {
		const first = payload.errors[0];
		if (first.code === "UNIQUE" || first.message?.toLowerCase().includes("already")) {
			return { error: "這個 Email 已經註冊過了,請直接登入。" };
		}
		if (first.code === "PASSWORD_TOO_SHORT" || first.code === "PASSWORD_TOO_COMMON") {
			return { error: "密碼太簡單或太短,請換一組更安全的密碼。" };
		}
		return { error: first.message ?? "註冊失敗,請稍後再試。" };
	}

	// 若 Saleor 設定為需要 email 驗證,帳號尚未啟用,提示去收信
	if (payload.requiresConfirmation) {
		return { needsConfirmation: true };
	}

	// 不需驗證:直接自動登入
	const { data } = await (await getServerAuthClient()).signIn({ email, password }, { cache: "no-store" });

	if (data.tokenCreate.errors.length > 0) {
		// 帳號已建立但自動登入失敗,導去登入頁讓使用者手動登入
		redirect(`/${channel}/login`);
	}

	redirect(`/${channel}`);
}
