#!/bin/bash
# 組裝 index.html，並替這次部署蓋上同一個版本號：網頁內 APP_VER、version.json、sw.js 的快取版本
set -e
cd "$(dirname "$0")"
JS="b.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js w.js x.js y.js z.js tut.js sch.js d.js"
cat scan.js $JS > /tmp/all.js && node --check /tmp/all.js
python3 tools/lintc.py >/dev/null
STAMP=$(date +%Y%m%d%H%M%S)
{ cat a.html; echo "<script>"; cat scan.js; echo "</script>"; echo "<script>"; cat $JS; echo "</script>"; echo "</body></html>"; } > ../index.html
sed -i "s/__APP_BUILD__/$STAMP/" ../index.html


# 資產指紋：Service Worker 用來判斷哪些模型／貼圖換過、需要重新下載（沒換過的保留在手機裡）
( cd .. && python3 - <<'PY'
import os,hashlib,json
out={}
for root,ds,fs in os.walk('.'):
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
