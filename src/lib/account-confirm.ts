import { STOREFRONT_URL } from "@/lib/env";

// Saleor 註冊確認信的連結：accountRegister 的 redirectUrl 後面會被 Saleor 接上 &email=&token=
// （prepare_url 保留既有 query），由 /api/auth/confirm-account 呼叫 confirmAccount。
// 確認後 Saleor 會把同 email 的訪客舊訂單歸到這個帳號（match_orders_with_new_user）。
export function confirmAccountUrl(channel: string): string {
	return `${STOREFRONT_URL}/api/auth/confirm-account?channel=${encodeURIComponent(channel)}`;
}

const CONFIRM_ACCOUNT = /* GraphQL */ `
	mutation ConfirmAccount($email: String!, $token: String!) {
		confirmAccount(email: $email, token: $token) {
			errors {
				code
			}
		}
	}
`;

type ConfirmAccountResult = {
	data?: { confirmAccount?: { errors: { code: string }[] } };
	errors?: { message: string }[];
};

/** confirmAccount 不需登入；token 不對或過期回 false。 */
export async function confirmSaleorAccount(email: string, token: string): Promise<boolean> {
	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!apiUrl || !email || !token) return false;
	try {
		const res = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({ query: CONFIRM_ACCOUNT, variables: { email, token } }),
		});
		const json = (await res.json()) as ConfirmAccountResult;
		const payload = json.data?.confirmAccount;
		return !json.errors?.length && !!payload && payload.errors.length === 0;
	} catch {
		return false;
	}
}
