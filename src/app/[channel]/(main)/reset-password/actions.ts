"use server";

import { redirect } from "next/navigation";
import { getServerAuthClient } from "@/app/config";

export type ResetPasswordState = { error?: string } | undefined;

const SET_PASSWORD_MUTATION = /* GraphQL */ `
	mutation SetNewPassword($email: String!, $password: String!, $token: String!) {
		setPassword(email: $email, password: $password, token: $token) {
			errors {
				field
				message
				code
			}
		}
	}
`;

type SetPasswordResult = {
	data?: {
		setPassword?: {
			errors: { field: string | null; message: string | null; code: string }[];
		};
	};
	errors?: { message: string }[];
};

export async function resetPasswordAction(
	channel: string,
	_prevState: ResetPasswordState,
	formData: FormData,
): Promise<ResetPasswordState> {
	const email = formData.get("email")?.toString().trim();
	const token = formData.get("token")?.toString();
	const password = formData.get("password")?.toString() ?? "";
	const confirm = formData.get("confirm")?.toString() ?? "";

	if (!email || !token) {
		return { error: "重設連結無效,請重新申請一次。" };
	}
	if (password.length < 8) {
		return { error: "密碼至少需要 8 個字元。" };
	}
	if (password !== confirm) {
		return { error: "兩次輸入的密碼不一致。" };
	}

	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!apiUrl) {
		return { error: "系統設定有誤(缺少 Saleor API URL),請聯絡客服。" };
	}

	let result: SetPasswordResult;
	try {
		const res = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({
				query: SET_PASSWORD_MUTATION,
				variables: { email, password, token },
			}),
		});
		result = (await res.json()) as SetPasswordResult;
	} catch {
		return { error: "連線失敗,請稍後再試。" };
	}

	const payload = result.data?.setPassword;
	if (result.errors?.length || !payload) {
		return { error: "重設失敗,請稍後再試。" };
	}

	const first = payload.errors[0];
	if (first) {
		if (first.code === "INVALID" || first.code === "NOT_FOUND") {
			return { error: "重設連結已失效或已被使用,請重新申請一次。" };
		}
		if (first.code === "PASSWORD_TOO_SHORT" || first.code === "PASSWORD_TOO_COMMON") {
			return { error: "密碼太簡單或太短,請換一組更安全的密碼。" };
		}
		return { error: first.message ?? "重設失敗,請稍後再試。" };
	}

	// 重設成功:用新密碼自動登入(與註冊流程一致)
	const { data } = await (await getServerAuthClient()).signIn({ email, password }, { cache: "no-store" });

	if (data.tokenCreate.errors.length > 0) {
		// 密碼已改成功但自動登入失敗,導去登入頁手動登入
		redirect(`/${channel}/login`);
	}

	redirect(`/${channel}`);
}
