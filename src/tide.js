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
// 粗地面在任一點的實際高度（和地面網格一樣的雙線性插值）：挖掘面的邊緣要剛好貼齊，才不會出現鋸齒裂縫
function gAt(x,z){ const cs=200/GN, fx=(x+100)/cs, fz=(z+100)/cs, i=Math.floor(fx), j=Math.floor(fz), u=fx-i, v=fz-j, X=k=>-100+k*cs;
  const h00=hAt(X(i),X(j)), h10=hAt(X(i+1),X(j)), h01=hAt(X(i),X(j+1)), h11=hAt(X(i+1),X(j+1)); return (h00*(1-u)+h10*u)*(1-v)+(h01*(1-u)+h11*u)*v; }
const edgeK=(lx,lz)=>{ const e=Math.max(Math.abs(lx),Math.abs(lz))/(.8/2); return 1-Math.min(1,Math.max(0,(e-.7)/.3)); };   // 挖掘面中間用精細高度、邊緣過渡到粗地面高度
const GN=220, gg=new T.PlaneGeometry(200,200,GN,GN).rotateX(-Math.PI/2), gp=gg.attributes.position;
for(let k=0;k<gp.count;k++) gp.setY(k,hAt(gp.getX(k),gp.getZ(k)));
gg.computeVertexNormals();
const gmat=new T.MeshStandardMaterial({color:0xb8aea0,map:mudT,normalMap:mudN,normalScale:new T.Vector2(1.1,1.1),roughness:.42,metalness:0});
const HOLES=[]; for(let i=0;i<8;i++) HOLES.push(new T.Vector3(0,0,0));
const GU={uHoles:{value:HOLES},uHoleOn:{value:1},uTW:{value:0},uSkyK:{value:1},uSeepY:{value:-9}}; gmat.userData.sh={uniforms:GU};   /* 地面和挖掘區共用同一組時間／天光參數 */
gmat.onBeforeCompile=sh=>{ sh.uniforms.tSand={value:sandT}; sh.uniforms.tSandN={value:sandN}; sh.uniforms.uTW=GU.uTW; sh.uniforms.uHoles=GU.uHoles; sh.uniforms.uHoleOn=GU.uHoleOn; sh.uniforms.uSkyK=GU.uSkyK; sh.uniforms.uSeepY=GU.uSeepY;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP2;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP2=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 uHoles[8]; uniform float uHoleOn; uniform sampler2D tSand; uniform sampler2D tSandN; uniform float uTW; uniform float uSkyK; uniform float uSeepY; varying vec3 vWP2;
float th(vec2 p){ return sin(p.x*.13+sin(p.y*.07)*1.7)*.5+sin(p.y*.11-p.x*.05)*.5; }
float sandKf(vec2 p){ float e=34.+th(p*vec2(1.7,1.3))*7.+sin(p.x*.21)*2.5; return clamp((p.y-(e-4.))/8.,0.,1.); }`)
  .replace('#include <map_fragment>',`
  if(uHoleOn>.5){ for(int i=0;i<8;i++){ vec3 h=uHoles[i]; if(h.z>0.&&abs(vWP2.x-h.x)<h.z&&abs(vWP2.z-h.y)<h.z) discard; } }   // 挖掘區那一塊的粗地面挖空，換成細緻的挖掘面（不然原本的地面會蓋住洞）
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
  if(uHoleOn>.5){ float wl=-.105, dep=wl-vWP2.y;   /* 只有地面算潮溝積水；挖掘洞裡的水由滲水處理 */                                            // 水深
    if(dep>-.02&&uHoleOn>.5){ vec3 V=normalize(cameraPosition-vWP2);   /* 挖掘面不套用潮溝積水（洞底原本被當成水面、反射天空變灰白） */ 
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
// 撤離指引：地上一排發光的箭頭，從腳下一路指向岸邊，依序閃爍（像跑馬燈）；越接近滿潮越紅、閃得越快
const chev=new T.Group(); S.add(chev); chev.visible=false;
{ const sh=new T.Shape(); sh.moveTo(0,.32); sh.lineTo(.36,-.05); sh.lineTo(.22,-.05); sh.lineTo(0,.17); sh.lineTo(-.22,-.05); sh.lineTo(-.36,-.05); sh.closePath();
  const cg=new T.ShapeGeometry(sh).rotateX(-Math.PI/2); for(let i=0;i<10;i++){ const m=new T.Mesh(cg,new T.MeshBasicMaterial({color:0xffc23a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})); m.rotation.y=Math.PI; chev.add(m); } }
function chevTick(t,left){ chev.visible=left<=40&&!dig; if(!chev.visible) return; const urg=clamp(1-left/40,0,1), col=new T.Color().setHSL(.12-.12*urg,1,.55);
  chev.children.forEach((m,i)=>{ const z=pos.z+1.6+i*1.5, x=pos.x+(0-pos.x)*Math.min(1,i/8)*.3; m.position.set(x,hAt(x,z)+.02,z); m.rotation.y=Math.PI; m.scale.setScalar(1.6);
    const ph=((t*(1.2+urg*1.8))-i*.18)%1; m.material.color.copy(col); m.material.opacity=Math.min(1,.25+Math.max(0,1-ph*2.2)*1.2)*(z>34?.2:1); }); }
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
const ringG=new T.RingGeometry(.36,.5,40).rotateX(-Math.PI/2), ringM=new T.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
// 立體的痕跡細節：讓每種痕跡一眼看得出差別（找哪裡挖本身就是樂趣）
const SD={wet:new T.MeshStandardMaterial({color:0x140f0b,roughness:.08,metalness:.2}),lip:new T.MeshStandardMaterial({color:0x3d3227,roughness:.25}),sand:new T.MeshStandardMaterial({color:0x8a7558,roughness:.85}),cast:new T.MeshStandardMaterial({color:0x4a3d30,roughness:.35})};
function signDetail(kind){ const g=new T.Group();
  const hole=(r,x,z)=>{ const d=new T.Mesh(new T.CircleGeometry(r,16).rotateX(-Math.PI/2),SD.wet); d.position.set(x,.004,z); g.add(d); const l=new T.Mesh(new T.TorusGeometry(r*1.25,r*.35,6,16),SD.lip); l.rotation.x=Math.PI/2; l.scale.z=.45; l.position.set(x,.004,z); g.add(l); };
  if(kind==='hole') hole(.022,0,0);                                        // 文蛤：一個濕亮的小圓孔，孔邊微微隆起
  else if(kind==='key'){ hole(.016,-.02,0); hole(.016,.02,0); }              // 赤嘴蛤：兩個並排的孔
  else if(kind==='slit'){ const d=new T.Mesh(new T.CircleGeometry(.05,20).rotateX(-Math.PI/2),SD.wet); d.scale.set(.35,1,1); d.position.y=.004; g.add(d); const l=new T.Mesh(new T.TorusGeometry(.05,.012,6,20),SD.lip); l.rotation.x=Math.PI/2; l.scale.set(.4,1,.4); l.position.y=.004; g.add(l); }   // 竹蟶：細長的鑰匙孔
  else if(kind==='mound'){ hole(.035,0,0); const c2=new T.Mesh(new T.ConeGeometry(.14,.05,14),SD.sand); c2.position.set(.13,.02,.04); c2.scale.z=.7; g.add(c2); for(let i=0;i<10;i++){ const b=new T.Mesh(new T.SphereGeometry(.008,6,4),SD.sand); b.position.set(.05+Math.random()*.2,.006,(Math.random()-.5)*.2); g.add(b); } }   // 沙蟹：大洞＋新挖出來的沙堆
  else if(kind==='pellet'){ for(let i=0;i<34;i++){ const a=Math.random()*6.28, r=.03+Math.random()*.18; const b=new T.Mesh(new T.SphereGeometry(.0055,5,4),SD.sand); b.position.set(Math.cos(a)*r,.005,Math.sin(a)*r); g.add(b); } hole(.01,0,0); }   // 海瓜子：一圈小沙球
  else if(kind==='coil'){ const pts=[]; for(let i=0;i<40;i++){ const a=i*.42, r=.015+i*.0028; pts.push(new T.Vector3(Math.cos(a)*r,.008+Math.sin(i*1.7)*.002,Math.sin(a)*r)); } g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),80,.0065,6),SD.cast)); }   // 沙蠶：一圈圈盤繞的泥條
  else return null; return g; }
function spawnSigns(){ signs.forEach(s=>{ S.remove(s.m); if(s.m.userData.det) S.remove(s.m.userData.det); }); signs=[]; const kinds=Object.keys(CR);
  for(let i=0;i<36;i++){ const k=Math.random()<.18?null:kinds[Math.floor(Math.random()*kinds.length)];
    const sign=k?CR[k].sign:'flat', m=new T.Mesh(new T.PlaneGeometry(.9,.9).rotateX(-Math.PI/2),DEC[sign]); m.position.set(rand(-14,14),0,rand(-26,12)); m.position.y=hAt(m.position.x,m.position.z)+.015; m.rotation.y=rand(0,6.28); S.add(m);
    const ring=null; m.scale.setScalar(1.35);   // 不再用提示光圈：痕跡本身放大、做成立體的
    const det=signDetail(sign); if(det){ det.position.copy(m.position); det.position.y=m.position.y-.012; det.rotation.y=m.rotation.y; S.add(det); m.userData.det=det; }
    signs.push({m,k,sign,ring,done:false,spurt:rand(2,6)}); } }
/* ---------- 泥面上的活生物（3D 模型＋骨架） ---------- */
let roamers=[];
function spawnRoamers(){ roamers.forEach(r=>S.remove(r.g)); roamers=[];
  for(const [id,n] of [['fiddler',6],['mudskip',4],['hermit',3]]) for(let i=0;i<n;i++){ const sp=c.species(id); let f=null; try{ if(creaReady(id)) f=creaModel(sp); }catch(e){} if(!f) continue;
    const L=sp?(sp.len[0]+Math.random()*(sp.len[1]-sp.len[0]))/100:.05; f.group.scale.setScalar(L*1.4); f.group.position.set(rand(-12,12),0,rand(-22,10)); f.group.position.y=hAt(f.group.position.x,f.group.position.z)+.01; S.add(f.group);
    roamers.push({id,g:f.group,uni:f.uni,h:rand(0,6.28),t:rand(0,3),hop:0,L,flee:0}); } }
/* ---------- 狀態 ---------- */
let on=false, yaw=0, pitch=-.32, pos=new T.Vector3(0,1.6,18), bag=[], warned=0, evac=false, endH=0;
const LOW=[[3,8],[15,20]];   /* 退潮 5 小時；在泥灘上時間走得比較慢（見 d.js），實際可以玩約 20 分鐘 */
function lowWin(h){ for(const w of LOW) if(h>=w[0]&&h<w[1]) return w; return null; }
function nextLow(h){ for(const w of LOW) if(h<w[0]) return w[0]; return LOW[0][0]+24; }
/* ---------- HUD ---------- */
const hud=document.createElement('div'); hud.id='tideHud'; hud.innerHTML=`<button id="tdCageB">🧺 拖籠</button><button id="tdStomp">👣 跺腳</button><div id="tdClock"></div><div id="tdBag"></div><div id="tdShore"><span id="tdArr">⬆</span> 岸邊 <b id="tdDist"></b></div><div id="tdHint">看泥面的痕跡判斷底下是什麼，點痕跡開挖・拖曳轉頭・兩指或上下拖曳前進</div><button id="tdExit">⬅ 回岸上</button>`;
document.body.appendChild(hud);
const st=document.createElement('style'); st.textContent=`body.attide #top,body.attide #top2,body.attide #act,body.attide #joy,body.attide #hint,body.attide #magWin,body.attide #hotChip,body.attide #steer,body.attide #dragBtn,body.attide #combo,body.attide #goal,body.attide #castTag,body.attide #depthChip,body.attide #uwTag,body.attide #tag,body.attide #scare,body.attide #fxBar,body.attide #bTour,body.attide #bViewBack,body.attide #bShot{display:none!important}
#tideHud{position:fixed;inset:0;pointer-events:none;z-index:6;display:none;font-family:inherit}
#tideHud>div,#tideHud>button{position:absolute;pointer-events:auto}
#tdClock{left:12px;max-width:52vw!important;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-weight:700;font-size:14px;max-width:62vw}
#tdShore{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);background:rgba(10,20,24,.72);color:#fff;border-radius:999px;padding:6px 14px;font-size:14px;font-weight:700;z-index:6}
#tdShore.warn{background:#c0392b;font-size:16px;animation:tdp 1s infinite}@keyframes tdp{50%{transform:translateX(-50%) scale(1.08)}}
#tdArr{display:inline-block;transition:transform .15s}
#tdStomp{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:7;border:0;border-radius:999px;padding:12px 16px;background:rgba(10,20,24,.78);color:#fff;font-weight:800;font-size:15px}
#tdCageB{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 146px);z-index:7;border:0;border-radius:999px;padding:12px 16px;background:rgba(10,20,24,.78);color:#fff;font-weight:800;font-size:15px}
#tdCage{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9;display:none;flex-direction:column;align-items:center;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.55) 30%);padding:26px 0 6px;color:#fff;text-align:center;font-size:14px;text-shadow:0 1px 2px #000}
#tdCage i{display:block;width:170px;height:9px;border-radius:9px;background:rgba(255,255,255,.2);overflow:hidden;margin:6px 0}#tdCage b{display:block;height:100%;background:#c9a76a}
#cgBtns{display:flex;gap:10px;pointer-events:auto}#cgBtns button{border:0;border-radius:999px;padding:10px 18px;font-weight:800}
#tdBag{right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);background:rgba(10,20,24,.72);color:#fff;border-radius:14px;padding:8px 12px;font-size:13px}
#tdHint{left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);text-align:center;color:#fff;text-shadow:0 1px 3px #000;font-size:13px}
#tdExit{left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);border:0;border-radius:999px;padding:12px 22px;background:#ffcf66;color:#3a2600;font-weight:800;font-size:15px}
#tdWarn{position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:8;background:rgba(170,30,20,.92);color:#fff;border-radius:16px;padding:14px 18px;font-weight:800;font-size:15px;text-align:center;display:none;max-width:86vw;line-height:1.5}
#digBox{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9;display:none;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;background:linear-gradient(transparent,rgba(0,0,0,.55) 30%);padding:28px 0 6px}
#digSpd{display:flex;align-items:center;gap:8px;color:#fff;font-size:12px;font-weight:700;margin-bottom:6px;text-shadow:0 1px 2px #000}#digSpd i{display:block;width:150px;height:9px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden}#digSpd b{display:block;height:100%;width:0;border-radius:9px;transition:width .08s}
#digInfo{color:#fff;margin-top:0;font-size:14px;text-align:center;min-height:42px;padding:0 16px;text-shadow:0 1px 2px #000}
#digBtns{display:flex;gap:8px;margin-top:8px;pointer-events:auto;flex-wrap:wrap;justify-content:center;padding:0 10px}#digBtns button{border:0;border-radius:999px;padding:10px 14px;font-weight:800;font-size:14px;white-space:nowrap}`;
document.head.appendChild(st);
const warnEl=document.createElement('div'); warnEl.id='tdWarn'; document.body.appendChild(warnEl);
const $=id=>document.getElementById(id);
function bagText(){ $('tdBag').textContent='🪣 桶子 '+bag.length+' 個・約 🪙'+bag.reduce((a,b)=>a+b.v,0).toLocaleString(); }
/* ---------- 聲音與震動（每一層不同） ---------- */
let AC=null; function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function noise(dur,f,q,vol){ const a=ac(); if(!a) return; const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type='bandpass'; fl.frequency.value=f; fl.Q.value=q; const g=a.createGain(); g.gain.value=vol; s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(); }
/* ---------- 貝類模型：兩片真的殼（上下兩片拱起的殼瓣，殼頂鉸鏈相連），殼面用你提供的實拍圖，殼的輪廓照原圖裁切 ----------
   （AI 生成的貝類模型像一片缺角的碎殼，改成程式組出來的兩片殼，開合也是真的兩片在動） */
const SHELLS=new Set(['hardclam','gomphina','tellin']), shellTex={}, shellOk={};
const SHELL_SHAPE={hardclam:{w:1,l:.9,h:.2},gomphina:{w:1,l:.92,h:.17},tellin:{w:1,l:.72,h:.07}};
function shellModel(id){ if(!shellTex[id]){ const t=new T.TextureLoader().load('models/tide/shell_'+id+'.png',()=>{ shellOk[id]=1; }); t.encoding=T.sRGBEncoding; t.anisotropy=8; shellTex[id]=t; }
  const sh=SHELL_SHAPE[id]||SHELL_SHAPE.hardclam, mat=new T.MeshStandardMaterial({map:shellTex[id],alphaTest:.5,side:T.DoubleSide,roughness:id==='tellin'?.25:.4,metalness:0});
  mat.onBeforeRender=null; const tx0=shellTex[id];
  const valve=(up)=>{ const g=new T.SphereGeometry(.5,40,14,0,Math.PI*2,0,Math.PI/2); const P=g.attributes.position, uv=g.attributes.uv;
    for(let i=0;i<P.count;i++){ const x=P.getX(i)*sh.w, z=P.getZ(i)*sh.l, y=P.getY(i)*sh.h*2; P.setXYZ(i,x,up?y:-y,z); uv.setXY(i,x/sh.w+.5,1-(z/sh.l+.5)); }   // 殼面照片從正上方投影
    g.translate(0,0,sh.l*.47); g.computeVertexNormals(); return new T.Mesh(g,mat); };   // 鉸鏈（殼頂）放在原點
  const group=new T.Group(), body=new T.Group(), top=new T.Group(), bot=valve(false); top.add(valve(true)); body.add(top); body.add(bot); body.position.z=-sh.l*.47; group.add(body);
  const meat=new T.Mesh(new T.SphereGeometry(.42,16,8),new T.MeshStandardMaterial({color:0xe9d6c3,roughness:.6})); meat.scale.set(sh.w*.9,.12,sh.l*.85); meat.position.z=sh.l*.47; body.add(meat);   // 殼張開時看得到裡面的肉
  body.rotation.y=Math.PI/2;   // 殼頂朝 +X，和其他模型一樣「頭朝前」
  const uni={uSwim:{value:0},uAmp:{value:0}}; group.onBeforeRender=()=>{}; body.onBeforeRender=()=>{};
  group.traverse(o=>{ if(o.isMesh&&o.material===mat){ o.visible=!!shellOk[id]; } });   // 殼面照片還沒下載完不顯示（避免出現白色圓盤）
  const ob=()=>{ [top.children[0],bot].forEach(m=>{ m.visible=!!shellOk[id]; }); }; ob(); if(!shellOk[id]){ const iv=setInterval(()=>{ ob(); if(shellOk[id]) clearInterval(iv); },300); }
  top.children[0].onBeforeRender=()=>{ meat.visible=!uni.closed&&uni.uAmp.value>.04; top.rotation.x=uni.closed?0:-Math.min(.32,uni.uAmp.value*1.6)*(.6+.4*Math.max(0,Math.sin(uni.uSwim.value*.5))); };   // 上殼繞鉸鏈開合
  return {group,uni,shell:true}; }
function razorModel(){ if(!shellTex.razor){ const t=new T.TextureLoader().load('models/tide/shell_razor.png',()=>{ shellOk.razor=1; }); t.encoding=T.sRGBEncoding; t.anisotropy=8; shellTex.razor=t; }
  const mat=new T.MeshStandardMaterial({map:shellTex.razor,alphaTest:.4,side:T.DoubleSide,roughness:.28,metalness:0}), group=new T.Group(), body=new T.Group(); group.add(body);
  const valve=up=>{ const g=new T.CylinderGeometry(.5,.5,1,28,1,true,up?0:Math.PI,Math.PI); g.rotateZ(Math.PI/2); const P=g.attributes.position, uv=g.attributes.uv;
    for(let i=0;i<P.count;i++){ const x=P.getX(i), y=P.getY(i)*.13, z=P.getZ(i)*.17; P.setXYZ(i,x,y,z); uv.setXY(i,x+.5,.5+z/.34*.9); } g.computeVertexNormals(); return new T.Mesh(g,mat); };   // 長筒形的兩片殼，各半圈
  const top=valve(true), bot=valve(false); body.add(top); body.add(bot);
  const foot=new T.Mesh(new T.SphereGeometry(.5,12,8),new T.MeshStandardMaterial({color:0xefe2cf,roughness:.55})); foot.scale.set(.14,.1,.12); foot.position.x=-.5; body.add(foot);   // 白色的斧足
  const uni={uSwim:{value:0},uAmp:{value:0}}; top.onBeforeRender=()=>{ const k=Math.min(1,uni.uAmp.value*5); foot.scale.x=.08+.12*k*(.5+.5*Math.sin(uni.uSwim.value*2)); foot.position.x=-.5-foot.scale.x*.4; };
  return {group,uni,shell:true}; }
const creaModel=sp=>SHELLS.has(sp.id)?shellModel(sp.id):sp.id==='razor'?razorModel():window.__MDL.fish(sp);
const creaReady=id=>SHELLS.has(id)||id==='razor'||!!(window.__MDL&&window.__MDL.fishReady(id));
/* ---------- 挖掘（3D 實景）：蹲下來，用蛤耙在真的泥面上挖出一個洞 ----------
   ・點痕跡 → 鏡頭蹲低看著那塊泥面，先判斷要不要挖（顯示痕跡的線索），按「開挖」才開始
   ・手指在泥面上拖：蛤耙的齒跟著手指刮過，泥面真的被挖低（高解析度地形即時變形），挖出的泥堆在洞邊、泥塊噴起落下
   ・越往下：濕沙 → 黏泥 → 碎貝殼層，顏色、聲音、震動、好不好挖都不同；洞挖深了地下水會慢慢滲進來
   ・生物是真的 3D 模型埋在泥裡：挖到時耙子碰到硬物（震動＋喀聲），太用力會刮傷殼；露出夠多才能「取出」
   ・竹蟶發現被挖會往下鑽、沙蟹太慢會從旁邊鑽走 */
const vib=p=>{ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} };
const LAYER=[{n:'濕沙',d:0,col:[1,1,1],snd:()=>noise(.06,2600,1.2,.12),vib:4,hard:1},{n:'黏泥',d:.035,col:[.62,.58,.54],snd:()=>noise(.12,420,3,.2),vib:10,hard:.55},{n:'碎貝殼層',d:.075,col:[.9,.86,.8],snd:()=>noise(.04,5200,6,.14),vib:6,hard:.42}];
const layerOf=d=>d>=LAYER[2].d?2:d>=LAYER[1].d?1:0;
const box=document.createElement('div'); box.id='digBox'; box.innerHTML='<div id="digInfo"></div><div id="digBtns"></div>'; document.body.appendChild(box);
const PS=.8, PG=72, holePatches=[];   // 挖掘區 80 公分見方、72×72 格（約 1.1 公分一格）
let dig=null;
// 蛤耙：木柄＋橫桿＋六根鐵齒
const digLight=new T.PointLight(0xfff0dc,0,1.6,1.6); S.add(digLight);
let rakeMud=0; const rake=new T.Group(), rakeHead=new T.Group(); rake.add(rakeHead);
{ const wood=new T.MeshStandardMaterial({color:0x9a7a52,roughness:.7}), steel=new T.MeshStandardMaterial({color:0x6d6c69,metalness:.85,roughness:.38}), rust=new T.MeshStandardMaterial({color:0x6b4a32,metalness:.4,roughness:.7});
  // 木柄：從耙頭往你這邊、往上延伸（像你蹲著握住柄的尾端）
  const hg=new T.CylinderGeometry(.011,.013,.3,10); hg.translate(0,.15,0); const h=new T.Mesh(hg,wood); h.rotation.x=1.05; h.rotation.z=-.35; h.position.set(0,.03,.0); rake.add(h);   // 短柄手耙（真實蛤耙柄約 30 公分），握在右下方
  const fer=new T.Mesh(new T.CylinderGeometry(.014,.014,.04,10),steel); fer.rotation.x=1.05; fer.rotation.z=-.35; fer.position.set(.004,.04,.016); rake.add(fer);   // 金屬套管
  const bar=new T.Mesh(new T.BoxGeometry(.15,.012,.012),rust); bar.position.set(0,.028,0); rakeHead.add(bar);
  for(let i=0;i<7;i++){ const tg=new T.CylinderGeometry(.0022,.0012,.055,6); tg.translate(0,-.0275,0); const t=new T.Mesh(tg,steel.clone()); t.position.set(-.066+i*.022,.028,0); t.rotation.x=-.35; rakeHead.add(t); } }   // 七根鐵齒，往前彎、插進泥裡
rake.visible=false; S.add(rake);
// 桶子：蹲下挖的時候放在身邊；取出的生物飛進桶子裡，看得到裡面裝了什麼
const bucket=new T.Group(), bucketIn=new T.Group(); bucket.add(bucketIn); bucket.visible=false; S.add(bucket);
{ const blue=new T.MeshStandardMaterial({color:0x2f6fa8,roughness:.45,side:T.DoubleSide}), dark=new T.MeshStandardMaterial({color:0x1f4a72,roughness:.5}), wire=new T.MeshStandardMaterial({color:0x9a9a96,metalness:.8,roughness:.35});
  const body=new T.Mesh(new T.CylinderGeometry(.14,.115,.22,28,1,true),blue); body.position.y=.11; bucket.add(body);
  const bot=new T.Mesh(new T.CircleGeometry(.115,28).rotateX(-Math.PI/2),dark); bot.position.y=.003; bucket.add(bot);
  const rim=new T.Mesh(new T.TorusGeometry(.14,.007,8,32),dark); rim.rotation.x=Math.PI/2; rim.position.y=.22; bucket.add(rim);
  for(const y of [.07,.15]){ const r=new T.Mesh(new T.TorusGeometry(.115+y*.11,.004,6,32),dark); r.rotation.x=Math.PI/2; r.position.y=y; bucket.add(r); }   // 塑膠桶的加強圈
  const hd=new T.Mesh(new T.TorusGeometry(.14,.0028,6,24,Math.PI),wire); hd.position.y=.22; hd.rotation.z=.25; bucket.add(hd);
  const water=new T.Mesh(new T.CircleGeometry(.122,24).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x6b6a5c,roughness:.05,metalness:.4,transparent:true,opacity:.75})); water.position.y=.05; bucket.add(water); }   // 桶底一點海水
const inBucket=[];
function bucketAdd(id,size){ const sp=c.species(id); try{ if(!creaReady(id)) return; const f=creaModel(sp); const g=f.group; g.scale.setScalar(Math.min(size,.09)); g.position.set(rand(-.06,.06),.03+inBucket.length*.012,rand(-.06,.06)); g.rotation.set(rand(-.3,.3),rand(0,6),rand(-.3,.3)); bucketIn.add(g); inBucket.push(f); }catch(e){} }
function placeBucket(){ const d=dig; if(!d) return; const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw), x=d.c.x-fx*.28+rx*.38, z=d.c.z-fz*.28+rz*.38; bucket.position.set(x,hAt(x,z)-.01,z); bucket.rotation.y=yaw; bucket.visible=true; }   // 放在右手邊、靠近膝蓋的地方，不擋住洞
// 噴起來的泥塊
const mudGeo=new T.IcosahedronGeometry(1,2); { const P=mudGeo.attributes.position; for(let i=0;i<P.count;i++){ const f=.7+Math.random()*.5; P.setXYZ(i,P.getX(i)*f,P.getY(i)*f*.55,P.getZ(i)*f); } mudGeo.computeVertexNormals(); }
const MUDN=90, mudIM=new T.InstancedMesh(mudGeo,new T.MeshStandardMaterial({color:0x2a231c,roughness:.6,envMapIntensity:.2}),MUDN); mudIM.frustumCulled=false; S.add(mudIM); const muds=[];
for(let i=0;i<MUDN;i++){ muds.push({a:0,p:new T.Vector3(),v:new T.Vector3(),s:0}); }
const m4=new T.Matrix4(), qI=new T.Quaternion(), vS=new T.Vector3();
function spawnMud(p,dir,n,dark){ for(let i=0;i<n;i++){ const m=muds.find(q=>q.a<=0); if(!m) return; m.a=1.2; m.p.copy(p); m.v.set(dir.x*rand(.3,.9)+rand(-.25,.25),rand(.5,1.1),dir.z*rand(.3,.9)+rand(-.25,.25)); m.s=rand(.003,.007)*(dark?1.2:1); } }
function mudTick(dt){ let any=false; muds.forEach((m,i)=>{ if(m.a>0){ any=true; m.a-=dt; m.v.y-=9.8*dt; m.p.addScaledVector(m.v,dt); const gy=dig?patchY(m.p.x,m.p.z):hAt(m.p.x,m.p.z); if(m.p.y<gy){ m.p.y=gy-.002; m.v.set(0,0,0); if(m.a>.25) m.a=.25; m.s*=1-dt*3; } }   // 落地就攤平、陷進泥裡消失
    m4.compose(m.p,qI,vS.setScalar(m.a>0?m.s:0)); mudIM.setMatrixAt(i,m4); }); mudIM.instanceMatrix.needsUpdate=true; }
// 跺腳時看得到的水柱：細長的水柱往上噴 40～60 公分再落下，四周濺起水花
const jets=[]; const jetM=new T.MeshStandardMaterial({color:0xe9f2f4,transparent:true,opacity:.75,roughness:.05,metalness:.2});
function jet(p){ const m=new T.Mesh(new T.CylinderGeometry(.006,.012,1,8,1,true),jetM.clone()); m.position.copy(p); m.scale.set(1,.001,1); S.add(m); jets.push({m,t:0,h:rand(.35,.6),p:p.clone()}); }
function jetTick(dt){ for(let i=jets.length-1;i>=0;i--){ const j=jets[i]; j.t+=dt; const k=j.t<.25?j.t/.25:Math.max(0,1-(j.t-.25)/.45), H=j.h*k; j.m.scale.y=Math.max(.001,H); j.m.position.y=j.p.y+H/2; j.m.material.opacity=.75*Math.min(1,k*1.5);
    if(j.t>.2&&!j.spray){ j.spray=1; for(let n=0;n<16;n++){ const w=drops.find(q=>q.a<=0); if(!w) break; w.a=1.2; w.p.copy(j.p).setY(j.p.y+j.h*.9); w.v.set(rand(-.5,.5),rand(.2,.9),rand(-.5,.5)); w.s=rand(.006,.012); } }
    if(j.t>.75){ S.remove(j.m); jets.splice(i,1); } } }
// 水滴：文蛤受驚噴水、取出時滴水
const WN=70, wIM=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshStandardMaterial({color:0x8a9497,roughness:.04,metalness:.5,transparent:true,opacity:.32,envMapIntensity:.6,depthWrite:false}),WN); wIM.frustumCulled=false; S.add(wIM); const drops=[];
for(let i=0;i<WN;i++) drops.push({a:0,p:new T.Vector3(),v:new T.Vector3(),s:0});
function squirt(p,up,n){ for(let i=0;i<n;i++){ const w=drops.find(q=>q.a<=0); if(!w) return; w.a=1; w.p.copy(p); w.v.set(rand(-.12,.12),up*rand(.75,1.1),rand(-.12,.12)); w.s=rand(.0025,.005); } }
function drip(p,n){ for(let i=0;i<n;i++){ const w=drops.find(q=>q.a<=0); if(!w) return; w.a=.8; w.p.copy(p).add(vS.set(rand(-.02,.02),rand(-.01,0),rand(-.02,.02))); w.v.set(0,-.1,0); w.s=rand(.002,.0035); } }
function dropTick(dt){ drops.forEach((w,i)=>{ if(w.a>0){ w.a-=dt; w.v.y-=9.8*dt; w.p.addScaledVector(w.v,dt); const gy=dig?patchY(w.p.x,w.p.z):hAt(w.p.x,w.p.z); if(w.p.y<gy){ w.a=0; } }
  m4.compose(w.p,qI,vS.setScalar(w.a>0?w.s:0)); wIM.setMatrixAt(i,m4); }); wIM.instanceMatrix.needsUpdate=true; }
// 地下水：洞挖深了慢慢從底部滲上來
const seepOff=false, seep=new T.Mesh(new T.CircleGeometry(.16,40).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x4a4234,roughness:.06,metalness:.35,transparent:true,opacity:.86,envMapIntensity:.8})); seep.visible=false; S.add(seep);
function patchY(x,z){ const d=dig; if(!d) return hAt(x,z); const u=(x-d.c.x)/PS+.5, v=(z-d.c.z)/PS+.5; if(u<0||v<0||u>1||v>1) return hAt(x,z); const i=Math.round(v*PG)*(PG+1)+Math.round(u*PG); return d.base[i]-d.D[i]; }
const CLUE={hole:'單一個小圓孔，邊緣濕濕的，偶爾會噴出一道水──底下多半是文蛤',key:'兩個並排的小孔，像鑰匙孔──這是赤嘴蛤的入水管和出水管',slit:'一道細長的橢圓凹痕──竹蟶是直立埋在泥裡的，牠一察覺就會往下鑽',pellet:'細細的爪痕和一顆顆小沙球──附近可能有海瓜子，殼很薄要輕挖',mound:'大洞旁邊一堆新挖出來的沙──沙蟹的洞，挖太慢牠會從別的出口溜走',coil:'一圈圈盤繞的泥條──沙蠶吐出來的，牠很軟，太用力會扯斷',flat:'平平的泥面，看不出什麼痕跡'};
function startDig(s){ const k=s.k, cr=k?CR[k]:null, c0=s.m.position.clone();
  const geo=new T.PlaneGeometry(PS,PS,PG,PG).rotateX(-Math.PI/2), P=geo.attributes.position, n=P.count, base=new Float32Array(n), D=new Float32Array(n), col=new Float32Array(n*3), uv=geo.attributes.uv;
  for(let i=0;i<n;i++){ const x=P.getX(i)+c0.x, z=P.getZ(i)+c0.z; base[i]=gAt(x,z)*(1-edgeK(P.getX(i),P.getZ(i)))+hAt(x,z)*edgeK(P.getX(i),P.getZ(i))+.0015; P.setY(i,base[i]-c0.y); uv.setXY(i,x*.29,z*.29); col[i*3]=0; col[i*3+1]=0; col[i*3+2]=1; }
  geo.setAttribute('color',new T.BufferAttribute(col,3)); geo.computeVertexNormals();
  const mat=gmat.clone(); mat.onBeforeCompile=sh=>{ gmat.onBeforeCompile(sh); sh.uniforms.uHoleOn={value:0}; mat.envMapIntensity=.08;
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`
#ifdef USE_COLOR
  { float dk=vColor.r, ly=vColor.g, ao=vColor.b; vec3 gq=floor(vWP2*260.); float nz=fract(sin(dot(gq,vec3(12.99,78.23,37.71)))*43758.5)*.5+fract(sin(dot(floor(vWP2*70.),vec3(4.1,7.7,3.3)))*9631.7)*.5;   /* 立體的顆粒雜訊：洞壁不會再被貼圖拉成一條條 */
    vec3 wetSand=vec3(.055,.043,.032), clay=vec3(.032,.028,.024), shellL=vec3(.075,.066,.054);   /* 翻開的泥是深褐、深灰（線性色彩空間，原本太亮看起來像白灰） */
    vec3 cc=ly<.25?wetSand:ly<.75?clay:shellL; cc*=.75+.4*nz;
    if(ly>.75){ float sp=step(.78,texture2D(map,vWP2.xz*3.1).g); cc=mix(cc,vec3(.75,.7,.62),sp*.6); }   // 碎貝殼層：一點點白色碎殼
    diffuseColor.rgb=mix(diffuseColor.rgb,cc,dk)*ao*mix(1.,.72,dk);   /* 挖開的濕泥再暗一點，越深的地方光越少 */
    float wd=uSeepY-vWP2.y; if(dk>.6&&wd>0.){ float a=smoothstep(0.,.006,wd); vec3 V=normalize(cameraPosition-vWP2); float fr=.04+.96*pow(1.-max(V.y,0.),5.);
      diffuseColor.rgb=mix(diffuseColor.rgb,mix(diffuseColor.rgb*.55,vec3(.05,.055,.06),fr*.5)+.015*sin(vWP2.x*90.+uTW*3.)*sin(vWP2.z*80.-uTW*2.),a*.85); } }   // 洞底滲出的混濁地下水
#endif`); sh.fragmentShader=sh.fragmentShader.replace('roughnessFactor+= (texture2D(map,vWP2.xz*1.7).r-.5)*.25; }','roughnessFactor+= (texture2D(map,vWP2.xz*1.7).r-.5)*.25; }\n#ifdef USE_COLOR\n roughnessFactor=mix(roughnessFactor,.92,clamp(vColor.r*5.,0.,1.));\n#endif'); }; mat.vertexColors=true;   /* 挖開的泥比較霧、不會閃 */ mat.customProgramCacheKey=()=>'tidePatch';   // 和地面同一套材質：看起來就是同一片泥，洞挖到水位以下自然積水
  const patch=new T.Mesh(geo,mat); patch.position.copy(c0); S.add(patch); holePatches.push(patch); if(holePatches.length>8){ const o=holePatches.shift(); S.remove(o); } holePatches.forEach((p2,i)=>HOLES[i].set(p2.position.x,p2.position.z,PS/2*.985)); for(let i=holePatches.length;i<8;i++) HOLES[i].set(0,0,0); s.m.visible=false; if(s.m.userData.det) s.m.userData.det.visible=false; if(s.ring) s.ring.visible=false;
  let crea=null, size=cr?rand(cr.size[0],cr.size[1]):0, depth=cr?.012+cr.depth*.014:0, off=new T.Vector2(rand(-.03,.03),rand(-.03,.03));   // 就在痕跡正下方，深度 3～6 公分（真實的文蛤、赤嘴蛤大多埋在這個深度）
  if(cr){ try{ const sp=c.species(k); if(creaReady(k)){ const f=creaModel(sp); crea=f; const g=f.group; g.scale.setScalar(size); g.position.set(c0.x+off.x,0,c0.z+off.y);
        g.scale.setScalar(size*1.6);   // 畫面上放大一點，挖到時一眼看得出來
        if(k==='razor'){ g.rotation.set(0,rand(0,6),Math.PI/2); } else if(k==='ragworm'){ g.rotation.set(0,rand(0,6),0); } else { g.rotation.set(0,rand(0,6),0); }   // 竹蟶直立，其他平躺
        S.add(g); } }catch(e){}
    if(!crea){ const sh=new T.Mesh(new T.SphereGeometry(.5,20,12),new T.MeshStandardMaterial({color:0xcdbb9c,roughness:.5})); sh.scale.set(1,.45,.8); const g=new T.Group(); g.add(sh); g.scale.setScalar(size); g.position.set(c0.x+off.x,0,c0.z+off.y); S.add(g);
      crea={group:g,uni:{uSwim:{value:0},uAmp:{value:0}},stub:true}; try{ window.__MDL&&window.__MDL.preload&&window.__MDL.preload('tide'); }catch(e){} } }   // 模型還沒下載好：先埋一個替代的身體，一樣挖得到
  const BED={hardclam:[2,5],gomphina:[2,4],tellin:[3,7],razor:[1,2],ghostcrab:[1,1],ragworm:[1,3]}, bb=k&&BED[k]?BED[k]:[1,1];
  dig={s,k,cr,c:c0,patch,geo,base,D,crea,size,depth,off,phase:'ask',left:k?Math.floor(rand(bb[0],bb[1]+.99))-1:0,got:0,dmg:0,found:false,hit:0,t:0,fled:false,ptr:null,lastSnd:0,removed:0,camT:0,lift:0};
  placeCrea(); placeBucket();
  $('digInfo').innerHTML='<b>'+(CLUE[s.sign]||'')+'</b><br><small>要在這裡挖嗎？</small>';
  $('digBtns').innerHTML='<button id="dgGo" style="background:#ffcf66;color:#3a2600">🪏 開挖</button><button id="dgNo" style="background:#333;color:#fff">不挖，換個地方</button>';
  // 竹蟶的真實抓法：在細長的孔裡撒一撮鹽，竹蟶以為漲潮了會自己往上冒出來，要趁牠冒出來的一兩秒內抓住
  if(k==='razor'&&crea){ $('digBtns').insertAdjacentHTML('afterbegin','<button id="dgSalt" style="background:#f2f2ee;color:#333">🧂 撒鹽</button>'); $('dgSalt').onclick=saltRazor; }
  $('dgGo').onclick=()=>{ dig.phase='dig'; rake.visible=false; dig.handP=new T.Vector3(dig.c.x+Math.cos(yaw)*.08,patchY(dig.c.x,dig.c.z)+.03,dig.c.z-Math.sin(yaw)*.08); $('digInfo').innerHTML='手指在泥面上來回撥，用手把泥撥開<br><small>碰到硬物就放慢，沿著周圍清</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">放棄</button>'; $('dgNo').onclick=()=>endDig(false); };
  $('dgNo').onclick=()=>endDig(false,true); box.style.display='flex'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(id=>{ const e=$(id); if(e) e.style.visibility='hidden'; }); }
const cbox=new T.Box3();
function placeCrea(){ const d=dig; if(!d||!d.crea) return; const g=d.crea.group, x=g.position.x, z=g.position.z; g.position.y=0; g.updateMatrixWorld(true); cbox.setFromObject(g);
  const top=hAt(x,z)-d.depth; g.position.y=top-cbox.max.y; g.updateMatrixWorld(true); cbox.setFromObject(g);   // 用模型真正的外框：最上緣剛好在泥面下 depth
  d.bx={cx:(cbox.min.x+cbox.max.x)/2,cz:(cbox.min.z+cbox.max.z)/2,rx:Math.max(.018,(cbox.max.x-cbox.min.x)/2),rz:Math.max(.018,(cbox.max.z-cbox.min.z)/2),top:cbox.max.y,bot:cbox.min.y}; }
// 生物的上緣在哪裡（用來判斷耙子有沒有碰到、露出多少）
function creaTopAt(x,z){ const d=dig; if(!d||!d.crea||d.fled||!d.bx) return null; const b=d.bx, u=(x-b.cx)/b.rx, v=(z-b.cz)/b.rz, q=u*u+v*v; if(q>1) return null; return b.top-(b.top-b.bot)*.35*q; }   /* 外框內的橢圓：中間最高、邊緣較低（殼的弧度） */
function brush(d,px,pz,R,amt,info){ const P=d.geo.attributes.position, C=d.geo.attributes.color, n=PG+1, u=(px-d.c.x)/PS+.5, v=(pz-d.c.z)/PS+.5, ci=Math.round(u*PG), cj=Math.round(v*PG), rr=Math.ceil(R*1.8/PS*PG)+1;
  for(let j=Math.max(1,cj-rr);j<=Math.min(PG-1,cj+rr);j++) for(let i=Math.max(1,ci-rr);i<=Math.min(PG-1,ci+rr);i++){ const k=j*n+i, x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, r=Math.hypot(x-px,z-pz);
    if(r<R){ const f=.5+.5*Math.cos(Math.PI*r/R), dep=d.D[k], li=layerOf(Math.max(0,dep)); let a=amt*f*LAYER[li].hard; const top=creaTopAt(x,z);
      if(top!==null){ const lim=d.base[k]-top-.002; if(dep+a>lim){ a=Math.max(0,lim-dep); info.touch=true; } }
      if(dep+a>.17) a=Math.max(0,.17-dep); d.D[k]+=a; info.moved+=a; info.layer=Math.max(info.layer,layerOf(d.D[k]));
      const dd=Math.max(0,d.D[k]); C.setXYZ(k,Math.min(1,dd/.006),layerOf(dd)/2,1-Math.min(.6,dd/.11*.6)); }   // 挖開多少、哪一層、越深越暗（洞壁和洞底的陰影）
    else if(r<R*1.8&&amt>0&&d.D[k]>-.008){ d.D[k]-=amt*.05*(.5+.5*Math.cos(Math.PI*(r-R)/(R*.8))); if(d.D[k]<0) C.setXYZ(k,Math.max(C.getX(k),Math.min(.55,-d.D[k]/.008*.55)),Math.max(C.getY(k),.5),Math.min(C.getZ(k),.92)); }   /* 推到洞邊的是翻出來的濕泥：顏色深、霧面，不再是一圈反光的亮邊 */   // 推開的泥只在旁邊微微堆起（大部分被耙子帶出洞外），不會把洞又填回去
    P.setY(k,d.base[k]-d.D[k]-d.c.y); } }
function scrape3(p,spd,dir,dist){ const d=dig; if(!d||d.phase!=='dig') return; const info={moved:0,layer:0,touch:false};
  const px=-dir.z, pz=dir.x;   // 耙頭橫在拖動方向的垂直方向
  const k=Math.min(1,dist/.012);  // 刮多少泥取決於拖動的距離，不是速度：慢慢刮也一樣挖得動
  brush(d,p.x,p.z,.065,.0062*k,info);   // 手掌把一層泥撥開（加快：一般 10～20 次來回就碰到）
  for(let t=0;t<4;t++){ const o=-.03+t*.02; brush(d,p.x+px*o,p.z+pz*o,.012,.009*k,info); }   // 四根手指各劃出一道溝
  d.dirty=true; d.removed+=info.moved; rakeMud=Math.min(1,rakeMud+info.moved*6);
  if(info.moved>.0004) spawnMud(p.clone().setY(patchY(p.x,p.z)+.006),dir,Math.min(5,1+Math.round(info.moved*300)),info.layer>0);
  const now=performance.now(); if(now-d.lastSnd>90&&info.moved>.0002){ d.lastSnd=now; LAYER[info.layer].snd(); vib(LAYER[info.layer].vib); }
  if(info.touch&&d.cr){ d.touchT=0; d.poke=Math.min(1,(d.poke||0)+.35); if(!d.found){ d.found=true; if(d.mud){ vib(25); noise(.07,500,3,.22); } else { vib([30,40,30]); noise(.05,1600,8,.25); } $('digInfo').innerHTML=d.cr.soft?'碰到軟軟的東西了<br><small>輕一點，把周圍的泥撥開</small>':'喀！手指碰到硬硬的東西了<br><small>放慢速度（看下面的力道條），沿著周圍把泥清掉</small>'; }
    const lim=digLim(); if(spd>lim&&now-d.hit>700&&d.dmg<3){ d.hit=now; d.dmg++; vib(60); noise(.08,900,4,.35); $('digInfo').innerHTML=d.cr.soft?'太用力了，'+d.cr.n+'被扯斷了一截！':'喀啦！刮太快把殼刮傷了（'+d.dmg+'）<br><small>力道條要保持在綠色</small>'; } }
  if(!d.found&&d.cr&&!d.fled&&now-(d.hintT||0)>1500){ d.hintT=now; const g=d.crea.group, dc=Math.round((patchY(g.position.x,g.position.z)-(hAt(g.position.x,g.position.z)-d.depth))*100);
    const far=Math.hypot(p.x-g.position.x,p.z-g.position.z)>.12; $('digInfo').innerHTML=far?(d.got?'震動是從洞的另一邊傳來的<br><small>沿著洞的邊緣往外挖</small>':'痕跡在洞的正中間<br><small>往中間挖，'+d.cr.n+'通常就在孔的正下方</small>'):(dc>1?'再往下挖一點…<br><small>還差大約 '+dc+' 公分</small>':'快碰到了，放慢…'); }
  if(d.found&&!d.fled){ const rv=reveal3(); if(rv>.62&&!d.ready){ d.ready=true; exposeCrea(); $('digInfo').innerHTML='<b>'+d.cr.n+'露出來了！</b><br><small>可以取出了，再多清一點周圍也可以</small>'; $('digBtns').innerHTML='<button id="dgTake" style="background:#ffcf66;color:#3a2600">✋ 取出</button><button id="dgNo" style="background:#333;color:#fff">放棄</button>'; $('dgTake').onclick=takeOut; $('dgNo').onclick=()=>endDig(false); }
    else if(!d.ready&&rv>.15&&now-(d.rvT||0)>600){ d.rvT=now; $('digInfo').innerHTML='露出 '+Math.round(rv*100)+'%<br><small>繼續沿著周圍清</small>'; } }
  if(!d.cr&&d.removed>.35&&!d.ready){ d.ready=true; $('digInfo').innerHTML='挖了一陣子，只有泥和碎貝殼<br><small>平坦的泥面多半是空的，看痕跡再挖比較準</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#555;color:#fff">好吧</button>'; $('dgNo').onclick=()=>endDig(false); } }
function exposeCrea(){ const d=dig; if(!d||!d.crea||!d.bx) return; d.popRise=0;   /* 露出後牠會被泥擠得往上浮一點，整個看得到 */ const g={position:new T.Vector3(d.bx.cx,0,d.bx.cz)}, P=d.geo.attributes.position, C=d.geo.attributes.color, n=P.count, R=Math.max(d.bx.rx,d.bx.rz)*1.25+.015, want=d.bx.bot+(d.bx.top-d.bx.bot)*.3;   /* 把泥撥到身體七成都露出來 */
  for(let k=0;k<n;k++){ const x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, r=Math.hypot(x-g.position.x,z-g.position.z); if(r>R*1.6) continue; const f=r<R?1:1-(r-R)/(R*.6), target=d.base[k]-want; if(d.D[k]<target*f+(1-f)*d.D[k]) d.D[k]=Math.min(.17,target*f+(1-f)*d.D[k]); const dd=Math.max(0,d.D[k]); C.setXYZ(k,Math.min(1,dd/.006),layerOf(dd)/2,1-Math.min(.6,dd/.11*.6)); }
  d.dirty=true; spawnMud(g.position.clone(),vS.set(0,0,0),5,true); }   // 取出前把牠周圍的泥撥開：看得到牠躺在洞裡
function smoothHole(d){ const n=PG+1, D=d.D, P=d.geo.attributes.position, C=d.geo.attributes.color, T2=d.tmpD||(d.tmpD=new Float32Array(D.length));
  for(let j=1;j<PG;j++) for(let i=1;i<PG;i++){ const k=j*n+i; if(D[k]<=.002&&D[k-1]<=.002&&D[k+1]<=.002&&D[k-n]<=.002&&D[k+n]<=.002){ T2[k]=D[k]; continue; }
    T2[k]=D[k]*.5+(D[k-1]+D[k+1]+D[k-n]+D[k+n])*.125; }
  for(let j=1;j<PG;j++) for(let i=1;i<PG;i++){ const k=j*n+i; if(T2[k]===D[k]) continue; let v=T2[k]; const x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, top=creaTopAt(x,z); if(top!==null) v=Math.min(v,d.base[k]-top-.002);
    D[k]=v; P.setY(k,d.base[k]-v-d.c.y); const dd=Math.max(0,v); C.setXYZ(k,Math.min(1,dd/.006),layerOf(dd)/2,1-Math.min(.6,dd/.11*.6)); }
  d.geo.attributes.color.needsUpdate=true; }   // 洞壁、洞底柔和平滑（不再是一階一階的鋸齒）
function reveal3(){ const d=dig; if(!d||!d.crea) return 0; const P=d.geo.attributes.position, n=PG+1; let tot=0,vis=0;
  for(let k=0;k<P.count;k++){ const x=P.getX(k)+d.c.x, z=P.getZ(k)+d.c.z, top=creaTopAt(x,z); if(top===null) continue; tot++; if(d.base[k]-d.D[k]<=top+.006) vis++; } return tot?vis/tot:0; }
function takeOut(){ const d=dig; if(!d||!d.crea) return;
  if(d.mud){ noise(.15,220,2,.25); vib(15); $('digInfo').innerHTML='<b>是個空殼，裡面塞滿了泥</b><br><small>殼上有個小圓洞──被玉螺吃掉了。拿起來輕輕的、敲起來悶悶的，就是空殼</small>'; S.remove(d.crea.group); d.crea=null;
    if(d.left>0){ $('digBtns').innerHTML='<button id="dgGo2" style="background:#ffcf66;color:#3a2600">繼續挖這一窩</button><button id="dgNo" style="background:#333;color:#fff">站起來</button>'; $('dgGo2').onclick=()=>nextInBed(); } else $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">站起來</button>';
    $('dgNo').onclick=()=>endDig(true); d.phase='done'; return; }
  d.phase='lift'; d.lift=0; rake.visible=false; d.crea.uni.closed=true; d.crea.group.scale.setScalar(d.size*1.15);   /* 拿起來時殼緊閉、尺寸回到真實大小附近 */ const ok=d.dmg<3, cr=d.cr, v=Math.round(cr.price*(.6+d.size*6)*(ok?1-d.dmg*.2:.3)); d.val=v; d.ok=ok;
  vib([20,30,60]); noise(.2,300,4,.18); if(c.dex) c.dex(d.k,d.size);
  $('digInfo').innerHTML=`<b>${ok?'完整取出':'取出了，但殼傷得很重'}：${cr.n}</b> ${Math.round(d.size*100)} 公分・🪙${v}<br><small>${cr.desc}</small>`; $('digBtns').innerHTML='<button id="dgOk" style="background:#ffcf66;color:#3a2600">放進桶子</button>'; $('digBtns').innerHTML='<button id="dgCook" style="background:#ffcf66;color:#3a2600">🔥 帶回家烤</button><button id="dgTank" style="background:#3b7bb8;color:#fff">🐚 帶回家養</button><button id="dgSell" style="background:#2e8b57;color:#fff">🪙 賣掉 '+v+'</button><button id="dgFree" style="background:#333;color:#fff">放回去</button>';
  const fin=(how)=>{ const d2=dig; if(!d2) return; if(how==='cook'){ if(!d2.ok){ c.toast('殼破了，不能放保冷箱','warn',1500); return; } if(c.toCooler&&!c.toCooler(d2.k,+d2.size.toFixed(3))){ c.toast('保冷箱滿了（最多 5 個），先回家烤掉一些','warn',2000); return; } c.toast('放進保冷箱，回小屋就能烤','good',1500); }
      else if(how==='tank'){ const r=c.keepTank?c.keepTank(d2.k,+d2.size.toFixed(3)):false; if(r!==true){ c.toast(r||'放不進水族箱','warn',2200); return; } c.toast('放進小屋的海水缸了','good',1500); }
      else if(how==='sell'){ if(c.sellNow) c.sellNow(d2.val); c.toast('賣了 🪙'+d2.val,'good',1300); }
      else { c.toast('放回泥裡了','',1000); }
      if(how!=='free'){ bag.push({id:d2.k,v:0,L:+d2.size.toFixed(3),broken:!d2.ok,done:true}); bagText(); }
      d2.fate=how; d2.phase='bucket'; d2.bk=0; $('digBtns').innerHTML=''; };
  $('dgCook').onclick=()=>fin('cook'); $('dgTank').onclick=()=>fin('tank'); $('dgSell').onclick=()=>fin('sell'); $('dgFree').onclick=()=>fin('free'); }
// 同一窩的下一個：埋在洞的周圍、比較淺；繼續擴大同一個洞就會碰到
function saltRazor(){ const d=dig; if(!d||d.k!=='razor'||!d.crea||d.salted) return; d.salted=1; d.phase='salt'; d.saltT=0; d.popT=rand(1.4,3); $('digBtns').innerHTML='';
  $('digInfo').innerHTML='撒了一撮鹽進孔裡…<br><small>盯著孔，竹蟶冒出來就馬上抓</small>'; const p=d.c.clone(); p.y=hAt(p.x,p.z)+.25;
  for(let i=0;i<26;i++){ const w=drops.find(q=>q.a<=0); if(!w) break; w.a=1.2; w.p.copy(p).add(vS.set(rand(-.02,.02),rand(0,.06),rand(-.02,.02))); w.v.set(rand(-.05,.05),-.2,rand(-.05,.05)); w.s=rand(.0015,.003); }   // 白色鹽粒落進孔裡
  noise(.35,5200,1.5,.05); }
function saltTick(dt){ const d=dig; if(!d||d.phase!=='salt'||!d.crea) return; d.saltT+=dt; const g=d.crea.group, base=hAt(d.c.x,d.c.z);
  if(d.saltT>d.popT&&!d.popped){ d.popped=1; d.popUp=0; vib([15,20,15]); noise(.12,600,3,.15); squirt(vS.set(d.c.x,base+.005,d.c.z).clone(),1.2,8);
    $('digInfo').innerHTML='<b>冒出來了！</b><br><small>快抓！</small>'; $('digBtns').innerHTML='<button id="dgGrab" style="background:#ffcf66;color:#3a2600;font-size:17px">✋ 抓住</button>'; $('dgGrab').onclick=()=>{ if(!dig||dig.phase!=='salt') return; dig.phase='dig'; dig.found=true; dig.ready=true; takeOut(); }; }
  if(d.popped){ d.popUp+=dt; const up=d.popUp<.35?d.popUp/.35:d.popUp<1.6?1:Math.max(-1,1-(d.popUp-1.6)*3);   // 往上冒出約半截、停一下、又縮回去
    g.position.set(d.c.x,base-d.size*.5+up*d.size*.68,d.c.z); g.rotation.set(0,g.rotation.y,Math.PI/2); d.crea.uni.uAmp.value=.2; d.crea.uni.uSwim.value+=dt*8;
    if(d.popUp>2.1){ d.phase='dig'; d.salted=1; d.depth+=.05; placeCrea(); $('digInfo').innerHTML='竹蟶縮回去了，而且鑽得更深<br><small>只能用挖的了──發現牠後要挖得又快又準</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">放棄</button>'; $('dgNo').onclick=()=>endDig(false); } } }
function nextInBed(){ const d=dig; d.left--; const cr=d.cr, k=d.k; S.remove(d.crea.group); d.crea=null;
  d.size=rand(cr.size[0],cr.size[1]); d.depth=.01+cr.depth*.012+rand(-.006,.008); const a=rand(0,6.28), r=rand(.08,.2); d.off.set(Math.cos(a)*r,Math.sin(a)*r);
  try{ const f=creaModel(c.species(k)); const g=f.group; g.scale.setScalar(d.size*1.6); g.position.set(d.c.x+d.off.x,0,d.c.z+d.off.y); g.rotation.set(0,rand(0,6),k==='razor'?Math.PI/2:0); S.add(g); d.crea=f; }catch(e){ const sh=new T.Mesh(new T.SphereGeometry(.5,20,12),new T.MeshStandardMaterial({color:0xcdbb9c,roughness:.5})); sh.scale.set(1,.45,.8); const g=new T.Group(); g.add(sh); g.scale.setScalar(d.size); g.position.set(d.c.x+d.off.x,0,d.c.z+d.off.y); S.add(g); d.crea={group:g,uni:{uSwim:{value:0},uAmp:{value:0}},stub:true}; }
  d.base0=null; d.liftFrom=null; d.found=false; d.ready=false; d.dmg=0; d.fled=false; d.esc=0; d.phase='dig'; d.t=0; d.mud=Math.random()<(k==='hardclam'||k==='gomphina'?.15:0); placeCrea(); rake.visible=false;
  $('digInfo').innerHTML='旁邊的泥裡還有動靜…<br><small>同一窩通常不只一個，把洞往周圍挖大</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#333;color:#fff">夠了，站起來</button>'; $('dgNo').onclick=()=>endDig(true); }
function endDig(got,skip){ const d=dig; if(!d) return; if(!skip){ d.s.done=true; } else { d.s.m.visible=true; if(d.s.m.userData.det) d.s.m.userData.det.visible=true; }
  if(!skip||d.removed>.01){ /* 挖過的洞留在泥面上 */ d.patch.userData.left=true; } else { S.remove(d.patch); const i=holePatches.indexOf(d.patch); if(i>=0) holePatches.splice(i,1); holePatches.forEach((p2,j)=>HOLES[j].set(p2.position.x,p2.position.z,PS/2*.985)); for(let j=holePatches.length;j<8;j++) HOLES[j].set(0,0,0); }
  if(d.crea){ S.remove(d.crea.group); }   /* 不再把生物丟在地上 */
  rake.visible=false; seep.visible=false; GU.uSeepY.value=-9; bucket.visible=false; dig=null; box.style.display='none'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(id=>{ const e=$(id); if(e) e.style.visibility=''; }); }
// 竹蟶往下鑽、沙蟹想溜、滲水、取出的動畫、耙子跟著手指
function digTick(dt){ mudTick(dt); dropTick(dt); saltTick(dt); { const want=dig?1.1:0; digLight.intensity+=(want-digLight.intensity)*Math.min(1,dt*4); if(dig){ digLight.position.copy(cam.position).add(vS.set(.15,.1,0).applyQuaternion(cam.quaternion)); } }   /* 蹲下時洞口有柔和補光（黃昏也看得清洞裡） */ if(dig&&dig.ready&&dig.crea&&dig.popRise!==undefined&&dig.popRise<1&&dig.phase==='dig'){ const r0=dig.popRise; dig.popRise=Math.min(1,dig.popRise+dt*1.5); dig.crea.group.position.y+=(dig.popRise-r0)*dig.size*.55; if(Math.random()<dt*10) spawnMud(dig.crea.group.position.clone(),vS.set(0,0,0),1,true); } if(typeof spdEl!=='undefined') spdEl.style.visibility=dig&&dig.phase==='dig'?'visible':'hidden'; if(bucket.visible) inBucket.forEach(f=>{ f.uni.uSwim.value+=dt*2; f.uni.uAmp.value=.03; }); const d=dig; if(!d) return; d.t+=dt; if(d.dirty){ smoothHole(d); d.dirty=false; d.geo.attributes.position.needsUpdate=true; d.geo.attributes.color.needsUpdate=true; d.geo.computeVertexNormals(); } d.camT=Math.min(1,d.camT+dt*1.6);
  if(d.phase==='dig'&&d.cr&&d.crea&&!d.fled&&!d.crea.stub||d.phase==='dig'&&d.cr&&d.crea&&!d.fled){
    if(d.cr.dive&&d.found&&!d.ready){ d.depth+=dt*.012; placeCrea(); if(Math.random()<dt*3) squirt(vS.set(d.c.x,patchY(d.c.x,d.c.z)+.003,d.c.z).clone(),.25,3);   /* 孔裡冒泡：牠正在往下鑽 */ if(d.depth>.17){ d.fled=true; d.crea.group.visible=false; $('digInfo').innerHTML='竹蟶鑽到深處去了…<br><small>發現竹蟶後要挖得又快又準</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#555;color:#fff">好吧</button>'; $('dgNo').onclick=()=>endDig(false); } }
    if(d.cr.flee&&!d.found&&d.t>14){ d.fled=true; const g=d.crea.group; g.position.y=patchY(g.position.x,g.position.z)+.01; d.esc=1; $('digInfo').innerHTML='沙蟹從旁邊鑽出來溜走了！<br><small>洞口有沙堆的要挖快一點</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#555;color:#fff">可惜</button>'; $('dgNo').onclick=()=>endDig(false); } }
  // 生物在泥裡的反應（真實行為）
  if(d.crea&&!d.fled&&d.phase!=='lift'&&d.phase!=='bucket'){ const g=d.crea.group, u=d.crea.uni, k=d.k; d.touchT=(d.touchT||99)+dt; d.poke=Math.max(0,(d.poke||0)-dt*1.5);
    const shell=k==='hardclam'||k==='gomphina'||k==='tellin', crab=k==='ghostcrab', rv=d.found?reveal3():0;
    if(!d.base0) d.base0={x:g.position.x,z:g.position.z,ry:g.rotation.y,rz:g.rotation.z};
    // 被耙子碰到：整個抖一下
    g.position.x=d.base0.x+Math.sin(d.t*60)*.004*d.poke; g.rotation.z=d.base0.rz+Math.sin(d.t*45)*.08*d.poke;
    if(shell){ u.uAmp.value=d.found?0:.02; u.uSwim.value+=dt*(d.found?0:1.5);   // 沒被發現時殼微開；一碰到就緊緊閉上
      d.sqT=(d.sqT||rand(1,3))-dt; if(d.found&&d.sqT<=0&&k!=='tellin'){ d.sqT=rand(2.5,5); const p=g.position.clone(); p.y=patchY(p.x,p.z)+.004; squirt(p,1.6,10); noise(.12,3000,2,.06); } }   // 受驚從水管噴出一道水
    if(crab){ const act=d.found?Math.min(1,.3+rv):.05; u.uAmp.value=.08+.25*act; u.uSwim.value+=dt*(3+12*act);   // 露出來越多掙扎越兇，螯舉起來
      g.rotation.y=d.base0.ry+Math.sin(d.t*3)*.15*act; }
    if(k==='ragworm'){ u.uAmp.value=.18+.25*d.poke; u.uSwim.value+=dt*(6+10*d.poke); }   // 一直扭動，碰到扭得更兇
    if(k==='razor'&&d.found){ g.position.y-=Math.max(0,Math.sin(d.t*7))*.0006; u.uAmp.value=.04; } }   // 竹蟶一抽一抽往下拉
  if(d.esc&&d.crea){ const g=d.crea.group; g.position.x+=dt*.35; g.position.y=hAt(g.position.x,g.position.z)+.01; d.crea.uni.uAmp.value=.25; d.crea.uni.uSwim.value+=dt*20; }
  // 洞深了，地下水慢慢滲進來
  let maxD=0; for(let i=0;i<d.D.length;i+=7) maxD=Math.max(maxD,d.D[i]); if(!seepOff&&maxD>.045&&d.phase!=='lift'&&d.phase!=='bucket'){ seep.visible=true; if(!seep.material.envMap) seep.material.envMap=gmat.envMap; seep.position.set(d.c.x,0,d.c.z); let target=hAt(d.c.x,d.c.z)-maxD+Math.min(maxD*.35,(d.t-(d.seepT||(d.seepT=d.t)))*.0025); if(d.crea&&!d.fled){ const ct=hAt(d.crea.group.position.x,d.crea.group.position.z)-d.depth; target=Math.min(target,ct-.015); }   /* 水不會淹過生物 */ target=Math.min(target,hAt(d.c.x,d.c.z)-.035); if(!d.seepInit){ d.seepInit=1; seep.position.y=hAt(d.c.x,d.c.z)-maxD; }   /* 水面永遠在泥面下 3.5 公分以下，只看得到洞裡那一小窪 */   /* 混濁的地下水慢慢從洞底滲上來 */ seep.position.y+=((target)-seep.position.y)*Math.min(1,dt*2); seep.visible=false; GU.uSeepY.value=seep.position.y; }
  if(d.phase==='lift'&&d.crea){ const g0=d.crea.group; if(Math.random()<dt*14) spawnMud(g0.position.clone(),vS.set(0,0,0),1,true); if(Math.random()<dt*20) drip(g0.position,1); if(d.k==='ghostcrab'||d.k==='ragworm'){ d.crea.uni.uAmp.value=.3; d.crea.uni.uSwim.value+=dt*14; } }
  if(d.phase==='bucket'&&d.crea){ d.bk=Math.min(1,(d.bk||0)+dt*1.8); const g=d.crea.group, tgt=d.fate==='free'?vS.set(d.c.x,hAt(d.c.x,d.c.z)-.03,d.c.z).clone():bucket.position.clone().add(vS.set(0,.08+.25*Math.sin(d.bk*Math.PI),0)); g.position.lerp(tgt,Math.min(1,dt*(3+d.bk*6))); g.rotation.x+=dt*3; if(d.bk>=1){ noise(.1,700,3,.2); noise(.08,2200,2,.06); vib(20); if(d.fate!=='free'&&d.fate!=='sell') bucketAdd(d.k,d.size); d.got++; if(d.left>0){ nextInBed(); } else { $('digInfo').innerHTML='這一窩挖完了，共 '+d.got+' 個<br><small>換個痕跡再找</small>'; $('digBtns').innerHTML='<button id="dgNo" style="background:#ffcf66;color:#3a2600">站起來</button>'; $('dgNo').onclick=()=>endDig(true); d.phase='done'; } return; } }   /* 拋物線飛進桶子，噗通落進桶裡的水 */
  if(d.phase==='lift'&&d.crea){ d.lift=Math.min(1,d.lift+dt*1.8); const g=d.crea.group, e=d.lift*d.lift*(3-2*d.lift); { const hold=cam.position.clone().add(new T.Vector3(.03,-.015,-.26).applyQuaternion(cam.quaternion)); if(!d.liftFrom) d.liftFrom=g.position.clone(); const from=vS.copy(d.liftFrom); g.position.copy(from.lerp(hold,e)); }   /* 拿到眼前看 */ g.rotation.y+=dt*1.2; g.rotation.x+=(-.6-g.rotation.x)*dt*2; { const shell=d.k==='hardclam'||d.k==='gomphina'||d.k==='tellin'||d.k==='razor'; d.crea.uni.uAmp.value=shell?0:.15; d.crea.uni.uSwim.value+=shell?0:dt*6; } }   /* 貝類被拿起來會把殼緊緊閉上 */ }
// 蹲下來的鏡頭
function digCam(){ const d=dig, e=d.camT*d.camT*(3-2*d.camT), fx=-Math.sin(yaw), fz=-Math.cos(yaw), cy=hAt(d.c.x,d.c.z);
  const kp=vS.set(d.c.x-fx*.5,cy+.42,d.c.z-fz*.5); cam.position.lerpVectors(pos,kp,e); const look=new T.Vector3(d.c.x+fx*.04,cy-.03,d.c.z+fz*.04); cam.fov=58-12*e; cam.updateProjectionMatrix();   // 跪姿斜看進洞裡，看得到洞壁的深度
  const m=new T.Matrix4().lookAt(cam.position,look,new T.Vector3(0,1,0)); const q=new T.Quaternion().setFromRotationMatrix(m); const q0=new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,0,'YXZ')); cam.quaternion.slerpQuaternions(q0,q,e); }
// 挖掘時的手指操作：射線打到泥面，耙子跟過去並刮泥
const digRay=new T.Raycaster(), dv2=new T.Vector2();
function digPoint(e){ dv2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); digRay.setFromCamera(dv2,cam); const h=digRay.intersectObject(dig.patch); return h.length?h[0].point:null; }
window.addEventListener('pointerdown',e=>{ if(!dig||dig.phase!=='dig') return; if(e.target&&e.target.closest&&e.target.closest('button')) return; const p=digPoint(e); dig.ptr=p?{p,t:performance.now()}:{p:null,t:performance.now()}; });
let spdS=0;
const spdEl=document.createElement('div'); spdEl.id='digSpd'; spdEl.innerHTML='<span>力道</span><i><b></b></i>'; box.insertBefore(spdEl,box.firstChild);
function digLim(){ const d=dig; return d&&d.cr?(d.cr.fragile?.8:d.cr.soft?.95:1.25):1.25; }   /* 公尺／秒：一般手指慢慢撥約 0.3～0.8 */
function spdShow(v){ const b=spdEl.querySelector('b'), lim=digLim(), f=Math.min(1,v/(lim*1.4)); b.style.width=(f*100)+'%'; b.style.background=v<lim*.7?'#5fd38a':v<lim?'#f4c542':'#ff5b4a'; }
window.addEventListener('pointermove',e=>{ if(!dig||dig.phase!=='dig') return; const p=digPoint(e); if(!p) return;
  rake.visible=false; dig.handP=p.clone().setY(patchY(p.x,p.z)+.025); scoop=Math.min(1,scoop+.25);
  { const ld=dig.lastDir; if(dig.ptr&&dig.ptr.p){ const nd=vS.subVectors(p,dig.ptr.p); if(nd.lengthSq()>1e-6){ nd.normalize(); if(ld&&ld.dot(nd)<-.3&&flick<.2&&dig.removed>.002){   // 換方向：把手裡那把泥甩到洞外
          flick=1; scoop=0; const out=vS.set(Math.cos(yaw),.0,-Math.sin(yaw)).clone(); spawnMud(p.clone().setY(patchY(p.x,p.z)+.02),out,6,true); noise(.09,380,2,.12); vib(8); }
        dig.lastDir=(dig.lastDir||new T.Vector3()).copy(nd); } } }
  if(!dig.ptr||!dig.ptr.p){ if(dig.ptr) dig.ptr.p=p; return; }
  const now=performance.now(), dt=Math.max(8,now-dig.ptr.t)/1000, dist=p.distanceTo(dig.ptr.p), raw=Math.min(3,dist/dt); spdS+=(raw-spdS)*.18; spdShow(spdS);   // 真實速度（公尺／秒），平滑過
  if(dist<.002) return; const dir=vS.subVectors(p,dig.ptr.p).normalize().clone(); const steps=Math.max(1,Math.ceil(dist/.008));
  for(let i=1;i<=steps;i++){ const q=dig.ptr.p.clone().lerp(p,i/steps); scrape3(q,spdS,dir,dist/steps); }
  // 耙子跟著手指：耙頭貼著泥面、齒插進泥裡，柄朝你，順著拖的方向；拖越快越往前傾
  rake.position.copy(p).setY(patchY(p.x,p.z)+.012); rake.rotation.y=yaw+Math.max(-.35,Math.min(.35,(p.x-dig.c.x)*-1.2));   /* 柄永遠朝著你（你握著），左右挖時柄跟著轉一點 */ rakeHead.rotation.x=-Math.min(.35,spdS*.6); rakeHead.children.forEach((m,i)=>{ if(i>0) m.material.color.setRGB(.43-.2*rakeMud,.42-.22*rakeMud,.41-.24*rakeMud); });   /* 鐵齒越挖越沾泥 */
  dig.ptr={p,t:now}; });
window.addEventListener('pointerup',()=>{ if(dig) { if(dig.ptr&&dig.ptr.p&&dig.phase==='dig'&&scoop>.3){ const p=dig.ptr.p.clone(); p.y=patchY(p.x,p.z)+.01; spawnMud(p,vS.set(Math.cos(yaw)*.8,0,-Math.sin(yaw)*.8).clone(),7,true); flick=1; noise(.1,350,2,.12); }   /* 放手的瞬間：手往上一撈，把一把泥甩到洞外 */
    scoop=0; dig.ptr=null; rakeHead.rotation.x=0; spdS=0; spdShow(0); const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw); const x=dig.c.x+rx*.2-fx*.12, z=dig.c.z+rz*.2-fz*.12; rake.position.set(x,patchY(x,z)+.012,z); } });   /* 放開手：耙子放到洞的右前方，不擋住洞裡的東西 */

/* ---------- 拖籠（嘉義布袋好美里的挖法）：把籠子插進泥沙裡，倒退著拖，到有水的地方搖晃淘洗，泥沙洗掉就剩下蛤 ----------
   ・按「🧺 拖籠」拿出籠子，籠子在你前面插進泥裡；手指往下拖＝倒退走，籠子跟著被拉動，後面留下一道刮痕
   ・拖過有蛤的地方（痕跡附近）會「喀啦」一聲、手機震一下，表示有東西進籠子了
   ・籠子滿了（或你想洗了）走到低窪有水的地方，左右快速滑動搖晃，泥沙被水沖掉，籠裡的收穫露出來，倒進桶子 */
const cage={on:false,fill:0,items:[],dist:0,g:new T.Group(),wash:0,shake:0,trail:[]};
{ const iron=new T.MeshStandardMaterial({color:0x5d5b57,metalness:.8,roughness:.4}), wood=new T.MeshStandardMaterial({color:0x8d6e47,roughness:.7});
  const net=new T.MeshStandardMaterial({color:0x4a4a46,metalness:.5,roughness:.5,wireframe:true});
  const W2=.42,H2=.2,D2=.32, fr=[[-W2/2,0,0,W2/2,0,0],[-W2/2,H2,0,W2/2,H2,0],[-W2/2,0,0,-W2/2,H2,0],[W2/2,0,0,W2/2,H2,0],[-W2/2,H2,0,-W2/2,H2*.7,D2],[W2/2,H2,0,W2/2,H2*.7,D2],[-W2/2,0,0,-W2/2,0,D2],[W2/2,0,0,W2/2,0,D2],[-W2/2,0,D2,W2/2,0,D2],[-W2/2,H2*.7,D2,W2/2,H2*.7,D2]];
  fr.forEach(([a,b,c2,d,e,f])=>{ const v1=new T.Vector3(a,b,c2), v2=new T.Vector3(d,e,f), L=v1.distanceTo(v2), m=new T.Mesh(new T.CylinderGeometry(.006,.006,L,6),iron); m.position.copy(v1).add(v2).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v2.clone().sub(v1).normalize()); cage.g.add(m); });
  for(let i=0;i<12;i++){ const t=new T.Mesh(new T.CylinderGeometry(.003,.002,.07,5),iron); t.position.set(-W2/2+.02+i*(W2-.04)/11,-.03,-.01); t.rotation.x=-.5; cage.g.add(t); }   // 前緣一排插進泥裡的鐵齒
  // 籠底與籠背：一根根實心鋼條（間距約 1.5 公分，泥沙漏得出去、蛤留在裡面），不是線框
  const rodG=new T.CylinderGeometry(.0028,.0028,1,6), NR=60, rods=new T.InstancedMesh(rodG,iron,NR); let ri=0; const M4=new T.Matrix4(), Q=new T.Quaternion(), Vp=new T.Vector3(), Vs=new T.Vector3(), upV=new T.Vector3(0,1,0);
  const rod=(a,b)=>{ const L=a.distanceTo(b); Q.setFromUnitVectors(upV,Vp.subVectors(b,a).normalize()); M4.compose(Vp.addVectors(a,b).multiplyScalar(.5),Q,Vs.set(1,L,1)); rods.setMatrixAt(ri++,M4); };
  for(let i=0;i<27;i++){ const x=-W2/2+.015+i*(W2-.03)/26; rod(new T.Vector3(x,.004,0),new T.Vector3(x,.004,D2)); }   // 底部縱向鋼條
  for(let i=0;i<4;i++){ const z=.03+i*(D2-.06)/3; rod(new T.Vector3(-W2/2,.008,z),new T.Vector3(W2/2,.008,z)); }       // 底部橫向補強
  for(let i=0;i<22;i++){ const x=-W2/2+.02+i*(W2-.04)/21; rod(new T.Vector3(x,.004,D2),new T.Vector3(x,H2*.7,D2)); }  // 籠背直條
  rods.count=ri; cage.g.add(rods);
  const pole=new T.Mesh(new T.CylinderGeometry(.014,.016,1.5,8),wood); pole.position.set(0,.5,D2+.86); pole.rotation.x=1.1; pole.scale.y=1.3; cage.g.add(pole);   // 長竿伸到你手上
  cage.inside=new T.Group(); cage.g.add(cage.inside); cage.sand=new T.Mesh(new T.SphereGeometry(.5,24,10,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0x2c241c,roughness:.3})); cage.sand.scale.set(W2-.03,.004,D2-.04); cage.sand.position.set(0,.004,D2/2); cage.g.add(cage.sand);   /* 籠裡越積越高的一坨濕泥 */ }
cage.g.visible=false; S.add(cage.g);
// 籠子拖過的刮痕：一條翻開的濕泥帶，上面有一道道鐵齒刮出的細溝，會慢慢積水反光、很久之後被抹平
const trailTex=(()=>{ const c2=document.createElement('canvas'); c2.width=64; c2.height=32; const g=c2.getContext('2d'); g.fillStyle='rgba(28,22,16,.62)'; g.fillRect(0,0,64,32);
  for(let i=0;i<12;i++){ const x=3+i*5.2; g.fillStyle='rgba(10,8,6,.55)'; g.fillRect(x,0,1.6,32); g.fillStyle='rgba(90,80,68,.14)'; g.fillRect(x+1.8,0,1,32); }   // 十二道齒溝＋溝邊翻起的亮泥
  const gr=g.createLinearGradient(0,0,64,0); gr.addColorStop(0,'rgba(0,0,0,1)'); gr.addColorStop(.06,'rgba(0,0,0,0)'); gr.addColorStop(.94,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,1)'); g.globalCompositeOperation='destination-out'; g.fillStyle=gr; g.fillRect(0,0,64,32);
  return new T.CanvasTexture(c2); })();
const trailG=new T.PlaneGeometry(.44,.24).rotateX(-Math.PI/2), trails=[]; let trailAcc=0;
function trailStamp(x,z){ const m=new T.Mesh(trailG,new T.MeshStandardMaterial({map:trailTex,transparent:true,depthWrite:false,roughness:.3,metalness:.1,opacity:.95,polygonOffset:true,polygonOffsetFactor:-2}));
  m.position.set(x,hAt(x,z)+.004,z); m.rotation.y=yaw; S.add(m); trails.push({m,t:0}); if(trails.length>120){ const o=trails.shift(); S.remove(o.m); } }
function trailTick(dt){ trails.forEach(o=>{ o.t+=dt; o.m.material.roughness=Math.max(.06,.3-o.t*.006); o.m.material.opacity=Math.max(0,.95-Math.max(0,o.t-120)/60); }); }
const cageEl=document.createElement('div'); cageEl.id='tdCage'; cageEl.innerHTML='<div id="cgInfo"></div><i><b></b></i><div id="cgBtns"></div>'; document.body.appendChild(cageEl);
function cageUI(){ const b=cageEl.querySelector('b'); b.style.width=Math.round(cage.fill*100)+'%'; const inW=hAt(pos.x,pos.z)<-.075;
  $('cgInfo').innerHTML=cage.wash>0?'左右快速滑動搖晃籠子，讓水把泥沙沖掉（'+Math.round(cage.wash*100)+'%）':cage.fill>=1?'籠子滿了！<br><small>'+(inW?'在水裡左右快速滑動搖晃淘洗':'走到有水的低窪處淘洗')+'</small>':'手指往下拖＝倒退著把籠子拉過泥沙<br><small>經過痕跡附近比較容易拖到東西</small>';
  $('cgBtns').innerHTML=(cage.wash>0||cage.fill<.15?'':'<button id="cgWash" style="background:#ffcf66;color:#3a2600">'+(inW?'🌊 在這裡淘洗':'淘洗（要有水）')+'</button>')+'<button id="cgOff" style="background:#333;color:#fff">收起籠子</button>';
  const w=$('cgWash'); if(w) w.onclick=()=>{ if(hAt(pos.x,pos.z)>=-.075){ c.toast('這裡沒有水，走到潮溝或低窪積水的地方','',1600); return; } cage.wash=.001; walkReq=0; cageUI(); };
  $('cgOff').onclick=()=>cageOff(); }
function cageOn(){ if(dig) return; cage.on=true; cage.g.visible=true; cageEl.style.display='flex'; ['tdHint','tdStomp'].forEach(id=>{ const e=$(id); if(e) e.style.visibility='hidden'; }); cageUI(); }
function cageOff(){ cage.on=false; pitch=-.32; cage.g.visible=false; cageEl.style.display='none'; ['tdHint','tdStomp'].forEach(id=>{ const e=$(id); if(e) e.style.visibility=''; }); }
function cageTick(dt){ if(!cage.on) return; pitch+=(-.5-pitch)*Math.min(1,dt*3); const fx=-Math.sin(yaw), fz=-Math.cos(yaw), x=pos.x+fx*1.9, z=pos.z+fz*1.9;   /* 低頭看著前面的籠子 */
  cage.g.position.set(x,hAt(x,z)-.028,z);   // 籠底和鐵齒陷在泥裡 cage.g.rotation.set(0,yaw,Math.sin(cage.shake*1.3)*.12*Math.min(1,cage.wash*4));   /* 籠口朝前、竿子朝你 */
  if(cage.wash===0&&walkV<-.05&&cage.fill<1){ const dd=-walkV*dt; cage.dist+=dd; trailAcc+=dd; if(trailAcc>.2){ trailAcc=0; trailStamp(x-fx*.05,z-fz*.05); } cage.fill=Math.min(1,cage.fill+dd*.06);   // 倒退拖：約 17 公尺裝滿
    if(Math.random()<dt*6){ spawnMud(cage.g.position.clone().add(vS.set(fx*.05,.02,fz*.05)),vS.set(-fx,0,-fz).clone(),2,true); noise(.05,700+Math.random()*400,2,.05); }
    let near=null,nd=2.5; signs.forEach(s=>{ if(s.done||!s.k||!CR[s.k]||s.k==='ghostcrab'||s.k==='ragworm') return;   /* 拖籠拖得到文蛤、赤嘴蛤、海瓜子、竹蟶 */ const d=Math.hypot(s.m.position.x-x,s.m.position.z-z); if(d<nd){ nd=d; near=s; } });
    const p=near?dt*3:dt*.7;   // 拖籠比較費工，收穫要多：痕跡附近幾乎一直有、空地平均一秒多也有一個
    if(Math.random()<p){ const k=near?near.k:['hardclam','hardclam','gomphina','tellin','tellin','razor'][Math.floor(Math.random()*6)]; const cr=CR[k]; cage.items.push({k,size:rand(cr.size[0],cr.size[1])}); if(near&&Math.random()<.45) { near.done=true; near.m.visible=false; if(near.m.userData.det) near.m.userData.det.visible=false; if(near.ring) near.ring.visible=false; }
      vib([15,25,15]); noise(.04,1900,7,.2); c.toast('喀啦！有東西進籠子了','',900); }
    cage.sand.scale.y=.004+cage.fill*.12; if(cage.fill>=1){ walkReq=0; } if(Math.random()<dt*2) cageUI(); }
  if(cage.wash>0){ cage.sand.scale.y=Math.max(.002,(1-cage.wash)*(.004+cage.fill*.12)); if(Math.random()<dt*10) squirt(cage.g.position.clone().add(vS.set(rand(-.15,.15),.05,rand(-.1,.1))),.6,3); } }
// 淘洗：左右快速滑動
let lastSX=null, lastDir=0;
window.addEventListener('pointermove',e=>{ if(!cage.on||!(cage.wash>0)||cage.wash>=1) return; if(lastSX===null){ lastSX=e.clientX; return; } const dx=e.clientX-lastSX; if(Math.abs(dx)>25){ const d=Math.sign(dx); if(d!==lastDir){ lastDir=d; cage.wash=Math.min(1,cage.wash+.09); cage.shake+=1.4; noise(.15,500,1.5,.12); vib(12); cageUI();
      if(cage.wash>=1) cageReveal(); } lastSX=e.clientX; } });
window.addEventListener('pointerup',()=>{ lastSX=null; });
function cageReveal(){ cage.inside.clear(); cage.sand.visible=false; const shown=cage.items.slice(0,14);
  shown.forEach((it,i)=>{ try{ const f=creaModel(c.species(it.k)); f.group.scale.setScalar(it.size); f.group.position.set(rand(-.17,.17),.012,rand(.04,.28)); f.group.rotation.set(0,rand(0,6),0); cage.inside.add(f.group); }catch(e){} });
  const names={}; cage.items.forEach(it=>{ names[CR[it.k].n]=(names[CR[it.k].n]||0)+1; });
  $('cgInfo').innerHTML=cage.items.length?'<b>泥沙洗掉了！</b><br>'+Object.entries(names).map(([n,c2])=>n+' ×'+c2).join('、'):'<b>洗乾淨了…只有碎貝殼</b><br><small>下次拖過痕跡附近</small>';
  const tot=cage.items.reduce((a,it)=>a+Math.round(CR[it.k].price*(.6+it.size*6)),0);
  $('cgBtns').innerHTML='<button id="cgPour" style="background:#ffcf66;color:#3a2600">'+(cage.items.length?'🪣 倒進桶子':'倒掉')+'</button>'+(cage.items.length?'<button id="cgSell" style="background:#2e8b57;color:#fff">🪙 全部賣掉 '+tot+'</button>':'');
  const sl=$('cgSell'); if(sl) sl.onclick=()=>{ if(c.sellNow) c.sellNow(tot); cage.items.forEach(it=>{ if(c.dex) c.dex(it.k,it.size); bag.push({id:it.k,v:0,L:+it.size.toFixed(3),done:true}); }); bagText(); c.toast('賣了 🪙'+tot,'good',1500);
    cage.items=[]; cage.fill=0; cage.dist=0; cage.wash=0; cage.inside.clear(); cage.sand.visible=true; cage.sand.scale.y=.004; cageUI(); };   // 桶子裡的回岸時再決定烤、養或賣
  $('cgPour').onclick=()=>{ cage.items.forEach(it=>{ const cr=CR[it.k], v=Math.round(cr.price*(.6+it.size*6)); bag.push({id:it.k,v,L:+it.size.toFixed(3),broken:false}); bucketAdd(it.k,it.size); }); if(cage.items.length){ bagText(); vib([20,30,60]); noise(.25,600,2,.2); c.toast('倒進桶子了：'+cage.items.length+' 個','good',1600); }
    cage.items=[]; cage.fill=0; cage.dist=0; cage.wash=0; cage.inside.clear(); cage.sand.visible=true; cage.sand.scale.y=.004; cageUI(); }; }

/* ---------- 握著工具的手：沿用遊戲裡第一人稱的手臂模型（戴手套），右手握住手耙的柄／拖籠的竹竿 ---------- */
// 兩隻手：右手、左手各一份（同一個手臂模型，各自只留那一側）；挖洞時哪一邊近就用哪隻手，不會一隻手橫過整個畫面
function mkHand(side){ return {side,ready:false,grp:new T.Group(),fing:[],pl:null,ld:null,L0:1}; }
const hand=mkHand('R'), handL=mkHand('L');
if(T.GLTFLoader) new T.GLTFLoader().load('models/arms.glb',g=>{ for(const h of [hand,handL]){ const sd=h.side, os=sd==='R'?'L':'R';
  const o=T.SkeletonUtils?T.SkeletonUtils.clone(g.scene):g.scene.clone(true); let wrist=null,root=null,palm=null,other=null;
  o.traverse(b=>{ if(!b.isBone) return; const n=b.name; if(n.indexOf(sd+'_wrist')===0) wrist=b; if(n.indexOf(sd+'_arm')===0) root=b; if(n.indexOf(sd+'_palm')===0) palm=b; if(n.indexOf(os+'_arm')===0) other=b;
    const m=n.match(new RegExp('^'+sd+'_(point|middle|ring|pink)([123])')); if(m) h.fing.push({b,k:[.7,1,.8][+m[2]-1],x0:b.rotation.x}); const th=n.match(new RegExp('^'+sd+'_thumb([123])')); if(th) h.fing.push({b,k:[.45,.6,.5][+th[1]-1],x0:b.rotation.x}); });
  if(!wrist||!root) continue; if(other) other.scale.setScalar(1e-4);
  o.traverse(m=>{ m.frustumCulled=false; if(m.isMesh){ (Array.isArray(m.material)?m.material:[m.material]).forEach(mm=>{ mm.envMapIntensity=.3; mm.roughness=.95; mm.metalness=0; }); } });
  h.grp.add(o); h.grp.updateMatrixWorld(true); const wl=new T.Vector3().setFromMatrixPosition(wrist.matrixWorld), rl=new T.Vector3().setFromMatrixPosition(root.matrixWorld);
  h.pl=palm?new T.Vector3().setFromMatrixPosition(palm.matrixWorld):wl.clone(); h.ld=new T.Vector3().subVectors(wl,rl); h.L0=h.ld.length(); h.ld.normalize(); h.ready=true; } });
hand.grp.visible=false; handL.grp.visible=false; S.add(hand.grp); S.add(handL.grp);
const hq=new T.Quaternion(), hq2=new T.Quaternion(), hsh=new T.Vector3(), hwd=new T.Vector3(), hup=new T.Vector3(), hupW=new T.Vector3(), htmp=new T.Vector3(), hcq=new T.Quaternion();
// tg：手要到的點（世界座標）；sx,sy,sz：肩膀相對鏡頭的位置
function handTo(tg,grip,sx,sy,sz,cap,H){ H=H||hand; sx=sx??.2; sy=sy??-.62; sz=sz??.18; cap=cap??.7; if(!H.ready){ H.grp.visible=false; return; } H.grp.visible=true; cam.updateMatrixWorld(); cam.getWorldQuaternion(hcq);
  cam.localToWorld(hsh.set(sx,sy,sz)); hwd.subVectors(tg,hsh).normalize(); hq.setFromUnitVectors(H.ld,hwd);
  hup.set(0,1,0).applyQuaternion(hq); hupW.set(0,1,0).applyQuaternion(hcq); hup.addScaledVector(hwd,-hup.dot(hwd)).normalize(); hupW.addScaledVector(hwd,-hupW.dot(hwd)).normalize();
  const roll=Math.atan2(htmp.crossVectors(hup,hupW).dot(hwd),hup.dot(hupW))+(H.side==='R'?-.35:.35); hq2.setFromAxisAngle(hwd,roll); hq.premultiply(hq2);
  const s=Math.min(cap,hsh.distanceTo(tg)*1.02)/H.L0; H.grp.scale.setScalar(s); H.grp.quaternion.copy(hq);
  hup.set(0,1,0).applyQuaternion(hq); H.grp.position.copy(tg).sub(htmp.copy(H.pl).multiplyScalar(s).applyQuaternion(hq)).addScaledVector(hup,.016);
  H.fing.forEach(f=>{ f.b.rotation.x=f.x0-grip*f.k; }); }

const gripW=new T.Vector3();
const handCur=new T.Vector3(), handGoal=new T.Vector3(); let scoop=0, flick=0;
function handTick(){ if(dig&&(dig.phase==='dig'||dig.phase==='ask'&&false)&&dig.c){ const d=dig, fx=-Math.sin(yaw), fz=-Math.cos(yaw), rx=Math.cos(yaw), rz=-Math.sin(yaw);
    if(d.ptr&&d.handP&&!d.ready){ handGoal.copy(d.handP); handGoal.y-=.016*Math.min(1,scoop); handGoal.y+=.05*flick*flick; }   // 拖的時候手指插進泥裡往後扒；換方向時手往上一抬（把泥撈出來）
    else { const x=d.c.x+rx*.24-fx*.14, z=d.c.z+rz*.24-fz*.14; handGoal.set(x,patchY(x,z)+.06+.04*flick,z); }   // 沒在撥：手退到右邊，不擋住洞   // 沒在撥：手停在洞的右前方邊緣
    if(!handCur.lengthSq()) handCur.copy(handGoal); handCur.lerp(handGoal,.35); flick=Math.max(0,flick-.045);
    { const side=((handCur.x-d.c.x)*rx+(handCur.z-d.c.z)*rz)<-.03?'L':'R'; if(d.useL===undefined) d.useL=false; if(side==='L'&&!d.useL) d.useL=true; else if(side==='R'&&d.useL&&((handCur.x-d.c.x)*rx+(handCur.z-d.c.z)*rz)>.03) d.useL=false;   // 洞的左邊用左手、右邊用右手（有一點緩衝，不會一直換）
      const act=d.useL?handL:hand, rest=d.useL?hand:handL, rsx=d.useL?.24:-.24, rx2=d.c.x+rx*rsx-fx*.16, rz2=d.c.z+rz*rsx-fz*.16;
      handTo(handCur,d.ptr?.55+.35*Math.min(1,spdS):.25,d.useL?-.3:.3,-.26,.06,.36,act);
      vS.set(rx2,patchY(rx2,rz2)+.07,rz2); handTo(vS.clone(),.3,d.useL?.3:-.3,-.26,.06,.36,rest); }   // 另一隻手撐在洞的另一邊
    return; }   /* 肩膀在畫面右下外側：只有手和前臂從右邊伸進來 */   /* 徒手挖：手指半彎像在撥泥，撥得越快握得越緊 */
  else if(false){ rake.updateMatrixWorld(true); const hm=rake.children.find(m=>m.geometry&&m.geometry.parameters&&m.geometry.parameters.height===.3); if(hm){ gripW.set(0,.13,0); hm.localToWorld(gripW); handTo(gripW,.95,.34,-.36,.42,.4); }   /* 跪著挖時鏡頭很近：手從右下角伸進來、比例縮小，不擋住洞 */ else hand.grp.visible=false; }   // 握住手耙木柄的尾端
  else if(cage.on){ handL.grp.visible=false; cage.g.updateMatrixWorld(); const pole=cage.g.children.find(m=>m.geometry&&m.geometry.parameters&&m.geometry.parameters.height===1.5); if(pole){ gripW.set(0,-.2,0); pole.localToWorld(gripW); handTo(gripW,.9); } else hand.grp.visible=false; }
  else { hand.grp.visible=false; handL.grp.visible=false; } }

let hold=null;
function holdCatch(id,L,r){ const sp=c.species(id); let f=null; try{ if(creaReady(id)) f=creaModel(sp); }catch(e){} if(!f) return;
  f.group.scale.setScalar(L); S.add(f.group); const v=SURF[id].price+Math.round(L*400); hold={f,id,L,v,t:0}; if(c.dex) c.dex(id,L); vib([20,30,60]);
  $('digInfo').innerHTML='<b>抓到'+SURF[id].n+'了！</b> '+Math.round(L*100)+' 公分<br><small>'+({fiddler:'雄蟹那隻大螯是用來求偶和打架的',mudskip:'牠用胸鰭在泥上爬、會跳，離開水也能呼吸',hermit:'牠背的殼是撿來的空螺殼，長大了會換'}[id]||'')+'</small>';
  $('digBtns').innerHTML='<button id="hdTank" style="background:#3b7bb8;color:#fff">🐚 帶回家養</button><button id="hdSell" style="background:#2e8b57;color:#fff">🪙 賣掉 '+v+'</button><button id="hdFree" style="background:#333;color:#fff">放牠走</button>';
  box.style.display='flex'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(i=>{ const e=$(i); if(e) e.style.visibility='hidden'; });
  const fin=how=>{ if(!hold) return; if(how==='tank'){ const rr=c.keepTank?c.keepTank(id,+L.toFixed(3)):false; if(rr!==true){ c.toast(rr||'放不進水族箱','warn',2200); return; } c.toast('放進小屋的海水缸了','good',1500); bag.push({id,v:0,L,done:true}); }
    else if(how==='sell'){ if(c.sellNow) c.sellNow(v); c.toast('賣了 🪙'+v,'good',1300); bag.push({id,v:0,L,done:true}); } else c.toast('放牠回泥灘了','',1000);
    bagText(); hold.end=how; box.style.display='none'; ['tdHint','tdExit','tdStomp','tdCageB'].forEach(i=>{ const e=$(i); if(e) e.style.visibility=''; }); };
  $('hdTank').onclick=()=>fin('tank'); $('hdSell').onclick=()=>fin('sell'); $('hdFree').onclick=()=>fin('free'); }
function holdTick(dt){ if(!hold) return; hold.t+=dt; const g=hold.f.group, u=hold.f.uni; u.uAmp.value=hold.id==='mudskip'?.06:.2; u.uSwim.value+=dt*(hold.id==='mudskip'?7:14);   // 拿在手上還在掙扎
  if(!hold.end){ g.position.copy(cam.position).add(vS.set(.0,-.035,-.2).applyQuaternion(cam.quaternion)); g.quaternion.copy(cam.quaternion); g.rotateY(Math.PI/2+Math.sin(hold.t*1.2)*.6); g.rotateX(-.5); return; }
  hold.k=(hold.k||0)+dt; if(hold.end==='free'){ g.position.y-=dt*.8; g.rotation.y+=dt*3; } else { g.scale.multiplyScalar(1-dt*4); g.position.y-=dt*.3; }
  if(hold.k>.6){ S.remove(g); hold=null; } }
/* ---------- 挖出來的生物：在洞旁邊用 3D 模型＋骨架動一下 ---------- */
const shown=[];
function showCatch(id,p){ const sp=c.species(id); if(!sp) return; try{ if(!creaReady(id)) return; const f=creaModel(sp); f.group.scale.setScalar(Math.max(.06,(sp.len[0]+sp.len[1])/200)*1.5); f.group.position.set(p.x+.3,hAt(p.x+.3,p.z)+.05,p.z); S.add(f.group); shown.push({f,t:0}); }catch(e){} }
/* ---------- 進入／離開 ---------- */
function enter(){ const h=c.hour(), w=lowWin(h); if(!w){ const n=nextLow(h); c.toast(`🌊 現在是滿潮，泥灘都在水下。下次退潮 ${String(Math.floor(n%24)).padStart(2,'0')}:${n%1?'30':'00'}`,'warn',3200); return false; }
  on=true; rakeMud=0; ambStart(); inBucket.forEach(f=>bucketIn.remove(f.group)); inBucket.length=0; walkReq=0; walkV=0; sink=0; prints.forEach(p=>S.remove(p.m)); prints.length=0; endH=w[1]; warned=0; evac=false; bag=[]; yaw=0; pitch=-.32; pos.set(0,1.6,18); spawnSigns(); spawnRoamers(); bagText(); hud.style.display='block'; document.body.classList.add('attide');
  c.toast('🦀 退潮了！看泥面痕跡找生物。注意右上角的漲潮時間','good',3200); return true; }
function exit(forced){ if(!on) return; on=false; holePatches.forEach(p2=>S.remove(p2)); holePatches.length=0; HOLES.forEach(h=>h.set(0,0,0)); ambStop(); cageOff(); trails.forEach(o=>S.remove(o.m)); trails.length=0; cage.items=[]; cage.fill=0; cage.wash=0; hud.style.display='none'; warnEl.style.display='none'; box.style.display='none'; dig=null; document.body.classList.remove('attide');
  roamers.forEach(r=>S.remove(r.g)); roamers=[]; shown.forEach(s=>S.remove(s.f.group)); shown.length=0;
  if(forced&&bag.length){ bag.splice(Math.ceil(bag.length/2)); }
  c.onExit(bag.slice(),forced); bag=[]; }
$('tdExit').onclick=()=>exit(false);
$('tdCageB').onclick=()=>{ if(cage.on) cageOff(); else cageOn(); };
// 跺腳：附近 5 公尺內埋著的貝類受到震動，縮回水管、噴出一道水（真實挖蛤的人就是這樣找的）
$('tdStomp').onclick=()=>{ if(!on||dig) return; vib([40,30,60]); noise(.18,120,1,.35); sink=Math.min(.12,sink+.05); let n=0;
  signs.forEach(s=>{ if(s.done||!s.k) return; const d=Math.hypot(s.m.position.x-pos.x,s.m.position.z-pos.z); if(d>5) return;
    const sq=s.k==='hardclam'||s.k==='gomphina'||s.k==='razor'; setTimeout(()=>{ const p=s.m.position.clone(); if(sq){ jet(p); squirt(p,1.5+Math.random()*.6,14); noise(.12,2800,2,.09); } if(s.ring){ s.ring.material.opacity=1; } },200+d*120+Math.random()*250); if(sq) n++; });
  setTimeout(()=>{ c.toast(n?'噗！附近有 '+n+' 道水柱噴出來──底下有東西':'附近沒什麼反應，換個地方再跺跺看','',1600); },700); };
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
function footprint(x,z,ang,soft){ const m=new T.Mesh(fpG,new T.MeshStandardMaterial({map:fpTex,transparent:true,depthWrite:false,roughness:.25,metalness:.1,color:soft?0x3a3632:0x4a433b,opacity:.85}));
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
function move(e){ if(!on||!drag||dig||(cage.on&&cage.wash>0)) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; drag.moved=Math.max(drag.moved,Math.hypot(dx,dy)); yaw=drag.yaw-dx*.005;
  walkReq=clamp(-dy*.012,-1,1); }   // 上下拖曳的距離＝走路的意圖（快慢），實際移動在每格畫面裡算（軟泥會變慢）
function up(e){ walkReq=0; if(!on||!drag||dig||cage.on||hold){ drag=null; return; } const was=drag; drag=null; if(was.moved>10) return;
  v2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(v2,cam);
  let rTap=null,rBest=80; roamers.forEach(q=>{ const v=q.g.position.clone().project(cam); if(v.z>1) return; const sx=(v.x+1)/2*innerWidth, sy=(1-v.y)/2*innerHeight, dd=Math.hypot(sx-e.clientX,sy-e.clientY); if(dd<rBest&&q.g.position.distanceTo(pos)<8){ rBest=dd; rTap=q; } });   // 點在牠附近 80 像素內就算點到
  const rh=rTap?[{object:rTap.g}]:[]; if(rh.length){ let o=rh[0].object; const r=roamers.find(q=>{ let x=o; while(x){ if(x===q.g) return true; x=x.parent; } return false; });
      if(r){ const dd=Math.hypot(r.g.position.x-pos.x,r.g.position.z-pos.z); if(dd>2.6){ c.toast(SURF[r.id].n+'在 '+dd.toFixed(1)+' 公尺外，慢慢走近一點（手搆不到）','',1500); return; }
        // 機率：寄居蟹慢最好抓、招潮蟹中等、彈塗魚很難；走太快靠近會驚動牠；牠正在逃更難
        const sneak=Math.abs(walkV)>.6||r.spook>0?.45:1, pc=(r.id==='hermit'?.8:r.id==='fiddler'?.55:.38)*sneak*(r.flee>0?.4:1);
        vib(15); noise(.08,900,2,.12);   // 撲過去的聲音
        if(Math.random()<pc){ S.remove(r.g); roamers.splice(roamers.indexOf(r),1); holdCatch(r.id,r.L,r); }
        else { r.flee=2.5; r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); if(r.id==='fiddler'&&Math.random()<.6) r.burrow=1;   // 招潮蟹一溜煙鑽進洞裡
          c.toast(r.id==='fiddler'?(r.burrow?'招潮蟹一溜煙鑽回洞裡了':'招潮蟹橫著逃走了'):r.id==='mudskip'?'彈塗魚一彈就跳開了':'寄居蟹縮進殼裡滾開了',''+'',1300); c.toast((sneak<1?'走太快把牠驚動了，放慢腳步再靠近':'差一點！再試一次'),'',1500); } return; } }
  let hits=ray.intersectObjects(signs.filter(s=>!s.done).map(s=>s.m));
  if(!hits.length){ const gh=ray.intersectObject(ground); if(gh.length){ const p=gh[0].point; let best=null,bd=1.3; signs.forEach(s=>{ if(s.done) return; const d=Math.hypot(s.m.position.x-p.x,s.m.position.z-p.z); if(d<bd){ bd=d; best=s; } }); if(best) hits=[{object:best.m}]; else { c.toast('這裡看不出痕跡，找找泥面上的小孔、凹痕或沙堆（附近的會微微發亮）','',1800); return; } } }
  if(hits.length){ const s=signs.find(q=>q.m===hits[0].object); if(s.m.position.distanceTo(pos)>7){ c.toast('走近一點才能挖','',1200); return; } startDig(s); } }
window.addEventListener('pointerdown',e=>{ if(!on||dig) return; const t=e.target; if(t&&t.closest&&t.closest('button,#tdDig,#tdBag,#tdClock,.sheet,#sheet')) return; down(e); });   /* 原本只聽 3D 畫布，畫布上面還蓋著遊戲的其他觸控層，點了沒反應 */ window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
/* ---------- 每一格 ---------- */
let t=0;
let rspawn=0;
function render(dt){ if(!on) return; if(!dig) dropTick(dt); jetTick(dt); t+=dt; if(!roamers.length&&(rspawn-=dt)<=0){ rspawn=2; spawnRoamers(); } /* 模型下載好就放出泥面上的生物 */ const h=c.hour(), left=(endH-h)*60;   // 剩下幾分鐘（遊戲時間）
  $('tdClock').innerHTML=left>40?`🌊 退潮中・離漲潮還有 ${Math.floor(left)} 分`:`<span style="color:#ffb39a">⚠️ 漲潮倒數 ${Math.max(0,Math.floor(left))} 分</span>`;
  if(left<=40&&warned<1){ warned=1; warnEl.innerHTML='🌊 潮水開始回漲了！<br><small>跟著地上發亮的箭頭往岸邊走</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',3800); vib([80,60,80]); /* 不再插旗子 */ }
  if(left<=20&&warned<2){ warned=2; warnEl.innerHTML='⚠️ 二十分鐘後滿潮！立刻撤離<br><small>真實的泥灘：漲潮速度常比走路快，泥灘也會陷住腳。一定要先查潮汐表、結伴、提早離開</small>'; warnEl.style.display='block'; setTimeout(()=>warnEl.style.display='none',5200); vib([120,80,120,80,120]); }
  if(left<=0&&!evac){ evac=true; c.toast('🌊 潮水漲上來了！你被救生員帶回岸邊，桶子裡掉了一半','warn',4200); setTimeout(()=>exit(true),600); }
  // 海水往岸邊推進
  const k=clamp(1-left/40,0,1); sea.position.z=-200+k*k*175;
  // 噴水的文蛤孔、會動的痕跡
  signs.forEach(s=>{ if(s.done||s.k!=='hardclam') return; s.spurt-=dt; if(s.spurt<=0){ s.spurt=rand(3,7); if(s.m.position.distanceTo(pos)<9&&window.__P_splash) window.__P_splash(s.m.position.x,0,s.m.position.z); } });
  // 活生物：招潮蟹橫著走、彈塗魚一跳一跳、寄居蟹慢慢爬；骨架擺動
  roamers=roamers.filter(r=>!r.gone); roamers.forEach(r=>{ r.t-=dt; if(r.t<=0){ r.t=rand(1.5,4); r.h+=rand(-1.4,1.4); } const fast=Math.abs(walkV)>.6, near=r.g.position.distanceTo(pos)<(fast?3.5:.9); r.spook=fast&&r.g.position.distanceTo(pos)<3.5?1:Math.max(0,(r.spook||0)-dt); if(near&&r.flee<=0){ r.flee=1.5;   /* 慢慢走近不太會驚動牠，走太快就跑 */ r.h=Math.atan2(r.g.position.x-pos.x,r.g.position.z-pos.z); }
    if(r.burrow){ r.burrow+=dt; r.g.position.y=hAt(r.g.position.x,r.g.position.z)-r.burrow*.06; if(r.burrow>1.6){ S.remove(r.g); r.gone=1; } return; }   // 鑽進洞裡
    r.flee-=dt; const sp=(r.id==='hermit'?.05:r.id==='fiddler'?.18:.12)*(r.flee>0?3:1);
    if(r.id==='mudskip'){ r.hop-=dt; if(r.hop<=0){ r.hop=rand(.8,2.2); r.jy=.35; } r.jy=Math.max(0,(r.jy||0)-dt*1.4); r.g.position.y=Math.sin(Math.min(1,(.35-r.jy)/.35)*Math.PI)*.08; } else r.g.position.y=0;
    const side=r.id==='fiddler'?Math.PI/2:0; r.g.position.x+=Math.sin(r.h)*sp*dt; r.g.position.z+=Math.cos(r.h)*sp*dt; r.g.rotation.y=r.h-Math.PI/2+side;
    r.g.position.x=clamp(r.g.position.x,-18,18); r.g.position.z=clamp(r.g.position.z,-30,20); r.g.position.y+=hAt(r.g.position.x,r.g.position.z)+.01; r.uni.uSwim.value+=dt*(4+sp*30); r.uni.uAmp.value=.05+sp*.4; });
  shown.forEach(s=>{ s.t+=dt; s.f.uni.uSwim.value+=dt*8; s.f.uni.uAmp.value=.08+.06*Math.sin(s.t*3); s.f.group.rotation.y+=dt*.6; });
  digTick(dt); cageTick(dt); trailTick(dt); holdTick(dt); flagTick(performance.now()*.001); chevTick(performance.now()*.001,left); if(gmat.userData.sh){ gmat.userData.sh.uniforms.uTW.value=performance.now()*.001; gmat.userData.sh.uniforms.uSkyK.value=Math.min(1.2,.35+.8*(S.children.find(o=>o.isHemisphereLight)||{intensity:1.7}).intensity/1.7); }
  walkTick(dt,left);
  pos.y=hAt(pos.x,pos.z)+1.55-sink+Math.abs(Math.sin(bobT))*-.035*Math.min(1,Math.abs(walkV));   // 跟著地形、走路上下晃、軟泥會陷
  { const fx=-Math.sin(yaw), fz=-Math.cos(yaw), rel=Math.atan2(0,1)-Math.atan2(fx,fz); const ar=document.getElementById('tdArr'); if(ar) ar.style.transform='rotate('+(-rel)+'rad)';   // 岸在 +z 方向
    const dd=document.getElementById('tdDist'); if(dd) dd.textContent=Math.max(0,Math.round(34-pos.z))+' m'; const sh=document.getElementById('tdShore'); if(sh) sh.classList.toggle('warn',!!warned); }
  signs.forEach(s=>{ if(!s.ring) return; const d=Math.hypot(s.m.position.x-pos.x,s.m.position.z-pos.z); s.ring.visible=!s.done&&!dig; s.ring.material.opacity=s.done?0:Math.max(0,1-d/12)*(.55+.4*Math.sin(performance.now()*.005+s.m.position.x)); const sc=1+.12*Math.sin(performance.now()*.005+s.m.position.x); s.ring.scale.set(sc,1,sc); });   // 12 公尺內的痕跡發光、呼吸，越近越亮   // 跟著地形高低走
  if(dig) digCam(); else { if(cam.fov!==58){ cam.fov=58; cam.updateProjectionMatrix(); }  cam.position.copy(pos); cam.rotation.set(pitch+Math.sin(bobT*2)*.006*Math.min(1,Math.abs(walkV)),yaw,Math.sin(bobT)*.01*Math.min(1,Math.abs(walkV)),'YXZ'); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
  handTick(); W.renderer.render(S,cam); }
return {testMat:()=>{ const d=dig; if(!d) return null; const m=d.patch.material, C=d.geo.attributes.color; let mx=0; for(let i=0;i<C.count;i++) mx=Math.max(mx,C.getX(i)); return {vis:d.patch.visible,inS:d.patch.parent===S,progs:(W.renderer.info.programs||[]).map(p=>(p.cacheKey||'').slice(-24)).filter(k=>/tide/.test(k)),props:Object.keys(W.renderer.properties.get(m)),vc:m.vertexColors,key:m.customProgramCacheKey&&m.customProgramCacheKey(),maxR:mx,same:m===gmat,prog:!!(W.renderer.properties.get(m).program),src:(W.renderer.properties.get(m).program||{}).name}; },testScrape:n=>{ const d=dig; if(!d) return 'nodig'; d.phase='dig'; for(let i=0;i<n;i++){ const a=Math.random()*6.28, r=Math.random()*.09; const p=new T.Vector3(d.c.x+Math.cos(a)*r,0,d.c.z+Math.sin(a)*r); p.y=patchY(p.x,p.z); scrape3(p,.3,new T.Vector3(Math.cos(a+1.57),0,Math.sin(a+1.57)),.008); if(d.ready) return 'ready@'+i; } return 'notyet'; },testModel:id=>{ const f=creaModel(c.species(id)); f.group.scale.setScalar(.6); const fx=-Math.sin(yaw), fz=-Math.cos(yaw); f.group.position.set(pos.x+fx*3,hAt(pos.x+fx*3,pos.z+fz*3)+.2,pos.z+fz*3); S.add(f.group); return true; },testCatch:()=>{ const r=roamers[0]; if(!r) return 'none'; S.remove(r.g); roamers.splice(0,1); holdCatch(r.id,r.L,r); return r.id; },handInfo:()=>({ready:hand.ready,vis:hand.grp.visible,pos:hand.grp.position.toArray().map(v=>+v.toFixed(2)),s:+hand.grp.scale.x.toFixed(3),cam:cam.position.toArray().map(v=>+v.toFixed(2))}),testInfo:()=>{ const d=dig; if(!d) return null; const g=d.crea&&d.crea.group; return {depth:d.depth,k:d.k,stub:!!(d.crea&&d.crea.stub),gy:g&&g.position.y,surf:g&&patchY(g.position.x,g.position.z),hA:g&&hAt(g.position.x,g.position.z),maxD:Math.max(...d.D),found:d.found}; },testTake:()=>{ if(dig&&dig.crea){ dig.phase='dig'; dig.found=true; dig.ready=true; for(let i=0;i<dig.D.length;i++) dig.D[i]=Math.max(dig.D[i],0); takeOut(); return true; } return false; },showRoute:v=>{ route.visible=v; },testDig:k=>{ const s=signs.find(q=>q.k===k&&!q.done)||signs.find(q=>q.k); if(s) startDig(s); return !!s; },enter,exit,render,active:()=>on,low:h=>!!lowWin(h),nextLow,CR,SURF,ALL};
}
