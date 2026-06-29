"use server";

import { redirect } from "next/navigation";
import { getServerAuthClient } from "@/app/config";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
	channel: string,
	_prevState: LoginState,
	formData: FormData,
): Promise<LoginState> {
	const email = formData.get("email")?.toString().trim();
	const password = formData.get("password")?.toString();

	if (!email || !password) {
		return { error: "請輸入 Email 與密碼。" };
	}

	const { data } = await (await getServerAuthClient()).signIn({ email, password }, { cache: "no-store" });

	if (data.tokenCreate.errors.length > 0) {
		return { error: "Email 或密碼錯誤,請再試一次。" };
	}

	// 登入成功:Saleor token 已寫入 cookie,導回首頁
	redirect(`/${channel}`);
}
