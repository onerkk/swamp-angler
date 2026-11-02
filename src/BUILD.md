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
n 星空 | o 天賦與 Boss | p 月光灣、霜汐 | q 第一人稱雙手 | r 路亞、水下子畫面 | s 晨霧 | t 冰湖（真實冰貼圖、冰鑽）|
u 診斷 | v 主線故事（章節順序 c1 c2 c3 c4 ice c5 c6 c7）| w 老漁人的小屋（水族箱、標本、潛入缸內）

## 新魚種流程（fish6/）
cutany.sh（自動分格→找魚塊）或 cutbox.py（手動指定範圍）→ gen.py（Hunyuan3D-2mv，gradio_client）→ bake4.py（四視角烘焙，支援 back 與缺角度）→ gt/tojpg.mjs 壓縮
→ 加入 c.js SPECIES（spots/loc/water/tide/noSell）、g.js SP_STY、e.js 餌 aff、m.js RFISH+BAKED → models/fish_<id>.glb
x 林秋月（夜裡的驚嚇事件與隱藏章節）
y 雲端存檔（Firebase Google 登入）與 PWA 安裝

## 2026-10-27 補充
- 組裝順序：b c e f g h i j k l m stars n o p q r s t u v w x y d（x=林秋月、y=雲端存檔與 PWA）
- 根目錄素材：shop1–9.jpg（靜月之光展示櫃）、scream_main/scream_b/wail/gasp.mp3（CC0）、ice_*.jpg、ghost_face.jpg、manifest.webmanifest、sw.js、icon-*.png、item_hairpin.glb
- models/：fish_*.glb、mermaid3d.glb、ghost.glb、ghost_alive.glb、lantern.glb；models/home/：Poly Haven 家具與貼圖（含 bark_brown_02、burned_ground_01）
- 測試：本機 /tmp/simsite 放 index.html 並 symlink 素材；測試時可加 window.__T 等掛鉤，正式版 index.html 不得包含 window.__T=、__LURE、__WLT、__HOMESCENE、__GRILLSET
- 林秋月測試網址：?ghost=1（四種輪流）或 ?ghost=glide/peek/behind/jump
- 人形模型烘焙用 fish6/bake_planar.py；魚用 bake4.py（BAKE_SIZE、BAKE_FACES、BAKE_SMOOTH 環境變數）

## 結局
- z.js：結局演出系統（createEnding、endingShots）；劇本與分段見 src/ENDING.md；預覽網址 ?ending=1；配樂 end_piano.mp3、end_theme.mp3（CC0）

## 角色模型（2026-10-27）
- 霜汐 mermaid3d.glb、林秋月 ghost_alive.glb、女鬼 ghost.glb、滄淵 seaking.glb：用使用者設定圖（src/fish6/chars）經 Hunyuan3D-2mv 生成、bake_planar 正背面投影烘焙
- 骨架：z.js autoRig(root,kind) 載入時自動綁骨（tail＝人魚/滄淵，human＝人形），rig.pose({t,headYaw,headPitch,headRoll,bow,tail,tailF,skirt,breathe})；p.js、x.js、結局都使用

## 快取
- sw.js 的 VER 每次組裝自動蓋上時間戳（見組裝指令）；模型與貼圖是快取優先，不換 VER 的話手機會一直用舊模型

## 組裝（新）
- 一律用 `bash src/build.sh`：組 index.html，並把同一個版本號蓋進網頁（APP_VER）、version.json、sw.js 快取版本
- 玩家端：網頁定時比對 version.json，有新版跳出「有新版本・立即更新」，按下清快取重載

## 部署到 CDN（2026-10-28 起）
主程式（app_scan.js、app_main.js）由 jsDelivr 送出。每次部署請照這個順序：
1. `bash src/build.sh` → commit → push（這次提交包含新的 app_*.js）
2. 把 index.html 裡載入器的 `CDN='https://cdn.jsdelivr.net/gh/onerkk/swamp-angler@main/'` 換成 `@<剛剛那次提交的 SHA>/`，再 commit → push
   （固定到提交 SHA，jsDelivr 一定拿到新版；用 @main 會有分支快取延遲，載入器會退回本站、變慢）
3. 換過模型／貼圖時，對換過的檔案呼叫 `https://purge.jsdelivr.net/gh/onerkk/swamp-angler@main/<檔案路徑>`
4. 上線前一定要跑完整啟動測試（載入到「✅ 真實場景已載入」且 G.state 為 idle、沒有錯誤）

## 效能與畫質（2026-11-02）
- 畫質分兩層：材質等級 tier（高／中／低，effect-budget.js effectTier）整段遊戲固定，決定貼圖與光澤，不隨自動調整切換（避免著色器重新編譯卡頓）；等級 level 0～7 只調解析度、數量、更新頻率（effectBudget 的 rainLines、reflectionHz、shadowHz、probeHz、particleScale）
- 規則：任何畫質都不得關閉特效，只能改用較省的版本；陰影 shadowMap.enabled 一律 true
- 遠近細節 lod.js：models/lod/*_lod1.glb（12%，遠處）與 *_lod0.glb（35%，中低畫質的近處）是倒木、樹樁、岸邊岩石的簡化幾何（無貼圖、Draco），由 GLTFLoader 掛鉤自動配對，遠處換幾何、材質不變；新增大型岸邊模型時用 /tmp 的 gltf-transform 腳本（simplify ratio 0.12、prune keepAttributes、draco）產生並加入 LOD_MODELS
- 合併繪製 batching.js：mergeMeshesByMaterial（同材質小零件合成一個網格，例：睡蓮花、水黽）、instanceCopies（岸邊散植改實例化）；湖區繪製次數約 446 → 202
- 水面細波紋層數 uWaterLOD：高 4、中 3、低 2
- 手機像素預算：__gfxCap 在手機上限約 220 萬像素（約 1080p），不照原生 3 倍密度畫；倒影 RT 手機最長邊 ≤768、陰影 ≤2048；岸邊小草與水黽不進倒影
- 載入完成時預先編譯著色器並 initTexture 全部貼圖，避免轉頭第一次看到才上傳而卡頓
- 程式浮萍已移除（真實路線，不要假綠毯）
- 診斷 v4（u.js）：各繪製階段提交時間與繪製次數（b.js passStats）、像素負載、GPU／CPU 瓶頸判定、長任務歸因（著色器編譯／貼圖上傳／幾何上傳／純 JS）、最重物件、JS 記憶體、WebGL context lost 記錄與前次結束判定
- 浮萍灣：睡蓮加密（c.js bay 叢）＋真實浮萍毯（dwTex 畫 2600 片小葉的 512 貼圖、不規則圓形網格合併成一個網格、renderOrder 1 排在水面後、DoubleSide）
- 水下層 submerged.js 手機最長邊 ≤1024（高）／768／640；診斷加入場景切換資源趨勢，幀統計忽略背景空檔
- 獨木舟船艙遮罩：U.uBoat（x,z,head,on），水面著色器在船艙橢圓內 discard，船底不再透出水面與漣漪
