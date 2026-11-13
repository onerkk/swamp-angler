/* Metres in the normalized boat frame: bow -Z, stern +Z, starboard +X, hull centred on the origin, waterline at y=0.
   船：「2004 17' Scout - Center Console」by BoatUS Foundation（Sketchfab，CC BY 4.0），真實尺寸（連船外機約 6 公尺）。
   甲板高度：從指定高度往下找第一個水平面（不看材質名稱，換模型也能用）。top 用來避開上方的東西（例如座椅、中控台） */
function yachtDeckHeight(T,root,x,z,fallback,top){
 root.updateMatrixWorld(true);const o=root.localToWorld(new T.Vector3(x,top==null?100:top,z)),ray=new T.Raycaster(o,new T.Vector3(0,-1,0));
 const hit=ray.intersectObject(root,true).find(h=>{if(!h.face)return false;const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);return Math.abs(n.y)>.8;});   /* 有些模型的甲板面是反向繞的（法線朝下），水平面都算 */
 return hit?root.worldToLocal(hit.point.clone()).y:fallback;
}
/* 釣位：船尾駕駛艙的右舷側，站在艙底板上面向右舷（舷邊只到膝蓋，不會擋到手和竿子）；
   駕駛座：中控台後方、靠背座椅前面，面向船頭握方向盤 */
function yachtStations(T,root){return{fishing:{x:.27,z:1.7,deck:yachtDeckHeight(T,root,.27,1.7,.1),yaw:-Math.PI/2},helm:{x:0,z:.55,deck:yachtDeckHeight(T,root,0,.55,.1,.6),yaw:0}};}
function yachtAnglerPose(T,boat,station){boat.updateMatrixWorld(true);return{position:boat.localToWorld(new T.Vector3(station.x,station.deck+1.62,station.z)),yaw:station.yaw};}
if(typeof module!=='undefined'&&module.exports)module.exports={yachtDeckHeight,yachtStations,yachtAnglerPose};
