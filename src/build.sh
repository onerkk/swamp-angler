#!/bin/bash
# 組裝 index.html，並替這次部署蓋上同一個版本號：網頁內 APP_VER、version.json、sw.js 的快取版本
set -e
cd "$(dirname "$0")"
JS="resource-budget.js lod.js batching.js crust.js effect-budget.js aquarium-display.js aquarium.js assist.js home-interactions.js home-runtime.js screenshot.js frame-timing.js graphics.js presentation.js physics.js landing.js shop.js water.js optics.js submerged.js godrays.js taa.js wake.js surface-life.js finishes.js material-lighting.js marine.js yacht-layout.js radiance.js b.js mer.js human.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js mermaid-reward.js mergift.js poster.js hall.js w.js x.js y.js z.js tut.js sch.js tide.js d.js"
cat scan.js $JS > /tmp/all.js && node --check /tmp/all.js
python3 tools/lintc.py >/dev/null
STAMP=$(python3 - <<'BUILDSTAMP'
from datetime import datetime,timedelta,timezone
import json,subprocess
now=datetime.now(timezone.utc).replace(tzinfo=None)
try:
    versions=[json.load(open('../version.json'))['v']]
    try:versions.append(json.loads(subprocess.check_output(['git','show','HEAD:version.json'],cwd='..'))['v'])
    except subprocess.CalledProcessError:pass
    previous=max(datetime.strptime(v,'%Y%m%d%H%M%S')for v in versions)
    now=max(now,previous+timedelta(seconds=1))
except (OSError,ValueError,KeyError):pass
print(now.strftime('%Y%m%d%H%M%S'))
BUILDSTAMP
)
# 主程式拆成兩個檔案，從 jsDelivr CDN 下載（比 GitHub 快約 8 倍）；index.html 只剩畫面與一小段載入器
# 每個檔案第一行標上這次的版本號：CDN 還沒更新（舊版）時自動改從本站下載，絕不執行到舊程式
{ echo "/*APPV:$STAMP*/"; cat scan.js; } > ../app_scan.js
{ echo "/*APPV:$STAMP*/"; cat $JS; } > ../app_main.js
sed -i "s/__APP_BUILD__/$STAMP/" ../app_main.js
{ cat a.html; cat <<LOADER
<script>
/* 主程式載入器：直接從本站下載（外部 CDN 已停用：倉庫超過 50 MB，jsDelivr 一律拒絕）。
   下載失敗會自動重試三次（間隔拉長），再不行就改用一般的 script 標籤載入；全部失敗才顯示錯誤並提供重試按鈕 */
(function(){ var V='$STAMP', F=['app_scan.js','app_main.js'];
  var note=function(t){ var e=document.getElementById('loadTip'); if(e&&t) e.textContent=t; };
  function run(code){ var b=new Blob([code],{type:'text/javascript'}), s=document.createElement('script'); s.src=URL.createObjectURL(b); return new Promise(function(ok){ s.onload=ok; s.onerror=ok; document.body.appendChild(s); }); }
  function get(u){ return fetch(u).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); }).then(function(t){ if(t.indexOf('/*APPV:'+V+'*/')!==0) throw new Error('版本不符'); return t; }); }
  function tag(f){ return new Promise(function(ok,no){ var s=document.createElement('script'); s.src=f+'?v='+V+'&t='+Date.now(); s.onload=ok; s.onerror=function(){ no(new Error('連不上伺服器')); }; document.body.appendChild(s); }); }
  function one(f,n){ n=n||0; return get(f+'?v='+V+(n?'&r='+n:'')).then(run).catch(function(e){ if(n<3){ note('網路不穩，重新下載中…（第 '+(n+1)+' 次）'); return new Promise(function(ok){ setTimeout(ok,[800,2500,6000][n]); }).then(function(){ return one(f,n+1); }); } return tag(f); }); }
  note('正在下載遊戲主程式…'); one(F[0]).then(function(){ return one(F[1]); }).catch(function(e){ var x=document.getElementById('loadErr'); if(x){ x.style.display='block'; x.innerHTML='⚠️ 主程式下載失敗（'+(e&&e.message||e)+'）。請確認網路後 <button onclick=\"location.reload()\" style=\"padding:6px 14px;border-radius:999px;border:0;background:#efc04c;font-weight:800\">重新載入</button>'; } });
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
