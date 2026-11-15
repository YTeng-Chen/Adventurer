# 從整張參考圖（tools/art/ref/base-sheet.webp：男女各四個視角）取出單一角色，還原成像素格。
# 這張圖是縮小過的有損圖檔，原本的像素格大約 6.6–7 px，而且每個角色、橫向直向都略有不同，
# 所以每個角色各自量格距與起點（用邊緣位置的週期），在每格中央取中位數顏色，再放大 2 倍當成零件的解析度。
import math, os
from collections import deque
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
# 角色在圖上的範圍（左, 上, 右, 下）。「左側面」那一欄的角色臉朝右，遊戲用的側面就是它。
FIGURES = {
    'm-front': (300, 12, 530, 414), 'm-side': (1220, 12, 1440, 414),
    'f-front': (296, 496, 536, 942), 'f-side': (1220, 496, 1440, 942),
}

def _pitch(px, box, axis):
    """找出格距與起點：邊緣強度沿著這個方向的週期"""
    x0, y0, x1, y1 = box
    if axis == 'x':
        sig = [sum(abs(px[x, y] - px[x - 1, y]) for y in range(y0, y1)) for x in range(x0 + 1, x1)]
    else:
        sig = [sum(abs(px[x, y] - px[x, y - 1]) for x in range(x0, x1)) for y in range(y0 + 1, y1)]
    best = (0, 0, 0)
    p = 6.2
    while p < 7.3:
        re = sum(v * math.cos(2 * math.pi * i / p) for i, v in enumerate(sig))
        im = sum(v * math.sin(2 * math.pi * i / p) for i, v in enumerate(sig))
        best = max(best, (math.hypot(re, im), p, (math.atan2(im, re) / (2 * math.pi) * p) % p))
        p += 0.01
    return best[1], best[2] + 1          # 格距、第一條格線相對於範圍起點的位置

def extract_figure(name, colors=16, scale=2):
    src = Image.open(os.path.join(HERE, 'ref', 'base-sheet.webp')).convert('RGB')
    gray = src.convert('L').load(); px = src.load()
    x0, y0, x1, y1 = FIGURES[name]
    pw, ox = _pitch(gray, FIGURES[name], 'x'); ph, oy = _pitch(gray, FIGURES[name], 'y')
    ox -= pw; oy -= ph
    w, h = int((x1 - x0 - ox) / pw), int((y1 - y0 - oy) / ph)
    small = Image.new('RGB', (w, h))
    for j in range(h):
        for i in range(w):
            cx, cy = x0 + ox + (i + 0.5) * pw, y0 + oy + (j + 0.5) * ph
            pts = sorted(px[int(cx + dx), int(cy + dy)] for dx in (-1.2, 0, 1.2) for dy in (-1.2, 0, 1.2))
            pts.sort(key=sum)
            small.putpixel((i, j), pts[4])
    out = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    op = out.load()
    seen = set(); dq = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while dq:                              # 從四邊往內填：接近白色的是背景
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h): continue
        seen.add((x, y))
        if min(op[x, y][:3]) < 215: continue
        op[x, y] = (0, 0, 0, 0)
        dq.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    out = out.crop(out.getbbox())
    return out.resize((out.width * scale, out.height * scale), Image.NEAREST), (pw, ph)

if __name__ == '__main__':
    import sys
    for n in FIGURES:
        im, p = extract_figure(n, scale=1)
        print(n, im.size, 'pitch %.2f × %.2f' % p)
        if len(sys.argv) > 1: im.save(os.path.join(sys.argv[1], n + '.png'))
