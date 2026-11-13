const{test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js'),fs=require('fs'),vm=require('vm'),{effectBudget,createMaterialQuality}=require('../src/effect-budget.js');
test('lowest quality skips expensive passes while keeping underwater transmission',()=>{
 const low=effectBudget(0,'low'),high=effectBudget(7,'high');
 for(const flag of ['environment','probes','caustics','waterDetail','rainOverlay','rainRings','lensFlare','normalMaps','physicalCoat']){
  assert.equal(low[flag],false,flag);assert.equal(high[flag],true,flag);
 }
 for(const rate of ['reflectionHz','shadowHz','probeHz','rainLines']){assert.equal(low[rate],0,rate);assert(high[rate]>0,rate);}
 assert.equal(low.transmissionHz,8);assert(high.transmissionHz>low.transmissionHz);assert.equal(high.ssr,false);
});
test('manual high restores authored surface detail and stable levels retain shader features',()=>{
 const quality=createMaterialQuality(),root=new T.Group(),normal=new T.Texture(),bump=new T.Texture(),coat=new T.Texture(),rough=new T.Texture();
 const material=new T.MeshPhysicalMaterial({normalMap:normal,bumpMap:bump,roughnessMap:rough,clearcoat:1,clearcoatNormalMap:coat,transmission:.7,metalness:1,roughness:.1});
 root.add(new T.Mesh(new T.BoxGeometry(),material));
 for(let i=0;i<30;i++){
  quality.set(0,'low');quality.apply(root);assert.equal(material.normalMap,null);assert.equal(material.transmission,0);assert.equal(material.clearcoat,0);assert.equal(material.defines.PHYSICAL,undefined);
  quality.set(7,'high');quality.apply(root);assert.equal(material.normalMap,normal);assert.equal(material.bumpMap,bump);assert.equal(material.clearcoatNormalMap,coat);assert.equal(material.roughnessMap,rough);
  assert.equal(material.transmission,.7);assert.equal(material.clearcoat,1);assert.equal(material.metalness,1);assert.equal(material.roughness,.1);assert.equal(material.defines.PHYSICAL,'');
  const version=material.version;quality.set(5,'high');quality.apply(root);assert.equal(material.version,version);
 }
});
test('a model cloned at low quality recovers its source normal map when raised',()=>{
 const q=createMaterialQuality(),normal=new T.Texture(),original=new T.MeshStandardMaterial({normalMap:normal});
 q.set(0,'low');q.material(original);const clone=original.clone();q.material(clone);assert.equal(clone.normalMap,null);
 q.set(7,'high');q.material(clone);assert.equal(clone.normalMap,normal);
});
test('material changes made while low are applied when quality is raised',()=>{
 const q=createMaterialQuality(),original=new T.Texture(),finish=new T.Texture();
 const a=new T.MeshStandardMaterial({normalMap:original}),b=a.clone(),root=new T.Mesh(new T.BoxGeometry(),[a,b]);
 q.set(0,'low');q.apply(root);assert.equal(a.normalMap,null);assert.equal(b.normalMap,null);
 a.normalMap=finish;a.roughness=.2;q.apply(root);assert.equal(a.normalMap,null);
 q.set(7,'high');q.apply(root);assert.equal(a.normalMap,finish);assert.equal(b.normalMap,original);assert.equal(a.roughness,.2);
 a.normalMap=null;q.apply(root);assert.equal(a.normalMap,null);
});
test('actual rain updater skips the lowest level and never writes beyond the budget',()=>{const source=fs.readFileSync(require.resolve('../src/f.js'),'utf8'),geo=new T.BufferGeometry(),positions=new Float32Array(1400*6);geo.setAttribute('position',new T.BufferAttribute(positions,3));let queries=0;const c={NR:1400,rgeo:geo,roff:new Float32Array(1400*3).fill(1),rpos:positions,rainL:{visible:true,position:new T.Vector3()},cur:{r:.8},cw:new T.Vector3(),windNow:5,windAng:0,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),rmat:{color:new T.Color()},W:{camera:{getWorldPosition:v=>{queries++;v.set(0,2,0);}},info:{light:1}},window:{__effectBudget:effectBudget(0),__G:{loc:'lake'}}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function updateRain('),source.indexOf('\nconst OBST=')),c);c.updateRain(1/60);assert.equal(c.rainL.visible,false);assert.equal(geo.drawRange.count,0);assert.equal(queries,0);assert(positions.every(x=>x===0));c.window.__effectBudget=effectBudget(3);c.updateRain(1/60);assert.equal(geo.drawRange.count,840);assert.equal(c.rainL.visible,true);assert(positions.subarray(420*6).every(x=>x===0));});
test('low quality culls offscreen static meshes but never applies invalid culling to skinned or instanced animations',()=>{const q=createMaterialQuality(),root=new T.Group(),geo=new T.BoxGeometry(),mat=new T.MeshStandardMaterial(),staticMesh=new T.Mesh(geo,mat),skin=new T.SkinnedMesh(geo,mat),instances=new T.InstancedMesh(geo,mat,2);for(const x of[staticMesh,skin,instances]){x.frustumCulled=false;root.add(x);}q.set(0);q.apply(root);assert(staticMesh.frustumCulled);assert(!skin.frustumCulled);assert(!instances.frustumCulled);q.set(7);q.apply(root);assert(!staticMesh.frustumCulled);});
test('screen rain stops drawing at the lowest level and uses cached sprites when restored',()=>{const source=fs.readFileSync(require.resolve('../src/g.js'),'utf8'),a=source.indexOf('  // 螢幕雨滴'),b=source.indexOf('  // 太陽眩光',a);let draws=0;const c={window:{__effectBudget:effectBudget(0),__G:{loc:'lake'}},W:{U:{uRain:{value:1}}},uw:false,dOn:false,dc:{style:{}},dW:600,dH:400,rand:(x,y)=>(x+y)/2,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dropSprite:()=>({}),dx:new Proxy({},{get(_,k){if(k==='createRadialGradient')throw Error('gradient rebuilt per drop');if(k==='drawImage')return()=>{draws++;};return typeof k==='string'&&/^(clearRect|beginPath|moveTo|lineTo|stroke)$/.test(k)?()=>{}:undefined;},set(){return true;}}),drops:[],Math};vm.createContext(c);vm.runInContext('function tick(dt){'+source.slice(a,b)+'}',c);for(let i=0;i<60;i++)c.tick(1/60);assert.equal(draws,0);assert.equal(c.dOn,false);c.window.__effectBudget=effectBudget(3);for(let i=0;i<600;i++)c.tick(1/60);assert.equal(c.dOn,true);assert(c.drops.length>0);assert(c.drops.length<=Math.round(42*effectBudget(3).particleScale));assert(draws>0);});
