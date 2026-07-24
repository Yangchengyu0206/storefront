import {
	createAddressAction,
	deleteAddressAction,
	setDefaultAddressAction,
	updateAddressAction,
} from "../actions";
import { AccountMeDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { AddressForm } from "@/ui/components/AddressForm";
import { LoginForm } from "@/ui/components/LoginForm";

export const metadata = {
	title: "地址簿",
};

export default async function AddressBookPage({ params }: { params: Promise<{ channel: string }> }) {
	const { channel } = await params;
	const { me } = await executeGraphQL(AccountMeDocument, { cache: "no-cache" });

	if (!me) {
		return <LoginForm channel={channel} />;
	}

	const addresses = me.addresses ?? [];
	const del = deleteAddressAction.bind(null, channel);
	const setDefault = setDefaultAddressAction.bind(null, channel);

	return (
		<div className="mx-auto max-w-3xl p-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight text-neutral-900">地址簿</h1>
				<LinkWithChannel href="/account" className="text-sm font-medium text-neutral-900 underline">
					← 回帳戶
				</LinkWithChannel>
			</div>

			{addresses.length === 0 ? (
				<p className="mt-8 rounded border bg-white p-4 text-sm text-neutral-500">尚未新增任何地址。</p>
			) : (
				<ul className="mt-8 space-y-4">
					{addresses.map((a) => (
						<li key={a.id} className="rounded-lg border bg-white p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="text-sm text-neutral-700">
									<p className="font-semibold text-neutral-900">
										{a.lastName}
										{a.firstName}
										{a.phone ? ` · ${a.phone}` : ""}
									</p>
									<p className="mt-1">
										{a.postalCode} {a.countryArea}
										{a.city}
										{a.streetAddress1}
										{a.streetAddress2}
									</p>
									<div className="mt-2 flex gap-2">
										{a.isDefaultShippingAddress ? (
											<span className="rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">預設寄送</span>
										) : null}
										{a.isDefaultBillingAddress ? (
											<span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
												預設帳單
											</span>
										) : null}
									</div>
								</div>
								<div className="flex flex-col items-end gap-2">
									{!a.isDefaultShippingAddress ? (
										<form action={setDefault}>
											<input type="hidden" name="id" defaultValue={a.id} />
											<input type="hidden" name="type" defaultValue="SHIPPING" />
											<button
												type="submit"
												className="text-xs text-neutral-600 underline hover:text-neutral-900"
											>
												設為預設寄送
											</button>
										</form>
									) : null}
									{!a.isDefaultBillingAddress ? (
										<form action={setDefault}>
											<input type="hidden" name="id" defaultValue={a.id} />
											<input type="hidden" name="type" defaultValue="BILLING" />
											<button
												type="submit"
												className="text-xs text-neutral-600 underline hover:text-neutral-900"
											>
												設為預設帳單
											</button>
										</form>
									) : null}
									<form action={del}>
										<input type="hidden" name="id" defaultValue={a.id} />
										<button type="submit" className="text-xs text-red-600 underline hover:text-red-800">
											刪除
										</button>
									</form>
								</div>
							</div>

							<details className="mt-4">
								<summary className="cursor-pointer text-sm font-medium text-neutral-700">編輯此地址</summary>
								<div className="mt-3">
									<AddressForm
										action={updateAddressAction.bind(null, channel)}
										address={a}
										submitLabel="更新地址"
									/>
								</div>
							</details>
						</li>
					))}
				</ul>
			)}

			<section className="mt-10 rounded-lg border bg-white p-6">
				<h2 className="text-lg font-semibold text-neutral-900">新增地址</h2>
				<div className="mt-4">
					<AddressForm action={createAddressAction.bind(null, channel)} submitLabel="新增地址" />
				</div>
			</section>
		</div>
	);
}
