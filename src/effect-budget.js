/* Effect costs are controlled independently from framebuffer resolution. */
/* 畫質分兩層：tier（高／中／低）決定材質用哪些貼圖與光澤，整段遊戲固定不變，避免著色器重新編譯造成卡頓；
   level（0～7）只調數量、更新頻率與解析度，所有特效在每一級都保留，只是用較省的版本。 */
function effectTier(mode,mobile){return mode==='high'||mode==='mid'||mode==='low'?mode:mobile?'mid':'high';}
function effectBudget(level,tier){level=Math.max(0,Math.min(7,Math.round(Number(level)||0)));tier=tier||(typeof window!=='undefined'&&window.__effectTier)||'high';
 const pick=a=>a[level];
 return{tier,cullStatic:level<2,normalMaps:false,surfaceMaps:true,physicalCoat:tier!=='low',environment:true,probes:true,probeHz:pick([1,1,2,2,4,6,10,15]),caustics:true,waterDetail:true,
  rainLines:pick([160,220,320,420,600,800,1100,1400]),rainOverlay:true,lensFlare:true,rainRings:true,ssr:false,
  transmissionHz:pick([12,15,20,30,45,60,120,120]),reflectionHz:pick([15,15,20,24,30,40,60,60]),shadowHz:pick([8,10,12,15,20,20,24,30]),particleScale:pick([.4,.5,.6,.7,.85,1,1,1])};}
function createMaterialQuality(){
 const states=new WeakMap(),objects=new WeakMap(),sources=new Map(),keys=['envMap','normalMap','bumpMap','roughnessMap','metalnessMap','aoMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap'];let budget=effectBudget(7,'high');
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
 function apply(root){if(root)root.traverse(o=>{const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];if(o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh&&!o.morphTargetInfluences?.length&&mats.some(m=>m?.isMeshStandardMaterial)){if(!objects.has(o))objects.set(o,o.frustumCulled);o.frustumCulled=budget.cullStatic?true:objects.get(o);}for(const m of mats)material(m);});}
 return{set(level,tier){budget=effectBudget(level,tier);return budget;},apply,material};
}
if(typeof module!=='undefined'&&module.exports)module.exports={effectTier,effectBudget,createMaterialQuality};
