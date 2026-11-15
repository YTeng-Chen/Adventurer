# 把正面參考圖切成骨架動畫用的零件，輸出 src/rig/parts-data.js（需要 Pillow）。
# 執行：python3 tools/art/build_rig_parts.py
# 座標是重新取樣後的像素格（男生正面 60×109、側面 50×99；女生正面 53×111、側面 48×110）。每個零件記錄它在整張圖裡的位置、支點（關節），以及每格的顏色代號。
import os, json
from extract_ref import extract

HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

def build(src, parts, hands, synth=None, clear=(), plain_limbs=False):
    """parts: {名稱: (判斷函式, 支點)}；synth(name, pts, px, ink)：補上被其他零件擋住的像素
    clear：要清成透明的格子 (x0, y0, x1, y1)（被頭髮圍住、沒被去背的白色背景，或取樣雜點）
    plain_limbs：手腳除了輪廓以外全部統一成膚色（去掉取樣雜點）"""
    im = extract(os.path.join(HERE, 'ref', src))
    W, H = im.size
    px = im.load()
    for x0, y0, x1, y1 in clear:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px[x, y] = (0, 0, 0, 0)
    from collections import Counter
    skin = Counter(px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3] and px[x, y][0] > 200 and px[x, y][0] - px[x, y][2] > 25).most_common(1)[0][0]
    ink = min((px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3]), key=sum)
    colors = {}
    def code(rgb):
        if rgb not in colors:
            colors[rgb] = LETTERS[len(colors)]
        return colors[rgb]
    out = {}
    for name, (inside, pivot) in parts.items():
        pts = {(x, y): px[x, y][:3] for y in range(H) for x in range(W) if px[x, y][3] > 0 and inside(x, y)}
        if plain_limbs and name not in ('head', 'torso'):
            pts = {k: (v if sum(v) < 140 else skin) for k, v in pts.items()}
        if synth:
            synth(name, pts, px, ink)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        rows = [''.join(code(pts[(x, y)]) if (x, y) in pts else '.' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
        out[name] = {'x': x0, 'y': y0, 'pivot': [pivot[0] - x0, pivot[1] - y0], 'rows': rows}
    print(src, {k: (v['x'], v['y'], len(v['rows'][0]), len(v['rows'])) for k, v in out.items()}, len(colors), 'colors')
    return {'W': W, 'H': H, 'skin': '#%02x%02x%02x' % skin, 'ink': '#%02x%02x%02x' % ink, 'pal': {c: '#%02x%02x%02x' % rgb for rgb, c in colors.items()}, 'hands': hands, 'parts': out}

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
# 手腳各拆成兩段（上臂／前臂、大腿／小腿），在關節處重疊兩列，彎曲時才不會露出縫隙
def split(inside, joint_y, pivot_top, pivot_joint, a, b):
    return {a: (lambda x, y: inside(x, y) and y <= joint_y + 1, pivot_top),
            b: (lambda x, y: inside(x, y) and y >= joint_y - 1, pivot_joint)}
FRONT = build('male-base-front.webp', {
    'head':  (lambda x, y: y <= 49, (29.5, 50)),
    'torso': (lambda x, y: 50 <= y <= 83 and not arm_l(x, y) and not arm_r(x, y), (29.5, 83)),
    **split(arm_l, 70, (17.5, 61.5), (14.5, 70), 'armL', 'armLf'),
    **split(arm_r, 70, (40.5, 61.5), (45, 70), 'armR', 'armRf'),
    **split(lambda x, y: y >= 84 and x <= 28, 95, (22.5, 85), (21.5, 95), 'legL', 'legLf'),
    **split(lambda x, y: y >= 84 and x >= 30, 95, (36.5, 85), (37.5, 95), 'legR', 'legRf'),
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
    **split(side_arm, 63, (21.5, 54.5), (21, 63), 'armR', 'armRf'),
    **split(lambda x, y: y >= 78, 87, (26, 79), (26, 87), 'legR', 'legRf'),
}, {'armR': [20, 71]}, side_synth)


# ==================== 女生 ====================
# 頭髮垂到肩膀兩側，所以頭的零件包含下巴以下、身體兩旁的頭髮。
def table(spec):
    """{(y0, y1): x} → {y: x}"""
    return {y: x for (y0, y1), x in spec.items() for y in range(y0, y1 + 1)}
def outline(pts, ink, rows):
    """身體被手臂擋住的那一側補上輪廓線"""
    for y in rows:
        xs = [x for (x, yy) in pts if yy == y]
        if not xs: continue
        for x, d in ((min(xs), -1), (max(xs), 1)):
            if sum(pts[(x, y)]) >= 140: pts[(x + d, y)] = ink

F_HAIR_L = table({(49, 50): 15, (51, 51): 14, (52, 55): 13, (56, 57): 12, (58, 59): 11})   # 這一格以左是頭髮
F_HAIR_R = table({(49, 50): 33, (51, 51): 34, (52, 56): 35, (57, 57): 36, (58, 58): 37, (59, 59): 36})
F_ARM_L = table({(52, 53): 17, (54, 63): 18, (64, 67): 16, (68, 71): 15, (72, 73): 14, (74, 74): 15, (75, 76): 14, (77, 77): 13})
F_ARM_R = table({(52, 53): 32, (54, 57): 31, (58, 61): 30, (62, 63): 31, (64, 67): 32, (68, 69): 33, (70, 72): 34, (73, 76): 35, (77, 77): 36})
def f_head(x, y):
    if y <= 47: return True
    if y == 48: return x <= 15 or x >= 33
    return y in F_HAIR_L and (x <= F_HAIR_L[y] or x >= F_HAIR_R[y])
def f_arm_l(x, y): return y in F_ARM_L and x <= F_ARM_L[y] and not f_head(x, y)
def f_arm_r(x, y): return y in F_ARM_R and x >= F_ARM_R[y] and not f_head(x, y)
def f_front_synth(name, pts, px, ink):
    if name == 'torso': outline(pts, ink, range(52, 76))
F_FRONT = build('female-base-front.webp', {
    'head':  (f_head, (24, 48)),
    'torso': (lambda x, y: 48 <= y <= 75 and not f_head(x, y) and not f_arm_l(x, y) and not f_arm_r(x, y), (24.5, 75)),
    **split(f_arm_l, 64, (16, 55), (14, 64), 'armL', 'armLf'),
    **split(f_arm_r, 64, (33, 55), (34.5, 64), 'armR', 'armRf'),
    **split(lambda x, y: y >= 76 and x <= 24 and not f_arm_l(x, y), 92, (19.5, 77), (18, 92), 'legL', 'legLf'),
    **split(lambda x, y: y >= 76 and x >= 25 and not f_arm_r(x, y), 92, (29.5, 77), (31, 92), 'legR', 'legRf'),
}, {'armL': [11.5, 73], 'armR': [37.5, 73]}, f_front_synth,
    clear=[(11, 51, 13, 56), (35, 52, 36, 56), (4, 40, 4, 41), (47, 35, 47, 35), (35, 80, 35, 80), (35, 90, 35, 90), (36, 96, 36, 96)], plain_limbs=True)

# 女生側面（朝右）
def f_side_head(x, y):
    if y <= 42: return True
    if y <= 46: return not (23 <= x <= 27)          # 脖子留給身體
    return y <= 59 and x <= (20 if y == 47 else 19)   # 垂在背後的頭髮
def f_side_arm(x, y):
    if 49 <= y <= 53: return 23 <= x <= 28
    if y == 54: return 23 <= x <= 27
    if 55 <= y <= 62: return 20 <= x <= 27
    if 63 <= y <= 76: return 19 <= x <= 26
    return False
def f_side_synth(name, pts, px, ink):
    tank, skin, shorts = px[30, 55][:3], px[24, 80][:3], px[28, 68][:3]
    if name == 'torso':            # 被手臂擋住的背、腰、短褲
        for y in range(49, 75):
            back = 21 if y <= 63 else 20
            for x in range(back, 28):
                if (x, y) in pts: continue
                if x == back and y >= 55: pts[(x, y)] = ink
                elif y <= 62: pts[(x, y)] = tank
                elif y <= 64: pts[(x, y)] = skin
                else: pts[(x, y)] = shorts
    if name == 'legR':             # 被手擋住的大腿上緣
        for y in (75, 76):
            for x in range(21, 27):
                pts[(x, y)] = ink if x <= 22 else skin
F_SIDE = build('female-base-right.webp', {
    'head':  (f_side_head, (25.5, 45)),
    'torso': (lambda x, y: 43 <= y <= 74 and not f_side_head(x, y) and not f_side_arm(x, y), (27, 75)),
    **split(f_side_arm, 63, (25, 51), (24.5, 63), 'armR', 'armRf'),
    **split(lambda x, y: (y >= 77 or (y >= 75 and x >= 27)), 92, (27, 77), (25.5, 92), 'legR', 'legRf'),
}, {'armR': [22.5, 71]}, f_side_synth, clear=[(9, 53, 9, 55), (31, 103, 31, 103)], plain_limbs=True)

path = os.path.join(HERE, '..', '..', 'src', 'rig', 'parts-data.js')
open(path, 'w').write("// 由 tools/art/build_rig_parts.py 產生：從參考圖切出的身體零件（骨架動畫用），分男（m）女（f）、正面與側面。\n"
                      "// 每個字母是一種顏色（pal），'.' 透明；pivot 是關節在零件裡的位置。\n"
                      "export const RIG_PARTS = " + json.dumps({'m': {'front': FRONT, 'side': SIDE}, 'f': {'front': F_FRONT, 'side': F_SIDE}}, ensure_ascii=False) + ";\n")
