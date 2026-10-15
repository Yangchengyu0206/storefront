import { redirect } from "next/navigation";
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
	const { social_error, notice, email, token } = await searchParams;
	// 舊版註冊確認信的連結直接指向登入頁（?email=&token=），轉給真正做確認的路由。
	if (typeof email === "string" && typeof token === "string" && email && token) {
		const q = new URLSearchParams({ channel, email, token });
		redirect(`/api/auth/confirm-account?${q.toString()}`);
	}
	return (
		<Suspense fallback={<Loader />}>
			<section className="mx-auto max-w-7xl p-8">
				<LoginForm
					channel={channel}
					socialError={typeof social_error === "string" ? social_error : undefined}
					notice={typeof notice === "string" ? notice : undefined}
				/>
			</section>
		</Suspense>
	);
}
