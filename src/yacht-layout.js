/* Metres in the normalized yacht frame: bow -Z, stern +Z, starboard +X. */
function yachtDeckHeight(T,root,x,z,fallback){
 root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));
 const hit=ray.intersectObject(root,true).find(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);return m&&m.name==='material_3'&&n.y>.8;});
 return hit?hit.point.y:fallback;
}
function yachtStations(T,root){return{fishing:{x:2.12,z:15,deck:yachtDeckHeight(T,root,2.12,15,2.03),yaw:-Math.PI/2},helm:{x:.6,z:10,deck:yachtDeckHeight(T,root,.6,10,3.82),yaw:0}};}
function yachtAnglerPose(T,boat,station){boat.updateMatrixWorld(true);return{position:boat.localToWorld(new T.Vector3(station.x,station.deck+1.62,station.z)),yaw:station.yaw};}
if(typeof module!=='undefined'&&module.exports)module.exports={yachtDeckHeight,yachtStations,yachtAnglerPose};
