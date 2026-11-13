# 濕地垂釣 Swamp Angler

[開始釣魚](https://onerkk.github.io/swamp-angler/)

在木碼頭練習拋竿、起鉤與收線，再探索湖泊、冰湖、潮間帶與海上釣點。魚獲可以放生、出售或帶回小屋。

## 開發與部署

```sh
bash src/build.sh
node --test tests/*.test.js
python -m http.server 8000
```

從瀏覽器開啟 `http://localhost:8000/`。修改遊戲時編輯 `src/`，再重建網頁、主程式與版本號。GitHub Pages 直接使用 `main` 的根目錄產物。

- `src/d.js` 管理釣魚狀態、輸入與場景切換。起鉤判定在 `src/i.js`，計時在 `src/frame-timing.js`，碰撞和抄網分別在 `src/physics.js` 與 `src/landing.js`。
- `src/b.js` 管理戶外渲染。`src/graphics.js` 與 `src/effect-budget.js` 管理自動畫質和各檔負載。
- `src/y.js` 管理雲端存檔、PWA 與版本提示。確認更新後才會重新載入。

[目前的畫質與船上站位](docs/rendering-and-yacht.md)
