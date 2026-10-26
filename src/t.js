/* ===== 冰湖：覆雪冰面與冰洞（雪地材質：Poly Haven snow_02，CC0） ===== */
function createIce(W,c){
'use strict';
const T=THREE, tl=new T.TextureLoader(), rep=(t,n)=>{ t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(n,n); t.anisotropy=4; return t; };
const col=rep(tl.load('snow_Diffuse.jpg'),90); col.encoding=T.sRGBEncoding;
const mat=new T.MeshStandardMaterial({map:col,normalMap:rep(tl.load('snow_nor_gl.jpg'),90),roughnessMap:rep(tl.load('snow_Rough.jpg'),90),roughness:.82,metalness:0,color:0xffffff,envMapIntensity:1.6,normalScale:new T.Vector2(.45,.45)});
// 真實結冰湖面：風吹乾淨的地方是深色透明冰（ambientCG Ice003，CC0，裂紋網），其他地方是積雪；用大範圍雜訊自然混合
const iceC=rep(tl.load('ice_Color.jpg'),60); iceC.encoding=T.sRGBEncoding; const iceN=rep(tl.load('ice_nor.jpg'),60);
mat.onBeforeCompile=sh=>{ sh.uniforms.iceMap={value:iceC}; sh.uniforms.iceNor={value:iceN};
  sh.fragmentShader='uniform sampler2D iceMap; uniform sampler2D iceNor;\nfloat hh_(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nfloat vn_(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh_(i),hh_(i+vec2(1,0)),f.x),mix(hh_(i+vec2(0,1)),hh_(i+vec2(1,1)),f.x),f.y); }\n'+sh.fragmentShader;
  sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  vec4 t2_=mapTexelToLinear(texture2D(map,vUv*0.27+vec2(0.31,0.17)));
  diffuseColor.rgb=mix(diffuseColor.rgb,t2_.rgb*diffuse,0.45);
  vec2 q_=vUv*1.2; float n_=vn_(q_)*0.6+vn_(q_*2.7+3.1)*0.3+vn_(q_*7.3+8.2)*0.1;
  float iceK=smoothstep(0.47,0.62,n_);
  vec3 ic_=mapTexelToLinear(texture2D(iceMap,vUv*1.5)).rgb*vec3(0.78,0.9,0.95);
  float edge_=smoothstep(0.47,0.53,n_)*(1.0-smoothstep(0.53,0.6,n_));
  diffuseColor.rgb=mix(diffuseColor.rgb,ic_,iceK)+vec3(0.18,0.2,0.22)*edge_*0.6;`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor=mix(roughnessFactor,0.12,iceK);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n  { vec3 n2_=texture2D(iceNor,vUv*1.5).xyz*2.0-1.0; normal=normalize(mix(normal,normalize(normal+vec3(n2_.xy*0.25,0.0)),iceK)); }');
};
// 夜裡雪地反射月光與星光，呈藍灰色，不會全黑：依環境亮度補一點自發光
mat.emissive=new T.Color(0x3a4a62); mat.emissiveIntensity=0;
const g=new T.Group(); g.visible=false; W.scene.add(g);
const sheet=new T.Mesh(new T.CircleGeometry(600,96).rotateX(-Math.PI/2),mat); sheet.position.y=.01; g.add(sheet);
// 冰洞：看得到約 35 公分厚的冰層斷面（上白下藍綠、半透明），水面在冰層下，浮著冰沙；洞口一圈是冰鑽帶上來的雪屑
const hole=new T.Group(); hole.visible=false; g.add(hole);
let drilled=false, prog=0, lastKey='';
const wallTex=(()=>{ const cv=document.createElement('canvas'); cv.width=8; cv.height=128; const x=cv.getContext('2d'), gr=x.createLinearGradient(0,0,0,128);
  gr.addColorStop(0,'#eef6fa'); gr.addColorStop(.12,'#cfe6ee'); gr.addColorStop(.45,'#6fa8b8'); gr.addColorStop(.8,'#1e5868'); gr.addColorStop(1,'#0a2a34'); x.fillStyle=gr; x.fillRect(0,0,8,128);
  for(let i=0;i<10;i++){ x.fillStyle='rgba(255,255,255,'+(0.08+Math.random()*.12)+')'; x.fillRect(0,10+Math.random()*100,8,1); }
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t; })();
const wallM=new T.MeshStandardMaterial({map:wallTex,roughness:.15,metalness:0,side:T.BackSide,transparent:true,opacity:.96,emissive:0x2a4a5a,emissiveIntensity:0});
const wall=new T.Mesh(new T.CylinderGeometry(.17,.16,.36,40,1,true),wallM); wall.position.y=-.17; hole.add(wall);
const water=new T.Mesh(new T.CircleGeometry(.165,40).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x07202a,roughness:.05,metalness:.1,envMapIntensity:1.6,emissive:0x12283a,emissiveIntensity:0})); water.position.y=-.06; hole.add(water);
const slushM=new T.MeshStandardMaterial({color:0xdcecf2,roughness:.4,transparent:true,opacity:.85,emissive:0x4a5a72,emissiveIntensity:0});
const slush=[]; for(let i=0;i<9;i++){ const sz=.012+Math.random()*.03, m=new T.Mesh(new T.CircleGeometry(sz,6).rotateX(-Math.PI/2),slushM); const a=Math.random()*6.28, r=Math.random()*.12; m.position.set(Math.cos(a)*r,-.055,Math.sin(a)*r); hole.add(m); slush.push({m,a,r,ph:Math.random()*6}); }
// 雪屑堆：用雪地同一個材質，做成高低不平的一圈
const rimM=new T.MeshStandardMaterial({map:col,color:0xffffff,roughness:.9,emissive:0x4a5a72,emissiveIntensity:0});
{ const rg=new T.RingGeometry(.17,.5,64,8).rotateX(-Math.PI/2), pp=rg.attributes.position;
  for(let i=0;i<pp.count;i++){ const x=pp.getX(i), z=pp.getZ(i), r=Math.hypot(x,z), a=Math.atan2(z,x);
    const bump=Math.sin(a*3+1.2)*.6+Math.sin(a*9+.4)*.35+Math.sin(a*17+2)*.2+(Math.random()-.5)*.9, k=Math.pow(Math.max(0,Math.sin(Math.min(1,Math.max(0,(r-.17)/.33))*Math.PI)),.7);
    pp.setY(i,Math.max(0,k*(.03+.035*bump))*(a>-.6&&a<1.4?1.7:1)); }
  rg.computeVertexNormals(); const rim=new T.Mesh(rg,rimM); rim.position.y=.012; hole.add(rim);
  const lip=new T.Mesh(new T.TorusGeometry(.175,.022,8,40).rotateX(Math.PI/2),rimM); lip.position.y=.02; hole.add(lip);
  // 冰鑽帶上來的壓實雪塊，散在洞口
  for(let i=0;i<11;i++){ const a=Math.random()*6.28, r=.24+Math.random()*.32, s=.018+Math.random()*.035, cl=new T.Mesh(new T.IcosahedronGeometry(s,1),rimM);
    const ps=cl.geometry.attributes.position; for(let j=0;j<ps.count;j++) ps.setXYZ(j,ps.getX(j)*(1+(Math.random()-.5)*.5),ps.getY(j)*(.5+Math.random()*.3),ps.getZ(j)*(1+(Math.random()-.5)*.5)); cl.geometry.computeVertexNormals();
    cl.position.set(Math.cos(a)*r,.015+s*.25,Math.sin(a)*r); cl.rotation.y=Math.random()*6; hole.add(cl); } }
const holePos=new T.Vector3();
// 手搖冰鑽：鑿冰時邊轉邊往下鑽，完成後拔出來
const auger=new T.Group(); auger.visible=false; g.add(auger);
let crankRef=null;
{ const steel=new T.MeshStandardMaterial({color:0x9aa4ac,metalness:.85,roughness:.32}), red=new T.MeshStandardMaterial({color:0xb02a20,metalness:.3,roughness:.45}), grip=new T.MeshStandardMaterial({color:0x1a1a1a,roughness:.8});
  const shaft=new T.Mesh(new T.CylinderGeometry(.018,.018,1.15,10),steel); shaft.position.y=.575; auger.add(shaft);
  const pts=[]; for(let i=0;i<=120;i++){ const a=i/120*Math.PI*2*5.5, y=i/120*.55; pts.push(new T.Vector3(Math.cos(a)*.075,y,Math.sin(a)*.075)); }
  const blade=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),240,.012,6,false),steel); blade.scale.set(1,1,1); auger.add(blade);
  const tip=new T.Mesh(new T.ConeGeometry(.06,.08,10),steel); tip.rotation.x=Math.PI; tip.position.y=-.03; auger.add(tip);
  const crank=new T.Group(); crank.position.y=1.15; auger.add(crank); crankRef=crank;
  const bar=new T.Mesh(new T.CylinderGeometry(.016,.016,.38,8),red); bar.rotation.z=Math.PI/2; bar.position.x=.19; crank.add(bar);
  const k1=new T.Mesh(new T.CylinderGeometry(.022,.022,.12,10),grip); k1.position.set(.38,.06,0); crank.add(k1);
  const top=new T.Mesh(new T.CylinderGeometry(.024,.024,.14,10),grip); top.position.y=.07; crank.add(top);
  auger.traverse(o=>{ o.frustumCulled=false; }); }
let liftT=0;
/* 下雪：冰湖的雨全部換成雪，陰天很重時也會飄小雪 */
const NF=2600, fg=new T.BufferGeometry(), fp=new Float32Array(NF*3), fs=new Float32Array(NF);
for(let i=0;i<NF;i++){ fp[i*3]=(Math.random()-.5)*40; fp[i*3+1]=Math.random()*18; fp[i*3+2]=(Math.random()-.5)*40; fs[i]=Math.random(); }
fg.setAttribute('position',new T.BufferAttribute(fp,3));
const fc=document.createElement('canvas'); fc.width=fc.height=32; { const x=fc.getContext('2d'), gr=x.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.5,'rgba(255,255,255,.6)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.fillRect(0,0,32,32); }
const flakes=new T.Points(fg,new T.PointsMaterial({map:new T.CanvasTexture(fc),size:.16,transparent:true,depthWrite:false,opacity:0,fog:false}));
flakes.frustumCulled=false; W.scene.add(flakes); if(W.reflHide) W.reflHide(flakes);
let snowK=0; const fcam=new T.Vector3();
function updSnow(dt){ const on=c.loc()==='ice', want=on?Math.min(1,Math.max(W.U.uRain.value*1.4,(W.U.uCloud.value-.7)*2.2)):0;
  snowK+=(want-snowK)*Math.min(1,dt*.6); flakes.visible=snowK>.02; if(!flakes.visible) return; flakes.material.opacity=Math.min(.95,snowK);
  W.camera.getWorldPosition(fcam); const p=fg.attributes.position.array, t=performance.now()*.001;
  for(let i=0;i<NF;i++){ const j=i*3; p[j+1]-=dt*(.5+fs[i]*.7); p[j]+=Math.sin(t*.8+fs[i]*20)*dt*.25; p[j+2]+=Math.cos(t*.6+fs[i]*13)*dt*.2;
    if(p[j+1]<0){ p[j+1]+=18; p[j]=(Math.random()-.5)*40; p[j+2]=(Math.random()-.5)*40; } }
  fg.attributes.position.needsUpdate=true; flakes.position.set(fcam.x,0,fcam.z); }
let strT=0;
function update(dt){ dt=dt||.016; updSnow(dt); const on=c.loc()==='ice'; g.visible=on;
  if(on){ const lt=W.info?W.info.light:1, k=Math.max(0,.55-lt); mat.emissiveIntensity=k*.9; rimM.emissiveIntensity=k*.9; water.material.emissiveIntensity=k*1.2; wallM.emissiveIntensity=k*1.2; slushM.emissiveIntensity=k;
    if(drilled){ const tt=performance.now()/1000; slush.forEach(o=>{ o.m.position.x=Math.cos(o.a+tt*.05)*o.r; o.m.position.z=Math.sin(o.a+tt*.05)*o.r; o.m.position.y=-.055+Math.sin(tt*1.3+o.ph)*.003; }); } }
  if(liftT>0){ liftT-=dt; auger.position.y+=dt*.6; auger.rotation.y+=dt*3; if(liftT<=0) auger.visible=false; }
  else if(!drilled&&on&&prog>0&&!(c.held&&c.held())) auger.visible=prog>0;
  if(on&&drilled&&c.state&&c.state()==='fight'){ const T2=c.tens?c.tens():.5; strT-=dt; if(strT<=0){ strT=.5-.35*Math.min(1,T2);   // 冰洞裡的掙扎：依張力冒出水紋與水花
      W.addRipple(holePos.x,holePos.z,.15+.2*T2); if(T2>.6){ c.chips&&0; if(c.splash) c.splash(holePos,T2); } } } if(!on){ drilled=false; prog=0; return; }
  const b=c.base(), h=c.head(), key=b.x.toFixed(1)+','+b.z.toFixed(1)+','+h.toFixed(2); if(key!==lastKey){ lastKey=key; drilled=false; prog=0; auger.visible=false; liftT=0; }
  holePos.set(b.x-Math.sin(h)*1.6,0,b.z-Math.cos(h)*1.6); hole.position.copy(holePos); hole.visible=drilled;
  sheet.position.x=b.x; sheet.position.z=b.z; col.offset.set(b.x/600*90/2,-b.z/600*90/2); }
/* 鑿冰洞：按住約 2 秒，冰屑四濺，完成後冰洞出現 */
function drill(dt){ if(drilled) return 1; prog=Math.min(1,prog+dt/2); auger.visible=true; auger.position.set(holePos.x,.02-prog*.42,holePos.z); auger.rotation.y+=dt*9; if(c.grind&&Math.random()<dt*10) c.grind(); if(Math.random()<dt*14&&c.chips) c.chips(holePos); if(prog>=1){ drilled=true; hole.visible=true; liftT=1.2; if(c.done) c.done(holePos); } return prog; }
const gripTmp=new T.Vector3();
function grip(side,out){ auger.updateMatrixWorld(true); if(side==='R'){ gripTmp.set(.38,.06,0); crankRef.localToWorld(gripTmp); } else { gripTmp.set(0,1.29,0); auger.localToWorld(gripTmp); } out.copy(gripTmp); return out; }
function drilling(){ return auger.visible&&!drilled&&prog>0&&prog<1; }
return {update,holePos:()=>holePos,drilled:()=>drilled,drill,progress:()=>prog,grip,drilling};
}
