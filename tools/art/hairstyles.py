# 髮型系統原型（需要 Pillow）：身體（男、女，不含頭髮）＋ 7 種髮型（前層、後層）。
# 執行 python3 tools/art/hairstyles.py 會輸出比較圖 hairstyles.png 與資料 hairstyles.json。
import math, os, sys, json
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 34, 54
OY = 4  # 角色整體往下移，留空間給丸子、翹髮

PAL = {
    'K': '#120d12', 'S': '#ffdcc4', 's': '#f2b9a0', 'W': '#ffffff',
    'E': '#231a20', 'e': '#5a4a54', 'g': '#a4949e',
    'J': '#3a3238', 'j': '#262026', 'I': '#52474f',
    'T': '#ece6e8', 't': '#bdb3b9', 'u': '#8f858c',
    'P': '#353037', 'p': '#231e24', 'q': '#4a434b',
    'O': '#2e292f', 'o': '#48424a', 'w': '#f4f2f6', 'n': '#c3bfc8',
    'D': '#2a2127', 'H': '#3d3036', 'M': '#54434b', 'L': '#76626b',
    'b': '#ffa3a3', 'm': '#e5737d', 'k': '#3f4c86', 'z': '#29325c', 'y': '#5d6eaa', 'v': '#f4f2f6',
}
HAIR_COLORS = {
    '深棕': ('#2a2127', '#3d3036', '#54434b', '#76626b'),
    '栗棕': ('#5a2f1c', '#7e4528', '#a0603a', '#c8875a'),
    '銀白': ('#7a7690', '#a8a4bc', '#c8c4d8', '#ecebf4'),
    '金色': ('#9a6418', '#d09a2c', '#efc451', '#fbe58c'),
    '粉紅': ('#a04a6a', '#d47294', '#ee9ab4', '#fbcbd9'),
    '藍黑': ('#1c2238', '#2c3658', '#43507c', '#6a7ab0'),
}

def blank():
    return [['.'] * W for _ in range(H)]

def span(g, y, a, b, c):
    y += OY
    for x in range(a, b + 1):
        if 0 <= x < W and 0 <= y < H:
            g[y][x] = c

def put(g, y, x, s):
    for i, c in enumerate(s):
        if c != ' ':
            g[y + OY][x + i] = c

def setp(g, pts, c):
    for x, y in pts:
        g[y + OY][x] = c

# ---------- 身體（不含頭髮） ----------
def body():
    g = blank()
    # 頭皮（被頭髮蓋住；平頭時當作頭皮）
    for y in range(H):
        for x in range(W):
            if ((x + 0.5 - 16) / 9.6) ** 2 + ((y - OY + 0.5 - 12) / 9.6) ** 2 <= 1 and y - OY < 14:
                g[y][x] = 'S'
    FACE = {12: (8, 23), 13: (8, 23), 14: (8, 23), 15: (8, 23), 16: (8, 23), 17: (8, 23), 18: (8, 23), 19: (8, 23),
            20: (8, 23), 21: (8, 23), 22: (8, 23), 23: (9, 22), 24: (10, 21), 25: (12, 19)}
    for y, (a, b) in FACE.items():
        span(g, y, a, b, 'S')
    # 耳朵
    setp(g, [(6, 18), (7, 18), (6, 19), (7, 19), (7, 20), (24, 18), (25, 18), (24, 19), (25, 19), (24, 20)], 'S')
    setp(g, [(6, 19), (25, 19)], 's')
    # 臉部陰影
    for y in range(19, 24):
        g[y + OY][23] = 's'
    setp(g, [(22, 23), (21, 24), (19, 25), (12, 25)], 's')
    # 眼睛
    for ex, lid in ((9, 8), (19, 19)):
        span(g, 18, lid, lid + 4, 'K')
        put(g, 19, ex, 'EWEE'); put(g, 20, ex, 'EWEE'); put(g, 21, ex, 'EEee'); put(g, 22, ex, 'eggg')
    setp(g, [(7, 18), (24, 18), (8, 19), (23, 19)], 'K')
    setp(g, [(15, 24), (16, 24)], 's')
    # 脖子與帽兜
    span(g, 25, 13, 18, 'S'); g[25 + OY][13] = 's'; g[25 + OY][18] = 's'
    span(g, 26, 14, 17, 's')
    span(g, 25, 10, 12, 'J'); span(g, 25, 19, 21, 'J')
    span(g, 26, 9, 13, 'J'); span(g, 26, 18, 22, 'J')
    span(g, 27, 9, 13, 'J'); span(g, 27, 18, 22, 'J')
    setp(g, [(10, 25), (9, 26), (10, 26), (9, 27)], 'I')
    setp(g, [(21, 25), (22, 26), (22, 27), (12, 25), (13, 26), (18, 26), (19, 25)], 'j')
    # 外套、白 T
    for y in range(28, 38):
        span(g, y, 9, 22, 'J')
    for y in range(27, 38):
        span(g, y, 14, 17, 'T'); g[y + OY][17] = 't'; g[y + OY][13] = 'K'; g[y + OY][18] = 'K'
    for y in range(32, 37):
        g[y + OY][16] = 't'
    span(g, 36, 14, 17, 't'); span(g, 37, 14, 17, 'u')
    setp(g, [(14, 27), (15, 27), (16, 27)], 's')
    setp(g, [(12, 28), (12, 29), (12, 30), (19, 28), (19, 29), (19, 30), (19, 31)], 'T')
    g[31 + OY][12] = 't'; g[32 + OY][19] = 't'
    for y in range(28, 36):
        g[y + OY][9] = 'I'
    setp(g, [(10, 28), (11, 28), (10, 29), (21, 28), (22, 29), (22, 30), (22, 31), (10, 31), (11, 32), (11, 33), (21, 32), (21, 33), (20, 34)], 'I') if x < 12 and y < 30 else 'j'
    span(g, 35, 10, 11, 'j'); span(g, 35, 20, 21, 'j'); span(g, 37, 9, 22, 'j')
    # 袖子與手
    g[28 + OY][8] = 'J'; g[28 + OY][23] = 'J'
    for y in range(29, 36):
        span(g, y, 6, 7, 'J'); span(g, y, 24, 25, 'J'); g[y + OY][8] = 'K'; g[y + OY][23] = 'K'
    for y in range(31, 36):
        g[y + OY][5] = 'J'; g[y + OY][26] = 'J'
    for y in range(30, 33):
        g[y + OY][6] = 'I'
    for y in range(29, 36):
        g[y + OY][25] = 'j'
    g[33 + OY][5] = 'I'; g[34 + OY][5] = 'I'
    span(g, 35, 5, 7, 'I'); span(g, 35, 24, 26, 'j')
    put(g, 36, 5, 'SSS'); put(g, 37, 5, 'SSs'); put(g, 38, 6, 's')
    put(g, 36, 24, 'SSS'); put(g, 37, 24, 'Sss'); put(g, 38, 25, 's')
    # 褲子
    span(g, 38, 10, 21, 'P'); span(g, 39, 10, 21, 'P')
    setp(g, [(15, 38), (16, 38), (15, 39), (16, 39)], 'p')
    for y in range(40, 45):
        span(g, y, 10, 14, 'P'); span(g, y, 17, 21, 'P')
        g[y + OY][14] = 'p'; g[y + OY][21] = 'p'; g[y + OY][10] = 'q'; g[y + OY][17] = 'q'
    setp(g, [(12, 41), (13, 42), (13, 43), (19, 40), (19, 41), (20, 42)], 'p')
    # 球鞋
    span(g, 45, 9, 14, 'O'); span(g, 45, 17, 22, 'O')
    span(g, 46, 8, 14, 'O'); span(g, 46, 17, 23, 'O')
    setp(g, [(11, 45), (12, 45), (19, 45), (20, 45)], 'o')
    setp(g, [(8, 46), (9, 46), (22, 46), (23, 46)], 'w')
    span(g, 47, 7, 14, 'w'); span(g, 47, 17, 24, 'w')
    setp(g, [(13, 47), (14, 47), (23, 47), (24, 47)], 'n')
    return g

def body_female():
    g = body()
    # 翹睫毛、下睫毛
    setp(g, [(6, 17), (7, 17), (25, 17), (24, 17)], 'K')
    # 腮紅、粉色小嘴
    setp(g, [(9, 23), (10, 23), (21, 23), (22, 23)], 'b')
    setp(g, [(15, 24), (16, 24)], 'm')
    # 百褶裙＋白色長襪（取代長褲）
    for y in range(38, 45):
        for x in range(W):
            if g[y + OY][x] in 'Ppq':
                g[y + OY][x] = '.'
    span(g, 38, 9, 22, 'k'); span(g, 39, 8, 23, 'k'); span(g, 40, 7, 24, 'k'); span(g, 41, 7, 24, 'k')
    for x in (10, 13, 16, 19, 22):
        for y in (39, 40, 41):
            setp(g, [(x, y)], 'z')
    for x in (9, 12, 15, 18, 21):
        for y in (40, 41):
            setp(g, [(x, y)], 'y')
    span(g, 38, 9, 22, 'z')
    span(g, 42, 11, 13, 'S'); span(g, 42, 18, 20, 'S')
    setp(g, [(13, 42), (20, 42)], 's')
    span(g, 43, 11, 13, 'v'); span(g, 44, 11, 13, 'v'); span(g, 43, 18, 20, 'v'); span(g, 44, 18, 20, 'v')
    setp(g, [(13, 43), (13, 44), (20, 43), (20, 44)], 'n')
    return g

# ---------- 髮型工具（座標用身體座標，內部自動加上 OY） ----------
def new_mask():
    return [[False] * W for _ in range(H)]

def poly_fill(mask, pts, val=True):
    pts = [(x, y + OY) for x, y in pts]
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
        for p, q in zip(xs[::2], xs[1::2]):
            for x in range(max(0, math.ceil(p - 0.5)), min(W, math.floor(q - 0.5) + 1)):
                mask[y][x] = val

def ellipse_fill(mask, cx, cy, rx, ry, val=True):
    cy += OY
    for y in range(H):
        for x in range(W):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                mask[y][x] = val

def clear(mask, x0, x1, y0, y1):
    for y in range(y0 + OY, y1 + OY + 1):
        for x in range(x0, x1 + 1):
            mask[y][x] = False

def line_pts(x0, y0, x1, y1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n) + OY) for i in range(n + 1)]

def lines(*segs):
    pts = []
    for sg in segs:
        pts += line_pts(*sg)
    return pts

def shade(mask, ring=(16, 9, 7.5, 2.2), dark=(), light=(), dither=False, ring_on=True):
    """上色：底色 H；頭頂一圈弧形光澤（左上到右上）M/L；下緣與右緣 D；指定的髮絲線 D"""
    out = {}
    cx, cy, r, band = ring
    cy += OY
    for y in range(H):
        for x in range(W):
            if not mask[y][x]:
                continue
            c = 'H'
            d = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.25)
            ang = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
            if ring_on and abs(d - r) < band and -2.7 < ang < -0.5:
                c = 'L' if abs(d - r) < band * 0.45 and -2.4 < ang < -1.2 else 'M'
            if dither and (x + y) % 3 == 0:
                c = 'M' if c == 'H' else c
            below = y + 1 >= H or not mask[y + 1][x]
            right = x + 1 >= W or not mask[y][x + 1]
            if below or (right and c == 'H'):
                c = 'D'
            out[(x, y)] = c
    for p in dark:
        if p in out:
            out[p] = 'D'
    for p in light:
        if p in out:
            out[p] = 'M'
    return out

def face_hole(m, top=13, bottom=24):
    """挖出臉的位置（瀏海之後再畫上去）"""
    clear(m, 8, 23, top, bottom)

# ---------- 髮型 ----------
# 每種回傳 (back, front)：back 畫在身體後面，front 畫在臉上
def style_short_messy():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.6, 9.2)
    for p in [
        [(6.5, 7), (2.5, 4.5), (8.5, 3.5)], [(11, 3.5), (9.5, -0.5), (14.5, 2)], [(16.5, 2), (19, -1), (21.5, 2.5)],
        [(22.5, 4), (28, 2), (26.5, 7.5)], [(26, 9.5), (30.5, 11), (26, 14)], [(6, 9.5), (1.5, 12), (6, 14.5)],
        [(7, 14.5), (3.5, 19), (8.5, 18)], [(25, 14.5), (28.5, 18.5), (23.5, 18)],
    ]:
        poly_fill(m, p)
    face_hole(m)
    poly_fill(m, [(8, 12), (8, 18), (11, 15.5), (13, 12)])
    poly_fill(m, [(12, 12), (14.2, 17.5), (16.5, 12)])
    poly_fill(m, [(16, 12), (18.5, 16.5), (20.5, 12)])
    poly_fill(m, [(19.5, 12), (23.5, 18), (24, 12)])
    return {}, shade(m, dark=lines((12, 4, 10, 9), (19, 3, 21, 8), (15, 6, 15, 10), (7, 9, 6, 13), (25, 9, 26, 13)))

def style_center_part():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.4, 9.0)
    face_hole(m, 12, 24)
    # 窗簾式中分：從中線往兩側蓋住太陽穴，尖端落在眼睛外側，下面接著垂到臉頰的側髮
    poly_fill(m, [(15.9, 10.5), (8, 10.5), (5.5, 13), (5.5, 20.5), (7.5, 22), (8.5, 18), (10, 15), (12.5, 13), (15.9, 12.3)])
    poly_fill(m, [(16.1, 10.5), (24, 10.5), (26.5, 13), (26.5, 20.5), (24.5, 22), (23.5, 18), (22, 15), (19.5, 13), (16.1, 12.3)])
    dark = lines((16, 2, 16, 12), (12, 6, 8, 13), (20, 6, 24, 13), (7, 15, 7, 20), (25, 15, 25, 20))
    return {}, shade(m, ring=(16, 9, 7.2, 2.0), dark=dark)

def style_side_swept():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.5, 9.0)
    poly_fill(m, [(26, 9), (28, 13.5), (26, 19), (24, 16), (24, 11)])
    poly_fill(m, [(6, 10), (3.5, 14.5), (6, 19.5), (8, 16)])
    face_hole(m)
    # 斜瀏海：三撮從右上往左下掃，各自有尖端
    poly_fill(m, [(24, 10), (17, 11), (12, 12.5), (7, 17.5), (12, 15.5), (15, 14), (18, 13)])
    poly_fill(m, [(24, 11), (19, 12.5), (15.5, 16.5), (20, 14.5), (23, 13.5)])
    poly_fill(m, [(24, 12), (22, 14.5), (21, 17), (23.5, 15.5)])
    poly_fill(m, [(8, 11), (8, 14), (12, 12.5), (24, 10), (24, 9), (14, 9)])
    return {}, shade(m, ring=(15, 9, 7.5, 2.1), dark=lines((23, 9, 13, 13), (24, 11, 18, 14), (8, 8, 6, 14), (19, 4, 22, 9)))

def style_buzz():
    m = new_mask()
    # 平頭：和頭型一樣大，髮際線兩側有 M 字轉角；淡淡的光澤加零星暗點
    ellipse_fill(m, 16, 12, 9.6, 9.6)
    clear(m, 0, W - 1, 17, 30)
    face_hole(m, 13, 24)
    poly_fill(m, [(6.4, 12), (6.4, 16.5), (8.5, 16.5), (8.5, 13.5), (11, 12.6), (21, 12.6), (23.5, 13.5), (23.5, 16.5), (25.6, 16.5), (25.6, 12)])
    specks = [(x, y + OY) for x, y in [(10, 5), (13, 4), (19, 4), (22, 6), (9, 9), (12, 8), (17, 7), (21, 9), (24, 10), (8, 12), (14, 11), (19, 11)]]
    f = shade(m, ring=(16, 10, 6.5, 1.2), dark=specks + lines((7, 10, 7, 14), (25, 10, 25, 14)))
    return {}, f

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
    for x, y in [(22, 5), (23, 5), (22, 6), (23, 6)]:
        f[(x, y + OY)] = 'X'
    return b, f

def style_long():
    back = new_mask()
    poly_fill(back, [(5, 10), (27, 10), (28.5, 22), (28, 34), (25, 36), (16, 33), (7, 36), (4, 34), (3.5, 22)])
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.6, 9.2)
    face_hole(m, 12, 24)
    # 齊瀏海但下緣有細缺口，兩側長髮垂到胸前
    poly_fill(m, [(8, 11.5), (8, 16.5), (24, 16.5), (24, 11.5)])
    poly_fill(m, [(5.5, 11), (5, 30), (7, 33), (9.5, 31), (9, 22), (8.5, 15)])
    poly_fill(m, [(26.5, 11), (27, 30), (25, 33), (22.5, 31), (23, 22), (23.5, 15)])
    for x in range(8, 24):
        m[16 + OY][x] = (x % 3 != 1)
    b = shade(back, ring=(16, 14, 9, 1.0))
    f = shade(m, ring=(16, 9, 7.4, 2.0), dark=lines((7, 16, 7, 30), (25, 16, 25, 30), (12, 12, 12, 15), (20, 12, 20, 15)))
    return b, f

def style_bun():
    m = new_mask()
    ellipse_fill(m, 16, 10.5, 10.2, 9.0)
    ellipse_fill(m, 16, -0.5, 4.0, 3.3)   # 頭頂丸子
    face_hole(m)
    poly_fill(m, [(8, 11.5), (8, 14), (12, 13), (16, 12.5), (20, 13), (24, 14), (24, 11.5)])
    poly_fill(m, [(6.5, 13), (6, 21), (8, 20), (8, 15)])
    poly_fill(m, [(25.5, 13), (26, 21), (24, 20), (24, 15)])
    dark = lines((12, 4, 10, 11), (20, 4, 22, 11), (16, 5, 16, 11), (13, -1, 15, 1), (17, -2, 19, 0))
    f = shade(m, ring=(15, 9, 7.4, 2.0), dark=dark)
    for x in range(13, 20):
        if (x, 3 + OY) in f:
            f[(x, 3 + OY)] = 'X'   # 髮帶
    return {}, f

STYLES = [
    ('短亂髮', style_short_messy),
    ('中分', style_center_part),
    ('斜瀏海', style_side_swept),
    ('平頭', style_buzz),
    ('高馬尾', style_ponytail),
    ('長直髮', style_long),
    ('丸子頭', style_bun),
]

# ---------- 合成 ----------
def outline(g, protect):
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

def compose(style_fn, female=False):
    back, front = style_fn()
    g = blank()
    for (x, y), c in back.items():
        g[y][x] = c
    # 後層頭髮和身體之間要有輪廓：先描後層，再疊身體
    g = outline(g, None)
    b = body_female() if female else body()
    for y in range(H):
        for x in range(W):
            if b[y][x] != '.':
                g[y][x] = b[y][x]
    for (x, y), c in front.items():
        g[y][x] = 'K' if c == 'X' else c
    # 前層頭髮蓋在臉上的邊：頭髮下緣碰到皮膚的地方畫黑線
    for (x, y) in front:
        if y + 1 < H and g[y + 1][x] in 'Ss' and (x, y + 1) not in front:
            g[y + 1][x] = 'K'
    return outline(g, None)

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

if __name__ == '__main__':
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
    S = 5
    rows = [
        ('男', False, ['深棕', '栗棕', '銀白', '金色', '藍黑', '深棕', '栗棕']),
        ('女', True, ['栗棕', '金色', '粉紅', '深棕', '粉紅', '藍黑', '銀白']),
    ]
    cw, rh = W * S + 16, H * S + 36
    board = Image.new('RGBA', (cw * len(STYLES) + 16, rh * 2 + 10), (246, 244, 248, 255))
    d = ImageDraw.Draw(board)
    data = {}
    for r, (label, fem, colors) in enumerate(rows):
        for i, (name, fn) in enumerate(STYLES):
            g = compose(fn, fem)
            data[f'{label}-{name}'] = [''.join(row) for row in g]
            x0, y0 = 8 + i * cw, r * rh
            render(g, colors[i], S, board, x0, y0 + 30)
            d.text((x0 + 4, y0 + 4), f'{i + 1} {name}（{label}）', fill=(50, 50, 60), font=font)
    board.save(os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'hairstyles.png'))
    json.dump(data, open(os.path.join(HERE, 'hairstyles.json'), 'w'), ensure_ascii=False)
    print('ok')
