/* Single beauty pass. Expensive screen-space ray marching has been removed. */
function radianceReflector(m){return !!(m&&(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)&&(!m.transparent||m.opacity>.85)&&(m.roughness<.32||m.metalness>.45||m.clearcoat>.6||(m.userData&&m.userData.screenReflection)));}
function createSceneRadiance(T,R,prepare=()=>{}){
 const status={supported:false,active:false,technique:'disabled',reason:'removed for frame stability'};
 function render(scene,camera){prepare(scene);const env=scene.environment;
  try{if(typeof window!=='undefined'){window.__rayTracingState=status;if(window.__effectBudget?.environment===false)scene.environment=null;}R.render(scene,camera);}
  finally{scene.environment=env;}
 }
 return{render,status,release(){},dispose(){}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createSceneRadiance,radianceReflector};
