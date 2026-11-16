// 炎龍套裝的外觀與火焰特效：大劍、全罩角盔、鱗甲（護肩、披風）、爪靴，以及連招用到的火焰特效。
// 座標慣例和 rig.js 一樣：裝備圖用「大格」（一大格 = P.unit 像素），特效的 x 往前、y 往上，以腳底為原點。
// 這個檔案不引用 rig.js 或 hats.js，畫圖的小工具都在這裡。

// 龍鱗（暗紅到黑）、熔岩（由外往內越來越亮）、金、龍角
export const DRAGON = {
  s0: '#1a090c', s1: '#33111a', s2: '#561b1f', s3: '#86281f', s4: '#b43a22',
  lava0: '#b8360e', lava1: '#ff5f1a', lava2: '#ffa53a', lava3: '#fff0c2',
  gold0: '#8f5a1c', gold: '#d99a35', gold2: '#ffd36b',
  horn: '#efe4c8', horn2: '#c4b391', horn3: '#8d7c62',
  cape: '#6a1418', capeD: '#3e0b10',
};
// 火焰的顏色：0 最亮（核心）到 4 最暗（邊緣、快熄的火）
export const FIRE = ['#fff6d6', '#ffd166', '#ff8a2a', '#e8461a', '#8a1c10'];

// 固定的亂數：同樣的 (a, b) 一定得到同樣的 0–1 值，火焰才會穩定地閃，不會每格亂跳
export function hash(a, b = 0) { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); }
const RAD = Math.PI / 180;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------- 一格一格的圖：先畫進 Map，再描黑框、輸出成 canvas ----------
export function cells() {
  const m = new Map();
  const set = (x, y, c) => { if (c) m.set(`${Math.round(x)},${Math.round(y)}`, c); };
  const row = (x0, x1, y, c) => { for (let x = Math.round(x0); x <= Math.round(x1); x++) set(x, y, c); };
  return { cells: m, set, row, has: (x, y) => m.has(`${Math.round(x)},${Math.round(y)}`) };
}
function outlined(m, ink) {
  const out = new Map(m);
  for (const k of m.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = `${x + dx},${y + dy}`; if (!m.has(n)) out.set(n, ink); }
  }
  return out;
}
// 輸出：{ canvas, x, y }，x、y 是左上角那一格的座標（乘上 unit 就是像素）。dim < 1 時整體調暗（側面後面的手腳）
export function cellCanvas(m, unit, ink, dim = 1) {
  const all = ink ? outlined(m, ink) : m;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k of all.keys()) { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const canvas = document.createElement('canvas');
  canvas.width = (x1 - x0 + 1) * unit; canvas.height = (y1 - y0 + 1) * unit;
  const ctx = canvas.getContext('2d');
  for (const [k, col] of all) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = dim < 1 ? darken(col, dim) : col; ctx.fillRect((x - x0) * unit, (y - y0) * unit, unit, unit); }
  return { canvas, x: x0, y: y0 };
}
function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

// ---------- 炎龍大劍（25×76 像素，劍尖朝上，握柄是支點） ----------
export const BLADE_SIZE = [25, 76];
export const BLADE_PIVOT = [12.5, 63.5];
export const BLADE_POINTS = { base: [12.5, 49], tip: [12.5, 3] };   // 劍身的兩端（畫布座標），火焰沿著這一段燒
export function drawDragonBlade(ctx, it, ink) {
  const r = it ? it.rarity : 0, D = DRAGON;
  const px = cells();
  // 劍身：劍尖往下 12 列漸寬，之後等寬；左緣是龍牙鋸齒，右緣是磨亮的刃
  for (let y = 2; y <= 49; y++) {
    const half = y < 14 ? Math.round(((y - 2) / 12) * 5) : 5, L = 12 - half, R = 12 + half;
    for (let x = L; x <= R; x++) {
      let c = x <= L + 1 ? D.s1 : x >= R ? '#f3d9cc' : x >= R - 1 ? D.s4 : D.s2;
      if (x >= 11 && x <= 13 && y > 6 && y < 47) c = x === 12 ? (r >= 3 ? D.lava3 : D.lava2) : (r >= 3 ? D.lava2 : D.lava1);   // 中間的熔岩紋
      px.set(x, y, c);
    }
    if (y > 15 && y < 46 && y % 6 === 0) { px.set(L - 1, y, D.s2); px.set(L - 1, y + 1, D.s1); px.set(L - 2, y, D.s1); }   // 龍牙
    if (r >= 4 && y > 16 && y < 44 && y % 7 === 3) { px.set(9, y, D.gold2); px.set(15, y + 2, D.gold2); }                  // 傳說：劍身的金色符文
  }
  // 護手：展開的龍翼，兩端的翼爪往上翹
  const wing = r >= 4 ? 13 : 12;
  for (let x = 12 - wing; x <= 12 + wing; x++) {
    const d = Math.abs(x - 12), lift = Math.round(Math.max(0, d - 6) ** 1.4 / 3);
    for (let y = 50 - lift; y <= 53 - Math.round(d / 5); y++) px.set(x, y, y === 50 - lift ? D.gold2 : y >= 52 - Math.round(d / 5) ? D.gold0 : D.gold);
  }
  for (let y = 51; y <= 54; y++) for (let x = 11; x <= 13; x++) px.set(x, y, (x === 12 && y === 52) || r < 2 ? D.lava2 : D.lava3);   // 龍心寶石
  // 握柄：暗紅皮革，斜纏金線
  for (let y = 55; y <= 69; y++) for (let x = 10; x <= 14; x++) px.set(x, y, (x + y) % 4 === 0 && r >= 1 ? D.gold : x === 10 ? D.s0 : D.s1);
  // 柄頭：龍爪抓著火珠
  for (let y = 70; y <= 74; y++) for (let x = 10; x <= 14; x++) if (Math.hypot(x - 12, y - 72) <= 2.3) px.set(x, y, Math.hypot(x - 12, y - 72) < 1.2 ? D.lava3 : D.lava1);
  [[9, 70], [9, 71], [15, 70], [15, 71], [10, 74], [14, 74], [12, 75]].forEach(([x, y]) => px.set(x, y, D.gold));
  const all = outlined(px.cells, ink);
  for (const [k, col] of all) { const [x, y] = k.split(',').map(Number); if (x < 0 || x >= BLADE_SIZE[0]) continue; ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
}

// ---------- 炎龍角盔：整顆頭罩住，做成龍頭（大格；A 是 hats.js 的帽子位置：L、R 左右、B 帽簷那一列，側面朝右） ----------
// 粗的彎角：沿著 path(i)（i 從 0 到 1）畫，粗細從 w0 收到 1，越往尖端越亮
function hornStroke(g, path, w0, dim) {
  const D = DRAGON, n = 28;
  for (let s = 0; s <= n; s++) {
    const i = s / n, [x, y] = path(i), w = Math.max(0.6, w0 * (1 - i * 0.85));
    for (let dy = -w; dy <= w; dy += 0.5) for (let dx = -w; dx <= w; dx += 0.5) {
      if (dx * dx + dy * dy > w * w) continue;
      const c = dim ? D.horn3 : i > 0.75 ? D.horn : dy > w * 0.3 ? D.horn3 : s % 7 === 0 ? D.horn3 : D.horn2;   // 角上的環紋
      g.set(x + dx, y + dy, c);
    }
  }
}
export function dragonHelm(g, A, m, r) {
  const D = DRAGON, { L, R, B } = A, mid = (L + R) / 2;
  // 甲片：一列一列的橫紋，靠光的一側亮
  const plate = (x, y, x0, x1) => {
    if ((y + 30) % 3 === 0) return D.s1;
    const t = (x - x0) / Math.max(1, x1 - x0), w = A.side ? t : 1 - Math.abs(t - 0.5) * 2;
    return w > 0.7 ? D.s4 : w < 0.25 ? D.s2 : D.s3;
  };
  const ellipse = (cx, cy, rx, ry, fill) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g.set(x, y, fill(x, y));
    }
  };
  if (A.side) {
    // 龍角在最後面（被頭蓋住根部）：主角從頭頂往後掃再微微上翹，後面還有一支暗的
    hornStroke(g, (i) => [L + 9 - 17 * i, B - 10 - 3 * Math.sin(i * Math.PI * 0.9) + 2 * i], r >= 4 ? 2.4 : 2, true);
    hornStroke(g, (i) => [L + 13 - (r >= 4 ? 20 : 18) * i, B - 12 - 5 * Math.sin(i * Math.PI * 0.8) + 1 * i], r >= 4 ? 2.8 : 2.4, false);
    // 頭顱
    ellipse(L + 12, B - 3, 14, 11, (x, y) => plate(x, y, L - 2, R));
    // 後頸的護甲（蓋住後腦和脖子）
    for (let y = B; y <= B + 12; y++) for (let x = L - 1; x <= L + 9; x++) g.set(x, y, y % 2 ? D.s1 : D.s2);
    // 臉頰到上顎：往前伸成長長的龍吻，越前面越低
    for (let x = L + 6; x <= R + 7; x++) {
      const top = x > R - 6 ? Math.round(B + 1 + (x - (R - 6)) * 0.3) : B - 1, bot = x > R + 4 ? B + 5 : B + 6;
      for (let y = top; y <= bot; y++) g.set(x, y, y === top && x > R - 6 ? D.s4 : plate(x, y, L, R + 7));
    }
    g.set(R + 6, B + 3, D.s0); g.set(R + 5, B + 3, D.s0);                                          // 鼻孔
    g.row(R - 3, R + 6, B + 7, D.s0);                                                              // 嘴縫
    for (let y = B + 8; y <= B + 12; y++) for (let x = L + 7; x <= R + 4 - (y - B - 8); x++) g.set(x, y, y === B + 8 ? D.s2 : (x + y) % 4 === 0 ? D.s0 : D.s1);   // 下顎：蓋住下巴到頭的底部
    for (const x of [R - 1, R + 2, R + 5]) { g.set(x, B + 7, D.horn); if (x < R + 5) g.set(x, B + 8, D.horn2); }   // 上排獠牙
    g.set(R + 3, B + 7, D.horn);                                                                   // 下排獠牙往上
    // 眉骨與眼睛：粗的眉骨壓著斜斜的發光眼縫
    g.row(R - 10, R + 1, B - 1, r >= 1 ? D.gold : D.s4); g.row(R - 8, R, B, D.s4);
    g.set(R - 1, B - 2, D.s4); g.set(R - 2, B - 2, D.s4); g.set(R - 3, B - 3, D.horn2);             // 眉骨上的小角
    g.row(R - 6, R - 2, B + 1, r >= 2 ? D.lava3 : D.lava2); g.row(R - 8, R - 5, B + 2, D.lava1);
    if (r >= 3) g.set(R - 3, B + 1, '#ffffff');
    // 臉頰的鰭：往後的三片
    for (let k = 0; k < 3; k++) for (let i = 0; i < 4 - k; i++) g.set(R - 11 - i - k * 2, B + 3 + k * 2 - Math.round(i * 0.5), i === 3 - k ? D.horn2 : D.s4);
    // 後腦往脖子的一排脊刺
    for (let k = 0; k < 6; k++) {
      const a = (-120 - k * 22) * Math.PI / 180, x = L + 12 + Math.cos(a) * 14.5, y = B - 3 + Math.sin(a) * 11.5;
      g.set(x, y, D.s4); g.set(x + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2, k % 2 ? D.horn3 : D.s4);
    }
    if (r >= 4) for (let y = B - 1; y <= B + 6; y++) g.set(L + 8, y, D.gold2);                      // 傳說：臉側的金紋
  } else {
    // 正面：龍角往兩側伸出再往上彎（先畫，根部被頭蓋住）
    const hl = r >= 4 ? 1.15 : 1;
    for (const s of [-1, 1]) hornStroke(g, (i) => [mid + s * (11 + 9 * i * hl), B - 7 - 3 * i - 9 * i * i * hl], 2.6, false);
    // 頭顱
    ellipse(mid, B - 3, 15, 11, (x, y) => plate(x, y, L - 1, R + 1));
    // 臉：往下收成龍的口鼻
    for (let y = B; y <= B + 11; y++) {
      const half = 14 - Math.max(0, y - B - 3) * 1.2;
      for (let x = Math.round(mid - half); x <= Math.round(mid + half); x++) g.set(x, y, y >= B + 6 && Math.abs(x - mid) < half - 1 ? D.s3 : plate(x, y, mid - half, mid + half));
    }
    for (const s of [-1, 1]) {
      g.set(mid + s * 2.5, B + 8, D.s0);                                                           // 鼻孔
      const ex = mid + s * 6;                                                                      // 斜斜往中間下壓的眼睛（V 字）
      g.row(ex - 2, ex + 2, B + 2, r >= 2 ? D.lava3 : D.lava2); g.set(ex - s * 2, B + 1, D.lava1); g.set(ex + s * 2, B + 3, D.lava1);
      g.row(ex - 3, ex + 3, B, r >= 1 ? D.gold : D.s4); g.set(ex - s * 3, B - 1, D.s4);             // 眉骨
      for (let k = 0; k < 3; k++) g.set(mid + s * (13 - k), B + 4 + k * 2, D.horn2);                // 臉頰的鰭
    }
    g.row(Math.round(mid - 4), Math.round(mid + 4), B + 10, D.s0);                                  // 嘴縫
    for (const dx of [-3, -1, 1, 3]) g.set(mid + dx, B + 11, D.horn);                              // 獠牙
    for (let y = B - 14; y <= B - 1; y++) g.set(mid, y, r >= 1 ? D.gold : D.s4);                   // 中央的冠脊
    for (let k = 0; k < 3; k++) { g.set(mid, B - 15 - k, D.s4); g.set(mid - 1, B - 14 - k, D.s3); }
  }
}

// ---------- 炎龍鱗甲（上色函式，大格；L 是 rig.js 的身體位置） ----------
// 甲片：每三列一道接縫，靠光的一側亮
const scale = (x, y, light, dark) => {
  const D = DRAGON;
  if (y % 3 === 0) return dark ? D.s0 : D.s1;
  return light ? D.s4 : dark ? D.s1 : D.s3;
};
export const DRAGON_BODY = {
  own: true,                                        // 整件自己畫：衣領、腰帶、裙甲都在這裡
  pants: [DRAGON.s1, DRAGON.s0],                    // 底下的褲子
  torso(L, x, y, it) {
    const D = DRAGON, r = it.rarity;
    if (y === L.top) return r >= 1 ? D.gold : D.s4;                                     // 衣領
    if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? D.lava3 : D.lava2) : D.gold;   // 金腰帶、熔岩扣
    if (y >= L.shorts) return x % 3 === 0 ? D.s0 : y >= L.shorts + 3 && r >= 3 ? D.lava1 : D.s2;   // 裙甲
    if (L.center(x) && y > L.top + 1) return y === L.top + 3 ? (r >= 2 ? D.lava3 : D.lava2) : r >= 3 ? D.lava2 : D.lava1;   // 胸口的熔岩裂紋與龍心
    if (y === L.top + 6) return D.s0;                                                    // 胸甲下緣
    return scale(x, y, L.light(x), L.dark(x));
  },
  arm(L, y, it) {
    const D = DRAGON;
    if (y <= L.pad) return y < L.pad ? D.s4 : it.rarity >= 1 ? D.gold : D.s3;            // 護肩
    if (y >= L.glove) return y === L.glove ? D.gold : D.s1;                               // 龍爪手甲
    return y % 2 ? D.s3 : D.s2;
  },
};
// 鱗甲的額外零件：護肩的尖刺（掛在上臂）、披風（掛在背上）。回傳 { armR, armL, cape }，位置都是零件內的像素
export function dragonBodyExtras(P, view, it, ink) {
  const D = DRAGON, U = P.unit, side = view === 'side', r = it.rarity, out = {};
  for (const arm of ['armR', 'armL']) {
    const part = P.parts[arm] || P.parts.armR, pc = [Math.round(part.pivot[0] / U), Math.round(part.pivot[1] / U)];
    const g = cells(), back = side ? -1 : arm === 'armR' ? 1 : -1;      // 尖刺往後（側面）或往外（正面）
    for (const [dy, x0, x1] of [[-2, -2, 2], [-1, -3, 3], [0, -3, 3], [1, -3, 2]]) g.row(pc[0] + x0, pc[0] + x1, pc[1] + dy, dy === 1 ? (r >= 1 ? D.gold : D.s3) : dy === -2 ? D.s4 : D.s3);
    for (let i = 0; i < 3; i++) {                                         // 三根尖刺
      const sx = pc[0] - 2 + i * 2;
      for (let k = 0; k < 2 + (i === 1 ? 1 : 0) + (r >= 4 ? 1 : 0); k++) g.set(sx + back * Math.round(k * 0.6), pc[1] - 3 - k, k > 1 ? D.horn : D.horn2);
    }
    const c = cellCanvas(g.cells, U, ink, side && arm === 'armL' ? 0.74 : 1);
    out[arm] = { canvas: c.canvas, x: c.x * U, y: c.y * U };
  }
  // 披風：上緣扣在肩上，往下展開、下襬破碎並燒著熔岩光
  const t = P.parts.torso, g = cells(), len = 24;
  const top = Math.round(4 / U), x0 = side ? 0 : 0, w0 = side ? 4 : Math.round(t.rows[0].length / U) - 1;
  for (let k = 0; k < len; k++) {
    const spread = side ? Math.round(k * 0.36) : Math.round(k * 0.06);
    const a = x0 - spread, b = side ? x0 + w0 : x0 + w0 + spread;
    const bottom = len - 1 - Math.round(hash(k, 3) * 0);
    for (let x = a; x <= b; x++) {
      const cut = len - 1 - Math.round(hash(x, 9) * 3);                  // 破碎的下襬：每一欄長短不一
      if (k > cut) continue;
      const c = k === cut ? (r >= 3 ? D.lava1 : D.lava0) : (x - a) % 3 === 0 ? D.capeD : D.cape;   // 最下面一格燒著熔岩光
      g.set(x, top + k, c);
    }
    void bottom;
  }
  g.row(x0, x0 + Math.min(w0, 3), top, D.gold);                          // 肩上的金扣
  const c = cellCanvas(g.cells, U, ink);
  out.cape = { canvas: c.canvas, x: c.x * U, y: c.y * U, pivot: [(x0 - c.x + 1) * U, (top - c.y) * U] };
  return out;
}

// ---------- 炎龍爪靴（腿的上色，大格；start 是脛甲從哪一列開始） ----------
export const DRAGON_FEET = {
  start: -4,
  paint(L, x, y, it, start) {
    const D = DRAGON;
    if (y === start) return it.rarity >= 1 ? D.gold : D.s4;
    if (y <= start + 1) return D.s4;                                      // 膝甲
    if (y >= L.sole) return D.s0;
    if (y === L.sole - 1 && it.rarity >= 3) return D.lava1;               // 鞋底的熔岩光
    return scale(x, y, L.light(x), L.dark(x));
  },
};
// 爪靴的額外零件：腳尖的龍爪、膝蓋的尖刺（掛在小腿）
export function dragonFeetExtras(P, view, it, ink) {
  const D = DRAGON, U = P.unit, side = view === 'side', out = {};
  for (const leg of ['legRf', 'legLf']) {
    const part = P.parts[leg] || P.parts.legRf, rows = part.rows, g = cells();
    // 找腳尖：最下面幾列裡最靠前（側面朝右）的那一格
    let tip = [0, 0];
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && j >= rows.length - 4 && (side ? i >= tip[0] : true)) tip = [i, j]; }));
    const tx = Math.floor(tip[0] / U), ty = Math.floor(tip[1] / U);
    if (side) {
      [[1, 0], [2, 0], [2, 1], [1, -1], [2, -1], [3, -1]].forEach(([dx, dy]) => g.set(tx + dx, ty + dy, dx >= 3 || (dx === 2 && dy === 1) ? D.horn : D.horn2));   // 腳尖的龍爪
      const kx = Math.floor((part.pivot[0] + 4) / U);
      [[0, 1], [1, 1], [1, 0], [2, 0], [2, -1]].forEach(([dx, dy]) => g.set(kx + dx, 1 + dy, dx === 2 ? D.horn : D.s4));                                       // 膝蓋的尖刺
    } else {
      const cx = Math.floor((part.pivot[0]) / U), by = Math.floor((rows.length - 1) / U);
      [-1, 0, 1].forEach((dx) => g.set(cx + dx, by + 1, D.horn2));          // 正面：腳前三根爪
    }
    const c = cellCanvas(g.cells, U, ink, side && leg === 'legLf' ? 0.74 : 1);
    out[leg] = { canvas: c.canvas, x: c.x * U, y: c.y * U };
  }
  return out;
}

// ---------- 火焰特效 ----------
// env：{ ox, oy（腳底的畫面位置）, cx, cy（肩膀）, dot(x, y, 顏色, 寬, 高), time（秒）, blade（劍身兩端的畫面座標，沒拿大劍時是 null） }
// 回傳 true 表示這個特效由這裡畫好了
export function fireFx(ctx, f, env) {
  const { ox, oy, dot, time } = env, tick = Math.floor(time * 18);
  const fireAt = (k) => FIRE[Math.max(0, Math.min(4, Math.round(k * 4)))];   // 0 → 核心、1 → 邊緣
  switch (f.type) {
    case 'flamearc': {                         // 火焰劍光：越靠近劍的那一端越粗、越亮，外緣竄出火舌
      const span = f.to - f.from, n = Math.max(1, Math.round(Math.abs(span) / 1.1));
      for (let s = 0; s <= n; s++) {
        const k = s / n, a = (f.from + span * k) * RAD, w = Math.max(2, Math.round(f.width * (0.25 + 0.75 * k)));
        const ux = -Math.sin(a), uy = Math.cos(a);
        for (let i = 0; i < w; i++) {
          ctx.globalAlpha = f.alpha * (0.3 + 0.7 * k);
          dot(env.cx + ux * (f.r - i), env.cy + uy * (f.r - i), fireAt(Math.abs(i - w * 0.35) / w + (1 - k) * 0.5), 2, 2);
        }
        if (s % 2 === 0) {                     // 火舌：往外伸、再往上飄
          const len = Math.round((2 + 9 * hash(s, tick)) * k * (f.width / 14));
          for (let j = 1; j <= len; j++) {
            ctx.globalAlpha = f.alpha * k * (1 - j / (len + 1));
            dot(env.cx + ux * (f.r + j), env.cy + uy * (f.r + j) - j * 0.7, j < len / 2 ? FIRE[2] : FIRE[3], 1, 2);
          }
        }
      }
      return true;
    }
    case 'groundfire': {                       // 貼著地面往兩邊衝的火焰波
      for (let x = f.x0; x <= f.x1; x += 2) {
        const edge = Math.min(1, (x - f.x0) / 12, (f.x1 - x) / 12), hh = f.h * (0.45 + 0.55 * hash(x, tick)) * Math.max(0.2, edge);
        for (let y = 0; y < hh; y++) { ctx.globalAlpha = f.alpha * (1 - y / (hh + 2)); dot(ox + x, oy - y, fireAt(y / hh * 0.9 + 0.1), 2, 1); }
      }
      return true;
    }
    case 'pillar': {                           // 火柱：從地面衝上去，邊緣搖晃，頂端碎成火舌
      const H = f.h * clamp01(f.p * 3), half = f.w / 2;
      for (let y = 0; y < H; y += 1) {
        const wob = Math.sin(y * 0.25 + time * 20) * 2, wy = half * (1 - (y / f.h) * 0.35) + hash(y, tick) * 2;
        for (let x = -wy; x <= wy; x += 2) {
          const d = Math.abs(x) / wy;
          if (y > H - 16 && hash(x * 3 + y, tick) < (y - (H - 16)) / 16) continue;   // 頂端的火舌
          ctx.globalAlpha = f.alpha;
          dot(ox + f.x + x + wob, oy - y, d < 0.3 && y < H * 0.8 ? FIRE[0] : fireAt(d * 0.8 + (y / f.h) * 0.3), 2, 1);   // 中心是白熱的
        }
      }
      ctx.globalAlpha = f.alpha;                // 底部的衝擊光圈（兩圈），兩側噴出的火舌
      for (let a = 0; a < 360; a += 4) {
        dot(ox + f.x + Math.cos(a * RAD) * (half + 22 * f.p), oy - 1 + Math.sin(a * RAD) * 4, FIRE[1], 2, 1);
        dot(ox + f.x + Math.cos(a * RAD) * (half + 44 * f.p), oy - 1 + Math.sin(a * RAD) * 6, FIRE[3], 1, 1);
      }
      for (let i = 0; i < 10; i++) {
        const s = i % 2 ? 1 : -1, h0 = H * (0.2 + 0.6 * hash(i, 11)), len = 8 + 14 * hash(i, tick);
        for (let j = 0; j < len; j++) dot(ox + f.x + s * (half + j), oy - h0 - j * 0.8, fireAt(0.3 + j / len * 0.7), 1, 1);
      }
      return true;
    }
    case 'firedragon': {                       // 火龍：沿著波浪的路線撲向目標，身體是一串越來越小的火球
      const P = (u) => {
        const x = f.from[0] + (f.to[0] - f.from[0]) * u, y = f.from[1] + (f.to[1] - f.from[1]) * u;
        const dx = f.to[0] - f.from[0], dy = f.to[1] - f.from[1], l = Math.hypot(dx, dy) || 1, w = Math.sin(u * Math.PI * 2.5) * f.amp * (1 - u * 0.6);
        return [x - (dy / l) * w, y + (dx / l) * w];
      };
      const N = 22, sz = f.size || 1;
      for (let i = N; i >= 1; i--) {
        const u = f.k - i * 0.035;
        if (u < 0) continue;
        const [x, y] = P(u), rr = Math.max(1, (6.5 - i * 0.26) * sz) + hash(i, tick);
        ctx.globalAlpha = f.alpha * (1 - i / (N + 2));
        for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
          const d = Math.hypot(dx, dy) / rr;
          if (d <= 1) dot(ox + x + dx, oy - y + dy, fireAt(d * 0.7 + i / N * 0.4));
        }
        if (i % 3 === 0) dot(ox + x - 2, oy - y - rr - 2 - hash(i, tick) * 4, FIRE[2], 1, 2);   // 背上的火鬃
      }
      // 龍頭：朝前進方向，上顎、張開的下顎、眼睛、往後的角
      const [hx, hy] = P(f.k), [bx, by] = P(Math.max(0, f.k - 0.03));
      let ax = hx - bx, ay = hy - by; const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
      const put = (lx, ly, c) => dot(ox + hx + (ax * lx - ay * ly) * sz, oy - (hy + (ay * lx + ax * ly) * sz), c, 2, 2);
      ctx.globalAlpha = f.alpha;
      for (let lx = -8; lx <= 11; lx += 1) for (let ly = -7; ly <= 7; ly += 1) {
        const upper = ly >= 0 && ly <= 6 - Math.max(0, lx - 3) * 0.7 && lx <= 11;     // 上顎（往前收尖）
        const lower = ly < -1 && ly >= -4 + Math.max(0, lx - 2) * 0.35 && lx <= 8 && lx >= -5;   // 下顎（張開）
        if (!upper && !lower) continue;
        const edgeK = upper ? Math.abs(ly - 3) / 4 : 0.7;
        put(lx, ly, fireAt(edgeK * 0.8 + Math.max(0, lx) / 30));
      }
      put(3, 4, '#ffffff'); put(4, 4, '#ffffff');                                         // 眼睛
      for (let i = 0; i < 9; i++) put(-4 - i, 6 + i * 0.7, i > 5 ? FIRE[0] : FIRE[1]);      // 龍角
      for (let i = 0; i < 5; i++) put(-2 - i * 2, -3 - i * 0.8, FIRE[3]);                 // 下巴的火鬚
      return true;
    }
    case 'lavacrack': {                        // 熔岩裂縫：從 x0 裂到 x1，縫裡發光
      ctx.globalAlpha = f.alpha;
      const len = (f.x1 - f.x0) * clamp01(f.p * 2);
      let y = 0;
      for (let s = 0; s <= len; s += 1) {
        y += (hash(s, 3) - 0.5) * 1.4; y = Math.max(-2, Math.min(2, y));
        const glow = 0.5 + 0.5 * Math.sin(s * 0.4 - time * 14);
        dot(ox + f.x0 + s, oy + 1 + y, glow > 0.6 ? FIRE[1] : FIRE[2], 1, 2);
        if (s % 9 === 4) for (let b = 1; b < 7; b++) dot(ox + f.x0 + s + b, oy + 1 + y + (s % 18 === 4 ? b * 0.5 : -b * 0.4), FIRE[3]);   // 分岔
      }
      return true;
    }
    case 'embers': {                           // 火星：在一個範圍裡往上飄、忽明忽暗
      for (let i = 0; i < f.n; i++) {
        const ph = (time * (f.speed || 0.8) + hash(i, 1)) % 1;
        const x = f.x + (hash(i, 2) - 0.5) * f.w + Math.sin(ph * 6 + i) * 3, y = f.y + ph * f.h;
        ctx.globalAlpha = (f.alpha ?? 1) * Math.sin(ph * Math.PI);
        dot(ox + x, oy - y, i % 3 ? FIRE[1] : FIRE[2], i % 4 === 0 ? 2 : 1);
      }
      return true;
    }
    case 'vortex': {                           // 火焰漩渦：火點繞圈往中心收
      for (let i = 0; i < f.n; i++) {
        const a = (i * 137 + time * 520) * RAD, rr = f.r * (1 - f.p) * (0.35 + 0.65 * hash(i, 5)) + 2;
        ctx.globalAlpha = 0.35 + 0.65 * f.p;
        for (let j = 0; j < 3; j++) dot(ox + f.x + Math.cos(a - j * 0.18) * rr, oy - f.y + Math.sin(a - j * 0.18) * rr * 0.8, FIRE[Math.min(4, j + (i % 2))], j ? 1 : 2);
      }
      return true;
    }
    case 'heat': {                             // 腳下的熔岩光圈
      ctx.globalAlpha = f.alpha;
      for (let a = 0; a < 360; a += 3) {
        const x = Math.cos(a * RAD), y = Math.sin(a * RAD) * 0.25;
        dot(ox + f.x + x * f.rx, oy + 1 + y * f.rx, FIRE[a % 9 === 0 ? 1 : 2], 2, 1);
        if (a % 12 === 0) dot(ox + f.x + x * f.rx * 0.7, oy + 1 + y * f.rx * 0.7, FIRE[3]);
      }
      return true;
    }
    case 'bladefire': {                        // 大劍燒起來：沿著劍身往上竄的火舌和火星
      const b = env.blade;
      if (!b) return true;
      const n = 12, p = f.p;
      for (let i = 0; i <= n; i++) {
        const k = i / n, x = b.base[0] + (b.tip[0] - b.base[0]) * k, y = b.base[1] + (b.tip[1] - b.base[1]) * k;
        const len = Math.round((2 + 7 * hash(i, tick)) * p * (0.6 + 0.4 * (1 - k)));
        for (let j = 0; j < len; j++) {
          ctx.globalAlpha = Math.min(1, p * 1.3) * (1 - j / (len + 1));
          dot(x + Math.sin(i + time * 9) * j * 0.25, y - j, fireAt(j / Math.max(1, len) * 0.8 + 0.15), j < 2 ? 2 : 1, 1);
        }
        if (p > 0.5 && hash(i, tick + 7) > 0.7) { ctx.globalAlpha = 0.8; dot(x + (hash(i, tick) - 0.5) * 6, y - 10 - hash(i, tick + 3) * 12, FIRE[1]); }
      }
      return true;
    }
  }
  return false;
}

// 套裝光環：穿越多件，身邊飄的火星越多；穿齊時腳下有熔岩光
export function dragonAura(ctx, env, count) {
  if (count < 2) return;
  fireFx(ctx, { type: 'embers', x: 0, y: 4, w: 46, h: 96, n: count >= 4 ? 16 : 6, speed: 0.6, alpha: count >= 4 ? 0.95 : 0.7 }, env);
  if (count >= 4) fireFx(ctx, { type: 'heat', x: 0, rx: 22 + Math.sin(env.time * 3) * 2, alpha: 0.55 }, env);
}
