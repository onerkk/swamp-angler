/* Shared water lighting: wet surfaces, Snell-projected moving caustics and depth loss. */
const WATER_OPTICS_STATE=new WeakMap();
function createWaterOptics(U,{surface=0,bounds=null,flat=false,strength=1}={}){
 const owner={},T=THREE,patched=new WeakSet(),scopedMaterials=new WeakMap(),rootMaterials=new WeakMap(),references=new WeakMap(),materials=new Set(),detail={value:1};
 const uniforms={uOptTime:U.uTime,uOptWind:U.uWind,uOptSea:U.uSea,uOptLight:U.uLightCol,uOptDir:U.uSunDir,uOptSurface:{value:surface},uOptFlat:{value:flat?1:0},uOptStrength:{value:strength},uOptDetail:detail,uOptMin:{value:bounds?bounds.min:new T.Vector3(-1e6,-1e6,-1e6)},uOptMax:{value:bounds?bounds.max:new T.Vector3(1e6,1e6,1e6)}};
 function patch(mat){
  if(!mat||patched.has(mat)||!(mat.isMeshStandardMaterial||mat.isMeshPhysicalMaterial))return;patched.add(mat);materials.add(mat);
  const previous=mat.onBeforeCompile,key=mat.customProgramCacheKey.bind(mat),baseEnv=mat.userData.opticsEnv??mat.envMapIntensity??1;
  mat.userData.opticsEnv=baseEnv;WATER_OPTICS_STATE.set(mat,{owner});
  mat.onBeforeCompile=(s,r)=>{
   if(previous)previous(s,r);Object.assign(s.uniforms,uniforms);
   if(s.vertexShader.includes('#define SWAMP_WATER_OPTICS'))return;
   s.vertexShader='#define SWAMP_WATER_OPTICS\nvarying vec3 vOptWorld,vOptNormal;\n'+s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
     vec4 optP=vec4(transformed,1.0);vec3 optN=objectNormal;
     #ifdef USE_INSTANCING
     optP=instanceMatrix*optP;optN=mat3(instanceMatrix)*optN;
     #endif
     vOptWorld=(modelMatrix*optP).xyz;vOptNormal=normalize(mat3(modelMatrix)*optN);`);
   s.fragmentShader='varying vec3 vOptWorld,vOptNormal;\nuniform float uOptTime,uOptSea,uOptSurface,uOptFlat,uOptStrength,uOptDetail;uniform vec3 uOptWind,uOptLight,uOptDir,uOptMin,uOptMax;\n'+waterWaveGLSL()+'\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     float optInside=step(uOptMin.y,vOptWorld.y)*step(vOptWorld.y,uOptMax.y)*step(uOptMin.x,vOptWorld.x)*step(vOptWorld.x,uOptMax.x)*step(uOptMin.z,vOptWorld.z)*step(vOptWorld.z,uOptMax.z);
     float optWave=0.0;if(uOptFlat<.5&&uOptDetail>.5)optWave=waterSample(vOptWorld.xz,uOptTime,uOptWind,uOptSea).y;
     float optDepth=uOptSurface+optWave-vOptWorld.y;
     float optWet=(1.0-smoothstep(-.03,.15,-optDepth))*optInside;
     roughnessFactor=mix(roughnessFactor,min(roughnessFactor,max(.08,roughnessFactor*.55)),optWet);
     diffuseColor.rgb*=mix(1.0,.82,optWet);`);
   s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
     vec3 optRay=refract(-normalize(uOptDir),vec3(0.0,1.0,0.0),1.0/1.333);
     vec2 optQ=vOptWorld.xz-optRay.xz*max(0.0,optDepth)/max(.2,-optRay.y);
     float optC=sin(optQ.x*3.7+sin(optQ.y*2.3)+uOptTime*.8)+sin(optQ.y*4.1-uOptTime*.65);
     float optCaustic=pow(max(0.0,1.0-abs(optC)*.65),14.0);
     float optWater=step(0.0,optDepth)*optInside*exp(-max(0.0,optDepth)*.35);
     reflectedLight.indirectDiffuse+=diffuseColor.rgb*uOptLight*optCaustic*optWater*.24*max(.12,vOptNormal.y)*uOptStrength*uOptDetail;`);
  };mat.customProgramCacheKey=()=>key()+'|water-optics-v2';mat.needsUpdate=true;
 }
 function add(root){const used=new Set();root.traverse(m=>{if(!m.isMesh)return;m.castShadow=m.receiveShadow=true;
  const scoped=material=>{if(!material)return material;let mat=material;const existing=WATER_OPTICS_STATE.get(mat);if(existing&&existing.owner!==owner){mat=scopedMaterials.get(material);if(!mat){mat=material.clone();mat.onBeforeCompile=material.onBeforeCompile;mat.customProgramCacheKey=material.customProgramCacheKey.bind(material);scopedMaterials.set(material,mat);}}patch(mat);if(mat)used.add(mat);return mat;};
  m.material=Array.isArray(m.material)?m.material.map(scoped):scoped(m.material);
 });const before=rootMaterials.get(root)||new Set();for(const m of before)if(!used.has(m)){const n=(references.get(m)||1)-1;references.set(m,n);if(!n)materials.delete(m);}for(const m of used){if(!before.has(m))references.set(m,(references.get(m)||0)+1);if(WATER_OPTICS_STATE.has(m))materials.add(m);}rootMaterials.set(root,used);}
 function update(){detail.value=typeof window!=='undefined'&&window.__GFX==='low'?.45:1;const day=U.uDay?U.uDay.value:1;for(const m of materials)if(WATER_OPTICS_STATE.get(m).owner===owner)m.envMapIntensity=m.userData.opticsEnv*(.22+.78*day);}
 function remove(root){const used=rootMaterials.get(root);if(!used)return;for(const m of used){const n=(references.get(m)||1)-1;references.set(m,n);if(!n)materials.delete(m);}rootMaterials.delete(root);}
 return{add,remove,patch,update,uniforms};
}
function marineBodyBounds(T,root){
 root.updateWorldMatrix(true,true);const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),box=new T.Box3();
 function visit(o,visible){visible=visible&&o.visible;if(!visible)return;if(o.isMesh&&o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));}for(const c of o.children)visit(c,visible);}
 for(const c of root.children)visit(c,true);return box;
}
function marineSurfaceY(bounds,water,exposure=.22){return water-bounds.max.y+(bounds.max.y-bounds.min.y)*exposure;}
if(typeof module!=='undefined'&&module.exports)module.exports={createWaterOptics,marineBodyBounds,marineSurfaceY};
