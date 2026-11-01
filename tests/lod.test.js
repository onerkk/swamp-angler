const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../vendor/three.min.js');
const {lodFileFor,lodDistance,pairLODMeshes,createGeometryLOD}=require('../src/lod.js');
function model(n){const g=new T.Group(),geo=new T.BoxGeometry(1,1,1,n,n,n),m=new T.Mesh(geo,new T.MeshStandardMaterial());m.name='log';g.add(m);return g;}
test('only the heavy shore models get a simplified file',()=>{assert.equal(lodFileFor('dead_tree_trunk_02.glb'),'models/lod/dead_tree_trunk_02_lod1.glb');assert.equal(lodFileFor('fish_bass.glb'),null);assert(lodDistance('high')>lodDistance('mid'));assert(lodDistance('mid')>lodDistance('low'));});
test('loader patch pairs geometry and swaps by camera distance with hysteresis',async()=>{
 const full=model(8),lodScene=model(1);function Loader(){}Loader.prototype.load=function(url,onLoad){setTimeout(()=>onLoad({scene:url.includes('_lod1')?lodScene:full}),0);};
 const T2={GLTFLoader:Loader},L=createGeometryLOD();L.install(T2);
 const got=await new Promise(r=>new Loader().load('dead_tree_trunk_02.glb',r));assert.equal(got.scene,full);assert.equal(L.stats.paired,1);
 const scene=new T.Scene(),inst=full.clone(true);scene.add(inst);const mesh=inst.children[0],mat=mesh.material,fullGeo=mesh.geometry,cam=new T.PerspectiveCamera();scene.add(cam);
 cam.position.set(0,0,40);scene.updateMatrixWorld(true);L.update(scene,cam,3,'high');assert.notEqual(mesh.geometry,fullGeo);assert.equal(mesh.material,mat);
 cam.position.set(0,0,19);scene.updateMatrixWorld(true);L.update(scene,cam,1/60,'high');assert.notEqual(mesh.geometry,fullGeo);
 cam.position.set(0,0,5);scene.updateMatrixWorld(true);L.update(scene,cam,1/60,'high');assert.equal(mesh.geometry,fullGeo);
 cam.position.set(0,0,15);scene.updateMatrixWorld(true);L.update(scene,cam,1/60,'low');assert.notEqual(mesh.geometry,fullGeo);
});
test('a failed simplified file still delivers the original model',async()=>{const full=model(2);function Loader(){}Loader.prototype.load=function(url,onLoad,p,onErr){setTimeout(()=>url.includes('_lod1')?onErr(new Error('404')):onLoad({scene:full}),0);};const L=createGeometryLOD();L.install({GLTFLoader:Loader});const got=await new Promise(r=>new Loader().load('tree_stump_01.glb',r));assert.equal(got.scene,full);assert.equal(L.stats.paired,0);});
