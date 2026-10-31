/* Camera framing shared by the surface view and its projection checks. */
const FISHING_VIEW={fovPortrait:62,fovLandscape:50,rodBase:[-.22,-.62,-.94],rodDirection:[-.12,.42,-.9],idlePitch:-.34};
function fishingViewPitch(state,distance,eyeHeight,sea){
  if(state==='wait'||state==='bite'||state==='fight'||state==='lure'){
    const d=Math.max(1.2,Number(distance)||12),eye=Math.max(.5,Number(eyeHeight)||1.7);
    return Math.max(-.62,Math.min(-.10,-Math.atan2(eye,d)-.045));
  }
  return sea?-.25:FISHING_VIEW.idlePitch;
}
function underwaterViewDistance(length,aspect,fov,baitDistance){
  const span=2*Math.tan(fov*Math.PI/360),frame=Math.min(1,Math.max(.3,aspect));
  return Math.max(.7,length/(span*frame*.74),baitDistance*.63+length*.85);
}
if(typeof module!=='undefined'&&module.exports) module.exports={FISHING_VIEW,fishingViewPitch,underwaterViewDistance};
