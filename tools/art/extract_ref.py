# 把參考圖（tools/art/ref/{m,f}-{front,side}.webp，AI 產生的像素畫）還原成固定的像素格，並去掉白色背景。
# 這些圖的方塊大小每張都不同、同一張裡也不完全一致，所以不去對齊原本的方塊，
# 而是把角色的高度切成固定的列數（ROWS，大約是每個方塊 2 格），每格取中央最常見的顏色。
# 這樣四張圖的角色會一樣高，零件座標也用同一個尺度。
import os, sys
from collections import Counter, deque
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROWS = {'m-front': 112, 'm-side': 112, 'f-front': 120, 'f-side': 120}   # 女生頭髮比較蓬，身體和男生等高

def extract(name, colors=16):
    im = Image.open(os.path.join(HERE, 'ref', name + '.webp')).convert('RGB')
    px = im.load()
    dark = [(x, y) for y in range(0, im.height, 2) for x in range(0, im.width, 2) if sum(px[x, y]) < 360]
    x0, y0 = min(p[0] for p in dark) - 2, min(p[1] for p in dark) - 2
    x1, y1 = max(p[0] for p in dark) + 3, max(p[1] for p in dark) + 3
    cell = (y1 - y0) / ROWS[name]
    pad = 2
    w, h = int((x1 - x0) / cell) + 1 + pad * 2, ROWS[name] + pad * 2
    small = Image.new('RGB', (w, h), (255, 255, 255))
    m = max(1, round(cell / 4))              # 只取格子中央，避開邊緣的漸層
    for j in range(h):
        for i in range(w):
            cx0, cy0 = x0 + (i - pad) * cell, y0 + (j - pad) * cell
            box = [px[xx, yy] for yy in range(int(cy0) + m, int(cy0 + cell) - m + 1) for xx in range(int(cx0) + m, int(cx0 + cell) - m + 1)
                   if 0 <= xx < im.width and 0 <= yy < im.height]
            if not box: continue
            key = Counter(tuple(v // 16 for v in p) for p in box).most_common(1)[0][0]
            pts = [p for p in box if tuple(v // 16 for v in p) == key]
            small.putpixel((i, j), tuple(sum(p[k] for p in pts) // len(pts) for k in range(3)))
    out = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    op = out.load()
    seen = set(); dq = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while dq:                                # 從四邊往內填：接近白色的是背景
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h): continue
        seen.add((x, y))
        if min(op[x, y][:3]) < 225: continue
        op[x, y] = (0, 0, 0, 0)
        dq.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return out.crop(out.getbbox())

if __name__ == '__main__':
    for n in ROWS:
        im = extract(n)
        print(n, im.size)
        if len(sys.argv) > 1: im.save(os.path.join(sys.argv[1], n + '.png'))
