/* Copy one rendered framebuffer and bounded visible UI. No DOM clone or second WebGL render. */
function captureDimensions(width,height,dpr=1,sourceWidth=Infinity,sourceHeight=Infinity){const scale=Math.min(1.5,Math.max(.1,dpr),1280/Math.max(width,height),sourceWidth/width,sourceHeight/height,Math.sqrt(1200000/(width*height)));return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),scale};}
function screenshotIgnores(element,canvas,style=getComputedStyle){if(element===canvas||element.hasAttribute?.('data-screenshot-ignore'))return true;if(['STYLE','LINK','SCRIPT','HEAD','CANVAS','VIDEO'].includes(element.tagName))return true;const s=style(element);return s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0;}
function drawCaptureUI(ctx,root,{width,height,canvas,button,style=getComputedStyle,limit=400}={}){
 let count=0;const visible=r=>r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<width&&r.top<height;
 function visit(el,alpha=1){if(count>=limit||el===button||el===canvas||screenshotIgnores(el,canvas,style))return;const s=style(el),rect=el.getBoundingClientRect?.(),opacity=alpha*(Number(s.opacity)||1);count++;ctx.save();ctx.globalAlpha=opacity;
  if(rect&&visible(rect)){
   const r=Math.min(parseFloat(s.borderRadius)||0,rect.width/2,rect.height/2);ctx.beginPath();if(ctx.roundRect)ctx.roundRect(rect.left,rect.top,rect.width,rect.height,r);else ctx.rect(rect.left,rect.top,rect.width,rect.height);
   if(el!==root&&s.backgroundColor&&s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent'){ctx.fillStyle=s.backgroundColor;ctx.fill();}if(parseFloat(s.borderTopWidth)>0&&s.borderTopColor){ctx.strokeStyle=s.borderTopColor;ctx.lineWidth=parseFloat(s.borderTopWidth);ctx.stroke();}
   if(/hidden|auto|scroll|clip/.test(s.overflow||'')){ctx.clip();}
   if(el.tagName==='IMG'&&el.complete&&el.naturalWidth)try{ctx.drawImage(el,rect.left,rect.top,rect.width,rect.height);}catch(_){}
  }
  const children=[...(el.childNodes||[])];for(const node of children){if(count>=limit)break;if(node.nodeType===1){visit(node,opacity);continue;}if(node.nodeType!==3||!node.textContent?.trim())continue;
   const range=el.ownerDocument.createRange();range.selectNodeContents(node);const lines=[...range.getClientRects()].filter(visible);if(!lines.length)continue;count++;ctx.fillStyle=s.color||'white';ctx.font=s.font||`${s.fontWeight||400} ${s.fontSize||'14px'} ${s.fontFamily||'sans-serif'}`;ctx.textBaseline='top';let chars=[...node.textContent.replace(/\s+/g,' ').trim()],offset=0;for(const line of lines){let text='';while(offset<chars.length){const next=text+chars[offset];if(text&&ctx.measureText(next).width>line.width+1)break;text=next;offset++;}ctx.fillText(text,line.left,line.top,Math.max(1,line.width));}range.detach?.();
  }ctx.restore();
 }visit(root);return count;
}
function createScreenCapture({canvas,button,report=()=>{},onCaptured=()=>{},captureState=()=>null,scene=()=>'',drawUI=drawCaptureUI,diagnostics=()=>window.__DIAG,save=()=>{},now=()=>performance.now(),encodeTimeout=12000}){
 let pending=null,busy=false,preview=null,image=null,objectURL=null,cancelled=false;const label=button.textContent||'📷';
 const action=(phase,detail)=>diagnostics()?.action('photo',phase,detail);
 function releasePreview(){if(preview){preview.remove();preview=null;}if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
 function offer(blob,scope,context){releasePreview();objectURL=URL.createObjectURL(blob);preview=document.createElement('div');preview.setAttribute('data-screenshot-ignore','');preview.setAttribute('data-photo-preview','');for(const type of['pointerdown','pointerup','click'])preview.addEventListener(type,e=>e.stopPropagation());preview.style.cssText='position:fixed;inset:0;z-index:180;background:rgba(4,13,17,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;color:white';
  const photo=document.createElement('img');photo.src=objectURL;photo.alt='剛拍好的遊戲截圖';photo.style.cssText='max-width:100%;max-height:72vh;object-fit:contain';preview.appendChild(photo);
  const message=document.createElement('div');message.textContent='照片已拍好，可以下載到手機或分享。';preview.appendChild(message);const controls=document.createElement('div');controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap;justify-content:center';preview.appendChild(controls);
  function control(text,fn){const b=document.createElement('button');b.textContent=text;b.style.cssText='border:0;border-radius:20px;padding:12px 18px;font:600 16px sans-serif;background:#efc04c;color:#102c2b';b.onclick=fn;controls.appendChild(b);return b;}
  const name='濕地垂釣_'+Date.now()+'.jpg',file=typeof File==='function'?new File([blob],name,{type:'image/jpeg'}):null,canShare=!!(file&&navigator.share&&navigator.canShare?.({files:[file]}));
  // 下載與分享分成兩個按鈕：手機支援分享時，以前只會開分享選單，沒有直接存到手機的選項
  control('下載到手機',()=>{try{save();const a=document.createElement('a');a.href=objectURL;a.download=name;a.target='_blank';a.rel='noopener';document.body.appendChild(a);action('export','download');a.click();a.remove();action('done','download requested');message.textContent='已下載，可在手機的「下載」資料夾或相簿找到；若只開啟了圖片，請長按圖片儲存。';}catch(error){action('done',error.name||error.message);message.textContent='請長按照片儲存圖片，或再試一次。';}});
  if(canShare)control('分享',async()=>{try{save();action('sharing');await navigator.share({files:[file],title:'濕地垂釣'});action('done','share returned');message.textContent='分享已完成';}catch(error){action('done',error.name||error.message);if(error.name!=='AbortError')message.textContent='分享失敗，可改按「下載到手機」。';}});
  control('返回遊戲',()=>{action('done','preview closed');releasePreview();});document.body.appendChild(preview);report('📷 已拍好照片','good');try{const result=onCaptured(scope,context);if(result?.message)message.textContent=result.message+'。可下載、分享或返回遊戲。';}catch(error){action('record-error',error.message);message.textContent='照片已拍好，但任務記錄失敗，請返回遊戲再試一次。';}
 }
 async function take(){if(busy||preview)return;busy=true;cancelled=false;button.disabled=true;button.textContent='⏳';button.setAttribute('aria-busy','true');const start=now();let timer;
  try{const scope=scene(),context=captureState(scope);save();action('begin',{scene:scope,width:canvas.width,height:canvas.height});const frozen=await new Promise((resolve,reject)=>{pending={resolve,reject,scene:scope,context};timer=setTimeout(()=>{if(pending){pending=null;reject(Error('畫面尚未準備好，請稍後拍照'));}},2500);});clearTimeout(timer);image=frozen.image;
   action('encode',{width:image.width,height:image.height,copyMs:Math.round(now()-start)});const blob=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('照片編碼逾時，請稍後再試')),encodeTimeout);image.toBlob(b=>{if(b)resolve(b);else reject(Error('照片儲存失敗'));},'image/jpeg',.85);});clearTimeout(timer);
   if(cancelled)return;action('done',{durationMs:Math.round(now()-start),bytes:blob.size,width:image.width,height:image.height});offer(blob,frozen.scene,frozen.context);
  }catch(error){action('error',error.message);report(error.message||'拍照失敗，請重試','warn');}finally{clearTimeout(timer);if(image){image.width=image.height=1;image=null;}pending=null;busy=false;button.disabled=false;button.textContent=label;button.setAttribute('aria-busy','false');}
 }
 function afterFrame(){if(!pending)return;const job=pending;pending=null;let output;try{const size=captureDimensions(innerWidth,innerHeight,window.devicePixelRatio||1,canvas.width,canvas.height);output=document.createElement('canvas');output.width=size.width;output.height=size.height;const ctx=output.getContext('2d',{alpha:false});if(!ctx)throw Error('照片畫布無法建立');ctx.drawImage(canvas,0,0,size.width,size.height);ctx.save();ctx.scale(size.scale,size.scale);const nodes=drawUI(ctx,document.body,{width:innerWidth,height:innerHeight,canvas,button});ctx.restore();diagnostics()?.event('photo-copy',{pixels:size.width*size.height,nodes});job.resolve({image:output,size,scene:job.scene,context:job.context});}catch(error){if(output)output.width=output.height=1;job.reject(error);}}
 function cancel(){cancelled=true;if(pending){pending.reject(Error('畫面重置，請恢復後再拍照'));pending=null;}releasePreview();}
 button.addEventListener('pointerdown',e=>e.stopPropagation());button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();take();});
 return{take,afterFrame,cancel,isBusy:()=>busy,isPreview:()=>!!preview,paused:()=>!!preview||(busy&&!pending)};
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
if(typeof module!=='undefined'&&module.exports)module.exports={createScreenCapture,captureDimensions,screenshotIgnores,cameraButtonPosition,drawCaptureUI};
