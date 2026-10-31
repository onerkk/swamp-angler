const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const T=require('../vendor/three.min.js'),Physics=require('../src/physics.js');
const source=fs.readFileSync(require.resolve('../src/d.js'),'utf8');
const extract=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf('\nfunction '+next+'(',source.indexOf('function '+name+'(')));
const no=()=>{},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fixture(){
 const PH=new Physics(),V=()=>new T.Vector3(),obj=()=>new T.Object3D();
 const G={state:'fight',loc:'lake',spot:1,head:0,yawT:0,rodSide:0,t:0,held:true,bottom:false,base:V(),to:V(),endV:V(),fish:{group:obj(),uni:{uAmp:{value:0},uSwim:{value:0}}},fd:{sp:{id:'test',rar:0,f:{pow:.4,spd:1,agi:1,jump:0,stam:1}},L:.5,w:.2}};
 G.f={pos:new T.Vector3(0,-.35,-12),d:12,az0:0,theta:0,latDir:0,phaseT:999,run:false,stam:100,T:.4,drag:1,brk:0,slk:0,abr:0,jumpT:0,ripT:99,vibT:99,clickA:0,hq:1};
 const ui={};for(const k of ['tBar','tFill','fTens','sFill','fStam','fDist','fName','steer','netBtn'])ui[k]={style:{},classList:{toggle:no,add:no,remove:no}};
 const context={SPOTS:[{},{kayak:false,yacht:false}],FishingPhysics:Physics,easy:()=>!!context.window.__ASSIST?.active(),T,G,PH,ui,window:{},tv:V(),te:new T.Euler(),tq:new T.Quaternion(),rod:{tipW:new T.Vector3(0,2,0),spin:0},bob:obj(),P:{shadow:obj(),splash:no},W:{shoreR:()=>1000,addRipple:no,swell:()=>0},WL:{stolen:()=>false,chaseTxt:()=>''},SEA:{stolen:()=>false},Snd:{click:no,splash:no,snap:no},D:()=>({line:1,stam:1,slack:1,jit:0}),styOf:()=>({spd:1,lat:1,mul:1}),META:{gear:()=>({line:{s:1},rod:{tens:1},reel:{spd:2,drag:1}})},TR:()=>0,clamp,sstep:(a,b,x)=>clamp((x-a)/(b-a),0,1),rand:(a,b)=>(a+b)/2,vib:no,toast:no,setAct:no,stars:()=>'',sizeWord:()=>'',maxLine:()=>80,lose:r=>{G.state='lost';G.reason=r;},land:()=>{G.state='land';},setPoint:(v,p)=>v.set(p.x,p.y,p.z),LURE:{end:no},startRetrieve:()=>{G.state='retrieve';}};
 context.P.shadow.material={opacity:0}; vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../src/landing.js'),'utf8')+'\n'+extract('fishPos','surgeFish')+'\n'+extract('surgeFish','sizeWord')+'\n'+extract('snagTick','startCharge')+'\n'+extract('updateFight','update'),context);
 return context;
}
test('actual fight update stops reeling fish at an intervening solid structure',()=>{
 const c=fixture();c.PH.addBox({x:-2,y:-2,z:-10},{x:2,y:4,z:-9},()=>true,'木樁');c.PH.refresh();
 for(let i=0;i<300;i++){c.G.t+=.02;c.updateFight(.02);assert(c.PH.clear(c.G.f.pos,.109));}
 assert(c.G.f.pos.z< -10);assert.equal(c.G.f.cover,1);assert(c.G.f.abr>0);assert.notEqual(c.G.state,'land');
});
test('open-water fight update reels normally without phantom abrasion',()=>{
 const c=fixture();c.PH.refresh();for(let i=0;i<50;i++){c.G.t+=.02;c.updateFight(.02);}assert(c.G.f.d<12);assert.equal(c.G.f.abr,0);assert.equal(c.G.f.cover,0);
});
test('rod pressure changes actual fish position',()=>{const a=fixture(),b=fixture();a.G.rodSide=1;b.G.rodSide=-1;a.PH.refresh();b.PH.refresh();a.updateFight(.05);b.updateFight(.05);assert(a.G.f.pos.x>b.G.f.pos.x);});
test('snag does not break immediately but sustained forced retrieval breaks it',()=>{const c=fixture();c.G.state='wait';c.G.snag=true;c.G.snagStress=0;c.G.snagYaw=0;c.G.held=true;c.snagTick(.05);assert.equal(c.G.state,'wait');for(let i=0;i<40&&c.G.snag;i++)c.snagTick(.05);assert.equal(c.G.state,'lost');assert(c.G.snapped);});
test('unloading and changing angle backs tackle out of the contact',()=>{const c=fixture();c.G.state='wait';c.G.snag=true;c.G.snagStress=.5;c.G.snagYaw=0;c.G.yawT=.4;c.G.held=false;c.G.snagFrom=new T.Vector3(-1,0,0);c.bob.position.set(0,0,0);for(let i=0;i<20&&c.G.snag;i++)c.snagTick(.05);assert.equal(c.G.snag,false);assert.equal(c.G.state,'retrieve');assert(c.bob.position.x<0);});

test('ice fishing retains line depth rather than horizontal hole distance',()=>{const c=fixture();c.G.loc='ice';c.G.f.pos.set(0,-.35,-2);c.PH.refresh();c.updateFight(.05);assert(c.G.f.d>11);assert.equal(c.G.state,'fight');});

test('fighting bobber follows the shared animated water height',()=>{const a=fixture(),b=fixture();a.W.swell=()=>.7;b.W.swell=()=>0;a.PH.refresh();b.PH.refresh();a.updateFight(.02);b.updateFight(.02);assert(Math.abs(a.bob.position.y-b.bob.position.y-.7)<1e-6);});

const {createAccountAssist}=require('../src/assist.js');
test('verified account lands ordinary, legendary and boss fish without equipment or timing failures',()=>{
 for(const loc of ['lake','sea','ice']) for(const special of [undefined,'mermaid','king','seabeast']){
  const c=fixture(), assist=createAccountAssist();
  assist.authenticate({email:'crazyice5240@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]});
  c.window.__ASSIST=assist;c.G.loc=loc;c.G.fd.sp.special=special;c.G.fd.boss=special==='king';c.G.fd.L=12;c.G.fd.w=1200;
  c.G.held=false;c.G.f.brk=100;c.G.f.slk=100;c.G.f.abr=100;c.G.f.lostWhy='spool';
  for(let i=0;i<11&&c.G.state==='fight';i++)c.updateFight(.1);
  assert.equal(c.G.state,'land');assert.equal(c.G.f.brk,0);assert.equal(c.G.f.lostWhy,null);
 }
});
test('signing out removes automatic landing immediately',()=>{
 const c=fixture(), assist=createAccountAssist();c.window.__ASSIST=assist;
 assist.authenticate({email:'crazyice5240@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]});
 assist.authenticate(null);c.PH.refresh();c.updateFight(.02);assert.equal(c.G.state,'fight');assert.equal(c.G.f.assistT,undefined);
});
function yachtFight(yaw=0){const c=fixture();c.G.loc='sea';c.SPOTS[1]={yacht:true};const h=c.PH.addBox({x:-2,y:-.8,z:-4.5},{x:2,y:1.7,z:21.5},()=>true,'船體');h.boxes[0].frame={x:0,z:0,head:yaw};c.PH.refresh();const p=Physics.world({x:0,y:-.35,z:-8},h.boxes[0]);c.G.f.pos.set(p.x,p.y,p.z);c.G.f.az0=yaw;c.G.f.stam=10;c.G.head=yaw;return c;}
test('boat bow landing becomes available outside hull beyond the old 2.6 metre limit',()=>{
 for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){const c=yachtFight(yaw);for(let i=0;i<500&&!c.G.f.netOn;i++){c.updateFight(.02);assert(c.PH.clear(c.G.f.pos,.109));}assert.equal(c.G.f.netOn,true);assert(c.G.f.d>4.5);assert.equal(c.G.state,'fight');assert.equal(c.G.f.cover,0);c.G.f.netGo=true;c.updateFight(.02);assert.equal(c.G.state,'land');assert.equal(c.G.f.netted,true);}
});
test('rock between rod and boat-side fish still prevents landing',()=>{const c=yachtFight();c.PH.addBox({x:-2,y:-2,z:-5.05},{x:2,y:4,z:-4.95},()=>true,'礁岩');c.PH.refresh();for(let i=0;i<100;i++)c.updateFight(.02);assert.equal(c.G.f.netOn,false);assert.equal(c.G.f.cover,1);assert.notEqual(c.G.state,'land');});
test('moving away from the rail clears stale net presses',()=>{const c=yachtFight();c.G.f.netOn=true;c.G.f.netGo=true;c.G.f.pos.z=-15;c.updateFight(.02);assert.equal(c.G.f.netOn,false);assert.equal(c.G.f.netGo,false);assert.equal(c.G.state,'fight');});
test('cannot net a fish from the far stern through the length of the yacht',()=>{const c=yachtFight();c.G.f.pos.set(0,-.35,21.8);c.G.f.az0=Math.PI;c.updateFight(.02);assert.equal(c.G.f.netOn,false);assert.equal(c.G.state,'fight');});
test('assisted boat catch follows clear water to the rail then automatically nets',()=>{for(const yaw of [0,.7]){const c=yachtFight(yaw),assist=createAccountAssist();assist.authenticate({email:'crazyice5240@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]});c.window.__ASSIST=assist;for(let i=0;i<30&&c.G.state==='fight';i++){c.updateFight(.05);assert(c.PH.clear(c.G.f.pos,.109));}assert.equal(c.G.state,'land');assert.equal(c.G.f.netted,true);assert(c.G.f.d>4.5);}});
