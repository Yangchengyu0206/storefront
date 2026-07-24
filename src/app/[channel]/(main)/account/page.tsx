import { updateProfileAction } from "./actions";
import { AccountMeDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import { AccountProfileForm } from "@/ui/components/AccountProfileForm";
import { LoginForm } from "@/ui/components/LoginForm";

export const metadata = {
	title: "我的帳戶",
};

export default async function AccountPage({ params }: { params: Promise<{ channel: string }> }) {
	const { channel } = await params;
	const { me } = await executeGraphQL(AccountMeDocument, { cache: "no-cache" });

	if (!me) {
		return <LoginForm channel={channel} />;
	}

	return (
		<div className="mx-auto max-w-3xl p-8">
			<h1 className="text-2xl font-bold tracking-tight text-neutral-900">我的帳戶</h1>

			<section className="mt-8 rounded-lg border bg-white p-6">
				<h2 className="text-lg font-semibold text-neutral-900">個人資料</h2>
				<p className="mt-1 text-sm text-neutral-500">帳號 Email(不可修改):{me.email}</p>
				<div className="mt-4">
					<AccountProfileForm
						action={updateProfileAction.bind(null, channel)}
						firstName={me.firstName ?? ""}
						lastName={me.lastName ?? ""}
					/>
				</div>
			</section>

			<nav className="mt-6 flex gap-6 text-sm">
				<LinkWithChannel href="/account/addresses" className="font-medium text-neutral-900 underline">
					地址簿
				</LinkWithChannel>
				<LinkWithChannel href="/orders" className="font-medium text-neutral-900 underline">
					歷史訂單
				</LinkWithChannel>
			</nav>
		</div>
	);
}
