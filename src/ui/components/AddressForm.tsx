"use client";

import { useActionState } from "react";
import { type AccountFormState } from "@/app/[channel]/(main)/account/actions";
import { type AccountAddressFragment } from "@/gql/graphql";

type FormAction = (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;

const inputCls =
	"w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-neutral-800 focus:bg-white focus:outline-none";

export function AddressForm({
	action,
	address,
	submitLabel,
}: {
	action: FormAction;
	address?: AccountAddressFragment | null;
	submitLabel: string;
}) {
	const [state, formAction, pending] = useActionState<AccountFormState, FormData>(action, undefined);

	return (
		<form action={formAction} className="space-y-3">
			{address?.id ? <input type="hidden" name="id" defaultValue={address.id} /> : null}
			{state?.error ? (
				<p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{state.error}
				</p>
			) : null}
			{state?.ok ? (
				<p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">已儲存</p>
			) : null}

			<div className="grid grid-cols-2 gap-3">
				<input name="lastName" placeholder="姓" defaultValue={address?.lastName ?? ""} className={inputCls} />
				<input
					name="firstName"
					placeholder="名"
					defaultValue={address?.firstName ?? ""}
					className={inputCls}
				/>
			</div>
			<input name="phone" placeholder="手機號碼" defaultValue={address?.phone ?? ""} className={inputCls} />
			<div className="grid grid-cols-3 gap-3">
				<input
					name="postalCode"
					placeholder="郵遞區號"
					defaultValue={address?.postalCode ?? ""}
					className={inputCls}
				/>
				<input
					name="countryArea"
					placeholder="縣市"
					defaultValue={address?.countryArea ?? ""}
					className={inputCls}
				/>
				<input name="city" placeholder="鄉鎮市區" defaultValue={address?.city ?? ""} className={inputCls} />
			</div>
			<input
				name="streetAddress1"
				placeholder="地址(路 / 街 / 巷 / 號)"
				defaultValue={address?.streetAddress1 ?? ""}
				className={inputCls}
			/>
			<input
				name="streetAddress2"
				placeholder="樓層 / 門牌補充(選填)"
				defaultValue={address?.streetAddress2 ?? ""}
				className={inputCls}
			/>
			<input
				name="companyName"
				placeholder="公司 / 收件單位(選填)"
				defaultValue={address?.companyName ?? ""}
				className={inputCls}
			/>

			<button
				type="submit"
				disabled={pending}
				className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{pending ? "儲存中…" : submitLabel}
			</button>
		</form>
	);
}
