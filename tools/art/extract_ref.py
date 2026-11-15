# 把參考圖（AI 產生的像素畫，格子大小不一致）重新取樣成固定像素格，並去掉白色背景。
# 用法：python3 tools/art/extract_ref.py 輸入圖 輸出.png [每格像素=12，可用小數] [顏色數=20]
import sys
from collections import Counter, deque
from PIL import Image

def extract(src, cell=12, colors=20, squeeze=None):
    """squeeze = (起始列, 比例, 中心欄)：這一列以下的身體橫向收窄成原本的幾成（以中心欄為軸），頭不變。
    座標是輸出圖（去背、裁切後）的像素格。直接從原圖取樣，比縮放小圖乾淨。"""
    plain, box = _grid(src, cell, colors, None)
    if squeeze:
        y_from, factor, cx = squeeze
        slim, _ = _grid(src, cell, colors, (y_from + box[1], factor, cx + box[0]))
        top = plain.crop((0, 0, plain.width, y_from + box[1]))      # 頭沿用收窄前的像素與配色
        slim.paste(top, (0, 0))
        plain = slim
    return plain.crop(box)

def _grid(src, cell, colors, squeeze):
    im = Image.open(src).convert('RGB')
    w, h = int(im.width / cell), int(im.height / cell)
    px = im.load()
    small = Image.new('RGB', (w, h))
    m = max(2, round(cell / 4))          # 只取格子中央，避開邊緣的漸層
    for y in range(h):
        for x in range(w):
            # 取格子中央區域最常見的顏色（先粗略量化）
            y0, y1 = int(y * cell), int((y + 1) * cell)
            if squeeze and y >= squeeze[0]:
                gx = squeeze[2] + 0.5 + (x - squeeze[2] - 0.5) / squeeze[1]      # 這一格對應到原圖的哪一欄
                x0, x1 = int(gx * cell), int((gx + 1 / squeeze[1]) * cell)
                if x0 < 0 or x1 >= im.width:
                    small.putpixel((x, y), (255, 255, 255)); continue
            else:
                x0, x1 = int(x * cell), int((x + 1) * cell)
            box = [px[xx, yy] for yy in range(y0 + m, y1 - m + 1, 2) for xx in range(x0 + m, x1 - m + 1, 2)]
            key = Counter(tuple(v // 12 for v in p) for p in box).most_common(1)[0][0]
            pts = [p for p in box if tuple(v // 12 for v in p) == key]
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
    return out, out.getbbox()

if __name__ == '__main__':
    cell = float(sys.argv[3]) if len(sys.argv) > 3 else 12
    colors = int(sys.argv[4]) if len(sys.argv) > 4 else 20
    out = extract(sys.argv[1], cell, colors)
    out.save(sys.argv[2])
    print(out.size)
