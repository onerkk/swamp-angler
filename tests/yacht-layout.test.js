const{test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js'),{staticGLB}=require('./native-glb.cjs'),{yachtStations,yachtAnglerPose}=require('../src/yacht-layout.js'),Physics=require('../src/physics.js'),{fishingLanding,fishingLandingTarget}=require('../src/landing.js');
global.FishingPhysics=Physics;
test('real Draco yacht has a standing fishing deck, separate helm and an outward clear cast',async()=>{
 const model=await staticGLB(require.resolve('../models/yacht.glb')),boat=new T.Group();boat.add(model);model.rotation.y=Math.PI;boat.updateMatrixWorld(true);/* Yacht II：原檔船頭朝 +z，跟 m.js attachYacht 一樣先轉 180° */let b=new T.Box3().setFromObject(boat),size=b.getSize(new T.Vector3());model.scale.setScalar(6/size.z);boat.updateMatrixWorld(true);b.setFromObject(boat);const c=b.getCenter(new T.Vector3());model.position.x-=c.x;model.position.z-=c.z;model.position.y-=b.min.y+(b.max.y-b.min.y)*.19;boat.updateMatrixWorld(true);
 const stations=yachtStations(T,boat);console.log('stations',JSON.stringify(stations));
 /* Scout 中控台釣魚艇：兩個站位都站在艙底板上（比水面高一點點），一個在船尾右舷、一個在中控台後面，前後分開 */
 assert(stations.fishing.deck>-.15&&stations.fishing.deck<.5,'fishing deck '+stations.fishing.deck);assert(stations.helm.deck>-.15&&stations.helm.deck<.5,'helm deck '+stations.helm.deck);assert(Math.abs(stations.fishing.z-stations.helm.z)>.8);
 for(const yaw of[0,.7,Math.PI]){boat.rotation.y=yaw;boat.position.set(23,.25,-19);for(const s of Object.values(stations)){const pose=yachtAnglerPose(T,boat,s),local=boat.worldToLocal(pose.position.clone());assert(Math.abs(local.y-s.deck-1.62)<1e-6);}
 const pose=yachtAnglerPose(T,boat,stations.fishing),direction=new T.Vector3(-Math.sin(yaw+pose.yaw),0,-Math.cos(yaw+pose.yaw));const ray=new T.Raycaster(pose.position,direction,0,15);assert.equal(ray.intersectObject(boat,true).length,0,'standing eye looks out to sea, not through cabin or deck');
 }
});
test('stern-side net targets are reachable from the actual angler, not boat centre',()=>{
 const p=new Physics();p.addBox({x:-2.88,y:-.8,z:-4.5},{x:2.88,y:2.03,z:21.5},()=>true,'船體');p.refresh();const angler={x:2.12,y:3.65,z:15},fish={x:8,y:-.35,z:15};const target=fishingLandingTarget(p,angler,fish,.5);assert(target.x>2.88);assert(Math.abs(target.z-15)<1);assert(fishingLanding(p,angler,target,.5,true).near);assert(!fishingLanding(p,{x:0,z:0},target,.5,true).near);
});
