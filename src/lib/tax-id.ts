/**
 * 統一編號檢查碼（財政部 2023 年起：加權和可被 5 整除；第 7 碼為 7 時另一種算法也算）。
 * 與 full-stack api-core einvoice_service.valid_tax_id 同一套規則——
 * 結帳當下就擋掉打錯的統編，不然發票會被降級成綠界載具，事後只能作廢重開。
 */
const WEIGHTS = [1, 2, 1, 2, 1, 2, 4, 1];

export function isValidTaxId(taxId: string): boolean {
	if (!/^\d{8}$/.test(taxId)) return false;
	let total = 0;
	for (let i = 0; i < 8; i++) {
		const product = Number(taxId[i]) * WEIGHTS[i];
		total += Math.floor(product / 10) + (product % 10);
	}
	if (total % 5 === 0) return true;
	return taxId[6] === "7" && (total + 1) % 5 === 0;
}
