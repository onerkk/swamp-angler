import re,sys
files=['b.js','c.js','d.js','e.js','f.js','g.js','h.js','i.js','j.js','k.js','l.js','m.js','n.js','o.js','p.js','q.js','r.js','s.js','t.js','u.js','v.js','w.js','x.js','y.js']
bad=0
for f in files:
    for n,line in enumerate(open(f,encoding='utf-8').read().split('\n'),1):
        s=line; i=0; q=None
        while i<len(s):
            ch=s[i]
            if q:
                if ch=='\\': i+=2; continue
                if ch==q: q=None
            elif ch in '\'"`': q=ch
            elif ch=='/' and i+1<len(s) and s[i+1]=='/' and (i==0 or s[i-1]!=':'):
                tail=s[i+2:].strip()
                if re.search(r"[=(){};]", tail) and not re.match(r"^[\u4e00-\u9fff（）、，：A-Za-z0-9 ×+\-.%/~→\s]*$", tail) and not (f in('h.js','n.js') and n in(6,35)):
                    print('SWALLOW?',f,n,'|',tail[:100]); bad+=1
                break
            i+=1
print('註解檢查：',('發現 %d 處可疑'%bad) if bad else '沒有吃掉程式碼的註解')
import sys; sys.exit(1 if bad else 0)
