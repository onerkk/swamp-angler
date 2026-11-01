/* Effect costs are controlled independently from framebuffer resolution. */
function effectBudget(level){return{normalMaps:false,surfaceMaps:level>=2,physicalCoat:level>=4,environment:level>=2,probes:level>=3,caustics:level>=3,waterDetail:level>=3,rainLines:level<2?0:level<4?180:level<6?500:1400,rainOverlay:level>=4,lensFlare:level>=3,rainRings:level>=3,ssr:false,transmissionHz:level<2?15:level<4?30:120};}
function createMaterialQuality(){
 const states=new WeakMap(),objects=new WeakMap(),sources=new Map(),keys=['envMap','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap'];let budget=effectBudget(7);
 const remember=t=>{if(t?.uuid)sources.set(t.uuid,typeof WeakRef==='function'?new WeakRef(t):{deref:()=>t});};
 function material(m){
  if(!m||(!m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial))return;let s=states.get(m);
  if(!s){
   const ids={...m.userData.swampQualitySources},scalar={...(m.userData.swampQualityScalars||{clearcoat:m.clearcoat,transmission:m.transmission,metalness:m.metalness,roughness:m.roughness})};
   s={maps:{},ids,scalar,enabled:{},scalarOn:{},scalarLast:{},defines:{...(m.userData.swampQualityDefines||m.defines)}};
   for(const k of keys){s.maps[k]=m[k]||sources.get(ids[k])?.deref()||null;if(s.maps[k]){remember(s.maps[k]);ids[k]=s.maps[k].uuid;}}
   m.userData={...m.userData,swampQualitySources:ids,swampQualityScalars:scalar,swampQualityDefines:s.defines};states.set(m,s);
  }
  let changed=false;
  for(const k of keys){
   if((s.enabled[k]&&m[k]!==s.maps[k])||(!s.enabled[k]&&m[k])){s.maps[k]=m[k];if(m[k]){remember(m[k]);s.ids[k]=m[k].uuid;}else delete s.ids[k];}
   const on=k==='envMap'?budget.environment:k==='normalMap'||k==='bumpMap'||k==='clearcoatNormalMap'?budget.normalMaps:k.startsWith('clearcoat')?budget.physicalCoat:budget.surfaceMaps,value=on?s.maps[k]:null;
   if(m[k]!==value){m[k]=value;changed=true;}s.enabled[k]=on;
  }
  for(const k of['clearcoat','transmission','metalness','roughness'])if(typeof s.scalar[k]==='number'){
   const on=k==='clearcoat'||k==='transmission'?budget.physicalCoat:budget.environment;
   if(s.scalarLast[k]!==undefined&&m[k]!==s.scalarLast[k])s.scalar[k]=m[k];
   const value=on?s.scalar[k]:k==='metalness'?Math.min(.2,s.scalar[k]):k==='roughness'?Math.max(.75,s.scalar[k]):0;
   if(m[k]!==value){m[k]=value;changed=true;}s.scalarOn[k]=on;s.scalarLast[k]=value;
  }
  if(m.isMeshPhysicalMaterial){const on=budget.physicalCoat,has=Object.prototype.hasOwnProperty.call(m.defines||{},'PHYSICAL');if(on!==has){m.defines={...s.defines};if(!on)delete m.defines.PHYSICAL;changed=true;}}
  if(changed)m.needsUpdate=true;
 }
 function apply(root){if(root)root.traverse(o=>{const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];if(o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh&&!o.morphTargetInfluences?.length&&mats.some(m=>m?.isMeshStandardMaterial)){if(!objects.has(o))objects.set(o,o.frustumCulled);o.frustumCulled=budget.surfaceMaps?objects.get(o):true;}for(const m of mats)material(m);});}
 return{set(level){budget=effectBudget(level);return budget;},apply,material};
}
if(typeof module!=='undefined'&&module.exports)module.exports={effectBudget,createMaterialQuality};
