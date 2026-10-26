# 濕地垂釣 原始碼與組裝

## 組裝（在放有 src 內容的目錄執行）
JS="b.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js w.js x.js d.js"
cat scan.js $JS > all.js && node --check all.js && python3 tools/lintc.py && \
{ cat a.html; echo "<script>"; cat scan.js; echo "</script>"; echo "<script>"; cat $JS; echo "</script>"; echo "</body></html>"; } > ../index.html

## 推送前必做
1. node --check all.js
2. python3 tools/lintc.py（行尾註解吃掉程式碼的檢查；發現問題會回傳錯誤，組裝自動停止）
3. 回歸測試 tools/gtest43l.py（Playwright + swiftshader，chdir 到含 index.html 與模型的目錄，每次換 port）
4. 確認 index.html 不含測試變數（window.__T=、__LURE）
5. git add -A（新模型檔要一起進 models/）→ commit → push → 輪詢 Pages builds API 等 built

## 模組
b 渲染核心 | c 場景、SPECIES（65 種）、釣竿 | d 主邏輯狀態機 | e 面板、META、圖鑑、任務 | f 野生動物、SPOTS、獨木舟、划槳 |
g 難度、拉扯型態 SP_STY | h HDR | i 樂趣系統、成就 | j 出海 | k 大白鯊 | l 商店 | m 真實模型 RFISH/BAKED/want |
n 星空 | o 天賦與 Boss | p 月光灣、汐月 | q 第一人稱雙手 | r 路亞、水下子畫面 | s 晨霧 | t 冰湖（真實冰貼圖、冰鑽）|
u 診斷 | v 主線故事（章節順序 c1 c2 c3 c4 ice c5 c6 c7）| w 老漁人的小屋（水族箱、標本、潛入缸內）

## 新魚種流程（fish6/）
cutany.sh（自動分格→找魚塊）或 cutbox.py（手動指定範圍）→ gen.py（Hunyuan3D-2mv，gradio_client）→ bake4.py（四視角烘焙，支援 back 與缺角度）→ gt/tojpg.mjs 壓縮
→ 加入 c.js SPECIES（spots/loc/water/tide/noSell）、g.js SP_STY、e.js 餌 aff、m.js RFISH+BAKED → models/fish_<id>.glb
x 阿蘅（夜裡的驚嚇事件與隱藏章節）
