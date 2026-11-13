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
function catchViewPosition(out,camera,bounds,rect,width,height,scale){
  const tanY=Math.tan(camera.fov*Math.PI/360),tanX=tanY*camera.aspect;
  const x=(2*(rect.left+rect.width*.5)/width-1)*tanX;
  const y=(1-2*(rect.top+rect.height*.43)/height)*tanY;
  const {min,max}=bounds;
  const halfX=(max.x-min.x)*scale*.5,halfY=(max.y-min.y)*scale*.5,halfZ=(max.z-min.z)*scale*.5;
  // Fit the nearest edge too. An off-centre subject appears wider on that side.
  const depth=halfZ+Math.max(camera.near*2,
    (halfX+Math.abs(x)*halfZ)/(rect.width/width*tanX*.82),
    (halfY+Math.abs(y)*halfZ)/(rect.height/height*tanY*.68));
  return out.set(x*depth-(min.x+max.x)*scale*.5,y*depth-(min.y+max.y)*scale*.5,-depth-(min.z+max.z)*scale*.5);
}
if(typeof module!=='undefined'&&module.exports) module.exports={FISHING_VIEW,fishingViewPitch,underwaterViewDistance,catchViewPosition};
