/* Above-water fragments and underwater radiance are rendered separately. The water
   shader transmits the underwater target, then applies its reflection on top. */
function createSubmergedRenderer({renderer:R,scene,camera,U,WU}){
  const T=THREE,roots=new Set(),patched=new WeakSet(),pass={value:0};
  const rt=new T.WebGLRenderTarget(4,4,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,depthBuffer:true});
  const cam=new T.PerspectiveCamera(),size=new T.Vector2();cam.layers.set(1);cam.matrixAutoUpdate=false;
  WU.uSubmerged={value:rt.texture};WU.uSubmergedSize={value:new T.Vector2(1,1)};WU.uSubmergedOn={value:0};
  function patch(mat){
    if(patched.has(mat))return;patched.add(mat);
    const prev=mat.onBeforeCompile,key=mat.customProgramCacheKey.bind(mat);
    mat.transparent=true;mat.depthWrite=false;
    mat.onBeforeCompile=(s,r)=>{
      if(prev)prev(s,r);
      Object.assign(s.uniforms,{uSubPass:pass,uSubTime:U.uTime,uSubWind:U.uWind,uSubSea:U.uSea});
      s.vertexShader='varying vec3 vSubWorld;\n'+s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 subVertex=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
        subVertex=instanceMatrix*subVertex;
        #endif
        vSubWorld=(modelMatrix*subVertex).xyz;`);
      s.fragmentShader='varying vec3 vSubWorld;\nuniform float uSubPass,uSubTime,uSubSea;\nuniform vec3 uSubWind;\n'+waterWaveGLSL()+'\n'+s.fragmentShader.replace(/}\s*$/,`
        float subDepth=waterSample(vSubWorld.xz,uSubTime,uSubWind,uSubSea).y-vSubWorld.y;
        if(uSubPass<.5){if(subDepth>0.0)discard;}
        else{
          if(subDepth<=0.0)discard;
          float waterFade=exp(-subDepth*mix(1.05,.5,uSubSea));
          gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.025,.09,.075),1.0-exp(-subDepth*.55));
          gl_FragColor.a*=waterFade;
        }
      }`);
    };
    mat.customProgramCacheKey=()=>key()+'|submerged-v1';mat.needsUpdate=true;
  }
  function add(root){
    if(!root)return;roots.add(root);root.traverse(o=>{
      if(!o.isMesh)return;o.layers.enable(1);
      for(const mat of(Array.isArray(o.material)?o.material:[o.material]))if(mat)patch(mat);
    });
  }
  function remove(root){roots.delete(root);}
  function render(){
    WU.uSubmergedOn.value=0;if(!roots.size)return;
    camera.updateWorldMatrix(true,false);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();cam.matrix.copy(camera.matrixWorld);cam.matrixWorld.copy(camera.matrixWorld);cam.matrixWorldInverse.copy(camera.matrixWorldInverse);cam.projectionMatrix.copy(camera.projectionMatrix);cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);cam.near=camera.near;cam.far=camera.far;
    R.getDrawingBufferSize(size);const scale=window.__waterQuality??(window.__GFX==='low'?.5:.85),w=Math.max(64,Math.round(size.x*scale)),h=Math.max(64,Math.round(size.y*scale));
    if(rt.width!==w||rt.height!==h)rt.setSize(w,h);WU.uSubmergedSize.value.copy(size);
    scene.traverse(o=>{if(o.isLight)o.layers.enable(1);});
    const target=R.getRenderTarget(),color=R.getClearColor(new T.Color()),alpha=R.getClearAlpha(),background=scene.background,tone=R.toneMapping,encoding=R.outputEncoding,shadows=R.shadowMap.autoUpdate;
    try{
      pass.value=1;scene.background=null;R.toneMapping=T.NoToneMapping;R.outputEncoding=T.LinearEncoding;R.shadowMap.autoUpdate=false;
      R.setRenderTarget(rt);R.setClearColor(0,0);R.clear();R.render(scene,cam);WU.uSubmergedOn.value=1;
    }finally{
      pass.value=0;R.setRenderTarget(target);R.setClearColor(color,alpha);scene.background=background;R.toneMapping=tone;R.outputEncoding=encoding;R.shadowMap.autoUpdate=shadows;
    }
  }
  return{add,remove,render,pass,target:rt};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createSubmergedRenderer};
