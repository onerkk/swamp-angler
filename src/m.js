/* ===== 真實 3D 模型（Sketchfab CC-BY，作者見設定頁） ===== */
const REAL_DIR='models/';
// 魚：[檔名, 模型裡頭朝哪個軸, 選項]
const RFISH={bluegill:['bluegill','+x'],crappie:['crappie','+z'],lmbass:['lmbass','+z'],smbass:['smbass','+z'],channel:['channel','+z'],flathead:['flathead','+z'],
  gar:['gar','+z'],barra:['barra','+x'],golden:['koi','-x',{gold:1}],ghost:['koi','-x',{ghost:1}],grouper:['grouper','-x'],tuna:['tuna','+z'],marlin:['marlin','-z'],
  ribbon:['ribbon','+z',{one:1}],seaking:['seaking','up',{king:1}],mermaid:['mermaid3d','up',{mer:1}],trout:['trout','+z'],pike:['pike','+z'],reba:['fish_reba','+z'],bowfin:['fish_bowfin','+z'],perch:['fish_mandarin','+z'],amber:['fish_amber','+z'],mahi:['fish_mahi','+z'],sail:['fish_sail','+z'],moonkoi:['koi','-x',{moon:1}],shark:['tigershark','+z'],gwhite:['gwhite','+z'],
  crucian:['fish_crucian','+z'],tilapia:['fish_tilapia','+z'],snakehead:['fish_snakehead','+z'],peacock:['fish_peacock','+z'],
  clarias:['fish_clarias','+z'],spgar:['fish_spgar','+z'],carp:['fish_carp','+z'],silvercarp:['fish_silvercarp','+z'],grasscarp:['fish_grasscarp','+z'],blackcarp:['fish_blackcarp','+z'],arapaima:['fish_arapaima','+z'],
  char:['fish_char','+z'],burbot:['fish_burbot','+z'],porgy:['fish_porgy','+z'],parrot:['fish_parrot','+z'],redbream:['fish_redbream','+z'],emperor:['fish_emperor','+z'],cobia:['fish_cobia','+z'],hardclam:['fish_hardclam','+z'],gomphina:['fish_gomphina','+z'],tellin:['fish_tellin','+z'],razor:['fish_razor','+z'],ghostcrab:['fish_ghostcrab','+z'],fiddler:['fish_fiddler','+z'],mudskip:['fish_mudskip','+z'],ragworm:['fish_ragworm','+z'],hermit:['fish_hermit','+z'],barracuda:['fish_barracuda','+z'],grouper2:['fish_grouper2','+z'],bigeye:['fish_bigeye','+z'],stingray:['fish_stingray','+z'],amberjack:['fish_amberjack','+z'],knifejaw:['fish_knifejaw','+z'],halibut:['fish_halibut','+z'],sunfish:['fish_sunfish','+z'],wrasse:['fish_wrasse','+z'],skipjack:['fish_skipjack','+z'],sawara:['fish_sawara','+z'],yellowfin:['fish_yellowfin','+z'],
  eel:['fish_eel','+z'],mekong:['fish_mekong','+z'],yperch:['fish_yperch','+z'],whitefish:['fish_whitefish','+z'],laketrout:['fish_laketrout','+z'],taimen:['fish_taimen','+z'],gt:['fish_gt','+z'],swordfish:['fish_swordfish','+z'],
  clownfish:['fish_clownfish','+z'],bluetang:['fish_bluetang','+z'],blenny:['fish_blenny','+z'],angelfish:['fish_angelfish','+z'],copperband:['fish_copperband','+z'],threadfin:['fish_threadfin','+z'],seabeast:['fish_seabeast','+z'],seahorse:['fish_seahorse','up',{upYaw:Math.PI/2}]};
const RHEAD={gwhite:'+z',tigershark:'+z',dolphin:'+z',whale:'+z',gator:'+x',eagle:'+z',gull:'-x',yacht:'-z',flyfish:'-x'};
const RSETS={lake:['mermaid3d','fish_bowfin','fish_reba','fish_mandarin','bluegill','crappie','lmbass','smbass','channel','flathead','gar','barra','koi','gator','eagle'],
  ice:['trout','pike','bluegill','crappie'],
  tide:['fish_hardclam','fish_gomphina','fish_tellin','fish_razor','fish_ghostcrab','fish_fiddler','fish_mudskip','fish_ragworm','fish_hermit'],
  sea:['mermaid3d','fish_amber','fish_barracuda','fish_grouper2','fish_bigeye','fish_stingray','fish_amberjack','fish_knifejaw','fish_halibut','fish_sunfish','fish_mahi','fish_sail','yacht','gwhite','dolphin','whale','gull','grouper','tuna','marlin','ribbon','tigershark','flyfish','seaking']};
const RCREDIT=[['大白鯊','Great White Shark','SealifeFan3'],['虎鯊','Tiger Shark','ra_in_coat'],['海豚','Bottlenose Dolphin','popcornbag'],['座頭鯨','Humpback Whale','ostapblendercg'],
  ['鱷魚','American Alligator','JeremyGrayson'],['白頭海鵰','Bald Eagle','ucdavisterc'],['海鷗','Seagull','Dayvable'],['遊艇',"Frickie's yacht",'dannzjs'],
  ['藍鰓太陽魚','Low-Poly Bluegill Fish','TepidGames'],['黑斑刺蓋太陽魚','Black Crappie','dgeraci'],['大口黑鱸','Largemouth bass','faerbogdan99'],['小口黑鱸','Smallmouth bass','faerbogdan99'],
  ['斑點叉尾鮰','Channel catfish','faerbogdan99'],['扁頭鯰','Flathead Catfish','faerbogdan99'],['鱷雀鱔','Alligator Gar','Jay_Tano'],['錦鯉','Koi Fish','7plus'],
  ['石斑','lowpoly freshwater grouper','Arrangemonk9'],['黑鮪魚','Bluefin Tuna','voltairevill'],['旗魚','Blue Marlin','Gotta_go_evi'],['飛魚','Exocoetidae','victorberdug'],
  ['金目鱸','Barramundi fish','ryan_saputra'],['白帶魚','hairtail fish','lingsound'],['第一人稱雙手','First Person arms','bumstrum'],['虹鱒','Rainbow Trout','ucdavisterc'],['白斑狗魚','Northern Pike','Nullifiedit'],['曲柄硬餌','Fishing lure Chubby 38','Zverev'],['亮片・米諾','Fishing Lures / Fishing Lures #2','xeofox'],['印度鯪・鱖魚・紅甘・鬼頭刀・雨傘旗魚・弓鰭魚・鯽魚・吳郭魚・線鱧・孔雀鱸・塘蝨・斑點雀鱔・鯉魚・鰱魚・草魚・青魚・巨骨舌魚・北極紅點鮭・江鱈・黑鯛・鸚哥魚・真鯛・青嘴龍占・海鱺・曲紋唇魚・正鰹・土魠・黃鰭鮪・鱸鰻・湄公河巨鯰・黃金鱸・白鮭・湖紅點鮭・哲羅鮭・浪人鰺・劍旗魚・公子小丑魚・擬刺尾鯛・鬚鳚・神仙魚・長吻蝴蝶魚・絲鰺・海馬・神話海馬獸・原木獨木舟','依玩家設定圖以 Hunyuan3D-2mv 生成（Apache 2.0）','Tencent'],['霜汐（美人魚）','依玩家設定圖以 Hunyuan3D-2mv 生成（Apache 2.0）','Tencent'],['滄淵','依玩家設定圖以 Hunyuan3D-2mv 生成（Apache 2.0）','Tencent']];

const GLOW=[];
const BAKED=new Set(['fish_clownfish','fish_bluetang','fish_blenny','fish_angelfish','fish_copperband','fish_threadfin','fish_seabeast','fish_seahorse','fish_eel','fish_mekong','fish_yperch','fish_whitefish','fish_laketrout','fish_taimen','fish_gt','fish_swordfish','fish_char','fish_burbot','fish_porgy','fish_parrot','fish_redbream','fish_emperor','fish_cobia','fish_wrasse','fish_skipjack','fish_sawara','fish_yellowfin','fish_clarias','fish_spgar','fish_carp','fish_silvercarp','fish_grasscarp','fish_blackcarp','fish_arapaima','fish_crucian','fish_tilapia','fish_snakehead','fish_peacock','fish_reba','fish_mandarin','fish_amber','fish_mahi','fish_sail','fish_bowfin','mermaid3d','seaking']);   // 依設定圖烘焙貼圖的模型
function createModels(W){
'use strict';
const T=THREE, loader=new T.GLTFLoader(), files={}, waiters={}, mixers=[];
const ang=a=>({'+x':0,'-z':Math.PI/2,'-x':Math.PI,'+z':-Math.PI/2})[a];
function load(f){ if(files[f]) return; const e=files[f]={g:null};
  const ok=g=>{ e.g=g; (waiters[f]||[]).forEach(fn=>{ try{ fn(g); }catch(err){ console.warn('real',f,err); } }); waiters[f]=[]; };
  loader.load(REAL_DIR+f+'.glb',ok,undefined,()=>{ e.err=1; }); }
const ready=f=>files[f]&&files[f].g;
function onReady(f,fn){ if(ready(f)) fn(files[f].g); else (waiters[f]=waiters[f]||[]).push(fn); }
function preload(set){ (RSETS[set]||[]).forEach(load); }

/* 擺尾著色器：跟程序化魚同一套，頭在 +X、身長 1 */
function bendify(m,uni,K){ K=K||1; m.onBeforeCompile=s=>{ s.uniforms.uSwim=uni.uSwim; s.uniforms.uAmp=uni.uAmp;
  s.vertexShader='uniform float uSwim;\nuniform float uAmp;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat bx_=clamp(0.5-position.x,0.0,1.6);\ntransformed.z+=sin(uSwim-position.x*5.5)*bx_*bx_*uAmp*'+K.toFixed(2)+';'); }; }
/* 魚的骨架：沿身體（頭在 +X、身長 1）建 6 節骨頭，頂點依前後位置平滑分配權重；
   每格依 uSwim、uAmp 算出身體波形，換成每節骨頭的轉角。一般魚左右擺尾，扁平的魚（魟、比目魚）上下波動 */
const FLAT=new Set(['halibut']), FRIGS=new Set();
// 特殊游法：魟（左右胸鰭像翅膀上下拍動）、翻車魚（上下兩片大鰭左右划水，身體幾乎不擺）
const SWIMK={stingray:'ray',sunfish:'mola',ghostcrab:'crab',fiddler:'crab',hermit:'crab',hardclam:'stiff',gomphina:'stiff',tellin:'stiff',razor:'stiff'};   // 螃蟹：兩側的腳一起划動；貝類：殼不彎
const BX=[.46,.28,.1,-.08,-.25,-.4];
function rigFish(grp,uni,K,mode){ const bones=BX.map(()=>new T.Bone()); bones[0].position.set(BX[0],0,0); for(let i=1;i<bones.length;i++){ bones[i].position.set(BX[i]-BX[i-1],0,0); bones[i-1].add(bones[i]); }
  grp.add(bones[0]); const all=[...bones], band=.06, extra={};
  // 量出身體範圍：魟看左右寬度，翻車魚看上下高度
  let wz=0, hy=0; grp.children.forEach(m=>{ if(!m.isMesh) return; const P=m.geometry.attributes.position; for(let i=0;i<P.count;i++){ wz=Math.max(wz,Math.abs(P.getZ(i))); hy=Math.max(hy,Math.abs(P.getY(i))); } });
  const addB=(parent,x,y,z)=>{ const b=new T.Bone(); b.position.set(x,y,z); parent.add(b); all.push(b); return all.length-1; };
  if(mode==='ray'||mode==='crab'){ const r0=wz*(mode==='crab'?.42:.28), r1=wz*.62; extra.L=[addB(bones[2],0,0,r0)]; extra.L.push(addB(all[extra.L[0]],0,0,r1-r0)); extra.R=[addB(bones[2],0,0,-r0)]; extra.R.push(addB(all[extra.R[0]],0,0,-(r1-r0))); extra.r0=r0; extra.r1=r1; }
  if(mode==='mola'){ const y0=hy*.42; extra.D=addB(bones[2],0,y0,0); extra.A=addB(bones[2],0,-y0,0); extra.y0=y0; }
  if(mode==='stiff'){ extra.H=addB(bones[0],0,0,0); }   // 貝殼：上殼掛在殼頂的鉸鏈上，可以開合
  const skel=new T.Skeleton(all);
  grp.children.filter(o=>o.isMesh&&!o.isSkinnedMesh).forEach(m=>{ const g=m.geometry, P=g.attributes.position, n=P.count, si=new Uint16Array(n*4), sw=new Float32Array(n*4);
    for(let i=0;i<n;i++){ const x=P.getX(i), y=P.getY(i), z=P.getZ(i); let k=0; while(k<BX.length-1&&x<BX[k+1]) k++; let w=1, j=k; if(k>0&&x>BX[k]-band&&x<=BX[k]){ j=k-1; w=.5+.5*(BX[k]-x)/band; }
      let f=0, fb=0;
      if(mode==='ray'||mode==='crab'){ const az=Math.abs(z), side=z>0?extra.L:extra.R; if(az>extra.r0){ f=Math.min(1,(az-extra.r0)/(wz*.12)); fb=az>extra.r1?side[1]:side[0]; } }
      if(mode==='mola'){ const ay=Math.abs(y); if(ay>extra.y0){ f=Math.min(1,(ay-extra.y0)/(hy*.1)); fb=y>0?extra.D:extra.A; } }
      if(mode==='stiff'&&y>hy*.04){ f=Math.min(1,(y-hy*.04)/(hy*.08)); fb=extra.H; }
      si[i*4]=k; si[i*4+1]=j; si[i*4+2]=fb; sw[i*4]=w*(1-f); sw[i*4+1]=(1-w)*(1-f); sw[i*4+2]=f; }
    g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4)); g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
    const mats=(Array.isArray(m.material)?m.material:[m.material]); mats.forEach(mm=>{ mm.onBeforeCompile=()=>{}; mm.skinning=true; mm.needsUpdate=true; });
    const sm=new T.SkinnedMesh(g,m.material); sm.frustumCulled=false; grp.remove(m); grp.add(sm); grp.updateMatrixWorld(true); sm.bind(skel,new T.Matrix4()); });
  const r={grp,uni,K:mode==='mola'?K*.25:mode==='ray'?K*.35:mode==='crab'?K*.06:mode==='stiff'?K*.02:K,flat:mode==='flat'||mode==='ray',mode,bones,all,extra,idle:0}; FRIGS.add(r); return r; }
function poseFish(r,dt){ if(!r.grp.parent){ r.idle+=dt; if(r.idle>12) FRIGS.delete(r); return; } r.idle=0;
  const u=r.uni.uSwim.value, A=r.uni.uAmp.value*r.K, off=x=>{ const bx=Math.max(0,Math.min(1.6,.5-x)); return Math.sin(u-x*5.5)*bx*bx*A; };
  let prev=0; for(let i=0;i<r.bones.length;i++){ const x0=BX[i], x1=i<BX.length-1?BX[i+1]:BX[i]-.12, sl=Math.atan2(off(x1)-off(x0),x0-x1), a=sl-prev; prev=sl;
    if(r.flat) r.bones[i].rotation.set(0,0,a); else r.bones[i].rotation.set(0,-a,0); }
  const amp=Math.min(1,.25+r.uni.uAmp.value*6), ph=u*.55, e=r.extra;
  if(r.mode==='ray'||r.mode==='crab'){ const cr=r.mode==='crab', a0=Math.sin(cr?u*2.2:ph)*(cr?.22:.38)*amp, a1=Math.sin((cr?u*2.2:ph)-.9)*(cr?.28:.45)*amp;   // 外側比內側慢半拍，翅膀呈波浪
    if(r.mode==='crab'){ const w=u*2.2, sw=Math.min(1,r.uni.uAmp.value*6)*.32;   // 螃蟹走路：左右兩側交替抬腳、往前後划，不是像翅膀一起拍
      r.all[e.L[0]].rotation.set(Math.max(0,Math.sin(w))*.3*amp,Math.sin(w)*sw,0); r.all[e.L[1]].rotation.set(Math.max(0,Math.sin(w+1.6))*.25*amp,Math.sin(w+1.6)*sw,0);
      r.all[e.R[0]].rotation.set(-Math.max(0,Math.sin(w+Math.PI))*.3*amp,Math.sin(w+Math.PI)*sw,0); r.all[e.R[1]].rotation.set(-Math.max(0,Math.sin(w+Math.PI+1.6))*.25*amp,Math.sin(w+Math.PI+1.6)*sw,0); }
    else { r.all[e.L[0]].rotation.set(a0,0,0); r.all[e.L[1]].rotation.set(a1,0,0); r.all[e.R[0]].rotation.set(-a0,0,0); r.all[e.R[1]].rotation.set(-a1,0,0); } }
  if(r.mode==='stiff'&&e.H!=null){ const gape=Math.max(0,Math.sin(u*.35))*(.05+.25*Math.min(1,r.uni.uAmp.value*4)); r.all[e.H].rotation.set(0,0,gape); }   // 殼慢慢張開一條縫再合上，被挖出來掙扎時開合更大
  if(r.mode==='mola'){ const a=Math.sin(u*.8)*.55*amp; r.all[e.D].rotation.set(a,0,0); r.all[e.A].rotation.set(a,0,0); } }
// 有骨架的魚被複製時（水族箱、標本、烤魚、圖鑑…），複製成不帶骨架的普通網格：直接複製骨架網格會指向原本那副骨頭，畫不出來
function cloneSafe(grp){ grp.clone=function(){ const g=new T.Group(); this.traverse(ch=>{ if(!ch.isMesh) return; const mats=(Array.isArray(ch.material)?ch.material:[ch.material]).map(m=>{ const k=m.clone(); k.skinning=false; k.onBeforeCompile=()=>{}; k.needsUpdate=true; return k; });
    const m=new T.Mesh(ch.geometry,Array.isArray(ch.material)?mats:mats[0]); m.frustumCulled=false; g.add(m); }); g.position.copy(this.position); g.quaternion.copy(this.quaternion); g.scale.copy(this.scale); g.visible=this.visible; return g; }; }
const fishReady=id=>!!(RFISH[id]&&ready(RFISH[id][0]));
function fish(sp){ const c=RFISH[sp.id]; if(!c) return null; const g=ready(c[0]); if(!g) return null; const opt=c[2]||{};
  const sc=g.scene; sc.updateMatrixWorld(true); let ms=[]; sc.traverse(o=>{ if(o.isMesh) ms.push(o); });
  if(!ms.length) return null;
  ms.sort((a,b)=>b.geometry.attributes.position.count-a.geometry.attributes.position.count); if(opt.one) ms=[ms[0]];
  const R=c[1]==='up'?new T.Matrix4().makeRotationY(opt.upYaw||0):new T.Matrix4().makeRotationY(ang('+x')-ang(c[1])), box=new T.Box3(), parts=[];
  for(const m of ms){ const geo=m.geometry.clone(); geo.morphAttributes={};
    if(m.isSkinnedMesh&&m.skeleton&&geo.attributes.skinIndex){ sc.updateMatrixWorld(true); const pa=geo.attributes.position, v=new T.Vector3();
      for(let i=0;i<pa.count;i++){ m.boneTransform(i,v); v.applyMatrix4(m.matrixWorld); pa.setXYZ(i,v.x,v.y,v.z); }
      pa.needsUpdate=true; geo.computeVertexNormals(); }
    else geo.applyMatrix4(m.matrixWorld);
    ['skinIndex','skinWeight'].forEach(k=>{ if(geo.attributes[k]) geo.deleteAttribute(k); });
    if(!geo.attributes.normal) geo.computeVertexNormals(); geo.applyMatrix4(R); geo.computeBoundingBox(); box.union(geo.boundingBox); parts.push([geo,m.material]); }
  const sz=box.getSize(new T.Vector3()), ct=box.getCenter(new T.Vector3()), s=1/Math.max(c[1]==='up'?sz.y:sz.x,1e-6);
  const uni={uSwim:{value:0},uAmp:{value:0}}, grp=new T.Group();
  for(const [geo,mat] of parts){ geo.translate(-ct.x,-ct.y,-ct.z); geo.scale(s,s,s); geo.computeBoundingSphere();
    const conv=mm=>{ const n=new T.MeshStandardMaterial({color:mm.color?mm.color.clone():new T.Color(1,1,1),map:mm.map||null,normalMap:mm.normalMap||null,
        roughnessMap:mm.roughnessMap||null,metalnessMap:mm.metalnessMap||null,roughness:mm.roughness!==undefined?mm.roughness:.5,metalness:mm.metalness!==undefined?mm.metalness:0,
        transparent:!!mm.transparent,alphaTest:mm.alphaTest||0,opacity:mm.opacity!==undefined?mm.opacity:1,side:mm.side,envMapIntensity:1.25,vertexColors:!!geo.attributes.color});
      if(opt.moon){ n.color=new T.Color(0xc4d8f4); n.emissive=new T.Color(0x2a64a8); n.emissiveIntensity=.22; n.metalness=.55; n.roughness=.24; }   // 月神鯉：保留鯉魚本身的鱗片花紋，只帶銀藍色金屬光澤（不再整條洗成白色）
      if(opt.mer){ n.roughness=.42; n.metalness=.08; }
      if((opt.mer||opt.king)&&n.map){ n.emissive=new T.Color(0xdde6ff); n.emissiveMap=n.map; n.emissiveIntensity=.15; GLOW.push(n); }   // 夜裡用自己的顏色微微發光
      if(opt.king){ n.roughness=.42; n.metalness=.35; n.emissive=new T.Color(0x0a3a5a); n.emissiveIntensity=.35; }
      if(mm.normalScale) n.normalScale.copy(mm.normalScale);
      if(n.map&&BAKED.has(c[0])){ n.map.generateMipmaps=false; n.map.minFilter=T.LinearFilter; n.map.needsUpdate=true; }   // 烘焙貼圖（三角形成對打包）關閉多層級縮圖，避免方格之間滲色
      [n.map,n.normalMap,n.roughnessMap,n.metalnessMap].forEach(t=>{ if(t&&t.channel) t.channel=0; });
      if(opt.gold){ n.color=new T.Color(0xffc23a); n.emissive=new T.Color(0xffa010); n.emissiveIntensity=.18; n.metalness=.55; n.roughness=.25; }
      if(opt.ghost){ n.color=new T.Color(0xbfe6ff); n.transparent=true; n.opacity=.38; n.emissive=new T.Color(0x4ab8ff); n.emissiveIntensity=.55; n.depthWrite=false; n.side=T.DoubleSide; }   // 幽靈魚：真的半透明，看得到後面的水草
      bendify(n,uni,opt.king||opt.mer?.15:1); return n; };
    const mesh=new T.Mesh(geo,Array.isArray(mat)?mat.map(conv):conv(mat)); mesh.frustumCulled=false; grp.add(mesh); }
  try{ if(c[1]==='up'){ if(typeof autoRig==='function'){ grp.children.forEach(m=>{ if(m.isMesh) (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.onBeforeCompile=()=>{}; }); });
        const rg=autoRig(grp,'tail'); FRIGS.add({grp,uni,up:rg,idle:0}); } }
    else rigFish(grp,uni,opt.king||opt.mer?.15:1,SWIMK[sp.id]||(FLAT.has(sp.id)?'flat':'fish')); cloneSafe(grp); }catch(e){ console.warn('fish rig',sp.id,e); }
  return {group:grp,uni,sp,real:true}; }

function measure(root){ root.updateMatrixWorld(true); const b=new T.Box3(), v=new T.Vector3();
  root.traverse(m=>{ if(!m.isMesh||!m.visible) return; const pa=m.geometry.attributes.position, step=Math.max(1,Math.floor(pa.count/4000));
    for(let i=0;i<pa.count;i+=step){ if(m.isSkinnedMesh&&m.skeleton) m.boneTransform(i,v); else v.fromBufferAttribute(pa,i); v.applyMatrix4(m.matrixWorld); b.expandByPoint(v); } });
  return b; }
/* 動物：把真模型掛進原本的物件，沿用原本的位置與朝向，保留模型自帶的骨架動畫 */
function attach(host,key,o){ const h={host,loaded:false,actions:{},mixer:null,play(n){ const a=this.actions[n]; if(!a) return; for(const k in this.actions) if(k!==n) this.actions[k].fadeOut(.2); a.reset().fadeIn(.15).play(); }};
  onReady(key,g=>{ const obj=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone();
    const inner=new T.Group(); inner.add(obj); inner.rotation.y=ang(o.target||'+z')-ang(RHEAD[key]);
    const wrap=new T.Group(); wrap.add(inner); wrap.updateMatrixWorld(true);
    const b=measure(wrap), sz=b.getSize(new T.Vector3()), ax=(o.target||'+z')[1];
    const s=o.len/Math.max(ax==='x'?sz.x:sz.z,1e-6); inner.scale.setScalar(s); wrap.updateMatrixWorld(true);
    const b2=measure(wrap), c2=b2.getCenter(new T.Vector3());
    inner.position.set(-c2.x,o.top!==undefined?o.top-b2.max.y:-c2.y,-c2.z);
    if(o.pitch){ wrap.rotation.x=o.pitch; } if(o.off) wrap.position.set(...o.off);
    obj.traverse(m=>{ m.frustumCulled=false; if(m.isMesh&&m.material){ (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.envMapIntensity=1.1; }); } });
    if(host.isMesh){ host.material=new T.MeshBasicMaterial({visible:false}); }
    host.children.slice().forEach(c=>{ c.visible=false; });
    host.add(wrap); host.userData.real=true; h.wrap=wrap;
    if(g.animations&&g.animations.length&&o.anim!==false){ const mx=new T.AnimationMixer(obj); h.mixer=mx; mixers.push(mx);
      g.animations.forEach(cl=>{ h.actions[cl.name]=mx.clipAction(cl); });
      const first=(o.clip&&Object.keys(h.actions).find(k=>k.indexOf(o.clip)>=0))||Object.keys(h.actions)[0];
      const a=h.actions[first]; a.play(); a.time=Math.random()*cl0(a); if(o.speed) a.timeScale=o.speed; }
    h.loaded=true; if(o.onLoad) o.onLoad(h,b2); });
  return h; }
const cl0=a=>a.getClip().duration||1;

/* 遊艇：船頭在前方 4.5m，鏡頭站在前甲板，甲板高度用射線量出來 */
function attachYacht(host,setHull,spots){ onReady('yacht',g=>{ const obj=g.scene.clone(), wrap=new T.Group(); wrap.add(obj);
  const L=26; let b=new T.Box3().setFromObject(wrap), sz=b.getSize(new T.Vector3()); obj.scale.setScalar(L/sz.z); wrap.updateMatrixWorld(true);
  b=new T.Box3().setFromObject(wrap); const c=b.getCenter(new T.Vector3()), H=b.max.y-b.min.y;
  obj.position.x-=c.x; obj.position.z+=-4.5-b.min.z; obj.position.y+=-(b.min.y+H*.1); wrap.updateMatrixWorld(true);
  const rc=new T.Raycaster(new T.Vector3(0,100,0),new T.Vector3(0,-1,0)); const hit=rc.intersectObject(wrap,true)[0];
  const deck=hit?hit.point.y:1.6;
  obj.traverse(m=>{ m.frustumCulled=false; if(m.isMesh) m.castShadow=false; });
  // 船的材質升級：原模型貼圖只有 128～256 像素。依材質實際顏色分類：木甲板換成實拍柚木板（含法線、粗糙度）、白色船身換成亮面玻璃纖維漆（清漆反光）、金屬換成拋光不鏽鋼
  try{ const TL=new T.TextureLoader(), tx=(f,r,srgb)=>{ const t=TL.load(f); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(r,r); if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; };
    const teak=new T.MeshStandardMaterial({map:tx('dock_diff.jpg',3,true),normalMap:tx('dock_nor.jpg',3),roughnessMap:tx('dock_rough.jpg',3),color:0xc9a27a,roughness:.85});
    const gel=new T.MeshPhysicalMaterial({color:0xf2f4f5,roughness:.22,metalness:0,clearcoat:1,clearcoatRoughness:.06});
    const steel=new T.MeshStandardMaterial({color:0xd9dde1,metalness:1,roughness:.18});
    const navy=new T.MeshPhysicalMaterial({color:0x1b2a44,roughness:.25,metalness:0,clearcoat:1,clearcoatRoughness:.08});
    const vinylTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#e9e6df'; x.fillRect(0,0,64,64); for(let i=0;i<900;i++){ x.fillStyle=Math.random()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.07)'; x.fillRect(Math.random()*64,Math.random()*64,1,1); } const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(6,6); return t; })();
    const vinyl=new T.MeshStandardMaterial({color:0xffffff,map:vinylTex,bumpMap:vinylTex,bumpScale:.003,roughness:.62});
    const cvs=document.createElement('canvas'); cvs.width=cvs.height=8; const g2=cvs.getContext('2d');
    const avg=t=>{ try{ g2.clearRect(0,0,8,8); g2.drawImage(t.image,0,0,8,8); const d=g2.getImageData(0,0,8,8).data; let r=0,g=0,b=0; for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; } const n=d.length/4; return [r/n,g/n,b/n]; }catch(e){ return null; } };
    const memo=new Map();
    obj.traverse(m=>{ if(!m.isMesh||!m.material) return; const mm=m.material; if(memo.has(mm)){ m.material=memo.get(mm); return; } let out=mm;
      if(mm.metalness>.6&&!mm.map) out=(mm.color&&(mm.color.r+mm.color.g+mm.color.b)<.5)?navy:steel;   // 很暗的金屬色其實是深藍船身漆，不是不鏽鋼
      else if(mm.map&&mm.map.image){ const c=avg(mm.map); if(c){ const [r,g,b]=c, mx=Math.max(r,g,b), mn=Math.min(r,g,b);
          if(r>g&&g>b&&r-b>30&&mx<210) out=teak; else if(mn>175&&mx-mn<30) out=gel;
          else if(b>r+15&&mx<140) out=navy;   // 深藍船身：換成深藍亮面漆（清漆反光）
          else if(mx-mn<22&&mx>95&&mx<=175) out=vinyl; } }   // 灰白座墊、帆布：換成船用防水皮革（細紋、半霧面）
      memo.set(mm,out); m.material=out; if(window.__YDBG) console.log('YM',mm.name,out===teak?'teak':out===gel?'gel':out===navy?'navy':out===vinyl?'vinyl':out===steel?'steel':'keep',mm.map&&mm.map.image?avg(mm.map).map(v=>v|0).join(','):'-',(mm.color&&mm.color.getHexString())); }); }catch(e){ console.warn('yacht mats',e); }
  host.children.slice().forEach(ch=>{ ch.visible=false; }); host.add(wrap);
  const b3=new T.Box3().setFromObject(wrap); setHull(Math.max(Math.abs(b3.min.x),b3.max.x),b3.min.z,b3.max.z);
  spots.forEach(s=>{ if(s.yacht) s.eye=deck+1.62; }); }); }

function update(dt){ for(const m of mixers) m.update(dt);
  for(const r of FRIGS){ if(r.up){ if(!r.grp.parent){ r.idle+=dt; if(r.idle>12) FRIGS.delete(r); continue; } r.idle=0; r.up.pose({t:r.uni.uSwim.value*.35,tail:.06+r.uni.uAmp.value*1.2,tailF:2.2}); } else poseFish(r,dt); } }
function credits(){ return RCREDIT.map(r=>`${r[0]}：「${r[1]}」by ${r[2]}`).join('<br>'); }
const want=id=>{ if(RFISH[id]) load(RFISH[id][0]); };   // 圖鑑詳細頁要看哪種魚，就只下載那一種
function glowTick(){ const lt=W.info?W.info.light:1, k=Math.max(0,.6-lt); GLOW.forEach(n=>n.emissiveIntensity=.12+k*1.0); }
return {glowTick,preload,want,fish,fishReady,attach,attachYacht,update,credits};
}
