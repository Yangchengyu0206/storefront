// 七日鑑賞期「除外」判定 —— 單一事實來源（商品頁、結帳頁共用）。
//
// 觸發訊號：商品 public metadata 旗標 `cooling_off_excluded` === "true"。
// 法律基礎：消保法第 19 條之通訊交易解除權，及「通訊交易解除權合理例外情事
//   適用準則」第 2 款「依消費者要求所為之客製化給付」。
//
// ⚠️ 重要（法遵）：**預設不主張除外**。未標記的商品一律仍適用七日鑑賞期。
//   「依指定向海外採購」不當然等於「客製化給付」——店家必須逐品項確認確屬
//   合理例外，才在 Saleor 該商品的 metadata 加上此旗標。過度主張除外＝違反
//   消保法，消費爭議會輸。詳見退換貨頁 /legal/returns#exceptions。
//
// 標記方式（G1 商品編輯 UI 完成前）：Saleor Dashboard → 商品 → Metadata →
//   新增 public key `cooling_off_excluded`，value `true`。

export const COOLING_OFF_EXCLUDED_KEY = "cooling_off_excluded";

type MetadataItem = { key: string; value: string };

/** 商品是否經店家「事先載明」為七日鑑賞期之合理例外（客製化給付）。 */
export function isCoolingOffExcluded(
	metadata: ReadonlyArray<MetadataItem | null | undefined> | null | undefined,
): boolean {
	return metadata?.some((m) => m?.key === COOLING_OFF_EXCLUDED_KEY && m?.value === "true") ?? false;
}
