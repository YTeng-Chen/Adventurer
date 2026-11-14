// 像素繪圖工具：用「材質」畫形狀，再自動加上明暗與輪廓。
// 光源在左上：上緣亮、下緣與右緣暗；輪廓用該材質最深的顏色，不用純黑，看起來比較細緻。

// ---------- 色彩 ----------
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}
// 往目標色相靠近 amt 度（走最短的方向）
function shiftHue(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), amt);
}

// 一個顏色變成五階色票：[輪廓, 暗, 基本, 亮, 高光]。暗部偏藍紫、亮部偏暖黃。
export function ramp(hex) {
  const [h, s, l] = hexToHsl(hex);
  // 暗部：降一點飽和度、色相微偏冷，避免暖色（皮膚、皮革）的陰影變成刺眼的紅
  const dark = (dl, hs, sm) => hslToHex(shiftHue(h, 245, hs), Math.min(1, s * sm), Math.max(0.05, l - dl));
  const light = (dl, hs) => hslToHex(shiftHue(h, 50, hs), s * 0.92, Math.min(0.96, l + dl));
  return [dark(Math.min(l * 0.68, 0.46), 18, 0.7), dark(Math.min(l * 0.24, 0.13), 8, 0.85), hex, light(0.09, 6), light(0.18, 12)];
}

// ---------- 圖層 ----------
// 每個像素存「材質名稱」與可選的「指定色階」。
export class Layer {
  // oy：所有座標往下平移幾格（讓畫在 y=-1 的裝飾也放得下）
  constructor(w, h, oy = 0) { this.w = w; this.h = h; this.oy = oy; this.mat = new Array(w * h).fill(null); this.tone = new Array(w * h).fill(null); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  raw(x, y) { return this.in(x, y) ? this.mat[y * this.w + x] : null; }
  get(x, y) { return this.raw(x, y + this.oy); }
  set(x, y, m, tone = null) { y += this.oy; if (this.in(x, y)) { this.mat[y * this.w + x] = m; this.tone[y * this.w + x] = tone; } return this; }
  erase(x, y) { return this.set(x, y, null); }
  // 只改色階（例如畫摺痕、縫線），不改形狀
  mark(x, y, tone, m) {
    y += this.oy;
    if (!this.in(x, y)) return this;
    const i = y * this.w + x;
    if (m) this.mat[i] = m;
    if (this.mat[i]) this.tone[i] = tone;
    return this;
  }
  rect(x, y, w, h, m, tone = null) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, m, tone); return this; }
  // rows: [[y, x0, x1], ...]（含兩端）
  rows(list, m, tone = null) { for (const [y, a, b] of list) for (let x = a; x <= b; x++) this.set(x, y, m, tone); return this; }
  hline(x0, x1, y, m, tone = null) { for (let x = x0; x <= x1; x++) this.set(x, y, m, tone); return this; }
  vline(x, y0, y1, m, tone = null) { for (let y = y0; y <= y1; y++) this.set(x, y, m, tone); return this; }
  dots(list, m, tone = null) { for (const [x, y] of list) this.set(x, y, m, tone); return this; }
  ellipse(cx, cy, rx, ry, m, tone = null) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, m, tone);
    return this;
  }
  // 左右鏡射：把 x <= axis 的像素複製到右邊（axis 為兩像素之間的中線，例如 15.5）
  mirror(axis) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < axis; x++) {
      const mx = Math.round(2 * axis - x);
      const i = y * this.w + x;
      if (this.mat[i] && this.in(mx, y)) { this.mat[y * this.w + mx] = this.mat[i]; this.tone[y * this.w + mx] = this.tone[i]; }
    }
    return this;
  }
}

// 圖層 → 色塊陣列。mats: { 材質名稱: { ramp, flat?, noOutline? } }
export function render(layer, mats, { outline = true } = {}) {
  const { w, h } = layer;
  const out = Array.from({ length: h }, () => new Array(w).fill(null));
  const filled = (x, y) => layer.raw(x, y) !== null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const m = layer.raw(x, y);
    if (!m) continue;
    const mat = mats[m];
    if (!mat) throw new Error('unknown material ' + m);
    let t = layer.tone[y * w + x];
    if (t === null) {
      if (mat.flat) t = 2;
      else {
        const up = !filled(x, y - 1) || layer.raw(x, y - 1) !== m;
        const down = !filled(x, y + 1);
        const right = !filled(x + 1, y);
        const left = !filled(x - 1, y);
        t = 2;
        if (up && left) t = 4;
        else if (up) t = 3;
        if (down || right) t = 1;
      }
    }
    out[y][x] = mat.ramp[t];
  }
  if (outline) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (filled(x, y)) continue;
      // 找相鄰（上下左右）的材質，用它的輪廓色
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const m = layer.raw(x + dx, y + dy);
        if (m && !mats[m].noOutline) { out[y][x] = mats[m].ramp[0]; break; }
      }
    }
  }
  return out;
}

// 色塊陣列放大兩倍（Scale2x / EPX）：邊緣比直接放大圓滑，用在把舊的 16×16 魔物變成 32×32
export function scale2x(grid) {
  const h = grid.length, w = grid[0].length;
  const out = Array.from({ length: h * 2 }, () => new Array(w * 2).fill(null));
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : grid[y][x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = g(x, y), A = g(x, y - 1), B = g(x + 1, y), C = g(x - 1, y), D = g(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== D && A !== B) e0 = A;
    if (A === B && A !== C && B !== D) e1 = B;
    if (D === C && D !== B && C !== A) e2 = C;
    if (B === D && B !== A && D !== C) e3 = D;
    out[y * 2][x * 2] = e0; out[y * 2][x * 2 + 1] = e1; out[y * 2 + 1][x * 2] = e2; out[y * 2 + 1][x * 2 + 1] = e3;
  }
  return out;
}

// 色塊陣列 → canvas（每格 1px）
export function toCanvas(grid, doc = globalThis.document) {
  const h = grid.length, w = grid[0].length;
  const c = doc.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!grid[y][x]) continue;
    ctx.fillStyle = grid[y][x];
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

// 裁掉四周空白，回傳新的色塊陣列（做圖示用）
export function crop(grid, pad = 1) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
  if (x1 < 0) return [[null]];
  const out = [];
  for (let y = y0 - pad; y <= y1 + pad; y++) {
    const row = [];
    for (let x = x0 - pad; x <= x1 + pad; x++) row.push(grid[y] && grid[y][x] !== undefined ? grid[y][x] : null);
    out.push(row);
  }
  return out;
}
