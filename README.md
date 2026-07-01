# DD 反向指標交易終端 (DD Inverse Trading Terminal)

這是一個以「DD 反向思維」為核心設計的模擬交易與分析終端。採用極致的 Cyberpunk 玻璃擬態設計，整合了即時市場數據與大語言模型 (LLM)，能在你做交易決策時，為你提供強烈的反向指標與靈魂拷問。

## 🚀 核心功能

*   **TradingView 即時圖表整合**：無縫嵌入 TradingView 圖表，隨時查看任何你關注的標的。
*   **全域商品搜尋**：支援加密貨幣、美股、外匯等全球市場商品的即時搜尋 (Autocomplete)。
*   **DD 反向分析儀**：根據即時漲跌幅，自動給出「做多/做空」的強力反向建議與勝率預測。
*   **「問問 DD 大師」**：串接 OpenRouter (預設使用 `nvidia/nemotron-3-ultra` 免費模型)，結合 DD 經典語錄與即時報價，動態生成充滿自信卻註定被打臉的專屬交易心法。
*   **Cyberpunk 視覺體驗**：霓虹紅與霓虹綠交織的光暈，搭配玻璃擬態卡片，帶來沉浸式的看盤體驗。

## 🛠️ 安裝與啟動教學

請確保你的電腦已安裝 **Node.js** (建議 v18 以上)。

### 1. 安裝依賴套件
```bash
npm install
```

### 2. 設定環境變數
專案中已提供 `.env.example`，請將其複製或重新命名為 `.env`：
```bash
cp .env.example .env
```
接著，打開 `.env` 檔案並填寫你的 API 金鑰：
```env
# 透過 OpenRouter 取得免費或付費的 API Key
OPENROUTER_API_KEY=your_api_key_here
PORT=3000
```
> **提示：** 如果你不填寫 API Key，系統仍能運作，但「呼叫 DD」功能將降級為隨機抽取本地語錄，不會有 LLM 動態生成的內容。

### 3. 啟動後端伺服器 (API & 快取層)
```bash
node server.js
```
伺服器預設會運行在 `http://localhost:3000`。

### 4. 啟動前端終端 (Vite)
請打開**另一個終端機視窗**，並執行：
```bash
npm run dev
```
啟動後，在瀏覽器中打開 `http://localhost:5173/` 即可開始體驗！

## 💡 進階技巧：TV Session ID (選填)

在終端介面右上方有一個「TV Session ID」欄位。本系統預設以訪客身份獲取公開報價。如果你在 TradingView 有訂閱特定付費市場 (如零延遲美股或期貨)，可以填寫你的登入 Session ID：
1. 登入 TradingView 網頁。
2. 開發者工具 (F12) -> Application -> Cookies。
3. 找到 `sessionid` 並複製其值，貼入系統即可享受你帳號專屬的即時資料。

## 📝 授權
This project is for entertainment and educational purposes only. Not financial advice.
