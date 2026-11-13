# 進度紀錄（每段做完就更新；新回覆先讀這裡接續，不重新調查）

## 已上線
- 終幕回禮水線修正、遠處水面接縫修正
- 遊艇 43 節、wake.js（艏浪、航跡、水花）、撞浪越過甲板
- 進階天賦（搏魚、捲線、定力、尋蹤）、大白鯊女王校準、面板打開收起浮動按鈕
- 大師挑戰 Lv 28～60 共 9 隻（漁獲簿頁面）、潮心石、強化 +15、新裝備

## 進行中
- 2026-11-13 獨木舟換成木船：models/canoe.glb ＝「Wooden Boat」donnichols CC BY（拿掉兩支槳、貼圖轉 JPEG、draco，875KB；原檔船頭在 +z，載入時轉 π）。f.js 改成等比縮放長 4m（寬約 1.55m），水線遮罩 .62×1.72，碰撞盒 ±.75。z.js 小屋碼頭邊的展示船也用同一檔（等比 2.8m）。貞子：有版權，已婉拒，提供原創幽靈造型（加強現有白衣女鬼或另找原創模型）兩個選項待使用者回覆
- 2026-11-13 使用者三件事：(1) 漁獲簿頁（o.js #ledger）橫向被切掉→橫向時書高＝視窗高、頁面可捲、開著時藏拍照鈕；(2) 起鉤量表太慢、大魚跟一般魚差不多→整段 1.25s×win×難度×0.8^稀有度（最短 .45s）；(3) 女鬼全身一樣綠→x.js 自發光只在臉（vGlowH>.84）、脖子漸暗、身體 .015，加邊緣冷光、衣服去色；綠點光改成只照臉 1.8m、不規則閃（未實機確認，測試站難觸發女鬼）
- 2026-11-13 起鉤難度（使用者：現在怎麼拉都會中、應依魚種不同）：另一個工作階段（372c503）把起鉤改成「浮標一沉就按＝必定完美」。i.js hookTiming 加「試探期」early（稀有度、警戒 f.win<1、難度、每次 ±25%）、完美窗隨稀有度變窄；hookResult 回傳 early（太早＝錯過並提示）；量表多一段紅色 #hz0。tests/hook-timing.test.js 改寫（5 項通過）。範例（標準難度）：吳郭魚 試探 .15s 完美 .60s；鯉魚 .26s／.17s；魚王 .41s／.10s
- 2026-11-13 泥灘遠景（tide.js「遠景」區塊）：消波塊 240 個（models/tide/tetrapod.glb，Akihiko Tarutani CC BY，InstancedMesh，岸邊 z≈58～62）、蚵棚竹竿 9 排×44 支＋橫竹（InstancedMesh，z −22～−41）、擱淺小船兩艘（sampan_blue.glb Godot2000、rowboat_green.glb donnichols，CC BY）；泥色調亮。作者標示還沒加到設定頁。
  未驗證：測試站裡 window.__TIDE 改成延遲建立（另一個工作階段的提交 372c503），舊的 __TIDE.enter() 測試方法失效，畫面沒看到
- 2026-11-13 泥灘：上下拖曳改成抬頭低頭（pitch −1.15～.45），走路改用左下 #tdWalk 前進／後退按住鈕；地形退回 220 格（300 格 FPS 59→18）；天空穹頂與霧最低亮度 .22／.2（傍晚不再一片炭灰）。
  「真實」還差：天空是平的灰、地平線一條直線沒有遠景（蚵仔寮應有遠方堤岸、蚵棚、竹竿、漁船）、泥色偏黑
- 2026-11-13 蚵仔寮泥灘「不真實」：tide.js 水邊加細微高低差（泥面紋理＋細雜訊，水邊不再沿著 0.9m 網格走直線）、濕泥粗糙度 .16→.27、法線強度 1.1→.75、環境反射 .45→.75、地形 220→300 格。
  未驗證：測試站進泥灘（window.__TIDE.enter()）後截圖指令卡住沒有完成（swiftshader 太慢），畫面沒親眼看到。另外截圖裡天空很暗：天空穹頂顏色＝.06＋.94×白天亮度，使用者當時可能是傍晚，未確認是不是錯誤；沙蠶的泥條（coil）出現在水面上也還沒處理
- 2026-11-13 穿模根治：b.js 第一人稱圖層（VM=2）。鏡頭父層級上掛的物件（釣竿、捲線器、realRod）與 userData.viewmodel 的物件（q.js 雙手）每 30 幀標到圖層 2；主畫面＋TAA＋光束畫完後 clearDepth、camera.layers.set(2) 再用 radiance.render 畫一次（背景暫時拿掉）；所有燈 enable(2)。出錯會設 window.__noVM 退回。測試確認：轉到 ±0.95 時竿子畫在座椅前面。
  未解：測試環境裡在船上的釣位看不到雙手（加圖層之前就這樣），使用者影片裡有手，原因未查
- 2026-11-13 使用者：水花「太假」不是太大（大的水花比較有感覺）；手還是穿模。
  · 穿模：影片顯示是手臂與竿子往船頭轉時穿過靠背座椅（座椅靠背 z 1.3～1.4、釣位原本 z 1.75）。釣位移到 z 2.15；轉頭上限 ±0.95 rad 時竿子都在座椅外（截圖確認三個方向）。注意：這次截圖裡沒看到手臂（只看到竿與捲線器），原因未查
  · 水花：wake.js 動態模糊改用「相對於船」的速度（uBoatV），以前船速十幾 m/s 時靜止的水全被拉成發亮長線；水團用雜訊撕成不規則邊緣、透明度提高；小船水花高度與量調大。還沒親眼看到：測試裡模擬油門（dispatch keydown KeyW）船沒有動，boatV 只有 0.5，原因未查（可能是 updateKayak 的 can 條件）
- 2026-11-13 小船後續（已上線）：釣位改船中線 (0,1.75)（x=.27 時手肘低過舷緣、穿過插竿座）；Scout_Base／Other_01 換成 MeshPhysicalMaterial 清漆（clearcoat .85、粗糙度×.55、envMap 1.45），共用材質用 seen 對照表一起換；
  wake.js 依船長縮放（Lb/26）：船頭水花矮、量少，大船的白水幕改成小船滑行時船舷兩側貼水面往外甩的低水簾，新增船外機雞尾巴水柱，破浪越過船頭量×.3、高×.42，航跡變窄；極速 22→16.5 m/s（32 節），引擎聲換算跟著改。水花未截圖驗證（測試環境開船畫面太慢）
- 2026-11-13 使用者影片「材質反射不真實、看看有無其他錯誤」：根因＝原檔把 Scout_Base／Other／滅火器標成 alphaMode BLEND，GLTFLoader 會設 transparent＋depthWrite=false → 遠的面蓋過近的面（中控台背面透出前面的 Scout 字、零件像浮在半空、整艘船發白發平）。m.js 改成不透明＋alphaTest .5、envMapIntensity 1.15。白天截圖確認：魚探、羅盤、Yamaha 儀表、方向盤、杯架、置物蓋都正確遮擋、有反光
- 2026-11-13 使用者問駕駛座眼前的橫桿：那是擋風玻璃上緣扶手（高 1.6m），實船也有。真正的錯：駕駛座 z=.55 貼在中控台背面（中控台 z −.3～.5、靠背座椅 z .9～1.4），已改 z=.72；船殼所有材質都是雙面畫，從船內看到外殼背面＝船名、註冊號碼、Scout 字樣左右相反 → Scout_Base／Scout_Other 背面改畫白色內襯（m.js onBeforeCompile，gl_FrontFacing）。夜間截圖確認：中控台儀表在正確的一面、扶手在畫面上緣、沒有反字
- 2026-11-13 使用者選 B：船換成「2004 17' Scout - Center Console」（BoatUS Foundation，CC BY 4.0，uid 185e7c1dbf254b57b42b1979c45e4117）。
  轉檔：/tmp/gt/strip.mjs 拿掉拖車（材質 Scout_Trailer）→ simplify 0.42 → /tmp/gt/tojpg.mjs（無透明的貼圖轉 JPEG）→ draco：12.3 萬面、3.8MB（models/yacht.glb）
  m.js attachYacht：真實尺寸全長 6m、船身置中原點、吃水線 H*.19；Glass 材質改透明；不再放道具。yacht-layout.js：釣位 (.27,1.7) 船尾右舷、駕駛座 (0,.55) 中控台後，艙底板 y≈.11
  已截圖：釣位看得到右舷、船外機 Yamaha 90、滅火器；駕駛座看得到中控台、儀表、擋風玻璃
  未確認：航行速度（目前上限 22m/s≈43 節，17 呎 90 匹實船約 30～35 節）、艏浪航跡位置、抄網位置、船身晃動幅度（小船應該比大遊艇晃得多）
- 2026-11-13 使用者回饋新遊艇「根本不真實」「釣魚時穿模」：
  · 已上線：釣位退到 x=.25（舷牆在 x≈1.4，原本 x=1.0 手臂和竿子穿過欄杆）；m.js attachYacht 依材質貼圖平均色分類換質感（玻璃深色反射、白漆亮面、黑色船身漆、灰色五金金屬、柚木緞面）；道具移到左舷
  · 根本問題沒解決：Yacht II 是 AC3D 來源的中模，29 個材質都是小色塊貼圖、沒有法線／金屬貼圖，第一人稱近看細節不夠。真正要寫實得換高細節模型
  · 候選（Sketchfab，CC BY，BoatUS Foundation 的駕船訓練模擬器用模型，甲板與駕駛台細節完整）：285 Conquest Boston Whaler（61e2b2fae81b4e858b401ce7ccc8d8d2，28.6 萬面，釣魚快艇）、2004 17' Scout Center Console（185e7c1dbf254b57b42b1979c45e4117，38 萬面，帶拖車要去掉）、212X Yamaha（df598113531f4c74ac48c6e0a530b6c0）；Riva 木質快艇（91f0f11ba42b4000abf788d54d73b9b1，32.6 萬面）。等使用者選
- 2026-11-13 新遊艇已上線：models/yacht.glb 換成 Yacht II（gogiart，CC BY 4.0，9.7 萬面、1.2MB；舊的 Frickie's yacht 在 git 歷史裡）。
  m.js attachYacht：obj.rotation.y=π、下沉 H*.128、不再 dressYacht／addMarineHardware，只呼叫 addMarineProps(T,wrap,null)（前甲板：魚箱、工具箱、水桶）
  yacht-layout.js：yachtDeckHeight 改成任何水平面（|n.y|>.8，這個模型甲板面法線朝下）、可指定起始高度；站位 釣位 (1.0,−0.5) 甲板 1.61、駕駛座 (0,2.4) 甲板 3.64
  tests/yacht-layout.test.js 已改成新船的正規化與站位（保留「站著往外看 15 公尺內不會被船擋住」的檢查，通過）
  已截圖：釣位（前甲板右舷，看得到舷牆、白色欄杆、柚木甲板）、駕駛座（上層甲板往船頭看，前甲板、繫纜樁、魚箱）
  未確認：從外面看的吃水線、航行時艏浪與航跡的位置、引擎聲與破浪水花是否對得上新船身、抄網起魚的位置（舷牆比舊船高）
- 遊艇替換（下一輪直接做，座標已量好）：Yacht II by gogiart（agt14032013），CC BY，uid dadc775d1d044aee9f6744fa7b47648e；轉檔：gltf-transform simplify --ratio 0.4 --error 0.0008 → resize 1024 → draco（9.7 萬面、1.2MB；/tmp/sf/yacht.glb，容器重置要重抓）
  預覽工具：/tmp/simsite/yv.html＋/tmp/yv.py（用遊戲同一套正規化：最長邊縮成 26m、z −4.5～21.5、畫 2m 格線的俯視與側視）
  量到的（模型原始朝向，正規化後）：原始尺寸 x22.7 y39.3 z105.2（長邊在 z，不用轉 90°）；**船頭在 +z（21.5）、船尾在 −z**，遊戲要船頭在 −z → 要再轉 180°（遊戲座標 z' = 17 − z、x' = −x）
  外框 x±2.81、y −0.97～8.74；吃水線（黑色船身與米色船底交界）約 y≈0.27 → 下沉量用 H*.13 左右再微調
  甲板高度（原始朝向，由上往下打）：上層柚木大甲板 y≈3.92（z −3～15，船尾端放著小艇）；駕駛艙屋頂 z 7～13 高 5.0～6.5；前甲板（船頭）z 17～21 高 1.87～2.13；船尾下層甲板被上層蓋住（約 y 1.9，要從 y 3.5 往下打）
  建議站位（遊戲座標）：釣位＝前甲板右舷 x'≈1.2、z'≈−2（原始 z≈19），甲板約 1.9～2.1，面向右舷；駕駛座＝上層甲板駕駛艙前方 x'=0、z'≈1.7（原始 z≈15.3），甲板約 3.8，面向船頭
  要改：m.js attachYacht（檔名、轉 180°、下沉量）、yacht-layout.js（站位；甲板高度判斷不能再靠材質名 material_3，改成法線朝上＋可指定起始高度）、marine.js（新船不套 dressYacht、不加甲板五金；道具改放前甲板與駕駛位旁）、m.js RCREDIT 把「Frickie's yacht / dannzjs」換成新作者
- 2026-11-13（接續被中斷的那一輪）已上線：
  · 換地點等新照片（h.js W.photoReady、d.js fadeOutWhenReady）——/tmp/trav1.log 驗證：湖→近海，黑幕等到照片好才拉開，uPhoto 最後是 1
  · 釣竿改用「Canna Da Pesca」by topfrank2013（CC BY 4.0，uid f8031fbbea9a4a9fbd3ab23ee6334c00，models/rod_real2.glb 4MB，無骨架）。c.js realRod：載入時把每個頂點換成（竿上位置 s、往捲線器側、往旁側），頂點著色器用 uRodPts（＝pts 曲線）擺回去，任何釣竿模型都適用；REEL_S=.185（手握處）。舊的 rod_real.glb（ergin3d，骨架版）已移除
    已截圖：軟木握把穿過拳頭、捲線器在手旁、彎曲時竿身跟著曲線。未確認：實機上手指與握把的細部貼合、捲線器握把不會轉、裝備升級不再變色
- 2026-11-13 使用者回報兩件事（都還沒修好上線，嘗試存在分支 wip-rod-photo）：
  1. 海上出現湖邊樹林：根因確定——h.js setPhotoHook 在新地點照片還沒載好時 return null，天空沿用上一個地點的照片；d.js fadeOutWhenReady 只等 3 幀。分支上的修法：W.photoReady(hour)、黑幕最多多等 10 秒、沒載好時 uPhoto=0 先用程式天空。還沒驗證（測試跑到 window.__goSpot(5) 之後沒有輸出，原因未查）
  2. 手沒握在真實釣竿上：骨架連線不是握把中心線。分支上改用頂點算中心線（握把尾端與捲線器上方竿身兩處的中心連線）、捲線器對到 s=.125，結果竿子變得巨大且位置錯——推測蒙皮網格的頂點座標不能只乘 mesh.matrixWorld（要用 SkinnedMesh.boneTransform 取靜止姿勢位置）。下次先在頁面裡印出 tmin/tmax/tReel/k 再調
  3. 遊艇：Yacht II 已下載並轉好（/tmp/sf/yacht.glb，9.7 萬面、1.2MB；容器重置要重抓 uid dadc775d1d044aee9f6744fa7b47648e）。現有遊艇是 Sketchfab「Frickie's yacht」＋ m.js attachYacht（正規化成長 26m、船頭 −z）＋ yacht-layout.js（釣位 x2.12 z15、駕駛座 x.6 z10，甲板高度靠材質名 material_3 判斷）＋ marine.js dressYacht（依材質名換船用材質）；換模型要改這三處
  測試注意：/tmp 測試站的主程式要重試三次才載入（載入器會核對版本標頭），每次開頁多約 10 秒；rod2.py 這類多步驟測試要給 700 秒以上
- 2026-11-12 Sketchfab 下載管道可用：使用者提供 API token（不要寫進倉庫；容器裡放 /tmp/sf/.tok，重置後請使用者再貼一次或重新產生）。
  用法：GET https://api.sketchfab.com/v3/search?type=models&q=…&downloadable=true，下載 GET /v3/models/{uid}/download，標頭 Authorization: Token <token>，回傳 glb／gltf 的短效網址
  · 已上線：真實釣竿 models/rod_real.glb（「Fishing Rod, Rigged and Animated」by ergin3d.com，CC BY 4.0，uid 78991bf44cf54acb8660bef317d72c7a；10 節骨頭 Bone001..010 沿 +X）。c.js realRod／poseRealRod：沿用 pts 彎曲曲線，每幀把骨頭擺到曲線上；載入成功才藏掉程序竿，擺姿勢出錯會退回程序竿。
    已確認：靜止時握在手上、捲線器在手下方。未確認：大彎曲（搏魚）時骨頭有沒有扭、竿色（已把環境反光降到 0.3）、捲線器握把不會轉、裝備升級不再改變竿子顏色
  · 候選（已看過縮圖，都是 CC BY）：遊艇 Yacht II dadc775d1d044aee9f6744fa7b47648e（21.8 萬面）、Motor Yacht a9bc45ee36c04987b59c029862ee0d3b（60 萬面）；浮標 1228159338c74666aabdc0acd54f8ab6（已轉成 /tmp/sf/float.glb 2MB，未使用：原本的浮標做得很細，換掉效益低）；金屬餌桶 97195a30f56443e18e14729bb3718832；珊瑚礁實景掃描 4f134339…／0051900d…／109f3290…
- 2026-11-12 真實度（使用者：主要需要真實模型）：
  · 標本館地板、牆、天花板、桁架改用 Poly Haven 實拍木料（models/home/wood_floor_deck／wood_plank_wall／roof_planks／dark_wood 的 _diff／_nor／_rough.jpg；地板、屋頂、桁架原圖偏橘紅，已用 PIL 降彩度壓暗）——截圖確認
  · 水族箱底櫃換真實櫃子：試過 modern_wooden_cabinet（2.44×0.68×0.68，要拉伸深度 1.7 倍），載入後沒有套用上去（場景裡找不到它的網格，也沒有錯誤訊息，原因未查），已還原，沒上線。dining_table 是鋪格子桌布的桌子，不適合
  · Smithsonian 開放 3D 的搜尋查不到釣具；Poly Haven 沒有釣竿、捲線器、浮標、遊艇、門
  · 需要使用者：Sketchfab API token（設定 → Password & API）或直接上傳 glb：釣竿＋捲線器、浮標、遊艇、木門、水族箱底櫃
- 2026-11-12 FPS 三項上線（main）：
  · lod.js 緩衝帶錯誤：一開始就落在「切換距離～再遠 15%」的物件永遠停在原檔。修正後浮萍灣實測（同一批物件）683,510 → 518,542 三角形；20～23 公尺的樹樁 62k→22k、枯木 83k→10k、岩石 16.5k→5.8k。近處（距離減掉外接球半徑後 <7m）仍是原檔
  · godrays.js 鏡頭靜止時每三幀重算：凍結時間、同一個 evaluate 裡連續 W.render() 比對，完整→沿用差 0.005/255、沿用→完整 0.000，有無光束差 0.648 → 畫面一致
  · d.js 開始畫面載入期間背景每三幀畫一次（introEl／__introTick）：沒有錯誤，實機觀感未確認
  量測方法：/tmp/lodq4.py（等枯木樹樁載入後列出每個物件用哪一版）、/tmp/fpsv.py；比較畫面要在同一個 evaluate 裡連續 render，否則水面動畫會蓋過差異
- 還沒做：小屋水族箱底櫃與門換真實模型（尚未評估有沒有不變形的合適模型）；月光灣、近海、冰湖的每幀負載還沒量；TAA 與光束在實機佔多少 FPS 要等使用者回報
- 2026-11-12 實物掃描道具上線（marine.js 共用 realProp／seatProp）：
  · 碼頭 c.js dockProps：水桶、魚箱＋漁夫帽、工具箱、平放救生圈、橡木桶（板面 y=.88；已截圖確認水桶、魚箱、救生圈貼在板面上）
  · 冰湖 t.js camp：折疊木凳、保溫瓶、木桶、鐵桶爐（跟著冰洞位置與朝向；已截圖確認木桶、木凳在冰面上）
  · 遊艇 marine.js addMarineProps（往下打到甲板表面）：駕駛台望遠鏡＋探照燈、前甲板救生圈、釣位旁魚箱／工具箱／水桶、後甲板救生衣＋救生圈。8 件都有載入；只看到駕駛台桌上那一件，其餘位置還沒親眼確認（船頭 −z、船尾 +z；駕駛座 z≈10、釣位 z≈15 x≈2.1）
  · 標本館入口：青銅鯨魚像、橡木桶上的青銅鯊魚像（未截圖確認）；名牌座酒桶與吊燈已截圖確認
  測試截圖要直接抓 3D 畫布（W.render() 後 toDataURL），用 page.screenshot 會被新手教學蓋住
- 還沒做：小屋水族箱底櫃與門換真實模型；FPS 分支 wip-fps（光束每三幀重算、開始畫面降頻）驗證後合併；倒木／樹樁遠近簡化沒生效的原因；釣竿、捲線器、浮標、遊艇船身需要使用者提供模型
- 2026-11-12 真實模型替換（使用者要求：能用真實模型的都換掉）
  盤點（執行期掃描：幾何是 Box/Cylinder/Sphere… 這類基本形狀的物件）：
  · 戶外每張地圖都有：釣竿＋捲線器（78 個基本形狀，第一人稱永遠在畫面上）、浮標（8）、蜻蜓（3 隻 ×6）
  · 遊艇：甲板五金（34）；yacht.glb 本身是低面數造型模型
  · 小屋：水族箱與木製底櫃（52）、牆上釣竿架（26）、門（7）、另一組 2.5×0.5×0.5（7，未辨識）
  · 標本館：名牌座（方塊）、投射燈（圓筒）→ 已換成 Poly Haven 實物掃描 wine_barrel_01、hanging_industrial_lamp（models/home/，glTF-Transform 4.5.1：resize 512 → draco）
  Poly Haven（CC0，521 個模型）沒有的：釣竿、捲線器、浮標、遊艇、冰鑽——要請使用者從 Sketchfab 下載 CC-BY 模型上傳，或另找來源
  Poly Haven 有、可拿來當真實道具的：lifebuoy、life_jacket、ocean_buoy、lateral_sea_marker、portable_searchlight、metal_toolbox、plastic_crate_01、wooden_bucket_01、wooden_barrels_01、modular_wooden_pier、fishermans_hat、fish_knife、binoculars、seadogs_compass、vintage_radio_transceiver、modified_thermos、folding_wooden_stool、barrel_stove、bronze_shark_statue、bronze_whale_statue、lambis_shell（lifebuoy、portable_searchlight 原檔已下載到 /tmp/ph，容器重置要重抓）
  轉檔指令：npx @gltf-transform/cli@4.5.1 resize in.gltf r.glb --width 512 --height 512 && npx @gltf-transform/cli@4.5.1 draco r.glb out.glb
- 2026-11-11 卡在開始畫面：jsDelivr 對超過 50 MB 的倉庫回 403，CDN 路徑已全部停用（a.html __CDN.on=false、build.sh 載入器只走本站：重試三次→script 標籤→顯示重新載入按鈕）。推送流程不必再做「Pin game scripts」那一步
- 雲端存檔第二版（y.js，2026-11-11）：存檔壓成字串欄位 m2s（gzip+base64；測試帳號 t2s），備份 m2p、每日 m2d0..6；讀取新舊欄位取高分；上傳有 20 秒逾時、失敗顯示原因並重試、每次開遊戲第一次上傳後讀回核對；登入讀不到雲端就重試且不上傳；dirty 改節流（6 秒內必送）；開始畫面 #cloudLine 與設定頁顯示同步狀態、設定新增「立即同步」；舊格式欄位在新格式核對成功後清掉。
  驗證工具：/tmp/cloud_e2e.py（假 Firebase＋會檢查 1MiB／40000 索引上限的假伺服器；容器重置後要重寫，做法：route gstatic firebase-*-compat.js 回傳假的 firebase 物件，expose_function 當伺服器）
  注意：測試腳本裡不要用 pkill -f／pgrep -f 比對自己命令列裡出現的字串，會把自己的 shell 殺掉
- 雲端存檔第二版七個情境全部驗證通過（登入上傳、連續存檔、失敗顯示與補傳、清除瀏覽紀錄後救回、換新手機、登入讀不到雲端、舊格式轉換；皆無重複重新整理）
- 遊艇引擎聲 Snd.engine(on,spd,thr)（d.js，程序合成；駕駛座才發動，updateKayak 每幀更新）
- 待做：FPS（登入畫面與各地圖）——使用者 2026-11-11 要求，先量測再改
- 第一次進入卡頓：新增 window.__WARM（b.js）——所有 GLTF 模型載完立刻在 4×4 小畫布畫一次把幾何送上顯示卡、貼圖 initTexture；TextureLoader 載完（下一個 tick）initTexture；GLTFLoader/TextureLoader 在 d.js 全域包裝。已有：REALDONE 時全場 compile + initTexture、換地點 compile 暖身
- 根治套用存檔被蓋回：c.apply 先換掉記憶體存檔並鎖住 persist／push（__SAVE_LOCK）再重整；已測 restoreBackup 重整後維持 Lv63
- 雲端存檔保護（y.js push）：登入後讀回比對前不上傳（pulledUid）、本機等級低於雲端任一份就拒絕上傳（cloudLv）、每天第一次上傳把雲端舊份存成 daily<星期>_save（7 份）；救回存檔列出每日備份。Google 登入只用彈出視窗（不再 redirect）
- 直向／橫向：manifest 改 any、設定「畫面方向 自動／直向／橫向」（screen.orientation.lock，需全螢幕，切換時自動開全螢幕）；橫向版面沿用既有 landscape CSS，已量測不重疊
- 大眼鮪模型肚子朝上：m.js RFISH 新增 roll 選項翻正；全魚種背暗腹亮自動檢查，只有大眼鮪是反的
- FPS 第一步：小屋陰影改為有變化或每 2 秒才重算（原每秒 20～30 次）、最大邊 <0.6m 的小物不投影。下一步：離開地點釋放資源、預先編譯著色器
- 海報右上角霜汐拍立得（最近收到的月鱗畫像、膠帶斜貼、n/8）
- 舊存檔主線補記已上線（v.js，st.backfill 只做一次；條件：有 grand 且打過滄淵或 Lv30+；安靜補記、獎勵補發；後日談不補）
- TAA 已上線 src/taa.js（高畫質、設定可關）：鏡頭靜止才抖動累積（Halton 2,3、YCoCg 鄰域裁切、混合 0.12），鏡頭一動立即只用當下幀
- 標本館 src/hall.js：獨立場景、◀▶ 切換＋搖桿走動、真實大小吊掛（吊繩打到魚身）、標本皮膚用顏色貼圖算法線＋亮光漆材質、家具擺設（沙發、書櫃、吊燈、壁燈、盆栽、寶箱）、鋼琴背景音樂、每隻標本上方投射燈、整體加亮、油燈移到沙發旁邊桌、牆上畫框（月鱗畫像）、固定曝光（不受外面夜晚影響）、可用家具上方提示牌、小屋 1m 以上標本全移到標本館、家具可用（沙發與腳凳坐下、書櫃翻手記、寶箱、油燈與吊燈開關燈，共用小屋家具效果）
- 標本依真實長度：≤1m 前牆木板（依長度排兩排）、>1m 天花板吊掛（五條吊掛線，最低點 ≥1.65m、鰭展不穿牆）；放不下的巨物寫在牆上紙條。下一步：蓋「標本館」（高天花板大廳）掛大白鯊、旗魚這類巨物
- 戰績海報 v2：主角魚改選與所在水域一致的最大漁獲、下緣沒入水面、依場景亮度調暗。主角魚放進真實 3D 場景拍已完成（根因：直式截圖從上方 30% 裁，只裁到天空；鏡頭改為暫時拆下來直接 lookAt）
- 稱號加成（o.js TITLE_FX，顯示中的稱號生效，1～5 星）：金幣、經驗、張力、收線、魚體力、Boss
- 小屋漂浮：settleOn 從上往下打到家具真正的表面；盆栽改放櫃旁地上
- 14 隻 Boss 起魚展示全部自檢：起魚時視角自動抬到魚整條在水面上；拉近改為每幀從原位置重算
- Boss 展示飛到天上／不見：liftAbove 量到 Boss 光暈 Sprite → 只量魚身網格；低於水面時沿視線把魚拉近（畫面位置不變），不夠才少量上抬。已用大白鯊 6.8m、旗魚 4.1m、滄淵 3.2m 在遊艇上驗證
- 天賦點數改成越高級越貴（1～3 級 1 點、4～6 級 2 點、7～8 級 3 點，全滿 77 點）；舊存檔超過自動免費退回
- 獎勵畫面排隊 __whenFree（漁獲簿、月鱗畫像共用；漁獲卡／結局／過場／面板都關了才播）
- 大型魚展示位置已量：在名稱標籤與漁獲卡之間
- 新開放還沒點的進階天賦顯示「新」
- 月鱗畫像 8 張已放入（media/mergift/mg01～08.jpg）
- Boss／大型魚展示時沉到水面下看不見：liftAbove 讓展示中的魚整條在水面以上（已修）
- 大型魚（Boss、鯊魚、旗魚）展示時掉到水面下看不見：liftAbove 讓展示中的魚整條在水面以上（已修）
- 水花改成細水絲（沿速度拉長的半透明水滴）＋水霧，已上線待實機
- 主畫面第三列（⭐ 天賦＋👑 大師挑戰）排在按鈕列正下方、算進 --hudY，下面提示自動往下（實機待確認）
- 挑戰成功《漁獲簿》翻頁動畫已上線（等漁獲卡收起才播）

## 待做（依序）
1.（進行中：已做小屋陰影有變化才重算、小物不投影、戶外靜止時陰影 0.5 秒一次、換地點與新模型載入後預先編譯著色器 window.__warm）全面 FPS 優化（不減特效，優化不必要計算）：診斷顯示資源累積（lake→sea→ice→home 幾何 113→431、程式 238）、長任務來自著色器編譯與貼圖上傳、小屋陰影圖每秒 30 次、potted_plant 卵石 32k 三角形投影。下一段先做：靜態場景陰影改成有變化才更新、離開地點釋放幾何貼圖、預先編譯著色器、裝飾物不投影
0.（已完成 god rays、TAA）畫面技術移植（參考 VictorZakharov/threejs-nanites，WebGPU 專案，只移植 WebGL 能做的）：
   a. 後處理骨架：主畫面改畫進半浮點 RT（含深度貼圖），最後一次合成到螢幕；只在高畫質開
   b. 螺旋式光束（god rays）：半解析度、從每個像素往太陽螢幕位置走 40 步，累加深度=遠平面的天空、越近太陽越亮、每步衰減 0.97；疊在色調映射前；小屋窗戶光束同法（以窗為光源）
   c. TAA：Halton(2,3) 抖動、用深度與上一幀相機重投影、YCoCg 3x3 鄰域裁切、感知空間混合；解決草、水面、細枝閃爍
   d. 霧色取天空在視線方向的顏色（我們已有實拍全景，做法相同）
   e. 遠處樹木 impostor、Nanite 叢集 LOD、軟體光柵化：依賴 WebGPU compute，不移植
4. 水花外觀實機調整

## 測試工具（不在儲存庫）
- /tmp/sim.js、/tmp/cal2.js、/tmp/verall.js：用 d.js 真正的 updateFight 模擬 Boss 對戰
- /tmp/mksite.sh：測試站（加 __EJUMP、__WAKE 掛鉤，正式版沒有）
