# 手繪 Q 版角色（高解析度版，需要 Pillow）：身體（男、女）＋ 男女各 3 種髮型（前層、後層）。
# 畫布 68×108；「身體座標」y 會自動往下平移 OY=8 格（留空間給丸子頭、帽子）。
# 比例參考：大頭（約佔身高一半）、寬臉、大眼睛、兩側耳朵、帽兜厚、手臂與身體之間有黑線、大球鞋。
# 執行：python3 tools/art/character.py           → 輸出比較圖 character.png
#      python3 tools/art/character.py --export  → 輸出遊戲用資料 src/art/chibi-data.js、tools/hairstyles-data.js
import math, os, sys, json
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 68, 108
OY = 8
AX = 31.5          # 身體左右對稱軸
MX = lambda x: int(2 * AX - x)

PAL = {
    'K': '#17141b',                                       # 輪廓
    'S': '#f8ceb7', 'l': '#ffe2cb', 's': '#e8b19a', 'r': '#d99e88',  # 皮膚：基本、亮、陰影、深陰影
    'E': '#29232d', 'e': '#5a4a58', 'g': '#a294a0', 'W': '#ffffff',  # 眼睛
    'J': '#353039', 'I': '#514650', 'j': '#26222b',        # 外套
    'T': '#e9e6e5', 't': '#c4bdc0', 'u': '#948a91',        # 白色內搭
    'P': '#302b34', 'q': '#49404a', 'p': '#211d25',        # 褲子
    'w': '#f2eff0', 'n': '#aaa5ad', 'O': '#3a3540',        # 球鞋：白、陰影、深色鞋面
    'b': '#ffa3a3', 'm': '#e5737d',                         # 腮紅、嘴唇（女）
    'B': '#4c72ac', 'd': '#34527f', 'h': '#7398cc', 'G': '#d8ac4a',  # 牛仔褲
    'D': '#241f29', 'H': '#332c35', 'M': '#51454f', 'L': '#6e5f6b',  # 頭髮四階（依髮色替換）
}
HAIR_COLORS = {
    '深棕': ('#241f29', '#332c35', '#51454f', '#6e5f6b'),
    '栗棕': ('#5a2f1c', '#7e4528', '#a0603a', '#c8875a'),
    '銀白': ('#7a7690', '#a8a4bc', '#c8c4d8', '#ecebf4'),
    '金色': ('#9a6418', '#d09a2c', '#efc451', '#fbe58c'),
    '粉紅': ('#a04a6a', '#d47294', '#ee9ab4', '#fbcbd9'),
    '藍黑': ('#1c2238', '#2c3658', '#43507c', '#6a7ab0'),
}

def blank():
    return [['.'] * W for _ in range(H)]

def put1(g, x, y, c):
    y += OY
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = c

def span(g, y, a, b, c):
    for x in range(a, b + 1):
        put1(g, x, y, c)

def rect(g, x, y, w, h, c):
    for yy in range(y, y + h):
        span(g, yy, x, x + w - 1, c)

def dots(g, pts, c):
    for x, y in pts:
        put1(g, x, y, c)

def sym_span(g, y, a, b, c):
    span(g, y, a, b, c); span(g, y, MX(b), MX(a), c)

def sym_dots(g, pts, c):
    dots(g, pts, c); dots(g, [(MX(x), y) for x, y in pts], c)

def get(g, x, y):
    y += OY
    return g[y][x] if 0 <= x < W and 0 <= y < H else '.'

def outline(g):
    out = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and g[yy][xx] not in '.K':
                    out[y][x] = 'K'
                    break
    return out

# ---------- 頭與臉（男女共用） ----------
FACE = [(24, 16, 47), (25, 16, 47), (26, 16, 47), (27, 16, 47), (28, 16, 47), (29, 16, 47), (30, 16, 47), (31, 16, 47),
        (32, 16, 47), (33, 16, 47), (34, 16, 47), (35, 16, 47), (36, 16, 47), (37, 16, 47), (38, 16, 47), (39, 16, 47),
        (40, 16, 47), (41, 17, 46), (42, 17, 46), (43, 17, 46), (44, 18, 45), (45, 18, 45), (46, 19, 44), (47, 20, 43),
        (48, 21, 42), (49, 23, 40), (50, 26, 37)]

def head(g, female=False):
    # 頭皮（頭髮底下；平頭時看得到）
    for y in range(0, 30):
        for x in range(W):
            if ((x + 0.5 - 32) / 19.2) ** 2 + ((y + 0.5 - 24) / 19.2) ** 2 <= 1:
                put1(g, x, y, 'S')
    for y, a, b in FACE:
        span(g, y, a, b, 'S')
    # 臉頰亮面、右側與下巴陰影
    for y in range(41, 48):
        span(g, y, 20, 43, 'l')
    for y in range(30, 47):
        put1(g, 47 if y < 41 else 46, y, 's')
        put1(g, 46 if y < 41 else 45, y, 's') if y > 34 else None
    span(g, 48, 22, 41, 's'); span(g, 49, 23, 40, 's'); span(g, 50, 26, 37, 's')
    dots(g, [(44, 46), (43, 47), (42, 48)], 's')
    # 耳朵（兩側）
    for y, a, b in [(33, 12, 15), (34, 11, 15), (35, 11, 15), (36, 11, 15), (37, 11, 15), (38, 11, 15), (39, 12, 15), (40, 12, 15), (41, 13, 15)]:
        span(g, y, a, b, 'S'); span(g, y, MX(b), MX(a), 'S')
    for y in range(35, 40):
        put1(g, 13, y, 's'); put1(g, 50, y, 'r'); put1(g, 49, y, 's')
    for y in range(33, 42):
        put1(g, 52, y, 's') if get(g, 52, y) == 'S' else None
    # 眼睛：靠近臉中央、高而窄；粗上睫毛往外翹、深色瞳孔、大小兩個高光、下半偏灰
    for x0, flick in ((20, 19), (37, 44)):
        rect(g, x0, 34, 7, 2, 'K')
        put1(g, flick, 34, 'K'); put1(g, flick, 35, 'K')
        if female:
            put1(g, flick + (-1 if flick < 32 else 1), 33, 'K'); put1(g, flick + (-1 if flick < 32 else 1), 32, 'K')
        rect(g, x0, 36, 7, 5, 'E')
        rect(g, x0, 41, 7, 2, 'e')
        rect(g, x0 + 1, 43, 5, 1, 'g')
        dots(g, [(x0, 43), (x0 + 6, 43)], 'e')
        rect(g, x0 + 1, 36, 2, 3, 'W')
        put1(g, x0 + 5, 41, 'W')
        span(g, 44, x0 + 1, x0 + 5, 'K' if female else 's')
    # 鼻子、嘴
    put1(g, 32, 45, 's')
    if female:
        span(g, 48, 30, 33, 'm'); dots(g, [(31, 49), (32, 49)], 'm')
        for x0 in (19, 40):
            span(g, 45, x0, x0 + 4, 'b'); span(g, 46, x0 + 1, x0 + 3, 'b')
    else:
        span(g, 48, 30, 33, 'r')
    # 脖子
    for y in range(50, 55):
        span(g, y, 27, 36, 's')
    span(g, 50, 27, 36, 'r'); span(g, 51, 28, 35, 'r')

# ---------- 男生：連帽外套、白 T、長褲、球鞋 ----------
def body_male():
    g = blank()
    head(g)
    # 帽兜：在脖子兩側鼓起的兩大塊
    for y, a, b in [(49, 20, 26), (50, 19, 27), (51, 18, 27), (52, 17, 27), (53, 17, 26), (54, 17, 26), (55, 17, 25)]:
        sym_span(g, y, a, b, 'J')
    for y, a, b in [(50, 21, 24), (51, 20, 25), (52, 20, 25), (53, 20, 24)]:
        sym_span(g, y, a, b, 'j')      # 帽兜內側暗
    for y, a, b in [(51, 22, 23), (52, 21, 23), (53, 21, 22)]:
        span(g, y, a, b, 'I')          # 左側帽兜亮
    # 外套身體
    for y in range(54, 76):
        sym_span(g, y, 18, 31, 'J')
    # 白 T（開口）
    for y in range(52, 76):
        span(g, y, 28, 35, 'T')
    for y in range(52, 76):
        put1(g, 34, y, 't'); put1(g, 35, y, 't')
    for y in range(66, 76):
        put1(g, 33, y, 't')
    span(g, 74, 28, 35, 'u'); span(g, 75, 28, 35, 'u')
    span(g, 52, 29, 34, 's')           # 領口露出的脖子
    # 外套前襟黑線
    for y in range(53, 76):
        put1(g, 27, y, 'K'); put1(g, 36, y, 'K')
    # 帽繩
    for y in range(55, 64):
        put1(g, 25, y, 'T'); put1(g, 38, y, 'T')
    dots(g, [(25, 64), (38, 64)], 't')
    # 外套亮暗：左亮右暗、皺褶、口袋、下襬
    for y in range(56, 74):
        span(g, y, 19, 21, 'I')
    for y in range(56, 74):
        span(g, y, 42, 44, 'j')
    dots(g, [(22, 62), (23, 63), (23, 64), (41, 66), (40, 67), (40, 68)], 'j')
    span(g, 68, 20, 24, 'j'); span(g, 68, 39, 43, 'I')
    span(g, 74, 18, 45, 'j'); span(g, 75, 18, 45, 'j')
    # 袖子：手臂和身體之間有黑線，下段稍微往外
    for y in range(56, 72):
        sym_span(g, y, 13, 16, 'J')
        put1(g, 17, y, 'K'); put1(g, MX(17), y, 'K')
    for y in range(63, 72):
        sym_span(g, y, 12, 12, 'J')
    for y in range(57, 71):
        put1(g, 13, y, 'I'); put1(g, MX(13), y, 'j'); put1(g, MX(14), y, 'j')
    span(g, 70, 12, 16, 'I'); span(g, 71, 12, 16, 'j'); span(g, 70, 47, 51, 'j'); span(g, 71, 47, 51, 'j')
    # 手：一整塊拳頭，上面亮下面暗
    for y, a, b in [(72, 12, 16), (73, 12, 16), (74, 12, 16), (75, 12, 16), (76, 13, 16), (77, 14, 16)]:
        sym_span(g, y, a, b, 'S')
    sym_span(g, 72, 13, 15, 'l'); sym_span(g, 73, 13, 14, 'l')
    sym_span(g, 76, 13, 16, 's'); sym_span(g, 77, 14, 16, 's')
    # 褲子
    for y in range(76, 80):
        span(g, y, 20, 43, 'P')
    for y in range(80, 90):
        span(g, y, 20, 29, 'P'); span(g, y, 34, 43, 'P')
    for y in range(78, 90):
        put1(g, 28, y, 'p') if y >= 80 else None
        put1(g, 29, y, 'p') if y >= 80 else None
        put1(g, 42, y, 'p'); put1(g, 43, y, 'p')
        put1(g, 21, y, 'q'); put1(g, 35, y, 'q')
    span(g, 76, 20, 43, 'p')
    dots(g, [(30, 78), (31, 78), (32, 78), (33, 78), (31, 79), (32, 79)], 'p')
    dots(g, [(24, 82), (25, 83), (25, 84), (38, 81), (39, 82), (39, 83)], 'p')
    for x0 in (22, 36):
        dots(g, [(x0 + 1, 80), (x0 + 2, 80), (x0 + 1, 81)], 'q')
    # 球鞋：深色鞋面、白色鞋頭與鞋底
    for y, a, b in [(90, 18, 29), (91, 17, 29), (92, 16, 29), (93, 15, 29), (94, 15, 29)]:
        sym_span(g, y, a, b, 'O')
    for y, a, b in [(92, 16, 19), (93, 15, 19), (94, 15, 20)]:
        sym_span(g, y, a, b, 'w')
    sym_span(g, 95, 15, 29, 'w'); sym_span(g, 96, 16, 29, 'n')
    sym_dots(g, [(23, 90), (25, 91), (24, 90), (26, 91)], 'w')    # 鞋帶
    sym_dots(g, [(28, 92), (29, 93), (29, 94)], 'n')
    return g

# ---------- 女生：短版白 T、高腰牛仔褲、白球鞋 ----------
def body_female():
    g = blank()
    head(g, female=True)
    # 白 T：圓領、短袖
    for y in range(52, 72):
        sym_span(g, y, 18, 31, 'T')
    for y, a, b in [(52, 20, 31), (53, 19, 31)]:
        sym_span(g, y, a, b, 'T')
    span(g, 52, 27, 36, 's'); span(g, 53, 28, 35, 's'); span(g, 54, 29, 34, 's')
    dots(g, [(26, 52), (37, 52), (27, 53), (36, 53), (28, 54), (35, 54), (29, 55), (30, 55), (31, 55), (32, 55), (33, 55), (34, 55)], 'u')
    for y in range(54, 72):
        span(g, y, 42, 45, 't')
    dots(g, [(22, 60), (23, 61), (24, 62), (40, 64), (39, 65)], 't')
    span(g, 70, 18, 45, 'u'); span(g, 71, 18, 45, 'u')
    for y in range(56, 64):
        sym_span(g, y, 13, 16, 'T')
        put1(g, 17, y, 'K'); put1(g, MX(17), y, 'K')
    for y in range(57, 63):
        span(g, y, 47, 50, 't')
    sym_span(g, 63, 13, 16, 'u')
    # 手臂與手
    for y in range(64, 72):
        sym_span(g, y, 13, 16, 'S')
        put1(g, 17, y, 'K'); put1(g, MX(17), y, 'K')
    for y in range(64, 72):
        put1(g, MX(13), y, 's'); put1(g, 13, y, 'l') if y < 68 else None
    for y, a, b in [(72, 12, 16), (73, 12, 16), (74, 12, 16), (75, 12, 16), (76, 13, 16), (77, 14, 16)]:
        sym_span(g, y, a, b, 'S')
    sym_span(g, 72, 13, 15, 'l'); sym_span(g, 76, 13, 16, 's'); sym_span(g, 77, 14, 16, 's')
    # 露出一點腰
    span(g, 72, 20, 43, 'S'); span(g, 73, 20, 43, 'S'); span(g, 73, 40, 43, 's')
    # 高腰牛仔褲
    span(g, 74, 20, 43, 'd'); span(g, 75, 20, 43, 'd'); dots(g, [(31, 74), (32, 74), (31, 75), (32, 75)], 'G')
    for y in range(76, 80):
        span(g, y, 20, 43, 'B')
    for y in range(80, 90):
        span(g, y, 21, 29, 'B'); span(g, y, 34, 42, 'B')
        dots(g, [(28, y), (29, y), (41, y), (42, y)], 'd'); dots(g, [(21, y), (34, y)], 'h')
    dots(g, [(30, 78), (31, 78), (32, 78), (33, 78), (31, 79), (32, 79)], 'd')
    for x0 in (22, 36):
        span(g, 77, x0, x0 + 4, 'h'); dots(g, [(x0, 78), (x0 + 4, 78)], 'h')
    dots(g, [(24, 83), (25, 84), (25, 85), (38, 82), (39, 83), (39, 84)], 'd')
    span(g, 88, 21, 29, 'h'); span(g, 89, 21, 29, 'h'); span(g, 88, 34, 42, 'h'); span(g, 89, 34, 42, 'h')
    # 白球鞋
    for y, a, b in [(90, 18, 29), (91, 17, 29), (92, 16, 29), (93, 15, 29), (94, 15, 29), (95, 15, 29)]:
        sym_span(g, y, a, b, 'w')
    sym_span(g, 96, 16, 29, 'n')
    sym_dots(g, [(27, 90), (28, 91), (29, 92), (28, 92), (29, 93), (29, 94), (29, 95)], 'n')
    sym_dots(g, [(22, 90), (24, 91), (23, 90), (25, 91)], 'n')
    return g

# ---------- 髮型（沿用定案的 6 種，座標用原本 34 寬的設計，自動放大 2 倍） ----------
SC = 2

def new_mask():
    return [[False] * W for _ in range(H)]

def poly_fill(mask, pts, val=True):
    pts = [(x * SC, y * SC + OY) for x, y in pts]
    ys = [p[1] for p in pts]
    for y in range(max(0, int(min(ys)) - 1), min(H, int(max(ys)) + 2)):
        cy = y + 0.5
        xs = []
        n = len(pts)
        for i in range(n):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
            if (y1 <= cy < y2) or (y2 <= cy < y1):
                xs.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for p_, q_ in zip(xs[::2], xs[1::2]):
            for x in range(max(0, math.ceil(p_ - 0.5)), min(W, math.floor(q_ - 0.5) + 1)):
                mask[y][x] = val

def ellipse_fill(mask, cx, cy, rx, ry, val=True):
    cx, cy, rx, ry = cx * SC, cy * SC + OY, rx * SC, ry * SC
    for y in range(H):
        for x in range(W):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                mask[y][x] = val

def clear(mask, x0, x1, y0, y1):
    for y in range(y0 * SC + OY, y1 * SC + SC + OY):
        for x in range(x0 * SC, x1 * SC + SC):
            if 0 <= x < W and 0 <= y < H:
                mask[y][x] = False

def line_pts(x0, y0, x1, y1):
    x0, y0, x1, y1 = x0 * SC + 1, y0 * SC + 1 + OY, x1 * SC + 1, y1 * SC + 1 + OY
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]

def lines(*segs):
    pts = []
    for s_ in segs:
        pts += line_pts(*s_)
    return pts

def shade(mask, ring=(16, 9, 7.5, 2.2), dark=(), dither=False, ring_on=True, specks=()):
    out = {}
    cx, cy, r, band = ring[0] * SC, ring[1] * SC + OY, ring[2] * SC, ring[3] * SC
    for y in range(H):
        for x in range(W):
            if not mask[y][x]:
                continue
            c = 'H'
            d = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.25)
            ang = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
            if ring_on and abs(d - r) < band and -2.7 < ang < -0.5:
                c = 'L' if abs(d - r) < band * 0.45 and -2.4 < ang < -1.2 else 'M'
            below = y + 1 >= H or not mask[y + 1][x]
            below2 = y + 2 >= H or not mask[y + 2][x]
            right = x + 1 >= W or not mask[y][x + 1]
            if below or (right and c == 'H'):
                c = 'D'
            elif below2 and c == 'H':
                c = 'D'
            out[(x, y)] = c
    for p in dark:
        if p in out:
            out[p] = 'D'
    for x, y in specks:
        for dx in range(SC):
            for dy in range(SC):
                p = (x * SC + dx, y * SC + dy + OY)
                if p in out and (dx + dy) % 2 == 0:
                    out[p] = 'D'
    return out

def mark_block(out, pts, c):
    for x, y in pts:
        for dx in range(SC):
            for dy in range(SC):
                out[(x * SC + dx, y * SC + dy + OY)] = c

def face_hole(m, top=13, bottom=24):
    clear(m, 8, 23, top, bottom)

def style_center_part():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.4, 9.0)
    face_hole(m, 12, 24)
    poly_fill(m, [(15.9, 10.5), (8, 10.5), (5.5, 13), (5.5, 20.5), (7.5, 22), (8.5, 18), (10, 15), (12.5, 13), (15.9, 12.3)])
    poly_fill(m, [(16.1, 10.5), (24, 10.5), (26.5, 13), (26.5, 20.5), (24.5, 22), (23.5, 18), (22, 15), (19.5, 13), (16.1, 12.3)])
    return {}, shade(m, ring=(16, 9, 7.2, 2.0), dark=lines((16, 2, 16, 12), (12, 6, 8, 13), (20, 6, 24, 13), (7, 15, 7, 20), (25, 15, 25, 20)))

def style_side_swept():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.5, 9.0)
    poly_fill(m, [(26, 9), (28, 13.5), (26, 19), (24, 16), (24, 11)])
    poly_fill(m, [(6, 10), (3.5, 14.5), (6, 19.5), (8, 16)])
    face_hole(m)
    poly_fill(m, [(24, 10), (17, 11), (12, 12.5), (7, 17.5), (12, 15.5), (15, 14), (18, 13)])
    poly_fill(m, [(24, 11), (19, 12.5), (15.5, 16.5), (20, 14.5), (23, 13.5)])
    poly_fill(m, [(24, 12), (22, 14.5), (21, 17), (23.5, 15.5)])
    poly_fill(m, [(8, 11), (8, 14), (12, 12.5), (24, 10), (24, 9), (14, 9)])
    return {}, shade(m, ring=(15, 9, 7.5, 2.1), dark=lines((23, 9, 13, 13), (24, 11, 18, 14), (8, 8, 6, 14), (19, 4, 22, 9)))

def style_buzz():
    m = new_mask()
    ellipse_fill(m, 16, 12, 9.6, 9.6)
    clear(m, 0, 33, 17, 30)
    face_hole(m, 13, 24)
    poly_fill(m, [(6.4, 12), (6.4, 16.5), (8.5, 16.5), (8.5, 13.5), (11, 12.6), (21, 12.6), (23.5, 13.5), (23.5, 16.5), (25.6, 16.5), (25.6, 12)])
    specks = [(10, 5), (13, 4), (19, 4), (22, 6), (9, 9), (12, 8), (17, 7), (21, 9), (24, 10), (8, 12), (14, 11), (19, 11)]
    return {}, shade(m, ring=(16, 10, 6.5, 1.2), dark=lines((7, 10, 7, 14), (25, 10, 25, 14)), specks=specks)

def style_ponytail():
    back = new_mask()
    poly_fill(back, [(21, 4), (27, 3), (30, 8), (29.5, 18), (27, 27), (25, 30), (25.5, 22), (24.5, 12), (22, 8)])
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.3, 9.0)
    face_hole(m)
    poly_fill(m, [(8, 11.5), (8, 16), (10, 14.5), (12, 16.5), (14, 14), (16, 16.5), (18, 14), (20, 16.5), (22, 14.5), (24, 16), (24, 11.5)])
    poly_fill(m, [(6, 12), (5.5, 22), (7.5, 23), (8.5, 15)])
    poly_fill(m, [(26, 12), (26.5, 22), (24.5, 23), (23.5, 15)])
    b = shade(back, ring=(27, 10, 5, 1.5), dark=lines((27, 7, 27, 25)))
    f = shade(m, ring=(15, 9, 7.2, 2.0), dark=lines((12, 6, 9, 12), (19, 5, 22, 11)))
    mark_block(f, [(22, 5), (23, 5), (22, 6), (23, 6)], 'X')
    return b, f

def style_long():
    back = new_mask()
    poly_fill(back, [(5, 10), (27, 10), (28.5, 22), (28, 34), (25, 36), (16, 33), (7, 36), (4, 34), (3.5, 22)])
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.6, 9.2)
    face_hole(m, 12, 24)
    poly_fill(m, [(8, 11.5), (8, 16.5), (24, 16.5), (24, 11.5)])
    poly_fill(m, [(5.5, 11), (5, 30), (7, 33), (9.5, 31), (9, 22), (8.5, 15)])
    poly_fill(m, [(26.5, 11), (27, 30), (25, 33), (22.5, 31), (23, 22), (23.5, 15)])
    # 瀏海下緣的細缺口
    for x in range(8, 24):
        if x % 3 == 1:
            clear(m, x, x, 16, 16)
    b = shade(back, ring=(16, 14, 9, 1.0))
    f = shade(m, ring=(16, 9, 7.4, 2.0), dark=lines((7, 16, 7, 30), (25, 16, 25, 30), (12, 12, 12, 15), (20, 12, 20, 15)))
    return b, f

def style_bun():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.2, 9.0)
    ellipse_fill(m, 16, -0.5, 4.0, 3.3)
    face_hole(m)
    poly_fill(m, [(8, 11.5), (8, 14), (12, 13), (16, 12.5), (20, 13), (24, 14), (24, 11.5)])
    poly_fill(m, [(6.5, 13), (6, 21), (8, 20), (8, 15)])
    poly_fill(m, [(25.5, 13), (26, 21), (24, 20), (24, 15)])
    dark = lines((12, 4, 10, 11), (20, 4, 22, 11), (16, 5, 16, 11), (13, -1, 15, 1), (17, -2, 19, 0))
    f = shade(m, ring=(15, 9, 7.4, 2.0), dark=dark)
    for x in range(13 * SC, 20 * SC):
        for y in (3 * SC + OY, 3 * SC + OY + 1):
            if (x, y) in f:
                f[(x, y)] = 'X'
    return {}, f

STYLES = [('中分', style_center_part), ('斜瀏海', style_side_swept), ('平頭', style_buzz),
          ('高馬尾', style_ponytail), ('長直髮', style_long), ('丸子頭', style_bun)]
GENDER_STYLES = {'男': ['中分', '斜瀏海', '平頭'], '女': ['高馬尾', '長直髮', '丸子頭']}

def layer_grid(px):
    g = blank()
    for (x, y), c in px.items():
        g[y][x] = 'K' if c == 'X' else c
    return outline(g)

def compose(style, female):
    back, front = dict(STYLES)[style]()
    g = layer_grid(back) if back else blank()
    b = outline(body_female() if female else body_male())
    for y in range(H):
        for x in range(W):
            if b[y][x] != '.':
                g[y][x] = b[y][x]
    f = layer_grid(front)
    for y in range(H):
        for x in range(W):
            if f[y][x] != '.':
                g[y][x] = f[y][x]
    return g

def render(g, hair, S, img=None, ox=0, oy=0):
    D_, H_, M_, L_ = HAIR_COLORS[hair]
    pal = dict(PAL, D=D_, H=H_, M=M_, L=L_)
    if img is None:
        img = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c != '.':
                d.rectangle([ox + x * S, oy + y * S, ox + x * S + S - 1, oy + y * S + S - 1], fill=pal[c])
    return img

def export():
    root = os.path.join(HERE, '..', '..')
    data = {
        'W': W, 'H': H, 'OY': OY, 'pal': PAL, 'hairColors': HAIR_COLORS, 'genderStyles': GENDER_STYLES,
        'bodies': {'男': [''.join(r) for r in outline(body_male())], '女': [''.join(r) for r in outline(body_female())]},
        'hair': {},
    }
    for name, fn in STYLES:
        back, front = fn()
        data['hair'][name] = {'back': [''.join(r) for r in layer_grid(back)] if back else None,
                              'front': [''.join(r) for r in layer_grid(front)]}
    open(os.path.join(root, 'src', 'art', 'chibi-data.js'), 'w').write(
        "// 由 tools/art/character.py 產生（python3 tools/art/character.py --export）：手繪 Q 版角色的身體與髮型圖層。\n"
        "// 每個字母是一種顏色（pal），'.' 透明；D/H/M/L 是頭髮四階，依髮色替換。\n"
        "export const CHIBI = " + json.dumps(data, ensure_ascii=False) + ";\n")
    sprites = {f'{gname}-{s}': [''.join(r) for r in compose(s, gname == '女')] for gname, ss in GENDER_STYLES.items() for s in ss}
    pick = {'W': W, 'H': H, 'pal': PAL, 'hairColors': HAIR_COLORS, 'styles': GENDER_STYLES, 'sprites': sprites}
    open(os.path.join(root, 'tools', 'hairstyles-data.js'), 'w').write(
        "// 由 tools/art/character.py 產生：男女各 3 種髮型（已和身體合成），字母代表顏色，'.' 透明；D/H/M/L 是頭髮四階，可換髮色。\n"
        "export const HAIR = " + json.dumps(pick, ensure_ascii=False) + ";\n")

if __name__ == '__main__':
    if '--export' in sys.argv:
        export(); print('exported'); sys.exit(0)
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
    S = 4
    rows = [('男', ['栗棕', '銀白', '深棕']), ('女', ['粉紅', '藍黑', '金色'])]
    cw, rh = W * S + 16, H * S + 36
    board = Image.new('RGBA', (cw * 3 + 16, rh * 2), (246, 244, 248, 255))
    d = ImageDraw.Draw(board)
    for r_, (gname, colors) in enumerate(rows):
        for i, st in enumerate(GENDER_STYLES[gname]):
            x0, y0 = 8 + i * cw, r_ * rh
            render(compose(st, gname == '女'), colors[i], S, board, x0, y0 + 30)
            d.text((x0 + 4, y0 + 4), f'{st}（{gname}）', fill=(50, 50, 60), font=font)
    board.save(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'character.png'))
    print('ok')
