const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js'),{aquariumSpecs,aquariumDisplayLength,aquariumModelBounds,createAquariumMotion}=require('../src/aquarium.js');
function fixture(){const scene=new T.Scene(),tank=new T.Group();tank.position.set(3,0,-4);scene.add(tank);return{tank,motion:createAquariumMotion(T,{min:new T.Vector3(-2,0,-1),max:new T.Vector3(2,2,1),floor:(x,z)=>.05+.03*(1-z)})};}
function fish(motion,x=0,y=1,z=0,length=.5){const o=new T.Group();o.add(new T.Mesh(new T.BoxGeometry(length,.14,.1),new T.MeshBasicMaterial()));const body=aquariumModelBounds(T,o).expandByScalar(.02),f={o,body};o.position.set(x,y,z);motion.add(f);return f;}
function move(motion,f,x,y,z,yaw=f.o.rotation.y){const p=f.o.position.clone(),q=f.o.quaternion.clone();f.o.position.set(x,y,z);f.o.rotation.y=yaw;return motion.move(f,p,q);}
test('all tiers gain actual water volume and both maximum tanks fit against the cabin wall',()=>{
 const old=[[1.2,.6,.45],[1.8,.75,.55],[2.6,1,.7],[3.4,1.2,.8]],spec=aquariumSpecs();
 for(let i=0;i<4;i++){const s=spec[i];assert(s.w*s.h*s.d>old[i].reduce((a,b)=>a*b)*3);assert(s.st+s.h+.36<2.9);assert(s.w/2+4.4*.48<4.4);}
 assert(aquariumDisplayLength(spec[3],50,30)<spec[3].d*.6);
});
test('swept fish motion cannot tunnel through rocks or the glass on a slow frame',()=>{
 const {motion,tank}=fixture(),rock=new T.Mesh(new T.BoxGeometry(.12,1.5,1.5));rock.position.y=.8;tank.add(rock);motion.addObstacle(rock,tank);
 const f=fish(motion,-1,1);assert(motion.valid(f));assert(!move(motion,f,1,1,0));assert(f.o.position.x<-.3);assert(motion.valid(f));
 const g=fish(motion,1,1,.85);motion.pack();assert(!move(motion,g,1,1,4));assert(motion.valid(g));
});
test('two fish cannot exchange positions or overlap their complete bodies',()=>{
 const {motion}=fixture(),a=fish(motion,-.6),b=fish(motion,.6);
 assert(!move(motion,a,1,1,0));assert(!move(motion,b,-1,1,0));assert(motion.valid(a)&&motion.valid(b));assert(a.box.max.x<b.box.min.x);
});
test('rotation checks the tail and fins instead of just the fish center',()=>{
 const {motion}=fixture(),a=fish(motion,0,1,.8,1.1);assert(motion.valid(a));
 assert(!move(motion,a,0,1,.8,Math.PI/2));assert(motion.valid(a));assert(a.o.rotation.y<Math.PI/2);
});
test('asynchronously loaded rocks cause a safe repack in tank-local coordinates',()=>{
 const {motion,tank}=fixture(),a=fish(motion),rock=new T.Mesh(new T.BoxGeometry(.8,1.5,.8));rock.position.y=.8;tank.add(rock);motion.addObstacle(rock,tank);
 assert(motion.obstacles[0].min.x<0&&motion.obstacles[0].max.x>0);assert(motion.valid(a));assert(a.o.visible);
});
test('maximum population and bottom creatures remain separated from scenery and sand',()=>{
 const {motion,tank}=fixture(),rock=new T.Mesh(new T.BoxGeometry(.8,1.1,.55));rock.position.set(-.5,.55,-.25);tank.add(rock);motion.addObstacle(rock,tank);
 for(let i=0;i<30;i++){const f=fish(motion,0,.1,0,.55);if(i%5===0)f.bottom=true;}
 assert(motion.pack());assert.equal(motion.bodies.length,30);for(const f of motion.bodies)assert(motion.valid(f));
 for(let i=0;i<300;i++)for(const f of motion.bodies){const p=f.o.position.clone(),q=f.o.quaternion.clone(),d=motion.steer(f,new T.Vector3(Math.sin(i*.1),0,Math.cos(i*.1))).multiplyScalar(.006);f.o.position.add(d);f.o.rotation.y+=.01;if(f.bottom)motion.ground(f);motion.move(f,p,q);assert(motion.valid(f));}
});
test('body measurements preserve off-center models and ignore hidden placeholder meshes',()=>{
 const o=new T.Group(),real=new T.Mesh(new T.BoxGeometry(1,.3,.2)),hidden=new T.Group();real.position.x=.2;hidden.visible=false;hidden.add(new T.Mesh(new T.BoxGeometry(100,100,100)));o.add(real,hidden);o.scale.setScalar(.5);
 const b=aquariumModelBounds(T,o);assert(Math.abs(b.min.x+.15)<1e-6);assert(Math.abs(b.max.x-.35)<1e-6);assert(b.getSize(new T.Vector3()).y<.16);
});
test('the real home update swims around scenery while enforcing collisions every frame',()=>{
 const fs=require('fs'),vm=require('vm'),source=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),{motion,tank}=fixture();
 const rock=new T.Mesh(new T.BoxGeometry(.55,.95,.55));rock.position.set(0,.55,0);tank.add(rock);motion.addObstacle(rock,tank);
 const tk={g:tank,motion,spec:{w:4,h:2,d:2},y:0,fish:[],plants:[],bub:new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(0),3)))};
 for(let i=0;i<8;i++){const f=fish(motion,(i-4)*.35,1.3,(i%2?-.4:.4),.4);Object.assign(f,{rec:{id:'fish',L:.4},tgt:new T.Vector3(),sp:.15,yaw:0});tk.fish.push(f);}assert(motion.pack());
 const context={T,t:0,tanks:{fresh:tk},causList:[],shaftList:[],BENTHIC:{},tv:new T.Vector3(),tv2:new T.Vector3(),tv3:new T.Vector3(),aquariumDisplayLength,swimBones:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function dispL('),source.indexOf('function syncFish('))+source.slice(source.indexOf('function updTanks('),source.indexOf('// 環境光：')),context);
 for(const f of tk.fish)context.pickTarget(f,tk);const starts=tk.fish.map(f=>f.o.position.clone());
 for(let i=0;i<1800;i++){context.t=i/60;context.updTanks(1/60);for(const f of tk.fish)assert(motion.valid(f));}
 assert(tk.fish.filter((f,i)=>f.o.position.distanceTo(starts[i])>.15).length>=6,'fish should continue swimming, not freeze at the first obstruction');
});
test('aquarium fish cloning keeps hidden fallback models hidden',()=>{
 const fs=require('fs'),vm=require('vm'),s=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),group=new T.Group(),hidden=new T.Group();hidden.visible=false;hidden.add(new T.Mesh(new T.BoxGeometry(100,100,100)));group.add(new T.Mesh(new T.BoxGeometry(1,.2,.1)),hidden);
 const c={T,window:{},BENTHIC:{},rigFish:()=>[],c:{species:()=>({}),getFish:()=>({group}),isReal:()=>true}};vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function fishObj('),s.indexOf('// 執行時綁骨：')),c);
 const o=c.fishObj({id:'test',L:1});assert(aquariumModelBounds(T,o).getSize(new T.Vector3()).length()<2);assert.equal(o.children[0].children[1].visible,false);
});
test('complete skinned tail strokes and maximum bends stay inside the collision envelope',()=>{
 const fs=require('fs'),vm=require('vm'),s=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),c={T};vm.createContext(c);vm.runInContext('const NB_=7;\n'+s.slice(s.indexOf('function rigFish('),s.indexOf('// 依缸深')),c);
 const root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(1,.3,.22,36,2,2),new T.MeshStandardMaterial()));root.userData.bones=c.rigFish(root);
 const {aquariumBodyBounds}=require('../src/aquarium.js'),body=aquariumBodyBounds(aquariumModelBounds(T,root),1);
 for(const turn of [-.5,.5])for(let phase=0;phase<200;phase++){
  c.swimBones({o:root,v:.17,sw:phase*.04,turnRate:turn},0);root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const p=o.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){o.boneTransform(i,v);assert(body.containsPoint(v),'animated fin or tail exceeds collider');}});
 }
});
test('display scaling preserves relative lengths and leaves room for every body shape to turn',()=>{
 const {aquariumFitScale,aquariumBodyBounds}=require('../src/aquarium.js');for(const spec of aquariumSpecs()){
  const records=[{L:50},{L:10},{L:1}],scale=aquariumFitScale(spec,records);assert(Math.abs((records[0].L*scale)/(records[1].L*scale)-5)<1e-10);assert(records[0].L*scale<spec.d*.3);
  for(const ratio of [[1,.25,.12],[1,.95,.12],[1,.1,.9]]){const L=records[0].L*scale,b=aquariumBodyBounds(new T.Box3(new T.Vector3(-L/2,-L*ratio[1]/2,-L*ratio[2]/2),new T.Vector3(L/2,L*ratio[1]/2,L*ratio[2]/2)),L);assert(b.getSize(new T.Vector3()).length()<spec.d*.65);}
 }
});
test('real home swimming and bottom crawling keep all 30 creatures moving within fixed tanks',()=>{
 const fs=require('fs'),vm=require('vm'),source=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),A=require('../src/aquarium.js'),spec=aquariumSpecs()[3],floor=(x,z)=>.07+(spec.d/2-z)/spec.d*.1;
 const tank=new T.Group(),motion=createAquariumMotion(T,{min:new T.Vector3(-spec.w/2+.035,.025,-spec.d/2+.035),max:new T.Vector3(spec.w/2-.035,spec.h-.1,spec.d/2-.035),floor});
 for(const [x,z,size]of [[-.7,-.35,.55],[.5,-.3,.4],[1.2,-.3,.25]]){const o=new T.Mesh(new T.BoxGeometry(size,size,size));o.position.set(x,.08+size/2,z);tank.add(o);motion.addObstacle(o,tank);}
 const records=Array.from({length:30},(_,i)=>({id:i%7===0?'ghostcrab':'fish',L:i%3===0?50:i%3===1?10:3})),scale=A.aquariumFitScale(spec,records),tk={g:tank,motion,spec,y:0,fitScale:scale,fish:[],plants:[],hAt:floor,bub:new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(0),3)))};
 for(const rec of records){const length=Math.max(.018,rec.L*scale),bottom=rec.id==='ghostcrab',o=new T.Group(),h=length*(bottom?.3:.55),d=length*(bottom?.8:.2);o.add(new T.Mesh(new T.BoxGeometry(length,h,d)));const body=A.aquariumBodyBounds(aquariumModelBounds(T,o),length,bottom),f={o,body,rec,bottom,tgt:new T.Vector3(),sp:.16,yaw:0};o.position.set(0,.7,0);motion.add(f);tk.fish.push(f);}
 assert(motion.pack());const context={T,t:0,tanks:{fresh:tk},causList:[],shaftList:[],BENTHIC:{ghostcrab:'crab'},tv:new T.Vector3(),tv2:new T.Vector3(),tv3:new T.Vector3(),swimBones:()=>{}};vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function dispL('),source.indexOf('function syncFish('))+source.slice(source.indexOf('function benthic('),source.indexOf('// 環境光：')),context);
 const distance=new Map(tk.fish.map(f=>[f,0]));for(let i=0;i<2400;i++){context.t=i/60;const prev=tk.fish.map(f=>f.o.position.clone());context.updTanks(1/60);tk.fish.forEach((f,j)=>{assert(motion.valid(f));distance.set(f,distance.get(f)+f.o.position.distanceTo(prev[j]));});}
 for(const f of tk.fish)assert(distance.get(f)>.07,`${f.rec.id} length ${f.rec.L} stuck; distance ${distance.get(f)} position ${f.o.position.toArray()} path ${JSON.stringify(f.path)} turn ${motion.turnClear(f,f.o.position)} v ${f.v} yaw ${f.yaw}`);
});
test('already-skinned native fish receive independent aquarium bones without changing their bind pose',()=>{
 const fs=require('fs'),vm=require('vm'),s=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),c={T};vm.createContext(c);vm.runInContext('const NB_=7;\n'+s.slice(s.indexOf('function rigFish('),s.indexOf('// 依缸深')),c);
 const root=new T.Group(),old=new T.SkinnedMesh(new T.BoxGeometry(1,.3,.2,16,2,2),new T.MeshStandardMaterial());old.rotation.y=.4;old.position.set(.2,.3,-.1);root.add(old);const bones=c.rigFish(root);assert.equal(bones.length,1);
 const skinned=root.children[0];root.updateMatrixWorld(true);skinned.skeleton.update();const p=skinned.geometry.attributes.position,v=new T.Vector3(),a=new T.Vector3();for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i);skinned.boneTransform(i,v);assert(v.distanceTo(a)<1e-6,'bind pose distorts source');}
});
test('a blocked forward step still lets a fish pivot away from a wall',()=>{
 const {motion}=fixture(),f=fish(motion,1.5,1,0,.5);assert(motion.pack());let x=1;while(motion.turnClear(f,new T.Vector3(x+.001,1,0)))x+=.001;f.o.position.set(x-.00001,1,0);motion.refresh(f);
 const old=f.o.position.clone(),q=f.o.quaternion.clone();f.o.position.x+=.05;f.o.rotation.y=.08;assert(!motion.move(f,old,q));assert(f.o.rotation.y>.04,'blocked translation froze the turn');assert(motion.valid(f));
});
