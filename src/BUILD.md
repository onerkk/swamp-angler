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
- 船艙水線遮罩（f.js hullCap）：只寫深度的橢圓蓋在船艙水線，renderOrder -1，船體 -2；任何貼在水面的東西（水、浮萍、睡蓮、雨圈）都不會畫進船裡
- 浮萍被船推開（c.js dwMat.onBeforeCompile）：船身橢圓內不畫，uTrail 24 點水道 28 秒合攏；f.js 每前進 0.45m 記一點
- LOD 高畫質三級：7m 內原檔、7～18m 中間版、以外簡化版
- 荷葉物理（c.js window.__PADS）：荷葉被船殼橢圓推開（往最近出口推、船頭帶側向滑開）、邊緣壓下傾斜、慢慢漂回；船速 >1.15 m/s 且撞在前半段會沖破成 3 片碎葉（pads 實例預留 48 格），碎葉約 22 秒沉沒消失；花是實例，跟荷葉一起動。f.js 每幀以船位移算速度呼叫 update
- 雨圈與雨滴著色器（k.js）用 uBoat 橢圓 discard，不再畫進船艙。組裝後一定檢查 rc 與 version.json
- 場景切換卡頓：fadeOutWhenReady()（d.js）讓黑幕多撐 3 個畫面，新場景第一次繪製的幾何／貼圖上傳發生在黑幕後；載入完成時連平常隱藏的物件（魚、鱷魚、船、特效；燈光除外）一起 compile，避免第一次出現才編譯（每次 100～200ms）
- 收線（d.js startRetrieve）：浮標先沿水面拖回竿尖前方約 0.9m（跟著水面起伏、往拉的方向傾斜、拖出水紋），最後一段才離水提到竿尖；retrieveLift 是離水的路徑點。測試用 window.__startRetrieve
- 切背景時（idle/wait/bite/lure/retrieve）呼叫 W.suspendEffects 釋放湖區顯示資源，回來黑幕下重新上傳，降低被系統結束的機率
- 倒影自動跳過水面以下或平貼水面的物件（b.js lowReflObjects，每 1.5 秒重算；userData.flatOnWater 強制跳過）
- 診斷 timed()：存檔、換釣點、載入釣點／水域、釋放場景、避障路徑、進出小屋超過 8ms 會記錄，長任務直接標出函式名
- 天氣（f.js）：一種天氣維持 6～12 分鐘、開局 4～8 分鐘才第一次變，轉變係數 dt*.07（約半分鐘）
- 小屋輕音樂（d.js Snd musicStart/musicStop）：即時合成分解和弦 + 低音 + 房間殘響，setIndoor 進出時淡入淡出，跟遊戲音效開關
- 浮萍灣效能：荷葉與浮萍毯 renderOrder -1 先畫、寫深度，蓋住的水面像素不跑水面著色器；浮萍水道 24 點迴圈只在船 14m 內才算
- 垃圾回收卡頓根因：physics.js hit/inside/clear/resolve/refresh 原本每次呼叫都配置物件與陣列（每幀上萬次），改成不配置；c.js setLine 繞路結果快取（兩端移動 <5cm 或 0.25 秒內沿用），短線不繞路；釣線碰撞忽略「船體」箱。headless 量測每分鐘配置 518MB → 161MB
- 搏魚翻白（c.js foam/foamBurst，d.js updateFight 呼叫）：程式畫的泡沫紋理（細胞泡沫邊＋氣泡），180 片實例化水面方片，壽命在著色器裡算（長大→碎成蕾絲→消失），強度依張力、衝刺、甩頭、魚的深度；跳水落水與起魚時一團爆開。測試掛鉤 window.__PROPS
- 搏魚時魚本體在 14m 內放到水面下（透過水面看得到甩動翻身）；甩頭時尾巴拍水，c.js splash(x,y,z,n,pw,dx,dz) 可帶方向噴成弧；衝刺時兩側小漣漪成 V 形尾浪。測試：window.__testFight(x,z) 直接進入搏魚（可配 ?fish=bass）
- 近海礁岩淺海（b.js uReef 分支）：海底深度依雜訊 1.8～8m 變化（沙洲碧綠、溝槽轉藍），白沙細沙紋，晴天光紋加強 1.45 倍，散射色依深度從碧綠到藍
- 水族箱水草（aquarium-display.js setDetail）：房間看用 lod 中間版（fern 71%、grass 46%、nettle 35%），tankview 近看換回原檔；lod.js variant(geo,'mid'|'far'|'full')，LOD 掃描排除 InstancedMesh。搏魚時收線且魚沒衝刺，魚頭慢慢轉向船（f.headY）
- 2026-11-02 新魚種：海雞母 maori、河豚 puffer（noSell）在近海礁岩；變身苦 scat、大眼海鰱 tarpon、星點臭肚 rabbit 在月光灣潟湖（water:'sea'）。模型 bake_planar 側面＋俯視流程，prep 腳本 src/fish6/sea2/prep.py
- 甲殼類骨架 crust.js：龍蝦 lobster、泰國蝦 prawn（m.js SWIMK 模式），身體 models/crust_*.glb 掛在脊椎骨；步足三節（髖轉向、髖抬、膝、踝）、蝦螯三節＋兩指開合、分節觸角、游泳足；poseCrust 依 uSwim（步態）與 uAmp（用力）擺動，用力時每 1～2.4 秒腹部猛捲彈尾。顏色用 lin() 轉線性色。水族箱 BENTHIC 'walk' 沿缸底走
- 飛扁＝棘鰆 wahoo（遠洋深藍）；龍蝦（礁岩夜間）、泰國蝦（木碼頭、倒木區）
- 2026-11-02 售價重訂：每種魚「典型尺寸一條的真實價值」（食用魚＝台灣市價每公斤×典型重量；觀賞魚＝一隻的價錢）× 0.252（舊經濟的中位數換算率），反推 price＝目標÷((w+.3)^.85×稀有度倍率×.4)，讓稀有度倍率不再扭曲魚種之間的真實價差；神話與傳說角色維持原價。計算腳本 /tmp/price.py 的表格寫在提交訊息
- 難易度：f.win 現在真的有作用（張力與磨線都除以它）；依釣友經驗設定：雀鱔骨質嘴 .6、大眼海鰱跳躍脫鉤 .65、棘鰆與梭魚牙齒咬線 .65～.7、浪人鰺與石鯛往礁洞鑽 .75～.8；新增拉扯型態 SP_STY 16 種
