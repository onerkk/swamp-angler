/* ===== 光束（god rays）：參考 VictorZakharov/threejs-nanites 的 src/godrays.ts，改寫成 WebGL 版 =====
   原理一樣是螢幕空間的徑向模糊：每個像素往太陽（夜裡是月亮）在螢幕上的位置走 40 步，
   累加途中「看得到的亮天空」，越靠近光源越亮、每走一步衰減一點；最後以加色疊回畫面。
   原專案用深度貼圖判斷天空；我們的主畫面直接畫到螢幕、沒有深度貼圖，所以改成把畫好的畫面複製一份（四分之一解析度），
   用亮度判斷亮天空：樹幹、小屋、遠山這些暗的東西自然擋住光，縫隙裡透出來的天光形成光柱。
   只在高畫質開，中低畫質不畫，不影響流暢度 */
function createGodRays({renderer:R,camera,U}){
  const T=THREE, size=new T.Vector2(), sun=new T.Vector3(), ndc=new T.Vector3(), fwd=new T.Vector3();
  let copyTex=null, rt=null, cw=0, ch=0;
  const quadGeo=new T.PlaneGeometry(2,2), oc=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const u={tSrc:{value:null},tRays:{value:null},uSun:{value:new T.Vector2(.5,.5)},uAspect:{value:1},uStrength:{value:0},uCol:{value:new T.Color(1,.9,.7)},uThresh:{value:.72},uDither:{value:0}};
  const VS='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
  // 第一步：沿著往光源的方向取樣，累加亮天空（亮度超過門檻的部分）
  const marchMat=new T.ShaderMaterial({uniforms:u,vertexShader:VS,depthTest:false,depthWrite:false,fragmentShader:`
    uniform sampler2D tSrc; uniform vec2 uSun; uniform float uAspect, uThresh, uDither; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 toSun=uSun-vUv; float span=length(toSun*vec2(uAspect,1.0));
      // 最多走半個畫面：再遠的光柱已經很淡、取樣也太稀
      vec2 st=toSun*(.5/max(span,.5))/40.0;
      vec2 p=vUv+st*fract(h(gl_FragCoord.xy)+uDither);
      float sum=0.0, w=1.0;
      for(int i=0;i<40;i++){ p+=st; vec3 c=texture2D(tSrc,clamp(p,.001,.999)).rgb; float l=dot(c,vec3(.299,.587,.114));
        float open=smoothstep(uThresh,uThresh+.18,l);
        float off=length((p-uSun)*vec2(uAspect,1.0));
        sum+=open*exp(-off*4.0)*w; w*=.975; }
      gl_FragColor=vec4(vec3(sum/40.0),1.0); }`});
  // 第二步：以加色疊回畫面，顏色是當下太陽／月亮的光色
  const addMat=new T.ShaderMaterial({uniforms:u,vertexShader:VS,depthTest:false,depthWrite:false,transparent:true,blending:T.AdditiveBlending,fragmentShader:`
    uniform sampler2D tRays; uniform float uStrength; uniform vec3 uCol; varying vec2 vUv;
    void main(){ float r=texture2D(tRays,vUv).r; gl_FragColor=vec4(uCol*r*uStrength,1.0); }`});
  const marchScene=new T.Scene(), addScene=new T.Scene();
  const m1=new T.Mesh(quadGeo,marchMat), m2=new T.Mesh(quadGeo,addMat); m1.frustumCulled=m2.frustumCulled=false; marchScene.add(m1); addScene.add(m2);
  let frame=0;
  function ensure(){ R.getDrawingBufferSize(size); const w=Math.max(16,Math.floor(size.x)), h=Math.max(16,Math.floor(size.y));
    if(w!==cw||h!==ch){ cw=w; ch=h; if(copyTex) copyTex.dispose(); copyTex=new T.DataTexture(null,w,h,T.RGBAFormat); copyTex.minFilter=copyTex.magFilter=T.LinearFilter; copyTex.generateMipmaps=false;
      if(rt) rt.dispose(); rt=new T.WebGLRenderTarget(Math.max(8,w>>2),Math.max(8,h>>2),{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false}); } }
  /* 主畫面畫完之後呼叫。o.strength 0 就不畫 */
  function render(o){
    const strength=o&&o.strength||0; if(strength<=.002) return false;
    // 光源在螢幕上的位置；在身後或離畫面太遠就淡掉
    camera.getWorldPosition(sun); camera.getWorldDirection(fwd); const dir=o.dir; if(fwd.dot(dir)<.05) return false;
    ndc.copy(sun).addScaledVector(dir,1000).project(camera); const sx=ndc.x*.5+.5, sy=ndc.y*.5+.5;
    const edge=Math.max(Math.abs(ndc.x),Math.abs(ndc.y)), fade=1-Math.min(1,Math.max(0,(edge-1.1)/.9));
    if(fade<=0) return false;
    ensure(); R.getDrawingBufferSize(size);
    const prevRT=R.getRenderTarget(), ac=R.autoClear, tone=R.toneMapping, enc=R.outputEncoding;
    try{
      R.copyFramebufferToTexture(new T.Vector2(0,0),copyTex);
      u.tSrc.value=copyTex; u.uSun.value.set(sx,sy); u.uAspect.value=size.x/size.y; u.uThresh.value=o.thresh||.72; u.uDither.value=(frame++%8)/8;
      R.toneMapping=T.NoToneMapping; R.outputEncoding=T.LinearEncoding;
      R.setRenderTarget(rt); R.autoClear=true; R.render(marchScene,oc);
      R.setRenderTarget(prevRT); R.autoClear=false; u.tRays.value=rt.texture; u.uStrength.value=strength*fade; u.uCol.value.copy(o.color); R.render(addScene,oc);
    } finally { R.autoClear=ac; R.toneMapping=tone; R.outputEncoding=enc; R.setRenderTarget(prevRT); }
    return true; }
  function release(){ if(copyTex){ copyTex.dispose(); copyTex=null; } if(rt){ rt.dispose(); rt=null; } cw=ch=0; }
  return {render,release};
}
if(typeof module!=='undefined'&&module.exports) module.exports={createGodRays};
