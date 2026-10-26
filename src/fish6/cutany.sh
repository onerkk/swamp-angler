k=$1; f=$2
rm -f ${k}_*_t.png
python3 cut.py $k $f >/dev/null 2>&1
n=$(ls ${k}_side_t.png ${k}_top_t.png ${k}_front_t.png ${k}_belly_t.png 2>/dev/null | wc -l)
if [ "$n" != "4" ]; then python3 cut2.py $k $f >/dev/null 2>&1; m="找魚塊法"; else m="分格法"; fi
n=$(ls ${k}_side_t.png ${k}_top_t.png ${k}_front_t.png ${k}_belly_t.png 2>/dev/null | wc -l)
echo "$k $m 角度數=$n"
