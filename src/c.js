const SCAN_TINT=`#include <map_fragment>
{ vec3 al_ = diffuseColor.rgb; float L_ = dot(al_, vec3(0.3, 0.59, 0.11));
  float vy_ = clamp(vOP_.y/0.13*0.5 + 0.5, 0.0, 1.0);
  vec3 tn_ = mix(uBelly, uBack, smoothstep(0.25, 0.8, vy_));
  float bars_ = 1.0 - uBarK*smoothstep(0.55, 0.9, 0.5 + 0.5*cos(vOP_.x*uBarN*6.2831))*smoothstep(-0.38, -0.12, vOP_.x)*(1.0 - smoothstep(0.22, 0.32, vOP_.x))*smoothstep(0.3, 0.6, vy_);
  diffuseColor.rgb = mix(al_, L_*tn_*2.2, uTintK)*bars_; }`;
/* ===== 第 1 段 · 場景物件：碼頭、植物、釣竿、釣線、浮標、水花、魚 ===== */
function createProps(W){
'use strict';
const T = THREE, {scene, player, head, camera, U} = W;
const PH=W.fishingPhysics=new FishingPhysics();
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn,srgb){
  const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4;
    for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.magFilter=T.LinearFilter;
  t.minFilter=T.LinearMipmapLinearFilter; t.generateMipmaps=true; if(srgb!==false) t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t;
}
const hex=s=>{ const n=parseInt(s.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; };
const mix3=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const m4=new T.Matrix4(), q4=new T.Quaternion(), eu=new T.Euler(), pv=new T.Vector3(), sv=new T.Vector3();

/* ---------- 木碼頭 ---------- */
const woodTex=dataTex(256,256,(u,v,o)=>{ const n=fbm(u*3,v*20,3); const gr=Math.sin((v*46+n*6+fbm(u*12,v*3,2)*2.5)*Math.PI); const wt=fbm(u*5+3,v*5,3);
  const k=.62+.12*gr+.28*(n-.5); o[0]=118*k+40*wt; o[1]=96*k+34*wt; o[2]=74*k+30*wt; });
const plankMat=new T.MeshStandardMaterial({map:woodTex, roughness:.9, metalness:0});
const NPL=46, planks=new T.InstancedMesh(new T.BoxGeometry(2.5,.055,.19), plankMat, NPL);
{ const R=rng(7); for(let i=0;i<NPL;i++){ eu.set((R()-.5)*.02,(R()-.5)*.03,(R()-.5)*.015); q4.setFromEuler(eu);
  pv.set((R()-.5)*.06,.8+R()*.01,-3.2+i*.205); sv.set(1+R()*.03,1,1); m4.compose(pv,q4,sv); planks.setMatrixAt(i,m4);
  const c=.72+R()*.38; planks.setColorAt(i,new T.Color(c,c*(.95+R()*.06),c*(.9+R()*.08))); } }
// 每片木板取照片上不同的一段（隨機錯開紋理），不會每片長得一模一樣、排成一格一格的地磚
{ const off=new Float32Array(NPL*2), R=rng(19); for(let i=0;i<NPL;i++){ off[i*2]=R(); off[i*2+1]=R(); }
  planks.geometry.setAttribute('iOff',new T.InstancedBufferAttribute(off,2));
  plankMat.onBeforeCompile=sh=>{ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 iOff;').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_UV\nvUv += iOff;\n#endif'); };
  plankMat.customProgramCacheKey=()=>'plankOff'; }
planks.userData.lake=true; scene.add(planks);
/* 碼頭上的真實道具（實物掃描）：水桶、魚箱和上面的漁夫帽、工具箱、救生圈、橡木桶。都靠邊放，不擋拋竿 */
if(typeof realProp==='function'){ const dockProps=new T.Group(); dockProps.userData.lake=true; dockProps.visible=planks.visible; scene.add(dockProps); const DY=.88;
  const put=(name,x,z,ry,rx,y)=>realProp(T,name,o=>dockProps.add(seatProp(T,o,x,y==null?DY:y,z,ry,rx)));
  put('wooden_bucket_01',-.98,-2.5,.4); put('plastic_crate_01',.98,-1.9,.15); put('fishermans_hat',.98,-1.9,.9,0,DY+.26);
  put('metal_toolbox',.95,.7,-.2); put('lifebuoy',-.92,1.5,.8,-Math.PI/2); put('wine_barrel_01',.82,4.9,0); put('wooden_bucket_01',.2,5.3,1.1); }
PH.addBox({x:-1.3,y:.77,z:-3.31},{x:1.3,y:.88,z:6.2},()=>planks.visible,"碼頭木板");
const postTex=dataTex(64,128,(u,v,o)=>{ const n=fbm(u*8,v*30,3), g=sstep(.58,.66,v), w=[34,38,24], dr=[96,80,62];
  for(let k=0;k<3;k++) o[k]=(w[k]+(dr[k]-w[k])*g)*(.7+.6*n); });
const postMat=new T.MeshStandardMaterial({map:postTex, roughness:.85});
// 樁頂：鋸開的木頭斷面（深褐年輪、龜裂），不是會反光的白色圓盤
const endTex=dataTex(64,64,(u,v,o)=>{ const x=u*2-1, y=v*2-1, r=Math.hypot(x,y), ring=.5+.5*Math.sin(r*38+fbm(u*6,v*6,2)*6), crack=Math.pow(Math.abs(Math.sin(Math.atan2(y,x)*3+fbm(u*3,v*3,2)*4)),40)*.6;
  const k=(.55+.25*ring)*(1-crack)*(1-.35*sstep(.8,1,r)); o[0]=78*k; o[1]=62*k; o[2]=46*k; });
const endMat=new T.MeshStandardMaterial({map:endTex, roughness:.97, metalness:0});
for(const x of [-1.18,1.18]) for(const z of [-3.1,-.4,2.3,5.0]){ const m=new T.Mesh(new T.CylinderGeometry(.11,.12,2.6,10),[postMat,endMat,endMat]); m.position.set(x,-.3,z); m.rotation.y=Math.random()*6.28; m.userData.lake=true; scene.add(m); PH.addObject(m,()=>m.visible,"碼頭木樁"); }
const beamMat=new T.MeshStandardMaterial({map:woodTex, color:0x8a7a68, roughness:.9});
for(const x of [-1.0,1.0]){ const m=new T.Mesh(new T.BoxGeometry(.12,.16,9.5),beamMat); m.position.set(x,.7,1.4); m.userData.lake=true; scene.add(m); PH.addObject(m,()=>m.visible,"碼頭橫梁"); }

/* ---------- 睡蓮葉、花、蘆葦 ---------- */
const padTex=dataTex(128,128,(u,v,o)=>{ const x=u*2-1, y=v*2-1, r=Math.hypot(x,y), a=Math.atan2(y,x);
  const vein=Math.pow(Math.abs(Math.cos(a*7)),60)*sstep(.1,.3,r)*.5, n=fbm(u*9,v*9,3);
  const k=.78+.35*n-vein*.6+.12*sstep(.85,1,r); o[0]=49*k; o[1]=68*k; o[2]=29*k; });
const padGeo=new T.CircleGeometry(1,24,.16,Math.PI*2-.32); padGeo.rotateX(-Math.PI/2);
const padMat=new T.MeshStandardMaterial({map:padTex, roughness:.86, metalness:0, side:T.DoubleSide, envMapIntensity:.18});   // 葉面蠟質只有淡淡光澤，陰天不會反射成一片白
const padPos=[];
{ const R=rng(11); const cl=[[-3.0,-5.5,9],[-2.4,-9.5,8],[3.4,-7.2,10],[2.9,-13,7],[-5.5,-15,10],[6,-18,9],[-3.8,-24,8],[5,-28,7],[-7,-30,9],[3.4,-4.6,6],[-3.3,-3.6,5]];
  for(const c of cl) for(let i=0;i<c[2];i++){ const a=R()*6.283, r=Math.sqrt(R())*1.6; padPos.push([c[0]+Math.cos(a)*r, c[1]+Math.sin(a)*r, .13+R()*.22, R()*6.283]); }
  // 浮萍灣（釣點 -7,-17 一帶）：睡蓮成片，葉子大小不一、緊挨著長，中間留出釣位附近的水道
  const bay=[[-11.5,-13.5,22,2.6],[-12,-19.5,24,2.8],[-4.5,-21.5,18,2.3],[-10,-24,16,2.2],[-2,-14.5,12,1.9],[-14.5,-16.5,14,2.0]];
  for(const c of bay) for(let i=0;i<c[2];i++){ const a=R()*6.283, r=Math.sqrt(R())*c[3]; padPos.push([c[0]+Math.cos(a)*r, c[1]+Math.sin(a)*r, .16+R()*.26, R()*6.283]); } }
const PAD_N=padPos.length, SHRED_MAX=48, pads=new T.InstancedMesh(padGeo,padMat,PAD_N+SHRED_MAX); pads.count=PAD_N;
padPos.forEach((p,i)=>{ q4.setFromEuler(eu.set(0,p[3],0)); pv.set(p[0],.013+i*.00003,p[1]); sv.set(p[2],1,p[2]); m4.compose(pv,q4,sv); pads.setMatrixAt(i,m4);
  PH.addBox({x:p[0]-p[2],y:-.03,z:p[1]-p[2]},{x:p[0]+p[2],y:.025,z:p[1]+p[2]},()=>pads.visible,"睡蓮葉");
  const c=.85+((i*7919)%100)/100*.3; pads.setColorAt(i,new T.Color(c,c,c*.9)); });
pads.userData.lake=true; pads.userData.flatOnWater=true; pads.renderOrder=1; scene.add(pads);   // 荷葉排在水面之後畫：湖面有風浪起伏，先畫荷葉會被浪頭蓋掉，看起來像沉在水裡
const petalMat=new T.MeshStandardMaterial({color:0xf3dfe4, roughness:.5, emissive:0x1a0a0c});
const coreMat=new T.MeshStandardMaterial({color:0xe8c040, roughness:.6});
const petalGeo=new T.SphereGeometry(1,10,8);
const FLOWER_PADS=[3,12,25,40,57,70].map(k=>k%padPos.length), flowerInst=[];
{ const flowerParts=[], g=new T.Group();
  for(let i=0;i<10;i++){ const m=new T.Mesh(petalGeo,petalMat); const a=i/10*6.283; m.scale.set(.05,.014,.022); m.position.set(Math.cos(a)*.04,.02,Math.sin(a)*.04); m.rotation.set(0,-a,.55); g.add(m); flowerParts.push(m); }
  const cm=new T.Mesh(new T.SphereGeometry(.022,10,8),coreMat); cm.position.y=.025; g.add(cm); flowerParts.push(cm);
  // 一朵花（花瓣、花心各一個網格）做成實例，六朵跟著各自的荷葉一起被推開、傾斜
  for(const part of mergeMeshesByMaterial(T,flowerParts,g)){ const im=new T.InstancedMesh(part.geometry,part.material,FLOWER_PADS.length); im.frustumCulled=false; im.userData.lake=true; im.userData.flatOnWater=true; im.castShadow=false; scene.add(im); flowerInst.push(im); } }

/* ---------- 荷葉被船推開、沖破 ----------
   荷葉是長在水底的，船撞上去會被擠到一邊、邊緣被壓進水裡傾斜翹起；船夠快時葉子會被沖破成幾片碎葉，碎葉漂著、慢慢沉下去；
   被推開的葉子約半分鐘慢慢漂回原位，破掉的葉子慢慢長回來。花跟著各自的荷葉一起動。 */
const padS={ox:new Float32Array(PAD_N),oz:new Float32Array(PAD_N),vx:new Float32Array(PAD_N),vz:new Float32Array(PAD_N),th:new Float32Array(PAD_N),tx:new Float32Array(PAD_N),tz:new Float32Array(PAD_N),yw:new Float32Array(PAD_N),yv:new Float32Array(PAD_N),sc:new Float32Array(PAD_N).fill(1),hit:new Float32Array(PAD_N),burstAt:new Float32Array(PAD_N).fill(-1e9),act:new Uint8Array(PAD_N)};
const flowerOf=new Map(); FLOWER_PADS.forEach((pi,j)=>flowerOf.set(pi,j));
const pqY=new T.Quaternion(), pqT=new T.Quaternion(), pUp=new T.Vector3(0,1,0), pN=new T.Vector3(), pV=new T.Vector3(), pS=new T.Vector3(), pM=new T.Matrix4(), fM=new T.Matrix4();
let padsDirty=false, flowersDirty=false;
function writePad(i){ const p=padPos[i], th=padS.th[i]; pqY.setFromAxisAngle(pUp,p[3]+padS.yw[i]); pqT.identity();
  if(th>1e-3){ pN.set(-padS.tx[i]*Math.sin(th),Math.cos(th),-padS.tz[i]*Math.sin(th)); pqT.setFromUnitVectors(pUp,pN); pqY.premultiply(pqT); }
  const y=.013+i*.00003-.06*th, r=p[2]*padS.sc[i]; pV.set(p[0]+padS.ox[i],y,p[1]+padS.oz[i]); pS.set(r,1,r); pM.compose(pV,pqY,pS); pads.setMatrixAt(i,pM); padsDirty=true;
  const fj=flowerOf.get(i); if(fj!==undefined){ pV.x+=.05; pV.y+=.004; pS.set(padS.sc[i],padS.sc[i],padS.sc[i]); fM.compose(pV,pqT,pS); for(const im of flowerInst) im.setMatrixAt(fj,fM); flowersDirty=true; } }
FLOWER_PADS.forEach(writePad); flowerInst.forEach(im=>{ im.instanceMatrix.needsUpdate=true; }); pads.frustumCulled=false;
const shreds=[]; let padClock=0;
function hullPush(px,pz,R,bx,bz,c,s,seed,out){
  const dx=px-bx, dz=pz-bz; if(dx*dx+dz*dz>36) return false;
  const A=.40+R*.85, B=2.12+R*.85, lx=dx*c-dz*s, ly=dx*s+dz*c+.35, tt=(lx*lx)/(A*A)+(ly*ly)/(B*B); if(tt>=1) return false;
  // 往最近的出口推：離船側近就往旁邊推；在船頭附近就往前推，並帶一點側向，葉子才會順著船身滑開而不是黏在船頭上
  const exX=A*Math.sqrt(Math.max(0,1-(ly/B)*(ly/B)))-Math.abs(lx), exY=B*Math.sqrt(Math.max(0,1-(lx/A)*(lx/A)))-Math.abs(ly);
  let sx=lx>=0?1:-1; if(Math.abs(lx)<.03) sx=(seed&1)?1:-1; const sy=ly>=0?1:-1; let nlx,nly,dist;
  if(exX<=exY){ nlx=sx; nly=0; dist=exX; } else { nlx=sx*.9; nly=sy; const nn=Math.hypot(nlx,nly); nlx/=nn; nly/=nn; dist=exY/Math.max(.3,Math.abs(nly)); }
  out.nx=nlx*c+nly*s; out.nz=-nlx*s+nly*c; out.d=Math.max(dist,.002)+.004; out.ly=ly; return true; }
const hp={nx:0,nz:0,d:0,ly:0};
function burstPad(i,nx,nz,speed){
  const p=padPos[i], px=p[0]+padS.ox[i], pz=p[1]+padS.oz[i], R=p[2]*padS.sc[i]; padS.sc[i]*=.62; padS.burstAt[i]=padClock;
  for(let k=0;k<3;k++){ if(shreds.length>=SHRED_MAX) shreds.shift(); const a=Math.random()*6.283, rr=R*(.2+Math.random()*.5), sp=.5+Math.random()*.9+speed*.5, tang=(Math.random()-.5)*1.6;
    shreds.push({x:px+Math.cos(a)*rr,z:pz+Math.sin(a)*rr,vx:nx*sp-nz*tang,vz:nz*sp+nx*tang,r:R*(.28+Math.random()*.2),yaw:Math.random()*6.283,yv:(Math.random()-.5)*5,age:0,ci:i}); }
  splash(px,.0,pz,8,.3); if(W.addRipple) W.addRipple(px,pz,.3); }
function updatePads(dt,t,bx,bz,head,speed){
  padClock+=dt; dt=Math.min(dt,.05); const c=Math.cos(head), s=Math.sin(head);
  for(let i=0;i<PAD_N;i++){ const p=padPos[i];
    if(padS.sc[i]<1){ padS.sc[i]=Math.min(1,padS.sc[i]+dt/70); padS.act[i]=1; }
    const px=p[0]+padS.ox[i], pz=p[1]+padS.oz[i];
    if(hullPush(px,pz,p[2]*padS.sc[i],bx,bz,c,s,i,hp)){
      padS.ox[i]+=hp.nx*hp.d; padS.oz[i]+=hp.nz*hp.d; const imp=.35+speed*.9; padS.vx[i]+=hp.nx*imp; padS.vz[i]+=hp.nz*imp;
      const vv=Math.hypot(padS.vx[i],padS.vz[i]); if(vv>2.4){ padS.vx[i]*=2.4/vv; padS.vz[i]*=2.4/vv; }
      padS.th[i]=Math.min(.62,Math.max(padS.th[i],.16+.3*Math.min(1,hp.d/(p[2]+.1))+.1*speed)); padS.tx[i]=hp.nx; padS.tz[i]=hp.nz;
      if(padS.hit[i]<=0){ padS.yv[i]+=(Math.random()-.5)*(1.2+speed*1.6); if(W.addRipple&&speed>.3) W.addRipple(px,pz,.08+.06*speed); }
      padS.hit[i]=.45; padS.act[i]=1;
      if(speed>1.15&&padS.sc[i]>.75&&hp.ly<-.3&&padClock-padS.burstAt[i]>6) burstPad(i,hp.nx,hp.nz,speed); }
    if(!padS.act[i]) continue;
    padS.ox[i]+=padS.vx[i]*dt; padS.oz[i]+=padS.vz[i]*dt; const dr=Math.exp(-2.4*dt); padS.vx[i]*=dr; padS.vz[i]*=dr;
    if(padS.hit[i]<=0){ const k=1-Math.min(1,dt*.04); padS.ox[i]*=k; padS.oz[i]*=k; padS.th[i]*=Math.exp(-dt*1.6); if(padS.th[i]<.003) padS.th[i]=0; } else padS.hit[i]-=dt;
    padS.yw[i]+=padS.yv[i]*dt; padS.yv[i]*=Math.exp(-1.8*dt);
    const idle=Math.abs(padS.ox[i])<.0005&&Math.abs(padS.oz[i])<.0005&&Math.abs(padS.vx[i])+Math.abs(padS.vz[i])<.001&&padS.th[i]===0&&Math.abs(padS.yv[i])<.01&&padS.sc[i]>=1;
    if(idle){ padS.ox[i]=padS.oz[i]=padS.vx[i]=padS.vz[i]=padS.yw[i]=padS.yv[i]=0; padS.act[i]=0; }
    writePad(i); }
  // 碎葉：漂開、旋轉、被船擠開，約 10 秒後慢慢沉下去、縮小消失
  for(let k=shreds.length-1;k>=0;k--){ const q=shreds[k]; q.age+=dt; if(q.age>22){ shreds.splice(k,1); continue; }
    if(hullPush(q.x,q.z,q.r,bx,bz,c,s,k,hp)){ q.x+=hp.nx*hp.d; q.z+=hp.nz*hp.d; q.vx+=hp.nx*.5; q.vz+=hp.nz*.5; }
    q.x+=q.vx*dt; q.z+=q.vz*dt; const dr=Math.exp(-1.5*dt); q.vx*=dr; q.vz*=dr; q.yaw+=q.yv*dt; q.yv*=Math.exp(-1.2*dt); }
  const n=shreds.length; pads.count=PAD_N+n;
  for(let k=0;k<n;k++){ const q=shreds[k], sink=q.age>10?(q.age-10)*.004:0, size=q.r*(q.age>16?Math.max(0,1-(q.age-16)/6):1);
    pqY.setFromAxisAngle(pUp,q.yaw); pV.set(q.x,.012-sink+k*.00002,q.z); pS.set(size,1,size); pM.compose(pV,pqY,pS); pads.setMatrixAt(PAD_N+k,pM);
    if(!q.col){ q.col=true; const cc=new T.Color(.7,.78,.6); pads.setColorAt(PAD_N+k,cc); pads.instanceColor.needsUpdate=true; } }
  if(padsDirty||n>0||shreds.length!==updatePads.lastN){ pads.instanceMatrix.needsUpdate=true; padsDirty=false; }
  updatePads.lastN=n; if(flowersDirty){ flowerInst.forEach(im=>{ im.instanceMatrix.needsUpdate=true; }); flowersDirty=false; } }
window.__PADS={update:updatePads,state:padS,shreds};

/* ---------- 搏魚的水面泡沫（翻白）：魚在水面附近掙扎時攪出一團白沫，邊游邊在身後留下慢慢散開、碎成蕾絲狀的泡沫尾跡 ----------
   一張程式畫的泡沫紋理（細胞狀的泡沫邊＋大小氣泡），用實例化的方片貼在水面；每片泡沫的生命週期在著色器裡算：先長大，再從中間破開成網狀，最後消失。
   CPU 只在產生新泡沫時寫一筆資料，一次繪製畫完全部。 */
const FOAM_MAX=180;
const foamTex=(()=>{ const N=256, cv=document.createElement('canvas'); cv.width=cv.height=N; const x=cv.getContext('2d'), img=x.createImageData(N,N), R=rng(91);
  const G=8, pts=[]; for(let j=0;j<G;j++) for(let i=0;i<G;i++) pts.push([(i+R())*N/G,(j+R())*N/G]);
  const near=(px,py)=>{ let f1=1e9,f2=1e9; const ci=Math.floor(px/(N/G)), cj=Math.floor(py/(N/G));
    for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ const ii=(ci+di+G)%G, jj=(cj+dj+G)%G, p=pts[jj*G+ii]; let dx=p[0]-px, dy=p[1]-py; if(dx>N/2)dx-=N; if(dx<-N/2)dx+=N; if(dy>N/2)dy-=N; if(dy<-N/2)dy+=N; const d=Math.hypot(dx,dy); if(d<f1){f2=f1;f1=d;} else if(d<f2) f2=d; } return [f1,f2]; };
  for(let y=0;y<N;y++) for(let xx=0;xx<N;xx++){ const [f1,f2]=near(xx,y), d=f2-f1, line=1-Math.min(1,d/3.2), n=fbm(xx*.04,y*.04,4), blob=Math.max(0,Math.min(1,(n-.56)/.14)), a=Math.max(0,Math.min(1,line*line*(.55+.6*n)+blob*.7+(f1<4.5?.25:0))); const k=(y*N+xx)*4; img.data[k]=img.data[k+1]=img.data[k+2]=255; img.data[k+3]=Math.round(a*255); }
  x.putImageData(img,0,0);
  for(let i=0;i<260;i++){ const r=.6+R()*2.4, px=R()*N, py=R()*N; x.strokeStyle='rgba(255,255,255,'+(.35+R()*.5)+')'; x.lineWidth=.6; x.beginPath(); x.arc(px,py,r,0,6.283); x.stroke(); }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; return t; })();
const fg=new T.InstancedBufferGeometry(), fpl=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
fg.index=fpl.index; fg.setAttribute('position',fpl.attributes.position);
const fP=new T.InstancedBufferAttribute(new Float32Array(FOAM_MAX*4),4), fB=new T.InstancedBufferAttribute(new Float32Array(FOAM_MAX*4).fill(-1e9),4);
fP.setUsage(T.DynamicDrawUsage); fB.setUsage(T.DynamicDrawUsage); fg.setAttribute('aP',fP); fg.setAttribute('aB',fB); fg.instanceCount=FOAM_MAX;
const foamMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTex:{value:foamTex},uTime:U.uTime,uSea:U.uSea,uWind:U.uWind,uLight:U.uLightK,uBoat:U.uBoat},
 vertexShader:`attribute vec4 aP; attribute vec4 aB; uniform float uTime; uniform float uSea; uniform vec3 uWind;
  varying vec2 vUv; varying float vAge; varying float vSeed; varying float vStr; varying vec2 vW;
  float seaH(vec2 p){ vec2 wd=normalize(uWind.xy+vec2(1e-4)); float s=.45+1.1*uWind.z; vec2 D[4]; D[0]=wd; D[1]=vec2(wd.x*.77-wd.y*.64,wd.y*.77+wd.x*.64); D[2]=vec2(wd.x*.77+wd.y*.64,wd.y*.77-wd.x*.64); D[3]=vec2(wd.x*.34-wd.y*.94,wd.y*.34+wd.x*.94);
    float L[4]; L[0]=38.0; L[1]=23.0; L[2]=15.0; L[3]=9.0; float A[4]; A[0]=.42; A[1]=.28; A[2]=.18; A[3]=.11; float h=0.0; for(int i=0;i<4;i++){ float k=6.2831853/L[i]; h+=A[i]*s*sin(k*dot(D[i],p)-sqrt(9.81*k)*uTime); } return h; }
  void main(){ float age=(uTime-aB.x)/max(aB.y,.01); vAge=age; vSeed=aB.z; vStr=aB.w; float alive=step(0.0,age)*step(age,1.0);
    float sz=aP.w*(.7+.75*sqrt(clamp(age,0.0,1.0)))*alive; float c=cos(aP.z), s=sin(aP.z); vec2 q=vec2(position.x*c-position.z*s, position.x*s+position.z*c)*sz;
    vec2 p=aP.xy+q; vW=p; float y=uSea>.5?seaH(p)+.035:.017; vUv=position.xz+.5; gl_Position=projectionMatrix*viewMatrix*vec4(p.x,y,p.y,1.0); }`,
 fragmentShader:`uniform sampler2D uTex; uniform float uTime; uniform float uLight; uniform vec4 uBoat;
  varying vec2 vUv; varying float vAge; varying float vSeed; varying float vStr; varying vec2 vW;
  void main(){ if(vAge<0.0||vAge>1.0) discard;
    if(uBoat.w>.5){ vec2 d=vW-uBoat.xy; float c=cos(uBoat.z), s=sin(uBoat.z); vec2 l=vec2(d.x*c-d.y*s, d.x*s+d.y*c+.35); if((l.x*l.x)/.3025+(l.y*l.y)/5.29<1.0) discard; }
    float r=length(vUv-.5)*2.0; float mask=1.0-smoothstep(.45,1.0,r);
    float t1=texture2D(uTex,vUv*1.05+vSeed*7.13+vec2(uTime*.03,0.0)).a, t2=texture2D(uTex,vUv*2.1+vSeed*3.71-vec2(0.0,uTime*.045)).a;
    float foam=t1*.6+t2*.45+.3*mask*(1.0-vAge)*(1.0-vAge);
    float th=mix(.3,.92,vAge);
    float a=smoothstep(th,th+.2,foam*mask)*mask*vStr*(1.0-smoothstep(.8,1.0,vAge))*(.45+.55*t1);
    if(a<.012) discard;
    // 泡沫是半透明的：氣泡薄的地方透出底下的水色，厚的地方才接近白色
    vec3 col=mix(vec3(.24,.29,.33),vec3(.95,.97,1.0),clamp(uLight,0.0,1.0))*(.82+.18*t2);
    gl_FragColor=vec4(col,min(.82,a)); }`});
const foamMesh=new T.Mesh(fg,foamMat); foamMesh.frustumCulled=false; foamMesh.renderOrder=2; foamMesh.userData.flatOnWater=true; scene.add(foamMesh);
let foamI=0;
function foam(x,z,size,life,strength){ const i=foamI; foamI=(foamI+1)%FOAM_MAX; fP.setXYZW(i,x,z,Math.random()*6.283,size); fB.setXYZW(i,U.uTime.value,life,Math.random(),strength); fP.needsUpdate=true; fB.needsUpdate=true; }
function foamBurst(x,z,n,size){ for(let k=0;k<n;k++){ const a=Math.random()*6.283, r=Math.random()*size*.6; foam(x+Math.cos(a)*r,z+Math.sin(a)*r,size*(.5+Math.random()*.7),1.6+Math.random()*2.2,.75+Math.random()*.25); } }

/* ---------- 浮萍（真實做法）：一張畫了上千片細小葉片的貼圖，鋪在不規則的浮萍毯網格上 ----------
   真的浮萍是 3～5 公釐的小圓葉擠成一片綠毯，邊緣碎成一團一團。不用雜訊硬算，貼圖細節在手機解析度下也看得出是葉子。 */
const dwTex=(()=>{ const N=512, cv=document.createElement('canvas'); cv.width=cv.height=N; const x=cv.getContext('2d'); x.clearRect(0,0,N,N); const R=rng(23);
  const pal=[[118,160,52],[96,146,44],[132,172,60],[84,132,40],[150,184,70],[108,150,48]];
  for(let i=0;i<2600;i++){ const px=R()*N, py=R()*N, r=2.6+R()*2.2, c=pal[(R()*pal.length)|0], sh=.82+R()*.3, rot=R()*6.283, e=.78+R()*.22;
    for(const ox of [-N,0,N]) for(const oy of [-N,0,N]){ const cx=px+ox, cy=py+oy; if(cx<-8||cy<-8||cx>N+8||cy>N+8) continue;
      x.save(); x.translate(cx,cy); x.rotate(rot); x.scale(1,e);
      x.fillStyle='rgba('+((c[0]*.55)|0)+','+((c[1]*.55)|0)+','+((c[2]*.55)|0)+',1)'; x.beginPath(); x.arc(0,0,r+.7,0,6.283); x.fill();
      const g=x.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r); g.addColorStop(0,'rgb('+((c[0]*sh*1.12)|0)+','+((c[1]*sh*1.1)|0)+','+((c[2]*sh)|0)+')'); g.addColorStop(1,'rgb('+((c[0]*sh*.78)|0)+','+((c[1]*sh*.82)|0)+','+((c[2]*sh*.7)|0)+')');
      x.fillStyle=g; x.beginPath(); x.arc(0,0,r,0,6.283); x.fill(); x.restore(); } }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=4; t.encoding=T.sRGBEncoding; return t; })();
const dwMat=new T.MeshStandardMaterial({map:dwTex, roughness:.8, metalness:0, alphaTest:.5, transparent:false, vertexColors:true, envMapIntensity:.15, side:T.DoubleSide});
// 船推開浮萍：船身周圍一圈不畫，船走過的路留下一條慢慢合攏的水道（約 20 秒合回來）；uTrail 由 f.js 在船移動時寫入
const DW_TRAIL=24, dwTrail=[]; for(let i=0;i<DW_TRAIL;i++) dwTrail.push(new T.Vector4(0,0,-1e9,0));
window.__DW={trail:dwTrail,next:0};
dwMat.onBeforeCompile=sh=>{ sh.uniforms.uBoat=U.uBoat; sh.uniforms.uTime=U.uTime; sh.uniforms.uTrail={value:dwTrail};
  sh.vertexShader='varying vec3 vDwW;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvDwW=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader='varying vec3 vDwW; uniform vec4 uBoat; uniform float uTime; uniform vec4 uTrail['+DW_TRAIL+'];\n'+sh.fragmentShader.replace('#include <alphatest_fragment>',
   `{ vec2 p=vDwW.xz; float keep=1.0;
      if(uBoat.w>0.5){ vec2 d=p-uBoat.xy; float c=cos(uBoat.z), s=sin(uBoat.z); vec2 l=vec2(d.x*c-d.y*s, d.x*s+d.y*c+0.35); float e=(l.x*l.x)/0.2+(l.y*l.y)/5.0; keep*=smoothstep(.85,1.1,e); }
      if(uBoat.w>0.5&&dot(p-uBoat.xy,p-uBoat.xy)<196.0){ for(int i=0;i<${DW_TRAIL};i++){ vec4 t=uTrail[i]; float age=uTime-t.z; float r=.46*(1.0-age/20.0); if(r>0.0){ float q=length(p-t.xy)/r; keep*=smoothstep(.75,1.1,q); } } }
      diffuseColor.a*=keep; }
    #include <alphatest_fragment>`); };
dwMat.customProgramCacheKey=()=>'duckweedPush';
{ const R=rng(37), parts=[];
  // 大片的毯子在睡蓮之間與岸邊，小團散在毯子外圍；形狀用角度雜訊做成不規則，邊緣再用頂點色壓暗、顏色略有深淺
  const mats=[[-12.5,-14,3.4],[-11,-20.5,3.8],[-14.8,-18,2.6],[-5,-22.8,2.4],[-9.5,-25.5,2.8],[-3.2,-15.5,1.6],[-15.5,-22.5,2.0],[-7.8,-11.5,1.8]];
  for(let k=0;k<30;k++){ const b=mats[k%mats.length], a=R()*6.283, d=b[2]*(1.05+R()*1.1); mats.push([b[0]+Math.cos(a)*d,b[1]+Math.sin(a)*d,.25+R()*.7]); }
  for(const m of mats){ const seg=m[2]>1.2?40:16, g=new T.CircleGeometry(1,seg), ph=R()*6.283, ph2=R()*6.283, pos=g.attributes.position, col=new Float32Array(pos.count*3), uv=g.attributes.uv;
    for(let i=0;i<pos.count;i++){ const x0=pos.getX(i), y0=pos.getY(i), r0=Math.hypot(x0,y0), an=Math.atan2(y0,x0);
      const wob=1+.22*Math.sin(an*3+ph)+.14*Math.sin(an*7+ph2)+.07*Math.sin(an*13+ph*2); const r=r0*m[2]*wob;
      const wx=m[0]+Math.cos(an)*r, wz=m[1]+Math.sin(an)*r; pos.setXYZ(i,wx,0,wz); uv.setXY(i,wx*2.6,wz*2.6);
      const edge=r0>.85?.78:1, tint=.88+.2*fbm(wx*.9,wz*.9,2); col[i*3]=edge*tint; col[i*3+1]=edge*tint; col[i*3+2]=edge*tint*.92; }
    g.setAttribute('color',new T.BufferAttribute(col,3)); g.computeVertexNormals(); const mesh=new T.Mesh(g,dwMat); parts.push(mesh); }
  // renderOrder 1：浮萍毯排在水面之後畫，風浪起伏的浪頭才不會蓋過浮萍
  mergeMeshesByMaterial(T,parts,null).forEach(mm=>{ mm.position.y=.006; mm.renderOrder=1; mm.userData.lake=true; mm.receiveShadow=true; scene.add(mm); if(W.reflHide) W.reflHide(mm); }); }

const bladeGeo=new T.PlaneGeometry(.022,1,1,5); bladeGeo.translate(0,.5,0);
{ const p=bladeGeo.attributes.position; for(let i=0;i<p.count;i++){ const y=p.getY(i); p.setX(i,p.getX(i)*(1-y*.9)); p.setZ(i,y*y*.06); } bladeGeo.computeVertexNormals(); }
const reedMat=new T.MeshStandardMaterial({color:0xffffff, roughness:.75, side:T.DoubleSide});
reedMat.onBeforeCompile=(s)=>{ s.uniforms.uTime=U.uTime; s.uniforms.uWind=U.uWind; s.vertexShader='uniform float uTime;\nuniform vec3 uWind;\n'+s.vertexShader.replace('#include <begin_vertex>',
 `#include <begin_vertex>
 float ph_ = 0.0;
 #ifdef USE_INSTANCING
 ph_ = instanceMatrix[3].x*0.9 + instanceMatrix[3].z*0.6;
 #endif
 float ws_ = 0.3 + uWind.z*2.2;
 float sw_ = (sin(uTime*(1.4 + uWind.z*2.0) + ph_)*0.6 + sin(uTime*2.3 + ph_*1.7)*0.4)*ws_;
 transformed.x += (sw_*0.07 + uWind.x*uWind.z*0.14)*position.y*position.y;
 transformed.z += (cos(uTime*1.1 + ph_)*0.03*ws_ + uWind.y*uWind.z*0.14)*position.y*position.y;`); };
const reedPos=[];
{ const R=rng(23); const cl=[[-3.4,-5.2,1.4,150],[-3.6,-9.5,1.4,90],[3.6,-4.4,1.2,120],[4.4,-8.5,1.2,70],[-6.5,-2,2,80],[7,-4,2,70]];
  for(const c of cl) for(let i=0;i<c[3];i++){ const a=R()*6.283, r=Math.sqrt(R())*c[2]; reedPos.push([c[0]+Math.cos(a)*r, c[1]+Math.sin(a)*r, .9+R()*1.1, R()]); } }
const reeds=new T.InstancedMesh(bladeGeo,reedMat,reedPos.length);
{ const R=rng(5); reedPos.forEach((p,i)=>{ eu.set((R()-.5)*.25,R()*6.283,(R()-.5)*.25); q4.setFromEuler(eu); pv.set(p[0],-.05,p[1]); sv.set(1,p[2],1); m4.compose(pv,q4,sv); reeds.setMatrixAt(i,m4);
  const t=p[3]; reeds.setColorAt(i,new T.Color().setRGB(lerp(.24,.46,t),lerp(.32,.42,t),lerp(.1,.16,t))); }); }
reeds.userData.lake=true; scene.add(reeds);

/* ---------- 釣竿（藍色碳纖竿、導環、紡車捲線器） ---------- */
const rod={pitch:0, pitchT:0, side:0, bend:0, bendT:0, spin:0, end:null, tipW:new T.Vector3(), spoolW:new T.Vector3(), guidesW:[]};
const R_BASE=new T.Vector3(...FISHING_VIEW.rodBase), R_DIR=new T.Vector3(...FISHING_VIEW.rodDirection).normalize(), R_LEN=2.65, NS=36;
// 真實釣竿材質：碳纖編織紋竿身＋透明亮光漆、EVA 發泡握把（細小氣孔）、捲線器線杯纏著一圈圈釣線
const texC=(w,h,draw,rx,ry)=>{ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; draw(cv.getContext('2d'),w,h); const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(rx||1,ry||1); return t; };
const carbonTex=texC(256,256,(g,w,h)=>{ g.fillStyle='#d0d1d3'; g.fillRect(0,0,w,h); for(let y=0;y<h;y+=8) for(let x=0;x<w;x+=8){ const on=((x+y)/8)%2===0, gr=g.createLinearGradient(x,y,on?x+8:x,on?y:y+8); gr.addColorStop(0,'#7c8087'); gr.addColorStop(.5,on?'#c5c8cc':'#a1a7ae'); gr.addColorStop(1,'#868b91'); g.fillStyle=gr; g.fillRect(x+.5,y+.5,7,7); } },3,4);
carbonTex.encoding=T.sRGBEncoding;carbonTex.anisotropy=8;
const weaveTex=texC(128,128,(g,w,h)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=128+26*Math.sin((x+y)*Math.PI/4)*Math.sin((x-y)*Math.PI/4);g.fillStyle=`rgb(${n},${n},${n})`;g.fillRect(x,y,1,1);}},3,4);
const brushedTex=texC(128,128,(g,w,h)=>{for(let y=0;y<h;y++){const n=128+12*Math.sin(y*2.91)+5*Math.sin(y*9.3);g.fillStyle=`rgb(${n},${n},${n})`;g.fillRect(0,y,w,1);}},1,3);
const finishAssets={carbon:carbonTex,weave:weaveTex,brushed:brushedTex,normals:createDetailNormals(T)};
const evaTex=texC(64,64,(g,w,h)=>{ g.fillStyle='#202124'; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=Math.random()<.5?'rgba(0,0,0,.55)':'rgba(70,72,78,.35)'; g.beginPath(); g.arc(Math.random()*w,Math.random()*h,Math.random()*1.3+.3,0,7); g.fill(); } },2,6);
evaTex.encoding=T.sRGBEncoding;
const blankMat=new T.MeshPhysicalMaterial({color:0xffffff,map:carbonTex,metalness:.25,roughness:.38,clearcoat:1,clearcoatRoughness:.05});
const gripMat=new T.MeshStandardMaterial({color:0xffffff,map:evaTex,normalMap:finishAssets.normals.grip,normalScale:new T.Vector2(.35,.35),roughness:.92});
const chromeMat=new T.MeshStandardMaterial({color:0xdde2e6, metalness:1, roughness:.16});
const darkMetal=new T.MeshStandardMaterial({color:0x2a2e35, metalness:.75, roughness:.3});
const goldMat=new T.MeshStandardMaterial({color:0xd9b25a, metalness:1, roughness:.2});
const spoolTex=texC(16,128,(g,w,h)=>{ for(let y=0;y<h;y++){ const v=170+Math.round(60*Math.abs(Math.sin(y*1.7))); g.fillStyle=`rgb(${v-30},${v},${v+10})`; g.fillRect(0,y,w,1); } },6,1);
const blueAno=new T.MeshPhysicalMaterial({color:0xffffff,map:spoolTex,metalness:.2,roughness:.35,clearcoat:.6});   // 線杯上纏滿的透明尼龍線
const rRad=s=>s<.1?.0155:s<.155?.0105:s<.21?.0128:lerp(.0082,.0021,(s-.21)/.79);
const rodGroup=new T.Group(); W.head.add(rodGroup);
const segs=[];
for(let i=0;i<NS;i++){ const s0=i/NS, s1=(i+1)/NS, sm=(s0+s1)/2;
  const mat=sm<.1?gripMat:sm<.155?chromeMat:sm<.21?gripMat:blankMat;
  const m=new T.Mesh(new T.CylinderGeometry(rRad(s1),rRad(s0),1,10),mat); rodGroup.add(m); segs.push(m); }
const GS=[.3,.42,.53,.63,.72,.8,.87,.93,.975];
const sicMat=new T.MeshStandardMaterial({color:0x2a2c30,metalness:.4,roughness:.25});
const guides=GS.map(s=>{ const r=.004+.008*(1-s); const m=new T.Mesh(new T.TorusGeometry(r,.0011,6,14),chromeMat); const ins=new T.Mesh(new T.TorusGeometry(r*.78,.0009,6,14),sicMat); m.add(ins); rodGroup.add(m); rod.guidesW.push(new T.Vector3()); return m; });   // 金屬導環架＋深色陶瓷內環
const tipTop=new T.Mesh(new T.TorusGeometry(.0035,.001,6,10),chromeMat); rodGroup.add(tipTop);
// 捲線器
const reel=new T.Group(); rodGroup.add(reel);
{ const foot=new T.Mesh(new T.BoxGeometry(.05,.008,.012),darkMetal); foot.position.y=-.016; reel.add(foot);
  const stem=new T.Mesh(new T.BoxGeometry(.012,.05,.01),darkMetal); stem.position.y=-.045; reel.add(stem);
  const body=new T.Mesh(new T.CylinderGeometry(.027,.031,.055,18),darkMetal); body.rotation.z=Math.PI/2; body.position.set(-.006,-.085,0); reel.add(body);
  const spool=new T.Mesh(new T.CylinderGeometry(.028,.028,.03,22),blueAno); spool.name='tackleSpool';spool.rotation.z=Math.PI/2; spool.position.set(.04,-.085,0); reel.add(spool);
  const lip=new T.Mesh(new T.CylinderGeometry(.031,.031,.004,22),chromeMat); lip.rotation.z=Math.PI/2; lip.position.set(.056,-.085,0); reel.add(lip);
  const bail=new T.Mesh(new T.TorusGeometry(.034,.0016,6,20,Math.PI),chromeMat); bail.rotation.y=Math.PI/2; bail.position.set(.044,-.085,0); reel.add(bail); }
reel.name='tackleReel';
const crank=new T.Group(); crank.position.set(-.008,-.085,.034); reel.add(crank);
{ const arm=new T.Mesh(new T.BoxGeometry(.006,.055,.005),darkMetal); arm.position.y=-.024; crank.add(arm);
  const knob=new T.Mesh(new T.CylinderGeometry(.008,.008,.022,12),gripMat); knob.rotation.x=Math.PI/2; knob.position.set(0,-.05,.014); crank.add(knob); }
// Machined reel details: rotor, line-roller, drag dial and fastener heads.
for(const x of [.025,.058]){const ring=new T.Mesh(new T.TorusGeometry(.029,.0012,8,40),chromeMat);ring.rotation.y=Math.PI/2;ring.position.set(x,-.085,0);reel.add(ring);}
const dragDial=new T.Mesh(new T.CylinderGeometry(.014,.018,.009,32),darkMetal);dragDial.rotation.z=Math.PI/2;dragDial.position.set(.064,-.085,0);reel.add(dragDial);
for(let k=0;k<12;k++){const a=k*Math.PI/6,m=new T.Mesh(new T.SphereGeometry(.0015,6,4),chromeMat);m.position.set(.07,-.085+Math.cos(a)*.013,Math.sin(a)*.013);reel.add(m);}
for(const [mat,role]of[[blankMat,'blank'],[chromeMat,'trim'],[goldMat,'trim'],[darkMetal,'frame'],[gripMat,'grip'],[blueAno,'line']])mat.userData.tackleRole=role;
blueAno.roughness=.57;blueAno.metalness=0;blueAno.clearcoat=.15;
const pts=[]; for(let i=0;i<=NS;i++) pts.push(new T.Vector3());
const AX=new T.Vector3(1,0,0), AY=new T.Vector3(0,1,0), AZ=new T.Vector3(0,0,1);
const dir=new T.Vector3(), bdir=new T.Vector3(), tmp=new T.Vector3(), tmp2=new T.Vector3(), tan=new T.Vector3(), dn=new T.Vector3(), sd=new T.Vector3();
const basis=new T.Matrix4();
function rodAt(s,out){ const f=s*NS, i=Math.min(NS-1,Math.floor(f)); return out.copy(pts[i]).lerp(pts[i+1],f-i); }
/* ===== 真實釣竿模型 =====
   「Canna Da Pesca」by topfrank2013（Sketchfab，CC BY 4.0）：軟木握把、金屬捲線器、碳纖竿身與導環，比例跟真的釣竿一樣。
   做法（任何釣竿模型都適用，不需要骨架）：載入時把每個頂點換算成「在竿子上的位置 s、往捲線器那一側多遠、往旁邊多遠」存起來；
   畫的時候由頂點著色器照遊戲原本那條彎曲曲線（pts，越往竿尖越軟）把頂點擺回去。所以竿子怎麼彎、竿尖和導環在哪裡，跟原本完全一致，釣線也對得上。
   對位：握把尾端與竿身的中心連成中心線穿過手掌，捲線器腳對到手握的位置（s＝REEL_S），竿尖對到 s＝1。
   模型載入成功才把原本用圓柱拼的竿身、導環、捲線器藏起來；載不到或出錯就維持原樣 */
const realRod={ready:false,cont:null}, REEL_S=.185 /* 手握在竿子上的位置（原本竿子的前握把中段）：真實模型的捲線器座對到這裡，捲線器就在拳頭正下方 */, rodPtsU={value:[]}; for(let i=0;i<=NS;i++) rodPtsU.value.push(new T.Vector3());
if(T.GLTFLoader) new T.GLTFLoader().load('models/rod_real2.glb',g=>{ try{
  const root=g.scene, tmpG=new T.Group(); tmpG.add(root); tmpG.updateMatrixWorld(true);
  const meshes=[], V=[], v=new T.Vector3(); root.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.attributes.position){ meshes.push(o); const pa=o.geometry.attributes.position, st=Math.max(1,Math.floor(pa.count/3000)); for(let n=0;n<pa.count;n+=st) V.push(v.fromBufferAttribute(pa,n).applyMatrix4(o.matrixWorld).clone()); } });
  if(!meshes.length||V.length<100) return;
  // 1. 粗略的長軸：反覆把點投影到目前的方向上再加總（主成分），幾次就收斂
  const cm=new T.Vector3(); V.forEach(p=>cm.add(p)); cm.multiplyScalar(1/V.length); let A=new T.Vector3(1,.3,.2).normalize();
  for(let it=0;it<12;it++){ const n=new T.Vector3(); V.forEach(p=>{ const d=p.clone().sub(cm); n.addScaledVector(d,d.dot(A)); }); A=n.normalize(); }
  const proj=(O,Ax)=>{ let a=1e9,b=-1e9; const t=V.map(p=>{ const x=p.clone().sub(O).dot(Ax); a=Math.min(a,x); b=Math.max(b,x); return x; }); return [t,a,b]; };
  let [tv,tmin,tmax]=proj(cm,A), Lm=tmax-tmin; const rad=(p,t,O,Ax)=>p.clone().sub(O).addScaledVector(Ax,-t);
  // 2. 握把那一頭比較粗（還掛著捲線器）：比較兩端哪一半離軸最遠，把方向統一成「握把 → 竿尖」
  let rLo=0,rHi=0; V.forEach((p,n)=>{ const l=rad(p,tv[n],cm,A).length(); if(tv[n]<tmin+Lm*.5) rLo=Math.max(rLo,l); else rHi=Math.max(rHi,l); }); if(rHi>rLo){ A.negate(); [tv,tmin,tmax]=proj(cm,A); }
  // 3. 真正的中心線：握把尾端的中心 → 竿身中段（只取貼近軸的點，避開導環）的中心
  const cen=(a,b,rMax)=>{ const c=new T.Vector3(); let n=0; V.forEach((p,i)=>{ if(tv[i]>=a&&tv[i]<=b&&(rMax==null||rad(p,tv[i],cm,A).length()<rMax)){ c.add(p); n++; } }); return n>2?c.multiplyScalar(1/n):null; };
  const c0=cen(tmin,tmin+Lm*.03), c1=cen(tmin+Lm*.5,tmin+Lm*.85,Lm*.012)||cen(tmin+Lm*.5,tmin+Lm*.85); if(!c0||!c1) return;
  A=c1.clone().sub(c0).normalize(); [tv,tmin,tmax]=proj(c0,A); Lm=tmax-tmin;
  // 4. 捲線器：握把這一半裡離中心線最遠的那一點；它的方向就是「下方」，它在軸上的位置對到手握處
  let far=0,tReel=tmin+Lm*.12; const Dn=new T.Vector3(0,-1,0); V.forEach((p,n)=>{ if(tv[n]>tmin+Lm*.4) return; const d=rad(p,tv[n],c0,A), l=d.length(); if(l>far){ far=l; tReel=tv[n]; Dn.copy(d); } });
  Dn.addScaledVector(A,-Dn.dot(A)).normalize(); const Sd=new T.Vector3().crossVectors(A,Dn).normalize(), k=R_LEN*(1-REEL_S)/Math.max(1e-6,tmax-tReel);
  // 5. 把每個頂點改存成（s, 往下, 往旁）；法線也換到同一組方向
  const cont=new T.Group(), nm=new T.Matrix3(), nv=new T.Vector3();
  for(const o of meshes){ const src=o.geometry, pa=src.attributes.position, na=src.attributes.normal, geo=new T.BufferGeometry(), P=new Float32Array(pa.count*3), N=new Float32Array(pa.count*3); nm.getNormalMatrix(o.matrixWorld);
    for(let n=0;n<pa.count;n++){ v.fromBufferAttribute(pa,n).applyMatrix4(o.matrixWorld).sub(c0); const t=v.dot(A); P[n*3]=REEL_S+(t-tReel)*k/R_LEN; P[n*3+1]=(v.dot(Dn))*k; P[n*3+2]=(v.dot(Sd))*k;
      if(na){ nv.fromBufferAttribute(na,n).applyMatrix3(nm).normalize(); N[n*3]=nv.dot(A); N[n*3+1]=nv.dot(Dn); N[n*3+2]=nv.dot(Sd); } else N[n*3+1]=1; }
    geo.setAttribute('position',new T.BufferAttribute(P,3)); geo.setAttribute('normal',new T.BufferAttribute(N,3)); if(src.attributes.uv) geo.setAttribute('uv',src.attributes.uv); if(src.index) geo.setIndex(src.index);
    const mats=(Array.isArray(o.material)?o.material:[o.material]).map(m0=>{ const m=m0.clone(); if(m.map) m.map.anisotropy=8; if('envMapIntensity' in m) m.envMapIntensity=.45;
      m.onBeforeCompile=sh=>{ sh.uniforms.uRodPts=rodPtsU;
        sh.vertexShader='uniform vec3 uRodPts['+(NS+1)+'];\n'+sh.vertexShader
          .replace('#include <beginnormal_vertex>','float rS=clamp(position.x,0.0,1.0), rF=rS*'+NS+'.0; int rI=int(min('+(NS-1)+'.0,floor(rF)));\n vec3 rA=uRodPts[rI], rB=uRodPts[rI+1], rT=normalize(rB-rA);\n vec3 rC=mix(rA,rB,rF-float(rI))+rT*(position.x-rS)*'+R_LEN.toFixed(3)+';\n vec3 rDn=normalize(vec3(0.0,-1.0,0.0)+rT*rT.y), rSd=normalize(cross(rT,rDn));\n vec3 objectNormal=normalize(rT*normal.x+rDn*normal.y+rSd*normal.z);\n#ifdef USE_TANGENT\n vec3 objectTangent=normalize(rT*tangent.x+rDn*tangent.y+rSd*tangent.z);\n#endif')
          .replace('#include <begin_vertex>','vec3 transformed=rC+rDn*position.y+rSd*position.z;'); };
      m.customProgramCacheKey=()=>'realRodCurve'; m.needsUpdate=true; return m; });
    const mesh=new T.Mesh(geo,Array.isArray(o.material)?mats:mats[0]); mesh.frustumCulled=false; mesh.castShadow=false; mesh.receiveShadow=false; cont.add(mesh); }
  realRod.cont=cont; rodGroup.add(cont); realRod.ready=true;
  for(const m of segs) m.visible=false; for(const m of guides) m.visible=false; tipTop.visible=false; reel.visible=false;
}catch(e){ console.warn('real rod',e); } },undefined,()=>console.warn('real rod: load failed'));
function poseRealRod(){ if(!realRod.ready) return; for(let i=0;i<=NS;i++) rodPtsU.value[i].copy(pts[i]); }
function frameAt(s){ const i=Math.min(NS-1,Math.floor(s*NS)); tan.subVectors(pts[i+1],pts[i]).normalize(); dn.set(0,-1,0).addScaledVector(tan,tan.y).normalize(); sd.crossVectors(tan,dn).normalize(); }
function updateRod(dt){
  rod.pitch+=(rod.pitchT-rod.pitch)*Math.min(1,dt*9);
  rod.bend+=(rod.bendT-rod.bend)*Math.min(1,dt*7);
  dir.copy(R_DIR).applyAxisAngle(AX,rod.pitch).applyAxisAngle(AY,-rod.side*0.42);
  player.updateMatrixWorld(true);
  if(rod.end){ tmp.copy(rod.end); rodGroup.updateMatrixWorld(true); rodGroup.worldToLocal(tmp); tmp2.copy(R_BASE).addScaledVector(dir,R_LEN); bdir.subVectors(tmp,tmp2); }
  else bdir.set(0,-1,0);
  bdir.addScaledVector(dir,-bdir.dot(dir)); if(bdir.lengthSq()<1e-6) bdir.set(0,-1,0); bdir.normalize();
  const b=Math.max(0.035,rod.bend);
  // 竿身越往竿尖越軟：每一小段的彎曲角度隨位置平方增加，重魚時竿尖可以被拉成很深的弧（握把段幾乎不彎）
  pts[0].copy(R_BASE); { let x=0,y=0; const st=R_LEN/NS; for(let i=1;i<=NS;i++){ const s=(i-.5)/NS, th=Math.min(1.9,b*1.55*Math.pow(Math.max(0,s-.18)/.82,1.8)); x+=Math.cos(th)*st; y+=Math.sin(th)*st; pts[i].copy(R_BASE).addScaledVector(dir,x).addScaledVector(bdir,y); } }
  for(let i=0;i<NS;i++){ const a=pts[i], c=pts[i+1]; const m=segs[i]; m.position.addVectors(a,c).multiplyScalar(.5);
    tmp.subVectors(c,a); const L=tmp.length(); m.quaternion.setFromUnitVectors(AY,tmp.divideScalar(L)); m.scale.set(1,L,1); }
  GS.forEach((s,k)=>{ rodAt(s,tmp); frameAt(s); const g=guides[k]; g.position.copy(tmp).addScaledVector(dn,.008+.026*(1-s)); g.quaternion.setFromUnitVectors(AZ,tan);
    rod.guidesW[k].copy(g.position); rodGroup.localToWorld(rod.guidesW[k]); });
  tipTop.position.copy(pts[NS]); frameAt(.999); tipTop.quaternion.setFromUnitVectors(AZ,tan);
  rodAt(.125,tmp); frameAt(.125); basis.makeBasis(tan, tmp2.copy(dn).negate(), sd); reel.position.copy(tmp); reel.quaternion.setFromRotationMatrix(basis);
  crank.rotation.z=rod.spin;
  rod.tipW.copy(pts[NS]); rodGroup.localToWorld(rod.tipW);
  reel.updateMatrixWorld(true); rod.spoolW.set(.058,-.085,0); reel.localToWorld(rod.spoolW);
  rodGroup.updateMatrixWorld(true);
  try{ poseRealRod(); }catch(e){ /* 真實模型擺姿勢出錯：退回原本的竿子，不讓遊戲壞掉 */ console.warn('real rod pose',e); realRod.ready=false; if(realRod.cont) realRod.cont.visible=false; for(const m of segs) m.visible=true; for(const m of guides) m.visible=true; tipTop.visible=true; reel.visible=true; }
}

/* ---------- 釣線（固定像素寬度的帶狀網格） ---------- */
const LN=72, lpos=new Float32Array(LN*2*3), lidx=[];
for(let i=0;i<LN-1;i++){ const a=i*2; lidx.push(a,a+1,a+2, a+1,a+3,a+2); }
const lgeo=new T.BufferGeometry(); lgeo.setAttribute('position',new T.BufferAttribute(lpos,3)); lgeo.setIndex(lidx);
const lineMat=new T.MeshBasicMaterial({color:0xdfe6e8, transparent:true, opacity:.42, side:T.DoubleSide, depthWrite:false});   // 尼龍線是半透明的，只在反光處看得清楚
const lineMesh=new T.Mesh(lgeo,lineMat); lineMesh.frustumCulled=false; scene.add(lineMesh);
const LP=[]; for(let i=0;i<LN;i++) LP.push(new T.Vector3());
const camW=new T.Vector3(), lt=new T.Vector3(), lc=new T.Vector3(), ls=new T.Vector3();
function setLine(end, slack, visible, light, trem){
  lineMesh.visible=!!visible; if(!visible) return;
  let n=0; LP[n++].copy(rod.spoolW); for(const g of rod.guidesW) LP[n++].copy(g); LP[n++].copy(rod.tipW);
  const tip=rod.tipW, dist=tip.distanceTo(end), sag=slack*Math.min(dist,40)*0.12, NC=LN-n;
  // 繞障礙物的路徑很貴（每次要對每個障礙物做上百次檢查）：兩端移動不到 5 公分就沿用上一次的結果，最多每 0.25 秒重算；竿尖下垂掛的短線不繞路
  const nowR=typeof performance!=='undefined'?performance.now():Date.now(), LC=setLine.cache||(setLine.cache={t:-1e9,tip:tip.clone().set(1e9,0,0),end:end.clone().set(1e9,0,0),hit:false,path:null});
  let chordHit,path;
  if(dist<1.2){ chordHit=false; path=[tip,end]; }
  else if(LC.path&&LC.tip.distanceToSquared(tip)<4e-4&&LC.end.distanceToSquared(end)<.0025||(LC.path&&nowR-LC.t<250)){ chordHit=LC.hit; path=LC.hit?LC.path:[tip,end]; if(LC.hit){ path[0]=tip; path[path.length-1]=end; } }
  else { chordHit=!!PH.hit(tip,end,.025); path=chordHit?PH.route(tip,end):[tip,end]; LC.t=nowR; LC.tip.copy(tip); LC.end.copy(end); LC.hit=chordHit; LC.path=path; }
  const ctrl=tmp2.copy(tip).add(end).multiplyScalar(.5); ctrl.y-=sag*2;
  if(trem){ const tq=performance.now()*.001; ctrl.x+=Math.sin(tq*61)*trem; ctrl.y+=Math.sin(tq*47+1.3)*trem*.7; ctrl.z+=Math.cos(tq*53)*trem; }   // 繃緊的釣線細微顫動
  for(let i=1;i<=NC;i++){ const t=i/NC, a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t;
    if(path.length>2||chordHit){ const u=t*(path.length-1), j=Math.min(path.length-2,Math.floor(u)), k=u-j; LP[n++].set(lerp(path[j].x,path[j+1].x,k),lerp(path[j].y,path[j+1].y,k),lerp(path[j].z,path[j+1].z,k)); }
    else LP[n++].set(a*tip.x+b*ctrl.x+c*end.x, a*tip.y+b*ctrl.y+c*end.y, a*tip.z+b*ctrl.z+c*end.z); }
  if(path.length>2){ n=0; LP[n++].copy(rod.spoolW); for(const g of rod.guidesW) LP[n++].copy(g); LP[n++].copy(tip); for(let i=1;i<path.length&&n<LN;i++) LP[n++].copy(path[i]); }
  // A slack curve can touch a low branch even when its straight chord is clear.
  let curveBlocked=false; if(dist>=1.2&&(chordHit||sag>.05)) for(let i=rod.guidesW.length+2;i<n;i++) if(PH.hit(LP[i-1],LP[i],.025)){curveBlocked=true;break;}
  if(curveBlocked&&path.length===2&&!chordHit){const first=rod.guidesW.length+2, count=n-first;for(let i=0;i<count;i++)LP[first+i].copy(tip).lerp(end,(i+1)/count);}
  camera.getWorldPosition(camW);
  const pix=2*Math.tan(camera.fov*Math.PI/360)/Math.max(300,window.innerHeight);
  for(let i=0;i<n;i++){ const p=LP[i]; const pa=LP[Math.max(0,i-1)], pb=LP[Math.min(n-1,i+1)];
    lt.subVectors(pb,pa); lc.subVectors(camW,p); const d=lc.length(); ls.crossVectors(lt,lc); const L=ls.length()||1;
    const w=Math.max(.0006,d*pix*1.25)*.5; ls.multiplyScalar(w/L);
    lpos[i*6]=p.x-ls.x; lpos[i*6+1]=p.y-ls.y; lpos[i*6+2]=p.z-ls.z; lpos[i*6+3]=p.x+ls.x; lpos[i*6+4]=p.y+ls.y; lpos[i*6+5]=p.z+ls.z; }
  lgeo.attributes.position.needsUpdate=true; lgeo.setDrawRange(0,(n-1)*6);
  const k=clamp(light,.12,1); lineMat.color.setRGB(.8*k,.86*k,.88*k);
}

/* ---------- 浮標：照真實的磯釣棒浮標做——輕木紡錘形浮身、上段螢光漆、下段深色、細長的天線（彩色刻度）、
   頂端夜光珠、底部金屬轉環；亮光漆有清漆反光。原點在水線：水面上只露出天線和浮身最上面一小截 ---------- */
const bobber=new T.Group(); bobber.userData.isBobber=true; scene.add(bobber);
const FLOAT_PROFILE=[[0,-.095],[.0035,-.095],[.004,-.08],[.009,-.06],[.019,-.035],[.026,-.01],[.028,.006],[.025,.022],[.017,.038],[.009,.05],[.0045,.058],[.0042,.062]];
const floatTex=(()=>{ const cv=document.createElement('canvas'); cv.width=8; cv.height=256; const g=cv.getContext('2d');
  // 由下到上：深墨綠浮腳、金色細線、黑色底漆、水線上方螢光橘
  const bands=[[0,.18,'#1d2a22'],[.18,.2,'#c9a24a'],[.2,.58,'#141414'],[.58,.6,'#e8d27a'],[.6,1,'#ff4a12']];
  bands.forEach(([a,b,c])=>{ g.fillStyle=c; g.fillRect(0,(1-b)*256,8,(b-a)*256); }); const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; })();
const bTopMat=new T.MeshPhysicalMaterial({map:floatTex,roughness:.32,clearcoat:1,clearcoatRoughness:.08});
const bBotMat=bTopMat;
const tipMat=new T.MeshStandardMaterial({color:0xfff080, emissive:0xffb020, emissiveIntensity:0, roughness:.25});
{ const body=new T.Mesh(new T.LatheGeometry(FLOAT_PROFILE.map(([r,y])=>new T.Vector2(r,y)),28),bTopMat); bobber.add(body);
  // 天線：一節一節的彩色刻度（橘、黃綠、橘、白），浮標在水面上下時看得出吃水
  const segs=[['#ff3b10',.03],['#d8ff2a',.025],['#ff3b10',.025],['#f4f4f0',.02],['#ff3b10',.025]]; let y=.06;
  segs.forEach(([c,h])=>{ const m=new T.Mesh(new T.CylinderGeometry(.0034,.0036,h,12),new T.MeshPhysicalMaterial({color:new T.Color(c),roughness:.3,clearcoat:1,clearcoatRoughness:.1})); m.userData.floatAntenna=true;m.position.y=y+h/2; bobber.add(m); y+=h; });
  const tp=new T.Mesh(new T.SphereGeometry(.0055,14,10),tipMat); tp.position.y=y+.003; bobber.add(tp);
  const ring=new T.Mesh(new T.TorusGeometry(.0045,.0012,8,16),new T.MeshStandardMaterial({color:0xb8b8b8,metalness:.9,roughness:.25})); ring.position.y=-.1; ring.rotation.y=Math.PI/2; bobber.add(ring); }
window.__FLOAT_PROFILE=FLOAT_PROFILE;
bobber.scale.setScalar(2.0);

/* ---------- 水花粒子 ---------- */
const MAXP=500, pPos=new Float32Array(MAXP*3), pLife=new Float32Array(MAXP), pSize=new Float32Array(MAXP), pVel=new Float32Array(MAXP*3), pMax=new Float32Array(MAXP);
const pgeo=new T.BufferGeometry(); pgeo.setAttribute('position',new T.BufferAttribute(pPos,3)); pgeo.setAttribute('aLife',new T.BufferAttribute(pLife,1)); pgeo.setAttribute('aSize',new T.BufferAttribute(pSize,1));
const pU={uScale:{value:800}, uCol:{value:new T.Color(1,1,1)}};
const pts3=new T.Points(pgeo,new T.ShaderMaterial({uniforms:pU, vertexShader:SH.ptsVS, fragmentShader:SH.ptsFS, transparent:true, depthWrite:false}));
pts3.frustumCulled=false; scene.add(pts3);
let pCur=0;
// dx,dz（可省略）：甩尾的方向，水花順著那個方向噴成一道弧，而不是原地往上一團
function splash(x,y,z,n,pw,dx,dz){ n=Math.ceil(n*(window.__effectBudget?.particleScale??1)); const dl=dx||dz?Math.hypot(dx,dz):0; for(let k=0;k<n;k++){ const i=pCur; pCur=(pCur+1)%MAXP; const a=dl?Math.atan2(dz,dx)+(Math.random()-.5)*1.1:Math.random()*6.283, sp=(.25+Math.random())*pw*(dl?2.1:1);
  pPos[i*3]=x+Math.cos(a)*.05; pPos[i*3+1]=y+.01; pPos[i*3+2]=z+Math.sin(a)*.05;
  pVel[i*3]=Math.cos(a)*sp*.9; pVel[i*3+1]=(1.2+Math.random()*2.6)*pw; pVel[i*3+2]=Math.sin(a)*sp*.9;
  pMax[i]=.45+Math.random()*.7; pLife[i]=1; pSize[i]=.01+Math.random()*.028*Math.min(pw,1.6); } }
function updateFx(dt, light){
  for(let i=0;i<MAXP;i++){ if(pLife[i]<=0) continue; pVel[i*3+1]-=9.8*dt;
    pPos[i*3]+=pVel[i*3]*dt; pPos[i*3+1]+=pVel[i*3+1]*dt; pPos[i*3+2]+=pVel[i*3+2]*dt;
    pLife[i]-=dt/pMax[i]; if(pPos[i*3+1]<-.02&&pVel[i*3+1]<0) pLife[i]=0; if(pLife[i]<0) pLife[i]=0; }
  pgeo.attributes.position.needsUpdate=true; pgeo.attributes.aLife.needsUpdate=true;
  const k=clamp(light,.15,1); pU.uCol.value.setRGB(.85*k,.9*k,.92*k);
  pU.uScale.value=window.innerHeight*W.getPR()/(2*Math.tan(camera.fov*Math.PI/360));
  tipMat.emissiveIntensity=(1-W.info.day)*3.5;
}

/* ---------- 魚影 ---------- */
const shTex=dataTex(64,32,(u,v,o)=>{ const x=u*2-1, y=v*2-1; const wdt=.42*(1-.55*Math.max(0,-x))+.06; const d=x*x+(y/wdt)*(y/wdt);
  o[0]=o[1]=o[2]=0; o[3]=255*(1-sstep(.35,1,d)); },false);
const shadow=new T.Mesh(new T.PlaneGeometry(1,.4).rotateX(-Math.PI/2), new T.MeshBasicMaterial({map:shTex, color:0x000000, transparent:true, opacity:0, depthWrite:false}));
shadow.position.y=.012; shadow.renderOrder=2; scene.add(shadow);

/* ---------- 魚種 ---------- */
const RAR=[
 {name:'普通', en:'COMMON', col:'#b9c2c8', w:60, mult:1},
 {name:'稀有', en:'RARE', col:'#4aa3ff', w:26, mult:2.2},
 {name:'史詩', en:'EPIC', col:'#b26cff', w:10, mult:4.5},
 {name:'傳說', en:'LEGENDARY', col:'#ffb12b', w:3, mult:9},
 {name:'神話', en:'MYTHICAL', col:'#ff4f6d', w:1, mult:20},
 {name:'幻想', en:'FANTASY', col:'#5ef2ff', w:1.2, mult:15}];
const BASS_D=[[-.3,0],[-.25,.1],[-.12,.09],[-.04,.04],[.04,.09],[.16,.08],[.22,0]], BASS_A=[[-.3,0],[-.24,.08],[-.13,.06],[-.08,0]];
const SPECIES=[
 /* ---------- 月光灣專屬：通往大海的潟湖，滿月漲潮時海水魚會游進來（依玩家設定圖生成）---------- */
 {id:'clownfish',spots:['moon'],name:'公子小丑魚',sci:'Amphiprion ocellaris',rar:0,lvl:[10, 25],len:[5, 11],k:20,price:511,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#e86a1a',flank:'#f08a2a',belly:'#f8c070',fin:'#e86a1a',eye:'#202020'},pat:{t:'bars',n:3,k:.9,c:'#ffffff'},scale:1,metal:.3,
  f:{pow:.6,spd:.9,agi:1.3,jump:0,stam:.7,win:1.1},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'橘色魚身配三條白帶。原本住在海葵裡，滿月漲潮時被海水帶進潟湖，躲在月光灣的水草間。'},
 {id:'bluetang',spots:['moon'],name:'擬刺尾鯛',sci:'Paracanthurus hepatus',rar:1,lvl:[20, 40],len:[12, 31],k:22,price:300,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#1a3ad8',flank:'#2a5aff',belly:'#8aa8ff',fin:'#f0d020',eye:'#202020'},pat:{t:'band',k:.8},scale:1,metal:.3,
  f:{pow:.9,spd:1.3,agi:1.3,jump:.05,stam:1,win:0.9},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'寶藍色魚身、黑色花紋、黃色尾鰭。尾柄有一對像刀片的硬棘，拿的時候要小心。'},
 {id:'prawn',spots:['dock','wood'],name:'泰國蝦',sci:'Macrobrachium rosenbergii（羅氏沼蝦）',rar:2,lvl:[10, 40],len:[12, 30],k:24,price:32,crust:true,
  sh:{H:.12,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.05],[.15,.05],[.2,0]],anal:[[-.3,0],[-.25,.04],[-.05,0]]},
  col:{back:'#6a8090',flank:'#9ab0c0',belly:'#e8eef0',fin:'#2f58c8',eye:'#202020'},pat:{t:'band',k:.5},scale:1,metal:.2,
  f:{pow:0.5,spd:.55,agi:1.1,jump:0,stam:.7,win:0.9},time:{dawn:1,day:.5,dusk:1.4,night:1.8},desc:'泰國蝦（羅氏沼蝦），兩隻細長的藍色大螯比身體還長。咬餌不會一口吞：先用螯抱住餌慢慢拖走，浮標會一點一點橫移，等牠停下來開始吃才揚竿。太早拉會只抓到空鉤，太晚又被牠吐掉，釣蝦場的老手都在比這個時機。'},
 {id:'scat',spots:['moon'],name:'變身苦',sci:'Scatophagus argus',rar:1,lvl:[14, 36],len:[15, 35],k:24,price:45,tide:true,water:'sea',
  sh:{H:.2,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.1],[.15,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.05,0]]},
  col:{back:'#6a7040',flank:'#b8b888',belly:'#e8e4d0',fin:'#c8c098',eye:'#c8a030'},pat:{t:'spots',n:30,d:.7,r:.16,k:.85,c:'#2a2418'},scale:1,metal:.3,
  f:{pow:1.2,spd:1.1,agi:1.6,jump:0,stam:1.1,win:0.95},time:{dawn:1.2,day:1.1,dusk:1.2,night:.6},desc:'金錢魚，身上一顆顆黑點像銅錢，也有人叫牠富貴魚。台語俗諺「一魟、二虎、三沙毛、四臭肚、五變身苦」：背鰭硬棘有毒，被刺到痛得要命。個頭不大卻很會鑽，力氣比看起來大。'},
 {id:'tarpon',spots:['moon'],name:'大眼海鰱',sci:'Megalops cyprinoides',rar:2,lvl:[24, 50],len:[25, 90],k:9,price:11,tide:true,water:'sea',
  sh:{H:.2,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.1],[.15,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.05,0]]},
  col:{back:'#2a5a50',flank:'#d8e0e0',belly:'#f4f6f6',fin:'#c8b070',eye:'#d0b040'},pat:{t:'plain'},scale:1,metal:.6,
  f:{pow:1.5,spd:1.9,agi:1.6,jump:.6,stam:1.3,win:0.65},time:{dawn:1.4,day:.7,dusk:1.4,night:1},desc:'一雙大眼睛、全身大片銀鱗，背鰭最後拉成一根長絲。路亞釣友口中的「跳跳魚」：中魚就連續躍出水面甩頭，嘴巴骨質很硬、鉤子不容易刺進去，十條跑掉七條是常事。刺多肉少，市場上不值錢，釣的是那股瘋勁。'},
 {id:'rabbit',spots:['moon'],name:'星點臭肚',sci:'Siganus guttatus',rar:1,lvl:[12, 34],len:[15, 40],k:20,price:55,tide:true,water:'sea',
  sh:{H:.2,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.1],[.15,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.05,0]]},
  col:{back:'#8a8a40',flank:'#c8b860',belly:'#e8e0b8',fin:'#e8c030',eye:'#c08020'},pat:{t:'spots',n:60,d:.8,r:.1,k:.8,c:'#e07020'},scale:1,metal:.3,
  f:{pow:1.1,spd:1.2,agi:1.4,jump:0,stam:1.2,win:0.95},time:{dawn:1.2,day:1.3,dusk:1,night:.4},desc:'點籃子魚，全身橘點，背鰭下方一塊大黃斑。吃海藻的魚，咬餌很輕、常常只是啄一下就跑，要很專心看浮標。鰭棘有毒，就是台語「四臭肚」說的那種，拿的時候小心。'},
 {id:'blenny',spots:['moon'],name:'鬚鳚',sci:'Blenniidae（鳚科）',rar:1,lvl:[18, 38],len:[12, 30],k:8,price:99,tide:true,water:'sea',
  sh:{H:.1,W:.06,prof:1.5,eyeT:.88,eye:.03,tail:.18,fork:0,dorsal:[[-.36,0],[-.33,.08],[.25,.08],[.28,0]],anal:[[-.36,0],[-.33,.06],[0,.06],[.02,0]]},
  col:{back:'#6a5a40',flank:'#c8b898',belly:'#ece4d8',fin:'#d8c8a8',eye:'#c08030'},pat:{t:'spots',n:16,d:.3,r:.3,k:.7,c:'#3a2a1a'},scale:1,metal:.3,
  f:{pow:.8,spd:.9,agi:1.4,jump:0,stam:.9,win:1.1},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'頭上長著鬚狀突起，背鰭和臀鰭又長又密。白天藏在石縫裡，月光下才出來覓食。'},
 {id:'angelfish',spots:['moon'],name:'神仙魚',sci:'Pterophyllum scalare',rar:1,lvl:[15, 35],len:[8, 18],k:30,price:67,
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#8a8050',flank:'#d8d8c8',belly:'#f0f0e8',fin:'#c8c8b8',eye:'#c03020'},pat:{t:'bars',n:4,k:.85,c:'#1a1a14'},scale:1,metal:.3,
  f:{pow:.6,spd:.8,agi:1.2,jump:0,stam:.7,win:1.1},time:{dawn:.8,day:.6,dusk:1.2,night:1.5},desc:'高大的三角形身體、黑色直條紋、長長的腹鰭。月光灣裡唯一土生土長的淡水觀賞魚。'},
 {id:'copperband',spots:['moon'],name:'長吻蝴蝶魚',sci:'Chelmon rostratus',rar:2,lvl:[25, 45],len:[10, 20],k:25,price:158,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#d8a020',flank:'#f0f0e8',belly:'#f8f4ec',fin:'#f0c020',eye:'#202020'},pat:{t:'bars',n:4,k:.8,c:'#e08020'},scale:1,metal:.3,
  f:{pow:.6,spd:.9,agi:1.4,jump:0,stam:.7,win:1.1},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'橘白相間的直條紋，背鰭上有一個假眼斑。用細長的吻部伸進石縫裡夾食物。'},
 {id:'threadfin',spots:['moon'],name:'絲鰺',sci:'Alectis ciliaris',rar:2,lvl:[35, 60],len:[40, 130],k:10,price:35,tide:true,water:'sea',
  sh:{H:.3,W:.07,prof:1.2,eyeT:.84,eye:.034,tail:.2,fork:.2,dorsal:[[-.3,0],[-.25,.14],[.12,.12],[.2,0]],anal:[[-.3,0],[-.25,.1],[-.1,0]]},
  col:{back:'#4a6a7a',flank:'#c8d4dc',belly:'#eef2f4',fin:'#3a4a5a',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.3,
  f:{pow:1.7,spd:1.6,agi:1.1,jump:.2,stam:1.4,win:0.9},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'銀色側扁的身體，背鰭和臀鰭拖著長長的細絲，在月光下像一面飄動的旗子。'},
 {id:'seahorse',spots:['moon'],name:'海馬',sci:'Hippocampus kuda',rar:3,lvl:[30, 60],len:[10, 30],k:6,price:0,tide:true,water:'sea',noSell:true,
  sh:{H:.14,W:.08,prof:1.4,eyeT:.86,eye:.03,tail:.1,fork:0,dorsal:[[-.1,0],[-.05,.06],[.05,0]],anal:[[-.3,0],[-.28,.02],[-.26,0]]},
  col:{back:'#a88030',flank:'#d8b050',belly:'#e8d090',fin:'#f0e8d0',eye:'#202020'},pat:{t:'spots',n:12,d:.2,r:.2,k:.6,c:'#4a3010'},scale:1,metal:.3,
  f:{pow:.3,spd:.3,agi:.6,jump:0,stam:.5,win:1.2},time:{dawn:.6,day:.15,dusk:.9,night:2},desc:'直立游動、尾巴會捲住水草。全球保育類（華盛頓公約附錄二），釣到只能拍照後放流。'},
 {id:'seabeast',spots:['moon'],name:'神話海馬獸',sci:'Hippocampus draconis（幻想）',rar:5,lvl:[90, 99],len:[180, 260],k:3,price:120,water:'sea',special:'seabeast',
  sh:{H:.08,W:.06,prof:1.6,eyeT:.9,eye:.02,tail:.24,fork:0,dorsal:[[-.3,0],[-.2,.12],[.3,.12],[.35,0]],anal:[[-.3,0],[-.25,.05],[-.1,0]]},
  col:{back:'#2a5a8a',flank:'#8ab0c8',belly:'#e8e0c8',fin:'#5a8ad8',eye:'#c09030'},pat:{t:'plain'},scale:1,metal:.3,
  f:{pow:2.6,spd:2,agi:1.6,jump:.6,stam:2.6,win:.8},time:{dawn:0,day:0,dusk:.3,night:2},desc:'頭長鹿角、身披藍金色長鰭的海中神獸。傳說只在滿月深夜，順著潮水游進月光灣。'},
 /* ---------- 最後一批（依玩家重畫的設定圖生成）---------- */
 {id:'eel',loc:'lake',spots:['wood'],name:'鱸鰻',sci:'Anguilla marmorata',rar:3,lvl:[35, 60],len:[60, 180],k:2.2,price:120,
  sh:{H:.07,W:.06,prof:1.7,eyeT:.92,eye:.016,tail:.1,fork:0,dorsal:[[-.4,0],[-.38,.04],[.1,.04],[.12,0]],anal:[[-.4,0],[-.38,.03],[-.05,.03],[-.03,0]]},
  col:{back:'#3a3018',flank:'#8a7838',belly:'#e8e0c8',fin:'#4a3a20',eye:'#c09030'},pat:{t:'mottle',k:.7},scale:1,metal:.35,
  f:{pow:2.2,spd:1,agi:1.3,jump:0,stam:2.0,win:0.85},time:{dawn:.8,day:.3,dusk:1.3,night:1.9},desc:'黃褐色大理石斑紋的巨大鰻魚，白天藏在倒木洞裡，夜裡才出來獵食。中魚後會死命往洞裡鑽。'},
 {id:'mekong',loc:'lake',spots:['deep'],name:'湄公河巨鯰',sci:'Pangasianodon gigas',rar:4,lvl:[65, 90],len:[120, 300],k:9,price:18,
  sh:{H:.15,W:.08,prof:1.4,eyeT:.9,eye:.018,tail:.2,fork:.7,dorsal:[[-.05,0],[0,.12],[.06,.1],[.1,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#3a3e42',flank:'#8a9096',belly:'#ece8e4',fin:'#6a5a5a',eye:'#2a2a2a'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.6,spd:1,agi:.7,jump:0,stam:2.6,win:1.0},time:{dawn:1,day:1.2,dusk:1.3,night:.8},desc:'世界最大的淡水魚之一，成魚幾乎沒有鬚、眼睛長得很低。只吃藻類和植物，卻有驚人的力氣。'},
 {id:'yperch',loc:'ice',spots:['ice'],name:'黃金鱸',sci:'Perca flavescens',rar:0,lvl:[10, 25],len:[12, 38],k:14,price:72,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#4a4a1a',flank:'#d8c040',belly:'#f0ecd8',fin:'#e86a2a',eye:'#c09030'},pat:{t:'bars',n:7,k:.7,c:'#2a2a10'},scale:1,metal:.35,
  f:{pow:.8,spd:1,agi:1.2,jump:.05,stam:.8,win:1.05},time:{dawn:1.3,day:1.2,dusk:1.2,night:.4},desc:'金黃色魚身、6～8 條黑色直條紋，魚鰭橘紅。冬天在冰下成群活動，是冰釣最常見的魚。'},
 {id:'whitefish',loc:'ice',spots:['ice'],name:'白鮭',sci:'Coregonus clupeaformis',rar:0,lvl:[12, 30],len:[25, 65],k:11,price:177,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#5a5a4a',flank:'#c8ccc8',belly:'#f2f2f0',fin:'#8a8a84',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1,spd:1.1,agi:1,jump:.1,stam:1,win:0.85},time:{dawn:1.1,day:1.3,dusk:1,night:.5},desc:'全身銀白沒有斑點，頭小、嘴巴小且朝下，在湖底吸食小蟲。肉質細緻，是北方湖泊的重要漁獲。'},
 {id:'laketrout',loc:'ice',spots:['ice'],name:'湖紅點鮭',sci:'Salvelinus namaycush',rar:1,lvl:[25, 55],len:[40, 110],k:9.5,price:166,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#3a4030',flank:'#7a7e64',belly:'#ece8dc',fin:'#c87a3a',eye:'#c09030'},pat:{t:'spots',n:16,d:.25,r:.25,k:.6,c:'#e8dcb0'},scale:1,metal:.35,
  f:{pow:1.7,spd:1.3,agi:1,jump:.1,stam:1.8,win:1.0},time:{dawn:1.4,day:.9,dusk:1.4,night:.6},desc:'灰綠色身體佈滿淡黃色斑點，尾鰭深分叉。喜歡冰冷的深水，中魚後會一直往湖底拉。'},
 {id:'taimen',loc:'ice',spots:['ice'],name:'哲羅鮭',sci:'Hucho taimen',rar:3,lvl:[55, 85],len:[70, 180],k:9,price:64,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#4a4436',flank:'#9a8a78',belly:'#ece4dc',fin:'#b85a4a',eye:'#c09030'},pat:{t:'spots',n:14,d:.2,r:.2,k:.7,c:'#1a1a14'},scale:1,metal:.35,
  f:{pow:2.2,spd:1.6,agi:1.1,jump:.3,stam:2,win:0.9},time:{dawn:1.2,day:.7,dusk:1.6,night:1},desc:'世界最大的鮭魚，被稱為「河中之狼」。頭部寬大、尾鰭泛紅，連水鼠和鴨子都會獵食。'},
 {id:'gt',loc:'sea',spots:['reef'],name:'浪人鰺',sci:'Caranx ignobilis',rar:3,lvl:[45, 70],len:[50, 170],k:13,price:26,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.9,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#2a2e34',flank:'#9aa0a8',belly:'#eef0f2',fin:'#3a3e44',eye:'#c09030'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.8,spd:1.8,agi:1.1,jump:.05,stam:2.4,win:0.75},time:{dawn:1.5,day:1,dusk:1.5,night:.6},desc:'頭部陡峭像斷崖，礁岩區的頂級掠食者。中魚後會全力衝進礁岩割線，是路亞釣客的終極目標。'},
 {id:'swordfish',loc:'sea',spots:['blue'],name:'劍旗魚',sci:'Xiphias gladius',rar:4,lvl:[70, 95],len:[150, 450],k:4.5,price:26,
  sh:{H:.12,W:.08,prof:1.4,eyeT:.82,eye:.024,tail:.28,fork:.95,snout:1.2,dorsal:[[.05,0],[.1,.14],[.16,.03],[.18,0]],anal:[[-.28,0],[-.24,.06],[-.18,0]]},
  col:{back:'#1a1e2e',flank:'#6a7080',belly:'#e8eaee',fin:'#2a2e3a',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.7,spd:2.2,agi:1,jump:.6,stam:2.6,win:0.75},time:{dawn:.8,day:.5,dusk:1.3,night:1.8},desc:'又寬又扁的劍狀上顎能劈砍獵物，沒有腹鰭。白天潛到深海，夜裡才浮上來覓食。'},
 /* ---------- 冰湖、近海礁岩、遠洋深藍專屬（依玩家設定圖生成）---------- */
 {id:'char',loc:'ice',spots:['ice'],name:'北極紅點鮭',sci:'Salvelinus alpinus',rar:2,lvl:[30, 60],len:[30, 80],k:10,price:105,
  sh:{H:.15,W:.065,prof:1.4,eyeT:.88,eye:.026,tail:.2,fork:.4,dorsal:[[-.05,0],[0,.11],[.08,.09],[.12,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#2e3428',flank:'#6a6a50',belly:'#e8603a',fin:'#d85a3a',eye:'#c09030'},pat:{t:'spots',n:14,d:.25,r:.25,k:.5,c:'#e8d8c0'},scale:1,metal:.35,
  f:{pow:1.4,spd:1.5,agi:1.2,jump:.3,stam:1.3,win:0.95},time:{dawn:1.4,day:.9,dusk:1.4,night:.6},desc:'背部深綠、腹部和魚鰭鮮紅，魚鰭鑲白邊。只生活在冰冷清澈的湖水裡，冬天的紅腹最漂亮。'},
 {id:'burbot',loc:'ice',spots:['ice'],name:'江鱈',sci:'Lota lota',rar:1,lvl:[20, 45],len:[30, 90],k:6,price:75,
  sh:{H:.12,W:.07,prof:1.6,eyeT:.9,eye:.022,tail:.16,fork:0,barbels:1,dorsal:[[-.36,0],[-.33,.06],[.05,.06],[.08,0]],anal:[[-.36,0],[-.33,.05],[-.02,.05],[0,0]]},
  col:{back:'#4a3e22',flank:'#8a7444',belly:'#ece2c8',fin:'#5a4a2a',eye:'#2a2010'},pat:{t:'mottle',k:.55},scale:1,metal:.35,
  f:{pow:1.0,spd:.8,agi:.8,jump:0,stam:1.2,win:1.1},time:{dawn:.8,day:.4,dusk:1.2,night:1.9},desc:'淡水裡唯一的鱈魚，下巴一根鬚、第二背鰭很長。最冷的冬夜最活躍，會在冰下產卵。'},
 {id:'porgy',loc:'sea',spots:['reef'],name:'黑鯛',sci:'Acanthopagrus schlegelii',rar:0,lvl:[18, 30],len:[20, 50],k:18,price:183,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#2a2c30',flank:'#8a8e94',belly:'#e4e6e8',fin:'#3a3c40',eye:'#c09040'},pat:{t:'bars',n:6,k:.35,c:'#2a2c30'},scale:1,metal:.35,
  f:{pow:1.4,spd:1.1,agi:1.2,jump:.05,stam:1.1,win:0.9},time:{dawn:1.4,day:.9,dusk:1.4,night:.8},desc:'銀黑色、體高、背鰭硬棘尖銳。在礁岩縫隙找螃蟹貝類，中魚後會往岩縫裡衝。'},
 {id:'parrot',loc:'sea',spots:['reef'],name:'鸚哥魚',sci:'Scarus ghobban',rar:0,lvl:[16, 28],len:[25, 75],k:13,price:147,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#2a8a8a',flank:'#5ac0b0',belly:'#d8e8e4',fin:'#3a7ad8',eye:'#c09040'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1.2,spd:1.1,agi:1.2,jump:.05,stam:1,win:1.0},time:{dawn:1,day:1.4,dusk:.8,night:.15},desc:'藍綠色大鱗片、嘴巴像鳥喙，啃食珊瑚上的藻類。夜裡會吐黏液包住自己睡覺。'},
 {id:'redbream',loc:'sea',spots:['reef'],name:'真鯛',sci:'Pagrus major',rar:1,lvl:[22, 38],len:[25, 90],k:15,price:123,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#c84a4a',flank:'#e8908a',belly:'#f4e4e0',fin:'#e06060',eye:'#c08030'},pat:{t:'spots',n:16,d:.15,r:.2,k:.4,c:'#6ab0e8'},scale:1,metal:.35,
  f:{pow:1.6,spd:1.2,agi:1,jump:.05,stam:1.3,win:0.95},time:{dawn:1.4,day:1,dusk:1.3,night:.6},desc:'粉紅色魚身散布藍色小點，日本稱為「魚中之王」。中魚後會分好幾段往下衝。'},
 {id:'emperor',loc:'sea',spots:['reef'],name:'青嘴龍占',sci:'Lethrinus nebulosus',rar:1,lvl:[22, 36],len:[30, 86],k:14,price:137,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#3a6a6a',flank:'#a8b890',belly:'#e8ecdc',fin:'#d8c040',eye:'#c08030'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1.7,spd:1.4,agi:1.1,jump:.05,stam:1.3,win:0.85},time:{dawn:1,day:.8,dusk:1.4,night:1.3},desc:'嘴唇和臉頰泛藍色，魚鰭帶黃色。夜裡離開礁岩到沙地覓食，拉力強勁。'},
 {id:'hardclam',loc:'tide',name:'文蛤',sci:'Meretrix lusoria',rar:1,lvl:[1,10],len:[4, 9],k:600,price:14,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#d9c7a6',flank:'#c8b08a',belly:'#efe4d0',fin:'#a08060',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'台灣潮間帶最有名的貝類，殼上的鋸齒紋每顆都不一樣。泥面上會噴水的小圓孔底下就是牠。'},
 {id:'gomphina',loc:'tide',name:'赤嘴蛤',sci:'Gomphina aequilatera',rar:2,lvl:[1,10],len:[3, 6],k:650,price:4,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#d8d2c8',flank:'#b08a80',belly:'#efe8e0',fin:'#8a5a60',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'殼緣帶一圈紅紫色。牠的入水管和出水管在泥面留下鑰匙孔一樣的兩個小洞。'},
 {id:'tellin',loc:'tide',name:'海瓜子',sci:'Moerella iridescens',rar:1,lvl:[1,10],len:[1.5, 3],k:300,price:1,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#f0b8a0',flank:'#e8a890',belly:'#f8e0d0',fin:'#d08070',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'殼又薄又透、帶著虹彩，像瓜子一樣小。挖的時候要非常輕，不然一下就碎。'},
 {id:'razor',loc:'tide',name:'竹蟶',sci:'Solen strictus',rar:2,lvl:[1,10],len:[7, 13],k:120,price:14,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#c8a060',flank:'#b89050',belly:'#e8d8b0',fin:'#a07840',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'直直地埋在泥裡，一受驚就往深處縮。泥面上細長的凹痕是牠的位置。'},
 {id:'ghostcrab',loc:'tide',name:'沙蟹',sci:'Ocypode ceratophthalmus',rar:2,lvl:[1,10],len:[4, 7],k:150,price:1,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#d8c8a0',flank:'#c8b890',belly:'#efe6d0',fin:'#b0a080',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1.3,day:.7,dusk:1.3,night:1.5},desc:'眼睛上長著小角，跑得非常快。洞口有一堆新沙的就是牠家，挖太慢會從另一頭溜走。'},
 {id:'ragworm',loc:'tide',name:'沙蠶',sci:'Perinereis aibuhitensis',rar:1,lvl:[1,10],len:[10, 20],k:8,price:20,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#a05040',flank:'#806040',belly:'#c08060',fin:'#c09070',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'身上有虹彩光澤的多毛類。泥面上盤繞的泥條是牠的排遺，是很好的魚餌。'},
 {id:'fiddler',loc:'tide',name:'招潮蟹',sci:'Uca arcuata',rar:1,lvl:[1,10],len:[2, 4],k:300,price:1,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#305060',flank:'#d05030',belly:'#e0c0a0',fin:'#c06040',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'雄蟹有一隻特別大的橘紅色螯，退潮時會在洞口揮舞。'},
 {id:'mudskip',loc:'tide',name:'彈塗魚',sci:'Periophthalmus modestus',rar:1,lvl:[1,10],len:[6, 12],k:10,price:2,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#706048',flank:'#a09070',belly:'#d8ccb0',fin:'#806850',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'會離開水在泥灘上爬跳的魚，大眼睛長在頭頂。'},
 {id:'hermit',loc:'tide',name:'寄居蟹',sci:'Coenobita rugosus',rar:1,lvl:[1,10],len:[2, 5],k:400,price:38,
  sh:{H:.3,W:.2,prof:1,eyeT:.8,eye:.01,tail:.05,fork:0,dorsal:[[0,0],[.1,0]],anal:[[0,0],[.1,0]]},
  col:{back:'#c8b090',flank:'#d06030',belly:'#e8c8a0',fin:'#c05030',eye:'#000'},pat:{t:'band',k:.1},scale:1,metal:.2,
  f:{pow:.3,spd:.3,agi:.3,jump:0,stam:.3,win:1},time:{dawn:1,day:1,dusk:1,night:1},desc:'背著撿來的螺殼過日子，長大了就換一個更大的殼。'},
 {id:'cobia',loc:'sea',spots:['reef'],name:'海鱺',sci:'Rachycentron canadum',rar:2,lvl:[32, 50],len:[60, 180],k:6.5,price:59,
  sh:{H:.13,W:.08,prof:1.5,eyeT:.88,eye:.024,tail:.22,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#3a2a1a',flank:'#7a6448',belly:'#ece6dc',fin:'#3a2e22',eye:'#a08030'},pat:{t:'band',k:.7},scale:1,metal:.35,
  f:{pow:2.0,spd:1.5,agi:1,jump:.15,stam:2.0,win:1.0},time:{dawn:1,day:1.3,dusk:1.1,night:.6},desc:'深褐色細長身體、頭部扁平像鯊魚，身側一條白色縱帶。常跟著大魚或漂流物游動。'},
 {id:'barracuda',loc:'sea',spots:['reef'],name:'巴拉金梭魚',sci:'Sphyraena barracuda',rar:2,lvl:[34, 55],len:[80, 180],k:5.5,price:40,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#3e5250',flank:'#b9c4c4',belly:'#eef2f2',fin:'#5a6464',eye:'#c8a040'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.0,spd:2.5,agi:1.6,jump:.35,stam:1.6,win:0.7},time:{dawn:1.1,day:1.2,dusk:1.3,night:.6},desc:'銀色魚雷般的身體，下顎突出、滿口尖牙。爆發力驚人，咬餌後會猛然衝刺。'},
 {id:'lobster',loc:'sea',spots:['reef'],name:'龍蝦',sci:'Panulirus ornatus（錦繡龍蝦）',rar:3,lvl:[40, 70],len:[20, 50],k:28,price:149,crust:true,
  sh:{H:.12,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.05],[.15,.05],[.2,0]],anal:[[-.3,0],[-.25,.04],[-.05,0]]},
  col:{back:'#3a7a70',flank:'#5a9a80',belly:'#efe0c0',fin:'#e09040',eye:'#202020'},pat:{t:'spots',n:40,d:.6,r:.1,k:.7,c:'#e08a30'},scale:1,metal:.2,
  f:{pow:1.7,spd:.5,agi:.8,jump:0,stam:1.5,win:0.8},time:{dawn:.6,day:.08,dusk:.9,night:2.2},desc:'錦繡龍蝦，藍綠色的甲殼布滿橘點，腳是黑白相間的條紋，一對粗大帶刺的觸角比身體還長。白天躲在礁洞裡，入夜才出來覓食。上鉤後會用腳死命抓住礁石往洞裡縮，還會突然猛捲尾巴往後彈，一不小心就斷線。'},
 {id:'maori',loc:'sea',spots:['reef'],name:'海雞母',sci:'Lutjanus rivulatus',rar:3,lvl:[42, 68],len:[30, 80],k:17,price:90,
  sh:{H:.2,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.1],[.15,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.05,0]]},
  col:{back:'#8a5a28',flank:'#c89850',belly:'#e8d8b0',fin:'#e0b020',eye:'#c09020'},pat:{t:'spots',n:40,d:.6,r:.12,k:.7,c:'#3aa0e0'},scale:1,metal:.3,
  f:{pow:2.1,spd:1.4,agi:1.3,jump:0,stam:1.9,win:0.8},time:{dawn:1.1,day:.6,dusk:1.3,night:1.5},desc:'臉頰上一道道藍色波浪紋、全身藍點，台灣人叫牠海雞母，煮湯膠質濃得像雞湯，是礁岩裡最高價的笛鯛之一。夜裡才出來覓食，上鉤後會拚命往礁洞鑽，一鑽進去就很難拉出來。'},
 {id:'puffer',loc:'sea',spots:['reef'],name:'河豚',sci:'Arothron hispidus',rar:1,lvl:[8, 30],len:[20, 50],k:28,price:0,noSell:true,
  sh:{H:.2,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.1],[.15,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.05,0]]},
  col:{back:'#6a5a38',flank:'#8a7a50',belly:'#ece8dc',fin:'#c8a838',eye:'#d0b020'},pat:{t:'spots',n:60,d:.9,r:.1,k:.8,c:'#f4f4f0'},scale:1,metal:.1,
  f:{pow:.7,spd:.5,agi:.7,jump:0,stam:.7,win:0.85},time:{dawn:1,day:1.2,dusk:1,night:.6},desc:'白點叉鼻魨，圓胖的身體布滿白點。釣友最頭痛的偷餌高手：牙齒像鳥喙，常把餌啃光、甚至咬斷子線。上鉤後拉力不大，但一離水就會吸氣鼓成一顆球。內臟和皮有河豚毒，不能賣也不能吃，拍照後放流。'},
 {id:'grouper2',loc:'sea',spots:['reef'],name:'龍膽石斑',sci:'Epinephelus lanceolatus',rar:4,lvl:[55, 80],len:[100, 270],k:16,price:38,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#5a4e38',flank:'#a89a74',belly:'#d8ceb0',fin:'#b08a30',eye:'#806020'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:3.0,spd:1.1,agi:.8,jump:0,stam:2.8,win:0.85},time:{dawn:1,day:.8,dusk:1.1,night:1.4},desc:'礁岩深處的巨無霸，大嘴一張能吞下整條魚。上鉤後會死命往洞裡鑽，力氣大得嚇人。'},
 {id:'wahoo',loc:'sea',spots:['blue'],name:'飛扁',sci:'Acanthocybium solandri（棘鰆）',rar:3,lvl:[48, 75],len:[90, 200],k:6,price:27,
  sh:{H:.12,W:.08,prof:1.3,eyeT:.86,eye:.03,tail:.2,fork:.3,dorsal:[[-.3,0],[-.25,.05],[.15,.05],[.2,0]],anal:[[-.3,0],[-.25,.04],[-.05,0]]},
  col:{back:'#1a3aa8',flank:'#c8d0dc',belly:'#eef2f6',fin:'#5a6a90',eye:'#202020'},pat:{t:'bars',n:24,k:.7,c:'#2a50d0'},scale:1,metal:.6,
  f:{pow:2.3,spd:3.1,agi:1.4,jump:.15,stam:1.5,win:0.65},time:{dawn:1.4,day:1.1,dusk:1.3,night:.4},desc:'棘鰆，台灣俗稱沙午、竹午。海裡最快的魚之一，中魚的第一波衝刺快得讓捲線器尖叫。嘴裡一排剃刀般的牙齒，常常一口咬斷子線，所以大物釣友都會換鋼絲前導線。'},
 {id:'bigeye',loc:'sea',spots:['blue'],name:'大眼鮪',sci:'Thunnus obesus',rar:3,lvl:[48, 72],len:[100, 230],k:17,price:80,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#1a2a5a',flank:'#8090b0',belly:'#eef0f4',fin:'#d0b030',eye:'#202020'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.7,spd:2.6,agi:1.2,jump:.1,stam:2.8,win:1.0},time:{dawn:1.3,day:.8,dusk:1.4,night:1.1},desc:'眼睛特別大的鮪魚，習慣在深一點的水層覓食。耐力極強，拉扯常常持續很久。'},
 {id:'stingray',loc:'sea',spots:['reef'],name:'赤魟',sci:'Hemitrygon akajei',rar:2,lvl:[30, 50],len:[60, 200],k:3.2,price:18,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#a04a28',flank:'#c06a40',belly:'#f0e4d8',fin:'#a04a28',eye:'#d0a040'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.3,spd:.9,agi:.7,jump:0,stam:2.4,win:1.0},time:{dawn:1,day:.9,dusk:1.2,night:1.3},desc:'紅褐色的扁平身體貼著海底，尾巴上有帶倒鉤的毒棘。上鉤後會整片吸在沙地上不肯起來。'},
 {id:'amberjack',loc:'sea',spots:['reef','blue'],name:'青甘鰺',sci:'Seriola lalandi',rar:2,lvl:[40, 62],len:[80, 180],k:9,price:108,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#2a4a6a',flank:'#c0ccd4',belly:'#eef2f4',fin:'#e0c030',eye:'#d0a020'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.5,spd:2.1,agi:1.3,jump:.1,stam:2.4,win:0.85},time:{dawn:1.3,day:1,dusk:1.3,night:.6},desc:'身側一條黃線、尾鰭鮮黃。成群在礁岩外圍巡游，衝刺力道是海釣客最愛的挑戰。'},
 {id:'knifejaw',loc:'sea',spots:['reef'],name:'石鯛',sci:'Oplegnathus fasciatus',rar:1,lvl:[25, 45],len:[40, 80],k:18,price:264,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#303030',flank:'#d8d8d4',belly:'#eeeeea',fin:'#404040',eye:'#c09040'},pat:{t:'band',k:.9},scale:1,metal:.3,
  f:{pow:2.2,spd:1.4,agi:1.5,jump:0,stam:1.6,win:0.8},time:{dawn:1.2,day:1.1,dusk:1,night:.5},desc:'身上七條黑色橫紋，嘴像鸚鵡喙一樣能咬碎貝殼。被稱為磯釣之王，警覺又難纏。'},
 {id:'halibut',loc:'sea',spots:['blue'],name:'大比目魚',sci:'Hippoglossus stenolepis',rar:3,lvl:[45, 70],len:[50, 200],k:6,price:50,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#4a4430',flank:'#7a6e50',belly:'#f4f2ee',fin:'#6a5e40',eye:'#a08040'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.4,spd:.9,agi:.9,jump:0,stam:2.4,win:1.0},time:{dawn:1.1,day:1,dusk:1.1,night:1},desc:'兩隻眼睛長在同一邊，平時貼在海底等獵物經過。大尾的像一扇門板那麼大。'},
 {id:'sunfish',loc:'sea',spots:['blue'],name:'翻車魚',sci:'Mola mola',rar:4,lvl:[60, 85],len:[150, 330],k:28,price:12,
  sh:{H:.16,W:.09,prof:1.4,eyeT:.86,eye:.026,tail:.24,fork:.6,dorsal:[[-.15,0],[-.1,.08],[.15,.07],[.2,0]],anal:[[-.3,0],[-.25,.06],[-.05,0]]},
  col:{back:'#5a6068',flank:'#a0a8b0',belly:'#e8eaec',fin:'#5a6068',eye:'#303030'},pat:{t:'band',k:.2},scale:1,metal:.3,
  f:{pow:2.2,spd:.6,agi:.5,jump:0,stam:3.0,win:1.0},time:{dawn:.8,day:1.4,dusk:.8,night:.3},desc:'世界上最重的硬骨魚，身體像被切掉一半的大圓盤。晴天會躺在海面曬太陽，罕見又溫和。'},
 {id:'wrasse',loc:'sea',spots:['reef'],name:'曲紋唇魚',sci:'Cheilinus undulatus',rar:3,lvl:[40, 70],len:[60, 200],k:12,price:0,noSell:true,
  sh:{H:.2,W:.075,prof:1.3,eyeT:.86,eye:.032,tail:.22,fork:.5,dorsal:[[-.3,0],[-.26,.11],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#2a6a5a',flank:'#5a9a7a',belly:'#d0e0d4',fin:'#2a5aa0',eye:'#c08030'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2,spd:1,agi:.9,jump:0,stam:1.9,win:1},time:{dawn:.9,day:1.4,dusk:.9,night:.2},desc:'俗稱蘇眉，頭上有隆起、嘴唇厚。全球保育類（華盛頓公約附錄二），釣到只能拍照後放流。'},
 {id:'skipjack',loc:'sea',spots:['blue'],name:'正鰹',sci:'Katsuwonus pelamis',rar:0,lvl:[25, 40],len:[40, 100],k:16,price:93,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.95,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#1a2a4a',flank:'#a8b4c4',belly:'#eef0f2',fin:'#2a3a50',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:1.4,spd:1.8,agi:1.1,jump:.1,stam:1.2,win:1.0},time:{dawn:1.4,day:1.2,dusk:1,night:.4},desc:'紡錘形身體、腹部有 4～6 條深色縱紋。成群高速洄游，是柴魚的原料。'},
 {id:'sawara',loc:'sea',spots:['blue'],name:'土魠',sci:'Scomberomorus commerson',rar:1,lvl:[30, 50],len:[60, 200],k:4.5,price:197,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.95,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#1e2e4a',flank:'#b4bcc8',belly:'#eef0f4',fin:'#2a3448',eye:'#202020'},pat:{t:'bars',n:14,k:.3,c:'#3a4a68'},scale:1,metal:.35,
  f:{pow:1.5,spd:1.9,agi:1.2,jump:.2,stam:1.2,win:0.75},time:{dawn:1.4,day:1,dusk:1.3,night:.5},desc:'細長銀色身體、身側波浪狀直紋，牙齒銳利能咬斷釣線。台灣冬季的人氣魚。'},
 {id:'yellowfin',loc:'sea',spots:['blue'],name:'黃鰭鮪',sci:'Thunnus albacares',rar:3,lvl:[50, 70],len:[80, 200],k:18,price:50,
  sh:{H:.2,W:.1,prof:1.2,eyeT:.88,eye:.03,tail:.26,fork:.95,dorsal:[[-.05,0],[0,.12],[.08,.04],[.14,0]],anal:[[-.28,0],[-.24,.08],[-.18,0]]},
  col:{back:'#14204a',flank:'#b0b8c8',belly:'#f0f2f4',fin:'#e8c020',eye:'#202020'},pat:{t:'plain'},scale:1,metal:.35,
  f:{pow:2.3,spd:2,agi:1,jump:.1,stam:2.4,win:0.95},time:{dawn:1.4,day:1.3,dusk:1,night:.5},desc:'第二背鰭和臀鰭又長又黃，身側一條金黃縱帶。速度驚人，一口氣能拉走上百公尺的線。'},
 /* ---------- 倒木區、木碼頭、深水中央專屬（依玩家設定圖生成）---------- */
 {id:'clarias',spots:['wood'],name:'塘蝨',sci:'Clarias batrachus',rar:0,lvl:[3,14],len:[20,50],k:8,price:38,
  sh:{H:.12,W:.07,prof:1.6,eyeT:.9,eye:.02,tail:.16,fork:0,barbels:1,dorsal:[[-.36,0],[-.34,.06],[.22,.06],[.24,0]],anal:[[-.36,0],[-.34,.05],[0,.05],[.02,0]]},
  col:{back:'#4a3e28',flank:'#7e6a48',belly:'#e8dcc4',fin:'#5a4a34',eye:'#2a2010'},pat:{t:'mottle',k:.5},scale:.5,metal:.1,
  f:{pow:1.2,spd:.9,agi:.9,jump:0,stam:1.3,win:1.1},time:{dawn:.9,day:.5,dusk:1.3,night:1.7},desc:'4 對長鬚、鰻魚般的身體，能在泥裡呼吸空氣。夜裡在倒木間覓食，中魚後一直往障礙物裡鑽。'},
 {id:'spgar',spots:['wood'],name:'斑點雀鱔',sci:'Lepisosteus oculatus',rar:1,lvl:[12,28],len:[40,100],k:3.2,price:12,
  sh:{H:.09,W:.06,prof:1.7,eyeT:.82,eye:.022,tail:.16,fork:0,snout:1,dorsal:[[-.3,0],[-.27,.06],[-.18,0]],anal:[[-.3,0],[-.27,.05],[-.2,0]]},
  col:{back:'#4a4a2a',flank:'#8a8452',belly:'#ece6d0',fin:'#9a8e5a',eye:'#c09030'},pat:{t:'spots',n:9,d:.4,r:.3,k:.8,c:'#1e1a10'},scale:.9,metal:.2,
  f:{pow:1.3,spd:1.4,agi:.9,jump:.2,stam:1.1,win:0.65},time:{dawn:1,day:1.2,dusk:1.3,night:.6},desc:'細長尖嘴佈滿利齒，全身和魚鰭都是黑色斑點。常靜靜浮在倒木邊，突然衝刺咬住小魚。'},
 {id:'carp',spots:['dock'],name:'鯉魚',sci:'Cyprinus carpio',rar:0,lvl:[3,16],len:[25,80],k:14,price:50,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,barbels:1,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#5a4a24',flank:'#b8963e',belly:'#ece0c4',fin:'#a8643a',eye:'#c8a040'},pat:{t:'plain'},scale:1.3,metal:.3,
  f:{pow:1.6,spd:1.1,agi:.9,jump:.05,stam:1.7,win:1.0},time:{dawn:1.4,day:.8,dusk:1.4,night:1},desc:'金褐色大鱗片、嘴邊兩對鬚。在碼頭下的泥底翻找食物，大鯉魚一跑就是好幾十公尺。'},
 {id:'silvercarp',spots:['deep'],name:'鰱魚',sci:'Hypophthalmichthys molitrix',rar:0,lvl:[6,20],len:[35,90],k:11,price:40,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#5a6264',flank:'#c8ccc8',belly:'#f0f0ec',fin:'#7a7e80',eye:'#d0c080'},pat:{t:'plain'},scale:.6,metal:.5,
  f:{pow:1.2,spd:1.4,agi:1.1,jump:0.9,stam:1,win:0.8},time:{dawn:1,day:1.3,dusk:1,night:.5},desc:'銀白色、眼睛長得特別低。受到驚嚇會成群跳出水面，中魚後也常常高高躍起。'},
 {id:'grasscarp',spots:['deep'],name:'草魚',sci:'Ctenopharyngodon idella',rar:1,lvl:[12,30],len:[40,110],k:10,price:34,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#4a4a30',flank:'#a4a07a',belly:'#ece8d8',fin:'#6a6a54',eye:'#c8b060'},pat:{t:'plain'},scale:1.2,metal:.3,
  f:{pow:1.8,spd:1.3,agi:.9,jump:.1,stam:1.8,win:1.0},time:{dawn:1,day:1.3,dusk:1.2,night:.6},desc:'茶綠色圓筒身、大鱗片，專吃水草。體型大、耐力好，拉扯起來很有份量。'},
 {id:'blackcarp',spots:['deep'],name:'青魚',sci:'Mylopharyngodon piceus',rar:2,lvl:[22,45],len:[50,140],k:10.5,price:38,
  sh:{H:.19,W:.075,prof:1.3,eyeT:.87,eye:.03,tail:.22,fork:.6,dorsal:[[-.05,0],[0,.12],[.1,.1],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#1e2224',flank:'#3e4448',belly:'#c8cccc',fin:'#1a1c1e',eye:'#a09060'},pat:{t:'plain'},scale:1.2,metal:.25,
  f:{pow:2.1,spd:1.1,agi:.8,jump:.05,stam:2.0,win:1.0},time:{dawn:.9,day:.6,dusk:1.4,night:1.5},desc:'外型像草魚但全身青黑，用喉嚨的硬齒壓碎螺貝。是深水區裡力氣最大的鯉科魚。'},
 {id:'arapaima',spots:['deep'],name:'巨骨舌魚',sci:'Arapaima gigas',rar:4,lvl:[55,80],len:[120,280],k:6,price:20,
  sh:{H:.13,W:.07,prof:1.5,eyeT:.88,eye:.018,tail:.14,fork:0,dorsal:[[-.36,0],[-.33,.08],[-.15,.08],[-.12,0]],anal:[[-.36,0],[-.33,.08],[-.15,.07],[-.12,0]]},
  col:{back:'#3a4038',flank:'#7a7e6c',belly:'#e4e0d4',fin:'#8a2a20',eye:'#c0a040'},pat:{t:'plain'},scale:1.2,metal:.3,
  f:{pow:2.5,spd:1.3,agi:.8,jump:.7,stam:2.2,win:0.7},time:{dawn:1,day:1.2,dusk:1.3,night:.7},desc:'世界最大的淡水魚之一，後半身鱗片鑲紅邊。要浮上水面換氣，中魚後會整條躍出水面甩頭。'},
 /* ---------- 浮萍灣專屬（依玩家設定圖以 Hunyuan3D-2mv 生成）---------- */
 {id:'crucian',spots:['lily'],name:'鯽魚',sci:'Carassius auratus',rar:0,lvl:[1,10],len:[10,35],k:18,price:35,
  sh:{H:.2,W:.07,prof:1.3,eyeT:.86,eye:.03,tail:.22,fork:.5,dorsal:[[-.28,0],[-.2,.1],[.1,.08],[.18,0]],anal:[[-.3,0],[-.25,.06],[-.18,0]]},
  col:{back:'#4a4a36',flank:'#a8a48a',belly:'#e8e4d8',fin:'#6e6a58',eye:'#c8a040'},pat:{t:'plain'},scale:1.1,metal:.35,
  f:{pow:.8,spd:1.1,agi:1.2,jump:.05,stam:.8,win:1.05},time:{dawn:1.3,day:1,dusk:1.3,night:.6},desc:'銀灰色、體高側扁，沒有嘴鬚。水草邊成群覓食，是浮萍灣最常見的魚。'},
 {id:'tilapia',spots:['lily'],name:'吳郭魚',sci:'Oreochromis niloticus',rar:0,lvl:[2,12],len:[15,45],k:15,price:27,
  sh:{H:.2,W:.07,prof:1.25,eyeT:.86,eye:.032,tail:.2,fork:.1,dorsal:[[-.3,0],[-.25,.1],[.1,.09],[.2,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#3e4436',flank:'#8e927c',belly:'#ddd8c8',fin:'#7a5a58',eye:'#b04020'},pat:{t:'bars',n:8,k:.25,c:'#2e3428'},scale:.9,metal:.2,
  f:{pow:1.0,spd:1.1,agi:1.2,jump:.1,stam:1,win:1.05},time:{dawn:1,day:1.3,dusk:1,night:.5},desc:'灰黑魚身帶淡淡直條紋、尾鰭紅邊。適應力超強，白天在淺水草區很活躍。'},
 {id:'snakehead',spots:['lily'],name:'線鱧',sci:'Channa striata',rar:2,lvl:[16,32],len:[30,90],k:7,price:32,
  sh:{H:.12,W:.07,prof:1.6,eyeT:.9,eye:.026,tail:.18,fork:0,dorsal:[[-.36,0],[-.34,.07],[.28,.07],[.3,0]],anal:[[-.36,0],[-.34,.05],[0,.05],[.02,0]]},
  col:{back:'#2e2a22',flank:'#6e6450',belly:'#e6e0d4',fin:'#3a342a',eye:'#c09030'},pat:{t:'band',k:.6},scale:.8,metal:.15,
  f:{pow:1.7,spd:1.2,agi:1.1,jump:.15,stam:1.4,win:0.85},time:{dawn:1.1,day:.6,dusk:1.5,night:1.4},desc:'圓筒身、蛇一般的頭，身側一條深色縱帶。中魚後會拚命往水草堆裡鑽。'},
 {id:'peacock',spots:['lily'],name:'孔雀鱸',sci:'Cichla ocellaris',rar:3,lvl:[24,40],len:[30,75],k:13,price:14,
  sh:{H:.18,W:.075,prof:1.3,eyeT:.86,eye:.034,tail:.22,fork:.1,dorsal:[[-.3,0],[-.25,.11],[-.05,.08],[.2,.1],[.24,0]],anal:[[-.3,0],[-.25,.07],[-.15,0]]},
  col:{back:'#4a5a20',flank:'#d8c040',belly:'#f0ead0',fin:'#c85030',eye:'#c04020'},pat:{t:'bars',n:3,k:.8,c:'#1a1a14'},scale:.9,metal:.25,
  f:{pow:1.9,spd:1.8,agi:1.5,jump:0.6,stam:1.3,win:0.85},time:{dawn:1.2,day:1.4,dusk:1,night:.3},desc:'黃綠色魚身、三條黑色橫帶，尾鰭有眼斑。攻擊路亞極為兇猛，中魚後爆發力驚人。'},
 {id:'bluegill',ice:true,name:'藍鰓太陽魚',sci:'Lepomis macrochirus',rar:0,lvl:[1,9],len:[12,28],k:32,price:16,
  sh:{H:.23,W:.065,prof:1.25,eyeT:.86,eye:.034,tail:.2,fork:.3,dorsal:[[-.32,0],[-.26,.1],[-.12,.11],[0,.09],[.14,.08],[.2,0]],anal:[[-.32,0],[-.25,.08],[-.12,.07],[-.05,0]]},
  col:{back:'#2c3d36',flank:'#6f7d4a',belly:'#dc9a3c',fin:'#3a4a3e',eye:'#3a2a14'},pat:{t:'bars',n:7,k:.45,c:'#26332a'},op:true,scale:.55,metal:.18,
  f:{pow:0.9,spd:1.3,agi:1.6,jump:.15,stam:.8,win:1.05},time:{dawn:1.2,day:1.3,dusk:1,night:.4},desc:'鰓蓋後方有一塊深藍黑斑，咬餌積極，是濕地最常見的訪客。'},
 {id:'crappie',ice:true,name:'黑斑刺蓋太陽魚',sci:'Pomoxis nigromaculatus',rar:0,lvl:[3,12],len:[15,35],k:22,price:19,
  sh:{H:.2,W:.055,prof:1.3,eyeT:.86,eye:.034,tail:.2,fork:.35,dorsal:[[-.3,0],[-.24,.12],[-.08,.12],[.05,.05],[.1,0]],anal:[[-.3,0],[-.24,.11],[-.06,.08],[0,0]]},
  col:{back:'#36463c',flank:'#b4bea6',belly:'#e9ebe0',fin:'#48524a',eye:'#2a2a20'},pat:{t:'spots',n:10,d:.45,r:.38,k:.85,c:'#1a211b'},scale:.5,metal:.32,
  f:{pow:0.7,spd:1,agi:1.2,jump:.1,stam:.8,win:0.85},time:{dawn:1.3,day:.8,dusk:1.4,night:1},desc:'銀綠色身體佈滿黑色斑點，喜歡在倒木和水草邊成群活動。'},
 {id:'reba',name:'印度鯪',sci:'Cirrhinus reba',rar:0,lvl:[4,14],len:[20,45],k:13,price:18,
  sh:{H:.14,W:.06,prof:1.4,eyeT:.88,eye:.028,tail:.24,fork:.85,dorsal:[[-.05,0],[0,.13],[.06,.12],[.14,.02],[.16,0]],anal:[[-.3,0],[-.26,.06],[-.2,0]]},
  col:{back:'#38485a',flank:'#a9b8c6',belly:'#eef2f4',fin:'#8a97a4',eye:'#c8b070'},pat:{t:'plain'},scale:1.0,metal:.55,
  f:{pow:1.1,spd:1.5,agi:1,jump:.2,stam:1,win:1},time:{dawn:1,day:1.1,dusk:1,night:.8},desc:'銀藍色鱗片在光下閃亮，力氣比外表看起來大。'},
 {id:'perch',name:'鱖魚',sci:'Siniperca chuatsi',rar:1,lvl:[10,22],len:[25,55],k:17,price:141,
  sh:{H:.16,W:.065,prof:1.35,eyeT:.86,eye:.03,tail:.18,fork:0,dorsal:[[-.35,0],[-.3,.08],[-.15,.07],[-.05,.09],[.1,.08],[.22,.06],[.27,0]],anal:[[-.33,0],[-.27,.07],[-.15,.06],[-.1,0]]},
  col:{back:'#43361c',flank:'#b1894a',belly:'#ecd9a8',fin:'#6a5430',eye:'#b08a3a'},pat:{t:'blotch',k:.75,c:'#2a1d0e'},scale:.3,metal:.1,
  f:{pow:1.3,spd:1.5,agi:1.4,jump:.25,stam:1.1,win:0.95},time:{dawn:1,day:.6,dusk:1.5,night:1.6},desc:'又稱桂魚，背鰭硬棘尖銳，傍晚和夜裡最愛伏擊小魚。'},
 {id:'lmbass',name:'大口黑鱸',sci:'Micropterus salmoides',rar:1,lvl:[12,26],len:[25,62],k:15,price:74,
  sh:{H:.15,W:.068,prof:1.35,eyeT:.86,eye:.03,tail:.2,fork:.35,dorsal:BASS_D,anal:BASS_A},
  col:{back:'#28401f',flank:'#899a5c',belly:'#e6e2c2',fin:'#4c573a',eye:'#9a6a20'},pat:{t:'band',k:.8,c:'#1b2716'},scale:.65,metal:.15,
  f:{pow:1.6,spd:1.6,agi:1.6,jump:0.9,stam:1.1,win:0.85},time:{dawn:1.5,day:.8,dusk:1.5,night:.7},desc:'側線上一條深色斷續縱帶，中魚後常跳出水面甩頭。'},
 {id:'channel',name:'斑點叉尾鮰',sci:'Ictalurus punctatus',rar:2,lvl:[18,32],len:[40,95],k:9,price:22,
  sh:{H:.11,W:.085,prof:1.55,flat:.55,barbels:true,eyeT:.9,eye:.022,tail:.22,fork:.8,dorsal:[[.05,0],[.09,.11],[.15,.08],[.18,0]],anal:[[-.36,0],[-.3,.06],[-.08,.05],[-.04,0]]},
  col:{back:'#374451',flank:'#9aa4ad',belly:'#eceeef',fin:'#4e5862',eye:'#1a1a1a'},pat:{t:'spots',n:14,d:.35,r:.3,k:.9,c:'#161a1e'},scale:0,metal:.25,
  f:{pow:1.8,spd:1.5,agi:.9,jump:.05,stam:1.6,win:1.1},time:{dawn:.9,day:.5,dusk:1.4,night:1.8},desc:'無鱗、叉尾、四對觸鬚，夜裡靠嗅覺覓食，拉力沉穩。'},
 {id:'bowfin',name:'弓鰭魚',sci:'Amia calva',rar:2,lvl:[20,34],len:[40,80],k:10,price:11,
  sh:{H:.12,W:.075,prof:1.5,eyeT:.88,eye:.024,tail:.18,fork:0,dorsal:[[-.32,0],[-.3,.07],[.1,.07],[.18,.05],[.2,0]],anal:[[-.33,0],[-.28,.05],[-.2,0]]},
  col:{back:'#384024',flank:'#6c7246',belly:'#d8d3a6',fin:'#3e4a2a',eye:'#8a6a20'},pat:{t:'mottle',k:.7,c:'#252b17'},oc:true,scale:.2,metal:.1,
  f:{pow:2.1,spd:1.6,agi:1.2,jump:.4,stam:1.6,win:0.8},time:{dawn:1.2,day:.7,dusk:1.3,night:1.2},desc:'活化石級的古老魚種，尾柄上有一顆黑底橘圈的眼斑。'},
 {id:'smbass',name:'小口黑鱸',sci:'Micropterus dolomieu',rar:3,lvl:[15,30],len:[30,60],k:15,price:22,
  sh:{H:.145,W:.066,prof:1.35,eyeT:.86,eye:.03,tail:.2,fork:.35,dorsal:BASS_D,anal:BASS_A},
  col:{back:'#573a1a',flank:'#c27a34',belly:'#f0d6a4',fin:'#7a4a22',eye:'#b0201a'},pat:{t:'bars',n:9,k:.55,c:'#3e2410'},scale:.65,metal:.2,
  f:{pow:2.0,spd:1.9,agi:1.8,jump:1.0,stam:1.5,win:0.82},time:{dawn:1.4,day:1,dusk:1.3,night:.6},desc:'紅眼、古銅色身體配深色橫紋，同體型裡最會打架的魚。'},
 {id:'flathead',name:'扁頭鯰',sci:'Pylodictis olivaris',rar:4,lvl:[40,50],len:[70,140],k:10,price:7,
  sh:{H:.1,W:.09,prof:1.6,flat:1.0,barbels:true,eyeT:.92,eye:.018,tail:.2,fork:.1,dorsal:[[0,0],[.04,.08],[.1,.06],[.12,0]],anal:[[-.35,0],[-.3,.06],[-.12,.05],[-.08,0]]},
  col:{back:'#5a4826',flank:'#b08856',belly:'#ead6b4',fin:'#5a4628',eye:'#1a1a1a'},pat:{t:'mottle',k:.7,c:'#3a2912'},scale:0,metal:.08,
  f:{pow:2.5,spd:1.4,agi:.8,jump:0,stam:1.9,win:1.1},time:{dawn:.6,day:.3,dusk:1.2,night:2.2},desc:'下顎突出的扁平大頭，只吃活餌，深夜才離開倒木洞穴。'},
 {id:'gar',name:'鱷雀鱔',sci:'Atractosteus spatula',rar:4,lvl:[45,55],len:[100,220],k:4.5,price:5,
  sh:{H:.065,W:.055,prof:1.2,snout:1,eyeT:.8,eye:.02,tail:.14,fork:0,dorsal:[[-.36,0],[-.33,.06],[-.27,.05],[-.25,0]],anal:[[-.36,0],[-.33,.06],[-.27,.05],[-.25,0]]},
  col:{back:'#48482e',flank:'#9e9874',belly:'#e0dac2',fin:'#5c5838',eye:'#c0a040'},pat:{t:'spots',n:16,d:.3,r:.3,k:.7,c:'#26261a'},scale:.9,metal:.1,
  f:{pow:2.4,spd:1.6,agi:.7,jump:.3,stam:1.8,win:0.6},time:{dawn:1,day:1,dusk:1,night:1},desc:'長吻滿口利牙、全身菱形硬鱗，沼澤裡體型最大的掠食者。'},
 {id:'barra',name:'金目鱸',sci:'Lates calcarifer',rar:1,lvl:[14,28],len:[40,100],k:12,price:117,
  sh:{H:.15,W:.068,prof:1.35,eyeT:.86,eye:.03,tail:.2,fork:.1,dorsal:BASS_D,anal:BASS_A},
  col:{back:'#4a5240',flank:'#a8aca0',belly:'#e4e4dc',fin:'#3a3a34',eye:'#c8a040'},pat:{t:'plain'},scale:.8,metal:.3,
  f:{pow:1.8,spd:1.7,agi:1.4,jump:0.9,stam:1.2,win:0.75},time:{dawn:1.3,day:.9,dusk:1.4,night:1},desc:'台灣常見的金目鱸，野生個體力氣大、愛跳，眼睛在光下會反射金光。'},
 {id:'golden',name:'黃金錦鯉',sci:'Cyprinus aurum（傳說）',rar:5,lvl:[60,70],len:[45,80],k:14,price:60,special:'golden',
  sh:{H:.15,W:.075,prof:1.4,eyeT:.88,eye:.03,tail:.24,fork:.5,dorsal:[[-.25,0],[-.2,.1],[.1,.09],[.2,0]],anal:[[-.32,0],[-.27,.06],[-.2,0]]},
  col:{back:'#c88a10',flank:'#f2c03a',belly:'#fff0b0',fin:'#f0b030',eye:'#2a1a08'},pat:{t:'plain'},scale:1.4,metal:1,
  f:{pow:1.6,spd:1.4,agi:1.2,jump:.4,stam:1.3,win:1.2},time:{dawn:1,day:1.4,dusk:.8,night:0},desc:'傳說只在晴朗白天現身的金色錦鯉，鱗片像打磨過的金箔。'},
 {id:'seaking',loc:'sea',name:'滄淵',sci:'Rex abyssi（傳說）',rar:5,lvl:[99,99],len:[300,320],k:9,price:90,special:'king',
  sh:{H:.15,W:.075,prof:1.4,eyeT:.88,eye:.03,tail:.24,fork:.5,dorsal:[[-.25,0],[-.2,.1],[.1,.09],[.2,0]],anal:[[-.32,0],[-.27,.06],[-.2,0]]},
  col:{back:'#1c3c5c',flank:'#2f6f9a',belly:'#b8c8d0',fin:'#4a8ab0',eye:'#7fe8ff'},pat:{t:'plain'},scale:1.4,metal:.6,
  f:{pow:3.6,spd:2.0,agi:1.2,jump:.2,stam:3.4,win:1.0},time:{dawn:0,day:0,dusk:.5,night:1.5},desc:'統御深海的古老王者，手持三叉戟、頭戴珊瑚王冠。傳說只在無月的深夜，從遠洋深處浮上來。'},
 {id:'moonkoi',name:'月神鯉',sci:'Cyprinus selene（傳說）',rar:5,lvl:[90,99],len:[90,130],k:14,price:110,special:'moonkoi',
  sh:{H:.15,W:.075,prof:1.4,eyeT:.88,eye:.03,tail:.24,fork:.5,dorsal:[[-.25,0],[-.2,.1],[.1,.09],[.2,0]],anal:[[-.32,0],[-.27,.06],[-.2,0]]},
  col:{back:'#9fc4ea',flank:'#dcecff',belly:'#ffffff',fin:'#b8d8ff',eye:'#203050'},pat:{t:'plain'},scale:1.4,metal:1,
  f:{pow:3.0,spd:1.8,agi:1.4,jump:.5,stam:2.6,win:1.2},time:{dawn:0,day:0,dusk:0,night:1},desc:'月光灣的守護者，銀藍色的鱗片會映出月光。只在月夜的月光灣現身，是霜汐故事的關鍵。'},
 {id:'trout',loc:'ice',name:'虹鱒',sci:'Oncorhynchus mykiss',rar:1,lvl:[20,60],len:[30,70],k:11,price:89,
  sh:{H:.2,W:.1,prof:1.6,eyeT:.86,eye:.022,tail:.24,fork:.3,dorsal:[[-.05,0],[0,.1],[.12,.08],[.15,0]],anal:[[-.3,0],[-.26,.05],[-.2,0]]},
  col:{back:'#5b6b4a',flank:'#c8a0a8',belly:'#f0eee8',fin:'#8a8f78',eye:'#101010'},pat:{t:'plain'},scale:.6,metal:.5,
  f:{pow:1.3,spd:1.6,agi:1.5,jump:.5,stam:1.3,win:0.9},time:{dawn:1.3,day:1,dusk:1.3,night:.6},desc:'冷水中的明星魚種，身上有一條粉紅色側線。冬天的冰湖下特別活躍。'},
 {id:'pike',loc:'ice',name:'白斑狗魚',sci:'Esox lucius',rar:2,lvl:[40,85],len:[50,120],k:7,price:33,
  sh:{H:.14,W:.08,prof:1.3,eyeT:.88,eye:.018,tail:.2,fork:.25,dorsal:[[-.3,0],[-.25,.08],[-.15,.07],[-.12,0]],anal:[[-.32,0],[-.28,.06],[-.2,0]]},
  col:{back:'#4a5a2a',flank:'#8a9a50',belly:'#e8e6c8',fin:'#9a7a40',eye:'#c8b040'},pat:{t:'plain'},scale:.5,metal:.3,
  f:{pow:1.9,spd:2.0,agi:1.3,jump:.3,stam:1.6,win:0.7},time:{dawn:1.2,day:1.1,dusk:1.2,night:.5},desc:'冰下的頂級掠食者，長吻和滿口利牙，咬上時會猛力衝刺。'},
 {id:'sail',loc:'sea',name:'雨傘旗魚',sci:'Istiophorus platypterus',rar:3,lvl:[60,90],len:[150,280],k:3,price:23,
  sh:{H:.13,W:.06,prof:1.5,eyeT:.86,eye:.016,tail:.26,fork:.75,dorsal:[[-.15,0],[-.1,.35],[.25,.3],[.3,0]],anal:[[-.3,0],[-.27,.05],[-.2,0]]},
  col:{back:'#1c2f6a',flank:'#8fa6c8',belly:'#e8eef4',fin:'#2a3f8a',eye:'#101010'},pat:{t:'plain'},scale:.4,metal:.7,
  f:{pow:2.3,spd:2.4,agi:1.6,jump:.9,stam:2.0,win:0.75},time:{dawn:1.3,day:1.1,dusk:1.2,night:.4},desc:'海中最快的魚之一，巨大的帆狀背鰭像一把張開的雨傘。上鉤後會連續躍出水面。'},
 {id:'ghost',name:'月光幽靈魚',sci:'Lumina spectra（傳說）',rar:5,lvl:[62,72],len:[30,60],k:9,price:60,special:'ghost',
  sh:{H:.12,W:.05,prof:1.3,eyeT:.87,eye:.034,tail:.26,fork:.7,dorsal:[[-.3,0],[-.2,.14],[.05,.12],[.15,0]],anal:[[-.32,0],[-.25,.1],[-.1,.08],[-.05,0]]},
  col:{back:'#5a8ab8',flank:'#a8d8f0',belly:'#e8f8ff',fin:'#8ad0ff',eye:'#9ff4ff'},pat:{t:'plain'},scale:.6,metal:.3,
  f:{pow:1.4,spd:2.0,agi:1.8,jump:.6,stam:1.2,win:.8},time:{dawn:0,day:0,dusk:.3,night:1.6},desc:'只在夜裡出現，身體半透明、會發出藍光，有人說牠是落進水裡的月光。'},
 {id:'mermaid',loc:'both',name:'美人魚',sci:'Sirena paludis（幻想）',rar:5,lvl:[88,99],len:[150,185],k:4.5,price:120,special:'mermaid',
  sh:{H:.075,W:.06,prof:4.2,eyeT:.9,eye:.02,tail:.26,fork:.9,dorsal:[[0,0],[.01,0]],anal:[[0,0],[.01,0]]},
  col:{back:'#1f6f78',flank:'#3fb8b0',belly:'#bff0e0',fin:'#5fe0d0',eye:'#2a1a1a'},pat:{t:'plain'},scale:1.6,metal:.6,
  f:{pow:2.8,spd:2.0,agi:1.9,jump:.2,stam:2.7,win:1.15},time:{dawn:.2,day:0,dusk:.4,night:1.5},desc:'濕地最古老的傳說。她不能被賣掉；送她回家，她會留下一份謝禮。'},
 {id:'amber',name:'紅甘',sci:'Seriola dumerili',loc:'sea',rar:0,lvl:[20,32],len:[45,110],k:11,price:345,
  sh:{H:.12,W:.06,prof:1.4,eyeT:.88,eye:.026,tail:.26,fork:.9,dorsal:[[-.2,0],[-.15,.08],[.05,.05],[.1,0]],anal:[[-.25,0],[-.2,.06],[-.05,0]]},
  col:{back:'#5a5e46',flank:'#c8c2b0',belly:'#f2f0ea',fin:'#8a7a50',eye:'#b09040'},pat:{t:'band',k:.5,c:'#b08a3a'},scale:.4,metal:.6,
  f:{pow:2.0,spd:2.0,agi:1.3,jump:.1,stam:1.8,win:0.9},time:{dawn:1.3,day:1,dusk:1.3,night:.5},desc:'台灣海釣人氣魚，衝刺力道驚人，一上鉤就往礁區鑽。'},
 {id:'grouper',name:'石斑',sci:'Epinephelus coioides',loc:'sea',rar:1,lvl:[24,36],len:[35,100],k:16,price:156,
  sh:{H:.16,W:.08,prof:1.3,eyeT:.86,eye:.026,tail:.2,fork:0,dorsal:[[-.3,0],[-.25,.08],[.1,.07],[.2,0]],anal:[[-.3,0],[-.24,.07],[-.12,0]]},
  col:{back:'#4a4030',flank:'#8a7458',belly:'#d8ccb0',fin:'#5a4a34',eye:'#c09040'},pat:{t:'spots',n:12,d:.5,r:.4,k:.6,c:'#3a2a1a'},scale:.3,metal:.1,
  f:{pow:2.0,spd:1.0,agi:.8,jump:0,stam:1.4,win:0.9},time:{dawn:1,day:1,dusk:1.2,night:1.2},desc:'礁岩裡的霸主，中魚後拚命往洞裡鑽，拉不出來就會斷線。'},
 {id:'ribbon',name:'白帶魚',sci:'Trichiurus lepturus',loc:'sea',rar:0,lvl:[15,26],len:[60,140],k:1.2,price:161,
  sh:{H:.05,W:.015,prof:2.5,eyeT:.95,eye:.016,tail:.05,fork:0,dorsal:[[-.45,0],[-.4,.03],[.42,.03],[.45,0]],anal:[[-.1,0],[-.05,.01],[0,0]]},
  col:{back:'#c8d0d8',flank:'#e8eef4',belly:'#f6f8fa',fin:'#d8e0e8',eye:'#e0d090'},pat:{t:'plain'},scale:0,metal:1,
  f:{pow:.8,spd:1.4,agi:1.6,jump:0,stam:.8,win:0.7},time:{dawn:.6,day:.4,dusk:1.4,night:2},desc:'像一條銀色緞帶，夜裡成群浮上來覓食。'},
 {id:'mahi',name:'鬼頭刀',sci:'Coryphaena hippurus',loc:'sea',rar:2,lvl:[30,44],len:[60,130],k:7,price:26,
  sh:{H:.13,W:.05,prof:1.1,flat:.4,eyeT:.9,eye:.022,tail:.26,fork:.95,dorsal:[[-.38,0],[-.35,.08],[.4,.1],[.45,0]],anal:[[-.38,0],[-.34,.06],[-.05,0]]},
  col:{back:'#1f7a5a',flank:'#c8c83a',belly:'#f0e870',fin:'#3a90c0',eye:'#2a2a10'},pat:{t:'spots',n:16,d:.35,r:.25,k:.6,c:'#1a5a8a'},scale:0,metal:.7,
  f:{pow:2.0,spd:2.2,agi:1.8,jump:1.2,stam:1.4,win:0.85},time:{dawn:1.3,day:1.3,dusk:1,night:.3},desc:'金綠色的海上霓虹，中魚後不停跳出水面，離水後顏色會快速褪去。'},
 {id:'tuna',name:'黑鮪魚',sci:'Thunnus orientalis',loc:'sea',rar:3,lvl:[50,65],len:[120,260],k:14,price:208,
  sh:{H:.12,W:.09,prof:1.3,eyeT:.88,eye:.02,tail:.24,fork:1,dorsal:[[-.08,0],[-.02,.12],[.08,.05],[.14,0]],anal:[[-.15,0],[-.1,.08],[-.05,0]]},
  col:{back:'#141e3a',flank:'#8a96a8',belly:'#eef2f6',fin:'#d8b040',eye:'#1a1a1a'},pat:{t:'plain'},scale:.2,metal:.8,
  f:{pow:3.0,spd:2.4,agi:.9,jump:.1,stam:3.0,win:0.95},time:{dawn:1.4,day:1,dusk:1.3,night:.6},desc:'海洋的黑色子彈，一尾動輒上百公斤，是所有海釣人的夢想。'},
 {id:'marlin',name:'旗魚',sci:'Makaira nigricans',loc:'sea',rar:4,lvl:[60,78],len:[180,300],k:4,price:17,
  sh:{H:.08,W:.05,prof:1.2,snout:1,eyeT:.8,eye:.018,tail:.26,fork:1,dorsal:[[-.3,0],[-.25,.25],[.2,.3],[.28,0]],anal:[[-.3,0],[-.25,.05],[-.15,0]]},
  col:{back:'#16305a',flank:'#6a88b0',belly:'#e4ecf4',fin:'#2a5aa0',eye:'#1a1a1a'},pat:{t:'bars',n:12,k:.35,c:'#5ab0e8'},scale:0,metal:.6,
  f:{pow:2.8,spd:2.6,agi:1.4,jump:1.4,stam:2.0,win:0.75},time:{dawn:1.3,day:1.2,dusk:1.2,night:.4},desc:'背鰭像一面帆，上鉤後會整條躍出水面甩頭，是海上最華麗的對決。'},
 {id:'shark',name:'虎鯊',sci:'Galeocerdo cuvier',loc:'sea',rar:4,lvl:[70,90],len:[250,400],k:6,price:7,
  sh:{H:.09,W:.08,prof:1.4,flat:.5,eyeT:.88,eye:.014,tail:.3,fork:.6,dorsal:[[-.05,0],[0,.18],[.12,.05],[.14,0]],anal:[[-.32,0],[-.3,.05],[-.25,0]]},
  col:{back:'#4a5058',flank:'#7a8088',belly:'#e8e8e4',fin:'#4a5058',eye:'#0a0a0a'},pat:{t:'bars',n:14,k:.3,c:'#2a2e34'},scale:0,metal:.15,
  f:{pow:3.0,spd:1.8,agi:1.0,jump:0,stam:2.6,win:0.75},time:{dawn:1,day:.8,dusk:1.2,night:1.5},desc:'身上有老虎般的條紋，海裡最難纏的對手。'},
 {id:'gwhite',name:'大白鯊',sci:'Carcharodon carcharias',loc:'sea',rar:4,lvl:[85,99],len:[300,520],k:5,price:8,
  sh:{H:.1,W:.085,prof:1.5,flat:.3,eyeT:.88,eye:.012,tail:.3,fork:.7,dorsal:[[0,0],[.05,.2],[.14,.05],[.16,0]],anal:[[-.33,0],[-.31,.04],[-.27,0]]},
  col:{back:'#5c646c',flank:'#8a9096',belly:'#f0f0ec',fin:'#5c646c',eye:'#050505'},pat:{t:'plain'},scale:0,metal:.15,
  f:{pow:3.3,spd:2.0,agi:1.1,jump:.3,stam:3.0,win:0.75},time:{dawn:1.2,day:.7,dusk:1.3,night:1.2},desc:'海洋頂級掠食者，上鉤後猛烈衝刺、甚至躍出水面，是你職涯中最危險的一場對決。'},
];

/* ---------- 程序化魚模型 ---------- */
function bodyR0(t,sh){ const u=Math.pow(t,sh.prof||1.4); return Math.pow(Math.max(0,Math.sin(Math.PI*u)),.72); }
function bodyR(t,sh){ let r;
  if(!sh.snout&&t>.72){ const r72=bodyR0(.72,sh), q=(t-.72)/.28; r=Math.max(r72*Math.sqrt(Math.max(0,1-Math.pow(q,2.4)))*(1-.12*q), bodyR0(t,sh)); }
  else r=bodyR0(t,sh);
  if(sh.snout) r*=1-.72*sstep(.8,.93,t)*sh.snout;
  return Math.max(r,.0001); }
const snoutX=(t,sh)=>sh.snout?.22*sh.snout*sstep(.82,1,t):0;
const flatK=(t,sh)=>sh.flat?sstep(.62,1,t)*sh.flat:0;
function fishBody(sh){
  const P=[]; for(let i=0;i<=44;i++){ const t=i/44; P.push(new T.Vector2(bodyR(t,sh),t)); }
  const g=new T.LatheGeometry(P,36,Math.PI*1.5,Math.PI*2), p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const lx=p.getX(i), t=p.getY(i), lz=p.getZ(i); const fk=flatK(t,sh);
    let Y=lx*sh.H; if(Y<0) Y*=1.08; Y*=1-.45*fk; const Z=-lz*sh.W*(1+.55*fk);
    p.setXYZ(i, t-.5+snoutX(t,sh), Y-.012*sstep(.85,1,t)*sh.H*4, Z); }
  g.computeVertexNormals(); return g;
}
function spotMask(t,u,P){ const gx=t*P.n, gy=u*P.n*2.4, ix=Math.floor(gx), iy=Math.floor(gy); let m=0;
  for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const cx=ix+a, cy=iy+b; if(hashI(cx*7+3,cy*13+1)>P.d) continue;
    const px=cx+hashI(cx,cy*3+5), py=cy+hashI(cx*5+2,cy), r=P.r*(.6+.6*hashI(cx+11,cy+7)); m=Math.max(m,1-sstep(r*.65,r,Math.hypot(gx-px,gy-py))); }
  return m; }
function fishTex(sp){
  const c=sp.col, P=sp.pat, back=hex(c.back), flank=hex(c.flank), belly=hex(c.belly), pc=hex(P.c||'#000000'), sc=sp.scale||0;
  return dataTex(128,256,(u,t,o)=>{
    const vert=-Math.cos(2*Math.PI*u);
    let col=mix3(belly,flank,sstep(-.8,-.1,vert)); col=mix3(col,back,sstep(.05,.75,vert));
    let k=.92+.16*fbm(t*20,u*12,2), d=0; const body=sstep(.04,.12,t)*(1-sstep(.8,.86,t));
    if(P.t==='bars'){ const b=.5+.5*Math.cos((t*P.n+.35*fbm(t*5,u*6,2))*2*Math.PI); d=P.k*sstep(.45,.8,b)*sstep(-.55,.05,vert)*body; }
    else if(P.t==='band'){ const w=Math.abs(vert-.12+.22*(fbm(t*10,u*2,2)-.5)); d=P.k*(1-sstep(.06,.2,w))*body*(.55+.6*fbm(t*26,u*9,2)); }
    else if(P.t==='spots'){ d=P.k*spotMask(t,u,P)*sstep(-.7,-.25,vert)*(t<.9?1:0); }
    else if(P.t==='blotch'){ d=P.k*sstep(.5,.62,fbm(t*11+3,u*7,3))*sstep(-.6,0,vert)*body+P.k*.6*spotMask(t,u,{n:14,d:.25,r:.25})*sstep(-.3,.2,vert); }
    else if(P.t==='mottle'){ d=P.k*sstep(.42,.66,fbm(t*8,u*5,4))*sstep(-.85,-.25,vert); }
    col=mix3(col,pc,clamp(d,0,.95));
    if(sp.op){ const qd=Math.hypot((t-.8)*7,(vert-.15)*1.6); col=mix3(col,[18,22,40],1-sstep(.18,.3,qd)); }
    if(sp.oc){ const qd=Math.hypot((t-.09)*9,(vert-.25)*1.3); col=mix3(col,[20,18,10],1-sstep(.12,.17,qd)); col=mix3(col,[230,140,40],sstep(.12,.17,qd)*(1-sstep(.22,.28,qd))); }
    if(t>.06&&t<.8) k*=1+.12*(1-sstep(.004,.02,Math.abs(vert-.18)));
    if(!sp.sh.snout&&sp.special!=='mermaid'&&t>.86){ const ml=Math.abs(vert-(-.05-(1-t)*.5)); if(ml<.035) k*=.3+.7*sstep(.01,.035,ml); }
    const gl=Math.abs(t-.79-.035*vert*vert); k*=1-.35*(1-sstep(.004,.012,gl))*(1-sstep(.7,.95,Math.abs(vert)));
    if(sc>0){ const hd=sstep(.76,.82,t), sx=t*44, row=Math.floor(sx), off=(row&1)*.5, sy=u*96+off, fx=sx-row, fy=sy-Math.floor(sy);
      const edge=sstep(.4,.56,Math.hypot((fx-.1)*1.1,fy-.5)); k*=1-(sc*.2*edge-sc*.06*(1-fx))*(1-hd); }
    o[0]=col[0]*k; o[1]=col[1]*k; o[2]=col[2]*k;
  });
}
const FIN_TEX=dataTex(64,64,(u,v,o)=>{ const ray=.5+.5*Math.cos(u*2*Math.PI*9); const k=.72+.28*Math.pow(ray,4);
  o[0]=o[1]=o[2]=255*k; o[3]=255*(.8+.18*Math.pow(ray,4))*(1-.4*sstep(.8,1,v)); });
function bend(mat,uni){ mat.onBeforeCompile=(s)=>{ s.uniforms.uSwim=uni.uSwim; s.uniforms.uAmp=uni.uAmp;
  s.vertexShader='uniform float uSwim;\nuniform float uAmp;\n'+s.vertexShader.replace('#include <begin_vertex>',
  '#include <begin_vertex>\nfloat bx_=clamp(0.5-position.x,0.0,1.6);\ntransformed.z+=sin(uSwim-position.x*5.5)*bx_*bx_*uAmp;'); }; return mat; }
function profH(prof,x){ for(let i=0;i<prof.length-1;i++){ const a=prof[i], b=prof[i+1]; if(x>=a[0]&&x<=b[0]) return lerp(a[1],b[1],sstep(0,1,(x-a[0])/(b[0]-a[0]||1))); } return 0; }
function finStrip(sh,prof,sign){
  const N=16, pos=[], uv=[], idx=[], x0=prof[0][0], x1=prof[prof.length-1][0];
  for(let i=0;i<=N;i++){ const x=lerp(x0,x1,i/N), h=profH(prof,x), t=x+.5, yb=sign*bodyR(t,sh)*sh.H*(sign<0?1.08:1)*.9;
    pos.push(x,yb,0, x-h*.45,yb+sign*h*1.3,0); uv.push(i/N,0,i/N,1); }
  for(let i=0;i<N;i++){ const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function tailGeo(sh){
  const s=sh.tail*1.12, f=sh.fork, cx=-s*(1.12-.42*f), shp=new T.Shape();
  shp.moveTo(0,.03); shp.quadraticCurveTo(-s*.45,.05+s*.3,-s,s*.78); shp.quadraticCurveTo(cx,s*.32,-s*(1-.55*f),0);
  shp.quadraticCurveTo(cx,-s*.32,-s,-s*.78); shp.quadraticCurveTo(-s*.45,-.05-s*.3,0,-.03); shp.lineTo(0,.03);
  const g=new T.ShapeGeometry(shp,10); g.translate(-.47,0,0);
  const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i,p.getY(i)/(s*1.6)+.5,(-.47-p.getX(i))/s);
  return g;
}
function buildMermaid(sp){
  const uni={uSwim:{value:0},uAmp:{value:0}}, g=new T.Group();
  const tg=fishBody(sp.sh); tg.scale(.6,1,1); tg.translate(-.2,0,0);
  const tm=bend(new T.MeshPhysicalMaterial({map:fishTex(sp),roughness:.3,metalness:.55,clearcoat:.85,clearcoatRoughness:.18,emissive:new T.Color(0x0a4848),emissiveIntensity:.3}),uni);
  g.add(new T.Mesh(tg,tm));
  const fm=bend(new T.MeshStandardMaterial({color:new T.Color(sp.col.fin),map:FIN_TEX,transparent:true,side:T.DoubleSide,roughness:.4,metalness:.3,depthWrite:false,emissive:new T.Color(0x0a5050),emissiveIntensity:.4}),uni);
  const fl=tailGeo({tail:.26,fork:.9}); fl.rotateX(Math.PI/2); g.add(new T.Mesh(fl,fm));
  const skin=new T.MeshStandardMaterial({color:0xe9b998,roughness:.55});
  const prof=[[0,.0001],[0,.058],[.06,.05],[.14,.058],[.22,.068],[.29,.072],[.33,.05],[.36,.024],[.39,.022],[.39,.0001]];
  const tor=new T.LatheGeometry(prof.map(p=>new T.Vector2(p[1],p[0])),28); tor.rotateZ(-Math.PI/2); tor.scale(1,.78,1.15); g.add(new T.Mesh(tor,skin));
  const hd=new T.Mesh(new T.SphereGeometry(.046,24,16),skin); hd.scale.set(1.08,1,.9); hd.position.set(.44,.012,0); g.add(hd);
  const ink=new T.MeshStandardMaterial({color:0x1a1010,roughness:.2});
  for(const s of [1,-1]){ const e=new T.Mesh(new T.SphereGeometry(.0055,8,6),ink); e.position.set(.484,.02,s*.016); g.add(e); }
  const hair=new T.MeshStandardMaterial({color:0x8a2a1c,roughness:.5});
  for(let i=0;i<11;i++){ const zz=(i/10-.5)*.075, P3=[]; for(let k=0;k<=8;k++){ const s=k/8; P3.push(new T.Vector3(.46-s*.36,.062+.028*(1-s)+Math.sin(s*6+i)*.007,zz*(1+s*.9)+Math.sin(s*5+i*1.3)*.012)); }
    g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(P3),24,.009,6),hair)); }
  const limb=(a,b,r)=>{ const d=new T.Vector3().subVectors(b,a), L=d.length(), m=new T.Mesh(new T.CylinderGeometry(r*.8,r,L,10),skin); m.position.addVectors(a,b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()); return m; };
  for(const s of [1,-1]){ const sh=new T.Vector3(.31,0,s*.085), el=new T.Vector3(.22,-.03,s*.1), hn=new T.Vector3(.13,-.03,s*.085);
    g.add(limb(sh,el,.014)); g.add(limb(el,hn,.012)); const h=new T.Mesh(new T.SphereGeometry(.012,10,8),skin); h.position.copy(hn); g.add(h); }
  const shell=new T.MeshStandardMaterial({color:0xb070c0,metalness:.6,roughness:.3});
  for(const s of [1,-1]){ const m=new T.Mesh(new T.SphereGeometry(.022,12,8),shell); m.scale.set(1,.5,1); m.position.set(.24,-.048,s*.03); g.add(m); }
  g.traverse(o=>{ o.frustumCulled=false; });
  return {group:g, uni, sp};
}
const fishCache={};
/* ---------- 真實掃描魚模型（Barramundi Fish, Microsoft 2017, CC0） ---------- */
const SCAN={ready:false,loading:false,retryAt:0};
const SCANMAP={
 barra:{tk:0},
 lmbass:{back:'#5d7a3a',belly:'#e6e2c6',tk:.75},
 smbass:{back:'#7a5226',belly:'#ecd2a0',tk:.8,barN:9,barK:.35},
 perch:{back:'#6e5428',belly:'#e8d6a4',tk:.75,barN:6,barK:.3},
 reba:{back:'#5d7088',belly:'#eef2f4',tk:.5,sy:.85},
 crappie:{back:'#56684e',belly:'#e4e8dc',tk:.6,sy:1.2,barN:12,barK:.18},
 bluegill:{back:'#3d5240',belly:'#e09a40',tk:.75,sy:1.45,barN:7,barK:.25},
 golden:{back:'#e8a820',belly:'#ffe9a0',tk:1,metal:.85,emis:0xffa010},
 ghost:{back:'#6fb0e0',belly:'#e8f8ff',tk:.9,ghost:true},
 amber:{back:'#6a6a4a',belly:'#f0eee6',tk:.55,sy:.85},
 grouper:{back:'#5a4a30',belly:'#d8c8a8',tk:.8,sy:1.1,barN:5,barK:.35}};
function loadScanData(){
  if(typeof SCAN_DATA==='undefined')throw new Error('掃描魚資料未載入');
  const dec=(s,Ty)=>{ const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Ty(u.buffer); };
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.BufferAttribute(dec(SCAN_DATA.pos,Float32Array),3));
  geo.setAttribute('normal',new T.BufferAttribute(dec(SCAN_DATA.nrm,Float32Array),3));
  const uv=new T.BufferAttribute(dec(SCAN_DATA.uv,Float32Array),2); geo.setAttribute('uv',uv); geo.setAttribute('uv2',uv);
  geo.setIndex(new T.BufferAttribute(dec(SCAN_DATA.idx,SCAN_DATA.i32?Uint32Array:Uint16Array),1));
  const tl=new T.TextureLoader(),textures={};let left=3,broken=false;
  const done=()=>{if(--left===0&&!broken){
    Object.assign(SCAN,{geo,tex:textures,ready:true,loading:false});
    for(const id in fishCache)if(SCANMAP[id]&&!fishCache[id].real)delete fishCache[id];
  }};
  const failed=()=>{if(broken)return;broken=true;geo.dispose();Object.values(textures).forEach(t=>t.dispose());scanFailed();};
  for(const [key,srgb] of [['col',true],['mr',false],['nm',false]]){
    const t=tl.load(SCAN_DATA[key],done,undefined,failed);
    t.flipY=false;if(srgb)t.encoding=T.sRGBEncoding;t.anisotropy=4;textures[key]=t;
  }
}
function scanFailed(){SCAN.loading=false;SCAN.retryAt=Date.now()+15000;}
function initScan(){
  if(SCAN.ready||SCAN.loading||Date.now()<SCAN.retryAt)return;
  SCAN.loading=true;
  const useData=()=>{try{loadScanData();}catch(e){scanFailed();}};
  if(typeof SCAN_DATA!=='undefined'){useData();return;}
  const script=document.createElement('script');
  const stop=()=>{clearTimeout(timeout);script.onload=script.onerror=null;script.remove();};
  const timeout=setTimeout(()=>{stop();scanFailed();},12000);
  script.src='app_scan.js?v=__SCAN_BUILD__';
  script.dataset.optionalAsset='';
  script.onload=()=>{stop();useData();};
  script.onerror=()=>{stop();scanFailed();};
  document.head.appendChild(script);
}
function buildScan(sp,cfg){
  const uni={uSwim:{value:0},uAmp:{value:0}}, g=new T.Group(), tx=SCAN.tex;
  const m=new T.MeshPhysicalMaterial({map:tx.col,roughnessMap:tx.mr,metalnessMap:tx.mr,aoMap:tx.mr,normalMap:tx.nm,roughness:1,metalness:cfg.metal||1,clearcoat:.55,clearcoatRoughness:.25,envMapIntensity:1.25});
  const tu={uBack:{value:new T.Color(cfg.back||'#ffffff').convertSRGBToLinear()},uBelly:{value:new T.Color(cfg.belly||'#ffffff').convertSRGBToLinear()},uTintK:{value:cfg.tk||0},uBarN:{value:cfg.barN||0},uBarK:{value:cfg.barK||0}};
  m.onBeforeCompile=s=>{ Object.assign(s.uniforms,{uSwim:uni.uSwim,uAmp:uni.uAmp},tu);
    s.vertexShader='uniform float uSwim;\nuniform float uAmp;\nvarying vec2 vOP_;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOP_ = position.xy;\nfloat bx_ = clamp(0.5 - position.x, 0.0, 1.6);\ntransformed.z += sin(uSwim - position.x*5.5)*bx_*bx_*uAmp;');
    s.fragmentShader='uniform vec3 uBack;\nuniform vec3 uBelly;\nuniform float uTintK;\nuniform float uBarN;\nuniform float uBarK;\nvarying vec2 vOP_;\n'+s.fragmentShader.replace('#include <map_fragment>',SCAN_TINT); };
  if(cfg.ghost){ m.transparent=true; m.opacity=.75; m.emissive=new T.Color(0x5fc8ff); m.emissiveIntensity=.7; }
  if(cfg.emis){ m.emissive=new T.Color(cfg.emis); m.emissiveIntensity=.12; }
  const mesh=new T.Mesh(SCAN.geo,m); if(cfg.sy) mesh.scale.y=cfg.sy; g.add(mesh);
  g.traverse(o=>{ o.frustumCulled=false; });
  return {group:g,uni,sp,scan:true};
}
function getFish(sp){
  const models=window.__MDL;
  if(SCANMAP[sp.id]&&!models?.fishReady(sp.id)){
    if(!models||models.fishUnavailable(sp.id))initScan();
    models?.want(sp.id);
  }
  const fc=fishCache[sp.id];
  if(fc&&(fc.real||!(window.__MDL&&window.__MDL.fishReady(sp.id)))) return fc;
  if(window.__MDL){ const r=window.__MDL.fish(sp); if(r) return (fishCache[sp.id]=r); }
  if(sp.special==='mermaid') return (fishCache[sp.id]=buildMermaid(sp));
  if(SCAN.ready&&SCANMAP[sp.id]) return (fishCache[sp.id]=buildScan(sp,SCANMAP[sp.id]));
  const sh=sp.sh, uni={uSwim:{value:0},uAmp:{value:0}}, g=new T.Group();
  const bm=bend(new T.MeshPhysicalMaterial({map:fishTex(sp), roughness:.38, metalness:sp.metal*.8, clearcoat:.75, clearcoatRoughness:.22, envMapIntensity:1.3}),uni);
  if(sp.special==='golden'){ bm.emissive=new T.Color(0xffa010); bm.emissiveIntensity=.14; bm.roughness=.22; }
  if(sp.special==='ghost'){ bm.transparent=true; bm.opacity=.72; bm.emissive=new T.Color(0x5fc8ff); bm.emissiveIntensity=.85; bm.metalness=.1; }
  g.add(new T.Mesh(fishBody(sh),bm));
  const fm=bend(new T.MeshStandardMaterial({color:new T.Color(sp.col.fin).multiplyScalar(.85), map:FIN_TEX, transparent:true, side:T.DoubleSide, roughness:.45, depthWrite:false}),uni);
  if(sp.special==='ghost'){ fm.emissive=new T.Color(0x5fc8ff); fm.emissiveIntensity=.9; }
  g.add(new T.Mesh(tailGeo(sh),fm)); g.add(new T.Mesh(finStrip(sh,sh.dorsal,1),fm)); g.add(new T.Mesh(finStrip(sh,sh.anal,-1),fm));
  const pg=new T.CircleGeometry(.06,12); pg.scale(1.4,.6,1);
  for(const s of [1,-1]){ const pm=new T.Mesh(pg,fm); pm.position.set(.24,-.35*sh.H,s*sh.W*.85); pm.rotation.set(s*.3,s*.7,-.4); g.add(pm);
    const pl=new T.Mesh(pg,fm); pl.scale.setScalar(.7); pl.position.set(.06,-.85*sh.H,s*.02); pl.rotation.set(s*1.0,s*.4,-.3); g.add(pl); }
  const eyeMat=new T.MeshStandardMaterial({color:sp.col.eye, roughness:.25, metalness:.3}), pupMat=new T.MeshStandardMaterial({color:0x050505, roughness:.05});
  const te=sh.eyeT, re=bodyR(te,sh), fk=flatK(te,sh), ex=te-.5+snoutX(te,sh), ey=re*sh.H*.32*(1-.45*fk), ez=re*sh.W*(1+.55*fk)*.9;
  for(const s of [1,-1]){ const e=new T.Mesh(new T.SphereGeometry(sh.eye,14,10),eyeMat); e.scale.set(1,1,.55); e.position.set(ex,ey,s*ez); g.add(e);
    const pu=new T.Mesh(new T.SphereGeometry(sh.eye*.58,12,8),pupMat); pu.scale.set(1,1,.5); pu.position.set(ex,ey,s*(ez+sh.eye*.3)); g.add(pu); }
  if(sh.barbels){ const bm=new T.MeshStandardMaterial({color:0x2a2620, roughness:.6});
    for(const s of [1,-1]) for(const k of [0,1]){ const c=new T.CatmullRomCurve3([new T.Vector3(.5,-.01-k*.02,s*.025),new T.Vector3(.56,-.03-k*.03,s*(.06+k*.02)),new T.Vector3(.6+k*.03,-.06-k*.04,s*(.1+k*.03))]);
      g.add(new T.Mesh(new T.TubeGeometry(c,8,.0035,5),bm)); } }
  g.traverse(o=>{ o.frustumCulled=false; });
  return (fishCache[sp.id]={group:g, uni, sp});
}

const showLight=new T.PointLight(0xfff4e8,0,6,1.2); showLight.position.set(.5,.6,.3); head.add(showLight);

let factoryRodColor='#245bb4',factoryRodGold=false,activeFloatTexture=null;
function setRodLook(col,gold,finish='factory'){
  if(finish==='factory'){factoryRodColor=col;factoryRodGold=gold;}
  applyTackleFinish(T,[blankMat,chromeMat,goldMat,darkMetal],finish,col,gold,finishAssets);
  const gm=gold?goldMat:chromeMat;guides.forEach(g=>g.material=gm);tipTop.material=gm;
}
function paintFloat(mat,top,bottom,id){
 const cv=document.createElement('canvas');cv.width=32;cv.height=256;const g=cv.getContext('2d'),hex=n=>'#'+n.toString(16).padStart(6,'0');
 g.fillStyle=hex(bottom);g.fillRect(0,0,32,256);g.fillStyle=hex(top);g.fillRect(0,0,32,104);g.fillStyle=id==='gold'?'#805815':'#292c2c';g.fillRect(0,101,32,3);
 const t=new T.CanvasTexture(cv);t.encoding=T.sRGBEncoding;
 mat.color.setHex(0xffffff);mat.map=t;mat.metalness=id==='gold'?.92:0;mat.roughness=id==='gold'?.24:.28;mat.clearcoat=id==='gold'?.3:1;mat.clearcoatRoughness=.1;mat.needsUpdate=true;return t;
}
function setFloatLook(top,bottom,id='classic'){
 if(activeFloatTexture)activeFloatTexture.dispose();activeFloatTexture=paintFloat(bTopMat,top,bottom,id);
 let i=0;bobber.traverse(o=>{if(o.userData.floatAntenna){o.material.color.setHex(i++%2?bottom:top).convertSRGBToLinear();o.material.metalness=id==='gold'?.8:0;o.material.roughness=.28;o.material.needsUpdate=true;}});
}
const previewFinish=createTacklePreview(W,(kind,id)=>{
 const root=(kind==='rod'?rodGroup:bobber).clone(true);root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);root.visible=true;
 root.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.frustumCulled=false;}});
 if(kind==='rod'){
  const mats=[];root.traverse(o=>{if(o.isMesh)mats.push(...(Array.isArray(o.material)?o.material:[o.material]));});applyTackleFinish(T,mats,id==='def'?'factory':id,factoryRodColor,id==='def'?factoryRodGold:false,finishAssets);
  root.updateMatrixWorld(true);const reel=root.getObjectByName('tackleReel');return{root,focus:reel?reel.getWorldPosition(new T.Vector3()):new T.Vector3(-.2,-.65,-1)};
 }
 const palette={classic:[0xd8301a,0xf2efe8],lime:[0x7cff3a,0x1a1a1a],panda:[0x111111,0xffffff],sakura:[0xff8fb8,0xfff0f5],gold:[0xd9b25a,0xf6e6b0]},colors=palette[id]||palette.classic;
 const body=root.children[0],texture=paintFloat(body.material,colors[0],colors[1],id);let i=0;root.traverse(o=>{if(o.userData.floatAntenna){o.material.color.setHex(i++%2?colors[1]:colors[0]).convertSRGBToLinear();o.material.metalness=id==='gold'?.8:0;}});root.rotation.z=-.2;return{root,focus:new T.Vector3(0,.035,0),dispose:()=>texture.dispose()};
});

return { foam, foamBurst, dockMats:{plankMat,postMat,beamMat}, rodGroup, reelObj:reel, crankObj:crank, setRodLook,setFloatLook,previewFinish,rod, updateRod, setLine, bobber, splash, updateFx, shadow, SPECIES, RAR, getFish };
}
