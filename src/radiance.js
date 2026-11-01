/* Screen-space ray marching, not hardware RT. Water keeps its separate planar reflection/refraction. */
function radianceReflector(m){return !!(m&&(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)&&(!m.transparent||m.opacity>.85)&&(m.roughness<.32||m.metalness>.45||m.clearcoat>.6||(m.userData&&m.userData.screenReflection)));}
function createSceneRadiance(T,R,prepare=()=>{}){
 let pass=null,failed=false,sizeKey='',sceneKey=null,selected=[];
 const cache=new WeakMap(),normalMaterials=new Set(),size=new T.Vector2();
 const supported=!!(T.SSRPass&&R.extensions&&(R.capabilities.isWebGL2?R.extensions.has('EXT_color_buffer_float'):R.extensions.has('WEBGL_depth_texture')&&R.extensions.has('EXT_color_buffer_half_float')));
 let auditAt=0,selectAt=0;
 const status={supported,active:false,technique:'screen-space ray marching',reason:''};
 function auxiliary(scene,camera,target,mask){
  const backup=[],oldOverride=scene.overrideMaterial,bg=scene.background,oldShadow=R.shadowMap.autoUpdate,chosen=new Set(selected);
  try{
   scene.overrideMaterial=null;scene.background=null;R.shadowMap.autoUpdate=false;
   scene.traverseVisible(o=>{if(!o.material)return;const original=o.material,mats=Array.isArray(original)?original:[original];
    backup.push([o,original,o.visible]);
    if(!o.isMesh||mats.some(m=>!m||(m.isShaderMaterial||m.isRawShaderMaterial)||m.alphaTest>0||(m.transparent&&(m.opacity<.85||!m.depthWrite)))){o.visible=false;return;}
    o.material=mask?(chosen.has(o)?pass.metalnessOnMaterial:pass.metalnessOffMaterial):mats.map(m=>{
     let n=cache.get(m);if(!n){n=new T.MeshNormalMaterial({side:m.side,skinning:true,morphTargets:true,morphNormals:true});cache.set(m,n);normalMaterials.add(n);}
     n.normalMap=m.normalMap;n.bumpMap=m.bumpMap;n.bumpScale=m.bumpScale;if(m.normalScale)n.normalScale.copy(m.normalScale);n.displacementMap=m.displacementMap;n.displacementScale=m.displacementScale;n.displacementBias=m.displacementBias;return n;
    });if(!Array.isArray(original)&&!mask)o.material=o.material[0];
   });
   R.setRenderTarget(target);R.setClearColor(0,0);R.clear();R.render(scene,camera);
  }finally{for(const [o,m,v]of backup){o.material=m;o.visible=v;}scene.overrideMaterial=oldOverride;scene.background=bg;R.shadowMap.autoUpdate=oldShadow;}
 }
 function render(scene,camera){prepare(scene);
  const now=typeof performance!=='undefined'?performance.now():Date.now();if(now>=auditAt&&typeof auditSceneLighting==='function'&&typeof document!=='undefined'&&document.getElementById('gfxLive')){auditAt=now+5000;const report=auditSceneLighting(scene);report.ssrActive=status.active;if(typeof window!=='undefined')window.__materialLightingAudit=report;}
  status.active=false;const high=typeof window!=='undefined'&&window.__gfxStatus&&window.__gfxStatus.level===7;
  if(!supported||failed||!high||window.__effectBudget?.ssr===false){if(pass)release();status.reason=!supported?'device unsupported':failed?'render fallback':'below highest quality';const env=scene.environment;try{if(window.__effectBudget?.environment===false)scene.environment=null;R.render(scene,camera);}finally{scene.environment=env;}return;}
  const target=R.getRenderTarget(),color=R.getClearColor(new T.Color()).clone(),alpha=R.getClearAlpha(),auto=R.autoClear,viewport=R.getViewport(new T.Vector4()),scissor=R.getScissor(new T.Vector4()),scissorTest=R.getScissorTest();
  try{
   if(!pass){pass=new T.SSRPass({renderer:R,scene,camera,width:64,height:64,selects:[],encoding:R.outputEncoding,bouncing:false,morphTargets:true});pass.renderToScreen=true;pass.opacity=.18;pass.maxDistance=18;pass.thickness=.08;pass.blur=true;pass.distanceAttenuation=true;pass.fresnel=true;pass.metalnessOnMaterial.skinning=pass.metalnessOffMaterial.skinning=true;pass.metalnessOnMaterial.morphTargets=pass.metalnessOffMaterial.morphTargets=true;
    pass.renderOverride=(_,m,rt)=>auxiliary(pass.scene,pass.camera,rt,false);pass.renderMetalness=(_,m,rt)=>auxiliary(pass.scene,pass.camera,rt,true);
   }
   pass.scene=scene;pass.camera=camera;R.getDrawingBufferSize(size);const key=size.x+'x'+size.y,scale=Math.min(.5,768/Math.max(size.x,size.y));
   if(key!==sizeKey){pass.setSize(Math.max(2,Math.round(size.x*scale)),Math.max(2,Math.round(size.y*scale)));pass.beautyRenderTarget.setSize(size.x,size.y);pass.ssrMaterial.defines.MAX_STEP=64;pass.ssrMaterial.needsUpdate=true;sizeKey=key;}
   if(sceneKey!==scene||now>=selectAt){const next=[];scene.traverseVisible(o=>{if(o.isMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(radianceReflector))next.push(o);});if(sceneKey!==scene||next.length!==selected.length||next.some((o,i)=>o!==selected[i])){selected=next;pass.selects=selected;}sceneKey=scene;selectAt=now+500;}
   const u=pass.ssrMaterial.uniforms;u.cameraNear.value=camera.near;u.cameraFar.value=camera.far;u.cameraProjectionMatrix.value.copy(camera.projectionMatrix);u.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
   R.setScissorTest(false);pass.render(R,null);status.active=true;status.reason='highest quality';
  }catch(e){failed=true;status.reason='render fallback';console.warn('SSR unavailable; retaining PBR lighting and planar water',e);R.setRenderTarget(target);R.setClearColor(color,alpha);R.autoClear=auto;R.render(scene,camera);
  }finally{R.setRenderTarget(target);R.setClearColor(color,alpha);R.autoClear=auto;R.setViewport(viewport);R.setScissor(scissor);R.setScissorTest(scissorTest);if(typeof window!=='undefined')window.__rayTracingState=status;}
 }
 function release(){if(pass)pass.dispose();pass=null;sizeKey='';sceneKey=null;selected=[];}
 return{render,status,release,dispose(){if(pass)pass.dispose();for(const m of normalMaterials)m.dispose();}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createSceneRadiance,radianceReflector};
