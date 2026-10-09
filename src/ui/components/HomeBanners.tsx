import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { type HomeBanner } from "@/lib/storefront-content";

function BannerFrame({ banner, children }: { banner: HomeBanner; children: ReactNode }) {
	const className =
		"group relative block overflow-hidden rounded-card bg-ink-100 shadow-card focus-visible:ring-2 focus-visible:ring-accent";
	if (!banner.link) return <div className={className}>{children}</div>;
	if (/^https?:\/\//i.test(banner.link)) {
		return (
			<a href={banner.link} target="_blank" rel="noopener noreferrer" className={className}>
				{children}
			</a>
		);
	}
	return (
		<Link href={banner.link} className={className}>
			{children}
		</Link>
	);
}

/**
 * 首頁 Banner（最多 3 格，後台「商店設定 → 前台公告與版位」）。沒有任何一格有圖時不畫。
 * 一格＝滿版 3:1；兩三格＝手機直排、桌機並排 3:2。
 */
export function HomeBanners({ banners }: { banners: HomeBanner[] }) {
	if (banners.length === 0) return null;
	const single = banners.length === 1;
	const cols = single ? "" : banners.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
	return (
		<section aria-label="精選活動" className={`mb-10 grid grid-cols-1 gap-4 ${cols}`}>
			{banners.map((banner, idx) => (
				<BannerFrame key={`${banner.imageUrl}-${idx}`} banner={banner}>
					<div className={single ? "relative aspect-[3/1]" : "relative aspect-[3/2]"}>
						<Image
							src={banner.imageUrl}
							alt={banner.title || "活動橫幅"}
							fill
							priority={idx === 0}
							sizes={single ? "(max-width: 1280px) 100vw, 1280px" : "(max-width: 768px) 100vw, 33vw"}
							className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
						/>
					</div>
					{banner.title && (
						<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent px-4 pb-3 pt-10">
							<p className="text-base font-semibold text-white">{banner.title}</p>
						</div>
					)}
				</BannerFrame>
			))}
		</section>
	);
}
