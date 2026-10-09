"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { XIcon } from "lucide-react";
import { submitWishAction, type WishState } from "./actions";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

const initialState: WishState = { error: null, done: false, reference: null };

const MAX_IMAGES = 3;
// 三張加起來要塞得進 Next.js server action 的 1MB 上限
const TARGET_BYTES = 300_000;

interface PickedImage {
	file: File;
	preview: string;
}

/**
 * 在瀏覽器端縮圖並轉成 JPEG：手機截圖動輒 3–5MB，直接上傳會超過 server action 上限；
 * 重新繪製也順便去掉照片的 EXIF（含拍攝地點）。
 */
async function compressImage(file: File, index: number): Promise<File> {
	const bitmap = await createImageBitmap(file);
	try {
		let maxDim = 1600;
		let quality = 0.82;
		for (let attempt = 0; attempt < 6; attempt++) {
			const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
			const width = Math.max(1, Math.round(bitmap.width * scale));
			const height = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) break;
			ctx.fillStyle = "#fff"; // 透明 PNG 轉 JPEG 時不要變黑底
			ctx.fillRect(0, 0, width, height);
			ctx.drawImage(bitmap, 0, 0, width, height);
			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
			if (blob && blob.size <= TARGET_BYTES) {
				return new File([blob], `wish-${index + 1}.jpg`, { type: "image/jpeg" });
			}
			maxDim = Math.round(maxDim * 0.8);
			quality = Math.max(0.6, quality - 0.08);
		}
	} finally {
		bitmap.close();
	}
	throw new Error("too-large");
}

function SubmitButton({ busy }: { busy: boolean }) {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending || busy}
			className="rounded-control bg-ink-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
		>
			{pending ? "送出中…" : "送出許願"}
		</button>
	);
}

const inputClass =
	"mt-1 block w-full rounded-control border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export function WishRequestForm({
	defaultEmail,
	defaultDescription,
}: {
	defaultEmail: string;
	defaultDescription: string;
}) {
	const [state, formAction] = useActionState(submitWishAction, initialState);
	const [images, setImages] = useState<PickedImage[]>([]);
	const [imageError, setImageError] = useState<string | null>(null);
	const [processing, setProcessing] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const imagesRef = useRef<PickedImage[]>([]);
	imagesRef.current = images;

	useEffect(() => {
		// 卸載時釋放預覽用的 object URL
		return () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
	}, []);

	async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
		const picked = Array.from(e.target.files ?? []);
		e.target.value = "";
		setImageError(null);
		const room = MAX_IMAGES - images.length;
		if (picked.length > room) setImageError(`最多 ${MAX_IMAGES} 張，多的已略過。`);
		setProcessing(true);
		const next: PickedImage[] = [];
		for (const [i, file] of picked.slice(0, Math.max(0, room)).entries()) {
			try {
				const compressed = await compressImage(file, images.length + i);
				next.push({ file: compressed, preview: URL.createObjectURL(compressed) });
			} catch {
				setImageError("有圖片無法讀取（例如 HEIC 格式），請改用 JPG／PNG 截圖。");
			}
		}
		setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
		setProcessing(false);
	}

	function removeImage(idx: number) {
		setImages((prev) => {
			const target = prev[idx];
			if (target) URL.revokeObjectURL(target.preview);
			return prev.filter((_, i) => i !== idx);
		});
	}

	function submit(formData: FormData) {
		// 原始檔案不送（input 沒有 name），只送瀏覽器縮過的版本
		formData.delete("images");
		images.forEach((img) => formData.append("images", img.file));
		formAction(formData);
	}

	if (state.done) {
		return (
			<div className="mt-8 rounded-card border border-ink-200 bg-white p-6">
				<h2 className="text-lg font-semibold text-ink-900">已收到您的許願</h2>
				{state.reference && (
					<p className="mt-2 text-sm text-ink-700">
						許願單號：<span className="tabular font-mono font-semibold">{state.reference}</span>
					</p>
				)}
				<p className="mt-3 text-sm text-ink-600">
					我們會確認貨源與價格，並用您留下的 Email 回覆報價。報價前不會向您收取任何費用。
				</p>
				<LinkWithChannel href="/" className="mt-6 inline-block text-sm text-accent underline">
					回到首頁
				</LinkWithChannel>
			</div>
		);
	}

	return (
		<form action={submit} className="mt-8 space-y-6" noValidate>
			{/* 蜜罐：真人看不到也不會填 */}
			<div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
				<label>
					網站
					<input type="text" name="website" tabIndex={-1} autoComplete="off" />
				</label>
			</div>

			<fieldset className="space-y-4">
				<legend className="text-base font-semibold text-ink-900">想要的商品</legend>
				<label className="block text-sm text-ink-700">
					商品連結（選填）
					<input
						type="url"
						name="productUrl"
						inputMode="url"
						maxLength={1000}
						placeholder="https://"
						className={inputClass}
					/>
				</label>
				<label className="block text-sm text-ink-700">
					商品說明 <span className="text-accent">*</span>
					<textarea
						name="description"
						required
						rows={4}
						maxLength={2000}
						defaultValue={defaultDescription}
						placeholder="品牌、品名、款式，或任何能幫我們找到它的描述"
						className={inputClass}
					/>
				</label>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<label className="block text-sm text-ink-700">
						顏色
						<input type="text" name="color" maxLength={100} className={inputClass} />
					</label>
					<label className="block text-sm text-ink-700">
						尺寸
						<input type="text" name="size" maxLength={100} className={inputClass} />
					</label>
					<label className="block text-sm text-ink-700">
						數量
						<input
							type="number"
							name="quantity"
							min={1}
							max={99}
							defaultValue={1}
							className={`${inputClass} tabular`}
						/>
					</label>
				</div>

				<div>
					<p className="text-sm text-ink-700">商品圖片（選填，最多 {MAX_IMAGES} 張）</p>
					<p className="mt-1 text-xs text-ink-500">
						IG／官網截圖都可以。圖片會先在您的裝置上縮小，並移除拍攝地點等資訊。
					</p>
					<div className="mt-3 flex flex-wrap gap-3">
						{images.map((img, idx) => (
							<div
								key={img.preview}
								className="relative h-24 w-24 overflow-hidden rounded-control border border-ink-200"
							>
								{/* eslint-disable-next-line @next/next/no-img-element -- 本機 blob 預覽，不走 next/image */}
								<img src={img.preview} alt={`第 ${idx + 1} 張圖片`} className="h-full w-full object-cover" />
								<button
									type="button"
									onClick={() => removeImage(idx)}
									aria-label={`移除第 ${idx + 1} 張圖片`}
									className="absolute right-1 top-1 rounded-full bg-ink-950/60 p-1 text-white hover:bg-ink-950/80"
								>
									<XIcon className="h-3 w-3" aria-hidden="true" />
								</button>
							</div>
						))}
						{images.length < MAX_IMAGES && (
							<button
								type="button"
								onClick={() => fileInput.current?.click()}
								disabled={processing}
								className="flex h-24 w-24 items-center justify-center rounded-control border border-dashed border-ink-300 text-xs text-ink-500 hover:border-ink-500 hover:text-ink-700 disabled:cursor-wait"
							>
								{processing ? "處理中…" : "＋ 加入圖片"}
							</button>
						)}
					</div>
					<input
						ref={fileInput}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						multiple
						className="hidden"
						onChange={onPick}
					/>
					{imageError && <p className="mt-2 text-xs text-red-700">{imageError}</p>}
				</div>
			</fieldset>

			<fieldset className="space-y-4">
				<legend className="text-base font-semibold text-ink-900">聯絡方式</legend>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<label className="block text-sm text-ink-700">
						稱呼 <span className="text-accent">*</span>
						<input
							type="text"
							name="contactName"
							required
							maxLength={100}
							autoComplete="name"
							className={inputClass}
						/>
					</label>
					<label className="block text-sm text-ink-700">
						Email <span className="text-accent">*</span>
						<input
							type="email"
							name="contactEmail"
							required
							maxLength={255}
							autoComplete="email"
							defaultValue={defaultEmail}
							className={inputClass}
						/>
					</label>
				</div>
				<label className="block text-sm text-ink-700 sm:w-1/2 sm:pr-2">
					LINE ID（選填）
					<input type="text" name="contactLineId" maxLength={100} className={inputClass} />
				</label>
				<p className="text-xs text-ink-500">報價會用 Email 回覆；留 LINE ID 方便您主動私訊我們時對照。</p>
			</fieldset>

			<label className="flex items-start gap-2 text-sm text-ink-700">
				<input type="checkbox" name="consent" required className="mt-1" />
				<span>
					我同意本店為回覆這筆許願／報價，蒐集並使用上述姓名、Email、LINE ID 與商品資料。詳見
					<LinkWithChannel href="/legal/privacy" className="mx-1 underline">
						隱私權政策
					</LinkWithChannel>
					。
				</span>
			</label>

			{state.error && (
				<p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">
					{state.error}
				</p>
			)}

			<SubmitButton busy={processing} />
		</form>
	);
}
