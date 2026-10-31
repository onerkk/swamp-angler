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
