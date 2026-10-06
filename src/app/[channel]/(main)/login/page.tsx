import { Suspense } from "react";
import { Loader } from "@/ui/atoms/Loader";
import { LoginForm } from "@/ui/components/LoginForm";

export default async function LoginPage({
	params,
	searchParams,
}: {
	params: Promise<{ channel: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { channel } = await params;
	const { social_error } = await searchParams;
	return (
		<Suspense fallback={<Loader />}>
			<section className="mx-auto max-w-7xl p-8">
				<LoginForm
					channel={channel}
					socialError={typeof social_error === "string" ? social_error : undefined}
				/>
			</section>
		</Suspense>
	);
}
