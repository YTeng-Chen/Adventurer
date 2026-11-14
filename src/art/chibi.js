// 手繪 Q 版角色：身體（男、女）＋髮型（前層、後層）＋裝備圖層，黑色輪廓、卡通平塗。
// 身體與髮型是 tools/art/character.py 手繪輸出的資料；裝備在這裡用程式畫，照同樣的畫風。
// 座標說明：圖寬 88、高 108（手繪角色是 68 寬，右邊留空間給武器）。
// 裝備沿用原本 34 寬的設計座標（身體座標），由 ScaledLayer 放大 2 倍再描邊、上色，所以輪廓仍是 1 格細線。
import { Layer, render } from './pixel.js';
import { gearMats } from './palette.js';
import { CHIBI } from './chibi-data.js';

export const W = 88, H = CHIBI.H, OY = CHIBI.OY;
const OW = 44;                               // 裝備設計座標的寬度（放大前）
const INK = '#120d12';
const SPLIT = 82;                            // 呼吸：腰部以上往下移一格
export const PIVOT = { x: 54, y: 83 };       // 武器揮動的支點：右手握把中心（像素邊界座標）
export const GENDER_STYLES = CHIBI.genderStyles;
export const HAIR_COLORS = CHIBI.hairColors;
export const DEFAULT_LOOK = { gender: '男', style: CHIBI.genderStyles['男'][0], color: '栗棕' };

// 放大 2 倍的圖層：用設計座標畫，每格變成 2×2；設計座標的 y 先加 4（原本的上方留白）
class ScaledLayer {
  constructor() { this.inner = new Layer(W, H, 0); }
  each(x, y, fn) { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) fn(2 * x + i, 2 * (y + 4) + j); }
  set(x, y, m, tone = null) { this.each(x, y, (a, b) => this.inner.set(a, b, m, tone)); return this; }
  get(x, y) { return this.inner.get(2 * x, 2 * (y + 4)); }
  erase(x, y) { return this.set(x, y, null); }
  mark(x, y, tone, m) { this.each(x, y, (a, b) => this.inner.mark(a, b, tone, m)); return this; }
  rect(x, y, w, h, m, tone = null) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, m, tone); return this; }
  rows(list, m, tone = null) { for (const [y, a, b] of list) for (let x = a; x <= b; x++) this.set(x, y, m, tone); return this; }
  hline(x0, x1, y, m, tone = null) { for (let x = x0; x <= x1; x++) this.set(x, y, m, tone); return this; }
  vline(x, y0, y1, m, tone = null) { for (let y = y0; y <= y1; y++) this.set(x, y, m, tone); return this; }
  dots(list, m, tone = null) { for (const [x, y] of list) this.set(x, y, m, tone); return this; }
  ellipse(cx, cy, rx, ry, m, tone = null) { this.inner.ellipse(2 * cx + 0.5, 2 * (cy + 4) + 0.5, 2 * rx, 2 * ry, m, tone); return this; }
}
const mk = () => new ScaledLayer();
const MX = (x) => 31 - x; // 身體左右對稱軸在 15.5
function sym(L, pts, m, tone = null) { for (const [x, y] of pts) { L.set(x, y, m, tone); L.set(MX(x), y, m, tone); } return L; }
function symRows(L, rows, m, tone = null) { for (const [y, a, b] of rows) { L.hline(a, b, y, m, tone); L.hline(MX(b), MX(a), y, m, tone); } return L; }
const cel = (L, mats) => render(L.inner || L, mats, { shade: 'cel', outlineColor: INK });

// ---------- 身體與頭髮（資料 → 色塊陣列） ----------
function normalizeLook(look) {
  const l = { ...DEFAULT_LOOK, ...(look || {}) };
  if (!GENDER_STYLES[l.gender]) l.gender = DEFAULT_LOOK.gender;
  if (!GENDER_STYLES[l.gender].includes(l.style)) l.style = GENDER_STYLES[l.gender][0];
  if (!HAIR_COLORS[l.color]) l.color = DEFAULT_LOOK.color;
  return l;
}
function palette(color) {
  const [D, Hc, M, L] = HAIR_COLORS[color];
  return { ...CHIBI.pal, D, H: Hc, M, L };
}
function toGrid(rows, pal) {
  return rows.map((row) => {
    const out = new Array(W).fill(null);
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') out[x] = pal[row[x]];
    return out;
  });
}
// 閉眼：把兩眼換成皮膚（下半是臉頰亮面），畫一條往下彎的眼線
function blinkRows(rows) {
  const g = rows.map((r) => r.split(''));
  for (const [a, b] of [[19, 27], [36, 44]]) {
    for (let y = 32; y <= 44; y++) for (let x = a; x <= b; x++) {
      if ('KEeWg'.includes(g[y + OY][x]) || (y >= 41 && g[y + OY][x] === 's')) g[y + OY][x] = y >= 41 && x >= 20 && x <= 43 ? 'l' : 'S';
    }
    for (let x = a + 1; x <= b - 1; x++) g[40 + OY][x] = 'K';
    g[39 + OY][a] = 'K'; g[39 + OY][b] = 'K';
  }
  return g.map((r) => r.join(''));
}

// ---------- 武器（右手握把；hand 是手指的材質，畫在握把上表示握著） ----------
function fingers(L, hand) {
  if (!hand) return;
  L.hline(24, 28, 37, hand).hline(24, 28, 38, hand);
  L.dots([[25, 37], [27, 37]], hand, 1);
}
function weapon(it, hand) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'blade') {
    const right = r >= 3 ? 29 : 28;
    for (let y = 14; y <= 33; y++) L.hline(26, right, y, 'metal');
    L.dots([[27, 12], [26, 13], [27, 13], [28, 13]], 'metal');
    for (let y = 14; y <= 32; y++) { L.mark(26, y, 3); L.mark(27, y, r >= 3 ? 2 : 1, r >= 3 ? 'glow' : 'metal'); }
    L.hline(23, 31, 34, r >= 1 ? 'trim' : 'metal').hline(24, 30, 35, r >= 1 ? 'trim' : 'metal', 1);
    if (r >= 4) L.dots([[22, 33], [21, 32], [32, 33], [33, 32]], 'gold');
    L.rect(26, 36, 2, 4, 'leather');
    L.rect(26, 40, 2, 1, r >= 2 ? 'gem' : 'metal');
  } else if (it.tag === 'guard') {
    L.rect(26, 16, 2, 27, 'wood');
    for (let y = 18; y <= 40; y += 4) L.mark(27, y, 1);
    L.rows([[8, 22, 31], [9, 21, 32], [10, 21, 32], [11, 21, 32], [12, 21, 32], [13, 21, 32], [14, 21, 32], [15, 22, 31]], 'metal');
    L.rect(21, 9, 2, 6, 'metal', 1).rect(31, 9, 2, 6, 'metal', 1);
    L.dots([[24, 9], [29, 9], [24, 14], [29, 14]], 'metal', 3);
    L.hline(23, 30, 11, r >= 1 ? 'trim' : 'metal', r >= 1 ? null : 1).hline(23, 30, 12, r >= 1 ? 'trim' : 'metal', 1);
    if (r >= 2) L.rows([[5, 26, 27], [6, 26, 27], [7, 25, 28]], 'metal').rect(26, 11, 2, 2, 'gem');
    if (r >= 3) L.rows([[10, 18, 20], [11, 19, 20], [12, 18, 20], [10, 33, 35], [11, 33, 34], [12, 33, 35]], 'metal').hline(23, 30, 14, 'glow');
    if (r >= 4) L.hline(22, 31, 8, 'gold').hline(22, 31, 15, 'gold');
    L.rect(25, 43, 4, 1, 'metal');
  } else {
    L.rect(26, 10, 2, 37, 'wood');
    for (let y = 13; y <= 45; y += 5) L.mark(27, y, 1);
    if (r >= 1) L.rect(26, 20, 2, 2, 'trim');
    const big = r >= 4;
    L.ellipse(27, 5.5, big ? 3.8 : 3, big ? 3.8 : 3, 'orb');
    L.dots([[26, 4], [25, 5]], 'orb', 3);
    L.dots([[23, 8], [24, 9], [25, 10], [31, 8], [30, 9], [29, 10]], 'metal');
    L.hline(25, 29, 11, r >= 4 ? 'gold' : 'metal');
    if (r >= 2) L.dots([[22, 5], [22, 6], [22, 7], [32, 5], [32, 6], [32, 7]], 'metal');
    if (r >= 3) L.dots([[20, 1], [34, 1], [19, 4], [35, 4]], 'glow');
    if (r >= 4) L.dots([[21, 2], [33, 2], [21, 3], [33, 3]], 'gold');
  }
  fingers(L, hand);
  return L;
}

// ---------- 頭飾（要比蓬鬆的頭髮大一圈） ----------
function head(it) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'blade') {
    // 寬沿冒險帽
    L.rows([[-2, 11, 20], [-1, 10, 21], [0, 10, 21], [1, 10, 21], [2, 10, 21], [3, 10, 21], [4, 10, 21], [5, 10, 21]], 'leather');
    L.rows([[6, 3, 28], [7, 2, 29]], 'leather');
    L.hline(2, 29, 7, 'leather', 1);
    L.hline(10, 21, 3, r >= 1 ? 'trim' : 'belt').hline(10, 21, 4, r >= 1 ? 'trim' : 'belt', 1);
    L.rect(14, 2, 4, 3, r >= 4 ? 'gold' : 'metal');
    L.dots([[12, -1], [11, 0], [12, 0]], 'leather', 3);
    if (r >= 2) L.rect(15, 3, 2, 1, 'gem');
    if (r >= 3) L.dots([[22, 2], [23, 1], [24, 0], [25, -1], [26, -2], [23, 2], [24, 1], [25, 0], [26, -1], [27, -2]], 'trim');
    if (r >= 4) L.hline(10, 21, 3, 'gold');
  } else if (it.tag === 'guard') {
    // 騎士頭盔：圓頂、眉帶、護頰，露出臉
    L.ellipse(16, 10, 11.6, 10.4, 'metal');
    symRows(L, [[15, 5, 8], [16, 5, 8], [17, 5, 8], [18, 5, 8], [19, 5, 8], [20, 5, 8], [21, 5, 8], [22, 6, 8], [23, 6, 8], [24, 7, 8]], 'metal');
    for (let y = 13; y <= 26; y++) for (let x = 9; x <= 22; x++) L.erase(x, y);
    L.hline(6, 25, 12, r >= 1 ? 'trim' : 'metal', r >= 1 ? null : 1).hline(7, 24, 11, 'metal', 1);
    L.vline(15, 0, 10, 'metal', 3).vline(16, 0, 10, 'metal', 1);
    sym(L, [[8, 15], [8, 19], [8, 23]], 'metal', 3);
    L.dots([[10, 3], [9, 4], [10, 4]], 'metal', 3);
    if (r >= 2) L.rows([[-4, 15, 17], [-3, 13, 18], [-2, 12, 17], [-1, 14, 17]], 'trim').rect(15, 6, 2, 2, 'gem');
    if (r >= 3) sym(L, [[4, 4], [3, 3], [2, 2], [2, 1], [3, 4], [4, 5]], 'wood');
    if (r >= 4) L.dots([[10, -1], [10, 0], [21, -1], [21, 0], [15, -2], [16, -2]], 'gold').hline(6, 25, 12, 'gold');
  } else {
    // 法師帽：寬帽沿、往後彎的帽尖
    L.ellipse(16, 6.5, 15, 2.3, 'cloth');
    L.rows([[4, 9, 22], [3, 10, 21], [2, 10, 20], [1, 11, 19], [0, 11, 18], [-1, 11, 16], [-2, 10, 14], [-3, 8, 11]], 'cloth');
    L.hline(10, 21, 4, r >= 1 ? 'trim' : 'leather').hline(10, 21, 3, r >= 1 ? 'trim' : 'leather', 1);
    L.dots([[12, 1], [12, 2], [11, -1]], 'cloth', 3);
    L.hline(2, 30, 8, 'cloth', 1);
    if (r >= 2) L.rect(15, 2, 2, 2, 'gem');
    if (r >= 3) L.dots([[18, 0], [21, 2], [8, -2], [26, 5]], 'glow');
    if (r >= 4) L.dots([[19, -1], [20, -1], [21, 0], [21, 1], [20, 2]], 'gold').hline(2, 30, 8, 'gold');
  }
  return L;
}

// ---------- 上衣 ----------
function bodyArmor(it) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'guard') {
    // 板甲：胸甲、大護肩、護臂、護手、腰甲
    symRows(L, [[27, 9, 15], [28, 8, 15], [29, 8, 15], [30, 8, 15], [31, 8, 15], [32, 8, 15], [33, 8, 15], [34, 8, 15], [35, 8, 15], [36, 8, 15]], 'metal');
    symRows(L, [[37, 9, 14], [38, 9, 14], [39, 10, 13]], 'metal');
    symRows(L, [[31, 4, 7], [32, 4, 7], [33, 4, 7], [34, 4, 7], [35, 4, 7], [36, 4, 7], [37, 4, 7], [38, 5, 7]], 'metal');
    symRows(L, [[25, 5, 9], [26, 4, 10], [27, 3, 10], [28, 3, 10], [29, 3, 10], [30, 4, 9]], 'metal');
    L.vline(15, 28, 36, 'metal', 3).vline(16, 28, 36, 'metal', 1);
    L.hline(8, 23, 31, 'metal', 1).hline(9, 22, 34, 'metal', 1);
    sym(L, [[5, 26], [6, 27]], 'metal', 3);
    sym(L, [[4, 33], [4, 35], [5, 37]], 'metal', 1);
    if (r >= 1) { symRows(L, [[30, 4, 9]], 'trim'); L.hline(9, 22, 27, 'trim'); }
    if (r >= 2) L.rect(15, 29, 2, 2, 'gem');
    if (r >= 3) { sym(L, [[4, 24], [5, 23], [3, 25], [6, 24]], 'metal'); L.hline(9, 22, 31, 'glow'); }
    if (r >= 4) { L.hline(9, 22, 27, 'gold'); symRows(L, [[30, 4, 9]], 'gold'); }
  } else if (it.tag === 'blade') {
    // 皮甲背心：V 領、斜背帶、腰帶、皮護臂
    symRows(L, [[27, 10, 15], [28, 9, 15], [29, 9, 15], [30, 9, 15], [31, 9, 15], [32, 9, 15], [33, 9, 15], [34, 9, 15], [35, 9, 15], [36, 9, 15]], 'leather');
    symRows(L, [[32, 5, 7], [33, 5, 7], [34, 5, 7], [35, 5, 7]], 'leather');
    L.dots([[15, 27], [16, 27], [15, 28], [16, 28], [15, 29], [16, 29]], 'cloth');
    for (let i = 0; i < 9; i++) { L.set(10 + i, 28 + i, 'belt'); L.set(11 + i, 28 + i, 'belt'); }
    L.hline(9, 22, 35, 'belt').hline(9, 22, 36, 'belt').rect(15, 35, 2, 2, r >= 2 ? 'gem' : 'buckle');
    for (let y = 29; y <= 33; y += 2) { L.mark(10, y, 3); L.mark(21, y, 1); }
    sym(L, [[5, 33], [5, 35]], 'leather', 1);
    if (r >= 1) { L.hline(9, 22, 34, 'trim'); symRows(L, [[32, 5, 7]], 'trim'); }
    if (r >= 2) L.rows([[26, 5, 9], [27, 4, 10], [28, 4, 10], [29, 5, 9]], 'metal').mark(6, 27, 3);
    if (r >= 3) {
      L.rows([[26, 22, 26], [27, 21, 27], [28, 21, 27], [29, 22, 26]], 'metal');
      L.rows([[25, 11, 20], [26, 10, 21], [27, 9, 11], [28, 8, 10], [29, 8, 9], [30, 7, 8]], 'cape');
    }
    if (r >= 4) sym(L, [[5, 26], [6, 26], [7, 26], [8, 26]], 'gold');
  } else {
    // 法袍：長袍蓋到腳踝、寬袖、披肩、腰帶、中央滾邊
    symRows(L, [[27, 10, 15]], 'cloth');
    for (let y = 28; y <= 37; y++) symRows(L, [[y, 9, 15]], 'cloth');
    for (let y = 38; y <= 41; y++) symRows(L, [[y, 8, 15]], 'cloth');
    for (let y = 42; y <= 44; y++) symRows(L, [[y, 7, 15]], 'cloth');
    symRows(L, [[28, 5, 8], [29, 5, 8], [30, 5, 8], [31, 4, 8], [32, 4, 8], [33, 4, 8], [34, 3, 8], [35, 3, 8]], 'cloth');
    symRows(L, [[25, 9, 15], [26, 8, 15]], 'cloth', 3);
    L.vline(15, 28, 44, r >= 1 ? 'trim' : 'cloth', r >= 1 ? null : 1).vline(16, 28, 44, r >= 1 ? 'trim' : 'cloth', 1);
    L.hline(9, 22, 34, 'leather').hline(9, 22, 35, 'leather').rect(18, 36, 2, 4, 'leather');
    for (let y = 38; y <= 43; y += 2) { L.mark(11, y, 1); L.mark(20, y + 1, 1); }
    if (r >= 1) { L.hline(7, 24, 44, 'trim'); symRows(L, [[35, 3, 8]], 'trim'); }
    if (r >= 2) { L.rect(15, 34, 2, 2, 'gem'); L.dots([[10, 43], [13, 42], [18, 42], [21, 43]], 'glow'); }
    if (r >= 3) symRows(L, [[23, 9, 11], [24, 8, 11]], 'cloth');
    if (r >= 4) { L.hline(7, 24, 44, 'gold'); L.dots([[15, 30], [16, 30], [15, 39], [16, 39]], 'gold'); }
  }
  return L;
}

// 史詩以上的上衣附披風，畫在身體後面；f = 飄動影格 0–2（往左後方飄）
function cape(it, f = 0) {
  const L = mk();
  L.rows([[26, 7, 24], [27, 6, 25], [28, 6, 25]], 'cape');
  for (let y = 29; y <= 46; y++) {
    const t = (y - 29) / 17;
    const sway = Math.round(t * t * [0, 2, 4][f]);
    const left = Math.round(6 - t * 4) - sway, right = Math.round(25 + t * 2) - Math.round(sway / 2);
    L.hline(left, right, y, 'cape');
    L.set(left, y, 'lining');
  }
  for (let x = 0; x < OW; x++) if ((x + f) % 3 === 0 && L.get(x, 46)) L.set(x, 47, 'cape');
  if (it.rarity >= 4) for (let x = 0; x < OW; x++) if (L.get(x, 46) === 'cape') L.mark(x, 46, 2, 'gold');
  return L;
}

// ---------- 鞋子 ----------
function feet(it) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'guard') {
    symRows(L, [[39, 10, 14], [40, 10, 14], [41, 10, 14], [42, 10, 14], [43, 10, 14], [44, 10, 14], [45, 9, 14], [46, 8, 14]], 'metal');
    symRows(L, [[47, 8, 14]], 'joint');
    symRows(L, [[39, 11, 13], [40, 11, 13]], 'metal', 3);
    symRows(L, [[42, 10, 14]], 'metal', 1);
    if (r >= 1) symRows(L, [[44, 10, 14]], 'trim');
    if (r >= 2) sym(L, [[12, 40]], 'gem');
    if (r >= 3) sym(L, [[8, 43], [7, 42], [8, 42], [7, 41]], 'metal');
    if (r >= 4) symRows(L, [[47, 8, 14]], 'gold');
  } else if (it.tag === 'blade') {
    symRows(L, [[41, 9, 14], [42, 10, 14], [43, 10, 14], [44, 10, 14], [45, 9, 14], [46, 8, 14]], 'leather');
    symRows(L, [[47, 7, 14]], 'belt');
    symRows(L, [[41, 9, 14]], r >= 1 ? 'trim' : 'leather', r >= 1 ? null : 3);
    symRows(L, [[43, 10, 14]], 'belt');
    sym(L, [[12, 43]], r >= 2 ? 'gem' : 'buckle');
    if (r >= 3) sym(L, [[8, 42], [7, 41], [8, 41], [7, 40]], 'trim');
    if (r >= 4) symRows(L, [[47, 7, 14]], 'gold');
  } else {
    symRows(L, [[44, 10, 14], [45, 9, 14], [46, 9, 14]], 'cloth');
    sym(L, [[8, 46], [7, 45], [7, 44]], 'cloth');
    symRows(L, [[47, 9, 14]], 'leather');
    symRows(L, [[44, 10, 14]], r >= 1 ? 'trim' : 'cloth', r >= 1 ? null : 1);
    if (r >= 2) sym(L, [[7, 44]], 'gem');
    if (r >= 3) sym(L, [[11, 45], [13, 45]], 'glow');
    if (r >= 4) symRows(L, [[47, 9, 14]], 'gold');
  }
  return L;
}

// ---------- 組合與動畫影格 ----------
function breathe(grid) {
  const out = grid.map((row) => row.slice());
  for (let y = SPLIT; y >= 1; y--) {
    for (let x = 0; x < W; x++) {
      const c = grid[y - 1][x];
      if (c || y < SPLIT) out[y][x] = c;
    }
  }
  out[0] = new Array(W).fill(null);
  return out;
}

const BUILD = { head, body: bodyArmor, feet };
const HAND = { guard: 'metal', blade: 'leather' };
const cache = new Map();
function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
const gearKey = (slot, it) => `${slot}-${it.tag || 'none'}-${it.tier}-${it.rarity}`;

// 角色的各個部位（由下往上疊）。frames({ breath, blink, cape }) 回傳該影格的色塊陣列。
export function heroParts(equip, look) {
  const l = normalizeLook(look);
  const pal = palette(l.color);
  const hair = CHIBI.hair[l.style];
  const parts = [];
  const add = (id, key, make, breathing = true) => parts.push({
    id, key, frames: (o) => cached(`${key}|${o.breath && breathing ? 1 : 0}|${id === 'base' ? (o.blink ? 1 : 0) : ''}|${id === 'cape' ? o.cape : ''}`, () => {
      const g = make(o);
      return o.breath && breathing ? breathe(g) : g;
    }),
  });
  if (hair.back) add('hairBack', `hb-${l.style}-${l.color}`, () => toGrid(hair.back, pal));
  const body = equip && equip.body;
  if (body && body.rarity >= 3) add('cape', 'cape-' + gearKey('body', body), (o) => cel(cape(body, o.cape), gearMats(body)));
  const bodyRows = CHIBI.bodies[l.gender];
  add('base', `base-${l.gender}`, (o) => toGrid(o.blink ? blinkRows(bodyRows) : bodyRows, pal));
  for (const slot of ['feet', 'body']) {
    const it = equip && equip[slot];
    if (it) add(slot, gearKey(slot, it), () => cel(BUILD[slot](it), gearMats(it)));
  }
  add('hairFront', `hf-${l.style}-${l.color}`, () => toGrid(hair.front, pal));
  const hd = equip && equip.head;
  if (hd) add('head', gearKey('head', hd), () => cel(head(hd), gearMats(hd)));
  const wp = equip && equip.weapon;
  if (wp) {
    const hand = body ? HAND[body.tag] || 'skin' : 'skin';
    add('weapon', gearKey('weapon', wp) + '-' + hand, () => cel(weapon(wp, hand), gearMats(wp)));
  }
  return parts;
}

// 單一裝備的圖（背包圖示用，不含手）
export function gearGrid(slot, it) {
  return cel(slot === 'weapon' ? weapon(it, null) : BUILD[slot](it), gearMats(it));
}

// 疊成一張靜態圖（預覽、縮圖用）
export function heroGrid(equip, look, o = { breath: 0, blink: false, cape: 0 }) {
  const out = Array.from({ length: H }, () => new Array(W).fill(null));
  for (const p of heroParts(equip, look)) p.frames(o).forEach((row, y) => row.forEach((c, x) => { if (c) out[y][x] = c; }));
  return out;
}

export { normalizeLook, blinkRows };
