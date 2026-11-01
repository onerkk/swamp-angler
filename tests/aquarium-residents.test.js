const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),T=require('../vendor/three.min.js'),A=require('../src/aquarium.js');
const source=fs.readFileSync(require.resolve('../src/w.js'),'utf8'),tide=fs.readFileSync(require.resolve('../src/tide.js'),'utf8'),ids=['hardclam','gomphina','tellin','razor','ghostcrab','fiddler','hermit','ragworm','mudskip'];
function fixture(deferred=false){const buildJobs=[];
 const callbacks=[],timers=[],api={...T,TextureLoader:class{load(file,onLoad){const t=new T.Texture();t.userData={file};if(onLoad)callbacks.push(()=>onLoad(t));return t;}}},models={T:api,window:{},setInterval:f=>{timers.push(f);return timers.length;},clearInterval:()=>{},performance:{now:()=>0}};vm.createContext(models);vm.runInContext(tide.slice(tide.indexOf('const SHELLS='),tide.indexOf('/* ---------- 挖掘（3D 實景）'))+'\nthis.make=id=>creaModel({id});',models);
 const spec=A.aquariumSpecs()[3],records=ids.map((id,i)=>({id,L:id==='mudskip'?.14:.04,w:.03,d:i+1})),fish={id:'giant',L:25,w:200,d:100},saved={tier:3,seaTier:3,seaTank:true,fresh:[fish],sea:records},tank=()=>{const g=new T.Group(),y=.55,hAt=(x,z)=>.07+(spec.d/2-z)/spec.d*.1;return{g,y,hAt,spec,fish:[],sig:'',motion:A.createAquariumMotion(T,{min:new T.Vector3(-spec.w/2+.035,y+.025,-spec.d/2+.035),max:new T.Vector3(spec.w/2-.035,y+spec.h-.1,spec.d/2-.035),floor:(x,z)=>y+hAt(x,z)+.009}),plants:[],bub:new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(0),3)))}};
 const fresh=tank(),sea=tank(),context={homeWork:{add:fn=>deferred?buildJobs.push(fn):fn()},T,...A,...require('../src/home-runtime.js'),W:{qualityTextures:()=>{}},window:{__TIDE:{makeModel:models.make}},tanks:{_tier:'t3s3',fresh,sea},TSPEC:A.aquariumSpecs(),SEA_SPECS:A.aquariumSpecs(),ROOM:{x:4.4},BENTHIC:{hardclam:'shell',gomphina:'shell',tellin:'shell',razor:'razor',ghostcrab:'crab',fiddler:'crab',hermit:'crab',ragworm:'worm',mudskip:'skip'},c:{data:()=>saved,species:id=>({id}),want:()=>{},isReal:()=>true,getFish:()=>{const group=new T.Group();group.add(new T.Mesh(new T.BoxGeometry(1,.3,.2),new T.MeshStandardMaterial()));return{group};}},rigFish:()=>[],t:0,tv:new T.Vector3(),tv2:new T.Vector3(),tv3:new T.Vector3(),causList:[],shaftList:[],swimBones:()=>{},console};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function fishObj('),source.indexOf('// 執行時綁骨：'))+source.slice(source.indexOf('function dispL('),source.indexOf('// 標本牆：'))+source.slice(source.indexOf('function benthic('),source.indexOf('// 環境光：')),context);
 return{buildJobs,context,models,saved,fresh,sea,load:()=>{callbacks.splice(0).forEach(f=>f());timers.forEach(f=>f());}};
}
test('all nine saved bottom species remain present, readable and tappable beside a giant fish',()=>{
 const f=fixture(),before=JSON.stringify(f.saved);f.saved.sea.unshift({id:'giant',L:25,w:200,d:200});const expected=JSON.stringify(f.saved);f.context.syncFish();assert.equal(f.sea.fish.length,10);
 for(const creature of f.sea.fish.filter(c=>c.bottom)){const box=A.aquariumModelBounds(T,creature.o,true),length=box.getSize(new T.Vector3()).toArray().reduce((a,b)=>Math.max(a,b));assert(length>=.17&&length<.4,creature.rec.id+' lost readable size');assert.equal(creature.o.userData.rec,creature.rec);assert(f.sea.motion.valid(creature));}
 assert.equal(JSON.stringify(f.saved),expected);assert.notEqual(before,expected);
});
test('late shell textures and native walking animation do not overwrite the calibration pivot or bury residents',()=>{
 const f=fixture();f.context.syncFish();const scales=f.sea.fish.map(o=>o.o.scale.x);f.load();
 for(let step=0;step<180;step++){f.context.t=step/30;f.context.updTanks(1/30);for(const creature of f.sea.fish){const pivot=creature.o.children[0],calibration=pivot.position.clone();creature.o.traverse(m=>{if(m.isMesh&&typeof m.onBeforeRender==='function')m.onBeforeRender();});assert(pivot.position.distanceTo(calibration)<1e-9);const box=A.aquariumModelBounds(T,creature.o);assert(!box.isEmpty(),creature.rec.id+' invisible');assert(box.max.y>f.sea.y+.06,creature.rec.id+' buried');assert(f.sea.motion.valid(creature));}}
 f.context.syncFish();assert.deepEqual(f.sea.fish.map(o=>o.o.scale.x),scales,'texture completion must not shrink models again');
});
test('unavailable bottom models retry automatically when the native factory becomes ready',()=>{
 const f=fixture();f.context.window.__TIDE=null;f.context.syncFish();assert.equal(f.sea.fish.length,0);assert.equal(f.sea.pending.length,ids.length);const saved=JSON.stringify(f.saved);f.context.window.__TIDE={makeModel:f.models.make};f.context.syncFish();assert.equal(f.sea.fish.length,ids.length);assert.equal(JSON.stringify(f.saved),saved);
});
test('one unavailable resident retries without recreating the residents that already loaded',()=>{
 const f=fixture(),make=f.models.make;let ready=false,attempts=0;f.context.window.__TIDE.makeModel=id=>{if(id==='ghostcrab'&&!ready){attempts++;return null;}return make(id);};f.context.syncFish();assert.equal(f.sea.fish.length,8);const stable=f.sea.fish.map(x=>x.o),fresh=f.fresh.fish[0].o;for(let i=0;i<20;i++)f.context.syncFish();assert.equal(attempts,21);assert.deepEqual(f.sea.fish.map(x=>x.o),stable);assert.equal(f.fresh.fish[0].o,fresh);ready=true;f.context.syncFish();assert.equal(f.sea.fish.length,9);assert.equal(f.sea.pending.length,0);for(const o of stable)assert(f.sea.fish.some(x=>x.o===o));
});

test('resident creation is spread across frames and repeated synchronization never queues duplicates',()=>{
 const f=fixture(true);f.context.syncFish();assert.equal(f.sea.fish.length,0);const count=f.buildJobs.length;assert.equal(count,10);f.context.syncFish();assert.equal(f.buildJobs.length,count);f.buildJobs.shift()();assert.equal(f.fresh.fish.length+f.sea.fish.length,1);while(f.buildJobs.length)f.buildJobs.shift()();assert.equal(f.sea.fish.length,9);assert.equal(f.fresh.fish.length,1);
});
test('a changed layout cancels old queued residents without suppressing replacements',()=>{
 const f=fixture(true);f.context.syncFish();f.saved.sea=f.saved.sea.slice(0,3);f.context.syncFish();while(f.buildJobs.length)f.buildJobs.shift()();assert.equal(f.sea.fish.length,3);assert.equal(f.fresh.fish.length,1);
});
test('a single newly ready real fish keeps all unrelated aquarium models alive',()=>{
 const f=fixture();f.context.c.isReal=()=>false;f.context.syncFish();const stable=f.sea.fish.map(x=>x.o),old=f.fresh.fish[0].o;f.context.c.isReal=id=>id==='giant';f.context.syncFish();assert.notEqual(f.fresh.fish[0].o,old);assert.deepEqual(f.sea.fish.map(x=>x.o),stable);
});
