"use server";

import { headers } from "next/headers";
import { clientKeyFromHeaders } from "@/lib/client-ip";
import { CurrentUserDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import {
	WISH_MAX_IMAGE_BYTES,
	WISH_MAX_IMAGES,
	checkWishRateLimit,
	submitWishRequest,
} from "@/lib/wish-request";

export interface WishState {
	error: string | null;
	/** 送出成功＝true；reference 可能為 null（蜜罐命中時不給單號）。 */
	done: boolean;
	reference: string | null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function text(formData: FormData, key: string, max: number): string {
	return String(formData.get(key) ?? "")
		.trim()
		.slice(0, max);
}

function fail(error: string): WishState {
	return { error, done: false, reference: null };
}

async function signedInEmail(): Promise<string | null> {
	// 只信伺服器端的 Saleor session；查不到（沒登入、Saleor 掛了）就當訪客
	try {
		const { me } = await executeGraphQL(CurrentUserDocument, { cache: "no-cache" });
		return me?.email ?? null;
	} catch {
		return null;
	}
}

export async function submitWishAction(_prev: WishState, formData: FormData): Promise<WishState> {
	// 蜜罐：真人看不到這個欄位，有值的幾乎一定是機器人。假裝成功、什麼都不送，
	// 不要給它「被擋了」的訊號。
	if (text(formData, "website", 200)) {
		return { error: null, done: true, reference: null };
	}

	// 與訪客查單同一個判斷順序：CF-Connecting-IP 優先，否則取 XFF 最右跳（最左可偽造）
	const hdrs = await headers();
	const clientKey = clientKeyFromHeaders(hdrs);
	if (!checkWishRateLimit(clientKey)) {
		return fail("送出次數過多，請稍後再試，或直接用 Email／LINE 聯絡我們。");
	}

	const description = text(formData, "description", 2000);
	const contactName = text(formData, "contactName", 100);
	const contactEmail = text(formData, "contactEmail", 255);
	const productUrl = text(formData, "productUrl", 1000);
	const quantityRaw = Number.parseInt(text(formData, "quantity", 3) || "1", 10);

	if (!description) return fail("請描述想要的商品（品牌、品名、款式）。");
	if (!contactName) return fail("請填寫稱呼。");
	if (!EMAIL_RE.test(contactEmail)) return fail("請填寫正確的 Email，我們會用它回覆報價。");
	if (productUrl && !/^https?:\/\//i.test(productUrl)) {
		return fail("商品連結要是 http:// 或 https:// 開頭的網址。");
	}
	if (formData.get("consent") !== "on") return fail("請勾選同意個人資料蒐集告知。");

	const files = formData
		.getAll("images")
		.filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && f.size > 0);
	if (files.length > WISH_MAX_IMAGES) return fail(`最多上傳 ${WISH_MAX_IMAGES} 張圖片。`);
	const imagesBase64: string[] = [];
	for (const f of files) {
		if (!ALLOWED_TYPES.has(f.type)) return fail("圖片只接受 JPG／PNG／WebP。");
		if (f.size > WISH_MAX_IMAGE_BYTES) return fail("圖片太大，請換一張或截小一點。");
		imagesBase64.push(Buffer.from(await f.arrayBuffer()).toString("base64"));
	}

	const result = await submitWishRequest({
		productUrl: productUrl || null,
		description,
		color: text(formData, "color", 100) || null,
		size: text(formData, "size", 100) || null,
		quantity: Number.isFinite(quantityRaw) ? Math.min(99, Math.max(1, quantityRaw)) : 1,
		contactName,
		contactEmail,
		contactLineId: text(formData, "contactLineId", 100) || null,
		accountEmail: await signedInEmail(),
		imagesBase64,
	});
	return result.ok ? { error: null, done: true, reference: result.reference } : fail(result.error);
}
