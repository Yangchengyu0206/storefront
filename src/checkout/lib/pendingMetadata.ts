/**
 * 結帳頁「還沒寫進 checkout metadata 的東西」的統一 flush 點。
 *
 * 起因（2026-08-16 稽核 MON-004 追查）：結帳頁有三個區塊把客人的選擇寫進
 * checkout metadata，訂單成立時由 Saleor 複製到 order metadata
 * （`complete_checkout.py:860-864`，3.22.16 已核對），api-core 開發票時再從
 * `raw_data.metadata` 讀回來。問題出在「寫進去」這一步是非同步而且沒有人等它：
 *
 *   - InvoiceSection 是 **600ms debounce + `void mutate`**。客人打完統編就按付款，
 *     那 600ms 還沒到，交易已經送出去了 → 發票開成綠界載具。對開公司帳的客人來說
 *     這張發票不能報帳，而事後要改只能作廢重開。
 *   - PreorderExclusionConsent 是勾選當下 `void mutate`，窗口較短但一樣沒人等。
 *     這個更麻煩：它是七日鑑賞期除外的**同意存證**，掉了就等於沒有存證。
 *
 * 兩邊都不會報錯，畫面也一切正常——只有幾週後對發票或處理退貨爭議時才會發現。
 *
 * 這裡的作法是讓這類元件註冊一個 flush，付款按鈕在送出交易前先 `await` 全部跑完。
 * flush 是冪等的（就是把當下狀態再寫一次），所以「沒有待寫入」時多送一次也無所謂，
 * 換來的是「送出交易時 metadata 一定是最新的」這個確定性。
 */

type FlushFn = () => Promise<unknown>;

const pending = new Set<FlushFn>();

/** 註冊一個 flush；回傳解除註冊的函式（給 useEffect 當 cleanup）。 */
export function registerPendingMetadataFlush(fn: FlushFn): () => void {
	pending.add(fn);
	return () => {
		pending.delete(fn);
	};
}

/**
 * 送出交易前呼叫。用 allSettled：某一個 metadata 寫入失敗不應該擋住付款
 * （擋住付款的傷害比 metadata 少一筆更大），但也不會靜默——失敗會留在 console。
 */
export async function flushPendingMetadata(): Promise<void> {
	if (pending.size === 0) return;
	const results = await Promise.allSettled([...pending].map((fn) => fn()));
	for (const r of results) {
		if (r.status === "rejected") {
			console.error("[checkout] 結帳選項寫回 metadata 失敗，付款仍會繼續：", r.reason);
		}
	}
}
