/* Metres in the normalized yacht frame: bow -Z, stern +Z, starboard +X.
   遊艇模型：「Yacht II」by gogiart（Sketchfab，CC BY 4.0）。黑色船身、柚木甲板、駕駛艙、上層甲板（放著小艇）、前甲板。
   甲板高度：從指定高度往下找第一個「朝上的面」（不看材質名稱；舊模型靠材質名 material_3 判斷，換模型就失效）。
   top 用來避開上層：例如要找被上層甲板蓋住的下層甲板，就從上層下方開始找 */
function yachtDeckHeight(T,root,x,z,fallback,top){
 root.updateMatrixWorld(true);const o=root.localToWorld(new T.Vector3(x,top==null?100:top,z)),ray=new T.Raycaster(o,new T.Vector3(0,-1,0));
 const hit=ray.intersectObject(root,true).find(h=>{if(!h.face)return false;const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);return Math.abs(n.y)>.8;});   /* 有些模型的甲板面是反向繞的（法線朝下），水平面都算 */
 return hit?root.worldToLocal(hit.point.clone()).y:fallback;
}
/* 釣位：船頭前甲板的右舷側（開放、離水面近，面向右舷）；駕駛座：上層甲板、駕駛艙正前方（面向船頭，看得到整個前甲板） */
/* 釣位離舷牆要留 1 公尺以上（舷牆在 x≈1.4）：站太近時第一人稱的手臂和竿子會穿過欄杆 */
function yachtStations(T,root){return{fishing:{x:.25,z:-.5,deck:yachtDeckHeight(T,root,.25,-.5,1.6),yaw:-Math.PI/2},helm:{x:0,z:2.4,deck:yachtDeckHeight(T,root,0,2.4,3.45),yaw:0}};}
function yachtAnglerPose(T,boat,station){boat.updateMatrixWorld(true);return{position:boat.localToWorld(new T.Vector3(station.x,station.deck+1.62,station.z)),yaw:station.yaw};}
if(typeof module!=='undefined'&&module.exports)module.exports={yachtDeckHeight,yachtStations,yachtAnglerPose};
