const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {aquariumGraphicsProfile,createAquariumPlantBatch,aquariumCameraPosition}=require('../src/aquarium-display.js'),{createAdaptiveGraphics,tuneTextureSampling}=require('../src/graphics.js');
test('aquarium resolution recovers on entry and still adapts to actual FPS',()=>{
 const applied=[],controller=createAdaptiveGraphics({cap:()=>2.75,apply:s=>applied.push(s),profile:aquariumGraphicsProfile});controller.configure('auto');
 const run=(fps,seconds,scene)=>{for(let i=0;i<fps*seconds;i++)controller.sample(1/fps,{scene});};
 run(10,25,'lake');assert(controller.status().pr<1);controller.sample(1/60,{scene:'home-aquarium'});assert.equal(controller.status().pr,2.75);
 run(15,25,'home-aquarium');assert.equal(controller.status().level,0);assert(controller.status().pr<1,'severe aquarium lag must be allowed below one pixel per CSS pixel');run(90,140,'home-aquarium');assert.equal(controller.status().level,7);
 controller.configure('low');assert(controller.status().pr<1,'manual low must remain available');
});
test('plant instancing reduces repeated draw objects while preserving geometry and wind poses',()=>{
 const parent=new T.Group();parent.position.set(2,0,-3);const geometry=new T.PlaneGeometry(.3,.6),material=new T.MeshStandardMaterial({transparent:true,alphaTest:.5}),plants=[];
 for(let i=0;i<24;i++){const o=new T.Group(),leaf=new T.Mesh(geometry,material);leaf.position.set(.03,.3,0);o.position.set(i*.08,.4,-.1);o.rotation.y=i*.2;o.add(leaf);parent.add(o);plants.push({o});}
 const batch=createAquariumPlantBatch(T,parent,plants);batch.rebuild();assert.equal(batch.batches.length,1);assert.equal(batch.batches[0].mesh.count,24);assert(plants.every(p=>!p.o.visible));assert.equal(batch.batches[0].mesh.material,material);
 plants[3].o.rotation.z=.05;batch.update();const got=new T.Matrix4(),expected=new T.Matrix4();batch.batches[0].mesh.getMatrixAt(3,got);expected.multiplyMatrices(plants[3].o.matrix,plants[3].o.children[0].matrix);got.elements.forEach((x,i)=>assert(Math.abs(x-expected.elements[i])<1e-6));
 batch.rebuild();assert.equal(batch.batches.length,1);batch.dispose();assert.equal(parent.children.filter(o=>o.isInstancedMesh).length,0);
});
test('dive camera cannot tunnel into rocks or a fish, including when it starts inside one',()=>{
 const min=new T.Vector3(-.3,.6,-.3),max=new T.Vector3(.3,1.5,.3),box=new T.Box3(min,max),tk={x:2,z:-3,y:.4,spec:{w:3,h:1.8,d:1.6},hAt:()=>.08,motion:{obstacles:[box]},fish:[]};
 const from=new T.Vector3(.9,1,0).add(new T.Vector3(tk.x,0,tk.z)),to=new T.Vector3(-.9,1,0).add(new T.Vector3(tk.x,0,tk.z)),p=aquariumCameraPosition(T,tk,from,to).sub(new T.Vector3(tk.x,0,tk.z));assert(p.x>.4);
 tk.motion.obstacles=[];tk.fish=[{box}];const inside=new T.Vector3(tk.x,1,tk.z),escaped=aquariumCameraPosition(T,tk,inside,inside).sub(new T.Vector3(tk.x,0,tk.z));assert(escaped.distanceTo(escaped.clone().clamp(min,max))>.104);
 const floor=aquariumCameraPosition(T,tk,from,new T.Vector3(tk.x,-3,tk.z));assert(floor.y>=tk.y+.08+.1);assert(Math.abs(floor.x-tk.x)<tk.spec.w/2);assert(Math.abs(floor.z-tk.z)<tk.spec.d/2);
});
test('aquarium materials use the actual 2K diffuse, normal and roughness textures with matching rock UV orientation',()=>{
 const src=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),loaded=[],context={T,TL:{load:(url,ready)=>{const t=new T.Texture({width:2048,height:2048});t.userData={url};loaded.push(t);ready(t);return t;}},R:{capabilities:{getMaxAnisotropy:()=>16}},tuneTextureSampling};vm.createContext(context);vm.runInContext(src.slice(src.indexOf('const aquariumTextures='),src.indexOf('const rockM=')),context);
 const sand=context.aquariumSand('sea',3.9,1.65);for(const k of ['map','normalMap','roughnessMap']){assert(sand[k].userData.url.includes('_2k.jpg'));assert.equal(sand[k].anisotropy,16);assert.equal(sand[k].repeat.x,3.9);assert.equal(sand[k].repeat.y,1.65);}
 const rock=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());context.aquariumRock(rock);assert.equal(rock.material.map.flipY,false);assert.equal(rock.material.normalMap.flipY,false);assert(rock.receiveShadow);
});
function jpegSize(b){let i=2;while(i<b.length){if(b[i++]!==255)continue;const marker=b[i++];if(marker===216||marker===217)continue;const n=b.readUInt16BE(i);if([192,193,194].includes(marker))return[b.readUInt16BE(i+5),b.readUInt16BE(i+3)];i+=n;}throw Error('JPEG dimensions missing');}
test('all nine HD source files are genuine 2048 textures and match their download hashes',()=>{
 const dir=require('node:path').join(__dirname,'../models/aquarium'),manifest=JSON.parse(fs.readFileSync(dir+'/SOURCES.json','utf8'));assert.equal(manifest.assets.length,9);for(const asset of manifest.assets){const bytes=fs.readFileSync(dir+'/'+asset.file);assert.deepEqual(jpegSize(bytes),[2048,2048]);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert(asset.source.includes('/2k/'));}
});
test('repeated plant model requests share one download and preserve asynchronous callbacks',()=>{
 const src=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),pending=[],context={GL:{load:(file,done)=>pending.push(done)},W:{qualityTextures:()=>{}}};vm.createContext(context);vm.runInContext(src.slice(src.indexOf('const tankModels='),src.indexOf('const tanks={}')),context);let count=0;context.loadTankModel('plant.glb',()=>count++);context.loadTankModel('plant.glb',()=>count++);assert.equal(pending.length,1);pending[0]({scene:new T.Group()});assert.equal(count,2);context.loadTankModel('plant.glb',()=>count++);assert.equal(count,3);assert.equal(pending.length,1);
});
