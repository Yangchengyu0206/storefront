import { Suspense } from "react";
import { Loader } from "@/ui/atoms/Loader";
import { ForgotPasswordForm } from "@/ui/components/ForgotPasswordForm";

export const metadata = {
	title: "忘記密碼",
};

export default async function ForgotPasswordPage({ params }: { params: Promise<{ channel: string }> }) {
	const { channel } = await params;
	return (
		<Suspense fallback={<Loader />}>
			<section className="mx-auto max-w-7xl p-8">
				<ForgotPasswordForm channel={channel} />
			</section>
		</Suspense>
	);
}
