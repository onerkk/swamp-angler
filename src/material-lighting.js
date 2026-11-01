/* Capture HDR radiance with the same panorama rotation and weather as the visible sky. */
function photoProbeFragment(SH){return SH.common+`
uniform sampler2D uRadianceA,uRadianceB;uniform float uRadianceReady;
vec3 probeHDR(sampler2D image,vec3 d){vec2 uv=vec2(fract(atan(d.x,-d.z)*0.15915494+uYaw),asin(clamp(d.y,-1.0,1.0))*0.31830989+0.5);vec4 rgbe=texture2D(image,uv);return rgbe.rgb*exp2(rgbe.a*255.0-128.0);}
`+SH.skyFS.replace('gl_FragColor = vec4(col, 1.0);',`if(uPhoto>0.5&&uRadianceReady>0.5){
 vec3 rawPhoto=mix(photoS(uBandA,uFullA,rd),photoS(uBandB,uFullB,rd),uPMix);
 vec3 hdr=mix(probeHDR(uRadianceA,rd),probeHDR(uRadianceB,rd),uPMix);
 col=hdr*clamp(col/max(rawPhoto,vec3(0.004)),vec3(0.0),vec3(2.0));
 }
 gl_FragColor=vec4(col,1.0);`);}
/* One capture face per frame, with convolution deferred to its own frame. */
function createProgressiveEnvironment(T,R,scene,onReady){
 const pmrem=new T.PMREMGenerator(R),cube=new T.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,type:R.capabilities.isWebGL2&&R.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType}),camera=new T.CubeCamera(.1,100,cube);let pending=false,face=-1,ready=false,failed=false;
 function update(frameSeconds){
  if(failed||face<0&&!pending)return false;if(ready&&frameSeconds>1/20)return false;
  if(face<0){face=0;pending=false;camera.updateMatrixWorld(true);}
  const target=R.getRenderTarget(),viewport=R.getViewport(new T.Vector4()),scissor=R.getScissor(new T.Vector4()),scissorTest=R.getScissorTest(),auto=R.shadowMap.autoUpdate,request=R.shadowMap.needsUpdate,xr=R.xr&&R.xr.enabled;
  try{R.shadowMap.autoUpdate=false;R.shadowMap.needsUpdate=false;R.setScissorTest(false);if(R.xr)R.xr.enabled=false;
   if(face<6){cube.texture.generateMipmaps=face===5;R.setRenderTarget(cube,face);R.render(scene,camera.children[face]);face++;}
   else{const rt=pmrem.fromCubemap(cube.texture);onReady(rt);ready=true;face=-1;}
   return true;
  }catch(e){failed=true;face=-1;pending=false;console.warn('Environment capture paused after a rendering failure',e);return false;}finally{if(R.xr)R.xr.enabled=xr;R.shadowMap.autoUpdate=auto;R.shadowMap.needsUpdate=request;R.setRenderTarget(target);R.setViewport(viewport);R.setScissor(scissor);R.setScissorTest(scissorTest);}
 }
 return{request(){pending=true;},reset(){failed=false;ready=false;face=-1;pending=true;cube.dispose();},update};
}
/* Tangent-space normals describe surface detail; they do not replace lighting or IBL. */
function createDetailNormals(T){
 const n=256,out={};
 const height={brushed:(x,y)=>.007*Math.sin(y*Math.PI/2)+.004*Math.sin(y*Math.PI*7/16),weave:(x,y)=>.035*Math.sin((x+y)*Math.PI/8)*Math.sin((x-y)*Math.PI/8),grip:(x,y)=>.03*Math.sin(x*Math.PI/4)*Math.sin(y*Math.PI/4)};
 for(const [kind,h]of Object.entries(height)){const data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=new T.Vector3(-(h(x+1,y)-h(x-1,y))*8,-(h(x,y+1)-h(x,y-1))*8,1).normalize(),i=(y*n+x)*4;data[i]=Math.round((v.x*.5+.5)*255);data[i+1]=Math.round((v.y*.5+.5)*255);data[i+2]=Math.round((v.z*.5+.5)*255);data[i+3]=255;}
  const t=new T.DataTexture(data,n,n,T.RGBAFormat);t.name='Surface normal: '+kind;t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.encoding=T.LinearEncoding;t.needsUpdate=true;out[kind]=t;
 }out.weave.repeat.set(3,4);out.brushed.repeat.set(1,3);out.grip.repeat.set(2,6);return out;
}
function auditSceneLighting(scene){
 const result={meshes:0,lit:0,normalMapped:0,bumpMapped:0,smooth:0,customShader:0,unlit:0,metal:0,metalWithoutEnvironment:0,normalMissingUV:0,examples:{smooth:[],unlit:[],custom:[]}},seen=new Set();
 scene.traverseVisible(o=>{if(!o.isMesh)return;result.meshes++;for(const m of(Array.isArray(o.material)?o.material:[o.material])){if(!m||seen.has(m))continue;seen.add(m);const name=m.name||o.name||m.type;
  if(m.isShaderMaterial||m.isRawShaderMaterial){result.customShader++;if(result.examples.custom.length<8)result.examples.custom.push(name);continue;}
  if(m.isMeshBasicMaterial){result.unlit++;if(result.examples.unlit.length<8)result.examples.unlit.push(name);continue;}
  result.lit++;if(m.normalMap){result.normalMapped++;if(!o.geometry.attributes.uv)result.normalMissingUV++;}else if(m.bumpMap)result.bumpMapped++;else{result.smooth++;if(result.examples.smooth.length<8)result.examples.smooth.push(name);}
  if(m.metalness>.5){result.metal++;if(!(m.envMap||scene.environment))result.metalWithoutEnvironment++;}
 }});result.materials=seen.size;return result;
}
/* A local cabin probe captures actual walls/furniture/lights, not a studio-light overlay. */
function createInteriorReflection(T,R){
 const pmrem=new T.PMREMGenerator(R),cube=new T.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,type:R.capabilities.isWebGL2&&R.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType}),camera=new T.CubeCamera(.08,40,cube),records=new WeakMap();let failed=false,work=null;
 function update(scene,position,outdoor,time){
  const level=typeof window!=='undefined'&&window.__gfxStatus?window.__gfxStatus.level:4;let rec=records.get(scene);
  if(failed||level<3){scene.environment=outdoor;return;}
  scene.environment=rec?rec.rt.texture:outdoor;
  if(rec&&time-rec.time<30)return;
  if(typeof window!=='undefined'&&window.__frameSeconds>1/30)return;
  if(!work||work.scene!==scene){work={scene,face:0};camera.position.copy(position);camera.updateMatrixWorld(true);}
  const target=R.getRenderTarget(),viewport=R.getViewport(new T.Vector4()),scissor=R.getScissor(new T.Vector4()),scissorTest=R.getScissorTest(),shadow=R.shadowMap.autoUpdate,request=R.shadowMap.needsUpdate,oldEnv=scene.environment,xr=R.xr&&R.xr.enabled;
  try{scene.environment=outdoor;R.shadowMap.autoUpdate=false;R.shadowMap.needsUpdate=false;R.setScissorTest(false);if(R.xr)R.xr.enabled=false;
   if(work.face<6){const face=work.face++;cube.texture.generateMipmaps=face===5;R.setRenderTarget(cube,face);R.render(scene,camera.children[face]);scene.environment=rec?rec.rt.texture:outdoor;}
   else{const rt=pmrem.fromCubemap(cube.texture);records.set(scene,{rt,time});scene.environment=rt.texture;if(rec)rec.rt.dispose();work=null;}
  }
  catch(e){failed=true;scene.environment=outdoor||oldEnv;console.warn('Interior reflection probe unavailable',e);}
  finally{if(R.xr)R.xr.enabled=xr;R.shadowMap.needsUpdate=request;R.shadowMap.autoUpdate=shadow;R.setRenderTarget(target);R.setViewport(viewport);R.setScissor(scissor);R.setScissorTest(scissorTest);}
 }
 return{update,release(scene){const rec=records.get(scene);if(rec){if(scene.environment===rec.rt.texture)scene.environment=null;rec.rt.dispose();records.delete(scene);}if(work&&work.scene===scene)work=null;cube.dispose();failed=false;}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createProgressiveEnvironment,photoProbeFragment,createDetailNormals,auditSceneLighting,createInteriorReflection};
