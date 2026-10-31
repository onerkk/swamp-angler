/* Visible geometry is the source of truth for tags, picking and action poses. */
function homeObjectVisible(object,scene){let o=object;for(;o;o=o.parent){if(!o.visible)return false;if(o===scene)return true;}return !scene;}
function homeVisibleBounds(T,roots,scene){const box=new T.Box3();for(const root of(Array.isArray(roots)?roots:[roots])){if(!root||!homeObjectVisible(root,scene))continue;root.updateWorldMatrix(true,true);root.traverse(o=>{if(!o.isMesh||!o.geometry||!homeObjectVisible(o,scene))return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.every(m=>!m||m.visible===false))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});}return box;}
function homeActionPose(T,root,kind,room,blocked=()=>false,scene){const bounds=homeVisibleBounds(T,root,scene);if(bounds.isEmpty())return null;const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),seated=kind==='rock'||kind==='sofa',dir=new T.Vector3(-center.x,0,(room.zb+room.zf)/2-center.z);if(dir.lengthSq()<.001)dir.set(0,0,1);dir.normalize();
 const look=center.clone();look.y=bounds.min.y+size.y*(kind==='chest'?.65:.55);
 let position;
 if(seated){position=center.clone();position.y=bounds.min.y+Math.min(.55,size.y*.34)+.62;look.copy(position).addScaledVector(dir,2);look.y=position.y+.05;}
 else{const height=kind==='herb'?1.3:kind==='chest'?1.35:1.55;for(const angle of[0,.35,-.35,.7,-.7,1.2,-1.2,Math.PI]){const d=dir.clone().applyAxisAngle(new T.Vector3(0,1,0),angle),reach=Math.abs(d.x)*size.x/2+Math.abs(d.z)*size.z/2+.75,p=center.clone().addScaledVector(d,reach);p.y=height;if(Math.abs(p.x)>room.x-.4||p.z<room.zb+.4||p.z>room.zf-.4||blocked(p.x,p.z))continue;position=p;break;}}
 if(!position)return null;return{pos:position.toArray(),look:look.toArray(),tag:new T.Vector3(center.x,kind==='light'?bounds.min.y-.15:Math.min(room.h-.16,bounds.max.y+.16),center.z),bounds};}
if(typeof module!=='undefined'&&module.exports)module.exports={homeObjectVisible,homeVisibleBounds,homeActionPose};

// Explicit furniture footprints keep every upgrade tier outside the reserved aquarium wall.
function homeFurnitureSlots(room){return {
 shelf:{x:-room.x+.48,z:-.85,w:.65,h:1.95,d:1.25},
 chest:{x:room.x-.7,z:-1.45,w:.72,h:.65,d:.64},
 chestCrateA:{x:room.x-1.3,z:-1.7,w:.32,h:.35,d:.32},
 chestCrateB:{x:room.x-1.3,z:-1.05,w:.32,h:.35,d:.32},
 herb:{x:-room.x+.48,z:1.1,w:.55,h:1.1,d:.9},
 sofa:{x:-1.9,z:.25,w:1.1,h:1.15,d:1.9},
 ottoman:{x:-1.25,z:1.5,w:.55,h:.4,d:.55},
 rock:{x:1.5,z:.15,w:.85,h:1.2,d:1.1},
 rockTable:{x:2.55,z:.4,w:.6,h:.6,d:.6},
 rockBasket:{x:2.55,z:-.6,w:.4,h:.5,d:.4}
};}
function homeFitFurniture(T,root,slot){const bounds=homeVisibleBounds(T,root);if(bounds.isEmpty())return;const size=bounds.getSize(new T.Vector3()),scale=Math.min(1,slot.w/Math.max(.001,size.x),slot.h/Math.max(.001,size.y),slot.d/Math.max(.001,size.z));root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);const b=homeVisibleBounds(T,root),center=b.getCenter(new T.Vector3());root.position.add(new T.Vector3(slot.x-center.x,(slot.y||0)-b.min.y,slot.z-center.z));root.updateMatrixWorld(true);return homeVisibleBounds(T,root);}
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{homeFurnitureSlots,homeFitFurniture});
