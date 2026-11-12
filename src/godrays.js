/* ===== 光束（god rays）：參考 VictorZakharov/threejs-nanites 的 src/godrays.ts，改寫成 WebGL 版 =====
   原理一樣是螢幕空間的徑向模糊：每個像素往太陽（夜裡是月亮）在螢幕上的位置走 40 步，
   累加途中「看得到的亮天空」，越靠近光源越亮、每走一步衰減一點；最後以加色疊回畫面。
   原專案用深度貼圖判斷天空；我們的主畫面直接畫到螢幕、沒有深度貼圖，所以改成把畫好的畫面複製一份（四分之一解析度），
   用亮度判斷亮天空：樹幹、小屋、遠山這些暗的東西自然擋住光，縫隙裡透出來的天光形成光柱。
   只在高畫質開，中低畫質不畫，不影響流暢度 */
function createGodRays({renderer:R,camera,U,grab}){
  const T=THREE, size=new T.Vector2(), sun=new T.Vector3(), ndc=new T.Vector3(), fwd=new T.Vector3();
  let copyTex=null, rt=null, cw=0, ch=0, raysRT=null, lastCam=null, tick=0; const lastM=new T.Matrix4();
  const quadGeo=new T.PlaneGeometry(2,2), oc=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const u={tSrc:{value:null},tRays:{value:null},uSun:{value:new T.Vector2(.5,.5)},uAspect:{value:1},uStrength:{value:0},uCol:{value:new T.Color(1,.9,.7)},uThresh:{value:.72},uDither:{value:0},uHorizon:{value:-1}};
  const VS='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
  // 第一步：沿著往光源的方向取樣，累加亮天空（亮度超過門檻的部分）
  const marchMat=new T.ShaderMaterial({uniforms:u,vertexShader:VS,depthTest:false,depthWrite:false,fragmentShader:`
    uniform sampler2D tSrc; uniform vec2 uSun; uniform float uAspect, uThresh, uDither, uHorizon; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 toSun=uSun-vUv; float span=length(toSun*vec2(uAspect,1.0));
      // 最多走半個畫面：再遠的光柱已經很淡、取樣也太稀
      vec2 st=toSun*(.5/max(span,.5))/40.0;
      vec2 p=vUv+st*fract(h(gl_FragCoord.xy)+uDither);
      float sum=0.0, w=1.0;
      for(int i=0;i<40;i++){ p+=st; vec3 c=texture2D(tSrc,clamp(p,.001,.999)).rgb; float l=dot(c,vec3(.299,.587,.114));
        float open=smoothstep(uThresh,uThresh+.18,l)*smoothstep(uHorizon,uHorizon+.03,p.y);
        float off=length((p-uSun)*vec2(uAspect,1.0));
        sum+=open*exp(-off*5.0)*w; w*=.97; }
      gl_FragColor=vec4(vec3(sum/40.0),1.0); }`});
  // 第二步：以加色疊回畫面，顏色是當下太陽／月亮的光色
  const addMat=new T.ShaderMaterial({uniforms:u,vertexShader:VS,depthTest:false,depthWrite:false,transparent:true,blending:T.AdditiveBlending,fragmentShader:`
    uniform sampler2D tRays; uniform float uStrength, uHorizon; uniform vec3 uCol; varying vec2 vUv;
    // 光柱只畫在天空與地平線附近；水面上只留一點點，不會把湖面洗白（晨昏逆光時使用者回報太亮）
    void main(){ float r=texture2D(tRays,vUv).r, sky=uHorizon<0.0?1.0:mix(.15,1.0,smoothstep(uHorizon-.1,uHorizon+.02,vUv.y)); gl_FragColor=vec4(uCol*min(r*uStrength,.16)*sky,1.0); }`});
  const marchScene=new T.Scene(), addScene=new T.Scene();
  const m1=new T.Mesh(quadGeo,marchMat), m2=new T.Mesh(quadGeo,addMat); m1.frustumCulled=m2.frustumCulled=false; marchScene.add(m1); addScene.add(m2);
  let frame=0;
  function ensure(){ R.getDrawingBufferSize(size); const w=Math.max(16,Math.floor(size.x)), h=Math.max(16,Math.floor(size.y));
    if(w!==cw||h!==ch){ cw=w; ch=h; if(copyTex) copyTex.dispose(); copyTex=new T.DataTexture(null,w,h,(R.getContext().getContextAttributes()||{}).alpha===false?T.RGBFormat:T.RGBAFormat);   /* 畫布沒有透明通道時要用 RGB，否則複製會靜默失敗、整張黑 */ copyTex.minFilter=copyTex.magFilter=T.LinearFilter; copyTex.generateMipmaps=false;
      if(rt) rt.dispose(); rt=new T.WebGLRenderTarget(Math.max(8,w>>2),Math.max(8,h>>2),{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false}); } }
  /* 主畫面畫完之後呼叫。o.strength 0 就不畫 */
  function render(o){
    const strength=o&&o.strength||0; if(strength<=.002) return false; const cam=o.camera||camera;
    // 光源在螢幕上的位置：太陽月亮用方向（無限遠），小屋窗戶用位置；在身後或離畫面太遠就淡掉
    cam.getWorldPosition(sun); cam.getWorldDirection(fwd); const dir=o.point?ndc.copy(o.point).sub(sun).normalize().clone():o.dir; if(fwd.dot(dir)<.05) return false;
    if(o.point) ndc.copy(o.point).project(cam); else ndc.copy(sun).addScaledVector(dir,1000).project(cam); const sx=ndc.x*.5+.5, sy=ndc.y*.5+.5;
    const edge=Math.max(Math.abs(ndc.x),Math.abs(ndc.y)), fade=1-Math.min(1,Math.max(0,(edge-1.1)/.9));
    if(fade<=0||strength*fade<.04) return false;   /* 淡到看不出來就整個不做（正午、太陽在畫面邊緣外） */
    ensure(); R.getDrawingBufferSize(size);
    /* 鏡頭沒動時（等魚咬餌、看風景），光束的形狀幾乎不變：每三幀才重算一次，中間兩幀直接沿用上一張光束圖疊上去。
       鏡頭一動就每幀重算，不會有光束跟不上畫面的情形。畫面相同，等魚時省下三分之二的光束運算 */
    const moved=lastCam!==cam||!cam.matrixWorld.equals(lastM); lastCam=cam; lastM.copy(cam.matrixWorld); tick=(tick+1)%3; const reuse=!moved&&tick!==0&&raysRT===rt;
    const prevRT=R.getRenderTarget(), ac=R.autoClear, tone=R.toneMapping, enc=R.outputEncoding;
    try{
      /* 戶外主畫面用共用的那份複製（跟時間抗鋸齒同一份）；小屋有自己的鏡頭與畫面，要自己複製一次 */
      if(!reuse){ const srcTex=(grab&&!o.camera)?grab():(R.copyFramebufferToTexture(new T.Vector2(0,0),copyTex),copyTex);
      if(o.point) u.uHorizon.value=-1; else { const hz=ndc.clone(); fwd.y=0; if(fwd.lengthSq()>1e-6){ fwd.normalize(); hz.copy(sun).addScaledVector(fwd,2000).project(cam); u.uHorizon.value=hz.y*.5+.5; } else u.uHorizon.value=-1; }
      u.tSrc.value=srcTex; u.uSun.value.set(sx,sy); u.uAspect.value=size.x/size.y; u.uThresh.value=o.thresh||.72; u.uDither.value=(frame++%8)/8;
      R.toneMapping=T.NoToneMapping; R.outputEncoding=T.LinearEncoding;
      R.setRenderTarget(rt); R.autoClear=true; R.render(marchScene,oc); raysRT=rt; }
      R.toneMapping=T.NoToneMapping; R.outputEncoding=T.LinearEncoding;
      R.setRenderTarget(prevRT); R.autoClear=false; u.tRays.value=rt.texture; u.uStrength.value=strength*fade; u.uCol.value.copy(o.color); R.render(addScene,oc);
    } finally { R.autoClear=ac; R.toneMapping=tone; R.outputEncoding=enc; R.setRenderTarget(prevRT); }
    return true; }
  function release(){ if(copyTex){ copyTex.dispose(); copyTex=null; } if(rt){ rt.dispose(); rt=null; } cw=ch=0; }
  return {render,release,debugRT:()=>rt};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createGodRays};
