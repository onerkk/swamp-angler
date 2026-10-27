/* ===== 第 2 段 · 水下鏡頭、釣具店、等級與任務 ===== */
const SH2 = {};
SH2.bgVS = `
varying vec3 vD;
void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }
`;
SH2.bgFS = `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
varying vec3 vD;
void main(){
  float y = vD.y;
  vec3 c = y > 0.0 ? mix(uMid, uTop, pow(clamp(y, 0.0, 1.0), 0.7)) : mix(uMid, uBot, pow(clamp(-y, 0.0, 1.0), 0.6));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;
SH2.surfVS = `
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }
`;
SH2.surfFS = `
uniform float uTime;
uniform vec3 uCol;
uniform vec3 uFog;
uniform float uDen;
varying vec3 vW;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float nn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), u.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), u.x), u.y); }
void main(){
  vec2 p = vW.xz;
  float w = nn(p*1.3 + vec2(uTime*0.3, uTime*0.2))*0.6 + nn(p*3.1 - vec2(uTime*0.4, -uTime*0.25))*0.4;
  float dw = smoothstep(0.55, 0.62, nn(p*0.35 + vec2(3.0, 7.0))*0.7 + nn(p*4.0)*0.3);
  vec3 c = uCol*(0.55 + 0.7*w)*(1.0 - 0.75*dw);
  float d = length(cameraPosition - vW);
  c = mix(c, uFog, 1.0 - exp(-d*uDen*0.55));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}
`;

function createUnderwater(W, P){
'use strict';
const T=THREE, R=W.renderer;
const clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,t)=>a+(b-a)*t, rand=(a,b)=>a+Math.random()*(b-a);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const lin=h=>new T.Color(h).convertSRGBToLinear();
function hashI(x,y){ let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vn(x,y){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hashI(xi,yi), b=hashI(xi+1,yi), c=hashI(xi,yi+1), d=hashI(xi+1,yi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,o){ let s=0,a=.5,n=0; for(let i=0;i<o;i++){ s+=a*vn(x,y); n+=a; x=x*2.03+17.1; y=y*2.03+9.7; a*=.5; } return s/n; }
function dataTex(w,h,fn,srgb){ const d=new Uint8Array(w*h*4), o=[0,0,0,255];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ o[3]=255; fn(x/w,y/h,o); const i=(y*w+x)*4; for(let k=0;k<4;k++){ const v=o[k]; d[i+k]=v<0?0:v>255?255:v; } }
  const t=new T.DataTexture(d,w,h,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.magFilter=T.LinearFilter; t.minFilter=T.LinearMipmapLinearFilter;
  t.generateMipmaps=true; if(srgb!==false) t.encoding=T.sRGBEncoding; t.needsUpdate=true; return t; }

const scene=new T.Scene(), cam=new T.PerspectiveCamera(60,1,.03,90); scene.add(cam);
const fog=new T.FogExp2(new T.Color(),.17); scene.fog=fog;
const bgU={uTop:{value:new T.Color()},uMid:{value:new T.Color()},uBot:{value:new T.Color()}};
const bg=new T.Mesh(new T.SphereGeometry(60,32,16),new T.ShaderMaterial({uniforms:bgU,vertexShader:SH2.bgVS,fragmentShader:SH2.bgFS,side:T.BackSide,depthWrite:false}));
bg.renderOrder=-5; bg.frustumCulled=false; scene.add(bg);
const hemi=new T.HemisphereLight(0xffffff,0x101010,1); scene.add(hemi);
const sunL=new T.DirectionalLight(0xffffff,.6); sunL.position.set(3,10,2); scene.add(sunL);
const camLight=new T.PointLight(0xcfe8d8,0,4,1.5); cam.add(camLight);

// 由下往上看的水面
const surfU={uTime:W.U.uTime,uCol:{value:new T.Color()},uFog:{value:new T.Color()},uDen:{value:.17}};
const surf=new T.Mesh(new T.PlaneGeometry(120,120),new T.ShaderMaterial({uniforms:surfU,vertexShader:SH2.surfVS,fragmentShader:SH2.surfFS,side:T.DoubleSide,depthWrite:false}));
surf.rotation.x=Math.PI/2; scene.add(surf);

// 湖底（泥沙、焦散光紋）
const bottomY=(x,z)=>{ const r=Math.hypot(x,z); return -3.6+.35*Math.sin(x*.4)*Math.cos(z*.33)+.2*Math.sin(x*1.3+z*.7)+(r>10?(r-10)*.09:0); };
const mud=dataTex(256,256,(u,v,o)=>{ const n=fbm(u*8,v*8,4), peb=sstep(.68,.74,fbm(u*40,v*40,2)), k=.6+.6*n;
  o[0]=(70+40*peb)*k; o[1]=(64+34*peb)*k; o[2]=(40+30*peb)*k; });
mud.repeat.set(10,10);
const bgeo=new T.PlaneGeometry(70,70,80,80); bgeo.rotateX(-Math.PI/2);
{ const p=bgeo.attributes.position; for(let i=0;i<p.count;i++) p.setY(i,bottomY(p.getX(i),p.getZ(i))); bgeo.computeVertexNormals(); }
const cau={value:new T.Color(0,0,0)};
const botMat=new T.MeshStandardMaterial({map:mud,roughness:.95});
botMat.onBeforeCompile=s=>{ s.uniforms.uTime=W.U.uTime; s.uniforms.uCau=cau;
  s.vertexShader='varying vec3 vWp;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp = (modelMatrix*vec4(transformed, 1.0)).xyz;');
  s.fragmentShader='uniform float uTime;\nuniform vec3 uCau;\nvarying vec3 vWp;\nfloat cau_(vec2 p, float t){ vec2 q = p*1.1; float c = 0.0; for(int i = 0; i < 3; i++){ q += vec2(sin(q.y*1.7 + t*0.9), cos(q.x*1.5 - t*0.7))*0.6; c += pow(abs(sin(q.x + q.y)), 10.0); q *= 1.7; } return c; }\n'
    +s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += uCau*cau_(vWp.xz, uTime)*diffuseColor.rgb;'); };
scene.add(new T.Mesh(bgeo,botMat));

// 水草
const wg=new T.PlaneGeometry(.05,1,1,6); wg.translate(0,.5,0);
{ const p=wg.attributes.position; for(let i=0;i<p.count;i++){ const y=p.getY(i); p.setX(i,p.getX(i)*(1-y*.85)); p.setZ(i,y*y*.12); } wg.computeVertexNormals(); }
const weedMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.7,side:T.DoubleSide});
weedMat.onBeforeCompile=s=>{ s.uniforms.uTime=W.U.uTime; s.vertexShader='uniform float uTime;\n'+s.vertexShader.replace('#include <begin_vertex>',
 `#include <begin_vertex>
 float wp_ = 0.0;
 #ifdef USE_INSTANCING
 wp_ = instanceMatrix[3].x*1.3 + instanceMatrix[3].z*0.8;
 #endif
 transformed.x += sin(uTime*0.9 + wp_)*position.y*position.y*0.18;
 transformed.z += cos(uTime*0.7 + wp_*1.3)*position.y*position.y*0.1;`); };
const NW=420, weeds=new T.InstancedMesh(wg,weedMat,NW);
{ const m4=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), p=new T.Vector3(), s=new T.Vector3();
  for(let i=0;i<NW;i++){ const a=Math.random()*6.283, r=1.8+Math.pow(Math.random(),.7)*13, x=Math.cos(a)*r, z=Math.sin(a)*r;
    e.set((Math.random()-.5)*.3,Math.random()*6.283,(Math.random()-.5)*.3); q.setFromEuler(e); p.set(x,bottomY(x,z)-.05,z); s.set(1,rand(.5,2.6),1);
    m4.compose(p,q,s); weeds.setMatrixAt(i,m4); const t=Math.random(); weeds.setColorAt(i,new T.Color().setRGB(lerp(.16,.34,t),lerp(.3,.5,t),lerp(.07,.14,t))); } }
scene.add(weeds);
// 石頭、沉木
const rockMat=new T.MeshStandardMaterial({map:mud,color:0x8a8a78,roughness:.95});
for(let i=0;i<12;i++){ const g=new T.IcosahedronGeometry(1,3), p=g.attributes.position; for(let k=0;k<p.count;k++){ const vx=p.getX(k), vy=p.getY(k), vz=p.getZ(k), f=.8+.35*fbm(vx*1.7+i,vz*1.7+vy,3); p.setXYZ(k,p.getX(k)*f,p.getY(k)*f*.7,p.getZ(k)*f); }
  g.computeVertexNormals(); const m=new T.Mesh(g,rockMat), a=Math.random()*6.283, r=2.2+Math.random()*9, x=Math.cos(a)*r, z=Math.sin(a)*r;
  m.scale.setScalar(rand(.2,.7)); m.position.set(x,bottomY(x,z)-m.scale.x*.25,z); m.rotation.y=Math.random()*6; scene.add(m); }
const barkTex=dataTex(64,128,(u,v,o)=>{ const n=fbm(u*14,v*3,3), k=.55+.6*n; o[0]=58*k; o[1]=46*k; o[2]=34*k; });
const log=new T.Mesh(new T.CylinderGeometry(.22,.27,7,12),new T.MeshStandardMaterial({map:barkTex,roughness:.9}));
log.rotation.set(0,.6,Math.PI/2-.15); log.position.set(-2.6,bottomY(-2.6,-3.4)+.2,-3.4); scene.add(log);

// 懸浮微粒
const NP=700, pp=new Float32Array(NP*3);
for(let i=0;i<NP;i++){ pp[i*3]=rand(-8,8); pp[i*3+1]=rand(-3.4,-.1); pp[i*3+2]=rand(-8,8); }
const pgeo=new T.BufferGeometry(); pgeo.setAttribute('position',new T.BufferAttribute(pp,3));
const soft=dataTex(32,32,(u,v,o)=>{ const d=Math.max(0,1-Math.hypot(u-.5,v-.5)*2); o[0]=o[1]=o[2]=255; o[3]=255*d*d; },false);
const pm=new T.PointsMaterial({size:.022,map:soft,transparent:true,depthWrite:false,opacity:.75});
const parts=new T.Points(pgeo,pm); parts.frustumCulled=false; scene.add(parts);

// 光束
const rayTex=dataTex(32,128,(u,v,o)=>{ o[0]=o[1]=o[2]=255; o[3]=255*Math.pow(Math.sin(u*Math.PI),2)*Math.pow(v,1.6); },false);
const rays=[];
for(let i=0;i<8;i++){ const m=new T.Mesh(new T.PlaneGeometry(.8+Math.random()*1.4,18),new T.MeshBasicMaterial({map:rayTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide,opacity:.1}));
  m.position.set(rand(-7,7),-9,rand(-7,7)); m.rotation.order='YXZ'; m.userData.ph=Math.random()*6; scene.add(m); rays.push(m); }

// 釣組：浮標底部、子線、咬鉛、魚鉤、蚯蚓
const rig=new T.Group(); scene.add(rig);
{ const l=new T.Mesh(new T.CylinderGeometry(.0014,.0014,1.3,4),new T.MeshBasicMaterial({color:0xcfd8d8,transparent:true,opacity:.55})); l.position.y=-.65; rig.add(l);
  const b=new T.Mesh(new T.SphereGeometry(.063,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2),new T.MeshStandardMaterial({color:0xe8e4da,roughness:.4})); b.scale.y=1.3; b.position.y=-.005; rig.add(b);
  const s=new T.Mesh(new T.SphereGeometry(.013,10,8),new T.MeshStandardMaterial({color:0x6a6e72,metalness:.8,roughness:.4})); s.position.y=-.95; rig.add(s);
  const h=new T.Mesh(new T.TorusGeometry(.014,.0018,6,14,Math.PI*1.3),new T.MeshStandardMaterial({color:0xb8bcc0,metalness:1,roughness:.2})); h.position.y=-1.3; h.rotation.z=Math.PI*.6; rig.add(h); }
const V3=(x,y,z)=>new T.Vector3(x,y,z);
const worm=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V3(0,-1.27,0),V3(.02,-1.3,.01),V3(0,-1.33,-.01),V3(-.025,-1.35,0),V3(-.01,-1.39,.02),V3(.02,-1.41,0)]),24,.0065,6),
  new T.MeshStandardMaterial({color:0xa8574d,roughness:.35}));
rig.add(worm);
const BAIT=new T.Vector3(0,-1.32,0);
// 美人魚：用角色設定圖的正面／背面去背圖，在水中永遠面向鏡頭，尾巴與頭髮有擺動
const merTL=new T.TextureLoader(), merUni={uSwim:{value:0},uAmp:{value:0}}; let merG=null;
function merSprite(){ if(merG) return merG; const g=new T.Group();
  const mk=(file,ry)=>{ const t=merTL.load(file); t.encoding=T.sRGBEncoding; t.anisotropy=4;
    const m=new T.MeshStandardMaterial({map:t,alphaTest:.4,roughness:.55,metalness:.1,emissive:new T.Color(0x0a2a3a),emissiveIntensity:.35});
    m.onBeforeCompile=s=>{ s.uniforms.uSwim=merUni.uSwim; s.vertexShader='uniform float uSwim;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ty_ = clamp(0.48 - uv.y, 0.0, 1.0);\ntransformed.x += sin(uSwim*2.2 - uv.y*7.0)*ty_*ty_*0.16;\nfloat hy_ = smoothstep(0.55, 0.95, uv.y)*abs(position.x)*4.0;\ntransformed.x += sin(uSwim*1.3 + uv.y*5.0)*hy_*0.012;'); };
    const me=new T.Mesh(new T.PlaneGeometry(480/1620,1,10,48),m); me.rotation.y=ry; me.frustumCulled=false; g.add(me); };
  mk('mermaid_front.png',0); mk('mermaid_back.png',Math.PI); g.userData.mer=true; merG=g; return g; }

// 魚
let on=false, fish=null, uni=null, fd=null, prog=0, biteT=-1, camA=0, yaw=0, tt=0;
const S=new T.Vector3(), C=new T.Vector3(), dirv=new T.Vector3(), perp=new T.Vector3(), pos=new T.Vector3(), prev=new T.Vector3(), focus=new T.Vector3();
const cDark=lin('#07110d'), cMid=lin('#2a5240'), cSea=lin('#1d5a7a'), cTint=lin('#3c4a1c'), tmpC=new T.Color();
function start(fdIn){
  end(); fd=fdIn; if(fd.sp.special==='mermaid'){ fish=merSprite(); uni=merUni; } else { const src=P.getFish(fd.sp); uni=src.uni; fish=src.group.clone(); fish.traverse(o=>{ o.frustumCulled=false; }); }
  fish.visible=true; fish.scale.setScalar(fd.L); scene.add(fish);
  const a0=Math.random()*Math.PI*2, R0=3.2+fd.L*2;
  S.set(Math.cos(a0)*R0,BAIT.y+rand(-.5,.3),Math.sin(a0)*R0);
  dirv.subVectors(BAIT,S); dirv.y=0; dirv.normalize(); perp.set(-dirv.z,0,dirv.x);
  C.copy(BAIT).addScaledVector(dirv,-(fd.L*(fd.sp.sh.snout?.72:.5)+.02)); C.y=BAIT.y-.02;
  camA=Math.atan2(perp.z,perp.x)+rand(-.35,.35); prog=0; biteT=-1; worm.visible=true;
  pos.copy(S); prev.copy(S); yaw=Math.atan2(-dirv.z,dirv.x); tt=0; on=true; scene.environment=W.scene.environment;
}
function end(){ on=false; if(fish){ scene.remove(fish); fish=null; } }
function update(dt){
  if(!on) return; tt+=dt;
  const L=Math.max(clamp(W.info.light,0,1.2),.62), day=W.info.day;   // 夜裡水下鏡頭保留月光亮度，才看得清楚魚
  const sea=W.isSea&&W.isSea(); weeds.visible=!sea; const mid=tmpC.copy(cDark).lerp(sea?cSea:cMid,clamp(L,0,1));
  fog.density+=((biteT<0?.42:.17)-fog.density)*Math.min(1,dt*3);
  fog.color.copy(mid); bgU.uMid.value.copy(mid); bgU.uTop.value.copy(mid).multiplyScalar(2.4).add(cTint.clone().multiplyScalar(L*.6)); bgU.uBot.value.copy(mid).multiplyScalar(.35);
  surfU.uCol.value.copy(mid).multiplyScalar(5); surfU.uFog.value.copy(mid);
  hemi.color.copy(mid).multiplyScalar(3.2); hemi.groundColor.copy(mid).multiplyScalar(.6);
  const lc=W.U.uLightCol.value; sunL.color.setRGB(lc.x*.5,lc.y*.55,lc.z*.45);
  cau.value.setRGB(.5,.6,.45).multiplyScalar(L*.9*clamp(day,0,1));
  pm.color.copy(mid).multiplyScalar(4); camLight.intensity=(1-day)*.9;
  parts.position.y=Math.sin(tt*.1)*.1; parts.rotation.y=tt*.01;
  // 魚的動作
  if(biteT<0){
    if(prog<1){ const e=sstep(0,1,prog); pos.copy(S).lerp(C,e).addScaledVector(perp,Math.sin(e*Math.PI*1.6)*.35*(1-e)); pos.y+=Math.sin(e*5)*.05; }
    else { pos.copy(C).addScaledVector(dirv,Math.sin(tt*3)*.03-.05); }
  } else {
    biteT+=dt; const k=Math.min(1,biteT/.15); pos.copy(C).addScaledVector(dirv,.05*k);
    if(biteT>.15) worm.visible=false;
    if(biteT>.3){ const s=biteT-.3; pos.addScaledVector(perp,s*.7).addScaledVector(dirv,-s*.2); pos.y-=s*.15; }
  }
  const vx=pos.x-prev.x, vz=pos.z-prev.z, sp=Math.hypot(vx,vz)/Math.max(dt,1e-4);
  if(sp>.02){ let ty=Math.atan2(-vz,vx), d=ty-yaw; while(d>Math.PI) d-=6.283; while(d<-Math.PI) d+=6.283; yaw+=d*Math.min(1,dt*4); }
  fish.position.copy(pos); fish.rotation.set(0,yaw,clamp((pos.y-prev.y)/Math.max(dt,1e-4)*.4,-.3,.3)); prev.copy(pos);
  if(fish.userData.mer){ const cx=cam.position.x-pos.x, cz=cam.position.z-pos.z, cl=Math.hypot(cx,cz)||1, vl=Math.hypot(vx,vz)||1e-5;
    const away=sp>.05&&(vx*cx+vz*cz)/(cl*vl)<-.4;
    fish.rotation.set(0,Math.atan2(cx,cz)+(away?Math.PI:0),clamp(-(vx*cz-vz*cx)/cl*8,-.25,.25)); fish.position.y+=Math.sin(tt*1.4)*.04; }
  uni.uSwim.value+=dt*(5+sp*14); uni.uAmp.value=.035+clamp(sp*.05,0,.08)+(biteT>=0&&biteT<.6?.06:0);
  worm.rotation.y=Math.sin(tt*3)*.25; rig.rotation.z=Math.sin(tt*.8)*.02;
  // 鏡頭
  camA+=dt*.05; focus.copy(BAIT).lerp(pos,.5); const cd=Math.max(1.3,pos.distanceTo(BAIT)*.95+fd.L*1.8);
  cam.position.set(focus.x+Math.cos(camA)*cd,focus.y+.18+Math.sin(tt*.7)*.03,focus.z+Math.sin(camA)*cd); cam.lookAt(focus);
  bg.position.copy(cam.position);
  for(const r of rays){ r.rotation.set(0,Math.atan2(cam.position.x-r.position.x,cam.position.z-r.position.z),.18); r.material.opacity=.09*L*(.6+.4*Math.sin(tt*.5+r.userData.ph)); r.material.color.setRGB(.8,1,.75); }
}
function resize(w,h){ cam.aspect=w/h; cam.fov=w<h?62:48; cam.updateProjectionMatrix(); }
return { start, end, update, resize, active:()=>on, setProgress:a=>{ prog=clamp(a,0,1); }, bite:()=>{ if(on&&biteT<0) biteT=0; }, render:()=>R.render(scene,cam) };
}

/* ---------- 釣具與魚餌資料 ---------- */
const GEAR={
 rod:[{name:'入門碳竿',price:0,lv:1,cast:30,tens:1,col:'#1d4fb8'},{name:'中調碳竿',price:1500,lv:3,cast:36,tens:.92,col:'#1f6e48'},
      {name:'高模數競技竿',price:6000,lv:6,cast:42,tens:.85,col:'#141418',gold:true},{name:'傳奇手工竿',price:20000,lv:10,cast:50,tens:.78,col:'#8e1a20',gold:true},{name:'人魚之竿',price:0,lv:1,cast:54,tens:.72,col:'#dfeef4',gold:true,req:'mer3'},{name:'月神之竿',price:0,lv:1,cast:60,tens:.64,col:'#bcd8ff',gold:true,req:'moon'}],
 line:[{name:'尼龍線 6 lb',price:0,lv:1,s:4.2},{name:'尼龍線 10 lb',price:800,lv:2,s:5.0},{name:'碳纖線 14 lb',price:3000,lv:4,s:6.0},
       {name:'PE 編織線 20 lb',price:9000,lv:7,s:7.2},{name:'PE 編織線 30 lb',price:25000,lv:11,s:8.6}],
 reel:[{name:'2000 型紡車輪',price:0,lv:1,spd:1.9,drag:1},{name:'3000 型紡車輪',price:1200,lv:3,spd:2.2,drag:.85},
       {name:'4000 型高速輪',price:5000,lv:5,spd:2.6,drag:.7},{name:'碳纖旗艦輪',price:16000,lv:9,spd:3.0,drag:.55}]};
const BAITS=[
 {id:'worm',name:'蚯蚓',icon:'🪱',price:0,pack:0,lv:1,desc:'什麼魚都吃一點，用不完',aff:{},rare:0,wait:1},
 {id:'corn',name:'甜玉米',icon:'🌽',price:60,pack:10,lv:1,desc:'鯉魚、草魚、鯽魚、印度鯪愛吃，咬口快',aff:{reba:2.2,bluegill:1.6,crappie:1.3,crucian:2.2,tilapia:1.8,carp:2.5,grasscarp:2.2,silvercarp:1.2,clarias:.5,mekong:1.5,yperch:.8,whitefish:.8},rare:-.2,wait:.75},
 {id:'shrimp',name:'活蝦',icon:'🦐',price:180,pack:10,lv:2,desc:'鱖魚、鯰魚、黑鯛、真鯛、江鱈的最愛',aff:{perch:2.2,channel:2,flathead:1.4,clarias:1.8,blackcarp:2,carp:1.2,porgy:2.2,redbream:2,emperor:1.8,burbot:1.8,wrasse:1.2,yperch:1.8,whitefish:1.6,eel:1.6,laketrout:1.2,clownfish:1.6,copperband:1.6,bluetang:1.2,seahorse:1.8,blenny:1.4,angelfish:1.2},rare:.35,wait:1},
 {id:'soft',name:'軟蟲路亞',icon:'🐛',price:240,pack:10,lv:3,desc:'專攻黑鱸和弓鰭魚',aff:{lmbass:2.6,smbass:2.6,bowfin:1.5,snakehead:1.8,peacock:1.5},rare:.4,wait:1.05},
 {id:'live',name:'活魚餌',icon:'🐟',price:600,pack:5,lv:5,desc:'小魚幾乎不碰，大型掠食魚才會咬',aff:{flathead:3,gar:3,bowfin:2,channel:1.6,snakehead:2.2,peacock:2.4,arapaima:3,spgar:2,clarias:.6,cobia:2,yellowfin:1.5,sawara:1.5,emperor:1.2,char:1.6,burbot:1.5,bluegill:.2,crappie:.2,reba:.2,crucian:.2,tilapia:.3,eel:2.5,taimen:2.5,laketrout:2,gt:2.2,swordfish:1.8,mekong:.3,yperch:.3,whitefish:.3,threadfin:2},rare:1.0,wait:1.4},
 {id:'spoon',lure:'spoon',name:'金屬亮片',icon:'🥄',price:900,pack:15,lv:4,desc:'中速穩定收線，閃光吸引掠食魚（路亞：自己收線操作）',aff:{perch:2,lmbass:1.8,smbass:1.8,amber:1.6,ribbon:2,peacock:1.8,snakehead:1.2,spgar:1.2,sawara:2.2,skipjack:2,yellowfin:1.2,char:1.4,laketrout:1.8,taimen:1.6,yperch:1.2,gt:1.2,threadfin:1.4},rare:.4,wait:1},
 {id:'crank',lure:'crank',name:'曲柄硬餌',icon:'🐠',price:1400,pack:15,lv:6,desc:'快速收線會下潛，黑鱸、金目鱸最愛（需要好捲線器）',aff:{lmbass:2.5,smbass:2.2,barra:2,gar:1.5,grouper:1.5,mahi:1.4,peacock:2.2,spgar:1.2,arapaima:1.2,emperor:1.2,cobia:1.4,gt:1.6,taimen:1.4},rare:.5,wait:1},
 {id:'minnow',lure:'minnow',name:'米諾',icon:'🐟',price:1800,pack:15,lv:8,desc:'抽一下、停一下，模仿受傷小魚，大型掠食魚無法抗拒',aff:{smbass:2.2,barra:2.2,lmbass:1.6,tuna:1.6,mahi:1.8,marlin:1.4,peacock:2.6,snakehead:1.6,spgar:1.6,arapaima:1.5,yellowfin:1.8,sawara:1.6,skipjack:1.4,cobia:1.5,gt:2.4,taimen:2,laketrout:1.6,swordfish:1.2,threadfin:1.6},rare:.6,wait:1},
 {id:'moon',name:'月光餌',icon:'🌙',price:1500,pack:3,lv:3,desc:'散發微光的神秘餌，傳說中的生物會被吸引',aff:{mermaid:25,ghost:12,golden:12,seabeast:10},rare:.6,wait:1.3}];
const BOAT_COST={coins:25000,scale:30,bone:10,pearl:2};   // 修復老漁人的漁船
const xpNext=lv=>Math.round(120*Math.pow(lv,1.75));   // 升級曲線：Lv 10 約 6,700、Lv 20 約 22,600
/* 等級里程碑：每級解鎖什麼（升級提示與 ⭐ 面板共用） */
const LV_TITLES={10:'見習漁人',20:'湖畔好手',30:'老練漁夫',40:'傳說釣手',50:'守湖宗師'};
const LV_EVENTS={5:'主線第三章「暴風雨之後」',8:'主線第四章「湖心的秘密」',10:'主線第五章「冰下的歌聲」',15:'大師挑戰：巨型鱷雀鱔',18:'主線終章「深淵之王」、大師挑戰：鯰魚之王',20:'大師挑戰：旗魚王',24:'大師挑戰：深淵海王',25:'大師挑戰：大白鯊女王'};
function lvGains(lv){ const g=[]; if(lv>=5) g.push('天賦點 +1'); if(lv%3===0&&lv<=30) g.push('強化上限提高到 +'+Math.min(10,lv/3)); if(LV_TITLES[lv]) g.push('稱號「'+LV_TITLES[lv]+'」'); if(LV_EVENTS[lv]) g.push(LV_EVENTS[lv]); return g; }
window.__LVINFO={gains:lvGains,titles:LV_TITLES,xpNext:lv=>xpNext(lv)};

function createMeta(c){
'use strict';
const {save,persist,toast,Snd,SPECIES,RAR,P,setCoins,vib,PRESETS,setHour}=c;
const $=id=>document.getElementById(id);
save.gear=save.gear||{rod:[0],line:[0],reel:[0]}; save.eq=save.eq||{rod:0,line:0,reel:0}; save.baits=save.baits||{};
save.bait=save.bait||'worm'; save.xp=save.xp||0; save.lv=save.lv||1; save.quests=save.quests||[];
if(save.uw===undefined) save.uw=true; if(save.vibe===undefined) save.vibe=true;
const sheet=$('sheet'), shT=$('shT'), shB=$('shB');
const ECO=createEco({save,persist,toast,Snd,P,SPECIES,RAR,setCoins:()=>setCoins(),applyRod:()=>applyRod()}); window.__ECO=ECO;
let cur=null, shopTab='rod', resetArm=false, dexSel=null;
const fmtW=w=>w<1?Math.round(w*1000)+' g':w.toFixed(2)+' kg';
const PERN={dawn:'清晨',dusk:'黃昏',night:'夜晚'};

// 這個釣點現在去得了嗎（跟釣點地圖用同一套判斷：主線開放＋有需要的船）
function spotOK(i){ const s=SPOTS[i], why=window.__STORY?window.__STORY.lock(i):(save.lv<s.lv||(s.req==='mer1'&&!(save.mer&&save.mer.n>=1)));
  return !why&&!((s.kayak&&!save.kayak)||(s.yacht&&!save.yacht)); }
// 這種魚可以去哪裡釣：回傳地點文字；目前去不了任何一個出沒釣點就回傳 null
function whereOf(sp){ const L=sp.loc||'lake';
  const ok=SPOTS.map((s,i)=>i).filter(i=>spotOK(i)&&((SPOTS[i].loc||'lake')===L||(L==='both'&&SPOTS[i].loc!=='ice')||(SPOTS[i].loc==='ice'&&sp.ice))&&(!sp.spots||sp.spots.includes(SPOTS[i].id)));
  if(!ok.length) return null; if(sp.spots) return ok.map(i=>SPOTS[i].name).join('、');
  return L==='sea'?'海上':L==='ice'?'冰湖':'濕地任一處'; }
function newQuest(ex){
  const lv=save.lv, per=['dawn','dusk','night'][Math.floor(Math.random()*3)];
  const pool={
    count:()=>{ const n=3+Math.floor(lv*.6); return {n,txt:`釣到任意魚 ${n} 尾`}; },
    rare:()=>{ const n=lv<4?1:2; return {n,min:1,txt:`釣到稀有以上的魚 ${n} 尾`}; },
    weight:()=>{ const n=Math.round(3+lv*2.5); return {n,txt:`累計漁獲重量 ${n} kg`}; },
    sp:()=>{ const cs=SPECIES.map(s=>[s,whereOf(s)]).filter(([s,w])=>w&&!s.special&&!s.noSell&&s.rar<=Math.min(4,Math.floor(lv/3)+1)&&s.lvl[0]<=lv*1.5+10);   // 魚的等級太高（太難釣）就先不出成任務
      const [s,w]=cs[Math.floor(Math.random()*cs.length)]||[SPECIES.find(x=>x.id==='bluegill'),'木碼頭'], n=s.rar>=2?1:2; return {n,id:s.id,txt:`釣到${s.name} ${n} 尾（${w}）`}; },
    per:()=>{ const n=2+Math.floor(lv/4); return {n,per,txt:`在${PERN[per]}釣到魚 ${n} 尾`}; },
    perfect:()=>{ const n=2+Math.floor(lv/5); return {n,txt:`完美揚竿 ${n} 次`}; },
    release:()=>({n:2,txt:'放生 2 尾魚'}),
    ice:()=>{ const n=2+Math.floor(lv/8); return {n,txt:`在冰湖釣到魚 ${n} 尾`}; }};
  const keys=Object.keys(pool).filter(k=>!ex.includes(k)&&(k!=='ice'||lv>=10)), k=keys[Math.floor(Math.random()*keys.length)];
  const q=Object.assign({k,prog:0},pool[k]()); const diff={count:1,rare:1.6,weight:1.2,sp:1.5,per:1.2,perfect:1.3,release:.8,ice:1.4}[k];
  q.reward=Math.round((60+lv*45)*diff/10)*10; q.xp=Math.round(xpNext(lv)*.06*diff); return q;   // 任務經驗依這一級所需經驗按比例給
}
const QDIFF={count:1,rare:1.6,weight:1.2,sp:1.5,per:1.2,perfect:1.3,release:.8,ice:1.4};
(save.quests||[]).forEach(q=>{ const want=Math.round(xpNext(save.lv)*.06*(QDIFF[q.k]||1)); if(!q.xp||q.xp<want*.5) q.xp=want; });   // 舊任務的經驗用新公式重算
function fillQuests(){ while(save.quests.length<3) save.quests.push(newQuest(save.quests.map(q=>q.k))); persist(); }
function addXP(x){ save.xp+=x; while(save.xp>=xpNext(save.lv)){ save.xp-=xpNext(save.lv); save.lv++; const lv=save.lv;
  if(LV_TITLES[lv]){ save.titles=save.titles||[]; if(save.titles.indexOf(LV_TITLES[lv])<0) save.titles.push(LV_TITLES[lv]); }
  const gs=lvGains(lv); setTimeout(()=>{ toast('升級！Lv '+lv+(gs.length?'<br><small>'+gs.join('、')+'</small>':''),'good',3600); Snd.fanfare(2); vib([40,40,80]); },1600); } }
{ save.titles=save.titles||[]; Object.keys(LV_TITLES).forEach(k=>{ if(save.lv>=+k&&save.titles.indexOf(LV_TITLES[k])<0) save.titles.push(LV_TITLES[k]); }); }   // 舊存檔補發等級稱號
function gear(){ const g0=ECO.enhance({rod:GEAR.rod[save.eq.rod]||GEAR.rod[0], line:GEAR.line[save.eq.line]||GEAR.line[0], reel:GEAR.reel[save.eq.reel]||GEAR.reel[0]}); return window.__TAL?window.__TAL.apply(g0):g0; }
function applyRod(){ const r=GEAR.rod[save.eq.rod]||GEAR.rod[0]; P.setRodLook(r.col,!!r.gold); ECO.applySkins(); }
function curBait(){ return BAITS.find(b=>b.id===save.bait)||BAITS[0]; }
function useBait(){ const b=curBait(); if(b.id==='worm') return b; const n=save.baits[b.id]||0;
  if(n<=0){ save.bait='worm'; persist(); syncHUD(); toast(b.name+'用完了，改用蚯蚓','warn'); return BAITS[0]; }
  save.baits[b.id]=n-1; persist(); syncHUD(); return b; }
function syncHUD(){
  $('lvN').textContent=save.lv; $('xpF').style.width=Math.min(100,save.xp/xpNext(save.lv)*100).toFixed(1)+'%';
  const b=curBait(); $('baitI').textContent=b.icon; $('baitN').textContent=b.name; $('baitC').textContent=b.id==='worm'?'∞':(save.baits[b.id]||0);
  $('bQuest').classList.toggle('dotn',save.quests.some(q=>q.prog>=q.n));
}
function onCatch(fd,o){
  const xp=Math.round((fd.lvl+3)*RAR[fd.sp.rar].mult*(fd.xpMul||1)); addXP(xp);
  if(window.__G&&window.__G.loc==='ice') save.iceN=(save.iceN||0)+1;
  for(const q of save.quests){ if(q.prog>=q.n) continue; let d=0;
    if(q.k==='count') d=1; else if(q.k==='rare') d=fd.sp.rar>=q.min?1:0; else if(q.k==='weight') d=fd.w;
    else if(q.k==='sp') d=fd.sp.id===q.id?1:0; else if(q.k==='per') d=o.per===q.per?1:0; else if(q.k==='perfect') d=o.perfect?1:0; else if(q.k==='ice') d=(window.__G&&window.__G.loc==='ice')?1:0;
    if(d>0){ q.prog=Math.min(q.n,q.prog+d); if(q.prog>=q.n){ const t=q.txt; setTimeout(()=>toast('任務完成：'+t,'good',2200),2600); } } }
  ECO.drop(fd); persist(); syncHUD(); return xp;
}
function onRelease(){ for(const q of save.quests) if(q.k==='release'&&q.prog<q.n){ q.prog++; if(q.prog>=q.n) toast('任務完成：'+q.txt,'good',2200); } persist(); syncHUD(); }
function claim(i){ const q=save.quests[i]; if(!q||q.prog<q.n) return; save.coins+=q.reward; addXP(q.xp); save.quests.splice(i,1); fillQuests(); setCoins(); Snd.coin(); toast(`領取 🪙 ${q.reward} 與 ${q.xp} 經驗`,'good'); }

const row=(name,sub,right,col)=>`<div class="row"${col?` style="--rc:${col}"`:''}>${col?'<span class="dot"></span>':''}<div class="nm"><b>${name}</b><small>${sub}</small></div><div class="rt">${right}</div></div>`;
function render(){
  let h='';
  if(cur==='shop'){
    shT.textContent='釣具店';
    h+='<div class="tabs">'+[['rod','釣竿'],['line','釣線'],['reel','捲線器'],['bait','魚餌'],['enh','🔨 強化'],['item','🧳 道具'],['skin','🎨 外觀'],['market','📈 魚市']].map(t=>`<button class="tab${shopTab===t[0]?' on':''}" data-a="tab" data-v="${t[0]}">${t[1]}</button>`).join('')+'</div>';
    h+=`<div class="note">🪙 ${save.coins.toLocaleString()}，Lv ${save.lv}</div>`+ECO.matLine();
    if(['enh','item','skin','market'].includes(shopTab)) h+=ECO.render(shopTab,GEAR);
    else if(shopTab!=='bait'){
      h+=GEAR[shopTab].map((it,i)=>{ const own=save.gear[shopTab].includes(i), eq=save.eq[shopTab]===i, lock=save.lv<it.lv||(it.req==='mer3'&&!(save.mer&&save.mer.n>=3))||(it.req==='moon'&&!(save.moon&&save.moon.done));
        const sub=shopTab==='rod'?`拋投 ${it.cast} m，拉扯張力 −${Math.round((1-it.tens)*100)}%`:shopTab==='line'?`強度 ${it.s.toFixed(1)}，越高越不容易斷`:`收線 ${it.spd} m/s，爆線累積 −${Math.round((1-it.drag)*100)}%`;
        const btn=eq?'<span class="eqd">使用中</span>':own?`<button class="sbtn" data-a="eq" data-v="${i}">裝備</button>`:lock?`<span class="lk">${it.req==='moon'?'完成月光灣的故事':it.req?'美人魚第 3 次相遇':'Lv '+it.lv+' 解鎖'}</span>`:`<button class="sbtn pri" data-a="buy" data-v="${i}">🪙 ${it.price.toLocaleString()}</button>`;
        return row(it.name,sub,btn); }).join('');
    } else {
      h+=BAITS.map((b,i)=>{ const n=b.id==='worm'?'∞':(save.baits[b.id]||0), lock=save.lv<b.lv, using=save.bait===b.id;
        let btn=''; if(b.id!=='worm') btn+=lock?`<span class="lk">Lv ${b.lv} 解鎖</span>`:`<button class="sbtn" data-a="bb" data-v="${i}">+${b.pack} 🪙${b.price}</button>`;
        btn+=using?'<span class="eqd">使用中</span>':(b.id==='worm'||n>0)?`<button class="sbtn pri" data-a="ub" data-v="${i}">使用</button>`:'';
        return row(`${b.icon} ${b.name} <small class="cnt">×${n}</small>`,b.desc,`<div class="bb">${btn}</div>`); }).join('');
    }
  } else if(cur==='quest'){
    shT.textContent='任務';
    h+='<div class="note">完成後點領取，會立刻補上新任務</div>';
    h+=save.quests.map((q,i)=>{ const done=q.prog>=q.n, pg=q.k==='weight'?`${q.prog.toFixed(1)}/${q.n}`:`${q.prog}/${q.n}`;
      return `<div class="row qrow"><div class="nm"><b>${q.txt}</b><small>${pg}，獎勵 🪙 ${q.reward} 與 ${q.xp} 經驗</small><span class="pbar"><i style="width:${Math.min(100,q.prog/q.n*100)}%"></i></span></div>`+
        `<div class="rt">${done?`<button class="sbtn pri" data-a="claim" data-v="${i}">領取</button>`:''}</div></div>`; }).join('');
  } else if(cur==='log'){
    shT.textContent='漁獲圖鑑';
    const found=SPECIES.filter(s=>save.dex[s.id]).length;
    h+=`<div class="note">已發現 ${found}/${SPECIES.length} 種，總漁獲 ${save.total} 尾</div>`;
    const dsp=dexSel&&SPECIES.find(s=>s.id===dexSel);
    if(dsp){ h=dexPage(dsp); }
    else { h+='<div class="note" style="font-size:12px">點任一種魚查看詳細資料</div>';
    h+=SPECIES.map(sp=>{ const d=save.dex[sp.id], r=RAR[sp.rar];
      return `<div class="dexrow" data-a="dex" data-v="${sp.id}"><img class="dexth" data-th="${sp.id}" alt="" src="${DEXV.cached(sp.id,!!d)||DEXV.BLANK}">`+row(d?sp.name:'？？？',`${r.name}，LVL ${sp.lvl[0]}–${sp.lvl[1]}，${styOf(sp.id).n}`,d?`${d.n} 尾<br><small>最大 ${fmtW(d.bw)}</small>`:'<small>未釣獲</small>',r.col)+'</div>'; }).join(''); }
  } else if(cur==='home'){
    const HM=window.__HOME, hd=HM.data(), t=HM.tank(), nm=id=>(SPECIES.find(s=>s.id===id)||{}).name||id, dt=d=>new Date(d).toLocaleDateString('zh-TW');
    shT.textContent='老漁人的小屋'; h+='<button class="sbtn" data-a="mapBack">← 返回釣點</button>';
    const fl=(arr,water)=>arr.length?arr.map((f,i)=>row(nm(f.id)+(f.g?' <small class="cnt">'+f.g+'</small>':''),`${Math.round(f.L*100)} 公分・${fmtW(f.w)}・${f.at||''} ${dt(f.d)}`,`<button class="sbtn" data-a="hrel" data-v="${water}:${i}">放回湖裡</button>`)).join(''):'<div class="note" style="font-size:12px">還是空的。釣到魚時按「🏠 帶回家」就會放進來。</div>';
    h+=`<div class="note">${t.n}（淡水）${hd.fresh.length}/${t.cap}・最大可放 ${Math.round(t.maxL*100)} 公分${hd.chiller?'・已裝冷水機':''}</div>`+fl(hd.fresh,'fresh');
    if(hd.seaTank) h+=`<div class="note">海水缸 ${hd.sea.length}/${HM.SEA_TANK.cap}・最大可放 ${Math.round(HM.SEA_TANK.maxL*100)} 公分</div>`+fl(hd.sea,'sea');
    h+=`<div class="note">標本牆 ${hd.mounts.length}/${HM.MOUNT_MAX}</div>`+(hd.mounts.length?hd.mounts.map((f,i)=>row('🖼 '+nm(f.id),`${Math.round(f.L*100)} 公分・${fmtW(f.w)}・${f.at||''} ${dt(f.d)}`,`<button class="sbtn" data-a="hrel" data-v="mounts:${i}">取下</button>`)).join(''):'<div class="note" style="font-size:12px">放不進水族箱的大魚，可以花錢做成標本掛在牆上。</div>');
    h+='<div class="note">小屋設備</div>'; const nx=HM.TANKS[hd.tier+1];
    if(nx) h+=row('換成'+nx.n,`容量 ${nx.cap} 條、最大可放 ${Math.round(nx.maxL*100)} 公分`,`<button class="sbtn pri" data-a="hbuy" data-v="tier">🪙 ${nx.price.toLocaleString()}</button>`);
    if(!hd.chiller) h+=row('冷水機','裝了才能養冰湖的魚',`<button class="sbtn pri" data-a="hbuy" data-v="chiller">🪙 ${HM.CHILLER.price.toLocaleString()}</button>`);
    if(!hd.seaTank) h+=row('海水缸','另一個水族箱，專門養海水魚',!save.yacht?'<span class="lk">需要漁船</span>':`<button class="sbtn pri" data-a="hbuy" data-v="sea">🪙 ${HM.SEA_TANK.price.toLocaleString()}</button>`);
    // 家具：每件顯示目前效果、能不能用、下一級；在小屋裡才能使用，升級哪裡都可以
    h+='<div class="note">家具（在小屋裡點家具也能使用與升級）</div>'; const home=document.body.classList.contains('athome');
    HM.FURN.forEach(d=>{ const F=HM.furnInfo(d.id), nx=F.next, st='★'.repeat(F.lv+1)+'☆'.repeat(d.lv.length-1-F.lv);
      const useB=d.id==='fire'?'':home?`<button class="sbtn${F.st.ok?' pri':''}" data-a="fuse" data-v="${d.id}">${d.act}</button>`:'';
      const upB=nx?`<button class="sbtn${(save.lv||1)>=nx.need&&save.coins>=nx.p?' pri':''}" data-a="fup" data-v="${d.id}">升級 🪙${nx.p.toLocaleString()}</button>`:'<span class="lk">最高級</span>';
      h+=row(`${d.i} ${d.n} <small style="color:#e8b84a">${st}</small>`,`${F.cur.d}${d.id!=='fire'&&d.id!=='rock'?'・'+F.st.txt:''}${nx?'<br>下一級「'+nx.n+'」：'+nx.d+'（Lv '+nx.need+'）':''}`,`<div class="bb">${useB}${upB}</div>`); });
  } else if(cur==='set'){
    shT.textContent='設定';
    h+='<div class="note">切換時段</div><div class="tabs">'+PRESETS.map((p,i)=>`<button class="tab" data-a="time" data-v="${i}">${p[1]}</button>`).join('')+'</div>';
    { const gq=save.gfx||'high'; h+='<div class="note">畫質（手機卡頓時調低）</div><div class="tabs">'+[['high','高'],['mid','中'],['low','低']].map(([k,n])=>`<button class="tab${gq===k?' on':''}" data-a="gfx" data-v="${k}">${n}</button>`).join('')+'</div><div class="note" style="font-size:12px">高：全部特效｜中：關光束、倒影降解析｜低：關倒影、霧層、雨圈、草叢，解析度 1 倍（高為 2.5 倍、中為 1.5 倍）</div>'; }
    { const n=window.__DIAG?window.__DIAG.count():0; h+=`<div class="note">問題回報（目前記錄 ${n} 筆錯誤）</div><div class="tabs"><button class="tab" data-a="diag" data-v="copy">📋 複製診斷資訊</button><button class="tab" data-a="diag" data-v="clear">清除記錄</button></div><div class="note" style="font-size:12px">遇到怪問題時，按「複製診斷資訊」再貼給開發者，就能看到你手機上實際發生的錯誤和幀率。</div>`; }
    h+='<div class="note">天氣</div><div class="tabs">'+[['auto','自動'],['clear','晴'],['breezy','有風'],['cloudy','陰'],['drizzle','毛毛雨'],['rain','雨'],['storm','雷雨'],['fog','霧']].map(w=>`<button class="tab${(save.wxMode||'auto')===w[0]?' on':''}" data-a="wx" data-v="${w[0]}">${w[1]}</button>`).join('')+'</div>';
    h+='<div class="note">釣魚難度（越難，金幣與經驗越多）</div><div class="tabs">'+Object.keys(DIFF).map(k=>`<button class="tab${(save.diff||'normal')===k?' on':''}" data-a="diff" data-v="${k}">${DIFF[k].n}</button>`).join('')+'</div>';
    const tg=(k,name,sub,onv)=>row(name,sub,`<button class="sbtn${onv?' pri':''}" data-a="tg" data-v="${k}">${onv?'開':'關'}</button>`);
    h+=tg('sound','音效','環境聲、捲線器、水花',Snd.isOn());
    h+=tg('vibe','震動','咬餌、拉扯時的手機震動',save.vibe!==false);
    { const st=window.__CLOUD?window.__CLOUD.status():{state:'nocfg'};
      if(st.state==='in') h+=row('☁️ 雲端存檔','已登入 '+st.name+'，進度會自動同步到你的 Google 帳號',`<button class="sbtn" data-a="cloud" data-v="out">登出</button>`);
      else if(st.state==='out') h+=row('☁️ 雲端存檔','用 Google 帳號登入，換手機或清除瀏覽器也不會丟進度。目前的本機進度會先上傳，不會被洗掉',`<button class="sbtn pri" data-a="cloud" data-v="in">Google 登入</button>`);
      else h+=row('☁️ 雲端存檔','Google 登入尚未設定',`<span class="lk">尚未設定</span>`);
      if(st.state==='in'&&window.__CLOUD.isTest&&window.__CLOUD.isTest()) h+=row('🧪 測試帳號','把正式版目前的進度複製過來覆蓋測試存檔（金幣維持 999,999）',`<button class="sbtn" data-a="cloud" data-v="copy">複製正式進度</button>`);
      h+=row('📲 安裝到桌面',PWA.installed()?'已安裝成 App，從桌面開啟時進度一樣保留':'像 App 一樣從手機桌面開啟，進度與瀏覽器共用',PWA.installed()?`<span class="lk">已安裝</span>`:`<button class="sbtn pri" data-a="pwa">安裝</button>`); }
    h+=row('💎 支持作者','遊戲完全免費。作者的水晶小店「靜月之光」，喜歡的話歡迎逛逛',`<button class="sbtn pri" data-a="shop">逛逛</button>`);
    h+=tg('uw','水下鏡頭','魚靠近餌時切到水下看牠咬餌',save.uw!==false);
    h+=tg('scare','驚嚇效果','夜裡偶爾會有嚇人的事……心臟不好或小朋友玩請關閉',!save.noScare);
    h+=tg('imm','沉浸模式','隱藏上方大部分介面，只留設定和動作按鈕',!!save.imm);
    h+='<div class="note">真實魚模型：Barramundi Fish © Microsoft 2017，CC0 授權（Khronos glTF Sample Assets）</div>';
    h+='<div class="note">真實動物與魚類 3D 模型（Sketchfab，CC-BY 4.0）：<br>'+(window.__MDL?window.__MDL.credits():'')+'</div>';
    h+='<div class="note">實拍湖景、HDR 光照、碼頭與泥灘材質、枯木樹樁岩石蕨類模型：Poly Haven（CC0）</div>';
    h+=row('重置存檔','金幣、等級、裝備、圖鑑全部清除',`<button class="sbtn danger" data-a="reset">${resetArm?'再按一次確認':'重置'}</button>`);
  }
  else if(cur==='spot'){
    shT.textContent='釣點';
    if(window.__HOME&&window.__HOME.unlocked()){ const HM=window.__HOME, hd=HM.data(), t=HM.tank();
      h+=row('🏠 老漁人的小屋',`${t.n} ${hd.fresh.length}/${t.cap}${hd.seaTank?'・海水缸 '+hd.sea.length+'/'+HM.SEA_TANK.cap:''}・標本 ${hd.mounts.length}/${HM.MOUNT_MAX}`,'<div class="bb"><button class="sbtn" data-a="homeP">管理</button><button class="sbtn pri" data-a="homeGo">回家</button></div>'); }
    if(!save.kayak) h+=row('🛶 獨木舟','買了才能划到湖裡的其他釣點','<button class="sbtn pri" data-a="kayak">🪙 800</button>');
    if(!save.yacht){ const ok=window.__STORY&&window.__STORY.done('c5'), m=save.mat||{}, need=BOAT_COST, have=k=>(m[k]||0)>=need[k];
      h+=ok?row('🛥️ 修復老漁人的漁船',`停在河口船塢的舊漁船，修好就能出海。需要 🪙 ${need.coins.toLocaleString()}、魚鱗 ${need.scale}（有 ${m.scale||0}）、魚骨 ${need.bone}（有 ${m.bone||0}）、珍珠 ${need.pearl}（有 ${m.pearl||0}）`,`<button class="sbtn pri" data-a="yacht"${save.coins>=need.coins&&have('scale')&&have('bone')&&have('pearl')?'':' disabled'}>修復</button>`)
          :row('🔒 ？？？的漁船','完成主線第六章「月潮」後，汐月會告訴你它在哪裡','<span class="lk">第六章後</span>'); }
    h+=SPOTS.map((s,i)=>{ const why=window.__STORY?window.__STORY.lock(i):null, lock=window.__STORY?!!why:(save.lv<s.lv||(s.req==='mer1'&&!(save.mer&&save.mer.n>=1))), need=(s.kayak&&!save.kayak)||(s.yacht&&!save.yacht), here=c.curSpot()===i;
      const btn=here?'<span class="eqd">目前位置</span>':lock?`<span class="lk">${why||(s.req?'需要美人魚的認可':'Lv '+s.lv+' 解鎖')}</span>`:need?`<span class="lk">${s.yacht?'需要遊艇':'需要獨木舟'}</span>`:`<button class="sbtn pri" data-a="go" data-v="${i}">${s.yacht?'出海':s.kayak?'划過去':'回碼頭'}</button>`;
      return row(lock?'🔒 '+(s.req?'？？？':s.name):(s.yacht?'🛥️ ':s.kayak?'🛶 ':s.loc==='ice'?'❄️ ':'🪵 ')+s.name,lock?(s.req?'只在月光下才看得見的地方':'跟著老漁人的手記前進，就會找到這裡'):s.sub,btn); }).join('');
  }
  shB.innerHTML=h;
  { const dsp=cur==='log'&&dexSel&&SPECIES.find(s=>s.id===dexSel); if(dsp) DEXV.show(dsp,$('dexCv'),!!save.dex[dsp.id]); else { DEXV.stop(); if(cur==='log') DEXV.thumbs(SPECIES.map(s=>[s,!!save.dex[s.id]])); } }
}
// 圖鑑詳細頁：未釣獲只給出沒線索，釣獲後顯示完整資料
const TIME_N={dawn:'清晨',day:'白天',dusk:'傍晚',night:'夜晚'}, STAT_N=[['pow','力量'],['spd','速度'],['agi','靈活'],['stam','耐力'],['jump','跳躍']];
const SPECIAL_N={golden:'傳說魚：極少出現，月光灣機率較高',moonkoi:'傳說魚：只在月光灣的特殊夜晚現身',king:'終章 Boss：深淵之王'};
function dexWhere(sp){ const L=sp.loc||'lake';
  const ok=SPOTS.filter(s=>(s.loc||'lake')===L||(s.loc==='ice'&&sp.ice));
  const best=ok.filter(s=>(s.aff[sp.id]||0)>=1.3).sort((a,b)=>b.aff[sp.id]-a.aff[sp.id]).map(s=>s.name);
  const area=L==='sea'?'海上（需要漁船）':L==='ice'?'冰湖':'濕地湖區'+(sp.ice?'、冰湖':'');
  if(sp.spots){ const only=SPOTS.filter(s=>sp.spots.includes(s.id)).map(s=>s.name); return {area:'只在'+only.join('、')+'出現',best:[]}; }   // 釣點專屬魚種
  return {area,best}; }
function dexPage(sp){ const d=save.dex[sp.id], r=RAR[sp.rar], wh=dexWhere(sp), tm=sp.time||{};
  const tmax=Math.max(...Object.values(tm),0), bestT=Object.keys(TIME_N).filter(k=>tm[k]&&tm[k]>=tmax*.9).map(k=>TIME_N[k]).join('、')||'不限';
  let h=`<button class="sbtn" data-a="dexback">← 返回列表</button>`;
  h+=`<div class="dexview${d?'':' sil'}"><canvas id="dexCv"></canvas><small>${d?'拖曳旋轉':'剪影'}</small></div>`;
  h+=`<div class="dexhd" style="--rc:${r.col}"><div><b>${d?sp.name:'？？？'}</b><small>${r.name}${d?'｜'+sp.sci:''}</small></div></div>`;
  h+=`<div class="dexsec">出沒地點：${wh.area}${wh.best.length?'<br>最佳釣點：'+wh.best.join('、'):''}<br>活躍時段：${bestT}${sp.special&&SPECIAL_N[sp.special]?'<br>'+SPECIAL_N[sp.special]:''}</div>`;
  if(!d){ h+='<div class="dexsec dim">還沒釣到這種魚，釣到後會解鎖外觀、介紹與完整資料。</div>'; return `<div style="--rc:${r.col}">${h}</div>`; }
  const W=x=>sp.k*Math.pow(x/100,3), wl=W(sp.len[0])*.9, wu=W(sp.len[1])*1.12, val=w=>Math.round(sp.price*Math.pow(w+.3,.85)*r.mult*.4);
  h+=`<div class="dexsec">${sp.desc||''}</div>`;
  h+=`<div class="dexgrid"><span>體長</span><b>${sp.len[0]}–${sp.len[1]} 公分</b><span>體重</span><b>${fmtW(wl)}–${fmtW(wu)}</b><span>等級</span><b>LVL ${sp.lvl[0]}–${sp.lvl[1]}</b><span>參考售價</span><b>${sp.noSell?'保育類・不可販售':'🪙 '+val(wl).toLocaleString()+'–'+val(wu).toLocaleString()}</b><span>拉扯型態</span><b>${styOf(sp.id).n}</b></div>`;
  if(sp.f){ h+='<div class="dexsec">'+STAT_N.map(([k,n])=>{ const mx=Math.max(...SPECIES.map(s=>s.f?s.f[k]||0:0),.01), v=Math.min(1,(sp.f[k]||0)/mx);
    return `<div class="dexbar"><span>${n}</span><i><em style="width:${(v*100).toFixed(0)}%"></em></i></div>`; }).join('')+'</div>'; }
  h+=`<div class="dexgrid"><span>累計釣獲</span><b>${d.n} 尾</b><span>最重紀錄</span><b>${fmtW(d.bw)}</b>${d.bl?`<span>最長紀錄</span><b>${Math.round(d.bl*100)} 公分</b>`:''}${d.f?`<span>首次釣獲</span><b>${new Date(d.f).toLocaleDateString('zh-TW')}</b>`:''}</div>`;
  return `<div style="--rc:${r.col}">${h}</div>`; }
// 圖鑑 3D 預覽：用遊戲裡同一個魚模型（真實模型優先），以主渲染器畫到離屏目標再複製到頁面畫布；
// 只在詳細頁開著時運作，關閉即停止。未釣獲顯示黑色剪影。
const DEXV=(()=>{ const T=THREE, R=c.W.renderer; let scene,cam,rt,cv,ctx,img,buf,holder,obj,sp0,caught,raf=0,last=0,yaw=.55,pitch=.12,drag=null,idle=0,real=false,chk=0;
  const sil=new T.MeshBasicMaterial({color:0x000000});
  function ensure(){ if(scene) return; scene=new T.Scene();
    scene.add(new T.HemisphereLight(0xe8f2ff,0x40382c,1.15));
    const k=new T.DirectionalLight(0xffffff,1.7); k.position.set(2,3,4); scene.add(k);
    const f=new T.DirectionalLight(0xa8ccff,.7); f.position.set(-3,1,-3); scene.add(f);
    cam=new T.PerspectiveCamera(28,1,.01,50); holder=new T.Group(); holder.position.y=5; scene.add(holder); }
  const isReal=id=>!!(window.__MDL&&window.__MDL.fishReady&&window.__MDL.fishReady(id));
  function fitClone(sp){ const o=c.P.getFish(sp).group.clone(true); o.visible=true; o.position.set(0,0,0); o.rotation.set(0,0,0); o.scale.set(1,1,1);
    o.traverse(x=>{ x.visible=true; x.frustumCulled=false; });
    const bx=new T.Box3().setFromObject(o), sz=bx.getSize(new T.Vector3()), ct=bx.getCenter(new T.Vector3()), s=1/Math.max(sz.x,sz.y,sz.z,1e-3);
    o.scale.setScalar(s); o.position.copy(ct).multiplyScalar(-s); const w=new T.Group(); w.add(o); return w; }
  function build(){ if(obj){ holder.remove(obj); obj=null; }
    real=isReal(sp0.id); obj=fitClone(sp0); holder.add(obj); }
  function size(){ const dpr=Math.min(2,window.devicePixelRatio||1), W=Math.max(2,Math.round(cv.clientWidth*dpr)), H=Math.max(2,Math.round(cv.clientHeight*dpr));
    if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; img=ctx.createImageData(W,H); buf=new Uint8Array(W*H*4);
      if(rt) rt.dispose(); rt=new T.WebGLRenderTarget(W,H,{depthBuffer:true}); rt.texture.encoding=T.sRGBEncoding; cam.aspect=W/H; cam.updateProjectionMatrix(); } }
  function frame(t){ raf=requestAnimationFrame(frame); if(!cv||!cv.isConnected){ stop(); return; } if(t-last<33) return; const dt=Math.min(.1,(t-last)/1000); last=t;
    if((chk+=dt)>1&&!real&&window.__MDL&&window.__MDL.fishReady&&window.__MDL.fishReady(sp0.id)){ chk=0; build(); }   // 真實模型晚一步載好就換上
    if(!drag&&(idle+=dt)>1.5) yaw+=dt*.5;
    size(); obj.rotation.set(pitch,yaw,0); const W=cv.width,H=cv.height, dist=1.25/Math.tan(cam.fov*Math.PI/360)/Math.max(.8,Math.min(1.6,cam.aspect))*.5;
    cam.position.set(0,5,dist); cam.lookAt(0,5,0); scene.overrideMaterial=caught?null:sil;
    const pRT=R.getRenderTarget(), pSc=R.getScissorTest(), cc=R.getClearColor(new T.Color()), ca=R.getClearAlpha();
    R.setScissorTest(false); R.setRenderTarget(rt); R.setClearColor(0x000000,0); R.clear(); R.render(scene,cam);
    R.readRenderTargetPixels(rt,0,0,W,H,buf); R.setRenderTarget(pRT); R.setScissorTest(pSc); R.setClearColor(cc,ca);
    const row=W*4; for(let y=0;y<H;y++) img.data.set(buf.subarray((H-1-y)*row,(H-y)*row),y*row);   // 讀出來是上下顛倒的
    ctx.putImageData(img,0,0); }
  function bind(){ const P=e=>e.touches?e.touches[0]:e;
    cv.onpointerdown=e=>{ drag={x:e.clientX,y:e.clientY,yaw,pitch}; idle=0; cv.setPointerCapture&&cv.setPointerCapture(e.pointerId); };
    cv.onpointermove=e=>{ if(!drag) return; yaw=drag.yaw+(e.clientX-drag.x)*.012; pitch=Math.max(-.9,Math.min(.9,drag.pitch+(e.clientY-drag.y)*.008)); };
    cv.onpointerup=cv.onpointercancel=()=>{ drag=null; idle=0; }; }
  function show(sp,el,isCaught){ if(!el) return; ensure(); if(isCaught&&window.__MDL&&window.__MDL.want) window.__MDL.want(sp.id); const same=sp0===sp&&caught===isCaught; sp0=sp; caught=isCaught; cv=el; ctx=cv.getContext('2d'); img=null; cv.width=cv.height=0;
    if(!same||!obj){ build(); yaw=.55; pitch=.12; } chk=0; idle=0; bind(); if(!raf){ last=0; raf=requestAnimationFrame(frame); } }
  function stop(){ if(raf) cancelAnimationFrame(raf); raf=0; cv=null; }
  // 列表縮圖：一幀畫一隻，畫好存成圖片快取；真實模型之後才載好會自動重畫
  const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', TW=168, TH=84, cache={};
  let trt,tq=[],traf=0,tcv,tctx,tbuf,timg;
  const key=(id,cg)=>id+(cg?'1':'0');
  function cached(id,cg){ const e=cache[key(id,cg)]; return e&&e.url; }
  function thumb1(sp,cg){ ensure(); if(!trt){ trt=new T.WebGLRenderTarget(TW,TH,{depthBuffer:true}); trt.texture.encoding=T.sRGBEncoding;
      tcv=document.createElement('canvas'); tcv.width=TW; tcv.height=TH; tctx=tcv.getContext('2d'); tbuf=new Uint8Array(TW*TH*4); timg=tctx.createImageData(TW,TH); }
    const o=fitClone(sp); o.rotation.set(.06,.22,0); const tg=new T.Group(); tg.position.y=-5; tg.add(o); scene.add(tg); holder.visible=false;
    const ca=new T.PerspectiveCamera(26,TW/TH,.01,50); ca.position.set(0,-5,1.16); ca.lookAt(0,-5,0); scene.overrideMaterial=cg?null:sil;
    const pRT=R.getRenderTarget(), pSc=R.getScissorTest(), cc=R.getClearColor(new T.Color()), cA=R.getClearAlpha();
    R.setScissorTest(false); R.setRenderTarget(trt); R.setClearColor(0x000000,0); R.clear(); R.render(scene,ca);
    R.readRenderTargetPixels(trt,0,0,TW,TH,tbuf); R.setRenderTarget(pRT); R.setScissorTest(pSc); R.setClearColor(cc,cA);
    scene.remove(tg); holder.visible=true; scene.overrideMaterial=null;
    const rw=TW*4; for(let y=0;y<TH;y++) timg.data.set(tbuf.subarray((TH-1-y)*rw,(TH-y)*rw),y*rw); tctx.putImageData(timg,0,0);
    return tcv.toDataURL('image/png'); }
  function tstep(){ traf=0; let n=0;
    while(tq.length&&n<1){ const [sp,cg]=tq.shift(), k=key(sp.id,cg), e=cache[k], rl=isReal(sp.id);
      if(e&&(e.real||!rl)) continue;   // 已有且不需要升級成真實模型
      try{ cache[k]={url:thumb1(sp,cg),real:rl}; }catch(err){ console.warn('thumb',sp.id,err); continue; }
      const im=document.querySelector('img[data-th="'+sp.id+'"]'); if(im&&cur==='log'&&!dexSel) im.src=cache[k].url; n++; }
    if(tq.length&&cur==='log'&&!dexSel) traf=requestAnimationFrame(tstep); else tq=[]; }
  function thumbs(list){ tq=list.slice(); if(!traf) traf=requestAnimationFrame(tstep); }
  return {show,stop,thumbs,cached,BLANK}; })();
function open(k){ document.body.classList.add('sheetOn'); cur=k; if(k==='log') dexSel=null; resetArm=false; render(); sheet.classList.remove('hidden'); }
window.__openSheet=k=>open(k);
function close(){ sheet.classList.add('hidden'); document.body.classList.remove('sheetOn'); cur=null; DEXV.stop(); }
$('bShop').addEventListener('click',()=>open('shop'));
$('bQuest').addEventListener('click',()=>open('quest'));
$('bLog').addEventListener('click',()=>open('log'));
$('bSet').addEventListener('click',()=>open('set'));
window.__SHEET={refresh:k=>{ if(cur===k) render(); }};
$('bMap').addEventListener('click',()=>open('spot'));
$('baitChip').addEventListener('click',()=>{ shopTab='bait'; open('shop'); });
$('shX').addEventListener('click',close);
sheet.addEventListener('click',e=>{ if(e.target===sheet) close(); });
shB.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a, v=b.dataset.v; Snd.init(); if(a==='diag'&&window.__DIAG){ if(v==='copy') window.__DIAG.copy().then(ok=>toast(ok?'已複製診斷資訊，可以直接貼上':'複製失敗，請截圖設定頁','good',2200)); else { window.__DIAG.clear(); toast('已清除錯誤記錄','good',1200); } render(); return; }
  if(a==='gfx'){ save.gfx=v; persist(); if(window.__applyGfx) window.__applyGfx(v); toast('畫質：'+({high:'高',mid:'中',low:'低'})[v],'good',1200); render(); return; } if(ECO.click(a,v,GEAR)){ render(); syncHUD(); return; }
  if(a==='tab') shopTab=v;
  else if(a==='buy'){ const it=GEAR[shopTab][+v]; if(save.coins<it.price){ toast('金幣不夠','bad'); return; }
    save.coins-=it.price; save.gear[shopTab].push(+v); save.eq[shopTab]=+v; persist(); setCoins(); Snd.coin(); toast('已購買並裝備：'+it.name,'good'); applyRod(); }
  else if(a==='eq'){ save.eq[shopTab]=+v; persist(); applyRod(); }
  else if(a==='bb'){ const bt=BAITS[+v]; if(save.coins<bt.price){ toast('金幣不夠','bad'); return; }
    save.coins-=bt.price; save.baits[bt.id]=(save.baits[bt.id]||0)+bt.pack; persist(); setCoins(); Snd.coin(); }
  else if(a==='ub'){ save.bait=BAITS[+v].id; persist(); toast('改用'+BAITS[+v].name); }
  else if(a==='claim') claim(+v);
  else if(a==='homeP'){ cur='home'; render(); shB.scrollTop=0; return; }
  else if(a==='homeGo'){ close(); if(window.__goHome) window.__goHome(); return; }
  else if(a==='mapBack'){ cur='spot'; render(); return; }
  else if(a==='hrel'){ const [wt,i]=v.split(':'), f=window.__HOME.release(wt,+i); if(f) toast(wt==='mounts'?'取下了標本，牆上空出一個位置':'把'+((SPECIES.find(s=>s.id===f.id)||{}).name||'魚')+'放回湖裡了','good'); render(); return; }
  else if(a==='fup'){ const m=window.__HOME.furnUp(v); if(m) toast(m,'bad'); else { toast('升級好了：'+window.__HOME.furnInfo(v).cur.n,'good'); if(window.__HOMEFURN) window.__HOMEFURN(); } render(); syncHUD(); return; }
  else if(a==='fuse'){ if(v==='rock'&&window.__HOME.furnInfo('rock').cur.pick){ close(); if(window.__HOMETAP) window.__HOMETAP('rock'); return; } const r=window.__HOME.furnUse(v); if(r.msg) toast(r.msg,r.kind||'good',r.kind?1800:3200); if(v==='rock'&&window.__HOMEFURN) window.__HOMEFURN(); render(); syncHUD(); return; }
  else if(a==='hbuy'){ const m=window.__HOME.buy(v); toast(m||'買好了，已經裝進小屋',m?'bad':'good'); render(); syncHUD(); return; }
  else if(a==='dex'){ dexSel=v; render(); shB.scrollTop=0; return; }
  else if(a==='dexback'){ dexSel=null; render(); return; }
  else if(a==='wx'){ save.wxMode=v; persist(); }
  else if(a==='kayak'){ if(save.coins<800){ toast('金幣不夠','bad'); return; } save.coins-=800; save.kayak=true; persist(); setCoins(); Snd.coin(); toast('買了獨木舟！可以划到其他釣點了','good'); }
  else if(a==='yacht'){ const need=BOAT_COST, m=save.mat=save.mat||{};   // 修復條件寫在動作本身
    if(!(window.__STORY&&window.__STORY.done('c5'))){ toast('還不知道漁船在哪裡（完成第六章後）','warn',2200); return; }
    if(save.coins<need.coins){ toast('金幣不夠','bad'); return; } if((m.scale||0)<need.scale||(m.bone||0)<need.bone||(m.pearl||0)<need.pearl){ toast('修船素材不夠','bad'); return; }
    save.coins-=need.coins; m.scale-=need.scale; m.bone-=need.bone; m.pearl-=need.pearl; save.yacht=true; persist(); setCoins(); Snd.coin(); toast('🛥️ 老漁人的漁船修好了！可以出海了','good',3000); }
  else if(a==='go'){ close(); c.goSpot(+v); return; }
  else if(a==='time'){ setHour(PRESETS[+v][0]); toast(PRESETS[+v][1]); }
  else if(a==='tg'){ if(v==='sound'){ Snd.set(!Snd.isOn()); save.sound=Snd.isOn(); } else if(v==='imm'){ save.imm=!save.imm; document.body.classList.toggle('immersive',save.imm); } else if(v==='scare'){ save.noScare=!save.noScare; } else save[v]=!(save[v]!==false); persist(); }
  else if(a==='diff'){ save.diff=v; persist(); toast('釣魚難度：'+DIFF[v].n); }
  else if(a==='shop'){ if(window.__SHOP) window.__SHOP(); }
  else if(a==='cloud'){ if(v==='in') window.__CLOUD.login(); else if(v==='copy') window.__CLOUD.copyMain(); else window.__CLOUD.logout(); }
  else if(a==='pwa'){ PWA.install().then(r=>{ if(r==='ios') toast('iPhone：按 Safari 的「分享」→「加入主畫面」','',4200); else if(r==='manual') toast('瀏覽器選單 ⋮ →「加到主畫面」或「安裝應用程式」','',4200); else if(r==='installed') toast('已經安裝了','',1600); }); }
  else if(a==='reset'){ if(!resetArm) resetArm=true; else { try{ localStorage.removeItem(window.__SAVE_KEY||'swampAngler.v1'); }catch(_){} location.reload(); return; } }
  render(); syncHUD();
});
fillQuests(); applyRod(); syncHUD(); document.body.classList.toggle('immersive',!!save.imm);
return { gear, useBait, onCatch, onRelease, syncHUD, addXP };
}
