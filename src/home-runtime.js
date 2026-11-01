/* Bound model parsing/decode concurrency and reuse requests across home components. */
function createHomeModelQueue(loader,report=()=>{}){
 const cache=new Map(),pending=new Map(),queue=[];let running=false;
 function deliver(callback,value){try{if(callback)callback(value);}catch(error){report(error);}}
 function next(){if(running||!queue.length)return;running=true;const job=queue.shift();
  const finish=(value,error)=>{running=false;pending.delete(job.file);if(!error)cache.set(job.file,value);for(const w of job.wait)deliver(error?w.error:w.ready,error||value);next();};
  try{loader.load(job.file,value=>finish(value,null),undefined,error=>finish(null,error||new Error('Home model load failed')));}catch(error){finish(null,error);}
 }
 return{load(file,ready,progress,error){if(cache.has(file)){deliver(ready,cache.get(file));return;}let job=pending.get(file);if(job){job.wait.push({ready,error});return;}job={file,wait:[{ready,error}]};pending.set(file,job);queue.push(job);next();}};
}
function disposeAquariumResident(root,optics){
 if(optics&&optics.remove)optics.remove(root);const geometries=new Set(),materials=new Set(),skeletons=new Set();root.traverse(o=>{if(o.geometry&&o.geometry.userData.aquariumOwned)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m&&m.userData.aquariumOwned)materials.add(m);if(o.isSkinnedMesh&&o.skeleton)skeletons.add(o.skeleton);});for(const x of geometries)x.dispose();for(const x of materials)x.dispose();for(const x of skeletons)if(x.dispose)x.dispose();if(root.parent)root.parent.remove(root);
}
if(typeof module!=='undefined'&&module.exports)module.exports={createHomeModelQueue,disposeAquariumResident};
