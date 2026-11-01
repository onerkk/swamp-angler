/* Bound model parsing/decode concurrency and reuse requests across home components. */
function createHomeModelQueue(loader,report=()=>{},schedule=fn=>fn()){
 const cache=new Map(),pending=new Map(),queue=[];let running=false;
 function deliver(callback,value){if(callback)schedule(()=>{try{callback(value);}catch(error){report(error);}},'model callback');}
 function next(){if(running||!queue.length)return;running=true;const job=queue.shift();
  const finish=(value,error)=>{running=false;pending.delete(job.file);if(!error)cache.set(job.file,value);for(const w of job.wait)deliver(error?w.error:w.ready,error||value);schedule(next,'next model');};
  try{loader.load(job.file,value=>finish(value,null),undefined,error=>finish(null,error||new Error('Home model load failed')));}catch(error){finish(null,error);}
 }
 return{load(file,ready,progress,error){if(cache.has(file)){deliver(ready,cache.get(file));return;}let job=pending.get(file);if(job){job.wait.push({ready,error});return;}job={file,wait:[{ready,error}]};pending.set(file,job);queue.push(job);next();}};
}
function disposeAquariumResident(root,optics){
 if(optics&&optics.remove)optics.remove(root);const geometries=new Set(),materials=new Set(),skeletons=new Set();root.traverse(o=>{if(o.geometry&&o.geometry.userData.aquariumOwned)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m&&m.userData.aquariumOwned)materials.add(m);if(o.isSkinnedMesh&&o.skeleton)skeletons.add(o.skeleton);});for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of skeletons)if(x.dispose)x.dispose();if(root.parent)root.parent.remove(root);
}
if(typeof module!=='undefined'&&module.exports)module.exports={createHomeModelQueue,disposeAquariumResident};
/* Keep CPU assets for re-entry, release GPU residency of the scene being left. */
function releaseSceneGPU(root,{disposeMaterials=false}={}){
 const geometry=new Set(),textures=new Set(),materials=new Set(),bones=new Set();
 root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.isSkinnedMesh&&o.skeleton&&o.skeleton.boneTexture)bones.add(o.skeleton.boneTexture);for(const m of(o.material?(Array.isArray(o.material)?o.material:[o.material]):[])){materials.add(m);for(const key of['map','normalMap','roughnessMap','metalnessMap','bumpMap','aoMap','emissiveMap','alphaMap','displacementMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap']){const texture=m[key];if(texture&&texture.isTexture&&!texture.isRenderTargetTexture)textures.add(texture);}}});
 for(const g of geometry)g.dispose();for(const t of textures)t.dispose();for(const t of bones){t.dispose();t.needsUpdate=true;}if(disposeMaterials)for(const m of materials)m.dispose();return{geometries:geometry.size,textures:textures.size};
}
function createLazyHomeScene(factory){let instance=null;const ensure=()=>instance||(instance=factory());return{enter:()=>ensure().enter(),exit:()=>instance&&instance.exit(),render:dt=>{if(instance&&instance.active())instance.render(dt);},active:()=>!!(instance&&instance.active()),qualityScope:()=>instance?instance.qualityScope():'home',grill:()=>ensure().grill(),grillSet:(...args)=>ensure().grillSet(...args),resetGraphics:()=>instance&&instance.resetGraphics(),get scene(){return instance&&instance.scene;},get cam(){return instance&&instance.cam;}};}
function createGraphicsRecovery(canvas,{save=()=>{},lost=()=>{},restored=()=>{},report=()=>{}}={}){
 let paused=false;
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(paused)return;paused=true;try{save();}catch(error){report('save-error',String(error));}report('context-lost','GPU context lost');try{lost();}catch(error){report('recovery-error',String(error));}});
 canvas.addEventListener('webglcontextrestored',()=>{if(!paused)return;try{restored();paused=false;report('context-restored','GPU context restored');}catch(error){report('recovery-error',String(error));}});
 return{paused:()=>paused};
}
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{releaseSceneGPU,createLazyHomeScene,createGraphicsRecovery});

function createSceneLifetime(){return{alive:true,cancel(){this.alive=false;},wrap(fn){return(...args)=>{if(this.alive)return fn(...args);};}};}
if(typeof module!=='undefined'&&module.exports)module.exports.createSceneLifetime=createSceneLifetime;

/* One scene-building task per animation frame; parked when the cabin is inactive. */
function createHomeWorkQueue({schedule=fn=>typeof requestAnimationFrame==='function'?requestAnimationFrame(fn):setTimeout(fn,16),now=()=>performance.now(),report=()=>{},onSlow=()=>{},canRun=()=>true}={}){
 const jobs=[];let queued=false,active=true;
 function request(){if(!queued&&active&&jobs.length){queued=true;schedule(drain);}}
 function drain(){queued=false;if(!active)return;if(!canRun()){request();return;}const job=jobs.shift();if(!job)return;const start=now();try{job.fn();}catch(error){report(error);}finally{const ms=now()-start;if(ms>30)onSlow(job.label,Math.round(ms));request();}}
 return{add(fn,label='scene build'){jobs.push({fn,label});request();},setActive(on){active=!!on;request();},pending:()=>jobs.length};
}
if(typeof module!=='undefined'&&module.exports)module.exports.createHomeWorkQueue=createHomeWorkQueue;
