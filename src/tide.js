/* ===== 潮間帶（蚵仔寮泥灘）：退潮時才能下灘；看泥面痕跡判斷底下是什麼，用手指刮開沙泥把牠挖出來
   ・潮汐：每天兩次退潮（04:30～07:30、16:30～19:30），漲潮前 40／20 分鐘警告並亮出撤離路線，時間到強制撤離
   ・痕跡：單孔會噴水＝文蛤、鑰匙孔雙孔＝赤嘴蛤、細長凹痕＝竹蟶、細爪痕＋小沙球＝海瓜子、大洞＋沙堆＝沙蟹洞、盤繞泥條＝沙蠶、平坦＝多半是空的
   ・挖掘：刮開濕沙→黏泥→碎貝殼層，每層聲音與震動不同；碰到硬殼要放慢清周圍，刮太快會刮破；竹蟶會往下縮、沙蟹會想逃
   ・泥面上還有招潮蟹、彈塗魚、寄居蟹在活動，點牠們可以抓
   ・挖到的放進桶子，離開時可以全部賣掉，或放進保冷箱帶回家烤（文蛤、赤嘴蛤、海瓜子、竹蟶、沙蟹）；沙蠶變成魚餌 ===== */
function createTide(W,c){
'use strict';
const T=THREE, rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const S=new T.Scene(), cam=new T.PerspectiveCamera(58,1,.05,400);
const sky=new T.Color(0xb9c4c8); S.background=sky; new T.TextureLoader().load('sky_ovc_light.jpg',t=>{ t.encoding=T.sRGBEncoding; const dome=new T.Mesh(new T.SphereGeometry(300,48,24),new T.MeshBasicMaterial({map:t,side:T.BackSide,fog:false,depthWrite:false})); dome.renderOrder=-10; dome.onBeforeRender=()=>dome.position.copy(cam.position); S.add(dome); });   /* 實拍海邊陰天天空（360 度全景貼在大球內側） */ S.fog=new T.Fog(sky,40,260);
S.add(new T.HemisphereLight(0xeef4f8,0x6a6050,1.7)); const sun=new T.DirectionalLight(0xfff2dc,1.6); sun.position.set(30,60,-20); S.add(sun);
// 泥灘地面（3D 地形）：沙紋起伏、潮溝、低窪積水都是真的高低差，不是平面貼圖
//   ・岸邊是沙、往海那邊是泥，兩種用噪聲邊界自然融合（不是一條直線交接）
//   ・低於積水面的地方有真正會反射天空的水窪
const TL=new T.TextureLoader(), tx=(f,srgb)=>{ const t=TL.load(f); t.wrapS=t.wrapT=T.RepeatWrapping; if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; };
const mudT=tx('models/tide/mud_diff.jpg',true), mudN=tx('models/tide/mud_nor.jpg'), sandT=tx('models/tide/sand_diff.jpg',true), sandN=tx('models/tide/sand_nor.jpg');
const hn=(x,z)=>Math.sin(x*.13+Math.sin(z*.07)*1.7)*.5+Math.sin(z*.11-x*.05)*.5;
function sandK(x,z){ const e=34+hn(x*1.7,z*1.3)*7+Math.sin(x*.21)*2.5; return Math.min(1,Math.max(0,(z-(e-4))/8)); }   // 越靠岸（z 大）越是沙
function hAt(x,z){ const sk=sandK(x,z);
  const rip=Math.sin(z*5.2+Math.sin(x*.6)*1.4+hn(x,z)*2)*.022*(.6+.4*sk);   // 沙紋（細波浪狀起伏）
  const und=hn(x*.35,z*.35)*.12;                                             // 大範圍的起伏
  const ch=Math.exp(-Math.pow((x-6*Math.sin(z*.045)-4)/2.6,2))*.16+Math.exp(-Math.pow((x+14+5*Math.sin(z*.06+1))/2,2))*.12;   // 兩條彎曲的潮溝
  return und+rip-ch*(1-sk)+sk*.18; }
window.__tideH=hAt;
const GN=220, gg=new T.PlaneGeometry(200,200,GN,GN).rotateX(-Math.PI/2), gp=gg.attributes.position;
for(let k=0;k<gp.count;k++) gp.setY(k,hAt(gp.getX(k),gp.getZ(k)));
gg.computeVertexNormals();
const gmat=new T.MeshStandardMaterial({color:0xb8aea0,map:mudT,normalMap:mudN,normalScale:new T.Vector2(1.1,1.1),roughness:.42,metalness:0});
gmat.onBeforeCompile=sh=>{ sh.uniforms.tSand={value:sandT}; sh.uniforms.tSandN={value:sandN}; sh.uniforms.uTW={value:0}; sh.uniforms.uSkyK={value:1}; gmat.userData.sh=sh;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP2;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP2=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D tSand; uniform sampler2D tSandN; uniform float uTW; uniform float uSkyK; varying vec3 vWP2;
float th(vec2 p){ return sin(p.x*.13+sin(p.y*.07)*1.7)*.5+sin(p.y*.11-p.x*.05)*.5; }
float sandKf(vec2 p){ float e=34.+th(p*vec2(1.7,1.3))*7.+sin(p.x*.21)*2.5; return clamp((p.y-(e-4.))/8.,0.,1.); }`)
  .replace('#include <map_fragment>',`
  vec2 uvA=vWP2.xz*.29, uvB=vec2(vWP2.x*.83-vWP2.z*.55,vWP2.x*.55+vWP2.z*.83)*.071;   // 兩種尺度、旋轉錯開，看不出重複
  float sk=sandKf(vWP2.xz) + (texture2D(tSand,vWP2.xz*.9).r-.5)*.25; sk=clamp(sk,0.,1.);
  vec3 mudC=mix(texture2D(map,uvA).rgb,texture2D(map,uvB).rgb,.35), sandC=mix(texture2D(tSand,uvA*1.1).rgb,texture2D(tSand,uvB).rgb,.3);
  float wet=1.-smoothstep(-.06,.06,vWP2.y);   // 越低越濕越暗
  vec4 texelColor=vec4(mix(pow(mudC,vec3(1.25))*.82*(1.-.25*wet),sandC*(.9-.1*wet),sk),1.);   // 泥比較深、對比高
  texelColor=mapTexelToLinear(texelColor); diffuseColor*=texelColor;
  float macro=th(vWP2.xz*.4)*.5+.5; diffuseColor.rgb*=.85+.2*macro;`)
  .replace('#include <normal_fragment_maps>',`
  { vec3 nm=mix(texture2D(normalMap,vWP2.xz*.29).xyz,texture2D(tSandN,vWP2.xz*.3).xyz,clamp(sandKf(vWP2.xz),0.,1.))*2.-1.; nm.xy*=normalScale;
    #ifdef USE_TANGENT
    normal=normalize(vTBN*nm);
    #else
    normal=perturbNormal2Arb(-vViewPosition,normal,nm,faceDirection);
    #endif
  }`)
  .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  { float skR=clamp(sandKf(vWP2.xz),0.,1.); float wetR=1.-smoothstep(-.12,.02,vWP2.y);
    roughnessFactor=mix(mix(.3,.16,wetR),.88,skR);   // 泥：濕亮（越靠水越像抹了一層水）；沙：乾霧
    roughnessFactor+= (texture2D(map,vWP2.xz*1.7).r-.5)*.25; }`)
  .replace('#include <dithering_fragment>',`#include <dithering_fragment>
  { float wl=-.105, dep=wl-vWP2.y;                                            // 水深
    if(dep>-.02){ vec3 V=normalize(cameraPosition-vWP2); 
      vec2 p=vWP2.xz; float t=uTW; vec3 n=normalize(vec3((sin(p.x*3.1+p.y*1.3+t*1.6)+sin(p.x*7.9-p.y*6.1+t*3.3)*.4)*.04,1.,(cos(p.x*2.3-p.y*3.7-t*1.4)+cos(p.x*5.3+p.y*2.9+t*2.6)*.5)*.04));
      float fr=.03+.97*pow(1.-max(dot(n,V),0.),5.);                            // 斜看反射多、正看透明
      vec3 R=reflect(-V,n); float up=clamp(R.y,0.,1.); vec3 skyC=mix(vec3(.62,.66,.68),vec3(.42,.46,.5),up)*uSkyK;   // 天空反射（陰天灰）
      vec3 under=gl_FragColor.rgb*mix(.85,.45,clamp(dep*8.,0.,1.));               // 淺水看得到泥，越深越暗
      float a=smoothstep(-.02,.012,dep);                                           // 水邊柔和過渡，不再是鋸齒多邊形
      gl_FragColor.rgb=mix(gl_FragColor.rgb, mix(under,skyC,fr*.9)+pow(max(dot(R,normalize(vec3(.3,.8,-.5))),0.),120.)*.25, a); } }`);
};
gmat.customProgramCacheKey=()=>'tideGround';
const ground=new T.Mesh(gg,gmat); S.add(ground);
gmat.envMapIntensity=.45;
// 積水：一片略高於最低處的水面，只在低窪地方露出來；反射天空
const pud=new T.Mesh(new T.PlaneGeometry(200,200).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x9aa6a8,roughness:.04,metalness:.9,transparent:true,opacity:.75}));
pud.position.y=-.105; pud.visible=false; S.add(pud);   /* 水改在地面著色器裡算（水邊柔和），這片平面不再顯示 */
const sandBand={position:new T.Vector3()};
// 泥面上的碎貝殼、小石頭：真的 3D 小物件（近看有厚度、有影子），只撒在鏡頭附近的範圍
{ const shellG=new T.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2); shellG.scale(1,.32,.8);   // 半顆蛋殼形＝碎貝殼
  const stoneG=new T.IcosahedronGeometry(1,1); { const P=stoneG.attributes.position; for(let k=0;k<P.count;k++){ const f=.8+Math.random()*.35; P.setXYZ(k,P.getX(k)*f,P.getY(k)*f*.55,P.getZ(k)*f); } stoneG.computeVertexNormals(); }
  const shellM=new T.MeshStandardMaterial({color:0xffffff,roughness:.55,side:T.DoubleSide}), stoneM=new T.MeshStandardMaterial({color:0xffffff,roughness:.85});
  const NS=900, NT=260, IS=new T.InstancedMesh(shellG,shellM,NS), IT=new T.InstancedMesh(stoneG,stoneM,NT), m4=new T.Matrix4(), q=new T.Quaternion(), e=new T.Euler(), v=new T.Vector3(), sc=new T.Vector3(), col=new T.Color();
  const SH=[0xe8dccb,0xd9c3a5,0xc9b8a8,0xf0e6da,0xb89a86,0xa8a092], ST=[0x5d574f,0x7a7066,0x4a4540,0x8b8174];
  for(let i=0;i<NS;i++){ const x=(Math.random()-.5)*44, z=Math.random()*-46+22, r=.01+Math.pow(Math.random(),2.5)*.035;
    e.set((Math.random()-.5)*.6+(Math.random()<.3?Math.PI:0),Math.random()*6.28,(Math.random()-.5)*.6); q.setFromEuler(e); v.set(x,hAt(x,z)+r*.1,z); sc.setScalar(r);
    m4.compose(v,q,sc); IS.setMatrixAt(i,m4); IS.setColorAt(i,col.setHex(SH[i%SH.length]).multiplyScalar(.8+Math.random()*.3)); }
  for(let i=0;i<NT;i++){ const x=(Math.random()-.5)*44, z=Math.random()*-46+22, r=.012+Math.pow(Math.random(),3)*.05;
    e.set(Math.random()*.4,Math.random()*6.28,Math.random()*.4); q.setFromEuler(e); v.set(x,hAt(x,z)+r*.2,z); sc.setScalar(r);
    m4.compose(v,q,sc); IT.setMatrixAt(i,m4); IT.setColorAt(i,col.setHex(ST[i%ST.length]).multiplyScalar(.85+Math.random()*.3)); }
  S.add(IS); S.add(IT); }
// 潮溝積水：表面有細細的流水波紋（不再是靜止的鏡子）
pud.material.onBeforeCompile=sh=>{ sh.uniforms.uT={value:0}; pud.userData.sh=sh;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWQ;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWQ=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT; varying vec3 vWQ;').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
  { vec2 p=vWQ.xz; float a=sin(p.x*3.1+p.y*1.3+uT*1.6)+sin(p.x*-1.7+p.y*4.3-uT*2.1)*.7+sin(p.x*7.9-p.y*6.1+uT*3.3)*.3;
    float b=cos(p.x*2.3-p.y*3.7-uT*1.4)+cos(p.x*5.3+p.y*2.9+uT*2.6)*.5; normal=normalize(normal+vec3(a*.035,0.,b*.035)); }`); };
pud.material.customProgramCacheKey=()=>'tidePud';   // 舊程式相容用（沙地已併入地形）
new T.TextureLoader().load('sky_ovc_light.jpg',t=>{ t.mapping=T.EquirectangularReflectionMapping; t.encoding=T.sRGBEncoding; try{ const pm=new T.PMREMGenerator(W.renderer); const env=pm.fromEquirectangular(t).texture; gmat.envMap=env; gmat.envMapIntensity=.45; pud.material.envMap=env; pud.material.envMapIntensity=1.2; gmat.needsUpdate=pud.material.needsUpdate=true; pm.dispose(); }catch(e){} });
// 海水：從遠處慢慢漲回來
const sea=new T.Mesh(new T.PlaneGeometry(400,300).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x4d6a72,roughness:.12,metalness:.3,transparent:true,opacity:.92})); sea.position.set(0,.06,-200); S.add(sea);
// 撤離路線：竹竿＋褪色的布旗（漲潮警告時亮起），布會隨風飄
const route=new T.Group(); S.add(route); route.visible=false; const flags=[];
const bambooM=new T.MeshStandardMaterial({color:0xb59a62,roughness:.6}), nodeM=new T.MeshStandardMaterial({color:0x8d7444,roughness:.7});
const clothTex=(()=>{ const c=document.createElement('canvas'); c.width=64; c.height=40; const g=c.getContext('2d'); g.fillStyle='#d4502a'; g.fillRect(0,0,64,40);
  for(let i=0;i<500;i++){ g.fillStyle=`rgba(${Math.random()<.5?'255,220,190':'90,30,10'},${Math.random()*.12})`; g.fillRect(Math.random()*64,Math.random()*40,1+Math.random()*2,1); }
  g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(0,0,64,3); g.fillRect(0,37,64,3); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; })();
for(let i=0;i<9;i++){ const x=Math.sin(i*.6)*1.5, z=30-i*7, y0=hAt(x,z), H=1.6;
  const pole=new T.Mesh(new T.CylinderGeometry(.022,.028,H,8),bambooM); pole.position.set(x,y0+H/2-.15,z); pole.rotation.z=(Math.random()-.5)*.08; route.add(pole);
  for(let n=1;n<5;n++){ const nd=new T.Mesh(new T.TorusGeometry(.026,.006,5,10),nodeM); nd.rotation.x=Math.PI/2; nd.position.set(0,-H/2+n*H/5,0); pole.add(nd); }   // 竹節
  const fg=new T.PlaneGeometry(.5,.32,14,6); fg.translate(.25,0,0);
  const fl=new T.Mesh(fg,new T.MeshStandardMaterial({map:clothTex,side:T.DoubleSide,roughness:.95})); fl.position.set(0,H/2-.2,0); pole.add(fl);
  flags.push({g:fg,base:fg.attributes.position.array.slice(),ph:Math.random()*6}); }
function flagTick(t){ if(!route.visible) return; flags.forEach(f=>{ const P=f.g.attributes.position, b=f.base;
  for(let k=0;k<P.count;k++){ const x=b[k*3], y=b[k*3+1], w=x/.5; P.setZ(k,Math.sin(t*6+f.ph-x*9)*.06*w+Math.sin(t*3.3+y*6)*.015*w); P.setY(k,y-w*w*.04); } P.needsUpdate=true; f.g.computeVertexNormals(); }); }
/* ---------- 生物資料 ---------- */
const CR={
  hardclam:{n:'文蛤',sign:'hole',depth:2.0,size:[.04,.09],hard:1,price:90,desc:'泥面上一個會噴水的小圓孔。'},
  gomphina:{n:'赤嘴蛤',sign:'key',depth:1.8,size:[.03,.06],hard:1,price:110,desc:'並排的兩個小孔，是入水管和出水管。'},
  tellin:{n:'海瓜子',sign:'pellet',depth:1.2,size:[.015,.03],hard:.5,fragile:1,price:60,desc:'細細的爪痕和小沙球附近，殼又薄又脆。'},
  razor:{n:'竹蟶',sign:'slit',depth:2.3,size:[.07,.13],hard:.8,dive:1,price:140,desc:'細長的凹痕，牠直立埋在泥裡，一受驚就往下縮。'},
  ghostcrab:{n:'沙蟹',sign:'burrow',depth:1.6,size:[.04,.07],hard:.6,flee:1,price:70,desc:'洞口有一堆新挖出來的沙。動作太慢牠會從另一頭溜走。'},
  ragworm:{n:'沙蠶',sign:'cast',depth:1.0,size:[.1,.2],hard:0,soft:1,price:20,bait:1,desc:'盤繞的泥條是牠排出來的。挖到可以當魚餌。'}
};
const SURF={fiddler:{n:'招潮蟹',price:40},mudskip:{n:'彈塗魚',price:55},hermit:{n:'寄居蟹',price:35}};
const ALL=Object.assign({},CR,SURF);
/* ---------- 泥面痕跡貼花（程式畫，跟實拍泥地融在一起） ---------- */
function decal(kind){ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.translate(64,64);
  const hole=(x,y,r)=>{ const rg=g.createRadialGradient(x,y,0,x,y,r*2.2); rg.addColorStop(0,'rgba(20,16,10,1)'); rg.addColorStop(.45,'rgba(40,32,22,.9)'); rg.addColorStop(.6,'rgba(150,140,120,.5)'); rg.addColorStop(1,'rgba(150,140,120,0)'); g.fillStyle=rg; g.beginPath(); g.arc(x,y,r*2.2,0,7); g.fill(); };
  if(kind==='hole') hole(0,0,6);
  if(kind==='key'){ hole(-6,0,4.5); hole(6,0,4.5); }
  if(kind==='slit'){ g.fillStyle='rgba(28,22,14,.95)'; g.beginPath(); g.ellipse(0,0,14,4,0,0,7); g.fill(); g.strokeStyle='rgba(160,150,128,.6)'; g.lineWidth=3; g.stroke(); }
  if(kind==='pellet'){ for(let i=0;i<46;i++){ const a=Math.random()*7, r=8+Math.random()*34; g.fillStyle='rgba(120,108,88,.95)'; g.beginPath(); g.arc(Math.cos(a)*r,Math.sin(a)*r,2.2+Math.random()*1.6,0,7); g.fill(); }
    g.strokeStyle='rgba(60,50,36,.6)'; g.lineWidth=1.4; for(let i=0;i<12;i++){ const a=Math.random()*7; g.beginPath(); g.moveTo(Math.cos(a)*6,Math.sin(a)*6); g.lineTo(Math.cos(a)*30,Math.sin(a)*30); g.stroke(); } hole(0,0,3); }
  if(kind==='burrow'){ g.fillStyle='rgba(176,164,138,.95)'; g.beginPath(); g.ellipse(14,10,26,16,.4,0,7); g.fill(); hole(-8,-6,9); }
  if(kind==='cast'){ g.strokeStyle='rgba(84,70,50,.95)'; g.lineWidth=6; g.lineCap='round'; g.beginPath(); for(let t=0;t<14;t+=.2){ const r=4+t*2.2; g.lineTo(Math.cos(t)*r,Math.sin(t)*r); } g.stroke(); }
  if(kind==='flat'){ g.fillStyle='rgba(90,80,64,.25)'; g.beginPath(); g.arc(0,0,10,0,7); g.fill(); }
  const t=new T.CanvasTexture(cv); return new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}); }
const DEC={}; ['hole','key','slit','pellet','burrow','cast','flat'].forEach(k=>DEC[k]=decal(k));
let signs=[];
const ringG=new T.RingGeometry(.42,.5,32).rotateX(-Math.PI/2), ringM=new T.MeshBasicMaterial({color:0xfff2b0,transparent:true,opacity:0,depthWrite:false});
function spawnSigns(){ signs.forEach(s=>{ S.remove(s.m); if(s.ring) S.remove(s.ring); }); signs=[]; const kinds=Object.keys(CR);
  for(let i=0;i<22;i++){ const k=Math.random()<.22?null:kinds[Math.floor(Math.random()*kinds.length)];
    const sign=k?CR[k].sign:'flat', m=new T.Mesh(new T.PlaneGeometry(.9,.9).rotateX(-Math.PI/2),DEC[sign]); m.position.set(rand(-14,14),0,rand(-26,12)); m.position.y=hAt(m.position.x,m.position.z)+.015; m.rotation.y=rand(0,6.28); S.add(m);
    const ring=new T.Mesh(ringG,ringM.clone()); ring.position.copy(m.position); ring.position.y+=.01; S.add(ring);
    signs.push({m,k,sign,ring,done:false,spurt:rand(2,6)}); } }
/* ---------- 泥面上的活生物（3D 模型＋骨架） ---------- */
let roamers=[];
function spawnRoamers(){ roamers.forEach(r=>S.remove(r.g)); roamers=[];
  for(const [id,n] of [['fiddler',6],['mudskip',4],['hermit',3]]) for(let i=0;i<n;i++){ const sp=c.species(id); let f=null; try{ if(window.__MDL&&window.__MDL.fishReady(id)) f=window.__MDL.fish(sp); }catch(e){} if(!f) continue;
    const L=sp?(sp.len[0]+Math.random()*(sp.len[1]-sp.len[0]))/100:.05; f.group.scale.setScalar(L*1.4); f.group.position.set(rand(-12,12),0,rand(-22,10)); f.group.position.y=hAt(f.group.position.x,f.group.position.z)+.01; S.add(f.group);
    roamers.push({id,g:f.group,uni:f.uni,h:rand(0,6.28),t:rand(0,3),hop:0,L,flee:0}); } }
/* ---------- 狀態 ---------- */
let on=false, yaw=0, pitch=-.32, pos=new T.Vector3(0,1.6,18), bag=[], warned=0, evac=false, endH=0;
const LOW=[[4.5,7.5],[16.5,19.5]];
function lowWin(h){ for(const w of LOW) if(h>=w[0]&&h<w[1]) return w; return null; }
function nextLow(h){ for(const w of LOW) if(h<w[0]) return w[0]; return LOW[0][0]+24; }
/* ---------- HUD ---------- */
const hud=document.createElement('div'); hud.id='tideHud'; hud.innerHTML=`<div id="tdClock"></div><div id="tdBag"></div><div id="tdShore"><span id="tdArr">⬆</span> 岸邊 <b id="tdDist"></b></div><div id="tdHint">看泥面的痕跡判斷底下是什麼，點痕跡開挖・拖曳轉頭・兩指或上下拖曳前進</div><button id="tdExit">⬅ 回岸上</button>`;
document.body.appendChild(hud);
const st=document.createElement('style'); st.textContent=`body.attide #top,body.attide #top2,body.attide #act,body.attide #joy,body.attide #hint,body.attide #magWin{display:none!important}
#tideHud{position:fixed;inset:0;pointer-events:none;z-index:6;display:none;font-family:inherit}
#tideHud>div,#tideHud>button{position:absolute;pointer-events:auto}
#tdClock{left:12px;max-width:52vw!important;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-weight:700;font-size:14px;max-width:62vw}
#tdShore{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);background:rgba(10,20,24,.72);color:#fff;border-radius:999px;padding:6px 14px;font-size:14px;font-weight:700;z-index:6}
#tdShore.warn{background:#c0392b;font-size:16px;animation:tdp 1s infinite}@keyframes tdp{50%{transform:translateX(-50%) scale(1.08)}}
#tdArr{display:inline-block;transition:transform .15s}
#tdBag{right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-size:13px}
#tdHint{left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);text-align:center;color:#fff;text-shadow:0 1px 3px #000;font-size:13px}
#tdExit{left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);border:0;border-radius:999px;padding:12px 22px;background:#ffcf66;color:#3a2600;font-weight:800;font-size:15px}
#tdWarn{position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:8;background:rgba(170,30,20,.92);color:#fff;border-radius:16px;padding:14px 18px;font-weight:800;font-size:15px;text-align:center;display:none;max-width:86vw;line-height:1.5}
#digBox{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;flex-direction:column;touch-action:none}
#digBox canvas{border-radius:18px;box-shadow:0 8px 30px rgba(0,0,0,.6);touch-action:none;width:min(88vw,380px);height:min(88vw,380px)}
#digInfo{color:#fff;margin-top:10px;font-size:14px;text-align:center;min-height:42px;padding:0 16px;text-shadow:0 1px 2px #000}
#digBtns{display:flex;gap:10px;margin-top:8px}#digBtns button{border:0;border-radius:999px;padding:10px 18px;font-weight:800}`;
document.head.appendChild(st);
const warnEl=document.createElement('div'); warnEl.id='tdWarn'; document.body.appendChild(warnEl);
const $=id=>document.getElementById(id);
function bagText(){ $('tdBag').textContent='🪣 桶子 '+bag.length+' 個・約 🪙'+bag.reduce((a,b)=>a+b.v,0).toLocaleString(); }
/* ---------- 聲音與震動（每一層不同） ---------- */
let AC=null; function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function noise(dur,f,q,vol){ const a=ac(); if(!a) return; const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f; fl.Q.value=q; const g=a.createGain(); g.gain.value=vol; s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(); }
const LAYER=[{n:'濕沙',col:[150,138,116],snd:()=>noise(.06,2600,1.2,.12),vib:4,hard:.9},{n:'黏泥',col:[92,80,62],snd:()=>noise(.12,420,3,.2),vib:10,hard:.55},{n:'碎貝殼層',col:[168,158,140],snd:()=>noise(.04,5200,6,.14),vib:6,hard:.4}];
const vib=p=>{ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} };
/* ---------- 挖掘小遊戲：30×30 格的深度，手指刮哪一格就往下挖 ---------- */
const box=document.createElement('div'); box.id='digBox'; box.innerHTML='<canvas id="digCv" width="360" height="360"></canvas><div id="digInfo"></div><div id="digBtns"></div>'; document.body.appendChild(box);
const cv=box.querySelector('canvas'), g2=cv.getContext('2d'), N=30, CS=12;
const mudImg=new Image(); mudImg.crossOrigin='anonymous'; mudImg.src=(window.__CDN?window.__CDN.url('tide_mud.jpg'):'tide_mud.jpg');
const spr={}; function sprite(id){ if(!spr[id]){ const im=new Image(); im.crossOrigin='anonymous'; im.src=(window.__CDN?window.__CDN.url('tide_'+id+'.png'):'tide_'+id+'.png'); spr[id]=im; } return spr[id]; }
let dig=null;
function startDig(s){ const k=s.k, cr=k?CR[k]:null; const dep=new Float32Array(N*N); dep.fill(3.2);
  const body={cx:15+rand(-3,3),cy:15+rand(-3,3),rx:0,ry:0,ang:rand(0,3.14)}; if(cr){ const sz=rand(cr.size[0],cr.size[1]); body.rx=clamp(sz*70,2.5,11); body.ry=body.rx*(k==='razor'?.32:k==='ragworm'?.25:.78); }
  dig={s,k,cr,dep,body,depth:cr?cr.depth:9,dmg:0,found:false,hit:0,t:0,fled:false,last:null,lastT:0,size:cr?rand(cr.size[0],cr.size[1]):0};
  $('digInfo').textContent=cr?'用手指刮開沙泥，慢慢往下挖…':'這裡看起來沒什麼痕跡，挖挖看？'; $('digBtns').innerHTML='<button id="dgGive" style="background:#333;color:#fff">放棄</button>';
  $('dgGive').onclick=()=>{ endDig(false); }; box.style.display='flex'; drawDig(); }
function inBody(x,y){ const b=dig.body; const dx=x+.5-b.cx, dy=y+.5-b.cy, ca=Math.cos(b.ang), sa=Math.sin(b.ang); const u=(dx*ca+dy*sa)/b.rx, v=(-dx*sa+dy*ca)/b.ry; return u*u+v*v<=1; }
// 畫挖掘面：深度網格先畫成一張小圖，再用平滑縮放放大（不再是一格一格的馬賽克）；每層有自己的顏色與顆粒，挖痕邊緣是柔和的濕泥色
const DOC=document.createElement('canvas'), DMK=document.createElement('canvas'), DTMP=document.createElement('canvas');
function drawDig(){ const d=dig; if(DOC.width!==N){ DOC.width=DOC.height=N; DMK.width=DMK.height=N; DTMP.width=DTMP.height=360; }
  g2.clearRect(0,0,360,360); g2.imageSmoothingEnabled=true;
  if(mudImg.complete) g2.drawImage(mudImg,0,0,mudImg.width*.3,mudImg.height*.3,0,0,360,360); else { g2.fillStyle='#8a7a62'; g2.fillRect(0,0,360,360); }
  const oc=DOC.getContext('2d'), id=oc.createImageData(N,N), mk=DMK.getContext('2d'), md=mk.createImageData(N,N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const k=y*N+x, z=d.dep[k], o=k*4;
    const a=Math.max(0,Math.min(1,(3.05-z)/0.35));   // 表層還在的地方透明，開始挖下去才慢慢出現下層
    const li=z>2?0:z>1?1:2, cc=LAYER[li].col, sh=.62+.3*(z%1)+.08*((x*7+y*13)%5)/5;
    id.data[o]=cc[0]*sh; id.data[o+1]=cc[1]*sh; id.data[o+2]=cc[2]*sh; id.data[o+3]=a*255;
    const vis=d.cr&&!d.fled&&inBody(x,y)&&z<=3-d.depth*.9; md.data[o+3]=vis?255:0; }
  oc.putImageData(id,0,0); g2.drawImage(DOC,0,0,360,360);
  // 挖出來的殼／身體：用平滑放大的遮罩只露出已經挖到的部分
  if(d.cr&&!d.fled){ const im=sprite(d.k); if(im.complete&&im.naturalWidth){ mk.putImageData(md,0,0); const t=DTMP.getContext('2d'); t.clearRect(0,0,360,360); t.imageSmoothingEnabled=true;
      const b=d.body; t.save(); t.translate(b.cx*CS,b.cy*CS); t.rotate(b.ang); const w=b.rx*2*CS*1.05, h=b.ry*2*CS*1.05; t.drawImage(im,-w/2,-h/2,w,h); t.restore();
      t.globalCompositeOperation='destination-in'; t.drawImage(DMK,0,0,360,360); t.globalCompositeOperation='source-over'; g2.drawImage(DTMP,0,0); } }
  if(d.dmg>0&&d.cr){ g2.strokeStyle='rgba(255,255,255,'+Math.min(.8,d.dmg*.25)+')'; g2.lineWidth=2; g2.beginPath(); const b=d.body; for(let i=0;i<d.dmg;i++){ g2.moveTo(b.cx*CS+rand(-8,8),b.cy*CS+rand(-8,8)); g2.lineTo(b.cx*CS+rand(-14,14),b.cy*CS+rand(-14,14)); } g2.stroke(); } }
function reveal(){ const d=dig; let tot=0,vis=0; for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(inBody(x,y)){ tot++; if(d.dep[y*N+x]<=3-d.depth*.9) vis++; } return tot?vis/tot:0; }
function scrape(px,py,spd){ const d=dig; if(!d||d.done) return; const gx=px/CS, gy=py/CS, R=1.6; let layerHit=-1, onShell=false;
  for(let y=Math.floor(gy-R);y<=gy+R;y++) for(let x=Math.floor(gx-R);x<=gx+R;x++){ if(x<0||y<0||x>=N||y>=N) continue; const r=Math.hypot(x+.5-gx,y+.5-gy); if(r>R) continue;
    const i=y*N+x, z=d.dep[i], li=z>2?0:z>1?1:2; let amt=.09*(1-r/R)*LAYER[li].hard;
    if(d.cr&&!d.fled&&inBody(x,y)&&z<=3-d.depth*.9+.05){ onShell=true; amt=0; }   // 殼本身挖不下去
    d.dep[i]=Math.max(0,z-amt); layerHit=li; }
  const now=performance.now(); if(now-d.lastT>70&&layerHit>=0){ d.lastT=now; LAYER[layerHit].snd(); vib(LAYER[layerHit].vib); }
  if(onShell&&d.cr){ if(!d.found){ d.found=true; vib([30,40,30]); noise(.05,1600,8,.25); $('digInfo').textContent=d.cr.soft?'碰到軟軟的東西了，輕一點把周圍的泥撥開':'碰到硬硬的東西了！放慢速度，沿著周圍清掉泥'; }
    const lim=d.cr.fragile?600:d.cr.soft?700:1000; if(spd>lim&&now-d.hit>220){ d.hit=now; d.dmg++; vib(60); noise(.08,900,4,.35); $('digInfo').textContent=d.cr.soft?'太用力了，'+d.cr.n+'被扯斷了一截！':'喀！刮太快把殼刮傷了（'+d.dmg+'）'; } }
  drawDig(); const rv=reveal();
  if(d.found&&rv>.82){ d.done=true; const ok=d.dmg<3, cr=d.cr, v=Math.round(cr.price*(.6+d.size*6)*(ok?1-d.dmg*.2:.3));
    bag.push({id:d.k,v,L:+d.size.toFixed(3),broken:!ok}); bagText(); vib([20,30,60]);
    $('digInfo').innerHTML=`<b>${ok?'完整取出':'取出了，但殼破了'}：${cr.n}</b> ${Math.round(d.size*100)} 公分・🪙${v}<br><small>${cr.desc}</small>`;
    $('digBtns').innerHTML='<button id="dgOk" style="background:#ffcf66;color:#3a2600">放進桶子</button>'; $('dgOk').onclick=()=>endDig(true); }
  else if(d.found&&rv>.15&&!(d.cr.fragile||d.cr.soft)) $('digInfo').textContent='露出 '+Math.round(rv*100)+'%・繼續慢慢清周圍'; }
function endDig(got){ if(!dig) return; dig.s.done=true; dig.s.m.material=DEC.flat; if(got&&dig.k){ showCatch(dig.k,dig.s.m.position); } dig=null; box.style.display='none'; }
let ptr=null;
cv.addEventListener('pointerdown',e=>{ ptr={x:e.offsetX*360/cv.clientWidth,y:e.offsetY*360/cv.clientHeight,t:performance.now()}; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove',e=>{ if(!ptr||!dig) return; const x=e.offsetX*360/cv.clientWidth, y=e.offsetY*360/cv.clientHeight, now=performance.now(), dt=Math.max(1,now-ptr.t), spd=Math.hypot(x-ptr.x,y-ptr.y)/dt*1000;
  const steps=Math.ceil(Math.hypot(x-ptr.x,y-ptr.y)/4); for(let i=1;i<=steps;i++) scrape(ptr.x+(x-ptr.x)*i/steps,ptr.y+(y-ptr.y)*i/steps,spd); ptr={x,y,t:now}; });
cv.addEventListener('pointerup',()=>{ ptr=null; });
// 竹蟶往下縮、沙蟹想逃：挖得太慢就會失手
function digTick(dt){ const d=dig; if(!d||d.done||!d.cr) return; d.t+=dt;
  if(d.cr.dive&&d.found){ d.depth=Math.min(3.1,d.depth+dt*.08); if(d.depth>3.05){ d.fled=true; d.done=true; $('digInfo').textContent='竹蟶縮到深處去了…要挖得又快又準'; $('digBtns').innerHTML='<button id="dgOk" style="background:#555;color:#fff">好吧</button>'; $('dgOk').onclick=()=>endDig(false); drawDig(); } }
  if(d.cr.flee&&!d.found&&d.t>9){ d.fled=true; d.done=true; $('digInfo').textContent='沙蟹從另一個出口溜走了！洞口有沙堆的要挖快一點'; $('digBtns').innerHTML='<button id="dgOk" style="background:#555;color:#fff">可惜</button>'; $('dgOk').onclick=()=>endDig(false); } }
/* ---------- 挖出來的生物：在洞旁邊用 3D 模型＋骨架動一下 ---------- */
const shown=[];
function showCatch(id,p){ const sp=c.species(id); if(!sp) return; try{ if(!window.__MDL||!window.__MDL.fishReady(id)) return; const f=window.__MDL.fish(sp); f.group.scale.setScalar(Math.max(.06,(sp.len[0]+sp.len[1])/200)*1.5); f.group.position.set(p.x+.3,hAt(p.x+.3,p.z)+.05,p.z); S.add(f.group); shown.push({f,t:0}); }catch(e){} }
/* ---------- 進入／離開 ---------- */
function enter(){ const h=c.hour(), w=lowWin(h); if(!w){ const n=nextLow(h); c.toast(`🌊 現在是滿潮，泥灘都在水下。下次退潮 ${String(Math.floor(n%24)).padStart(2,'0')}:${n%1?'30':'00'}`,'warn',3200); return false; }
  on=true; ambStart(); walkReq=0; walkV=0; sink=0; prints.forEach(p=>S.remove(p.m)); prints.length=0; endH=w[1]; warned=0; evac=false; bag=[]; yaw=0; pitch=-.32; pos.set(0,1.6,18); spawnSigns(); spawnRoamers(); bagText(); hud.style.display='block'; document.body.classList.add('attide');
  c.toast('🦀 退潮了！看泥面痕跡找生物。注意右上角的漲潮時間','good',3200); return true; }
function exit(forced){ if(!on) return; on=false; ambStop(); hud.style.display='none'; warnEl.style.display='none'; box.style.display='none'; dig=null; document.body.classList.remove('attide');
  roamers.forEach(r=>S.remove(r.g)); roamers=[]; shown.forEach(s=>S.remove(s.f.group)); shown.length=0;
  if(forced&&bag.length){ bag.splice(Math.ceil(bag.length/2)); }
  c.onExit(bag.slice(),forced); bag=[]; }
$('tdExit').onclick=()=>exit(false);
/* ---------- 操作：拖曳轉頭與前進、點痕跡或活生物 ---------- */
const canvas=W.renderer.domElement;
/* ---------- 走在泥灘上的體感 ----------
   ・每一步：腳步聲（沙地沙沙、泥地「啵」的吸附聲）、手機輕震、鏡頭隨步伐上下晃、左右微傾
   ・低窪的軟泥：走得慢、鏡頭往下沉、拔腳時有「噗滋」的吸附聲和比較長的震動
   ・腳印：左右交替留在泥上，泥地的腳印會慢慢積水反光，一段時間後被抹平
   ・環境聲：海風、遠處浪聲（漲潮越近越大聲）、偶爾的海鳥叫聲 */
let walkReq=0, walkV=0, stepAcc=0, stepSide=1, bobT=0, sink=0;
const fpG=new T.PlaneGeometry(.13,.3).rotateX(-Math.PI/2);
const fpTex=(()=>{ const c=document.createElement('canvas'); c.width=32; c.height=64; const g=c.getContext('2d'); const r=g.createRadialGradient(16,22,2,16,26,16); r.addColorStop(0,'rgba(30,24,18,.75)'); r.addColorStop(1,'rgba(30,24,18,0)'); g.fillStyle=r; g.beginPath(); g.ellipse(16,22,11,18,0,0,7); g.fill(); g.beginPath(); g.ellipse(16,52,9,10,0,0,7); g.fill(); return new T.CanvasTexture(c); })();
const prints=[];
function footprint(x,z,ang,soft){ const m=new T.Mesh(fpG,new T.MeshStandardMaterial({map:fpTex,transparent:true,depthWrite:false,roughness:.25,metalness:.2,color:soft?0x6a6a70:0x8a8070,opacity:.9}));
  m.position.set(x,hAt(x,z)+.006,z); m.rotation.y=ang; S.add(m); prints.push({m,t:0,soft}); if(prints.length>40){ const o=prints.shift(); S.remove(o.m); } }
function stepSound(soft,sandy){ const a=ac(); if(!a) return; if(sandy){ noise(.12,2600,1.2,.06); return; }
  noise(.09,500,2,.16); if(soft) setTimeout(()=>{ noise(.22,320,5,.14); noise(.06,1400,3,.05); },120); }   // 泥：落腳的悶響＋拔腳的吸附聲
let amb=null;
function ambStart(){ const a=ac(); if(!a||amb) return; const mk=(f,q,vol)=>{ const n=a.sampleRate*3, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); let l=0; for(let i=0;i<n;i++){ l=l*.97+(Math.random()*2-1)*.03; d[i]=l*6; }
    const s=a.createBufferSource(); s.buffer=b; s.loop=true; const fl=a.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=f; fl.Q.value=q; const g=a.createGain(); g.gain.value=vol; s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(); return {s,g,fl}; };
  amb={wind:mk(900,.4,.05),wave:mk(380,.7,.03),bird:0}; }
function ambStop(){ if(!amb) return; try{ amb.wind.s.stop(); amb.wave.s.stop(); }catch(e){} amb=null; }
function birdCall(){ const a=ac(); if(!a) return; const o=a.createOscillator(), g=a.createGain(); o.type='sine'; const t=a.currentTime, f=1800+Math.random()*900;
  o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*1.6,t+.08); o.frequency.exponentialRampToValueAtTime(f*.9,t+.18);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.025,t+.03); g.gain.exponentialRampToValueAtTime(.0005,t+.22); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+.25); }
function walkTick(dt,left){ const soft=hAt(pos.x,pos.z)<-.06, sandy=sandK(pos.x,pos.z)>.5, maxV=soft?.55:sandy?1.5:1.1;   // 公尺／秒：軟泥很慢
  walkV+=((walkReq*maxV)-walkV)*Math.min(1,dt*(soft?2:5));
  pos.x+=-Math.sin(yaw)*walkV*dt; pos.z+=-Math.cos(yaw)*walkV*dt; pos.x=clamp(pos.x,-18,18); pos.z=clamp(pos.z,-30,24);
  const sp=Math.abs(walkV); stepAcc+=sp*dt; bobT+=sp*dt*(Math.PI/.7);
  sink+=((soft&&sp>.05?.09:soft?.05:0)-sink)*Math.min(1,dt*2);   // 站在軟泥裡會慢慢陷下去
  if(stepAcc>.7){ stepAcc=0; stepSide=-stepSide; const sx=pos.x+Math.cos(yaw)*.12*stepSide, sz=pos.z-Math.sin(yaw)*.12*stepSide; footprint(sx,sz,yaw,soft); stepSound(soft,sandy); vib(soft?[10,60,25]:12);
    if(soft&&Math.random()<.12) c.toast('腳陷進軟泥裡了，走慢一點','',1200); }
  prints.forEach(p=>{ p.t+=dt; const m=p.m.material; if(p.soft) m.color.setHex(p.t<20?0x6a6a70:0x7d8a90); m.roughness=p.soft?Math.max(.05,.25-p.t*.01):.5; m.opacity=Math.max(0,.9-Math.max(0,p.t-50)/30); });   // 泥地腳印慢慢積水、反光，之後被抹平
  if(amb){ amb.wind.g.gain.value=.04+.02*Math.sin(performance.now()*.0003); amb.wave.g.gain.value=.02+.08*Math.max(0,1-left/40); amb.bird-=dt; if(amb.bird<=0){ amb.bird=4+Math.random()*9; birdCall(); if(Math.random()<.5) setTimeout(birdCall,180); } } }
 let drag=null;
const ray=new T.Raycaster(), v2=new T.Vector2();
function down(e){ if(!on||dig) return; drag={x:e.clientX,y:e.clientY,yaw,moved:0,t:performance.now()}; }
function move(e){ if(!on||!drag||dig) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.moved=Math.max(drag.moved,Math.hypot(dx,dy)); yaw=drag.yaw-dx*.005;
  walkReq=clamp(-dy*.012,-1,1); }   // 上下拖曳的距離＝走路的意圖（快慢），實際移動在每格畫面裡算（軟泥會變慢）
function up(e){ walkReq=0; if(!on||!drag||dig) return; const was=drag; drag=null; if(was.moved>10) return;
  v2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(v2,cam);
  const rh=ray.intersectObjects(roamers.map(r=>r.g),true); if(rh.length){ let o=rh[0].object; const r=roamers.find(q=>{ let x=o; while(x){ if(x===q.g) return true; x=x.parent; } return false; });
      if(r&&r.g.position.distanceTo(pos)<6){ if(Math.random()<.55){ const sp=c.species(r.id); bag.push({id:r.id,v:SURF[r.id].price+Math.round(Math.random()*30),L:r.L}); bagText(); S.remove(r.g); roamers.splice(roamers.indexOf(r),1); vib(30); c.toast('抓到'+SURF[r.id].n+'了！','good',1400); }
        else { r.flee=2; r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); c.toast(SURF[r.id].n+'溜走了，慢慢靠近再試','',1400); } return; } }
  let hits=ray.intersectObjects(signs.filter(s=>!s.done).map(s=>s.m));
  if(!hits.length){ const gh=ray.intersectObject(ground); if(gh.length){ const p=gh[0].point; let best=null,bd=1.3; signs.forEach(s=>{ if(s.done) return; const d=Math.hypot(s.m.position.x-p.x,s.m.position.z-p.z); if(d<bd){ bd=d; best=s; } }); if(best) hits=[{object:best.m}]; else { c.toast('這裡看不出痕跡，找找泥面上的小孔、凹痕或沙堆（附近的會微微發亮）','',1800); return; } } }
  if(hits.length){ const s=signs.find(q=>q.m===hits[0].object); if(s.m.position.distanceTo(pos)>7){ c.toast('走近一點才能挖','',1200); return; } startDig(s); } }
window.addEventListener('pointerdown',e=>{ if(!on||dig) return; const t=e.target; if(t&&t.closest&&t.closest('button,#tdDig,#tdBag,#tdClock,.sheet,#sheet')) return; down(e); });   /* 原本只聽 3D 畫布，畫布上面還蓋著遊戲的其他觸控層，點了沒反應 */ window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
/* ---------- 每一格 ---------- */
let t=0;
let rspawn=0;
function render(dt){ if(!on) return; t+=dt; if(!roamers.length&&(rspawn-=dt)<=0){ rspawn=2; spawnRoamers(); } /* 模型下載好就放出泥面上的生物 */ const h=c.hour(), left=(endH-h)*60;   // 剩下幾分鐘（遊戲時間）
  $('tdClock').innerHTML=left>40?`🌊 退潮中・離漲潮還有 ${Math.floor(left)} 分`:`<span style="color:#ffb39a">⚠️ 漲潮倒數 ${Math.max(0,Math.floor(left))} 分</span>`;
  if(left<=40&&warned<1){ warned=1; warnEl.innerHTML='🌊 潮水開始回漲了！<br><small>請沿著插著橘色旗子的路線往岸邊移動</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',3800); vib([80,60,80]); route.visible=true; }
  if(left<=20&&warned<2){ warned=2; warnEl.innerHTML='⚠️ 二十分鐘後滿潮！立刻撤離<br><small>真實的泥灘：漲潮速度常比走路快，泥灘也會陷住腳。一定要先查潮汐表、結伴、提早離開</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',5200); vib([120,80,120,80,120]); }
  if(left<=0&&!evac){ evac=true; c.toast('🌊 潮水漲上來了！你被救生員帶回岸邊，桶子裡掉了一半','warn',4200); setTimeout(()=>exit(true),600); }
  // 海水往岸邊推進
  const k=clamp(1-left/40,0,1); sea.position.z=-200+k*k*175;
  // 噴水的文蛤孔、會動的痕跡
  signs.forEach(s=>{ if(s.done||s.k!=='hardclam') return; s.spurt-=dt; if(s.spurt<=0){ s.spurt=rand(3,7); if(s.m.position.distanceTo(pos)<9&&window.__P_splash) window.__P_splash(s.m.position.x,0,s.m.position.z); } });
  // 活生物：招潮蟹橫著走、彈塗魚一跳一跳、寄居蟹慢慢爬；骨架擺動
  roamers.forEach(r=>{ r.t-=dt; if(r.t<=0){ r.t=rand(1.5,4); r.h+=rand(-1.4,1.4); } const near=r.g.position.distanceTo(pos)<2.5; if(near&&r.flee<=0){ r.flee=1.5; r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); }
    r.flee-=dt; const sp=(r.id==='hermit'?.05:r.id==='fiddler'?.18:.12)*(r.flee>0?3:1);
    if(r.id==='mudskip'){ r.hop-=dt; if(r.hop<=0){ r.hop=rand(.8,2.2); r.jy=.35; } r.jy=Math.max(0,(r.jy||0)-dt*1.4); r.g.position.y=Math.sin(Math.min(1,(.35-r.jy)/.35)*Math.PI)*.08; } else r.g.position.y=0;
    const side=r.id==='fiddler'?Math.PI/2:0; r.g.position.x+=Math.sin(r.h)*sp*dt; r.g.position.z+=Math.cos(r.h)*sp*dt; r.g.rotation.y=r.h-Math.PI/2+side;
    r.g.position.x=clamp(r.g.position.x,-18,18); r.g.position.z=clamp(r.g.position.z,-30,20); r.g.position.y+=hAt(r.g.position.x,r.g.position.z)+.01; r.uni.uSwim.value+=dt*(4+sp*30); r.uni.uAmp.value=.05+sp*.4; });
  shown.forEach(s=>{ s.t+=dt; s.f.uni.uSwim.value+=dt*8; s.f.uni.uAmp.value=.08+.06*Math.sin(s.t*3); s.f.group.rotation.y+=dt*.6; });
  digTick(dt); flagTick(performance.now()*.001); if(gmat.userData.sh){ gmat.userData.sh.uniforms.uTW.value=performance.now()*.001; gmat.userData.sh.uniforms.uSkyK.value=Math.min(1.2,.35+.8*(S.children.find(o=>o.isHemisphereLight)||{intensity:1.7}).intensity/1.7); }
  walkTick(dt,left);
  pos.y=hAt(pos.x,pos.z)+1.55-sink+Math.abs(Math.sin(bobT))*-.035*Math.min(1,Math.abs(walkV));   // 跟著地形、走路上下晃、軟泥會陷
  { const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rel=Math.atan2(0,1)-Math.atan2(fx,fz); const ar=document.getElementById('tdArr'); if(ar) ar.style.transform='rotate('+(-rel)+'rad)';   // 岸在 +z 方向
    const dd=document.getElementById('tdDist'); if(dd) dd.textContent=Math.max(0,Math.round(34-pos.z))+' m'; const sh=document.getElementById('tdShore'); if(sh) sh.classList.toggle('warn',!!warned); }
  signs.forEach(s=>{ if(!s.ring) return; const d=Math.hypot(s.m.position.x-pos.x,s.m.position.z-pos.z); s.ring.visible=!s.done; s.ring.material.opacity=s.done?0:Math.max(0,1-d/7)*(.35+.25*Math.sin(performance.now()*.004+s.m.position.x)); });   // 跟著地形高低走
  cam.position.copy(pos); cam.rotation.set(pitch+Math.sin(bobT*2)*.006*Math.min(1,Math.abs(walkV)),yaw,Math.sin(bobT)*.01*Math.min(1,Math.abs(walkV)),'YXZ'); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix();
  W.renderer.render(S,cam); }
return {showRoute:v=>{ route.visible=v; },testDig:k=>{ const s=signs.find(q=>q.k===k&&!q.done)||signs.find(q=>q.k); if(s) startDig(s); return !!s; },enter,exit,render,active:()=>on,low:h=>!!lowWin(h),nextLow,CR,SURF,ALL};
}
