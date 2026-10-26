/* ===== 真實星空：耶魯亮星星表、銀河、流星 ===== */
const SH5={};
SH5.starVS=`
attribute float aMag; attribute vec3 aCol; attribute float aSeed;
uniform float uTime, uPR, uVis, uHz0, uHz1;
varying vec3 vCol; varying float vA;
void main(){
  vec4 wp = modelMatrix*vec4(position, 1.0);
  vec3 dir = normalize(wp.xyz - cameraPosition);
  float alt = dir.y;
  float hz = smoothstep(uHz0, uHz1, alt);
  float air = 1.0/max(alt + 0.06, 0.06);                     // 大氣質量：低空變暗
  float flux = pow(10.0, -0.4*(aMag - 1.0));
  float tw = 1.0 + (0.12 + 0.5*(1.0 - smoothstep(0.05, 0.5, alt)))*sin(uTime*(7.0 + aSeed*9.0) + aSeed*40.0);  // 閃爍：越低越明顯
  vA = clamp(max(pow(flux, 0.32)*1.75, 0.24), 0.0, 1.0)*hz*uVis*tw*exp(-0.09*(air - 1.0));
  vCol = aCol;
  vec4 mv = viewMatrix*wp;
  gl_PointSize = clamp(2.0 + 3.4*sqrt(flux), 2.0, 9.0)*uPR;
  gl_Position = projectionMatrix*mv;
}`;
SH5.starFS=`
varying vec3 vCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c);
  float a = (exp(-r*r*28.0) + 0.25*exp(-r*r*7.0))*vA; if(a < 0.004) discard;
  gl_FragColor = vec4(vCol*a, a); }`;
SH5.mwVS=`varying vec3 vEq; varying vec3 vW; void main(){ vEq = position; vec4 wp = modelMatrix*vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`;
SH5.mwFS=`
uniform float uVis, uHz0, uHz1; varying vec3 vEq; varying vec3 vW;
float h1(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719)))*43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h1(i), h1(i + vec3(1,0,0)), f.x), mix(h1(i + vec3(0,1,0)), h1(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h1(i + vec3(0,0,1)), h1(i + vec3(1,0,1)), f.x), mix(h1(i + vec3(0,1,1)), h1(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  vec3 d = normalize(vEq);
  // J2000 銀河北極 (RA 192.86°, Dec 27.13°)、銀河中心 (RA 266.40°, Dec -28.94°)
  vec3 ngp = vec3(-0.8676, -0.1981, 0.4560), gc = vec3(-0.0549, -0.8734, -0.4838);
  float b = asin(clamp(dot(d, ngp), -1.0, 1.0));
  float l = acos(clamp(dot(normalize(d - ngp*dot(d, ngp)), gc), -1.0, 1.0));
  float band = exp(-pow(b/0.17, 2.0))*(0.45 + 0.9*exp(-pow(l/0.9, 2.0)));
  float n = n3(d*9.0)*0.6 + n3(d*23.0)*0.4;
  float dust = smoothstep(0.35, 0.75, n3(d*14.0 + 3.0))*exp(-pow(b/0.05, 2.0));
  float a = band*(0.55 + 0.6*n)*(1.0 - 0.75*dust)*0.75*uVis;
  vec3 wd = normalize(vW - cameraPosition); a *= smoothstep(uHz0, uHz1 + 0.15, wd.y);
  gl_FragColor = vec4(vec3(0.85, 0.88, 1.0)*a, a);
}`;
SH5.metVS=`attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0); }`;
SH5.metFS=`uniform float uA; uniform vec3 uCol; varying float vT; void main(){ float a = pow(vT, 2.2)*uA; gl_FragColor = vec4(mix(vec3(1.0), uCol, 0.35 + 0.4*vT)*a, a); }`;

function createNightSky(W,G){
'use strict';
const T=THREE, S=W.scene, R=820, LAT=23.7*Math.PI/180;
/* 星表 → 赤道座標單位向量 */
const raw=Uint8Array.from(atob(STAR_B64),ch=>ch.charCodeAt(0)), dv=new DataView(raw.buffer), N=raw.length/6;
const pos=new Float32Array(N*3), mag=new Float32Array(N), col=new Float32Array(N*3), seed=new Float32Array(N);
function bvRGB(bv){ // B-V 色指數 → 色溫 → 顏色
  const t=4600*(1/(.92*bv+1.7)+1/(.92*bv+.62)), x=t/100; let r,g,b;
  r=x<=66?1:Math.min(1,1.29*Math.pow(x-60,-.1332)); g=x<=66?Math.min(1,.39*Math.log(x)-.632):Math.min(1,1.13*Math.pow(x-60,-.0755)); b=x>=66?1:x<=19?0:Math.min(1,.543*Math.log(x-10)-1.196);
  return [Math.max(0,r),Math.max(0,g),Math.max(0,b)]; }
for(let i=0;i<N;i++){ const ra=dv.getUint16(i*6,true)/65535*2*Math.PI, de=dv.getInt16(i*6+2,true)/32767*Math.PI/2;
  pos[i*3]=Math.cos(de)*Math.cos(ra); pos[i*3+1]=Math.cos(de)*Math.sin(ra); pos[i*3+2]=Math.sin(de);
  mag[i]=dv.getUint8(i*6+4)/25-2; const c=bvRGB(dv.getInt8(i*6+5)/60); col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2]; seed[i]=Math.random(); }
/* 無光害夜空的暗星：6.2～8.5 等、9,000 顆，靠近銀河面越密（與真實星表同一套座標與著色） */
const NF=9000, P2=new Float32Array((N+NF)*3), M2=new Float32Array(N+NF), C2=new Float32Array((N+NF)*3), S2=new Float32Array(N+NF);
P2.set(pos); M2.set(mag); C2.set(col); S2.set(seed);
{ const NG=[-0.8676,-0.1981,0.4560]; let k=N;
  while(k<N+NF){ const u=Math.random()*2-1, ph=Math.random()*2*Math.PI, r=Math.sqrt(1-u*u), x=r*Math.cos(ph), y=r*Math.sin(ph), z=u;
    const b=Math.asin(x*NG[0]+y*NG[1]+z*NG[2]); if(Math.random()>.22+.78*Math.exp(-Math.pow(b/.28,2))) continue;
    P2[k*3]=x; P2[k*3+1]=y; P2[k*3+2]=z; M2[k]=6.2+2.3*Math.pow(Math.random(),.6);
    const t=Math.random(), cc=t<.3?[.8,.88,1]:t<.75?[1,1,1]:[1,.92,.78]; C2[k*3]=cc[0]; C2[k*3+1]=cc[1]; C2[k*3+2]=cc[2]; S2[k]=Math.random(); k++; } }
const sg=new T.BufferGeometry(); sg.setAttribute('position',new T.BufferAttribute(P2,3)); sg.setAttribute('aMag',new T.BufferAttribute(M2,1)); sg.setAttribute('aCol',new T.BufferAttribute(C2,3)); sg.setAttribute('aSeed',new T.BufferAttribute(S2,1));
const U={uTime:W.U.uTime,uPR:{value:1},uVis:{value:0},uHz0:{value:.1},uHz1:{value:.2}};
const stars=new T.Points(sg,new T.ShaderMaterial({uniforms:U,vertexShader:SH5.starVS,fragmentShader:SH5.starFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
const mw=new T.Mesh(new T.SphereGeometry(1,64,32),new T.ShaderMaterial({uniforms:U,vertexShader:SH5.mwVS,fragmentShader:SH5.mwFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.BackSide,fog:false}));
[stars,mw].forEach(o=>{ o.matrixAutoUpdate=false; o.frustumCulled=false; o.renderOrder=-1; S.add(o); });
/* 赤道座標 → 地平座標 → 世界座標（往 -Z 看是南方、+Z 是北方、-X 是東方） */
const M=new T.Matrix4(), Mh=new T.Matrix4(), Mw=new T.Matrix4(), cam=new T.Vector3();
Mw.set(-1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1);                           // ENU → 世界
const sL=Math.sin(LAT), cL=Math.cos(LAT);
const Mlat=new T.Matrix4().set(0,-1,0,0, -sL,0,cL,0, cL,0,sL,0, 0,0,0,1); // 時角座標 → ENU
function skyMatrix(hour){ const lst=((hour-22)/24)*2*Math.PI;           // 十月底：午夜的恆星時約 2 時
  const c=Math.cos(lst), s=Math.sin(lst); Mh.set(c,s,0,0, s,-c,0,0, 0,0,1,0, 0,0,0,1);
  return M.copy(Mw).multiply(Mlat).multiply(Mh); }

/* 流星：頭亮尾暗的細長光帶，沿天球大圓移動 */
const mets=[]; for(let i=0;i<4;i++){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(new Float32Array(12),3)); g.setAttribute('aT',new T.BufferAttribute(new Float32Array([0,0,1,1]),1)); g.setIndex([0,1,2,2,1,3]);
  const m=new T.Mesh(g,new T.ShaderMaterial({uniforms:{uA:{value:0},uCol:{value:new T.Color(.7,1,.85)}},vertexShader:SH5.metVS,fragmentShader:SH5.metFS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));
  m.frustumCulled=false; m.visible=false; m.renderOrder=-1; S.add(m); mets.push({m,t:0,on:false}); }
const v1=new T.Vector3(), v2=new T.Vector3(), hd=new T.Vector3(), td=new T.Vector3(), sd=new T.Vector3(), vw=new T.Vector3();
function dirAE(az,el,o){ return o.set(-Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)); }
function spawn(big){ const o=mets.find(x=>!x.on); if(!o||U.uVis.value<.15) return; const yaw=G.head+(G.yaw||0)+(Math.random()-.5)*1.6;
  const el=.09+Math.random()*.3+(G.pitch||0)*.85, len=(big?.45:.14+Math.random()*.22), ang=Math.random()*Math.PI*2;
  o.s=dirAE(yaw,el,new T.Vector3()); const ax=new T.Vector3(Math.cos(ang),-.35-Math.random()*.5,Math.sin(ang)).cross(o.s).normalize();
  o.e=o.s.clone().applyAxisAngle(ax,len); if(o.e.y>o.s.y){ const t=o.s; o.s=o.e; o.e=t; }
  o.dur=big?1.6:.35+Math.random()*.6; o.t=0; o.on=true; o.big=!!big; o.br=big?1:.45+Math.random()*.5; o.m.visible=true; }
function slerpDir(a,b,t,out){ const d=Math.acos(Math.min(1,a.dot(b))); if(d<1e-5) return out.copy(a); const s=Math.sin(d); return out.copy(a).multiplyScalar(Math.sin((1-t)*d)/s).addScaledVector(b,Math.sin(t*d)/s); }
function updMet(o,dt){ o.t+=dt; const q=o.t/o.dur; if(q>=1){ o.on=false; o.m.visible=false; return; }
  const head=Math.min(1,q*1.15), tail=Math.max(0,head-(o.big?.55:.4));
  slerpDir(o.s,o.e,head,hd); slerpDir(o.s,o.e,tail,td);
  v1.copy(hd).multiplyScalar(R).add(cam); v2.copy(td).multiplyScalar(R).add(cam);
  sd.subVectors(v1,v2).cross(vw.copy(hd)).normalize();
  const wH=R*(o.big?.0045:.0024), wT=wH*.25, p=o.m.geometry.attributes.position;
  p.setXYZ(0,v2.x+sd.x*wT,v2.y+sd.y*wT,v2.z+sd.z*wT); p.setXYZ(1,v2.x-sd.x*wT,v2.y-sd.y*wT,v2.z-sd.z*wT);
  p.setXYZ(2,v1.x+sd.x*wH,v1.y+sd.y*wH,v1.z+sd.z*wH); p.setXYZ(3,v1.x-sd.x*wH,v1.y-sd.y*wH,v1.z-sd.z*wH); p.needsUpdate=true;
  const fl=o.big&&q>.6&&q<.8?1.6:1;                                       // 火流星在後段閃一下
  o.m.material.uniforms.uA.value=o.br*Math.sin(Math.PI*Math.min(1,q*1.1))*U.uVis.value*fl; }

let nextT=20+Math.random()*40;
function update(dt,hour){ W.camera.getWorldPosition(cam);
  const day=W.U.uDay?W.U.uDay.value:1, cloud=W.U.uCloud?W.U.uCloud.value:0;
  const vis=Math.pow(Math.max(0,1-day*1.6),2)*(1-.85*Math.min(1,cloud))*(W.U.uRain?1-.9*W.U.uRain.value:1);
  U.uVis.value+=(vis-U.uVis.value)*Math.min(1,dt*2);
  const sea=G.loc==='sea'; U.uHz0.value=sea?.005:.018; U.uHz1.value=sea?.05:.1;
  U.uPR.value=W.getPR?W.getPR():1;
  const on=U.uVis.value>.01; stars.visible=mw.visible=on;
  if(on){ const m=skyMatrix(hour); stars.matrix.copy(m).scale(v1.set(R,R,R)).setPosition(cam); stars.matrixWorld.copy(stars.matrix);
    mw.matrix.copy(m).scale(v1.set(R*1.02,R*1.02,R*1.02)).setPosition(cam); mw.matrixWorld.copy(mw.matrix); }
  nextT-=dt; if(nextT<=0){ nextT=25+Math.random()*50; if(on) spawn(Math.random()<.06); }
  for(const o of mets) if(o.on) updMet(o,dt); }
return {update,spawn};
}
