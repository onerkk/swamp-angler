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
/* 船頭水花：點粒子，丟出去後受重力落回水面 */
const NP=1100, sp=new Float32Array(NP*3), sv=new Float32Array(NP*3), sl=new Float32Array(NP), ssz=new Float32Array(NP); sl.fill(-1);
const pg=new T.BufferGeometry(); pg.setAttribute('position',new T.BufferAttribute(sp,3)); pg.setAttribute('aL',new T.BufferAttribute(sl,1)); pg.setAttribute('aS',new T.BufferAttribute(ssz,1)); pg.boundingSphere=new T.Sphere(new T.Vector3(),1e5);
const pm=new T.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,
  vertexShader:`attribute float aL; attribute float aS; varying float vL; void main(){ vL=aL; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aL<0.0?0.0:aS*520.0/max(-mv.z,.5); gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`uniform float uLight; varying float vL; void main(){ if(vL<0.0) discard; vec2 q=gl_PointCoord-.5; float r=dot(q,q); if(r>.25) discard; float a=(1.0-r*4.0)*(1.0-r*4.0)*.6*clamp(vL*2.0,0.0,1.0); gl_FragColor=vec4(vec3(.9,.95,1.0)*(.2+.8*uLight),a); }`});
const pts=new T.Points(pg,pm); pts.frustumCulled=false; pts.renderOrder=4; pts.userData.flatOnWater=true; pts.visible=false; S.add(pts);
let pHead=0, emitAcc=0, sampleT=0, wasOn=false;
function emit(x,y,z,vx,vy,vz,life,size){ const i=pHead; pHead=(pHead+1)%NP; sp[i*3]=x; sp[i*3+1]=y; sp[i*3+2]=z; sv[i*3]=vx; sv[i*3+1]=vy; sv[i*3+2]=vz; sl[i]=life; ssz[i]=size; }
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
  const at=(lx,lz)=>[o.x+rx*lx-fx*lz, o.z+rz*lx-fz*lz];
  // 每 0.1 秒在水上留一個泡沫點：船頭兩肩（左右艏浪）與船尾中央（螺旋槳翻起的白水）
  sampleT-=dt; if(sampleT<=0&&s>1.2){ sampleT=.1; const k=Math.min(1,(s-1.2)/9);
    const sh=o.bow+Math.min(3.5,(o.stern-o.bow)*.14);
    for(const [r,sg] of [[arms[0],-1],[arms[1],1]]){ const [x,z]=at(sg*o.beam*.42,sh); const nx=rx*sg*.94-fx*.34, nz=rz*sg*.94-fz*.34, l=Math.hypot(nx,nz);
      r.pts.push({x,z,nx:nx/l,nz:nz/l,fx,fz,s,t0:t,k}); if(r.pts.length>r.n) r.pts.shift(); }
    const [x,z]=at(0,o.stern+.6); wash.pts.push({x,z,nx:0,nz:0,fx,fz,s,t0:t,k:Math.min(1,s/6)}); if(wash.pts.length>wash.n) wash.pts.shift(); }
  all.forEach(r=>{ while(r.pts.length&&t-r.pts[0].t0>r.life) r.pts.shift(); build(r,t); });
  // 船頭水花：時速超過約 9 節開始被船頭劈開往兩側上方甩
  if(s>4.5){ const k=Math.min(1,(s-4.5)/14); emitAcc+=dt*(40+260*k*k); const sh=o.bow+Math.min(2.6,(o.stern-o.bow)*.1);
    while(emitAcc>=1){ emitAcc-=1; const sg=Math.random()<.5?-1:1, along=Math.random(), [x,z]=at(sg*o.beam*(.22+.3*along),sh+along*3.5), out=1.5+Math.random()*2.5+s*.12*(1-along*.5), up=(.8+Math.random()*1.4)*(1+2.2*k)*(1-along*.5), fwd=s*(.04+Math.random()*.1);
      // 大顆的是被劈開往外翻的水團，小顆的是被風吹散的細霧
      const big=Math.random()<.35; emit(x,o.water+.2,z,rx*sg*out+fx*fwd,up,rz*sg*out+fz*fwd,(big?.8:1.4)+Math.random()*.6,big?.28+Math.random()*.3:.08+Math.random()*.12); } }
  let live=0;
  for(let i=0;i<NP;i++){ if(sl[i]<0) continue; sl[i]-=dt; sv[i*3+1]-=9.8*dt; sp[i*3]+=sv[i*3]*dt; sp[i*3+1]+=sv[i*3+1]*dt; sp[i*3+2]+=sv[i*3+2]*dt;
    if(sl[i]<=0||sp[i*3+1]<W.swell(sp[i*3],sp[i*3+2],t)-.05) sl[i]=-1; else live++; }
  pts.visible=live>0; if(live){ pg.attributes.position.needsUpdate=true; pg.attributes.aL.needsUpdate=true; pg.attributes.aS.needsUpdate=true; } }
return {update,clear,stats:()=>all.map(r=>({n:r.pts.length,vis:r.m.visible,a0:r.al[0],p0:[r.pos[0],r.pos[1],r.pos[2]]}))};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createBoatWake};
