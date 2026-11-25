// 主題套裝共用的小工具：每一套（src/rig/sets/<套裝>.js）只寫自己的色盤和造型，畫法都在這裡。
// 座標慣例和 rig.js、dragon.js 一樣：裝備圖用「大格」（一大格 = P.unit 像素）；特效的 x 往前、y 往上，以腳底為原點。
// 這個檔案不引用 rig.js 或 hats.js（避免互相引用）。
import { cells, cellCanvas, hash } from '../dragon.js';

export { cells, cellCanvas, hash };
const RAD = Math.PI / 180;

// ---------- 色盤 ----------
// 每一套的色盤：
//   c    主材質，暗到亮五階（c[0] 接近黑、c[4] 最亮）
//   a    第二材質，暗到亮三階（皮革、骨頭、布、金屬…）
//   g    發光色，暗到亮三階（眼睛、寶石、裂紋）
//   t    滾邊（精良以上）
//   fx   特效用的五個顏色：0 最亮（核心）到 4 最暗（邊緣），和炎龍的 FIRE 一樣
//   arc  骨架裡的刀光、魔法球、箭：[[核心, 邊緣]（前兩段）, [核心, 邊緣]（終結技）]
// 金屬的光影：t 越大越亮（-1 到 1），整片漸層、不畫條紋
export const tone = (c, t) => (t > 0.55 ? c[4] : t > 0.15 ? c[3] : t > -0.35 ? c[2] : c[1]);
// 身體零件左右的明暗（L 是 rig.js 的身體位置）
export const shade = (L, x, c) => (L.light(x) ? c[3] : L.dark(x) ? c[1] : c[2]);

// ---------- 頭飾用的形狀（g 是 hats.js 的格子：set、row、cells） ----------
// 橢圓：col(x, y, e) 回傳顏色，e 是到中心的距離（0 中心、1 邊緣）
export function ellipse(g, cx, cy, rx, ry, col) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (e <= 1) g.set(x, y, col(x, y, e));
  }
}
// 沿著折線畫一條粗細漸變的線（角、觸角、樹枝、羽毛）：col(i, dy, w) 回傳顏色，i 是 0（起點）到 1（尖端）
export function stroke(g, pts, w0, w1, col) {
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  const n = Math.max(1, Math.ceil(total * 3));
  for (let s = 0; s <= n; s++) {
    let d = (s / n) * total, k = 0;
    while (k < segs.length - 1 && d > segs[k]) { d -= segs[k]; k++; }
    const f = Math.min(1, d / (segs[k] || 1)), x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
    const i = s / n, w = w0 + (w1 - w0) * i;
    for (let dy = -w; dy <= w; dy += 0.5) for (let dx = -w; dx <= w; dx += 0.5) if (dx * dx + dy * dy <= w * w) g.set(x + dx, y + dy, col(i, dy, w, s));
  }
}
// 一列的範圍（x0 > x1 也可以）
export const span = (g, x0, x1, y, c) => { for (let x = Math.round(Math.min(x0, x1)); x <= Math.round(Math.max(x0, x1)); x++) g.set(x, y, typeof c === 'function' ? c(x, y) : c); };
// 貼著頭的圓殼（頭盔、兜帽的底）：側面 cx = L + 13、正面置中；回傳圓殼的中心與半徑，給各套接著畫。
// opt：dx、dy 移動，grow 放大，tall 加高，clip 這一列以下不畫（露臉的頭盔用 A.B - 1）
export function shell(g, A, c, opt = {}) {
  const { L, R, B } = A, side = A.side;
  const cx = side ? L + 13 + (opt.dx || 0) : (L + R) / 2, cy = B - 2 + (opt.dy || 0), rx = (side ? 11.5 : 14.5) + (opt.grow || 0), ry = 10 + (opt.grow || 0) * 0.6 + (opt.tall || 0);
  const clip = opt.clip ?? Infinity;   // 這一列以下不畫（不是全罩式的頭盔，下緣停在帽簷，臉才露得出來）
  ellipse(g, cx, cy, rx, ry, (x, y) => (y > clip ? null : tone(c, side ? ((x - cx) / rx) * 0.6 - ((y - cy) / ry) * 0.9 : 0.5 - (Math.abs(x - cx) / rx) * 1.1 - ((y - cy) / ry) * 0.6)));
  return { cx, cy, rx, ry };
}

// ---------- 上衣的額外零件：護肩、披風 ----------
// 護肩：draw(g, 中心 x, 中心 y, back) 在肩膀支點附近畫；back 是往後（側面）或往外（正面）的方向
export function pauldrons(P, view, it, ink, draw) {
  const U = P.unit, side = view === 'side', out = {};
  for (const arm of ['armR', 'armL']) {
    const part = P.parts[arm] || P.parts.armR, pc = [Math.round(part.pivot[0] / U), Math.round(part.pivot[1] / U)];
    const g = cells(), back = side ? -1 : arm === 'armR' ? 1 : -1;
    draw(g, pc[0], pc[1], back, side);
    const c = cellCanvas(g.cells, U, ink, side && arm === 'armL' ? 0.74 : 1);
    out[arm] = { canvas: c.canvas, x: c.x * U, y: c.y * U };
  }
  return out;
}
// 披風：上緣扣在肩上往下展開。col(x, k, a, b, cut) 回傳顏色（k 是從上往下第幾列，cut 是這一欄的下襬）；
// len 長度、spread 側面往後張開的程度、ragged 下襬破碎的程度、clasp 扣子的顏色
export function cape(P, view, it, ink, { len = 22, spread = 0.34, ragged = 2, clasp, col }) {
  const U = P.unit, side = view === 'side', t = P.parts.torso, g = cells();
  const top = Math.round(4 / U), w0 = side ? 4 : Math.round(t.rows[0].length / U) - 1;
  for (let k = 0; k < len; k++) {
    const sp = side ? Math.round(k * spread) : Math.round(k * 0.06), a = -sp, b = side ? w0 : w0 + sp;
    for (let x = a; x <= b; x++) {
      const cut = len - 1 - Math.round(hash(x, 9) * ragged);
      if (k > cut) continue;
      g.set(x, top + k, col(x, k, a, b, cut));
    }
  }
  if (clasp) g.row(0, Math.min(w0, 3), top, clasp);
  const c = cellCanvas(g.cells, U, ink);
  return { canvas: c.canvas, x: c.x * U, y: c.y * U, pivot: [(1 - c.x) * U, (top - c.y) * U] };
}
// 鞋子的額外零件：腳尖（側面）或腳前（正面）畫一點東西，例如爪子
export function toes(P, view, it, ink, draw) {
  const U = P.unit, side = view === 'side', out = {};
  for (const leg of ['legRf', 'legLf']) {
    const part = P.parts[leg] || P.parts.legRf, rows = part.rows, g = cells();
    let tip = [0, 0];
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && j >= rows.length - 4 && (side ? i >= tip[0] : true)) tip = [i, j]; }));
    draw(g, side ? Math.floor(tip[0] / U) : Math.floor(part.pivot[0] / U), side ? Math.floor(tip[1] / U) : Math.floor((rows.length - 1) / U), side, Math.floor((part.pivot[0] + 4) / U));
    if (!g.cells.size) continue;
    const c = cellCanvas(g.cells, U, ink, side && leg === 'legLf' ? 0.74 : 1);
    out[leg] = { canvas: c.canvas, x: c.x * U, y: c.y * U };
  }
  return out;
}

// ---------- 武器：先畫進格子（1 格 = 1 像素），描黑框後輸出 ----------
// spec：{ size: [寬, 高], pivot: 握柄支點, points?: 劍身兩端（大型特效沿著它）, draw(px, r) }
export function weaponCanvas(spec, it, ink) {
  const px = cells();
  spec.draw(px, it ? it.rarity || 0 : 0);
  const c = document.createElement('canvas');
  c.width = spec.size[0]; c.height = spec.size[1];
  const ctx = c.getContext('2d'), all = new Map(px.cells);
  for (const k of px.cells.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = `${x + dx},${y + dy}`; if (!px.cells.has(n)) all.set(n, ink); }
  }
  for (const [k, col] of all) { const [x, y] = k.split(',').map(Number); if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue; ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
  return { canvas: c, pivot: spec.pivot, points: spec.points };
}
// 握柄：從 y0 到 y1，寬 w（置中在 cx），斜纏的線（精良以上用滾邊色）
export function grip(px, cx, y0, y1, w, c, wrap) {
  const x0 = Math.round(cx - (w - 1) / 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x < x0 + w; x++) px.set(x, y, wrap && (x + y) % 3 === 0 ? wrap : x === x0 ? c[0] : c[1]);
}
// 圓珠（寶石、柄頭、法杖頂端）
export function orb(px, cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d <= 1) px.set(x, y, d < 0.4 && x <= cx && y <= cy ? c[2] : d < 0.75 ? c[1] : c[0]);
  }
}

// ---------- 套裝光環（跟著角色的小特效） ----------
// kind：motes 往上飄的光點、leaves 往下飄的葉子、bubbles 往上冒的泡泡、wisps 繞著身體的幽魂、shards 繞圈的晶片、spores 慢慢飄的孢子、sparks 一閃一閃的火花
// env：rig.js drawFx 的 { ox, oy, dot, time }；cols 是顏色（亮到暗）
export function aura(ctx, env, count, kind, cols) {
  if (count < 2) return;
  const { ox, oy, dot, time } = env, full = count >= 4, n = full ? 14 : 6;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 1), h2 = hash(i, 2), col = cols[i % cols.length];
    if (kind === 'leaves') {                                 // 從頭上往下飄，左右擺
      const ph = (time * 0.35 + h1) % 1, x = (h2 - 0.5) * 50 + Math.sin(ph * 9 + i) * 6, y = 100 - ph * 100;
      ctx.globalAlpha = Math.sin(ph * Math.PI); dot(ox + x, oy - y, col, 2, 1); dot(ox + x + (Math.sin(ph * 9 + i) > 0 ? 1 : -1), oy - y - 1, col, 1, 1);
    } else if (kind === 'wisps' || kind === 'shards') {      // 繞著身體轉
      const a = (time * (kind === 'wisps' ? 70 : 110) + i * (360 / n)) * RAD, rx = 20 + h1 * 6, y = 30 + Math.sin(a * 2 + i) * 18 + h2 * 20;
      const front = Math.sin(a) > 0;
      ctx.globalAlpha = (front ? 0.95 : 0.45) * (full ? 1 : 0.7);
      const x = Math.cos(a) * rx;
      if (kind === 'wisps') { dot(ox + x, oy - y, col, 2, 2); for (let k = 1; k < 4; k++) { ctx.globalAlpha *= 0.6; dot(ox + Math.cos(a - k * 0.12) * rx, oy - y + k, col, 1, 1); } }
      else { dot(ox + x, oy - y - 1, col, 1, 3); dot(ox + x - 1, oy - y, col, 3, 1); }
    } else if (kind === 'bubbles' || kind === 'spores') {    // 慢慢往上冒，越往上越淡
      const ph = (time * (kind === 'bubbles' ? 0.5 : 0.25) + h1) % 1, x = (h2 - 0.5) * 46 + Math.sin(ph * 5 + i) * 4, y = 4 + ph * 90;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * (full ? 1 : 0.7);
      if (kind === 'bubbles' && i % 3 === 0) { dot(ox + x - 1, oy - y, col, 1, 2); dot(ox + x + 2, oy - y, col, 1, 2); dot(ox + x, oy - y - 1, col, 2, 1); dot(ox + x, oy - y + 2, col, 2, 1); }
      else dot(ox + x, oy - y, col, i % 4 === 0 ? 2 : 1);
    } else if (kind === 'sparks') {                          // 身邊一閃一閃
      const ph = (time * 1.3 + h1) % 1, x = (h2 - 0.5) * 44, y = 10 + hash(i, Math.floor(time * 1.3 + h1)) * 80;
      ctx.globalAlpha = ph < 0.3 ? ph / 0.3 : 1 - (ph - 0.3) / 0.7;
      dot(ox + x, oy - y, col, 1, 1); if (ph < 0.25) { dot(ox + x - 1, oy - y, col, 3, 1); dot(ox + x, oy - y - 1, col, 1, 3); }
    } else {                                                 // motes：往上飄的光點
      const ph = (time * 0.6 + h1) % 1, x = (h2 - 0.5) * 46 + Math.sin(ph * 6 + i) * 3, y = 4 + ph * 96;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * (full ? 0.95 : 0.7); dot(ox + x, oy - y, col, i % 4 === 0 ? 2 : 1);
    }
  }
  if (full) {                                                // 穿齊：腳下一圈光
    ctx.globalAlpha = 0.5;
    for (let a = 0; a < 360; a += 4) dot(ox + Math.cos(a * RAD) * 21, oy + 1 + Math.sin(a * RAD) * 5, cols[a % 12 === 0 ? 0 : 1 % cols.length], 2, 1);
  }
  ctx.globalAlpha = 1;
}
