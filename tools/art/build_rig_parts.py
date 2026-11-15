# 把參考圖（tools/art/ref/{m,f}-{front,side}.webp）切成骨架動畫用的零件，輸出 src/rig/parts-data.js（需要 Pillow）。
# 執行：python3 tools/art/build_rig_parts.py
# 座標是 extract_ref.py 還原後的像素格（男女都是 112 列高，肩膀到腳底等高）。
# 每個零件記錄它在整張圖裡的位置、支點（關節），以及每格的顏色代號。
import os, json
from collections import Counter
from extract_ref import extract

HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
is_ink = lambda c: sum(c) < 130   # 輪廓線（深褐色）；頭髮在 170 以上
is_skin = lambda c: c[0] > 190 and c[1] > 140 and c[2] > 110 and c[0] - c[2] > 25

def build(name, parts, hands, synth=None, clear=(), k=1):
    """parts: {名稱: (判斷函式, 支點)}；synth(name, pts, ink, skin)：補上被其他零件擋住的像素
    clear：要清成透明的格子 (x0, y0, x1, y1)（被頭髮圍住、沒被去背的白色背景）
    k：判斷函式、支點所用的座標是實際像素格的幾倍（女生的切割位置是在 120 列的圖上量的，現在取樣成 112 列，k = 120/112）"""
    im = extract(name)
    W, H = im.size
    px = im.load()
    for x0, y0, x1, y1 in clear:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px[x, y] = (0, 0, 0, 0)
    # 輪廓外面的雜點：不是輪廓、卻直接碰到透明的格子
    stray = [(x, y) for y in range(H) for x in range(W) if px[x, y][3] and not is_ink(px[x, y][:3])
             and any(not (0 <= x + dx < W and 0 <= y + dy < H) or px[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in stray:
        px[x, y] = (0, 0, 0, 0)
    allc = [px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3]]
    ink = Counter(c for c in allc if is_ink(c)).most_common(1)[0][0]
    skin = Counter(c for c in allc if is_skin(c)).most_common(1)[0][0]
    colors = {}
    def code(rgb):
        if rgb not in colors:
            colors[rgb] = LETTERS[len(colors)]
        return colors[rgb]
    out = {}
    for pname, (inside, pivot) in parts.items():
        pts = {(x, y): px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3] > 0 and inside(int((x + 0.5) * k), int((y + 0.5) * k))}
        if synth:
            synth(pname, pts, ink, skin)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        rows = [''.join(code(pts[(x, y)]) if (x, y) in pts else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        out[pname] = {'x': x0, 'y': y0, 'pivot': [round(pivot[0] / k * 2) / 2 - x0, round(pivot[1] / k * 2) / 2 - y0], 'rows': rows}
    print(name, (W, H), {k: (v['x'], v['y'], len(v['rows'][0]), len(v['rows'])) for k, v in out.items()})
    print('   colors', sorted((sum(c), c) for c in colors))
    hex_ = lambda c: '#%02x%02x%02x' % c
    return {'W': W, 'H': H, 'scale': 1, 'unit': 2, 'skin': hex_(skin), 'ink': hex_(ink), 'pal': {c: hex_(rgb) for rgb, c in colors.items()}, 'hands': {n: [round(v / k * 2) / 2 for v in h] for n, h in hands.items()}, 'parts': out}

def table(spec):
    """{(y0, y1): x} → {y: x}"""
    return {y: x for (y0, y1), x in spec.items() for y in range(y0, y1 + 1)}
def outline(pts, ink, rows):
    """身體被手臂擋住的那一側補上輪廓線"""
    for y in rows:
        xs = [x for (x, yy) in pts if yy == y]
        if not xs: continue
        for x, d in ((min(xs), -1), (max(xs), 1)):
            if not is_ink(pts[(x, y)]): pts[(x + d, y)] = ink
# 手腳各拆成兩段（上臂／前臂、大腿／小腿），在關節處重疊一列，彎曲時才不會露出縫隙
def split(inside, joint_y, pivot_top, pivot_joint, a, b):
    return {a: (lambda x, y: inside(x, y) and y <= joint_y + 1, pivot_top),
            b: (lambda x, y: inside(x, y) and y >= joint_y - 1, pivot_joint)}
def behind_arm(pts, ink, rows, back, x1, fill):
    """側面：手臂擋住的背、腰、短褲。back 是背部輪廓的位置，fill(y) 回傳那一列的顏色"""
    for y in rows:
        b = back(y) if callable(back) else back
        for x in range(b, (x1(y) if callable(x1) else x1) + 1):
            if (x, y) not in pts:
                pts[(x, y)] = ink if x <= b + 1 else fill(y)

# ==================== 男生 ====================
M_ARM_L = table({(62, 74): 22, (75, 78): 21, (79, 80): 19, (81, 84): 17, (85, 86): 18})
M_ARM_R = table({(62, 74): 40, (75, 78): 41, (79, 80): 42, (81, 84): 45, (85, 86): 44})
def m_neck(x, y): return 54 <= y <= 56 and 28 <= x <= 34
def m_arm_l(x, y): return y in M_ARM_L and x <= M_ARM_L[y]
def m_arm_r(x, y): return y in M_ARM_R and x >= M_ARM_R[y]
def m_front_synth(name, pts, ink, skin):
    if name == 'torso': outline(pts, ink, range(62, 87))
M_FRONT = build('m-front', {
    'head':  (lambda x, y: y <= 56 and not m_neck(x, y), (31, 56)),
    'torso': (lambda x, y: (m_neck(x, y) or 57 <= y <= 86) and not m_arm_l(x, y) and not m_arm_r(x, y), (31, 87)),
    **split(m_arm_l, 74, (18.5, 64), (16.5, 74), 'armL', 'armLf'),
    **split(m_arm_r, 74, (43.5, 64), (45.5, 74), 'armR', 'armRf'),
    **split(lambda x, y: y >= 87 and x <= 30, 100, (25, 89), (24, 100), 'legL', 'legLf'),
    **split(lambda x, y: y >= 87 and x >= 31, 100, (38, 89), (39, 100), 'legR', 'legRf'),
}, {'armL': [14.5, 82], 'armR': [48, 82]}, m_front_synth)

# 側面（朝右）：只看得到靠近鏡頭的手和腿；後面的手腳由程式複製並調暗
def m_side_neck(x, y): return 53 <= y <= 54 and 28 <= x <= 33
def m_side_head(x, y): return y <= 52 or (y <= 54 and not m_side_neck(x, y))
def m_side_arm(x, y):
    if 60 <= y <= 77: return x <= 30
    if 78 <= y <= 82: return x <= 32
    if 83 <= y <= 84: return x <= 30
    if y == 85: return x <= 29
    if y == 86: return x <= 25
    return False
def m_side_synth(name, pts, ink, skin):
    shorts = pts.get((34, 81)) if name == 'torso' else None
    if name == 'torso':
        behind_arm(pts, ink, range(60, 87), 22, 32, lambda y: skin if y <= 77 else shorts)
M_SIDE = build('m-side', {
    'head':  (m_side_head, (30.5, 55)),
    'torso': (lambda x, y: (m_side_neck(x, y) or 55 <= y <= 86) and not m_side_arm(x, y), (30, 87)),
    **split(m_side_arm, 73, (26.5, 63), (26, 73), 'armR', 'armRf'),
    **split(lambda x, y: y >= 87, 99, (30, 89), (29.5, 99), 'legR', 'legRf'),
}, {'armR': [26, 81]}, m_side_synth)

# ==================== 女生 ====================
# 頭髮垂到肩膀兩側和背後，所以頭的零件包含下巴以下、身體旁邊的頭髮。
F_HAIR_L = table({(61, 63): 19, (64, 70): 18, (71, 74): 15, (75, 79): 14})        # 這一格以左是頭髮
F_HAIR_R = table({(61, 63): 49, (64, 70): 51, (71, 74): 54, (75, 77): 56})        # 這一格以右是頭髮
F_ARM_L = table({(62, 70): 26, (71, 74): 25, (75, 79): 23, (80, 87): 22, (88, 90): 21, (91, 92): 20})
F_ARM_R = table({(62, 70): 43, (71, 74): 44, (75, 78): 45, (79, 83): 46, (84, 87): 47, (88, 92): 49})
def f_neck(x, y): return 57 <= y <= 60 and 32 <= x <= 38
def f_head(x, y):
    if y <= 60: return not f_neck(x, y)
    return (y in F_HAIR_L and x <= F_HAIR_L[y]) or (y in F_HAIR_R and x >= F_HAIR_R[y])
def f_arm_l(x, y): return y in F_ARM_L and x <= F_ARM_L[y] and not f_head(x, y)
def f_arm_r(x, y): return y in F_ARM_R and x >= F_ARM_R[y] and not f_head(x, y)
FK = 120 / 112          # 女生的切割位置是在 120 列的圖上量的
fy = lambda y: int((y + 0.5) * FK)
def f_front_synth(name, pts, ink, skin):
    if name == 'torso': outline(pts, ink, range(round(62 / FK), round(93 / FK)))
F_FRONT = build('f-front', {
    'head':  (f_head, (35, 60)),
    'torso': (lambda x, y: (f_neck(x, y) or 61 <= y <= 94) and not f_head(x, y) and not f_arm_l(x, y) and not f_arm_r(x, y), (35, 94)),
    **split(f_arm_l, 77, (22.5, 66), (19, 77), 'armL', 'armLf'),
    **split(f_arm_r, 77, (46.5, 66), (49.5, 77), 'armR', 'armRf'),
    **split(lambda x, y: y >= 95 and x <= 34, 105, (27, 96), (27.5, 105), 'legL', 'legLf'),
    **split(lambda x, y: y >= 95 and x >= 35, 105, (41.5, 96), (42, 105), 'legR', 'legRf'),
}, {'armL': [15.5, 88], 'armR': [54, 88]}, f_front_synth, k=FK)

F_BACK = table({(60, 61): 30, (62, 63): 28, (64, 69): 26, (70, 78): 25, (79, 89): 23, (90, 92): 24})   # 身體從這一格開始，左邊是頭髮
F_SIDE_ARM = table({(62, 63): 33, (64, 69): 35, (70, 88): 33, (89, 90): 31, (91, 91): 30})
def f_side_head(x, y): return y <= 59 or (y in F_BACK and x < F_BACK[y])
def f_side_arm(x, y): return y in F_SIDE_ARM and x <= F_SIDE_ARM[y] and not f_side_head(x, y)
def f_side_synth(name, pts, ink, skin):
    shorts = pts.get((round(36 / FK), round(88 / FK))) if name == 'torso' else None
    if name == 'torso':
        rows = [y for y in range(round(62 / FK), round(92 / FK) + 1) if fy(y) in F_BACK and fy(y) in F_SIDE_ARM]
        behind_arm(pts, ink, rows, lambda y: round(F_BACK[fy(y)] / FK), lambda y: int(F_SIDE_ARM[fy(y)] / FK), lambda y: (252, 252, 251) if fy(y) <= 83 else shorts)
F_SIDE = build('f-side', {
    'head':  (f_side_head, (38, 59)),
    'torso': (lambda x, y: 60 <= y <= 94 and not f_side_head(x, y) and not f_side_arm(x, y), (32, 94)),
    **split(f_side_arm, 77, (30, 66), (29, 77), 'armR', 'armRf'),
    **split(lambda x, y: y >= 95, 105, (32, 96), (31.5, 105), 'legR', 'legRf'),
}, {'armR': [28, 87]}, f_side_synth, k=FK)

path = os.path.join(HERE, '..', '..', 'src', 'rig', 'parts-data.js')
open(path, 'w').write("// 由 tools/art/build_rig_parts.py 產生：從參考圖切出的身體零件（骨架動畫用），分男（m）女（f）、正面與側面。\n"
                      "// 每個字母是一種顏色（pal），'.' 透明；pivot 是關節在零件裡的位置；scale 是每格畫成幾個像素。\n"
                      "export const RIG_PARTS = " + json.dumps({'m': {'front': M_FRONT, 'side': M_SIDE}, 'f': {'front': F_FRONT, 'side': F_SIDE}}, ensure_ascii=False) + ";\n")
