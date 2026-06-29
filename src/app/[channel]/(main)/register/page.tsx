import { Suspense } from "react";
import { Loader } from "@/ui/atoms/Loader";
import { RegisterForm } from "@/ui/components/RegisterForm";

export default async function RegisterPage({ params }: { params: Promise<{ channel: string }> }) {
	const { channel } = await params;
	return (
		<Suspense fallback={<Loader />}>
			<section className="mx-auto max-w-7xl p-8">
				<RegisterForm channel={channel} />
			</section>
		</Suspense>
	);
}
