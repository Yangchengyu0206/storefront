import { AnnouncementBarClient } from "./AnnouncementBarClient";
import { getStorefrontContent } from "@/lib/storefront-content";

/** 頁首上方的商店公告（後台「商店設定 → 前台公告與版位」）。沒設定或已過期時什麼都不畫。 */
export async function AnnouncementBar() {
	const { announcement } = await getStorefrontContent();
	if (!announcement) return null;
	return (
		<AnnouncementBarClient text={announcement.text} link={announcement.link} version={announcement.version} />
	);
}
