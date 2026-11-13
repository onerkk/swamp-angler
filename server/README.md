# 濕地垂釣：釣魚抽蝦皮折扣碼（伺服器）
折扣碼只放在 Render 的環境變數，不放在程式碼裡。

Render 設定（New → Web Service → 連這個倉庫）：
- Build Command：`npm install`　Start Command：`npm start`
- 環境變數：
  - `FIREBASE_SA`：Firebase 主控台 → 專案設定 → 服務帳戶 → 產生新的私密金鑰，把下載的 JSON 檔「整個內容」貼上
  - `PROMO_CODES`：折扣碼，用逗號隔開
  - `PROMO_END`：`2026-12-31T23:59:59+08:00`
