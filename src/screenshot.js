/* Capture the frame the active scene just rendered, then composite its current HTML UI. */
function createScreenCapture({canvas,button,report=()=>{},onCaptured=()=>{},scene=()=>''}){
 let pending=null,busy=false;
 async function take(){if(busy)return;busy=true;button.disabled=true;try{
   const frozen=await new Promise((resolve,reject)=>{pending={resolve,reject};});
   if(typeof window.html2canvas!=='function')throw Error('截圖元件尚未載入，請稍後再試');
   const image=await window.html2canvas(document.body,{width:innerWidth,height:innerHeight,windowWidth:innerWidth,windowHeight:innerHeight,scrollX:0,scrollY:0,x:0,y:0,scale:Math.min(window.devicePixelRatio||1,3),useCORS:true,allowTaint:false,logging:false,backgroundColor:null,ignoreElements:e=>e.hasAttribute('data-screenshot-ignore'),onclone:async doc=>{
     const old=doc.getElementById(canvas.id);if(!old)return;const img=doc.createElement('img');img.id=old.id;img.className=old.className;img.style.cssText=old.style.cssText;img.src=frozen.url;old.replaceWith(img);if(img.decode)await img.decode();
   }});
   const blob=await new Promise((resolve,reject)=>image.toBlob(b=>b?resolve(b):reject(Error('截圖儲存失敗')),'image/jpeg',.95));
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='濕地垂釣_截圖_'+Date.now()+'.jpg';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   report('📷 截圖已儲存到下載資料夾','good');onCaptured(frozen.scene);
 }catch(error){report(error.message||'截圖失敗，請重試','warn');}finally{busy=false;button.disabled=false;pending=null;}}
 function afterFrame(){if(!pending)return;const job=pending;pending=null;try{const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);job.resolve({url:copy.toDataURL('image/png'),scene:scene()});}catch(e){job.reject(e);}}
 button.addEventListener('pointerdown',e=>e.stopPropagation());button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();take();});
 return{take,afterFrame,isBusy:()=>busy};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createScreenCapture};
