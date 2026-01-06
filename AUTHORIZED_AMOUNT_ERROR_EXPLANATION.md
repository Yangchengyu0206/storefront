# "The authorized amount doesn't cover the checkout's total amount." 錯誤說明

## 📍 錯誤顯示位置

這個錯誤訊息在以下位置顯示：

**文件：** `src/checkout/sections/PaymentSection/DummyDropIn/dummyComponent.tsx`

**代碼位置：** 第 283-340 行

## 🔍 觸發條件

### 1. 主要觸發點：`checkoutComplete` mutation 失敗

當調用 `checkoutComplete` mutation 時，Saleor 後端會進行以下驗證：

```typescript
// Saleor 後端驗證邏輯（偽代碼）
if (transaction.authorizedAmount == null) {
	return error("Transaction authorized amount is not set");
}

if (transaction.authorizedAmount < checkout.totalPrice.gross.amount) {
	return error("The authorized amount doesn't cover the checkout's total amount.");
}
```

### 2. 前端錯誤處理邏輯

```typescript
// 位置：src/checkout/sections/PaymentSection/DummyDropIn/dummyComponent.tsx:283-340

const completeResult = await onCheckoutComplete();

if (completeResult?.hasErrors) {
	const errors = completeResult.apiErrors || [];
	const graphqlErrors = completeResult.graphqlErrors || [];
	const customErrors = completeResult.customErrors || [];

	// 情況 1: 有 API 錯誤（來自 Saleor 後端）
	if (errors.length > 0) {
		errors.forEach((error: any) => {
			const errorMessage =
				error?.message || error?.code || "The authorized amount doesn't cover the checkout's total amount."; // 預設訊息
			showCustomErrors([{ message: errorMessage }]);
		});
	}
	// 情況 2: 有 GraphQL 錯誤
	else if (graphqlErrors.length > 0) {
		// 顯示 GraphQL 錯誤
	}
	// 情況 3: 有自定義錯誤
	else if (customErrors.length > 0) {
		// 顯示自定義錯誤
	}
	// 情況 4: 沒有具體錯誤信息，顯示通用錯誤
	else {
		showCustomErrors([
			{
				message:
					"The authorized amount doesn't cover the checkout's total amount. Please check the backend webhook handler.",
			},
		]);
	}
}
```

## 🎯 具體觸發情況

### 情況 1: `transaction.authorizedAmount` 為 `null`

**原因：**

- 後端沒有正確處理 `TRANSACTION_INITIALIZE_SESSION` webhook
- 後端返回的響應中沒有設置 `authorizedAmount`
- 後端返回的事件類型不是 `AUTHORIZATION_SUCCESS`

**Saleor 驗證：**

```python
# Saleor 後端驗證（Python 偽代碼）
if transaction.authorized_amount is None:
    raise ValidationError("Transaction authorized amount is not set")
```

### 情況 2: `transaction.authorizedAmount < checkout.total`

**原因：**

- 後端返回的 `amount` 小於 `checkout.totalPrice.gross.amount`
- 金額計算錯誤（例如：沒有包含稅費、運費等）
- 前端發送的金額與後端處理的金額不一致

**Saleor 驗證：**

```python
# Saleor 後端驗證（Python 偽代碼）
if transaction.authorized_amount < checkout.total.gross.amount:
    raise ValidationError(
        "The authorized amount doesn't cover the checkout's total amount."
    )
```

### 情況 3: 後端返回的錯誤訊息

如果 Saleor 後端返回的錯誤訊息包含 "authorized amount" 相關內容，前端會直接顯示該訊息。

### 情況 4: 沒有具體錯誤信息

如果 `checkoutComplete` 失敗，但沒有返回具體的錯誤訊息，前端會顯示預設的錯誤訊息。

## 🔄 完整流程

```
1. 用戶點擊 "Make payment and create order" 按鈕
   ↓
2. 前端調用 transactionInitialize
   ↓
3. 後端處理 TRANSACTION_INITIALIZE_SESSION webhook
   ↓
4. 後端應該返回：
   {
     "amount": checkout.totalPrice.gross.amount,
     "data": {
       "event": {
         "type": "AUTHORIZATION_SUCCESS"
       }
     }
   }
   ↓
5. Saleor 設置 transaction.authorizedAmount = amount
   ↓
6. 前端調用 checkoutComplete
   ↓
7. Saleor 驗證：
   - transaction.authorizedAmount != null ✅
   - transaction.authorizedAmount >= checkout.total ✅
   ↓
8. 如果驗證失敗 → 返回錯誤 → 前端顯示錯誤訊息
```

## 🐛 常見問題和解決方案

### 問題 1: `authorizedAmount` 為 `null`

**症狀：**

- `checkoutComplete` 失敗
- 錯誤訊息："The authorized amount doesn't cover the checkout's total amount."

**解決方案：**

1. 檢查後端 `TRANSACTION_INITIALIZE_SESSION` webhook handler
2. 確認後端返回的響應包含 `amount` 欄位
3. 確認後端返回的事件類型為 `AUTHORIZATION_SUCCESS`
4. 檢查後端日誌，確認 webhook 是否被正確處理

### 問題 2: 金額不匹配

**症狀：**

- `checkoutComplete` 失敗
- 錯誤訊息："The authorized amount doesn't cover the checkout's total amount."
- 在 Saleor Dashboard 中可以看到 `authorizedAmount < checkout.total`

**解決方案：**

1. 確認前端發送的金額：`checkout.totalPrice.gross.amount`
2. 確認後端返回的金額與前端發送的一致
3. 檢查是否有金額計算錯誤（稅費、運費、折扣等）
4. 在 Saleor Dashboard 中檢查 Transaction 詳情

### 問題 3: 後端沒有正確處理 webhook

**症狀：**

- `transactionInitialize` 成功，但 `checkoutComplete` 失敗
- 在 Saleor Dashboard 中可以看到 Transaction，但 `authorizedAmount` 為 `null`

**解決方案：**

1. 檢查後端 webhook URL 是否正確配置
2. 檢查後端是否正確訂閱了 `TRANSACTION_INITIALIZE_SESSION` 事件
3. 檢查後端日誌，確認 webhook 是否被接收和處理
4. 確認後端返回的響應格式正確

## 📊 調試建議

### 1. 檢查前端日誌

在開發模式下，前端會輸出詳細的調試資訊：

```typescript
// 位置：src/checkout/sections/PaymentSection/DummyDropIn/dummyComponent.tsx:292-310

if (process.env.NODE_ENV === "development") {
	console.error("❌ checkoutComplete 錯誤:", {
		完整錯誤對象: completeResult,
		apiErrors: errors,
		graphqlErrors: graphqlErrors,
		customErrors: customErrors,
		可能的原因: [
			"1. transaction.authorizedAmount 為 null（後端沒有正確處理 webhook）",
			"2. transaction.authorizedAmount < checkout.total（金額不匹配）",
			"3. 後端返回的事件類型不是 AUTHORIZATION_SUCCESS",
			"4. 後端沒有正確處理 TRANSACTION_INITIALIZE_SESSION webhook",
		],
	});
}
```

### 2. 檢查 Saleor Dashboard

1. 進入 Saleor Dashboard
2. 查看 Checkout 詳情
3. 查看 Transaction 詳情
4. 檢查 `authorizedAmount` 和 `checkout.total` 的值

### 3. 檢查後端日誌

1. 查看後端 webhook 接收日誌
2. 查看後端 webhook 處理日誌
3. 確認後端返回的響應格式

## 🎯 總結

前端會在以下情況顯示 "The authorized amount doesn't cover the checkout's total amount." 錯誤：

1. **Saleor 後端驗證失敗**：`transaction.authorizedAmount` 為 `null` 或小於 `checkout.total`
2. **後端返回的錯誤訊息**：包含 "authorized amount" 相關內容
3. **沒有具體錯誤信息**：`checkoutComplete` 失敗但沒有返回具體錯誤

**根本原因通常是：**

- 後端沒有正確處理 `TRANSACTION_INITIALIZE_SESSION` webhook
- 後端返回的 `amount` 不正確
- 後端返回的事件類型不是 `AUTHORIZATION_SUCCESS`
