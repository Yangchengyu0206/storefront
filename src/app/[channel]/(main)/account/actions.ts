"use server";

import { revalidatePath } from "next/cache";
import {
	AccountAddressCreateDocument,
	AccountAddressDeleteDocument,
	AccountAddressUpdateDocument,
	AccountSetDefaultAddressDocument,
	AccountUpdateDocument,
	AddressTypeEnum,
	CountryCode,
} from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";

export type AccountFormState = { error?: string; ok?: boolean } | undefined;

function readAddress(formData: FormData) {
	const s = (k: string) => {
		const v = formData.get(k)?.toString().trim();
		return v ? v : undefined;
	};
	return {
		firstName: s("firstName"),
		lastName: s("lastName"),
		companyName: s("companyName"),
		streetAddress1: s("streetAddress1"),
		streetAddress2: s("streetAddress2"),
		city: s("city"),
		countryArea: s("countryArea"),
		postalCode: s("postalCode"),
		phone: s("phone"),
		country: CountryCode.Tw,
	};
}

function firstErr(errors: ReadonlyArray<{ message?: string | null }> | undefined | null): string | undefined {
	return errors && errors.length ? errors[0]?.message ?? "操作失敗,請稍後再試。" : undefined;
}

export async function updateProfileAction(
	channel: string,
	_prev: AccountFormState,
	formData: FormData,
): Promise<AccountFormState> {
	const firstName = formData.get("firstName")?.toString().trim() ?? "";
	const lastName = formData.get("lastName")?.toString().trim() ?? "";
	try {
		const res = await executeGraphQL(AccountUpdateDocument, {
			variables: { input: { firstName, lastName } },
			cache: "no-cache",
		});
		const err = firstErr(res.accountUpdate?.errors);
		if (err) return { error: err };
	} catch {
		return { error: "更新失敗,請稍後再試。" };
	}
	revalidatePath(`/${channel}/account`);
	return { ok: true };
}

export async function createAddressAction(
	channel: string,
	_prev: AccountFormState,
	formData: FormData,
): Promise<AccountFormState> {
	try {
		const res = await executeGraphQL(AccountAddressCreateDocument, {
			variables: { input: readAddress(formData) },
			cache: "no-cache",
		});
		const err = firstErr(res.accountAddressCreate?.errors);
		if (err) return { error: err };
	} catch {
		return { error: "新增地址失敗,請確認欄位後再試。" };
	}
	revalidatePath(`/${channel}/account/addresses`);
	return { ok: true };
}

export async function updateAddressAction(
	channel: string,
	_prev: AccountFormState,
	formData: FormData,
): Promise<AccountFormState> {
	const id = formData.get("id")?.toString();
	if (!id) return { error: "缺少地址 ID" };
	try {
		const res = await executeGraphQL(AccountAddressUpdateDocument, {
			variables: { id, input: readAddress(formData) },
			cache: "no-cache",
		});
		const err = firstErr(res.accountAddressUpdate?.errors);
		if (err) return { error: err };
	} catch {
		return { error: "更新地址失敗,請確認欄位後再試。" };
	}
	revalidatePath(`/${channel}/account/addresses`);
	return { ok: true };
}

export async function deleteAddressAction(channel: string, formData: FormData): Promise<void> {
	const id = formData.get("id")?.toString();
	if (!id) return;
	await executeGraphQL(AccountAddressDeleteDocument, {
		variables: { id },
		cache: "no-cache",
	});
	revalidatePath(`/${channel}/account/addresses`);
}

export async function setDefaultAddressAction(channel: string, formData: FormData): Promise<void> {
	const id = formData.get("id")?.toString();
	const type = formData.get("type")?.toString();
	if (!id || (type !== "SHIPPING" && type !== "BILLING")) return;
	await executeGraphQL(AccountSetDefaultAddressDocument, {
		variables: {
			id,
			type: type === "SHIPPING" ? AddressTypeEnum.Shipping : AddressTypeEnum.Billing,
		},
		cache: "no-cache",
	});
	revalidatePath(`/${channel}/account/addresses`);
}
