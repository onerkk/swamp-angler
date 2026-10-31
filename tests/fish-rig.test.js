const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),T=require('../vendor/three.min.js');
const src=fs.readFileSync(require.resolve('../src/m.js'),'utf8');
function fixture(mode='fish'){
 const grp=new T.Group(),geometry=new T.BoxGeometry(1,.3,.22,10,2,2),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());grp.add(mesh);
 const c={T,FRIGS:new Set(),BX:[.46,.28,.1,-.08,-.25,-.4],cutWhite:()=>{}};vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf('function rigFish('),src.indexOf('// 有骨架的魚被複製時')),c);
 const uni={uSwim:{value:0},uAmp:{value:.04}},rig=c.rigFish(grp,uni,1,mode);
 return {grp,geometry,uni,rig,c,skinned:grp.children.find(o=>o.isSkinnedMesh)};
}
test('fish rig bind pose preserves the source model instead of stretching it along the bones',()=>{
 for(const mode of ['fish','ray','mola','crab','stiff']){
  const f=fixture(mode),p=f.geometry.attributes.position,a=new T.Vector3(),b=new T.Vector3();
  f.grp.updateMatrixWorld(true);f.skinned.skeleton.update();
  for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i);f.skinned.boneTransform(i,b);assert(a.distanceTo(b)<1e-6,mode+' vertex '+i);}
 }
});
test('swimming retains body proportions and remains finite after scaling and turning the fish',()=>{
 const f=fixture(),p=f.geometry.attributes.position,v=new T.Vector3();f.grp.scale.setScalar(.48);f.grp.rotation.y=.7;f.grp.position.set(2,-1.3,-4);
 for(let t=0;t<50;t++){
  f.uni.uSwim.value=t*.2;f.c.poseFish(f.rig,.016);f.grp.updateMatrixWorld(true);f.skinned.skeleton.update();const box=new T.Box3();
  for(let i=0;i<p.count;i++){f.skinned.boneTransform(i,v);assert(v.toArray().every(Number.isFinite));box.expandByPoint(v);}
  assert(box.max.x-box.min.x<1.06);assert(box.max.x-box.min.x>.9);
 }
});
