"use server";

export type ForgotPasswordState = { error?: string; sent?: boolean } | undefined;

const REQUEST_PASSWORD_RESET_MUTATION = /* GraphQL */ `
	mutation RequestPasswordReset($email: String!, $redirectUrl: String!, $channel: String!) {
		requestPasswordReset(email: $email, redirectUrl: $redirectUrl, channel: $channel) {
			errors {
				field
				message
				code
			}
		}
	}
`;

type RequestPasswordResetResult = {
	data?: {
		requestPasswordReset?: {
			errors: { field: string | null; message: string | null; code: string }[];
		};
	};
	errors?: { message: string }[];
};

export async function forgotPasswordAction(
	channel: string,
	_prevState: ForgotPasswordState,
	formData: FormData,
): Promise<ForgotPasswordState> {
	const email = formData.get("email")?.toString().trim();

	if (!email) {
		return { error: "請輸入 Email。" };
	}

	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!apiUrl) {
		return { error: "系統設定有誤(缺少 Saleor API URL),請聯絡客服。" };
	}

	const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "";
	// Saleor 會在此 URL 後面帶上 ?email=...&token=...
	const redirectUrl = `${storefrontUrl}/${channel}/reset-password`;

	let result: RequestPasswordResetResult;
	try {
		const res = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({
				query: REQUEST_PASSWORD_RESET_MUTATION,
				variables: { email, redirectUrl, channel },
			}),
		});
		result = (await res.json()) as RequestPasswordResetResult;
	} catch {
		return { error: "連線失敗,請稍後再試。" };
	}

	const payload = result.data?.requestPasswordReset;
	if (result.errors?.length || !payload) {
		return { error: "寄送失敗,請稍後再試。" };
	}

	const first = payload.errors[0];
	if (first) {
		// Email 不存在(NOT_FOUND)也回成功訊息,避免被用來探測帳號是否存在
		if (first.code === "NOT_FOUND") {
			return { sent: true };
		}
		// redirectUrl 未列入 Saleor 白名單等設定問題
		return { error: first.message ?? "寄送失敗,請稍後再試。" };
	}

	return { sent: true };
}
