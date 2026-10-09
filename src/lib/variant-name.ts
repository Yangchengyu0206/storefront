// Saleor 預設變體（單一規格商品）的 name 被後台拿來存變體的 global ID
// （例如 "UHJvZHVjdFZhcmlhbnQ6MTIz"），product_key 同步靠它反解，資料層不能清。
// 顯示給客人或送進追蹤事件之前一律用這裡收斂成「沒有規格名」。

const GLOBAL_ID_PREFIX = "UHJvZHVjdFZhcmlhbnQ6"; // base64("ProductVariant:")

export function isGlobalIdLike(name: string | null | undefined): boolean {
	if (!name) return false;
	const trimmed = name.trim();
	if (trimmed.startsWith(GLOBAL_ID_PREFIX)) return true;
	// 其他型別的 global ID：純 base64 字元、夠長、解出來是 "Type:id"。
	if (!/^[A-Za-z0-9+/]{12,}={0,2}$/.test(trimmed)) return false;
	try {
		const decoded = typeof atob === "function" ? atob(trimmed) : Buffer.from(trimmed, "base64").toString();
		return /^[A-Za-z]+:[\w-]+$/.test(decoded);
	} catch {
		return false;
	}
}

/** 回傳可顯示的變體名稱；global ID 或空字串回 null。 */
export function displayVariantName(name: string | null | undefined): string | null {
	if (!name || !name.trim() || isGlobalIdLike(name)) return null;
	return name.trim();
}
