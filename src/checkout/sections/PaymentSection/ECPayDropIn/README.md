# 綠界金流整合說明

## 📋 結帳流程概述

在前端結帳流程中，綠界金流的處理步驟如下：

### 1. 支付閘道初始化 (`paymentGatewaysInitialize`)

- 當用戶進入結帳頁面時，系統會自動調用 `paymentGatewaysInitialize`
- 這個 mutation 會初始化所有可用的支付閘道（包括綠界）
- 後端會返回每個支付閘道的配置資訊

### 2. 交易初始化 (`transactionInitialize`)

- 當用戶點擊「前往綠界付款」按鈕時
- 前端調用 `transactionInitialize` mutation
- 傳遞參數：
  - `checkoutId`: 結帳 ID
  - `amount`: 支付金額（`checkout.totalPrice.gross.amount`）
  - `paymentGateway.id`: 綠界 gateway ID（`app.saleor.ecpay`）
  - `paymentGateway.data`: 可選的額外資料

### 3. 後端處理

- Saleor 後端會觸發 `TRANSACTION_INITIALIZE_SESSION` webhook
- 後端應該：
  - 建立綠界訂單
  - 產生綠界支付 URL
  - 返回 `transactionEvent.type = "CHARGE_ACTION_REQUIRED"` 或 `"AUTHORIZATION_ACTION_REQUIRED"`
  - 在 `data` 中返回支付 URL（例如：`data.redirectUrl` 或 `data.paymentUrl`）

### 4. 重定向到綠界

- 前端從 `transactionInitialize` 的響應中取得支付 URL
- 使用 `window.location.href` 重定向到綠界支付頁面
- 儲存 `transactionId` 到 `sessionStorage` 以便後續處理

### 5. 用戶在綠界完成付款

- 用戶在綠界頁面完成付款流程
- 綠界會回調到後端的回調 URL（ReturnURL 或 NotifyURL）

### 6. 後端處理付款結果

- 後端接收綠界的回調
- 更新交易狀態
- 觸發 `TRANSACTION_CHARGE_REQUESTED` 或相關 webhook

### 7. 前端處理返回結果

- 如果綠界有設定 ReturnURL，用戶會被重定向回前端
- 前端需要檢查支付狀態並完成結帳

## 🔧 可能遇到的問題

### 問題 1: 綠界支付閘道沒有出現在支付選項中

**可能原因：**

- 後端沒有正確配置綠界 Payment App
- Gateway ID 不匹配（前端期望 `app.saleor.ecpay`）
- Payment gateway 初始化失敗

**檢查方法：**

1. 打開瀏覽器開發者工具的 Console
2. 查看是否有 "Payment Gateway Debug Info" 的日誌
3. 確認 "過濾後 gateways IDs" 中是否包含 `app.saleor.ecpay`

**解決方案：**

- 確認 Saleor 後端的 Payment Apps 設定
- 確認 Payment App 的 ID 是否為 `app.saleor.ecpay`
- 檢查後端日誌是否有初始化錯誤

### 問題 2: 點擊付款按鈕後沒有重定向

**可能原因：**

- `transactionInitialize` 返回的 `data` 中沒有支付 URL
- 後端返回的 URL 欄位名稱與前端期望的不同
- 交易事件類型不是 `CHARGE_ACTION_REQUIRED` 或 `AUTHORIZATION_ACTION_REQUIRED`

**檢查方法：**

1. 打開瀏覽器開發者工具的 Console
2. 查看 `transactionInitialize` 的響應
3. 檢查 `transactionEvent.type` 和 `data` 的內容

**解決方案：**

- 確認後端返回的 URL 欄位名稱
- 如果後端使用不同的欄位名稱（例如：`ecpayUrl`、`checkoutUrl`），需要修改 `ecpayComponent.tsx` 中的 `redirectUrl` 取得邏輯
- 確認後端返回的交易事件類型

### 問題 3: 重定向後無法完成結帳

**可能原因：**

- 綠界回調後，後端沒有正確更新交易狀態
- `transaction.authorizedAmount` 沒有正確設置
- 前端無法檢測到支付完成狀態

**檢查方法：**

1. 檢查後端是否正確處理綠界回調
2. 檢查交易狀態是否更新
3. 查看是否有 "authorized amount" 相關錯誤

**解決方案：**

- 確認後端正確處理綠界回調並更新交易狀態
- 確認後端在 `TRANSACTION_INITIALIZE_SESSION` webhook 中返回正確的 `amount`
- 確認後端返回的事件類型為 `AUTHORIZATION_SUCCESS` 或 `CHARGE_SUCCESS`

### 問題 4: 支付完成後頁面沒有自動跳轉

**可能原因：**

- 綠界沒有設定 ReturnURL
- ReturnURL 設定錯誤
- 前端沒有處理返回的 URL 參數

**解決方案：**

- 在後端設定綠界的 ReturnURL（例如：`https://yourdomain.com/checkout/return?transactionId=xxx`）
- 在前端創建返回頁面處理邏輯
- 檢查 URL 參數並調用 `transactionProcess` 和 `checkoutComplete`

## 📝 後端配置檢查清單

- [ ] Payment App ID 設定為 `app.saleor.ecpay`
- [ ] 正確處理 `TRANSACTION_INITIALIZE_SESSION` webhook
- [ ] 返回的交易事件類型為 `CHARGE_ACTION_REQUIRED` 或 `AUTHORIZATION_ACTION_REQUIRED`
- [ ] 在 `data` 中返回支付 URL（欄位名稱與前端一致）
- [ ] 正確處理綠界回調（ReturnURL 和 NotifyURL）
- [ ] 在回調處理中更新交易狀態
- [ ] 返回正確的 `authorizedAmount`

## 🔍 除錯技巧

1. **查看 Console 日誌**：所有重要步驟都有 console.log
2. **檢查 Network 請求**：查看 `transactionInitialize` 的請求和響應
3. **檢查後端日誌**：確認 webhook 是否被正確觸發
4. **使用綠界測試環境**：先在測試環境驗證流程

## 📚 相關檔案

- `ecpayComponent.tsx`: 綠界支付組件
- `types.ts`: 綠界 Gateway ID 定義
- `supportedPaymentApps.ts`: 支付方式註冊
- `utils.ts`: 支付閘道過濾邏輯
- `types.ts`: 類型定義
