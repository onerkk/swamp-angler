/* ===== 時間抗鋸齒（TAA）：參考 VictorZakharov/threejs-nanites 的 src/taa.ts，改成適合我們的 WebGL 版本 =====
   原理：鏡頭不動時，每一幀把投影往次像素方向（Halton 2,3 序列）偏一點點，再跟前幾幀的結果混合，
   相當於每個像素取了很多次樣：細枝、蘆葦、釣線、遠處水面的鋸齒與閃爍會變得平滑。
   原專案靠深度與上一幀的鏡頭做重投影，鏡頭在動也能用；我們的主畫面沒有深度，所以只在鏡頭靜止時累積，
   鏡頭一動就立刻只用當下這一幀（不會拖影）。會動的東西（水波、魚、浮標）用 YCoCg 色彩空間的 3×3 鄰域裁切，
   歷史顏色超出當下鄰域範圍就被拉回來，避免殘影。只在高畫質開 */
function createTAA({renderer:R,grab}){
  const T=THREE, size=new T.Vector2(), oc=new T.OrthographicCamera(-1,1,1,-1,0,1), quad=new T.PlaneGeometry(2,2);
  let cur=null, hist=[null,null], hi=0, w=0, h=0, frame=0, still=0, valid=false; const lastCam=new T.Matrix4(), savedP=new T.Matrix4();
  const halton=(i,b)=>{ let f=1,r=0; while(i>0){ f/=b; r+=f*(i%b); i=Math.floor(i/b); } return r; };
  const VS='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
  const u={tCur:{value:null},tHist:{value:null},uTexel:{value:new T.Vector2()},uAlpha:{value:1}};
  const resolveMat=new T.ShaderMaterial({uniforms:u,vertexShader:VS,depthTest:false,depthWrite:false,fragmentShader:`
    uniform sampler2D tCur, tHist; uniform vec2 uTexel; uniform float uAlpha; varying vec2 vUv;
    vec3 toY(vec3 c){ return vec3(dot(c,vec3(.25,.5,.25)),dot(c,vec3(.5,0.,-.5)),dot(c,vec3(-.25,.5,-.25))); }
    vec3 toR(vec3 y){ return vec3(y.x+y.y-y.z,y.x+y.z,y.x-y.y-y.z); }
    void main(){ vec3 c=texture2D(tCur,vUv).rgb; if(uAlpha>=.999){ gl_FragColor=vec4(c,1.0); return; }
      vec3 mn=vec3(1e5), mx=vec3(-1e5);
      for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){ vec3 s=toY(texture2D(tCur,vUv+vec2(float(x),float(y))*uTexel).rgb); mn=min(mn,s); mx=max(mx,s); }
      vec3 hy=clamp(toY(texture2D(tHist,vUv).rgb),mn,mx);
      gl_FragColor=vec4(mix(toR(hy),c,uAlpha),1.0); }`});
  const copyMat=new T.ShaderMaterial({uniforms:{tSrc:{value:null}},vertexShader:VS,depthTest:false,depthWrite:false,fragmentShader:'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb,1.0); }'});
  const sResolve=new T.Scene(), sCopy=new T.Scene(); const m1=new T.Mesh(quad,resolveMat), m2=new T.Mesh(quad,copyMat); m1.frustumCulled=m2.frustumCulled=false; sResolve.add(m1); sCopy.add(m2);
  function ensure(){ R.getDrawingBufferSize(size); const W=Math.floor(size.x), H=Math.floor(size.y); if(W===w&&H===h&&cur) return;
    w=W; h=H; valid=false; if(cur) cur.dispose(); hist.forEach(t=>t&&t.dispose());
    const fmt=(R.getContext().getContextAttributes()||{}).alpha===false?T.RGBFormat:T.RGBAFormat;   // 畫布沒有透明通道時要用 RGB，否則複製會靜默失敗
    cur=new T.DataTexture(null,w,h,fmt); cur.minFilter=cur.magFilter=T.NearestFilter; cur.generateMipmaps=false;
    hist=[0,1].map(()=>new T.WebGLRenderTarget(w,h,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false})); }
  /* 主畫面畫之前：鏡頭靜止就做次像素抖動 */
  function begin(camera,on){ if(!on){ valid=false; still=0; return; }
    camera.updateMatrixWorld(); const moved=!camera.matrixWorld.equals(lastCam); lastCam.copy(camera.matrixWorld);
    still=moved?0:still+1; if(still<2) return; ensure();
    frame=(frame+1)%16; const jx=(halton(frame+1,2)-.5)*2/w, jy=(halton(frame+1,3)-.5)*2/h;
    savedP.copy(camera.projectionMatrix); camera.projectionMatrix.elements[8]+=jx; camera.projectionMatrix.elements[9]+=jy; camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert(); camera.__taaJ=true; }
  /* 主畫面畫完之後：還原投影、跟歷史混合，結果寫回畫面 */
  function resolve(camera,on){ if(camera.__taaJ){ camera.projectionMatrix.copy(savedP); camera.projectionMatrixInverse.copy(savedP).invert(); camera.__taaJ=false; }
    if(!on||still<2){ valid=false; return false; } ensure();
    const prev=R.getRenderTarget(), ac=R.autoClear, tone=R.toneMapping, enc=R.outputEncoding;
    try{ const curTex=grab?grab():(R.copyFramebufferToTexture(new T.Vector2(0,0),cur),cur);
      R.toneMapping=T.NoToneMapping; R.outputEncoding=T.LinearEncoding; R.autoClear=true;
      const src=hist[hi], dst=hist[1-hi]; u.tCur.value=curTex; u.tHist.value=src.texture; u.uTexel.value.set(1/w,1/h); u.uAlpha.value=valid?.12:1;
      R.setRenderTarget(dst); R.render(sResolve,oc); hi=1-hi; valid=true;
      copyMat.uniforms.tSrc.value=dst.texture; R.setRenderTarget(null); R.autoClear=false; R.render(sCopy,oc);
    } finally { R.toneMapping=tone; R.outputEncoding=enc; R.autoClear=ac; R.setRenderTarget(prev); }
    return true; }
  function release(){ if(cur){ cur.dispose(); cur=null; } hist.forEach(t=>t&&t.dispose()); hist=[null,null]; w=h=0; valid=false; }
  return {begin,resolve,release};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createTAA};
