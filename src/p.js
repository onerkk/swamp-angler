/* ===== 月光灣：汐月的故事 ===== */
const MOON_STORY=[
 {t:'序章・月下的人魚',b:'「你終於來了。我叫汐月，是守護月潮的人魚。很久以前，這片濕地還是連著大海的河口……可是現在，我的七片月鱗散落在湖裡，沒有它們，我回不了海。」<br><br>「月鱗會吸引在月光下覓食的魚。請你在月夜的月光灣釣魚，幫我把它們找回來。」'},
 {t:'第一片・潮汐的記憶',b:'「每逢滿月，潮水會從海上漲進河口，我就順著月光回家。那時候的水是鹹的，夜裡會發光……就像你現在看到的這樣，只是比現在亮上一百倍。」'},
 {t:'第二片・提燈的漁人',b:'「有個老漁人，每晚都在碼頭掛一盞燈給我。我們從沒說過話，但我知道那盞燈是為我點的。你常站的那座碼頭，就是他當年一塊一塊釘起來的。」'},
 {t:'第三片・堤防',b:'「後來人們築起了堤防。潮水再也進不來，河口慢慢淤成沼澤。最後一次滿月那晚，水面的月光被堤防切斷，我就被困在這裡了。」'},
 {t:'第四片・月鱗的由來',b:'「每一片月鱗，都收著一小段月光。被困住的那一夜我哭了很久，眼淚落下的地方，鱗片也跟著剝落、沉進湖底。」'},
 {t:'第五片・幽靈魚',b:'「你釣過那種會發光的幽靈魚吧？牠們是我的眼淚變成的。牠們一直在湖裡游，替我記得回家的路。」'},
 {t:'第六片・月神鯉',b:'「最後一片月鱗被月神鯉吞下了。牠是月光灣的守護者，不肯把鱗片交給任何人，因為牠怕我一離開，這裡就再也沒有月光。」<br><br>「請你在月夜釣起月神鯉。牠很強，比你見過的任何魚都強。」'},
 {t:'終章・月光之路',b:'「七片月鱗都回來了……你看，水面上的月光連成一條路了。」<br><br>「謝謝你。從今以後，我可以順著月光往返大海與這片濕地。如果你在海上看見我，別驚訝。」<br><br>「這支月神之竿送給你。月神鯉會繼續守護這裡，月夜時牠還會出現——下次，別讓牠失望。」'}];

function createMoonBay(W,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, SV=c.save; SV.moon=SV.moon||{met:false,sc:0,read:-1,done:false}; const MS=SV.moon;
const ss=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
/* 月亮：NASA 月球影像（公有領域），位置依時間與月相即時計算 */
const MD=new T.Vector3(-Math.sin(.35)*Math.cos(.22),Math.sin(.22),-Math.cos(.35)*Math.cos(.22)).normalize();
const moonTex=new T.TextureLoader().load('moon.jpg'); moonTex.encoding=T.sRGBEncoding;
const moon=new T.Mesh(new T.SphereGeometry(1,32,24),new T.MeshBasicMaterial({map:moonTex,color:new T.Color(1.7,1.7,1.75),fog:false,transparent:false,depthWrite:false,toneMapped:false}));
moon.rotation.y=-1.2; moon.renderOrder=-2; moon.frustumCulled=false; S.add(moon);
/* 月相：依真實日期算月齡（朔望月 29.53 天），以陽光方向即時照亮球體 */
const SYN=29.530588853, NEW0=Date.UTC(2000,0,6,18,14);
// 結局演出時可以暫時指定月相（滿月），演完恢復真實月相
let phaseFix=null;
const phase=()=>phaseFix!=null?phaseFix:((((Date.now()-NEW0)/864e5)/SYN)%1+1)%1, illum=()=>(1-Math.cos(2*Math.PI*phase()))/2;
const PH_EMO=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'], phEmo=()=>PH_EMO[Math.round(phase()*8)%8];
window.__MOONPH={phase,illum,emo:phEmo,fix:v=>{ phaseFix=v; },dir:(h,out)=>moonDir(h,out)};
const uL={value:new T.Vector3(0,0,1)};
moon.material.onBeforeCompile=sh=>{ sh.uniforms.uL=uL;
  sh.vertexShader='varying vec3 vNw;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNw=normalize(mat3(modelMatrix)*normal);');
  sh.fragmentShader='uniform vec3 uL;\nvarying vec3 vNw;\n'+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n  float lit_=smoothstep(-0.06,0.12,dot(normalize(vNw),uL));\n  diffuseColor.rgb*=mix(0.035,1.0,lit_);'); };
const toV=new T.Vector3(), rgt=new T.Vector3(), upY=new T.Vector3(0,1,0);
/* 月亮真實軌跡：月亮比太陽晚升（月相×24 小時），依台灣緯度 23.7° 算時角→高度角、方位角。
   世界座標與星空相同：往 −Z 是南、+Z 是北、−X 是東。 */
const LAT=23.7*Math.PI/180, DEC=8*Math.PI/180;
function moonDir(hour,out){ const H=((hour-12-phase()*24)/24)*2*Math.PI;            // 時角：0＝正南上中天
  const sa=Math.sin(LAT)*Math.sin(DEC)+Math.cos(LAT)*Math.cos(DEC)*Math.cos(H), alt=Math.asin(sa);
  const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(LAT)-Math.tan(DEC)*Math.cos(LAT));   // 由南起算、往西為正
  const ch=Math.cos(alt); return out.set(-Math.sin(az)*ch*-1,Math.sin(alt),-Math.cos(az)*ch); }
const hc=document.createElement('canvas'); hc.width=hc.height=128; { const x=hc.getContext('2d'), g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(200,220,255,.55)'); g.addColorStop(.35,'rgba(150,180,255,.18)'); g.addColorStop(1,'rgba(120,150,255,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); }
const halo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(hc),blending:T.AdditiveBlending,depthWrite:false,fog:false,transparent:true}));
halo.renderOrder=-2; S.add(halo);
/* 汐月：坐在岩石上的美人魚（岩石用 Poly Haven 掃描模型） */
const spot=(typeof SPOTS!=='undefined'&&SPOTS.find(s=>s.id==='moon'))||{pos:[-10,-40],head:.35};
const fw=new T.Vector3(-Math.sin(spot.head),0,-Math.cos(spot.head)), rt=new T.Vector3(Math.cos(spot.head),0,-Math.sin(spot.head));
const NP=new T.Vector3(spot.pos[0],0,spot.pos[1]).addScaledVector(fw,11).addScaledVector(rt,3.5);
const npc=new T.Group(); npc.position.copy(NP); npc.visible=false; S.add(npc);
if(T.GLTFLoader) new T.GLTFLoader().load('rock_moss_set_01.glb',g=>{ const r=g.scene; r.scale.setScalar(1.3); r.position.y=-.35; npc.add(r); });
else { const r=new T.Mesh(new T.DodecahedronGeometry(.9,1),new T.MeshStandardMaterial({color:0x3a4238,roughness:.9})); r.scale.set(1.2,.6,1); npc.add(r); }
// 夜裡的汐月：用自己的貼圖發光（天越暗越亮），旁邊再放一盞月光，照出臉、頭髮和鱗片的立體感
const merMats=[], moonL=new T.PointLight(0xc8d8ff,0,10,1.3); moonL.position.set(1.2,2.6,1.6); npc.add(moonL);
const moonL2=new T.PointLight(0x8fb0ff,0,7,1.5); moonL2.position.set(-1.4,1.4,-1.0); npc.add(moonL2);
function merNight(){ const lt=W.info?W.info.light:1, k=Math.max(0,.65-lt); merMats.forEach(m=>m.emissiveIntensity=.12+k*1.9); moonL.intensity=k*4.5; moonL2.intensity=k*2.2; }
const merT=new T.TextureLoader().load('mermaid_front.png',t=>{ const a=t.image.width/t.image.height; mer.scale.set(1.9*a,1.9,1); }); merT.encoding=T.sRGBEncoding;
const mer=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:merT,transparent:true,alphaTest:.05,depthWrite:true,side:T.DoubleSide,fog:false}));
mer.position.y=1.25; npc.add(mer);
/* 3D 汐月：載入後取代平面圖（依玩家設定圖生成的模型） */
let mer3=null;
if(T.GLTFLoader) new T.GLTFLoader().load('models/mermaid3d.glb',g=>{ const o=g.scene; o.traverse(x=>{ if(x.isMesh){ const mp=x.material.map; if(mp){ mp.generateMipmaps=false; mp.minFilter=T.LinearFilter; } x.material=new T.MeshStandardMaterial({map:mp||null,vertexColors:!mp&&!!x.geometry.attributes.color,roughness:.42,metalness:.08,emissive:new T.Color(0xe4ecff),emissiveMap:mp||null,emissiveIntensity:.15}); merMats.push(x.material); x.frustumCulled=false; } });
  o.updateMatrixWorld(true); const b=new T.Box3().setFromObject(o), sz=b.getSize(new T.Vector3()), s=1.9/Math.max(sz.y,1e-6); o.scale.setScalar(s);
  o.updateMatrixWorld(true); const b2=new T.Box3().setFromObject(o), c2=b2.getCenter(new T.Vector3()); o.position.set(-c2.x,.15-b2.min.y,-c2.z);
  mer3=new T.Group(); mer3.add(o); npc.add(mer3); mer.visible=false; mer3.updateMatrixWorld(true); try{ merRig=autoRig(o,'tail'); }catch(e){ console.warn('mer rig',e); } });
let merRig=null;
const glow=new T.Sprite(new T.SpriteMaterial({map:halo.material.map,color:0x66ccff,blending:T.AdditiveBlending,depthWrite:false,transparent:true})); glow.scale.set(4,4,1); glow.position.y=1.2; npc.add(glow);
/* 對話介面 */
const st=document.createElement('style'); st.textContent=`
#moonTalk{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 36px);z-index:6;width:62px;height:62px;padding:0;border-radius:50%;border:1px solid rgba(160,210,255,.6);background:radial-gradient(circle at 40% 35%,rgba(90,130,210,.95),rgba(50,40,120,.95));color:#eaf4ff;font-weight:800;font-size:11px;line-height:1.1;box-shadow:0 0 16px rgba(110,180,255,.55);font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;white-space:nowrap}
#moonTalk.hidden,#moonBox.hidden{display:none}#moonTalk.dot::after{content:'';position:absolute;top:4px;right:6px;width:10px;height:10px;border-radius:50%;background:#ffd56a}#moonTalk .ic{font-size:24px}
#moonBox{position:fixed;inset:0;z-index:9;background:rgba(4,10,24,.72);display:flex;align-items:flex-end;justify-content:center}
#moonBox .mb{width:min(560px,100%);max-height:84vh;overflow:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:linear-gradient(180deg,rgba(18,30,58,.98),rgba(12,18,34,.98));border-radius:22px 22px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));color:#e6f0ff;border-top:1px solid rgba(150,200,255,.35)}
#moonBox h3{margin:0 0 6px;font-size:19px;display:flex;justify-content:space-between;align-items:center;color:#cfe6ff}
#moonBox .ch{margin:14px 0;padding:12px 14px;border-radius:14px;background:rgba(120,170,255,.08);line-height:1.75;font-size:15px}
#moonBox .ch b{display:block;color:#ffd56a;margin-bottom:4px;font-size:14px}#moonBox .ch.lock{opacity:.55;padding:10px 14px}#moonBox .ch.lock b{color:#9fb8d8}#moonBox .ch small{color:#9fb8d8;font-size:12px}#moonBox .ch.tip{background:rgba(255,213,106,.1);border:1px solid rgba(255,213,106,.35)}#moonBox .ch.tip b{color:#ffd56a}#moonBox .ch em{font-style:normal;font-weight:800;color:#ffe9a8}#moonBox .pg{font-size:13px;color:#9fb8d8}`;
document.head.appendChild(st);
const tb=document.createElement('button'); tb.id='moonTalk'; tb.className='hidden'; tb.innerHTML='<span class="ic">🧜‍♀️</span>汐月'; tb.setAttribute('aria-label','與汐月說話'); document.body.appendChild(tb);
const box=document.createElement('div'); box.id='moonBox'; box.className='hidden'; box.innerHTML='<div class="mb"></div>'; document.body.appendChild(box);
const unlocked=()=>MS.done?7:MS.met?Math.min(6,MS.sc):0;
function render(){ const n=unlocked(), sc=Math.min(7,MS.sc);
  const pips='🌙'.repeat(sc)+'○'.repeat(7-sc);
  let h=`<h3>汐月<button class="sbtn" data-m="x">✕</button></h3><div class="pg">月鱗 ${sc}/7　${pips}</div>`;
  if(!MS.done){ const next=MS.sc>=6?'最後一片在<em>月神鯉</em>的肚子裡。在月光灣的深夜釣起牠。':'在<em>月光灣</em>的<em>深夜（約 19:48～04:48）</em>釣魚，每釣到一條魚有 45% 機率從魚肚裡找到一片月鱗。';
    h+=`<div class="ch tip"><b>🧭 怎麼找月鱗</b>${next}<br><small>找到後回來找汐月，就會解鎖下一段故事。</small></div>`; }
  for(let i=n;i>=0;i--) h+=`<div class="ch"><b>${MOON_STORY[i].t}</b>${MOON_STORY[i].b}</div>`;
  for(let i=n+1;i<MOON_STORY.length;i++){ const name=i===7?'終章・？？？':MOON_STORY[i].t, cond=i===7?'集齊 7 片月鱗後解鎖':i===6?`找到第 6 片月鱗後解鎖`:`找到第 ${i} 片月鱗後解鎖`;
    h+=`<div class="ch lock"><b>🔒 ${name}</b><small>${cond}</small></div>`; }
  box.firstChild.innerHTML=h; }
tb.addEventListener('click',()=>{ if(!MS.met){ MS.met=true; c.toast('🌙 任務：在月夜的月光灣釣魚，找回 7 片月鱗','good',3200); }
  MS.read=unlocked(); c.persist(); render(); box.classList.remove('hidden'); tb.classList.remove('dot'); });
box.addEventListener('click',e=>{ if(e.target===box||e.target.closest('[data-m=x]')) box.classList.add('hidden'); });

let act=0;
const active=()=>c.zoneId()==='moon'&&c.period()==='night'&&(G.loc||'lake')!=='sea';
function koiK(){ if(!active()) return 0; return MS.done?1.5:MS.sc>=6?40:0; }
function onCatch(fd){ if(!fd||fd.item||!active()||!MS.met) return;
  if(MS.sc<6&&fd.sp.id!=='moonkoi'&&Math.random()<.25+.3*illum()){ MS.sc++; c.persist(); tb.classList.add('dot'); setTimeout(()=>scaleFx(MS.sc),1200); }
  else if(fd.sp.id==='moonkoi'&&!MS.done&&MS.sc>=6){ MS.sc=7; MS.done=true; c.persist(); c.giveRod(); tb.classList.add('dot');
    setTimeout(()=>{ scaleFx(7); c.toast('🌙 第七片月鱗！月光連成了一條路……去找汐月吧','good',4000); },1200); } }
/* 找到月鱗：發光的鱗片在畫面中央浮現、旋轉放大，再飛向汐月按鈕 */
const fx=document.createElement('div'); fx.id='scaleFx'; fx.innerHTML='<i></i><b></b>'; document.body.appendChild(fx);
const st2=document.createElement('style'); st2.textContent=`#scaleFx{position:fixed;left:50%;top:42%;z-index:26;pointer-events:none;display:none;transform:translate(-50%,-50%)}
#scaleFx i{display:block;width:84px;height:110px;margin:0 auto;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(ellipse at 40% 30%,#ffffff,#cfe6ff 35%,#7fb6ff 70%,rgba(80,140,255,0) 72%);box-shadow:0 0 30px 10px rgba(140,190,255,.8),0 0 70px 20px rgba(120,160,255,.4)}
#scaleFx b{display:block;margin-top:14px;text-align:center;color:#eaf4ff;font-size:22px;font-weight:900;text-shadow:0 0 12px rgba(120,170,255,.9);white-space:nowrap}
#scaleFx.go{display:block;animation:scF 2.6s ease-in-out forwards}#scaleFx.go i{animation:scS 2.6s ease-in-out forwards}
@keyframes scS{0%{transform:scale(.2) rotate(-30deg);opacity:0}20%{transform:scale(1.15) rotate(10deg);opacity:1}35%{transform:scale(1) rotate(0)}100%{transform:scale(.9) rotate(360deg)}}
@keyframes scF{0%,70%{left:50%;top:42%;opacity:1}100%{left:calc(100% - 46px);top:calc(100% - 70px);opacity:0;transform:translate(-50%,-50%) scale(.3)}}`;
document.head.appendChild(st2);
function scaleFx(n){ fx.querySelector('b').textContent=`🌙 月鱗 ${Math.min(7,n)}/7`; fx.classList.remove('go'); void fx.offsetWidth; fx.classList.add('go');
  if(c.Snd&&c.Snd.fanfare) c.Snd.fanfare(1); if(c.vib) c.vib([30,40,30,40,90]); setTimeout(()=>fx.classList.remove('go'),2700);
  if(n<7) setTimeout(()=>c.toast('找到新的月鱗！去聽汐月的故事','good',2600),2300); }
let endGlow=0;
const cam=new T.Vector3();
function update(dt){ W.camera.getWorldPosition(cam); merNight();
  const nk=W.U.uNight?W.U.uNight.value:0, cl=W.U.uCloud?W.U.uCloud.value:0, vis=nk*(1-.8*Math.min(1,cl));
  moonDir(c.hour?c.hour():22,MD); const above=MD.y>-.02;
  const th=2*Math.PI*phase(), il=illum(); toV.copy(MD).negate(); rgt.crossVectors(MD,upY).normalize();
  uL.value.copy(toV).multiplyScalar(-Math.cos(th)).addScaledVector(rgt,Math.sin(th)).normalize();
  W.U.uMoonDir.value.copy(MD); W.U.uMoonK.value=vis*Math.max(0,il)*(above?Math.min(1,MD.y*8+.2):0); if(W.U.uMoonCol) W.U.uMoonCol.value.set(0,0,0);   // 關掉天空著色器裡的程序化滿月，避免從暗面透出
  moon.visible=halo.visible=vis>.02&&il>.03&&above; if(moon.visible){ moon.position.copy(cam).addScaledVector(MD,780); moon.scale.setScalar(26); { const k=Math.min(1,vis*1.3); moon.material.color.setRGB(1.7*k,1.7*k,1.75*k); }
    halo.position.copy(cam).addScaledVector(MD,770); halo.scale.set(150,150,1); halo.material.opacity=vis*(.25+.75*il); }
  act+=((active()?1:0)-act)*Math.min(1,dt*.8);
  { const ended=c.save&&c.save.story&&c.save.story.ending, nightK=Math.max(0,Math.min(1,(.25-W.info.day)*5)), want=ended&&c.G&&c.G.loc==='lake'?.35*nightK:0;   // 月潮回來後：湖上夜晚永遠帶著淡淡的生物螢光
    endGlow+=(want-endGlow)*Math.min(1,dt*.5); W.U.uBio.value=Math.max(act,endGlow); }
  npc.visible=act>.05; if(npc.visible){ mer.material.opacity=act; mer.rotation.y=Math.atan2(cam.x-NP.x,cam.z-NP.z); if(mer3) mer3.rotation.y=mer.rotation.y; if(merRig) merRig.pose({t:performance.now()/1000,tail:.1,headPitch:.06+.04*Math.sin(performance.now()/2300),headYaw:.15*Math.sin(performance.now()/3100)}); glow.material.opacity=.5*act*(0.8+0.2*Math.sin(performance.now()*.002)); }
  const near=npc.visible&&Math.hypot(cam.x-NP.x,cam.z-NP.z)<35; tb.classList.toggle('hidden',!near||act<.5);
  if(near&&MS.read<unlocked()) tb.classList.add('dot'); }
return {update,onCatch,koiK,active,scaleFx};
}
