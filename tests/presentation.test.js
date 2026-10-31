const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../vendor/three.min.js');
const {FISHING_VIEW,fishingViewPitch,underwaterViewDistance}=require('../src/presentation.js');
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
