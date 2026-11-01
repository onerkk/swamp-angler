const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../vendor/three.min.js');
const {mergeMeshesByMaterial,instanceCopies}=require('../src/batching.js');
test('merged parts keep their exact world positions and group by material',()=>{const a=new T.MeshStandardMaterial(),b=new T.MeshStandardMaterial(),g=new T.Group();g.position.set(5,0,2);const geo=new T.SphereGeometry(1,6,4),parts=[];for(let i=0;i<10;i++){const m=new T.Mesh(geo,i<9?a:b);m.position.set(i,1,0);m.scale.set(.1,.2,.3);g.add(m);parts.push(m);}
 const out=mergeMeshesByMaterial(T,parts,null);assert.equal(out.length,2);const big=out.find(m=>m.material===a);assert.equal(big.geometry.attributes.position.count,geo.attributes.position.count*9);
 const bb=new T.Box3().setFromBufferAttribute(big.geometry.attributes.position),ref=new T.Box3();parts.slice(0,9).forEach(p=>ref.expandByObject(p));assert(bb.min.distanceTo(ref.min)<1e-4&&bb.max.distanceTo(ref.max)<1e-4);});
test('merging relative to a moving group keeps parts in group space',()=>{const g=new T.Group();g.position.set(100,0,0);g.rotation.y=1;const m=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial());m.position.set(1,0,0);g.add(m);const [out]=mergeMeshesByMaterial(T,[m],g);const bb=new T.Box3().setFromBufferAttribute(out.geometry.attributes.position);assert(Math.abs(bb.min.x-.5)<1e-5&&Math.abs(bb.max.x-1.5)<1e-5);});
test('instanced copies reproduce each placed copy',()=>{const w=new T.Group(),c=new T.Group();c.position.set(0,.5,0);const m=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());m.position.set(1,0,0);c.add(m);w.add(c);
 const place=new T.Object3D();place.position.set(3,0,4);place.rotation.y=.7;place.scale.setScalar(2);place.updateMatrix();
 const [im]=instanceCopies(T,w,[place.matrix.clone()]);const got=new T.Matrix4();im.getMatrixAt(0,got);
 const ref=w.clone(true);ref.position.copy(place.position);ref.rotation.copy(place.rotation);ref.scale.copy(place.scale);ref.updateMatrixWorld(true);let refMesh;ref.traverse(o=>{if(o.isMesh)refMesh=o;});
 got.elements.forEach((v,i)=>assert(Math.abs(v-refMesh.matrixWorld.elements[i])<1e-6));assert.equal(im.count,1);assert.equal(im.frustumCulled,false);});
