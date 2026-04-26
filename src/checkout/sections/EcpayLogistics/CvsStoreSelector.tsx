"use client";

import { useState, useEffect } from "react";
import { useCheckout } from "@/checkout/hooks/useCheckout";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

const CVS_OPTIONS = [
	{ label: "7-ELEVEN", value: "UNIMART" },
	{ label: "全家", value: "FAMI" },
	{ label: "萊爾富", value: "HILIFE" },
];

interface CvsStore {
	storeId: string;
	storeName: string;
	subType: string;
}

export function CvsStoreSelector() {
	const { checkout } = useCheckout();
	const [subType, setSubType] = useState("FAMI");
	const [selectedStore, setSelectedStore] = useState<CvsStore | null>(null);

	useEffect(() => {
		if (!checkout?.id) return;
		try {
			const saved = sessionStorage.getItem(`ecpay_cvs_store_${checkout.id}`);
			if (saved) {
				const data = JSON.parse(saved) as CvsStore;
				setSelectedStore(data);
				setSubType(data.subType || "FAMI");
			}
		} catch {
			/* ignore */
		}
	}, [checkout?.id]);

	const handleSelect = () => {
		if (!checkout?.id) return;
		const url = `${API_URL}/api/v1/logistics/cvs-map?logistics_sub_type=${subType}&checkout_id=${encodeURIComponent(
			checkout.id,
		)}`;
		window.location.href = url;
	};

	return (
		<div className="mt-2 flex flex-col gap-2">
			<p className="text-sm font-medium">選擇超商品牌</p>
			<div className="flex gap-2">
				{CVS_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						type="button"
						onClick={() => setSubType(opt.value)}
						className={`rounded border px-3 py-1 text-sm ${
							subType === opt.value
								? "border-blue-500 bg-blue-50 font-medium text-blue-700"
								: "border-gray-300 text-gray-700"
						}`}
					>
						{opt.label}
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={handleSelect}
				className="self-start rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
			>
				選擇門市
			</button>
			{selectedStore && (
				<p className="text-sm text-green-700">
					✓ 已選取門市：{selectedStore.storeName}（{selectedStore.storeId}）
				</p>
			)}
		</div>
	);
}
