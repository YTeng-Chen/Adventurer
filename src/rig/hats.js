// 頭飾：每種帽子外觀（gear.js 的 look）一種畫法，畫成一張獨立的小圖，戴在頭上跟著頭轉。
//   炎龍角盔（dragon.js）：全罩式，整顆頭（連臉）都蓋住
//   劍士：皮革冒險帽（帽帶、扣環，稀有度越高羽毛越多）
//   守衛：騎士頭盔（中央稜線、鉚釘、護頰、護鼻，稀有以上有盔纓，傳說有角）
//   術士：尖頂巫師帽（寬帽簷、往後垂的尖頂，稀有以上有星星，史詩以上帽尖有寶珠）
// 材料階級決定材質顏色，稀有度決定裝飾。座標用「大格」（一大格 = 2×2 像素，和角色原圖的方塊一樣大）。
// 戴帽子時，帽簷以上的頭髮會藏起來（被帽子壓住），帽簷以下的瀏海和兩側的頭髮照常露出來。

import { dragonHelm } from './dragon.js';

// 各性別、各視角的帽子位置（大格）：L、R 是帽子左右兩端，B 是帽簷那一列；側面朝右，R 是臉的那一側
export const HAT_AT = {
  m: { front: { L: 1, R: 30, B: 15 }, side: { L: 1, R: 28, B: 15, side: true } },
  f: { front: { L: 1, R: 31, B: 15 }, side: { L: 2, R: 28, B: 15, side: true } },
};

function grid() {
  const cells = new Map();
  const set = (x, y, c) => { if (c) cells.set(`${Math.round(x)},${Math.round(y)}`, c); };
  const row = (x0, x1, y, c) => { for (let x = Math.round(x0); x <= Math.round(x1); x++) set(x, y, c); };
  return { cells, set, row };
}
// 外框：所有和空白相鄰的格子外面描一圈黑線（和角色一樣的粗黑框）
function outline(cells, ink) {
  const out = new Map(cells);
  for (const k of cells.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = `${x + dx},${y + dy}`;
      if (!cells.has(n)) out.set(n, ink);
    }
  }
  return out;
}
// 圓頂：從帽簷往上 D 列，寬度照圓弧收窄；shade(x, k, x0, x1) 決定每格的顏色
function dome(g, x0, x1, B, D, shade) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  for (let k = 0; k < D; k++) {
    const f = Math.sqrt(1 - (k / D) ** 2), a = mid - half * f, b = mid + half * f;
    for (let x = Math.round(a); x <= Math.round(b); x++) g.set(x, B - 1 - k, shade(x, k, a, b));
  }
}
// 一般的明暗：靠光的那一側亮、另一側暗，最上面兩列也亮一點
const lit = (A, c) => (x, k, a, b) => {
  const t = (x - a) / Math.max(1, b - a), w = A.side ? t : 1 - t;
  return w > 0.72 ? c.l : w < 0.22 ? c.d : c.b;
};

function bladeCap(g, A, m, r) {
  const { L, R, B } = A, c = m.leather, trim = m.trim || c.d;
  const x0 = A.side ? L + 2 : L + 3, x1 = A.side ? R - 4 : R - 3;
  dome(g, x0, x1, B, 11, lit(A, c));
  const mid = Math.round((x0 + x1) / 2);
  for (let x = mid - 2; x <= mid + 2; x++) g.cells.delete(`${x},${B - 11}`);          // 帽頂中間壓出一道凹痕
  g.row(mid - 1, mid + 1, B - 10, c.d);
  g.row(x0, x1, B - 2, trim); g.row(x0, x1, B - 1, trim);                       // 帽帶
  if (A.side) { g.row(L - 2, R + 4, B, c.d); g.row(L - 4, L - 1, B - 1, c.d); g.set(L - 4, B - 2, c.d); g.row(R + 2, R + 5, B + 1, c.d); }   // 帽簷：前面往下彎、後面翹起
  else { g.row(L - 2, R + 2, B, c.d); g.row(L - 4, L - 2, B - 1, c.d); g.row(R + 2, R + 4, B - 1, c.d); g.set(L - 4, B - 2, c.d); g.set(R + 4, B - 2, c.d); }   // 帽簷兩端往上翹
  const bx = A.side ? R - 4 : Math.round((L + R) / 2);                           // 扣環
  g.row(bx - 1, bx, B - 2, m.gold); g.row(bx - 1, bx, B - 1, m.gold);
  if (m.gem) { g.set(bx, B - 2, m.gem); }
  // 羽毛：從帽帶往上、往後彎出去
  const feather = (fx, dir, len, col, spine) => {
    for (let i = 0; i < len; i++) {
      const x = fx + dir * Math.round(i * i * 0.06 + i * 0.25), y = B - 3 - i;
      g.set(x, y, i % 3 === 0 ? spine : col); g.set(x + dir, y, col);
      if (i > 2 && i < len - 2) g.set(x + 2 * dir, y + 1, col);
    }
  };
  const fx = A.side ? x0 + 3 : x1 - 4, dir = A.side ? -1 : 1;
  if (r >= 1) feather(fx, dir, 10 + r, m.trim || c.l, c.d);
  if (r >= 4) feather(fx - dir * 3, dir, 9, m.gold, c.d);
}

function guardHelm(g, A, m, r) {
  const { L, R, B } = A, c = m.metal, mid = Math.round((L + R) / 2);
  dome(g, L, R, B, 10, lit(A, c));
  if (!A.side) for (let k = 1; k < 10; k++) { g.set(mid, B - 1 - k, c.l); g.set(mid + 1, B - 1 - k, c.b); }   // 中央稜線
  else for (let x = L + 3; x <= R - 3; x++) if (x % 2 === 0) g.set(x, B - 6, c.d);                         // 側面：一條接縫
  g.row(L, R, B - 1, c.d); g.row(L, R, B, c.d);                                  // 帽緣
  for (let x = L + 1; x <= R - 1; x += 3) g.set(x, B - 1, c.l);                  // 鉚釘
  if (!A.side) {
    for (let y = B + 1; y <= B + 6; y++) { g.row(L, L + 2, y, y === B + 6 ? c.d : c.b); g.row(R - 2, R, y, y === B + 6 ? c.d : c.b); }   // 護頰
    for (let y = B + 1; y <= B + 4; y++) g.row(mid, mid + 1, y, y === B + 4 ? c.d : c.l);                                           // 護鼻
  } else {
    for (let y = B + 1; y <= B + 5; y++) g.row(L, L + 4, y, y === B + 5 ? c.d : c.b);   // 護頸
    for (let y = B + 1; y <= B + 3; y++) g.set(R, y, c.l);                              // 護鼻
  }
  if (m.gem) { const gx = A.side ? R - 2 : mid; g.row(gx, gx + (A.side ? 0 : 1), B - 2, m.gem); g.row(gx, gx + (A.side ? 0 : 1), B - 3, m.gem); }
  if (r >= 2) {                                                                   // 盔纓
    const plume = r >= 4 ? '#d8403a' : r >= 3 ? '#8a4ad0' : '#3f86dd', hi = r >= 4 ? '#ff8a6a' : r >= 3 ? '#c08af0' : '#8fc4ff';   // 盔纓：稀有藍、史詩紫、傳說紅
    if (!A.side) for (let i = 0; i < 7; i++) { g.row(mid - (i < 5 ? 1 : 0), mid + (i < 5 ? 2 : 1), B - 11 - i, i % 2 ? plume : hi); }
    else for (let i = 0; i < 16; i++) {                                          // 側面：從頭頂豎起，再往後垂下
      const x = R - 8 - i, y = B - 12 - Math.min(i, 3) + Math.round(Math.max(0, i - 4) ** 2 / 9);
      g.set(x, y - 1, hi); g.set(x, y, plume); g.set(x, y + 1, plume); g.set(x, y + 2, plume);
      if (i > 5) g.set(x, y + 3, plume); if (i > 9) g.set(x, y + 4, i % 2 ? plume : hi);
    }
  }
  if (r >= 4) {                                                                   // 角
    const horn = (x, dir) => { for (let i = 0; i < 7; i++) { const hx = x + dir * Math.round(i * 0.8), hy = B - 5 - Math.round(i * i * 0.18); g.set(hx, hy, i > 4 ? '#fff6d8' : '#efe6d0'); g.set(hx, hy + 1, '#cfc3a6'); } };
    if (!A.side) { horn(L - 1, -1); horn(R + 1, 1); } else horn(L + 6, -1);
  }
}

function arcaneHat(g, A, m, r) {
  const { L, R, B } = A, c = m.cloth, trim = m.trim || c.l;
  if (A.side) { g.row(L - 3, R + 5, B, c.d); g.row(L - 1, R + 3, B + 1, c.d); }   // 寬帽簷
  else { g.row(L - 4, R + 4, B, c.d); g.row(L - 2, R + 2, B + 1, c.d); g.row(L - 4, R + 4, B - 1, c.b); }
  const H = 20, base = (R - L) / 2 - 2, mid = (L + R) / 2 + (A.side ? -1 : 0), dir = A.side ? -1 : 1;
  for (let k = 0; k < H; k++) {                                                   // 尖頂：越往上越細，尖端往一邊垂
    const t = k / H, half = Math.max(0.6, base * (1 - t) ** 1.15), off = dir * (t ** 2.2) * 11 + (t > 0.85 ? dir * (t - 0.85) * 20 : 0);
    const a = mid + off - half, b = mid + off + half, y = B - 2 - k;
    for (let x = Math.round(a); x <= Math.round(b); x++) {
      const u = (x - a) / Math.max(1, b - a), light = A.side ? u : 1 - u;
      g.set(x, y, light > 0.7 ? c.l : light < 0.25 ? c.d : c.b);
    }
  }
  g.row(L + 2, R - 2, B - 2, trim); g.row(L + 2, R - 2, B - 3, trim);             // 帽帶
  const bx = A.side ? R - 5 : Math.round(mid);
  g.row(bx - 1, bx, B - 3, m.gold); g.row(bx - 1, bx, B - 2, m.gold);            // 扣環
  if (m.gem) g.set(bx, B - 3, m.gem);
  if (r >= 2) for (const [sx, sy] of [[-4, 6], [3, 9], [-1, 12], [5, 4]]) g.set(mid + sx + dir * (sy > 8 ? 2 : 0), B - 2 - sy, m.gold);   // 星星
  if (r >= 3) {                                                                   // 帽尖的寶珠
    const tip = [...g.cells.keys()].map((k) => k.split(',').map(Number)).reduce((a, b) => (b[1] < a[1] ? b : a));
    g.row(tip[0] - 1, tip[0] + 1, tip[1] - 1, m.orb); g.set(tip[0], tip[1] - 2, m.orbL); g.set(tip[0], tip[1], m.orb);
  }
  if (r >= 4) { const mx = Math.round(mid) + (A.side ? -2 : 0), my = B - 9; g.row(mx, mx + 1, my - 1, m.gold); g.set(mx - 1, my, m.gold); g.set(mx - 1, my + 1, m.gold); g.row(mx, mx + 1, my + 2, m.gold); }   // 月亮徽記
}

// 外觀（gear.js 的 look）→ 畫法。新的帽子外觀就在這裡加一種
const STYLES = { cap: bladeCap, helm: guardHelm, wizard: arcaneHat, dragonhelm: dragonHelm };
const FULL = new Set(['dragonhelm']);   // 全罩式：底下的頭髮全部藏起來，臉被頭盔蓋住

// 畫出帽子。回傳 { canvas, x, y }（x、y 是帽子左上角在角色圖裡的像素位置）與 cut（這一列大格以上的頭髮要藏起來）
export function hatCanvas(gender, view, it, m, ink, unit) {
  const A = HAT_AT[gender][view];
  const g = grid();
  (STYLES[it.look] || bladeCap)(g, A, m, it.rarity || 0);
  const cells = outline(g.cells, ink);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k of cells.keys()) { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const canvas = document.createElement('canvas');
  canvas.width = (x1 - x0 + 1) * unit; canvas.height = (y1 - y0 + 1) * unit;
  const ctx = canvas.getContext('2d');
  for (const [k, col] of cells) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = col; ctx.fillRect((x - x0) * unit, (y - y0) * unit, unit, unit); }
  return { canvas, x: x0 * unit, y: y0 * unit, cut: FULL.has(it.look) ? Infinity : A.B };
}
