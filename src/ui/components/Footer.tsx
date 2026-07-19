import { LinkWithChannel } from "../atoms/LinkWithChannel";
import { ChannelSelect } from "./ChannelSelect";
import { ChannelsListDocument, MenuGetBySlugDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { legalHref, legalPages } from "@/lib/legal";

export async function Footer({ channel }: { channel: string }) {
	const footerLinks = await executeGraphQL(MenuGetBySlugDocument, {
		variables: { slug: "footer", channel },
		revalidate: 60 * 60 * 24,
		withAuth: false, // 公開選單不帶 cookie 認證，讓 fetch 快取生效
	});
	const channels = process.env.SALEOR_APP_TOKEN
		? await executeGraphQL(ChannelsListDocument, {
				withAuth: false, // disable cookie-based auth for this call
				headers: {
					// and use app token instead
					Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}`,
				},
			})
		: null;
	const currentYear = new Date().getFullYear();
	// 網路銷售營業人新制:官網須揭露營業人名稱與統一編號(未設定 env 時不顯示)
	const sellerName = process.env.NEXT_PUBLIC_SELLER_NAME;
	const sellerTaxId = process.env.NEXT_PUBLIC_SELLER_TAX_ID;
	const sellerContact = process.env.NEXT_PUBLIC_SELLER_CONTACT;

	return (
		<footer className="border-neutral-300 bg-neutral-50">
			<div className="mx-auto max-w-7xl px-4 lg:px-8">
				<div className="grid grid-cols-3 gap-8 py-16">
					{footerLinks.menu?.items?.map((item) => {
						return (
							<div key={item.id}>
								<h3 className="text-sm font-semibold text-neutral-900">{item.name}</h3>
								<ul className="mt-4 space-y-4 [&>li]:text-neutral-500">
									{item.children?.map((child) => {
										if (child.category) {
											return (
												<li key={child.id} className="text-sm">
													<LinkWithChannel href={`/categories/${child.category.slug}`}>
														{child.category.name}
													</LinkWithChannel>
												</li>
											);
										}
										if (child.collection) {
											return (
												<li key={child.id} className="text-sm">
													<LinkWithChannel href={`/collections/${child.collection.slug}`}>
														{child.collection.name}
													</LinkWithChannel>
												</li>
											);
										}
										if (child.page) {
											return (
												<li key={child.id} className="text-sm">
													<LinkWithChannel href={`/pages/${child.page.slug}`}>
														{child.page.title}
													</LinkWithChannel>
												</li>
											);
										}
										if (child.url) {
											return (
												<li key={child.id} className="text-sm">
													<LinkWithChannel href={child.url}>{child.name}</LinkWithChannel>
												</li>
											);
										}
										return null;
									})}
								</ul>
							</div>
						);
					})}
				</div>

				{channels?.channels && (
					<div className="mb-4 text-neutral-500">
						<label>
							<span className="text-sm">切換幣別:</span> <ChannelSelect channels={channels.channels} />
						</label>
					</div>
				)}

				<nav
					aria-label="法律資訊"
					className="flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-200 py-6"
				>
					{legalPages.map((page) => (
						<LinkWithChannel
							key={page.slug}
							href={legalHref(page.slug)}
							className="text-sm text-neutral-500 hover:text-neutral-900"
						>
							{page.title}
						</LinkWithChannel>
					))}
				</nav>

				{(sellerName ?? sellerTaxId) && (
					<div className="border-t border-neutral-200 py-4 text-sm text-neutral-500">
						{sellerName && <span>營業人名稱:{sellerName}</span>}
						{sellerTaxId && <span className="ml-4">統一編號:{sellerTaxId}</span>}
						{sellerContact && <span className="ml-4">聯絡方式:{sellerContact}</span>}
					</div>
				)}

				<div className="flex flex-col justify-between border-t border-neutral-200 py-10 sm:flex-row">
					<p className="text-sm text-neutral-500">
						Copyright &copy; {currentYear} {sellerName || "商店"}
					</p>
				</div>
			</div>
		</footer>
	);
}
