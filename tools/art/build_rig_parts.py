# 把正面參考圖切成骨架動畫用的零件，輸出 src/rig/parts-data.js（需要 Pillow）。
# 執行：python3 tools/art/build_rig_parts.py
# 座標是重新取樣後的像素格（60×109）。每個零件記錄它在整張圖裡的位置、支點（關節），以及每格的顏色代號。
import os, json
from extract_ref import extract

HERE = os.path.dirname(os.path.abspath(__file__))
im = extract(os.path.join(HERE, 'ref', 'male-base-front.webp'))
W, H = im.size
px = im.load()
opaque = lambda x, y: 0 <= x < W and 0 <= y < H and px[x, y][3] > 0

def arm_l(x, y):
    if 59 <= y <= 62: return x <= 20
    if 63 <= y <= 67: return x <= 21
    if 68 <= y <= 75: return x <= 20 if y <= 71 else x <= 19
    if 76 <= y <= 81: return x <= (17 if y == 79 else 18)
    return False
def arm_r(x, y):
    if 59 <= y <= 62: return x >= 37
    if 63 <= y <= 67: return x >= 36
    if 68 <= y <= 75: return x >= 38
    if 76 <= y <= 81: return x >= 40
    return False

PARTS = {
    # 名稱: (判斷函式, 支點)
    'head':  (lambda x, y: y <= 49, (29.5, 50)),
    'torso': (lambda x, y: 50 <= y <= 83 and not arm_l(x, y) and not arm_r(x, y), (29.5, 83)),
    'armL':  (arm_l, (17.5, 61.5)),
    'armR':  (arm_r, (40.5, 61.5)),
    'legL':  (lambda x, y: y >= 84 and x <= 28, (22.5, 85)),
    'legR':  (lambda x, y: y >= 84 and x >= 30, (36.5, 85)),
}
# 調色盤：每種顏色一個字母
colors = {}
def code(rgb):
    if rgb not in colors:
        colors[rgb] = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[len(colors)]
    return colors[rgb]
INK = min((px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3]), key=sum)

out = {}
for name, (inside, pivot) in PARTS.items():
    pts = {(x, y): px[x, y][:3] for y in range(H) for x in range(W) if opaque(x, y) and inside(x, y)}
    if name == 'torso':
        # 手臂抬起來時，肩膀下面要有輪廓：在手臂的位置補一條黑線（平常被手臂蓋住）
        for y in range(59, 63):
            pts[(20, y)] = INK; pts[(37, y)] = INK
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    rows = [''.join(code(pts[(x, y)]) if (x, y) in pts else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
    out[name] = {'x': x0, 'y': y0, 'pivot': [pivot[0] - x0, pivot[1] - y0], 'rows': rows}

data = {'W': W, 'H': H, 'ink': '#%02x%02x%02x' % INK, 'pal': {c: '#%02x%02x%02x' % rgb for rgb, c in colors.items()},
        'hands': {'armL': [13, 76], 'armR': [46, 76]}, 'parts': out}
path = os.path.join(HERE, '..', '..', 'src', 'rig', 'parts-data.js')
open(path, 'w').write("// 由 tools/art/build_rig_parts.py 產生：從正面參考圖切出的身體零件（骨架動畫用）。\n"
                      "// 每個字母是一種顏色（pal），'.' 透明；pivot 是關節在零件裡的位置。\n"
                      "export const RIG_PARTS = " + json.dumps(data, ensure_ascii=False) + ";\n")
print({k: (v['x'], v['y'], len(v['rows'][0]), len(v['rows'])) for k, v in out.items()}, len(colors), 'colors')
