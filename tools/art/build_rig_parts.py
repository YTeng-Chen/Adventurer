# 把參考圖（tools/art/ref/base-sheet.webp）切成骨架動畫用的零件，輸出 src/rig/parts-data.js（需要 Pillow）。
# 執行：python3 tools/art/build_rig_parts.py
# 座標是參考圖原本的像素格（男生 30×59、女生正面 32×66、側面 29×65）；遊戲裡每格畫成 2×2（scale）。
# 每個零件記錄它在整張圖裡的位置、支點（關節），以及每格的顏色代號。
import os, json
from collections import Counter
from extract_sheet import extract_figure

HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
is_ink = lambda c: sum(c) < 60    # 輪廓線；深色頭髮在 77 以上
is_skin = lambda c: c[0] > 190 and c[1] > 140 and c[2] > 110 and c[0] - c[2] > 25

def build(name, parts, hands, synth=None, clear=()):
    """parts: {名稱: (判斷函式, 支點)}；synth(name, pts, ink, skin)：補上被其他零件擋住的像素
    clear：要清成透明的格子 (x0, y0, x1, y1)（被頭髮圍住、沒被去背的白色背景）"""
    im, _ = extract_figure(name, scale=1)
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
        pts = {(x, y): px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3] > 0 and inside(x, y)}
        if pname not in ('head', 'torso'):          # 手腳除了輪廓以外統一成膚色（去掉取樣雜點）
            pts = {k: (ink if is_ink(v) else skin) for k, v in pts.items()}
        if synth:
            synth(pname, pts, ink, skin)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        rows = [''.join(code(pts[(x, y)]) if (x, y) in pts else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        out[pname] = {'x': x0, 'y': y0, 'pivot': [pivot[0] - x0, pivot[1] - y0], 'rows': rows}
    print(name, (W, H), {k: (v['x'], v['y'], len(v['rows'][0]), len(v['rows'])) for k, v in out.items()})
    print('   colors', sorted((sum(c), c) for c in colors))
    hex_ = lambda c: '#%02x%02x%02x' % c
    return {'W': W, 'H': H, 'scale': 2, 'skin': hex_(skin), 'ink': hex_(ink), 'pal': {c: hex_(rgb) for rgb, c in colors.items()}, 'hands': hands, 'parts': out}

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
    return {a: (lambda x, y: inside(x, y) and y <= joint_y, pivot_top),
            b: (lambda x, y: inside(x, y) and y >= joint_y, pivot_joint)}
def behind_arm(pts, ink, rows, back, x1, fill):
    """側面：手臂擋住的背、腰、短褲。back 是背部輪廓的位置，fill(y) 回傳那一列的顏色"""
    for y in rows:
        for x in range(back, x1 + 1):
            if (x, y) not in pts:
                pts[(x, y)] = ink if x == back else fill(y)

# ==================== 男生 ====================
M_ARM_L = table({(30, 33): 10, (34, 36): 11, (37, 38): 10, (39, 42): 9, (43, 44): 8})
M_ARM_R = table({(30, 33): 20, (34, 36): 19, (37, 38): 20, (39, 42): 21, (43, 44): 22})
def m_arm_l(x, y): return y in M_ARM_L and x <= M_ARM_L[y]
def m_arm_r(x, y): return y in M_ARM_R and x >= M_ARM_R[y]
def m_front_synth(name, pts, ink, skin):
    if name == 'torso': outline(pts, ink, range(30, 44))
M_FRONT = build('m-front', {
    'head':  (lambda x, y: y <= 26, (15, 27)),
    'torso': (lambda x, y: 27 <= y <= 43 and not m_arm_l(x, y) and not m_arm_r(x, y), (15, 43.5)),
    **split(m_arm_l, 36, (9.5, 31), (8.5, 36.5), 'armL', 'armLf'),
    **split(m_arm_r, 36, (20.5, 31), (21.5, 36.5), 'armR', 'armRf'),
    **split(lambda x, y: y >= 44 and x <= 15 and not m_arm_l(x, y), 51, (12, 45), (11.5, 51.5), 'legL', 'legLf'),
    **split(lambda x, y: y >= 44 and x >= 15 and not m_arm_r(x, y), 51, (18, 45), (18.5, 51.5), 'legR', 'legRf'),
}, {'armL': [7, 41.5], 'armR': [23, 41.5]}, m_front_synth)

# 側面（朝右）：只看得到靠近鏡頭的手和腿；後面的手腳由程式複製並調暗。手臂垂在身體後半邊，和身體之間沒有線。
def m_side_head(x, y): return y <= 26 or (y == 27 and (x <= 13 or x >= 18))
def m_side_arm(x, y): return (30 <= y <= 43 and x <= 15) or (y == 44 and x <= 13)
def m_side_synth(name, pts, ink, skin):
    shorts = pts.get((17, 41)) if name == 'torso' else None
    if name == 'torso':
        behind_arm(pts, ink, range(30, 44), 12, 15, lambda y: skin if y <= 38 else shorts if y <= 42 else ink)
    if name == 'legR':
        pts[(12, 44)] = ink; pts[(13, 44)] = skin
M_SIDE = build('m-side', {
    'head':  (m_side_head, (16, 27)),
    'torso': (lambda x, y: 27 <= y <= 43 and not m_side_head(x, y) and not m_side_arm(x, y), (15.5, 43.5)),
    **split(m_side_arm, 36, (14, 31.5), (13.5, 36.5), 'armR', 'armRf'),
    **split(lambda x, y: y >= 44 and not m_side_arm(x, y), 51, (15.5, 45), (15, 51.5), 'legR', 'legRf'),
}, {'armR': [12.5, 41.5]}, m_side_synth)

# ==================== 女生 ====================
# 頭髮垂到肩膀兩側，所以頭的零件包含下巴以下、身體兩旁的頭髮。
F_ARM_L = table({(34, 37): 11, (38, 39): 12, (40, 40): 11, (41, 42): 10, (43, 43): 9, (44, 44): 10, (45, 47): 9, (48, 48): 8})
F_ARM_R = table({(34, 40): 20, (41, 42): 21, (43, 43): 22, (44, 45): 21, (46, 47): 22, (48, 48): 23})
def f_head(x, y): return y <= 30 or (y <= 38 and (x <= 8 or x >= 23))
def f_arm_l(x, y): return y in F_ARM_L and x <= F_ARM_L[y] and not f_head(x, y)
def f_arm_r(x, y): return y in F_ARM_R and x >= F_ARM_R[y] and not f_head(x, y)
def f_front_synth(name, pts, ink, skin):
    if name == 'torso': outline(pts, ink, range(34, 48))
F_FRONT = build('f-front', {
    'head':  (f_head, (15.5, 31)),
    'torso': (lambda x, y: 31 <= y <= 47 and not f_head(x, y) and not f_arm_l(x, y) and not f_arm_r(x, y), (15.5, 47.5)),
    **split(f_arm_l, 40, (10.5, 35), (9.5, 40.5), 'armL', 'armLf'),
    **split(f_arm_r, 40, (20.5, 35), (21.5, 40.5), 'armR', 'armRf'),
    **split(lambda x, y: y >= 48 and x <= 15 and not f_arm_l(x, y), 56, (12.5, 49), (12, 56.5), 'legL', 'legLf'),
    **split(lambda x, y: y >= 48 and x >= (15 if y <= 51 else 16) and not f_arm_r(x, y), 56, (19, 49), (19.5, 56.5), 'legR', 'legRf'),
}, {'armL': [8, 45.5], 'armR': [23, 45.5]}, f_front_synth, clear=[(8, 34, 8, 36), (23, 35, 23, 36), (27, 35, 27, 36), (4, 36, 4, 36)])

def f_side_head(x, y):
    if y <= 29: return True
    if y <= 31: return x <= 13
    if y == 32: return x <= 12
    return y <= 38 and x <= (11 if y <= 37 else 10)
def f_side_arm(x, y): return not f_side_head(x, y) and ((34 <= y <= 41 and x <= 16) or (42 <= y <= 45 and x <= 15) or (46 <= y <= 47 and x <= 13))
def f_side_synth(name, pts, ink, skin):
    shorts = pts.get((18, 44)) if name == 'torso' else None
    if name == 'torso':
        behind_arm(pts, ink, range(34, 47), 12, 16, lambda y: (250, 249, 248) if y <= 41 else shorts if y <= 45 else ink)
    if name == 'legR':
        pts[(12, 47)] = ink; pts[(13, 47)] = skin; pts[(14, 47)] = skin
F_SIDE = build('f-side', {
    'head':  (f_side_head, (16, 30.5)),
    'torso': (lambda x, y: 30 <= y <= 46 and not f_side_head(x, y) and not f_side_arm(x, y), (16.5, 46.5)),
    **split(f_side_arm, 40, (14.5, 35), (14, 40.5), 'armR', 'armRf'),
    **split(lambda x, y: y >= 47 and not f_side_arm(x, y), 55, (16.5, 48), (15.5, 55.5), 'legR', 'legRf'),
}, {'armR': [12.5, 44.5]}, f_side_synth, clear=[(11, 38, 11, 38)])

path = os.path.join(HERE, '..', '..', 'src', 'rig', 'parts-data.js')
open(path, 'w').write("// 由 tools/art/build_rig_parts.py 產生：從參考圖切出的身體零件（骨架動畫用），分男（m）女（f）、正面與側面。\n"
                      "// 每個字母是一種顏色（pal），'.' 透明；pivot 是關節在零件裡的位置；scale 是每格畫成幾個像素。\n"
                      "export const RIG_PARTS = " + json.dumps({'m': {'front': M_FRONT, 'side': M_SIDE}, 'f': {'front': F_FRONT, 'side': F_SIDE}}, ensure_ascii=False) + ";\n")
