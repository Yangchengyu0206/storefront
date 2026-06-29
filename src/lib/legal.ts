// 法律 / 法務頁面集中設定 —— 頁籤與公司資訊單一來源。
// Footer 與法務頁的側欄導覽都從這裡讀取，避免兩邊清單漂移。

export const LEGAL_LAST_UPDATED = "2026-06-15";

export type LegalPage = {
	slug: "privacy" | "terms" | "returns";
	title: string;
	description: string;
};

export const legalPages: readonly LegalPage[] = [
	{
		slug: "privacy",
		title: "隱私權政策",
		description: "說明本服務蒐集、處理及利用個人資料的目的、範圍與當事人權利。",
	},
	{
		slug: "terms",
		title: "服務條款",
		description: "使用本代購服務之契約條款，包含下單、付款、交付與責任歸屬。",
	},
	{
		slug: "returns",
		title: "退換貨與退款政策",
		description: "七日鑑賞期、退換貨流程、退款時程及合理例外情事。",
	},
] as const;

// 對外揭露用的營運者資訊 —— 上線前請填入正式內容（消保法、個資法均要求可供查詢）。
// 下列以 [請填寫] 標示之欄位為上線前必填占位字串，正式營運前務必替換。
export const companyInfo = {
	name: "[請填寫：公司／商號全名]",
	taxId: "[請填寫：統一編號]",
	address: "[請填寫：營業地址]",
	operator: "[請填寫：營運者／代表人姓名]",
	serviceEmail: "[請填寫：客服 Email]",
	servicePhone: "[請填寫：客服電話]",
	serviceHours: "週一至週五 10:00–18:00（國定假日除外）",
	// 退貨／契約解除權之管轄法院（消保法相關訴訟）
	jurisdictionCourt: "臺灣臺北地方法院",
};

export function legalHref(slug: LegalPage["slug"]): string {
	return `/legal/${slug}`;
}
