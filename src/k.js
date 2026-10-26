/* ===== 雨打水面、大白鯊奪魚、閃避 ===== */
const SH4={};
SH4.rainVS=`
attribute vec3 aR;
uniform float uTime; uniform vec3 uC; uniform float uSea; uniform vec3 uWind; uniform float uRad;
varying vec2 vUv; varying float vT;
float hh(float n){ return fract(sin(n)*43758.5453); }
float seaH(vec2 p){
  vec2 wd = normalize(uWind.xy + vec2(1e-4)); float s = 0.45 + 1.1*uWind.z;
  vec2 D[6]; D[0]=wd; D[1]=vec2(wd.x*0.77-wd.y*0.64, wd.y*0.77+wd.x*0.64); D[2]=vec2(wd.x*0.77+wd.y*0.64, wd.y*0.77-wd.x*0.64); D[3]=vec2(wd.x*0.34-wd.y*0.94, wd.y*0.34+wd.x*0.94); D[4]=vec2(0.6,0.8); D[5]=vec2(-0.8,0.6);
  float L[6]; L[0]=38.0; L[1]=23.0; L[2]=15.0; L[3]=9.0; L[4]=5.5; L[5]=3.2;
  float A[6]; A[0]=0.42; A[1]=0.28; A[2]=0.18; A[3]=0.11; A[4]=0.06; A[5]=0.035;
  float h = 0.0; for(int i=0;i<6;i++){ float k = 6.2831853/L[i]; h += A[i]*s*sin(k*dot(D[i], p) - sqrt(9.81*k)*uTime); } return h;
}
void main(){
  float cyc = uTime*(1.2 + aR.y) + aR.x*7.0; float n = floor(cyc); vT = fract(cyc);
  float a = hh(aR.x*91.7 + n*12.9)*6.2831853, r = sqrt(hh(aR.x*37.1 + n*3.7))*uRad;
  vec2 p = uC.xz + vec2(cos(a), sin(a))*r;
  float y = uSea > 0.5 ? seaH(p) + 0.02 : 0.02;
  float sz = (0.18 + 0.28*aR.z)*(0.25 + vT*1.1);
  vUv = position.xz + 0.5;
  vec3 wp = vec3(p.x + position.x*sz, y, p.y + position.z*sz);
  gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
}`;
SH4.rainFS=`
uniform float uRain; uniform vec3 uCol;
varying vec2 vUv; varying float vT;
void main(){
  float d = length(vUv - 0.5)*2.0;
  float ring = exp(-pow((d - 0.82)/0.09, 2.0)) + 0.5*exp(-pow((d - 0.5)/0.07, 2.0));
  float a = ring*(1.0 - vT)*uRain*0.55;
  if(a < 0.01) discard;
  gl_FragColor = vec4(uCol, a);
}`;
SH4.dropVS=`
attribute vec3 aR;
uniform float uTime; uniform vec3 uC; uniform float uRad; uniform float uScale;
varying float vA;
float hh(float n){ return fract(sin(n)*43758.5453); }
void main(){
  float cyc = uTime*(1.6 + aR.y) + aR.x*5.0; float n = floor(cyc); float t = fract(cyc);
  float a = hh(aR.x*51.3 + n*7.7)*6.2831853, r = sqrt(hh(aR.x*17.9 + n*5.3))*uRad;
  vec3 p = vec3(uC.x + cos(a)*r, max(0.0, sin(t*3.14159)*0.12*(0.5 + aR.z)) + 0.02, uC.z + sin(a)*r);
  vec4 mv = viewMatrix*vec4(p, 1.0); gl_PointSize = max(1.0, 0.03*uScale/max(-mv.z, 0.1)); gl_Position = projectionMatrix*mv;
  vA = t < 0.6 ? 1.0 - t/0.6 : 0.0;
}`;
SH4.dropFS=`
uniform float uRain; uniform vec3 uCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.2, 0.5, length(c)))*vA*uRain*0.8; if(a < 0.01) discard; gl_FragColor = vec4(uCol, a); }`;

function createThrill(W,P,AT,c){
'use strict';
const T=THREE, S=W.scene, G=c.G, $=id=>document.getElementById(id);
const clamp=(x,a,b)=>x<a?a:x>b?b:x, rand=(a,b)=>a+Math.random()*(b-a), sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

/* ---------- 雨滴打在水面：漣漪圈與水花點 ---------- */
const NR=260, rg=new T.InstancedBufferGeometry(), pl=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
rg.index=pl.index; rg.setAttribute('position',pl.attributes.position);
const ar=new Float32Array(NR*3); for(let i=0;i<NR;i++){ ar[i*3]=Math.random(); ar[i*3+1]=Math.random()*.8; ar[i*3+2]=Math.random(); }
rg.setAttribute('aR',new T.InstancedBufferAttribute(ar,3)); rg.instanceCount=NR;
const rU={uTime:W.U.uTime,uC:{value:new T.Vector3()},uSea:W.U.uSea,uWind:W.U.uWind,uRad:{value:20},uRain:{value:0},uCol:{value:new T.Color(1,1,1)}};
const rings=new T.Mesh(rg,new T.ShaderMaterial({uniforms:rU,vertexShader:SH4.rainVS,fragmentShader:SH4.rainFS,transparent:true,depthWrite:false}));
rings.frustumCulled=false; rings.renderOrder=3; S.add(rings);
const ND=300, dg=new T.BufferGeometry(), dp=new Float32Array(ND*3), dr=new Float32Array(ND*3);
for(let i=0;i<ND;i++){ dr[i*3]=Math.random(); dr[i*3+1]=Math.random()*.8; dr[i*3+2]=Math.random(); }
dg.setAttribute('position',new T.BufferAttribute(dp,3)); dg.setAttribute('aR',new T.BufferAttribute(dr,3));
const dU={uTime:W.U.uTime,uC:rU.uC,uRad:{value:14},uScale:{value:800},uRain:rU.uRain,uCol:rU.uCol};
const drops=new T.Points(dg,new T.ShaderMaterial({uniforms:dU,vertexShader:SH4.dropVS,fragmentShader:SH4.dropFS,transparent:true,depthWrite:false}));
drops.frustumCulled=false; S.add(drops); if(W.reflHide){ W.reflHide(rings); W.reflHide(drops); }

/* ---------- 大白鯊 ---------- */
function sharkTex(){ const w=64,h=128,d=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const u=x/w, v=y/h, vert=-Math.cos(u*6.2832), jag=Math.sin(v*40+u*9)*.06+Math.sin(v*97)*.03;
    const top=clamp((vert+.15+jag)*4,0,1); let r=232+(96-232)*top, g=232+(104-232)*top, b=228+(112-228)*top;
    if(v>.72&&v<.8&&Math.abs(vert)<.4&&Math.sin(v*260)>.6){ r*=.55; g*=.55; b*=.55; }
    const n=(Math.sin(x*12.9+y*78.2)*43758.5)%1*12; const i=(y*w+x)*4; d[i]=r+n; d[i+1]=g+n; d[i+2]=b+n; d[i+3]=255; }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.encoding=T.sRGBEncoding; t.magFilter=T.LinearFilter; t.needsUpdate=true; return t; }
const skin=new T.MeshPhysicalMaterial({map:sharkTex(),roughness:.45,clearcoat:.6,clearcoatRoughness:.3});
const finM=new T.MeshPhysicalMaterial({color:0x5f6870,roughness:.5,clearcoat:.4,side:T.DoubleSide});
const shark=new T.Group(), jaw=new T.Group(); shark.visible=false; S.add(shark);
{ const pts=[]; for(let i=0;i<=40;i++){ const t=i/40; let r=Math.pow(Math.max(0,Math.sin(Math.PI*Math.pow(t,1.25))),.75); if(t>.86) r*=1-.55*sstep(.86,1,t); pts.push(new T.Vector2(Math.max(r,.001)*.5,t)); }
  const g=new T.LatheGeometry(pts,40,Math.PI*1.5,Math.PI*2), p=g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), t=p.getY(i), z=p.getZ(i); p.setXYZ(i,-z*.85,x*(x<0?.85:1)-.04*sstep(.85,1,t),(t-.5)*4.6); }
  g.computeVertexNormals(); shark.add(new T.Mesh(g,skin));
  const fin=(pts,pos,rot,sc)=>{ const s=new T.Shape(); pts.forEach((q,i)=>i?s.lineTo(q[0],q[1]):s.moveTo(q[0],q[1])); const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.03,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2}),finM); m.position.set(...pos); m.rotation.set(...rot); if(sc) m.scale.set(...sc); shark.add(m); return m; };
  fin([[.55,0],[.25,.5],[-.05,.92],[-.12,.55],[-.45,0]],[0,.4,.2],[0,Math.PI/2,0]);
  for(const s of [1,-1]) fin([[0,0],[.35,-.05],[1.1,-.55],[.9,-.6],[0,-.32]],[s*.38,-.15,.75],[0,s>0?Math.PI*.6:Math.PI*.4,s*.35]);
  fin([[0,.1],[.25,.4],[.7,1.25],[.55,1.2],[.35,.5],[.5,0],[.45,-.6],[.35,-.55],[0,-.1]],[0,-.02,-2.15],[0,Math.PI/2,0],[1.1,1,1]);
  const eye=new T.Mesh(new T.SphereGeometry(.045,10,8),new T.MeshStandardMaterial({color:0x050505,roughness:.05})); for(const s of [1,-1]){ const e=eye.clone(); e.position.set(s*.27,.12,1.65); shark.add(e); }
  const mouthM=new T.MeshStandardMaterial({color:0x7a2a30,roughness:.6,side:T.DoubleSide}), toothM=new T.MeshStandardMaterial({color:0xf2efe6,roughness:.3});
  const jw=new T.Mesh(new T.SphereGeometry(1,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),skin); jw.scale.set(.32,.18,.55); jaw.add(jw);
  const inner=new T.Mesh(new T.CircleGeometry(.3,20),mouthM); inner.rotation.x=-Math.PI/2; inner.scale.set(1,1.6,1); inner.position.y=.01; jaw.add(inner);
  for(let i=0;i<14;i++){ const a=Math.PI*(i/13), tth=new T.Mesh(new T.ConeGeometry(.022,.08,6),toothM); tth.position.set(Math.cos(a)*.27,.04,Math.sin(a)*.45-.05); jaw.add(tth); }
  jaw.position.set(0,-.12,1.55); shark.add(jaw);
  shark.scale.setScalar(1.15); shark.traverse(o=>{ o.frustumCulled=false; }); }
const sharkR=window.__MDL?window.__MDL.attach(shark,'gwhite',{len:4.6,target:'+z',clip:'Swim'}):null;

/* ---------- 慢動作、晃動、閃避按鈕 ---------- */
let slow=0, shake=0, snatchJob=null;
/* 咬點固定在鯊魚嘴上，身體一律在咬點的船外側，不會穿過船殼 */
const HL=2.3*1.15, uV=new T.Vector3(), nose=new T.Vector3(), mtx=new T.Matrix4(), zA=new T.Vector3(0,0,1);
function snatch(p,onBite){
  const q=p.clone(); q.y=0; c.hullClear(q,1.2); const out=c.hullOut(q,new T.Vector3());
  snatchJob={t:0,p:q,out,tan:new T.Vector3(-out.z,0,out.x).multiplyScalar(Math.random()<.5?1:-1),bit:false,onBite};
  shark.visible=true; slow=1; if(sharkR&&sharkR.loaded) sharkR.play('Bite'); c.vib([80,60,200]); c.toast('🦈 大白鯊！','bad',1800); c.Snd.gator(); }
function updSnatch(rdt){
  const J=snatchJob; if(!J) return; J.t+=rdt*(slow>0?.4:1); const t=J.t, p=J.p, o=J.out;
  const q=clamp(t/1.4,0,1), up=q<.48, a=sstep(0,.48,q), b=sstep(.48,1,q);
  const off=up?1.4*(1-a):2.6*b, ny=up?-3.2+4.8*a:1.6-3.9*b;
  nose.set(p.x+o.x*off,ny,p.z+o.z*off);
  const pitch=up?.85+.45*a:1.3-1.75*b;
  const hx=up?-o.x:(-o.x*(1-b)+J.tan.x*b), hz=up?-o.z:(-o.z*(1-b)+J.tan.z*b), hl=Math.hypot(hx,hz)||1;
  uV.set(hx/hl*Math.cos(pitch),Math.sin(pitch),hz/hl*Math.cos(pitch));
  shark.quaternion.setFromUnitVectors(zA,uV); shark.rotateZ(up?0:b*1.2);
  shark.position.copy(nose).addScaledVector(uV,-HL);
  jaw.rotation.x=up?.9*sstep(0,.35,q):.9*(1-sstep(.48,.58,q));
  if(q>.06&&!J.s1){ J.s1=true; for(let i=0;i<4;i++) P.splash(p.x+o.x*1.2+rand(-.8,.8),0,p.z+o.z*1.2+rand(-.8,.8),50,2.2); W.addRipple(p.x+o.x,p.z+o.z,1.4); c.Snd.splash(2); shake=.8; }
  if(q>.48&&!J.bit){ J.bit=true; if(G.fish) G.fish.group.visible=false; c.vib(120); shake=1; if(window.__FACE) window.__FACE(shark.position,{dur:2.4,pitch:-.15}); if(J.onBite) J.onBite(); }
  if(q>.95&&!J.s2){ J.s2=true; const sx=p.x+o.x*3, sz=p.z+o.z*3; for(let i=0;i<5;i++) P.splash(sx+rand(-1.5,1.5),0,sz+rand(-1.5,1.5),60,2.6); W.addRipple(sx,sz,1.6); AT.ring(sx,sz,4); c.Snd.splash(2.5); shake=1.2; }
  if(t>2.4){ shark.visible=false; snatchJob=null; slow=0; }
}
/* 出水瞬間：大白鯊從船的一側躍出、橫越船頭上空咬走魚、落到另一側（軌跡已驗證高過欄杆） */
let overJob=null; const ow=new T.Vector3(), od=new T.Vector3(), camW=new T.Vector3(), nP=new T.Vector3();
function overPos(J,u,out){ const t=2*u-1, lx=J.s*J.Wd*t, y=J.yb+(J.ya-J.yb)*(1-Math.pow(Math.abs(t),6)), b=G.base, cs=Math.cos(G.head), sn=Math.sin(G.head);
  return out.set(b.x+lx*cs+J.zc*sn,y,b.z-lx*sn+J.zc*cs); }
function snatchOver(p,onBite){ const hd=c.hullDims?c.hullDims():{HX:1.6,HZ0:-6.3}; W.camera.getWorldPosition(camW);
  overJob={u:0,s:Math.random()<.5?1:-1,Wd:hd.HX+4,zc:Math.max(hd.HZ0+.6,-4.2),ya:camW.y+1.2,yb:-2.2,bit:false,onBite,drip:0,s1:false,s2:false};
  shark.visible=true; slow=1; if(sharkR&&sharkR.loaded) sharkR.play('Bite'); c.vib([100,50,250]); c.toast('🦈 大白鯊躍出水面！','bad',2200); c.Snd.gator(); }
function updOver(rdt){ const J=overJob; if(!J) return;
  J.u+=rdt*((J.u>.34&&J.u<.66)?.3:1)/1.5; const u=Math.min(J.u,1);
  overPos(J,u,ow); overPos(J,u+.005,od); od.sub(ow).normalize();
  shark.quaternion.setFromUnitVectors(zA,od); shark.rotateZ(Math.sin(u*Math.PI)*.5*J.s); shark.position.copy(ow);
  nP.copy(ow).addScaledVector(od,2.1);
  if(!J.bit&&G.fish&&u>.3) G.fish.group.position.lerp(nP,Math.min(1,rdt*7));
  if(u>.04&&!J.s1){ J.s1=true; overPos(J,0,nP); for(let i=0;i<5;i++) P.splash(nP.x+rand(-1,1),0,nP.z+rand(-1,1),55,2.4); W.addRipple(nP.x,nP.z,1.5); c.Snd.splash(2.2); shake=.9; }
  J.drip-=rdt; if(ow.y>.3&&J.drip<=0){ J.drip=.05; P.splash(ow.x,ow.y-.3,ow.z,5,.35); }
  if(u>=.5&&!J.bit){ J.bit=true; if(G.fish) G.fish.group.visible=false; c.vib([150,40,150]); shake=1.5; if(window.__FACE) window.__FACE(shark.position,{dur:2.4,pitch:.1}); if(J.onBite) J.onBite(); }
  if(u>.96&&!J.s2){ J.s2=true; overPos(J,1,nP); for(let i=0;i<6;i++) P.splash(nP.x+rand(-1.5,1.5),0,nP.z+rand(-1.5,1.5),65,2.8); W.addRipple(nP.x,nP.z,1.8); AT.ring(nP.x,nP.z,4); c.Snd.splash(2.6); shake=1.1; }
  if(J.u>=1.08){ shark.visible=false; overJob=null; slow=0; }
}
const qEl=$('qte'), qBar=$('qteBar'); let qte=null;
function offerDodge(onOk){ if(qte) return; const need=7-Math.floor((window.__TAL?window.__TAL.rank('sea'):0)/2); qte={n:0,t:2.2,onOk,need}; const sm=qEl.querySelector('small'); if(sm) sm.textContent='連點 '+need+' 下'; qEl.classList.remove('hidden'); qBar.style.width='0%'; c.vib([30,30,30]); }
qEl.addEventListener('pointerdown',e=>{ e.preventDefault(); if(!qte) return; qte.n++; qBar.style.width=Math.min(100,qte.n/qte.need*100)+'%'; c.vib(15);
  if(qte.n>=qte.need){ const f=qte.onOk; qte=null; qEl.classList.add('hidden'); c.toast('閃過了！鯊魚撲空','good',1600); shake=.4; if(f) f(); } });
function updQte(dt){ if(!qte) return; qte.t-=dt; if(qte.t<=0){ qte=null; qEl.classList.add('hidden'); } }

function update(dt,t){
  const rain=W.U.uRain.value, cw=rU.uC.value; W.camera.getWorldPosition(cw);
  rU.uRain.value=rain>.03?Math.min(1,rain*1.2):0; rings.visible=drops.visible=rain>.03&&!c.underwater()&&G.loc!=='ice'&&window.__GFX!=='low';
  const L=clamp(W.info.light,.15,1); rU.uCol.value.setRGB(.85*L,.9*L,.95*L);
  dU.uScale.value=window.innerHeight*W.getPR()/(2*Math.tan(W.camera.fov*Math.PI/360));
  updSnatch(dt); updOver(dt); updQte(dt);
  if(shake>0){ shake=Math.max(0,shake-dt*1.8); W.head.position.set((Math.random()-.5)*.08*shake,(Math.random()-.5)*.08*shake,0); } else W.head.position.set(0,0,0);
}
return {update,snatch,snatchOver,offerDodge,busy:()=>!!(snatchJob||overJob)};
}
