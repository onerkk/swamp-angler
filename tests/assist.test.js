const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createAccountAssist}=require('../src/assist.js');
const user={email:'crazyice5240@gmail.com',emailVerified:true,providerData:[{providerId:'google.com'}]};
test('assistance requires this verified Google account and ends on logout or account change',()=>{
 const a=createAccountAssist();assert.equal(a.active(),false);
 for(const u of [null,{...user,email:'other@gmail.com'},{...user,emailVerified:false},{...user,emailVerified:undefined},{...user,providerData:[{providerId:'password'}]},{...user,providerData:undefined}]) assert.equal(a.authenticate(u),false);
 assert.equal(a.authenticate({...user,email:user.email.toUpperCase()}),true);
 assert.equal(a.authenticate(null),false);a.authenticate(user);a.authenticate({...user,email:'other@gmail.com'});assert.equal(a.active(),false);
});
test('account grant preserves collected fish and story while providing money and map requirements',()=>{
 const a=createAccountAssist(),s={coins:10,lv:4,dex:{carp:{n:2}},story:{done:['c1']},home:{fresh:[{id:'carp'}]}};
 const before=JSON.stringify(s);assert.equal(a.grant(s),false);assert.equal(JSON.stringify(s),before);
 a.authenticate(user);a.grant(s);assert.equal(s.coins,9999999);assert.equal(s.lv,60);assert(s.kayak&&s.yacht);assert.equal(s.mer.n,20);
 assert.deepEqual(s.dex,{carp:{n:2}});assert.deepEqual(s.story,{done:['c1']});assert.equal(s.home.fresh.length,1);
 s.coins=12000000;a.grant(s);assert.equal(s.coins,12000000);assert.equal(s.easy,undefined);
});
test('digging finishes quickly and intact for every burrowing creature; ordinary accounts keep normal digging',()=>{
 const s=fs.readFileSync(require.resolve('../src/tide.js'),'utf8');
 const fn=s.slice(s.indexOf('function assistDig('),s.indexOf('function digTick('));
 for(const k of ['hardclam','gomphina','tellin','razor','ghostcrab','ragworm']){
  const a=createAccountAssist();let taken=0,exposed=0;const c={window:{__ASSIST:a},easy:()=>a.active(),dig:{k,phase:'dig',crea:{},dmg:3,mud:true,fled:true},exposeCrea:()=>exposed++,takeOut:()=>{taken++;c.dig.phase='lift';}};
  vm.createContext(c);vm.runInContext(fn,c);assert.equal(c.assistDig(1),false);assert.equal(taken,0);
  a.authenticate(user);assert.equal(c.assistDig(.1),false);assert.equal(c.assistDig(.15),true);assert.equal(taken,1);assert.equal(exposed,1);assert.equal(c.dig.dmg,0);assert.equal(c.dig.mud,false);assert.equal(c.dig.fled,false);
  c.assistDig(1);assert.equal(taken,1);
 }
});
test('account map bypass does not mark story chapters complete',()=>{
 const s=fs.readFileSync(require.resolve('../src/v.js'),'utf8'),fn=s.slice(s.indexOf('function lock('),s.indexOf('function active('));
 const a=createAccountAssist(),st={grand:[]},c={window:{__ASSIST:a},SPOT_IDS:['sea'],st,CH:[{spot:'sea'}],why:()=>['完成前章']};
 vm.createContext(c);vm.runInContext(fn,c);assert(c.lock(0));a.authenticate(user);assert.equal(c.lock(0),null);a.authenticate(null);assert(c.lock(0));assert.deepEqual(st,{grand:[]});
});
async function cloudFixture(cloud){
 const a=createAccountAssist(),saved={coins:10,lv:1,dex:{}},writes=[],grants=[];let changed,applied=null;
 const ref={get:async()=>({exists:!!cloud,data:()=>({save:cloud})}),set:async d=>writes.push(d)};
 const auth={setPersistence:async()=>{},getRedirectResult:async()=>null,onAuthStateChanged:cb=>{changed=cb;}};
 const authFactory=()=>auth;authFactory.Auth={Persistence:{LOCAL:'local'}};
 const ctx={console,Promise,Date,JSON,navigator:{},localStorage:{getItem:()=> '1',setItem:()=>{}},setTimeout:()=>1,clearTimeout:()=>{},
  document:{addEventListener:()=>{},head:{appendChild:s=>queueMicrotask(()=>s.onload())},createElement:()=>({})},
  window:{FIREBASE_CFG:{},__ASSIST:a,addEventListener:()=>{}},firebase:{initializeApp:()=>{},auth:authFactory,firestore:()=>({collection:()=>({doc:()=>ref})})}};
 vm.createContext(ctx);const code=fs.readFileSync(require.resolve('../src/y.js'),'utf8').split('/* ===== 安裝到桌面')[0];
 vm.runInContext(code,ctx);ctx.createCloud({save:()=>saved,toast:()=>{},refresh:()=>{},assistGrant:()=>{a.grant(saved);grants.push(saved.coins);},apply:s=>{a.grant(s);applied=s;}});
 await new Promise(setImmediate);
 return {a,saved,writes,grants,applied:()=>applied,login:async u=>{changed(u);await new Promise(setImmediate);}};
}
test('real auth callback grants after normal cloud sync and disables assistance for another account',async()=>{
 const c=await cloudFixture(null);await c.login(user);assert(c.a.active());assert.equal(c.saved.coins,9999999);assert.equal(c.grants.length,1);
 await c.login({...user,email:'other@gmail.com'});assert.equal(c.a.active(),false);await c.login(null);assert.equal(c.a.active(),false);
});
test('loading a higher cloud save grants incoming data without overwriting it with old local progress',async()=>{
 const c=await cloudFixture({coins:500,lv:30,dex:{tuna:{n:12}},story:{done:['c1','c2']}});await c.login(user);
 assert.equal(c.applied().coins,9999999);assert.equal(c.applied().dex.tuna.n,12);assert.equal(c.saved.coins,10);assert.equal(c.grants.length,0);
});
test('production tide spawners multiply populated digging points and surface creatures fourfold',()=>{
 const T=require('../vendor/three.min.js'),a=createAccountAssist(),code=fs.readFileSync(require.resolve('../src/tide.js'),'utf8');
 const src=code.slice(code.indexOf('function spawnSigns('),code.indexOf('/* ---------- 泥面上的活生物'))+'\n'+code.slice(code.indexOf('function spawnRoamers('),code.indexOf('/* ---------- 狀態'));
 const mat=new T.MeshBasicMaterial(),kinds=['hole','key','slit','pellet','burrow','cast','flat'];
 const c={T,window:{__ASSIST:a},easy:()=>a.active(),S:new T.Scene(),signs:[],roamers:[],CR:{hardclam:{sign:'hole'},razor:{sign:'slit'},ghostcrab:{sign:'burrow'}},DEC:Object.fromEntries(kinds.map(k=>[k,mat])),TIDETEST:false,rand:(x,y)=>(x+y)/2,hAt:()=>0,signDetail:()=>null,creaReady:()=>true,creaModel:()=>({group:new T.Group(),uni:{}}),c:{species:()=>({len:[4,8]})}};
 vm.createContext(c);vm.runInContext(src,c);c.spawnSigns();c.spawnRoamers();const holes=c.signs.length,creatures=c.roamers.length;
 a.authenticate(user);c.spawnSigns();c.spawnRoamers();assert.equal(c.signs.length,holes*4);assert.equal(c.roamers.length,creatures*4);assert(c.signs.every(s=>s.k));
 a.authenticate(null);c.spawnSigns();c.spawnRoamers();assert.equal(c.signs.length,holes);assert.equal(c.roamers.length,creatures);
});
