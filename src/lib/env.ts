/**
 * 對外網址的單一出處（SF-19 / C-26）。
 *
 * 在這之前，三個地方各自寫 `process.env.X || "http://localhost:PORT"`，另外兩個地方
 * 寫 `?? ""`。這兩種寫法在正式環境是最糟的失敗形式——不會報錯，只會讓客人的瀏覽器
 * 去連「客人自己電腦」的 8002 埠，或讓 Saleor 寄出一封連結是 `/default-channel/login`
 * 的驗證信。畫面上是「超商選店打不開」「按了付款沒反應」「收到信點了沒用」，
 * 而伺服器日誌一片乾淨，沒有人會知道。
 *
 * 這裡改成缺值或指向本機就直接 throw。Next.js 在 `next build` 的靜態產生階段就會
 * 執行到，部署當下就失敗——這正是我們要的：失敗要發生在部署的人面前，不是在客人面前。
 *
 * 兩個實作上的限制，改這個檔案時要記得：
 *
 * 1. `NEXT_PUBLIC_*` 是 Next.js 在 build 時做**字面替換**，所以每個變數都必須寫成完整的
 *    `process.env.NEXT_PUBLIC_XXX`。用 `process.env[name]` 動態取值不會被替換，會拿到
 *    undefined。底下把變數名重複寫兩次（一次當字面、一次當訊息用的名字）就是為了這個。
 *
 * 2. **瀏覽器端不 throw**。這個模組會被 client component 匯入（CvsStoreSelector），
 *    在瀏覽器 throw 等於整頁白畫面，對客人來說比連錯網址更糟。伺服器端（含 build）
 *    已經會擋下來，那才是該失敗的地方。
 */

const isProduction = process.env.NODE_ENV === "production";
const isServer = typeof window === "undefined";

/**
 * 本機建 production bundle 做煙霧測試時的逃生口。
 * 正式部署不要設；設了等於把這整個防呆關掉。
 */
const allowLocalUrls = process.env.NEXT_PUBLIC_ALLOW_LOCAL_URLS === "true";

const shouldEnforce = isProduction && isServer && !allowLocalUrls;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

function isLocalUrl(value: string): boolean {
	try {
		return LOCAL_HOSTNAMES.has(new URL(value).hostname);
	} catch {
		// 連 URL 都 parse 不出來的值，交給下面的 required 檢查去報
		return false;
	}
}

/**
 * 會被送到客人瀏覽器的網址。
 * 正式環境不得缺、不得指向本機——客人連不到你的 localhost。
 */
function publicUrl(name: string, value: string | undefined, devFallback: string): string {
	if (!value) {
		if (shouldEnforce) {
			throw new Error(
				`[env] ${name} 未設定。這個值會送到客人的瀏覽器，缺少時付款轉跳、超商選店、` +
					`驗證信連結都會失敗，而且不會有錯誤訊息。請在部署環境設定後重新 build。`,
			);
		}
		return devFallback;
	}

	if (shouldEnforce && isLocalUrl(value)) {
		throw new Error(
			`[env] ${name}=${value} 指向本機位址。這個值會送到客人的瀏覽器，` +
				`客人的 localhost 不是你的機器。請改成對外可連的網址後重新 build。`,
		);
	}

	// 統一去掉結尾斜線，呼叫端一律用 `${BASE}/path` 串接
	return value.replace(/\/+$/, "");
}

/**
 * 自家 FastAPI（api-core）的對外位址。
 * 綠界超商選店（CvsStoreSelector）與付款轉跳（ecpayComponent）都打這裡。
 */
export const API_BASE_URL = publicUrl(
	"NEXT_PUBLIC_API_URL",
	process.env.NEXT_PUBLIC_API_URL,
	"http://localhost:8002",
);

/**
 * storefront 自己的對外網址。
 * 用於 canonical / OG（metadataBase），以及**寄給客人的信裡的連結**
 * （註冊驗證、重設密碼）——後者缺了會寄出點不開的信。
 */
export const STOREFRONT_URL = publicUrl(
	"NEXT_PUBLIC_STOREFRONT_URL",
	process.env.NEXT_PUBLIC_STOREFRONT_URL,
	"http://localhost:3000",
);

/** 結帳 cookie 是否該加 Secure 旗標——由對外網址是不是 https 決定。 */
export const STOREFRONT_IS_HTTPS = STOREFRONT_URL.startsWith("https") || !!process.env.NEXT_PUBLIC_VERCEL_URL;
