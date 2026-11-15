# 把參考圖（AI 產生的像素畫，格子大小不一致）重新取樣成固定像素格，並去掉白色背景。
# 用法：python3 tools/art/extract_ref.py 輸入圖 輸出.png [每格像素=12] [顏色數=20]
import sys
from collections import Counter, deque
from PIL import Image

def extract(src, cell=12, colors=20):
    im = Image.open(src).convert('RGB')
    w, h = im.width // cell, im.height // cell
    px = im.load()
    small = Image.new('RGB', (w, h))
    for y in range(h):
        for x in range(w):
            # 取格子中央區域最常見的顏色（先粗略量化，避免邊緣的漸層）
            cnt = Counter()
            for yy in range(y * cell + 3, y * cell + cell - 2, 2):
                for xx in range(x * cell + 3, x * cell + cell - 2, 2):
                    r, g, b = px[xx, yy]
                    cnt[(r // 12, g // 12, b // 12)] += 1
            key = cnt.most_common(1)[0][0]
            pts = [px[xx, yy] for yy in range(y * cell + 3, y * cell + cell - 2, 2) for xx in range(x * cell + 3, x * cell + cell - 2, 2)
                   if tuple(v // 12 for v in px[xx, yy]) == key]
            small.putpixel((x, y), tuple(sum(p[i] for p in pts) // len(pts) for i in range(3)))
    q = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = q.convert('RGBA')
    # 從四個角落往內填：接近白色的是背景
    op = out.load()
    seen = set(); dq = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while dq:
        x, y = dq.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        r, g, b, a = op[x, y]
        if min(r, g, b) < 225:
            continue
        op[x, y] = (0, 0, 0, 0)
        dq.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return out.crop(out.getbbox())

if __name__ == '__main__':
    cell = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    colors = int(sys.argv[4]) if len(sys.argv) > 4 else 20
    out = extract(sys.argv[1], cell, colors)
    out.save(sys.argv[2])
    print(out.size)
