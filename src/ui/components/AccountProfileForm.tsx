"use client";

import { useActionState } from "react";
import { type AccountFormState } from "@/app/[channel]/(main)/account/actions";

type FormAction = (prev: AccountFormState, formData: FormData) => Promise<AccountFormState>;

const inputCls =
	"w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-neutral-800 focus:bg-white focus:outline-none";

export function AccountProfileForm({
	action,
	firstName,
	lastName,
}: {
	action: FormAction;
	firstName: string;
	lastName: string;
}) {
	const [state, formAction, pending] = useActionState<AccountFormState, FormData>(action, undefined);

	return (
		<form action={formAction} className="space-y-3">
			{state?.error ? (
				<p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{state.error}
				</p>
			) : null}
			{state?.ok ? (
				<p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">已更新</p>
			) : null}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label htmlFor="acc-lastName" className="mb-1 block text-sm text-neutral-600">
						姓
					</label>
					<input id="acc-lastName" name="lastName" defaultValue={lastName} className={inputCls} />
				</div>
				<div>
					<label htmlFor="acc-firstName" className="mb-1 block text-sm text-neutral-600">
						名
					</label>
					<input id="acc-firstName" name="firstName" defaultValue={firstName} className={inputCls} />
				</div>
			</div>
			<button
				type="submit"
				disabled={pending}
				className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{pending ? "儲存中…" : "儲存"}
			</button>
		</form>
	);
}
