#!/bin/bash
# 組裝 index.html，並替這次部署蓋上同一個版本號：網頁內 APP_VER、version.json、sw.js 的快取版本
set -e
cd "$(dirname "$0")"
JS="assist.js physics.js shop.js water.js b.js mer.js human.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js w.js x.js y.js z.js tut.js sch.js tide.js d.js"
cat scan.js $JS > /tmp/all.js && node --check /tmp/all.js
python3 tools/lintc.py >/dev/null
STAMP=$(date +%Y%m%d%H%M%S)
# 主程式拆成兩個檔案，從 jsDelivr CDN 下載（比 GitHub 快約 8 倍）；index.html 只剩畫面與一小段載入器
# 每個檔案第一行標上這次的版本號：CDN 還沒更新（舊版）時自動改從本站下載，絕不執行到舊程式
{ echo "/*APPV:$STAMP*/"; cat scan.js; } > ../app_scan.js
{ echo "/*APPV:$STAMP*/"; cat $JS; } > ../app_main.js
sed -i "s/__APP_BUILD__/$STAMP/" ../app_main.js
{ cat a.html; cat <<LOADER
<script>
/* 主程式載入器：先試 CDN（快），檢查版本號一致才執行；不一致或失敗就改從本站下載。依序執行兩個檔案 */
(function(){ var V='$STAMP', CDN='https://cdn.jsdelivr.net/gh/onerkk/swamp-angler@main/', F=['app_scan.js','app_main.js'], useCdn=localStorage.getItem('swampAngler.cdn')!=='off';
  var note=function(t){ var e=document.getElementById('loadTip'); if(e&&t) e.textContent=t; };
  function run(code){ var b=new Blob([code],{type:'text/javascript'}), s=document.createElement('script'); s.src=URL.createObjectURL(b); return new Promise(function(ok){ s.onload=ok; s.onerror=ok; document.body.appendChild(s); }); }
  function get(u){ return fetch(u,{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); }); }
  function one(f){ var local=function(){ return get(f+'?v='+V); };
    var p=useCdn?get(CDN+f).then(function(t){ if(t.indexOf('/*APPV:'+V+'*/')!==0) throw new Error('stale'); return t; }).catch(local):local();
    return p.then(run); }
  note('正在下載遊戲主程式…'); one(F[0]).then(function(){ return one(F[1]); }).catch(function(e){ var x=document.getElementById('loadErr'); if(x){ x.style.display='block'; x.textContent='⚠️ 主程式下載失敗：'+e+'，請重新整理'; } });
})();
</script>
</body></html>
LOADER
} > ../index.html


# 資產指紋：Service Worker 用來判斷哪些模型／貼圖換過、需要重新下載（沒換過的保留在手機裡）
( cd .. && python3 - <<'PY'
import os,hashlib,json
out={}
for root,ds,fs in os.walk('.'):
    ds[:]=[d for d in ds if d not in ('.git','src','dist','tests','.openai')]
    if root.startswith('./src') or root.startswith('./.git'): continue
    for f in fs:
        if f.lower().endswith(('.glb','.jpg','.jpeg','.png','.webp','.hdr','.mp3')):
            p=os.path.join(root,f)[2:]; out[p]=hashlib.md5(open(os.path.join(root,f),'rb').read()).hexdigest()[:12]
json.dump(out,open('assets.json','w'),separators=(',',':'))
PY
)

sed -i "s/const VER='[^']*'/const VER='swamp-$STAMP'/" ../sw.js
echo "{\"v\":\"$STAMP\"}" > ../version.json
echo "BUILT $STAMP"
