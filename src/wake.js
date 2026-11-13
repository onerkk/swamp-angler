/* ===== 遊艇航行的水：船頭兩側往外散開的 V 形艏浪（克爾文尾跡角約 19.5°）、船尾螺旋槳翻起的白色航跡、高速時船頭甩出的水花 =====
   泡沫留在水裡（記錄在世界座標），船開走後才會一邊往外散、一邊慢慢消散；轉彎時尾跡跟著船走過的路彎曲，不是黏在船上的貼圖 */
function createBoatWake(W){
'use strict';
const T=THREE, S=W.scene, KELVIN=Math.tan(19.5*Math.PI/180);
const VS=`attribute vec2 aUv; attribute float aA; varying vec2 vUv; varying float vA; varying vec3 vW;
void main(){ vUv=aUv; vA=aA; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const NOISE=`float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fb(vec2 p){ return vn(p)*.55+vn(p*2.13+7.1)*.3+vn(p*4.7+3.3)*.15; }`;
// 泡沫：用世界座標取雜訊，所以泡沫的紋理留在水上不跟著船跑；越靠近帶子中央越密，越老越破碎稀疏
const FS=`uniform float uTime, uLight; uniform vec3 uCam; varying vec2 vUv; varying float vA; varying vec3 vW;
${NOISE}
void main(){ float across=1.0-abs(vUv.y), age=vUv.x;
  float n=fb(vW.xz*1.7+vec2(uTime*.05,-uTime*.03)), n2=fb(vW.xz*5.3-vec2(uTime*.11,uTime*.07));
  float body=smoothstep(.0,.55,across);
  float lace=smoothstep(.42+.3*age,.7+.2*age,n*.75+n2*.35+body*.25);
  float a=lace*body*vA*(1.0-smoothstep(160.0,320.0,distance(vW,uCam)));
  if(a<.01) discard;
  vec3 c=vec3(.86,.92,.96)*(.18+.82*uLight)+vec3(.05,.07,.08);
  gl_FragColor=vec4(c,a); }`;
function trail(n,life,spreadK,w0,grow,alpha){
  const pos=new Float32Array(n*2*3), uv=new Float32Array(n*2*2), al=new Float32Array(n*2), idx=[];
  for(let i=0;i<n-1;i++){ const a=i*2,b=a+1,c=a+2,d=a+3; idx.push(a,b,c,b,d,c); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('aUv',new T.BufferAttribute(uv,2)); g.setAttribute('aA',new T.BufferAttribute(al,1)); g.setIndex(idx);
  g.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
  const m=new T.Mesh(g,mat); m.frustumCulled=false; m.renderOrder=3; m.userData.flatOnWater=true; m.visible=false; S.add(m);
  return {m,g,pos,uv,al,n,life,spreadK,w0,grow,alpha,pts:[]}; }
const U={uTime:{value:0},uLight:{value:1},uCam:{value:new T.Vector3()}};
const mat=new T.ShaderMaterial({uniforms:U,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false});
// 左右艏浪：散開速度依克爾文角；船尾航跡：散得慢、寬、留得久
const arms=[trail(150,11,1,1.1,.32,1),trail(150,11,1,1.1,.32,1)], wash=trail(170,16,.12,1.8,.6,.95);
const all=[...arms,wash];
/* 船頭水花：兩種粒子
   1. 水滴：很小（3～9 公分），沿著飛行方向拉成細長的動態模糊線條、半透明，大量成串——真實的浪花是一束束細水絲，不是棉花團
   2. 水霧：大而淡的霧團（0.5～1.5 公尺），被風吹散、慢慢變大變淡，留在空中讓船從旁邊穿過
   每顆粒子是一片朝向鏡頭、沿速度方向拉長的四邊形（實例化繪製），大小用真實公尺 */
const NP=2600, sp=new Float32Array(NP*3), sv=new Float32Array(NP*3), sl=new Float32Array(NP), ssz=new Float32Array(NP), sty=new Float32Array(NP), sl0=new Float32Array(NP); sl.fill(-1);
const qg=new T.InstancedBufferGeometry(); qg.setAttribute('position',new T.BufferAttribute(new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0]),3)); qg.setIndex([0,1,2,0,2,3]);
const iP=new T.InstancedBufferAttribute(sp,3), iV=new T.InstancedBufferAttribute(sv,3), iL=new T.InstancedBufferAttribute(sl,1), iS=new T.InstancedBufferAttribute(ssz,1), iT=new T.InstancedBufferAttribute(sty,1), iL0=new T.InstancedBufferAttribute(sl0,1);
[iP,iV,iL,iS,iT,iL0].forEach(a=>a.setUsage(T.DynamicDrawUsage));
qg.setAttribute('iP',iP); qg.setAttribute('iV',iV); qg.setAttribute('iL',iL); qg.setAttribute('iS',iS); qg.setAttribute('iT',iT); qg.setAttribute('iL0',iL0); qg.instanceCount=NP; qg.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
const pm=new T.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,
  vertexShader:`attribute vec3 iP; attribute vec3 iV; attribute float iL; attribute float iS; attribute float iT; attribute float iL0; varying vec2 vQ; varying float vA; varying float vT;
  void main(){ vQ=position.xy; vT=iT; if(iL<0.0){ gl_Position=vec4(2.0,2.0,2.0,1.0); vA=0.0; return; }
    float age=1.0-iL/max(iL0,.01);
    vec4 c=viewMatrix*vec4(iP,1.0); vec3 vv=(viewMatrix*vec4(iV,0.0)).xyz; vec2 d=vv.xy; float sp=length(d);
    vec2 ax=sp>.05?d/sp:vec2(0.0,1.0), ay=vec2(-ax.y,ax.x);
    float size=iS*(iT>.5?(1.0+age*1.8):1.0);
    // 水滴：沿速度方向拉長（相當於約 1/25 秒的動態模糊），寬度就是水滴大小；水霧：圓而大
    float len=iT>.5?size:size+sp*.04, wid=iT>.5?size:size*.45;
    c.xy+=ax*position.x*len+ay*position.y*wid;
    gl_Position=projectionMatrix*c;
    vA=(iT>.5?.16*(1.0-age):.55)*smoothstep(0.0,.12,iL)*smoothstep(1.0,.9,age); }`,
  fragmentShader:`uniform float uLight; varying vec2 vQ; varying float vA; varying float vT;
  void main(){ float r=dot(vQ,vQ); if(r>1.0) discard;
    float a=vA*(vT>.5?exp(-r*2.2):(1.0-r)*(1.0-r));
    // 水本身是透明的：亮處是天光的反射，水滴帶一點海水的藍綠
    vec3 col=mix(vec3(.80,.90,.95),vec3(.97,.99,1.0),vT)*(.3+.8*uLight);
    gl_FragColor=vec4(col,a); }`});
const pts=new T.Mesh(qg,pm); pts.frustumCulled=false; pts.renderOrder=4; pts.userData.flatOnWater=true; pts.visible=false; S.add(pts);
let pHead=0, curtainAcc=0, emitAcc=0, tailAcc=0, sampleT=0, wasOn=false;
// 船殼在水線的半寬：船頭尖、往後 8 公尺內漸寬到最寬
const hullHalf=(o,lz)=>o.beam*Math.min(1,.35+(lz-o.bow)/Math.max(1.5,(o.stern-o.bow)*.31));
function put(x,y,z,vx,vy,vz,life,size,type){ const i=pHead; pHead=(pHead+1)%NP; sp[i*3]=x; sp[i*3+1]=y; sp[i*3+2]=z; sv[i*3]=vx; sv[i*3+1]=vy; sv[i*3+2]=vz; sl[i]=life; sl0[i]=life; ssz[i]=size; sty[i]=type; }
function emit(x,y,z,vx,vy,vz,life,size){
  if(size>.25){ put(x,y,z,vx*.6,vy*.6,vz*.6,life*1.3,size*1.1,1);
    for(let k=0;k<3;k++){ const j=.15; put(x,y,z,vx*(1+(Math.random()-.5)*j),vy*(1+(Math.random()-.5)*j),vz*(1+(Math.random()-.5)*j),life*.8,.03+Math.random()*.05,0); } }
  else put(x,y,z,vx,vy,vz,life,.025+Math.random()*.05,0); }
function clear(){ all.forEach(r=>{ r.pts.length=0; r.m.visible=false; }); sl.fill(-1); pts.visible=false; }
function build(r,t){ const n=Math.min(r.pts.length,r.n); if(n<2){ r.m.visible=false; return; }
  for(let k=0;k<n;k++){ const p=r.pts[r.pts.length-1-k], a=t-p.t0, fade=Math.exp(-a/(r.life*.45))*Math.min(1,a*4+.25);
    const cx=p.x+p.nx*p.s*KELVIN*r.spreadK*a, cz=p.z+p.nz*p.s*KELVIN*r.spreadK*a, hw=(r.w0+a*r.grow)*(.6+.4*Math.min(1,p.s/12));
    // 帶子的寬度方向：艏浪沿外推方向攤開；船尾航跡垂直於船走的方向
    const wx=r===wash?-p.fz:p.nx, wz=r===wash?p.fx:p.nz;
    for(let e=0;e<2;e++){ const sg=e?1:-1, x=cx+wx*hw*sg, z=cz+wz*hw*sg, j=k*2+e;
      r.pos[j*3]=x; r.pos[j*3+1]=W.swell(x,z,t)+.035; r.pos[j*3+2]=z; r.uv[j*2]=Math.min(1,a/r.life); r.uv[j*2+1]=sg; r.al[j]=fade*r.alpha*p.k; } }
  for(let k=n;k<r.n;k++){ for(let e=0;e<2;e++){ const j=k*2+e; r.al[j]=0; r.pos[j*3]=r.pos[(n-1)*6]; r.pos[j*3+1]=r.pos[(n-1)*6+1]; r.pos[j*3+2]=r.pos[(n-1)*6+2]; } }
  r.g.attributes.position.needsUpdate=true; r.g.attributes.aUv.needsUpdate=true; r.g.attributes.aA.needsUpdate=true; r.m.visible=true; }
/* o：{on, x, z, head（船頭朝向，前方 = (-sin, -cos)）, speed（公尺/秒）, bow, stern（船首、船尾離原點的前後距離，船首為負）, beam（半寬）, water（吃水線高度）} */
function update(dt,t,o){
  U.uTime.value=t; U.uLight.value=Math.max(.06,Math.min(1,W.info?W.info.light:1)); W.camera.getWorldPosition(U.uCam.value);
  if(!o||!o.on){ if(wasOn) clear(); wasOn=false; return; } wasOn=true;
  const fx=-Math.sin(o.head), fz=-Math.cos(o.head), rx=-fz, rz=fx, s=Math.max(0,o.speed);
  /* 船的大小：以 26 公尺遊艇為 1。小船的水花矮、窄、量少——17 呎中控台艇滑行時，水是從船頭後方約三分之一處的船舷兩側被壓出來、
     往外貼著水面甩成兩片低低的水簾（約 1 公尺高），不會高過船頭；船尾船外機翻起一條窄的白水，高速時噴出一小道雞尾巴水柱 */
  const Lb=Math.max(3,o.stern-o.bow), sc=Math.min(1,Lb/26), small=sc<.5, hs=Math.sqrt(sc);
  arms.forEach(r=>{ r.w0=small?.42:1.1; r.grow=small?.2:.32; }); wash.w0=small?.38:1.8; wash.grow=small?.42:.6;
  const at=(lx,lz)=>[o.x+rx*lx-fx*lz, o.z+rz*lx-fz*lz];
  // 每 0.1 秒在水上留一個泡沫點：船頭兩肩（左右艏浪）與船尾中央（螺旋槳翻起的白水）
  sampleT-=dt; if(sampleT<=0&&s>1.2){ sampleT=.1; const k=Math.min(1,(s-1.2)/9);
    const sh=o.bow+Math.min(3.5,(o.stern-o.bow)*(small?.08:.14));
    for(const [r,sg] of [[arms[0],-1],[arms[1],1]]){ const [x,z]=at(sg*o.beam*.42,sh); const nx=rx*sg*.94-fx*.34, nz=rz*sg*.94-fz*.34, l=Math.hypot(nx,nz);
      r.pts.push({x,z,nx:nx/l,nz:nz/l,fx,fz,s,t0:t,k}); if(r.pts.length>r.n) r.pts.shift(); }
    const [x,z]=at(0,o.stern+(small?.15:.6)); wash.pts.push({x,z,nx:0,nz:0,fx,fz,s,t0:t,k:Math.min(1,s/6)}); if(wash.pts.length>wash.n) wash.pts.shift(); }
  all.forEach(r=>{ while(r.pts.length&&t-r.pts[0].t0>r.life) r.pts.shift(); build(r,t); });
  // 船頭水花：時速超過約 9 節開始被船頭劈開往兩側上方甩
  if(s>4.5){ const k=Math.min(1,(s-4.5)/14); emitAcc+=dt*(40+260*k*k)*(small?.55:1); const sh=o.bow+Math.min(2.6,Lb*(small?.22:.1)), span=small?Lb*.22:3.5;
    while(emitAcc>=1){ emitAcc-=1; const sg=Math.random()<.5?-1:1, along=Math.random(), [x,z]=at(sg*(hullHalf(o,sh+along*span)+.05),sh+along*span), out=(1.5+Math.random()*2.5+s*.12*(1-along*.5))*(small?.8:1), up=(.8+Math.random()*1.4)*(1+2.2*k)*(1-along*.5)*(small?.45:1), fwd=s*(.04+Math.random()*.1);
      // 大顆的是被劈開往外翻的水團，小顆的是被風吹散的細霧
      const big=Math.random()<.35; emit(x,o.water+(small?.05:.2),z,rx*sg*out+fx*fwd,up,rz*sg*out+fz*fwd,(big?.8:1.4)+Math.random()*.6,(big?.28+Math.random()*.3:.08+Math.random()*.12)*(small?.6:1)); } }
  // 船頭兩側的白水幕：時速約 18 節以上，船頭把海水劈成兩片往外上方翻起，高過船頭欄杆，
  // 水幾乎留在原地、船衝過去，從駕駛座看是兩片白水沿著船舷兩側往後飛過
  if(s>9){ curtainAcc+=dt*(s-9)*(small?30:48);
    while(curtainAcc>=1){ curtainAcc-=1; const sg=Math.random()<.5?-1:1, along=Math.random();
      if(small){ const lz=o.bow+Lb*(.28+along*.25), [x,z]=at(sg*(hullHalf(o,lz)+.04),lz), out=3+Math.random()*2.5+(s-9)*.12, up=.9+Math.random()*1.1+(s-9)*.05, fwd=s*(.55+Math.random()*.2);
        emit(x,o.water+.02,z,rx*sg*out+fx*fwd,up,rz*sg*out+fz*fwd,.7+Math.random()*.5,.12+Math.random()*.22); }
      else { const [x,z]=at(sg*(hullHalf(o,o.bow+1.2+along*4)+.15),o.bow+1.2+along*4), out=2.2+Math.random()*2.6, up=5+Math.random()*3+(s-9)*.16, fwd=s*(.18+Math.random()*.22);
        emit(x,o.water+.3,z,rx*sg*out+fx*fwd,up,rz*sg*out+fz*fwd,1.3+Math.random()*.9,.3+Math.random()*.6); } } }
  /* 船外機：滑行時螺旋槳在船尾翻起一道往後上方噴的雞尾巴水柱（小船才有，約 1～2 公尺高） */
  if(small&&s>6){ tailAcc+=dt*(s-6)*22; while(tailAcc>=1){ tailAcc-=1; const [x,z]=at((Math.random()-.5)*.25,o.stern+.25), back=s*(.45+Math.random()*.25), up=1.6+Math.random()*1.8+(s-6)*.06, side=(Math.random()-.5)*1.4;
      emit(x,o.water,z,fx*(s-back)+rx*side,up,fz*(s-back)+rz*side,.8+Math.random()*.5,.1+Math.random()*.2); } }
  // 破浪：船頭撞進浪裡的瞬間，整片白水被往上掀到甲板以上；水本身幾乎留在原地，船以二十幾公尺的秒速衝過去，
  // 所以從駕駛座看是一片水花越過船頭往你迎面打來，落在甲板上就散掉
  if(o.slam>0&&s>7){ const n=Math.round((50+90*o.slam)*Math.min(1,(s-7)/10)*(small?.3:1));
    for(let i=0;i<n;i++){ const sg=Math.random()<.5?-1:1, lz0=o.bow+.5+Math.random()*2.5, lx=sg*(hullHalf(o,lz0)+.1), [x,z]=at(lx,lz0), up=(4.5+Math.random()*4.5)*(.7+.5*o.slam)*(small?.42:1), fwd=s*(.3+Math.random()*.32), side=sg*(.4+Math.random()*1.8);
      emit(x,o.water+.4+Math.random()*.6,z,fx*fwd+rx*side,up,fz*fwd+rz*side,1.6+Math.random()*1.1,Math.random()<.45?.6+Math.random()*.7:.18+Math.random()*.25); } }
  let live=0;
  const halfAt=lz=>o.beam*Math.min(1,.35+(lz-o.bow)/8);
  const deckAt=lz=>(lz<o.bow+Lb*.35?(o.deckBow||2.6):(o.deckMain||2.0))+(o.y||0)+(small?.75:0);
  for(let i=0;i<NP;i++){ if(sl[i]<0) continue; sl[i]-=dt; sv[i*3+1]-=9.8*dt; { const dr=sty[i]>.5?2.2:.3; sv[i*3]*=1-dt*dr; sv[i*3+2]*=1-dt*dr; if(sty[i]>.5) sv[i*3+1]=sv[i*3+1]*(1-dt*1.8)+9.8*dt*.85; } sp[i*3]+=sv[i*3]*dt; sp[i*3+1]+=sv[i*3+1]*dt; sp[i*3+2]+=sv[i*3+2]*dt;
    // 落到船身範圍內、低於甲板：打在甲板上散掉（不會穿過船身）
    const dx=sp[i*3]-o.x, dz=sp[i*3+2]-o.z, lz=-(dx*fx+dz*fz), lx=dx*rx+dz*rz;
    // 只有往下掉、剛好落到甲板高度的才算打在甲板上（從船邊水面剛甩起來、還在往上飛的不算，否則一出生就被消掉）
    const onDeck=sv[i*3+1]<0&&lz>o.bow&&lz<o.stern&&Math.abs(lx)<halfAt(lz)&&sp[i*3+1]<deckAt(lz)&&sp[i*3+1]>deckAt(lz)-1.2;
    if(sl[i]<=0||onDeck||sp[i*3+1]<W.swell(sp[i*3],sp[i*3+2],t)-.05) sl[i]=-1; else live++; }
  pts.visible=live>0; if(live){ iP.needsUpdate=true; iV.needsUpdate=true; iL.needsUpdate=true; iS.needsUpdate=true; iT.needsUpdate=true; iL0.needsUpdate=true; } }
return {update,clear,stats:()=>({ribbons:all.map(r=>({n:r.pts.length,vis:r.m.visible})),spray:sl.reduce((n,v)=>n+(v>=0?1:0),0),ptsVis:pts.visible})};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createBoatWake};
