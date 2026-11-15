# 把正面參考圖切成骨架動畫用的零件，輸出 src/rig/parts-data.js（需要 Pillow）。
# 執行：python3 tools/art/build_rig_parts.py
# 座標是重新取樣後的像素格（正面 60×109、側面 50×99）。每個零件記錄它在整張圖裡的位置、支點（關節），以及每格的顏色代號。
import os, json
from extract_ref import extract

HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

def build(src, parts, hands, synth=None):
    """parts: {名稱: (判斷函式, 支點)}；synth(name, pts, px)：補上被其他零件擋住的像素"""
    im = extract(os.path.join(HERE, 'ref', src))
    W, H = im.size
    px = im.load()
    ink = min((px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3]), key=sum)
    colors = {}
    def code(rgb):
        if rgb not in colors:
            colors[rgb] = LETTERS[len(colors)]
        return colors[rgb]
    out = {}
    for name, (inside, pivot) in parts.items():
        pts = {(x, y): px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3] > 0 and inside(x, y)}
        if synth:
            synth(name, pts, px, ink)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        rows = [''.join(code(pts[(x, y)]) if (x, y) in pts else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        out[name] = {'x': x0, 'y': y0, 'pivot': [pivot[0] - x0, pivot[1] - y0], 'rows': rows}
    print(src, {k: (v['x'], v['y'], len(v['rows'][0]), len(v['rows'])) for k, v in out.items()}, len(colors), 'colors')
    return {'W': W, 'H': H, 'ink': '#%02x%02x%02x' % ink, 'pal': {c: '#%02x%02x%02x' % rgb for rgb, c in colors.items()}, 'hands': hands, 'parts': out}

# ---------- 正面 ----------
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
def front_synth(name, pts, px, ink):
    if name == 'torso':   # 手臂抬起來時，肩膀下面要有輪廓（平常被手臂蓋住）
        for y in range(59, 63):
            pts[(20, y)] = ink; pts[(37, y)] = ink
FRONT = build('male-base-front.webp', {
    'head':  (lambda x, y: y <= 49, (29.5, 50)),
    'torso': (lambda x, y: 50 <= y <= 83 and not arm_l(x, y) and not arm_r(x, y), (29.5, 83)),
    'armL':  (arm_l, (17.5, 61.5)),
    'armR':  (arm_r, (40.5, 61.5)),
    'legL':  (lambda x, y: y >= 84 and x <= 28, (22.5, 85)),
    'legR':  (lambda x, y: y >= 84 and x >= 30, (36.5, 85)),
}, {'armL': [13, 76], 'armR': [46, 76]}, front_synth)

# ---------- 側面（朝右）：只看得到靠近鏡頭的手和腿；後面的手腳由程式複製並調暗 ----------
def side_arm(x, y):
    if 52 <= y <= 53: return x <= 25
    if 54 <= y <= 59: return x <= 27
    if 60 <= y <= 71: return x <= 26
    if 72 <= y <= 73: return x <= 24
    if y == 74: return x <= 23
    if y == 75: return x <= 22
    return False
def side_neck(x, y): return 45 <= y <= 47 and 22 <= x <= 27
def side_synth(name, pts, px, ink):
    if name != 'torso':
        return
    skin, shorts = px[22, 50][:3], px[27, 69][:3]
    for y in range(52, 76):          # 被手臂擋住的背部與短褲
        for x in range(18, 28):
            if (x, y) in pts:
                continue
            if x <= 19 or y in (66, 67): pts[(x, y)] = ink
            elif y <= 65: pts[(x, y)] = skin
            elif x <= 26: pts[(x, y)] = shorts
SIDE = build('male-base-right.webp', {
    'head':  (lambda x, y: y <= 47 and not side_neck(x, y), (25, 46)),
    'torso': (lambda x, y: (side_neck(x, y) or 48 <= y <= 77) and not side_arm(x, y), (26, 77)),
    'armR':  (side_arm, (21.5, 54.5)),
    'legR':  (lambda x, y: y >= 78, (26, 79)),
}, {'armR': [20, 71]}, side_synth)

path = os.path.join(HERE, '..', '..', 'src', 'rig', 'parts-data.js')
open(path, 'w').write("// 由 tools/art/build_rig_parts.py 產生：從參考圖切出的身體零件（骨架動畫用），分正面與側面。\n"
                      "// 每個字母是一種顏色（pal），'.' 透明；pivot 是關節在零件裡的位置。\n"
                      "export const RIG_PARTS = " + json.dumps({'front': FRONT, 'side': SIDE}, ensure_ascii=False) + ";\n")
