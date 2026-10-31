/* Freeze the active frame directly; rasterize only visible HTML, not another copy of WebGL. */
function captureDimensions(width,height,dpr=1){const scale=Math.min(Math.max(1,dpr),1920/Math.max(width,height));return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),scale};}
function screenshotIgnores(element,canvas,style=getComputedStyle){
 if(element===canvas||element.hasAttribute('data-screenshot-ignore'))return true;
 if(['HTML','HEAD','BODY','STYLE','LINK','SCRIPT'].includes(element.tagName))return false;
 const s=style(element);return s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0;
}
function createScreenCapture({canvas,button,report=()=>{},onCaptured=()=>{},scene=()=>''}){
 let pending=null,busy=false;const label=button.textContent||'📷';
 async function take(){if(busy)return;busy=true;button.disabled=true;button.textContent='⏳';button.setAttribute('aria-busy','true');try{
   const frozen=await new Promise((resolve,reject)=>{pending={resolve,reject};});
   if(typeof window.html2canvas!=='function')throw Error('截圖元件尚未載入，請稍後再試');
   const overlay=await window.html2canvas(document.body,{width:innerWidth,height:innerHeight,windowWidth:innerWidth,windowHeight:innerHeight,scrollX:0,scrollY:0,x:0,y:0,scale:frozen.size.scale,useCORS:true,allowTaint:false,imageTimeout:1200,logging:false,backgroundColor:null,ignoreElements:e=>screenshotIgnores(e,canvas),onclone:doc=>{doc.body.style.background='transparent';doc.documentElement.style.background='transparent';}});
   frozen.image.getContext('2d').drawImage(overlay,0,0,frozen.size.width,frozen.size.height);
   const blob=await new Promise((resolve,reject)=>frozen.image.toBlob(b=>b?resolve(b):reject(Error('截圖儲存失敗')),'image/jpeg',.9));
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='濕地垂釣_截圖_'+Date.now()+'.jpg';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   report('📷 截圖已送出下載','good');onCaptured(frozen.scene);
 }catch(error){report(error.message||'截圖失敗，請重試','warn');}finally{busy=false;button.disabled=false;button.textContent=label;button.setAttribute('aria-busy','false');pending=null;}}
 function afterFrame(){if(!pending)return;const job=pending;pending=null;try{const size=captureDimensions(innerWidth,innerHeight,window.devicePixelRatio||1),image=document.createElement('canvas');image.width=size.width;image.height=size.height;image.getContext('2d').drawImage(canvas,0,0,size.width,size.height);job.resolve({image,size,scene:scene()});}catch(e){job.reject(e);}}
 button.addEventListener('pointerdown',e=>e.stopPropagation());button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();take();});
 return{take,afterFrame,isBusy:()=>busy};
}
function cameraButtonPosition(slot,top,width,safeTop=0,obstacles=[],height=900){
 const clear=p=>!obstacles.some(r=>p.left<r.right+6&&p.left+p.width>r.left-6&&p.top<r.bottom+6&&p.top+p.height>r.top-6);
 if(slot&&slot.width>0&&slot.height>0){const p={left:slot.left,top:slot.top,width:slot.width,height:slot.height};if(clear(p))return p;}
 const start=top&&top.height>0?top.bottom+10:safeTop+12;
 for(let y=start;y<height-70;y+=52)for(const x of[Math.max(8,width-56),12]){const p={left:x,top:y,width:44,height:44};if(clear(p))return p;}
 return{left:Math.max(8,width-56),top:start,width:44,height:44};
}
function dockCameraButton(button,slot,top){let queued=false;const obstacles=['magWin','tdCoach','tdClock','tdBag','tdShore','homeView','grillUI','furnPick','fishCard','act','joy'].map(id=>document.getElementById(id)).filter(Boolean);
 function update(){queued=false;const rects=obstacles.filter(el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.05;}).map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0),p=cameraButtonPosition(slot.getBoundingClientRect(),top.getBoundingClientRect(),innerWidth,0,rects,innerHeight);Object.assign(button.style,{left:p.left+'px',top:p.top+'px',width:p.width+'px',height:p.height+'px',right:'auto'});}
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(update);}
 window.addEventListener('resize',schedule);if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(schedule);for(const el of[slot,top,...obstacles])ro.observe(el);}if(typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','data-fishing-state']});schedule();return update;
}
if(typeof module!=='undefined'&&module.exports)module.exports={createScreenCapture,captureDimensions,screenshotIgnores,cameraButtonPosition};
