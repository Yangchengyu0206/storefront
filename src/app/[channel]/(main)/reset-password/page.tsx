import { Suspense } from "react";
import { Loader } from "@/ui/atoms/Loader";
import { ResetPasswordForm } from "@/ui/components/ResetPasswordForm";

export const metadata = {
	title: "重設密碼",
};

export default async function ResetPasswordPage({
	params,
	searchParams,
}: {
	params: Promise<{ channel: string }>;
	searchParams: Promise<{ email?: string; token?: string }>;
}) {
	const { channel } = await params;
	const { email, token } = await searchParams;
	return (
		<Suspense fallback={<Loader />}>
			<section className="mx-auto max-w-7xl p-8">
				<ResetPasswordForm channel={channel} email={email ?? ""} token={token ?? ""} />
			</section>
		</Suspense>
	);
}
