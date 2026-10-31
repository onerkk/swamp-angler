/* ===== 真實場景：360° 實拍環境、HDR 光照、掃描 3D 模型（素材：Poly Haven，CC0） ===== */
function createReal(W,P,cb){
'use strict';
const T=THREE, U=W.U;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// 三張同一腳架拍攝的湖景：dawn=破曉/黃昏、day=日出後白天、night=入夜
const SETS={
 lake:{pre:'env_',mask:'env_mask.png',meta:{dawn:{u:.3633,el:6.33,exp:.252,lc:[1.0,.72,.52],li:1.2,light:.7},day:{u:.3496,el:5.62,exp:1.0,lc:[1.0,.86,.7],li:2.4,light:1},night:{u:.6865,el:44.3,exp:.14,lc:[.55,.62,.85],li:.5,light:.3}}},
 ice:{pre:'ice_',mask:'ice_mask.png',meta:{dawn:{u:.6191,el:17.05,exp:.9,lc:[.9,.93,.97],li:1.4,light:.85},day:{u:.5996,el:28.3,exp:1.0,lc:[1.0,.96,.9],li:2.5,light:1},night:{u:.6191,el:17.05,exp:.9,lc:[.55,.62,.85],li:.5,light:.3}}},
 sea:{pre:'sea_',mask:'sea_mask.png',meta:{dawn:{u:.3623,el:4.92,exp:.305,lc:[1.0,.72,.5],li:1.3,light:.7},day:{u:.3447,el:48.16,exp:.568,lc:[1.0,.95,.88],li:2.6,light:1},night:{u:.3486,el:17.23,exp:1.343,lc:[.6,.68,.9],li:.45,light:.35}}}};
let SET='lake', META=SETS.lake.meta, started=false, envKey=null;
const YAW=.25; U.uYaw.value=YAW;
let total=0, errors=0;
const mgr=new T.LoadingManager();
mgr.onProgress=(u,l,t)=>{ window.__LASTURL=(u||'').split('/').pop(); window.__LOADN=l+'/'+t; total=t; if(cb) cb(l/t,false,errors); };
mgr.onError=(u)=>{ if(window.__CDN&&u&&u.indexOf(window.__CDN.base)===0) return;   /* CDN 失敗的檔案會自動改從本站重抓，不算失敗（原本只要有一個就整個退回簡化畫面） */
  errors++; if(cb) cb(0,false,errors); };
const tl=new T.TextureLoader(mgr);
const prep=t=>{ t.generateMipmaps=false; t.minFilter=T.LinearFilter; t.magFilter=T.LinearFilter; t.wrapS=T.RepeatWrapping; t.wrapT=T.ClampToEdgeWrapping; return t; };
const tex={}, env={}, masks={};
function loadKey(k){ const id=SET+'_'+k; if(tex[id]) return; const o={ready:false,n:0}; tex[id]=o; const fin=()=>{ if(++o.n===2) o.ready=true; }, p=SETS[SET].pre;
  o.band=prep(tl.load(`${p}${k}_band.jpg`,fin)); o.full=prep(tl.load(`${p}${k}_full.jpg`,fin)); }
const pmrem=new T.PMREMGenerator(W.renderer);
function loadEnv(k){ const id=SET+'_'+k; if(env[id]!==undefined) return; env[id]=null; if(!T.RGBELoader) return;
  new T.RGBELoader(mgr).setDataType(T.UnsignedByteType).load(`${SETS[SET].pre}${k}.hdr`,t=>{ env[id]=pmrem.fromEquirectangular(t).texture; t.dispose(); }); }
function useSet(name){ SET=name; META=SETS[name].meta; if(!masks[name]) masks[name]=prep(tl.load(SETS[name].mask)); U.uMask.value=masks[name];
  for(const id in tex){ if(!id.startsWith(name+'_')){ tex[id].band.dispose(); tex[id].full.dispose(); delete tex[id]; } }
  ['day','dawn','night'].forEach(k=>{ loadKey(k); loadEnv(k); }); envKey=null; }
useSet('lake');

function sched(h){
  const H=((h%24)+24)%24;
  const L=[[4.5,'night','dawn'],[6.0,'dawn','dawn'],[6.6,'dawn','day'],[8.0,'day','day'],[16.5,'day','dawn'],[18.0,'dawn','dawn'],[18.6,'dawn','night'],[20.0,'night','night']];
  let i=L.length-1; for(let k=0;k<L.length;k++) if(H>=L[k][0]) i=k;
  const s=L[i], e=L[(i+1)%L.length][0], len=((e-s[0])+24)%24||24, t=(((H-s[0])+24)%24)/len;
  return [s[1],s[2],s[1]===s[2]?0:t*t*(3-2*t)];
}
const dA=new T.Vector3(), dB=new T.Vector3(), dir=new T.Vector3();
const sunDir=(m,o)=>{ const th=(m.u-YAW)*Math.PI*2, e=m.el*Math.PI/180; return o.set(Math.sin(th)*Math.cos(e),Math.sin(e),-Math.cos(th)*Math.cos(e)); };
// 實拍陰天天空：輕陰（Kloofendal Overcast）與厚雲雨天（Overcast Soil），依雲量、雨量淡入
{ const ld=f=>{ const t=tl.load(f); t.wrapS=T.RepeatWrapping; t.wrapT=T.ClampToEdgeWrapping; t.minFilter=T.LinearFilter; t.generateMipmaps=false; return t; };
  U.uOvcA.value=ld('sky_ovc_light.jpg'); U.uOvcB.value=ld('sky_ovc_heavy.jpg'); }
W.setPhotoHook((h,wx)=>{
  { const k=Math.min(1,Math.max(0,(wx.cloud-.35)/.4)+wx.rain*.6); U.uOvcK.value+=(k-U.uOvcK.value)*.08; }
  const [a,b,m]=sched(h), A=tex[SET+'_'+a], B=tex[SET+'_'+b];
  if(!A||!A.ready||!B||!B.ready) return null;
  if(!started){ started=true; W.setPhotoActive(); if(cb) cb(1,true,errors); }
  U.uBandA.value=A.band; U.uFullA.value=A.full; U.uBandB.value=B.band; U.uFullB.value=B.full; U.uPMix.value=m;
  const k=m<.5?a:b, ek=SET+'_'+k;
  const MA=META[a], MB=META[b], L=(x,y)=>x+(y-x)*m;
  sunDir(MA,dA); sunDir(MB,dB); dir.copy(dA).lerp(dB,m).normalize();
  /* 深夜係數：19:20 起天色轉暗，21:00～04:00 為深夜，05:00 前天亮。照片曝光、光照一起壓暗，天空與水面反射一致 */
  const H=((h%24)+24)%24, ss=(a0,a1,x)=>{ const t=Math.min(1,Math.max(0,(x-a0)/(a1-a0))); return t*t*(3-2*t); };
  const nk=H>=12?ss(19.3,21,H):1-ss(4,5,H), deep=SET==='sea'?.018:.05; U.uNight.value=nk; U.uNightDeep.value=deep;
  { const want=nk>.6?null:(env[ek]||null); if(W.scene.environment!==want){ W.scene.environment=want; envKey=ek; } }
  const li=L(MA.li,MB.li)*(1-wx.cloud*.75-wx.rain*.15)*(1-.6*nk);
  return {dir, lc:[L(MA.lc[0],MB.lc[0])*li,L(MA.lc[1],MB.lc[1])*li,L(MA.lc[2],MB.lc[2])*li],
    exp:Math.exp(L(Math.log(MA.exp),Math.log(MB.exp)))*(1-wx.cloud*.15), light:L(MA.light,MB.light)*(1-wx.cloud*.3)*(1-.55*nk)};
});

/* ---------- 碼頭：實拍風化木板材質 ---------- */
const rep=(t,x,y,srgb)=>{ t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(x,y); t.anisotropy=8; if(srgb) t.encoding=T.sRGBEncoding; return t; };
const dDiff=tl.load('dock_diff.jpg'), dNor=tl.load('dock_nor.jpg'), dRough=tl.load('dock_rough.jpg');
if(P.dockMats){ const {plankMat,postMat,beamMat}=P.dockMats;
  Object.assign(plankMat,{map:rep(dDiff,.55,.09,true),normalMap:rep(dNor,.55,.09),roughnessMap:rep(dRough,.55,.09),roughness:1}); plankMat.needsUpdate=true;   // 一片木板只對到照片上一塊板子，少掉一節一節的接縫
  for(const m of [postMat,beamMat]){ Object.assign(m,{map:rep(dDiff.clone(),.4,1.6,true),normalMap:rep(dNor.clone(),.4,1.6),roughnessMap:rep(dRough.clone(),.4,1.6),roughness:1,color:new T.Color(.75,.72,.68)});
    m.map.needsUpdate=m.normalMap.needsUpdate=m.roughnessMap.needsUpdate=true; m.needsUpdate=true; }
  // 木樁：泡水多年的圓木樁——深褐、木紋直向、霧面不反光（原本用木板照片橫貼，加上反射天空，看起來像金屬管）
  { const pm=postMat; pm.map.rotation=Math.PI/2; pm.normalMap.rotation=Math.PI/2; pm.map.repeat.set(1.6,.5); pm.normalMap.repeat.set(1.6,.5); pm.roughnessMap=null;
    pm.color=new T.Color(.42,.34,.27); pm.roughness=.96; pm.metalness=0; pm.envMapIntensity=.25; pm.needsUpdate=true; } }

/* ---------- 岸邊泥灘（實拍泥土落葉材質） ---------- */
const mud={map:rep(tl.load('mud_diff.jpg'),5,5,true),normalMap:rep(tl.load('mud_nor.jpg'),5,5),roughnessMap:rep(tl.load('mud_rough.jpg'),5,5)};
const mudMat=new T.MeshStandardMaterial(Object.assign({roughness:1},mud));
const BANKS=[];
function bank(cx,cz,w,d,side){ const g=new T.PlaneGeometry(w,d,60,60); g.rotateX(-Math.PI/2); const p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i), edge=side*x+Math.sin(z*.55)*1.1+Math.sin(z*1.7+1)*.35;
    p.setY(i,-.45+.95*sstep(-w*.32,w*.22,-edge)+.06*Math.sin(x*2.1+z*1.3)+.04*Math.sin(x*5.3-z*3.1)); }
  g.computeVertexNormals(); const m=new T.Mesh(g,mudMat); m.position.set(cx,0,cz); m.userData.lake=true; m.visible=!(W.isSea&&W.isSea()); W.scene.add(m); BANKS.push(m); }
bank(-10.5,-7,11,13,1); bank(12.5,-9,10,12,-1);

/* ---------- 掃描 3D 模型 ---------- */
if(T.GLTFLoader){
  const gl=new T.GLTFLoader(mgr);
  const place=(file,list)=>gl.load(file,g=>{ g.scene.traverse(o=>{ if(o.isMesh&&o.material){ o.material.envMapIntensity=1; } });
    for(const it of list){ const c=g.scene.clone(true); c.position.set(it[0],it[1],it[2]); c.rotation.set(it[4]||0,it[3]||0,it[5]||0); c.scale.setScalar(it[6]||1); c.userData.lake=true; c.visible=!(W.isSea&&W.isSea()); W.scene.add(c); if(/trunk|stump|branches|rock/.test(file)) W.fishingPhysics.addObject(c,()=>c.visible,file.includes("rock")?"岸邊岩石":"倒木樹枝"); } });
  place('dead_tree_trunk_02.glb',[[-5.8,-.2,-9.5,.6,0,.05,1.1],[7.5,-.25,-16,-1.1,0,0,1.0],[-13,-.15,-22,2.2,0,0,1.2],[2,-.3,-26,.2,0,0,1.3]]);
  place('tree_stump_01.glb',[[3.9,-.14,-7.6,1,0,0,1.0],[-8.2,-.12,-14,2,0,0,1.3],[10,-.18,-24,0,0,0,1.4],[-3,-.2,-30,1.2,0,0,1.5]]);
  place('tree_stump_02.glb',[[-3.4,-.12,-5.2,.4,0,0,.8],[12.5,-.12,-11,1.7,0,0,1.1],[5.5,-.15,-34,2.5,0,0,1.6]]);
  place('dry_branches_medium_01.glb',[[-1.6,.03,-13,.4,0,0,1.6],[4.6,.03,-19,1.2,0,0,1.8],[-6.8,.03,-20,2.6,0,0,1.5],[1.2,.03,-9,2.0,0,0,1.2]]);
  place('rock_moss_set_01.glb',[[-7.2,-.25,-6,.5,0,0,.8],[-9.8,0,-10.6,2,0,0,.7],[10.2,-.2,-7,1,0,0,.75]]);
  place('fern_02.glb',[[-9.2,.36,-4.6,0,0,0,1.6],[-11.2,.42,-8.2,1,0,0,1.8],[-8.8,.28,-9.6,2,0,0,1.4],[12,.4,-6,1.5,0,0,1.6],[14,.45,-10,.3,0,0,1.7]]);
  /* 岸邊散植（Poly Haven CC0）：每株單獨取出，射線貼地種在泥灘陸地側 */
  const ZONES=[[-15.5,-9.5,-12.5,-1.5],[12.5,17.5,-14.5,-3.5]], BACK=[[-15.8,-14.3,-12.5,-1.5],[16,17.3,-14.5,-3.5]], rc=new T.Raycaster(), dn=new T.Vector3(0,-1,0);
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
  function groundY(x,z){ rc.set(new T.Vector3(x,6,z),dn); const h=rc.intersectObjects(BANKS,false)[0]; return h?h.point.y:null; }
  const scatter=(file,n,hMin,hMax,zones,minY)=>gl.load(file,g=>{
    const kinds=g.scene.children.filter(o=>{ let m=false; o.traverse(x=>{ if(x.isMesh) m=true; }); return m; }).map(o=>{
      const w=new T.Group(); const c=o.clone(true); w.add(c); w.updateMatrixWorld(true); const b=new T.Box3().setFromObject(w), ct=b.getCenter(new T.Vector3());
      c.position.x-=ct.x; c.position.z-=ct.z; c.position.y-=b.min.y; return {w,h:b.max.y-b.min.y}; });
    if(!kinds.length) return;
    for(let i=0;i<n;i++){ const z=zones[i%zones.length], x=z[0]+rnd()*(z[1]-z[0]), zz=z[2]+rnd()*(z[3]-z[2]), y=groundY(x,zz);
      if(y===null||y<minY) continue; const k=kinds[Math.floor(rnd()*kinds.length)], inst=k.w.clone(true);
      inst.scale.setScalar((hMin+rnd()*(hMax-hMin))/Math.max(k.h,1e-3)); inst.position.set(x,y-.02,zz); inst.rotation.y=rnd()*Math.PI*2;
      inst.traverse(o=>{ if(o.isMesh){ o.castShadow=false; if(o.material){ o.material.envMapIntensity=.9; } } });
      inst.userData.lake=true; inst.userData.veg=true; inst.visible=!(W.isSea&&W.isSea()); W.scene.add(inst); } });
  scatter('grass_medium_01.glb',34,.3,.6,ZONES,.12);
  scatter('grass_medium_02.glb',14,.35,.7,ZONES,.12);
  scatter('shrub_03.glb',10,.6,1.1,ZONES,.2);
  scatter('fir_sapling_medium.glb',7,3.5,5.5,BACK,.25);
  place('shrub_02.glb',[[-12.8,.46,-5.6,.5,0,0,1.2],[-13.4,.46,-11,2,0,0,1.0],[15,.46,-8,1,0,0,1.1]]);
}
return {sched,useSet};
}
