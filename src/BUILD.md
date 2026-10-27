# 濕地垂釣 原始碼與組裝

## 組裝（在放有 src 內容的目錄執行）
JS="b.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js w.js x.js y.js z.js d.js"
cat scan.js $JS > all.js && node --check all.js && python3 tools/lintc.py && \
{ cat a.html; echo "<script>"; cat scan.js; echo "</script>"; echo "<script>"; cat $JS; echo "</script>"; echo "</body></html>"; } > ../index.html && sed -i "s/const VER='[^']*'/const VER='swamp-$(date +%Y%m%d%H%M%S)'/" ../sw.js

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
y 雲端存檔（Firebase Google 登入）與 PWA 安裝

## 2026-10-27 補充
- 組裝順序：b c e f g h i j k l m stars n o p q r s t u v w x y d（x=阿蘅、y=雲端存檔與 PWA）
- 根目錄素材：shop1–9.jpg（靜月之光展示櫃）、scream_main/scream_b/wail/gasp.mp3（CC0）、ice_*.jpg、ghost_face.jpg、manifest.webmanifest、sw.js、icon-*.png、item_hairpin.glb
- models/：fish_*.glb、mermaid3d.glb、ghost.glb、ghost_alive.glb、lantern.glb；models/home/：Poly Haven 家具與貼圖（含 bark_brown_02、burned_ground_01）
- 測試：本機 /tmp/simsite 放 index.html 並 symlink 素材；測試時可加 window.__T 等掛鉤，正式版 index.html 不得包含 window.__T=、__LURE、__WLT、__HOMESCENE、__GRILLSET
- 阿蘅測試網址：?ghost=1（四種輪流）或 ?ghost=glide/peek/behind/jump
- 人形模型烘焙用 fish6/bake_planar.py；魚用 bake4.py（BAKE_SIZE、BAKE_FACES、BAKE_SMOOTH 環境變數）

## 結局
- z.js：結局演出系統（createEnding、endingShots）；劇本與分段見 src/ENDING.md；預覽網址 ?ending=1；配樂 end_piano.mp3、end_theme.mp3（CC0）

## 角色模型（2026-10-27）
- 汐月 mermaid3d.glb、阿蘅 ghost_alive.glb、女鬼 ghost.glb、海王 seaking.glb：用使用者設定圖（src/fish6/chars）經 Hunyuan3D-2mv 生成、bake_planar 正背面投影烘焙
- 骨架：z.js autoRig(root,kind) 載入時自動綁骨（tail＝人魚/海王，human＝人形），rig.pose({t,headYaw,headPitch,headRoll,bow,tail,tailF,skirt,breathe})；p.js、x.js、結局都使用

## 快取
- sw.js 的 VER 每次組裝自動蓋上時間戳（見組裝指令）；模型與貼圖是快取優先，不換 VER 的話手機會一直用舊模型
