#!/bin/bash
# 組裝 index.html，並替這次部署蓋上同一個版本號：網頁內 APP_VER、version.json、sw.js 的快取版本
set -e
cd "$(dirname "$0")"
JS="b.js c.js e.js f.js g.js h.js i.js j.js k.js l.js m.js stars.js n.js o.js p.js q.js r.js s.js t.js u.js v.js w.js x.js y.js z.js d.js"
cat scan.js $JS > /tmp/all.js && node --check /tmp/all.js
python3 tools/lintc.py >/dev/null
STAMP=$(date +%Y%m%d%H%M%S)
{ cat a.html; echo "<script>"; cat scan.js; echo "</script>"; echo "<script>"; cat $JS; echo "</script>"; echo "</body></html>"; } > ../index.html
sed -i "s/__APP_BUILD__/$STAMP/" ../index.html
sed -i "s/const VER='[^']*'/const VER='swamp-$STAMP'/" ../sw.js
echo "{\"v\":\"$STAMP\"}" > ../version.json
echo "BUILT $STAMP"
