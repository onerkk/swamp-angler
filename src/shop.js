/* One brand composition shared by the physical wall and the mobile shop panel. */
const SHOP_BRAND={name:'靜月之光',url:'https://tw.shp.ee/BcamsN2F',
  features:[{image:'shop1.jpg',label:'晶透光澤'},{image:'shop4.jpg',label:'金屬光感'},{image:'shop9.jpg',label:'暖色搭配'}]};
function drawShopPoster(g,images=[]){
  const W=1400,H=1040; g.clearRect(0,0,W,H); g.fillStyle='#102c29';g.fillRect(0,0,W,H);
  g.strokeStyle='#9a8050';g.lineWidth=2;g.strokeRect(25,25,W-50,H-50);
  g.fillStyle='#d1b77f';g.font='24px sans-serif';g.textAlign='left';g.fillText('JING YUE · NATURAL STONES',70,82);
  g.fillStyle='#fff5df';g.font='bold 92px sans-serif';g.fillText(SHOP_BRAND.name,65,192);
  g.fillStyle='#d9c7a1';g.font='36px sans-serif';g.fillText('把喜歡的光，戴進日常。',70,258);
  g.textAlign='right';g.font='25px sans-serif';g.fillText('水晶手鍊・礦石飾品',1328,180);
  SHOP_BRAND.features.forEach((f,i)=>{const x=70+i*430,y=310,s=400;
    g.fillStyle='#eee7db';g.fillRect(x-5,y-5,s+10,s+10);
    const im=images[i];if(im){const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,k=Math.min(iw,ih);g.drawImage(im,(iw-k)/2,(ih-k)/2,k,k,x,y,s,s);}
    g.fillStyle='#efdfbd';g.textAlign='left';g.font='30px sans-serif';g.fillText(f.label,x,y+s+49);
  });
  g.fillStyle='#b8cbc3';g.font='29px sans-serif';g.textAlign='left';g.fillText('商品實拍  /  看細節、選搭配  /  到蝦皮確認價格與現貨',70,820);
  g.fillStyle='#ee4d2d';g.fillRect(70,862,1260,108);
  g.fillStyle='#fff';g.font='bold 47px sans-serif';g.fillText('逛蝦皮・挑一條喜歡的',110,932);g.textAlign='right';g.fillText('→',1280,932);
  g.fillStyle='#b8cbc3';g.font='21px sans-serif';g.textAlign='center';g.fillText('點展示牆看商品實拍，再前往「靜月之光」蝦皮賣場',700,1010);
}
function createShopWallTexture(T){
  const cv=document.createElement('canvas');cv.width=1400;cv.height=1040;
  const g=cv.getContext('2d'),images=[],tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;tx.anisotropy=4;
  const draw=()=>{drawShopPoster(g,images);tx.needsUpdate=true;};draw();
  SHOP_BRAND.features.forEach((f,i)=>{const im=new Image();im.onload=()=>{images[i]=im;draw();};im.src=f.image;});
  return tx;
}
if(typeof module!=='undefined'&&module.exports)module.exports={SHOP_BRAND,drawShopPoster};
