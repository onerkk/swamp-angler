const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js');
const {FISHING_VIEW,fishingViewPitch,underwaterViewDistance,catchViewPosition}=require('../src/presentation.js');
test('surface camera keeps the float in the clear central area across lake, sea and ice distances',()=>{
 for(const [eye,d]of [[2.4,8],[2.4,20],[2.4,60],[4.5,15],[4.5,45],[1.6,1.6]]){
  const cam=new T.PerspectiveCamera(FISHING_VIEW.fovPortrait,390/844,.04,2000);cam.position.y=eye;cam.rotation.x=fishingViewPitch('wait',d,eye,eye>3);cam.updateMatrixWorld(true);
  const p=new T.Vector3(0,0,-d).project(cam);assert(Math.abs(p.x)<.01);assert(p.y>-.6&&p.y<.2,`${eye}/${d}: ${p.y}`);
 }
});
test('camera-attached rod leaves the center open in both portrait and landscape',()=>{
 for(const aspect of [320/640,390/844,430/932,844/390,16/9]){
  const cam=new T.PerspectiveCamera(aspect<1?FISHING_VIEW.fovPortrait:FISHING_VIEW.fovLandscape,aspect,.04,100);cam.updateMatrixWorld(true);
  const base=new T.Vector3(...FISHING_VIEW.rodBase),direction=new T.Vector3(...FISHING_VIEW.rodDirection).normalize();
  const tip=base.clone().addScaledVector(direction,2.65).project(cam),grip=base.clone().addScaledVector(direction,.33).project(cam);
  assert(tip.x<-.08&&tip.x>-.95);assert(grip.x<-.1&&grip.x>-1);assert(grip.y<-.2);assert(Number.isFinite(tip.y));
 }
});
test('idle view favors the water and invalid distance values never corrupt the camera',()=>{
 assert(fishingViewPitch('idle',20,2.4,false)<-.3);
 for(const d of [NaN,0,-20,Infinity,undefined])assert(Number.isFinite(fishingViewPitch('wait',d,2.4,false)));
});

test('underwater close-up fits the whole fish across phone aspect ratios',()=>{
 for(const aspect of [320/640,390/844,430/932,844/390])for(const length of [.12,.48,1.8,4]){
  const fov=aspect<1?54:46,d=underwaterViewDistance(length,aspect,fov,0),width=2*d*Math.tan(fov*Math.PI/360)*aspect;
  assert(length/width<=.741);assert(d>=.7);
 }
});
test('the whole catch projects into the left display area on short landscape screens',()=>{
 const models=[
  [[-.53,-.04,-.03],[.52,.07,.08],1.214],
  [[-.55,-.29,-.18],[.51,.33,.14],4],
  [[-.54,-.17,-.41],[.48,.09,.43],1.55],
  [[-.19,-.52,-.22],[.27,.49,.14],.4],
 ];
 for(const [width,height,rect]of [
  [568,262,{left:23,top:10,width:273,height:240}],
  [768,354,{left:12,top:10,width:409,height:334}],
  [932,430,{left:47,top:10,width:449,height:389}],
 ])for(const fov of [43,50,52])for(const [min,max,scale]of models){
  const camera=new T.PerspectiveCamera(fov,width/height,.04,2500);
  const bounds=new T.Box3(new T.Vector3(...min),new T.Vector3(...max));
  const centre=catchViewPosition(new T.Vector3(),camera,bounds,rect,width,height,scale);
  const screen=new T.Box2();
  for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]]){
   const p=new T.Vector3(x,y,z).multiplyScalar(scale).add(centre).project(camera);
   assert(p.z>-1&&p.z<1);
   screen.expandByPoint(new T.Vector2((p.x+1)*width/2,(1-p.y)*height/2));
  }
  assert(screen.min.x>rect.left&&screen.max.x<rect.left+rect.width);
  assert(screen.min.y>rect.top&&screen.max.y<rect.top+rect.height);
  assert(Math.max((screen.max.x-screen.min.x)/rect.width,(screen.max.y-screen.min.y)/rect.height)>.45);
 }
});
