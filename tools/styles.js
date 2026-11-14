// 人物樣式試做（開發用，不打包進遊戲）：5 種頭身比例、臉、線條與上色方式。
// 都穿同一套簡單衣服，方便比較；選定後再把裝備照該樣式重畫。
import { Layer, render, ramp } from '../src/art/pixel.js';
import { BODY } from '../src/art/palette.js';
import { baseLayer } from '../src/art/hero.js';

const W = 48, H = 56;
const m = (hex, o = {}) => ({ ramp: ramp(hex), ...o });

// 置中軸 23.5 的鏡射工具
function mirrorAt(L, axis) { return L.mirror(axis); }
const MX = (axis, x) => Math.round(2 * axis - x);
function sym(L, axis, pts, mat, tone = null) { for (const [x, y] of pts) { L.set(x, y, mat, tone); L.set(MX(axis, x), y, mat, tone); } }

// ---------- 1. 目前的樣式：Q 版粗壯 3 頭身 ----------
function current() {
  return render(baseLayer(false), BODY);
}

// ---------- 2. 迷你 Q 版：2 頭身、大頭大眼 ----------
function chibi() {
  const L = new Layer(W, H), A = 23.5;
  // 靴子、腿
  for (let y = 48; y <= 51; y++) L.hline(17, 22, y, 'shoe');
  L.hline(16, 22, 52, 'shoe', 1);
  for (let y = 44; y <= 47; y++) L.hline(18, 22, y, 'pants');
  // 身體、手
  L.rows([[33, 18, 23], [34, 17, 23]], 'tunic');
  for (let y = 35; y <= 40; y++) L.hline(17, 23, y, 'tunic');
  L.hline(17, 23, 41, 'belt').hline(17, 23, 42, 'belt').hline(18, 23, 43, 'pants');
  for (let y = 34; y <= 37; y++) L.hline(14, 16, y, 'tunic');
  L.rows([[38, 14, 16], [39, 13, 16], [40, 13, 16], [41, 14, 16]], 'skin');
  mirrorAt(L, A);
  L.rect(23, 41, 2, 2, 'buckle');
  // 大頭：頭髮球 + 臉
  L.ellipse(23.5, 20, 12.5, 11, 'hair');
  L.ellipse(23.5, 25.5, 9.8, 7.2, 'skin');
  sym(L, A, [[12, 22], [12, 23], [12, 24], [12, 25], [13, 26], [13, 27], [13, 28]], 'hair');
  // 瀏海
  for (const [x0, x1, y1] of [[14, 16, 21], [17, 20, 20], [21, 23, 21], [24, 26, 20], [27, 30, 21], [31, 33, 20]])
    for (let x = x0; x <= x1; x++) for (let y = 17; y <= y1; y++) L.set(x, y, 'hair');
  L.dots([[17, 12], [16, 13], [18, 13], [15, 14], [21, 11], [22, 12]], 'hair', 4);
  for (let x = 14; x <= 33; x++) if (L.get(x, 22) === 'skin' && L.get(x, 21) === 'hair') L.mark(x, 22, 1);
  // 大眼睛：睫毛、兩個高光、漸層虹膜
  for (const ex of [16, 29]) {
    L.hline(ex - 1, ex + 3, 23, 'eye');
    L.set(ex, 24, 'white').set(ex + 1, 24, 'iris').set(ex + 2, 24, 'iris');
    L.set(ex, 25, 'iris').set(ex + 1, 25, 'iris').set(ex + 2, 25, 'iris');
    L.set(ex, 26, 'eye').set(ex + 1, 26, 'iris').set(ex + 2, 26, 'white');
  }
  L.dots([[15, 28], [16, 28], [31, 28], [32, 28]], 'blush');
  L.dots([[23, 29], [24, 29]], 'lip');
  return render(L, BODY);
}

// ---------- 3. 英雄比例：5 頭身、修長 ----------
function heroic() {
  const L = new Layer(W, H), A = 23.5;
  for (let y = 46; y <= 50; y++) L.hline(18, 22, y, 'shoe');
  L.hline(17, 22, 51, 'shoe').hline(17, 22, 52, 'shoe', 1);
  for (let y = 34; y <= 45; y++) L.hline(19, 22, y, 'pants');
  L.hline(19, 23, 34, 'pants').hline(19, 23, 35, 'pants');
  // 倒三角上身
  L.rows([[19, 17, 23], [20, 16, 23]], 'tunic');
  for (let y = 21; y <= 27; y++) L.hline(17, 23, y, 'tunic');
  for (let y = 28; y <= 31; y++) L.hline(18, 23, y, 'tunic');
  L.hline(18, 23, 32, 'belt').hline(18, 23, 33, 'belt');
  // 手臂
  for (let y = 20; y <= 25; y++) L.hline(14, 15, y, 'tunic');
  for (let y = 26; y <= 34; y++) L.hline(14, 15, y, 'skin');
  L.rows([[35, 13, 15], [36, 13, 15], [37, 14, 15]], 'skin');
  mirrorAt(L, A);
  L.rect(23, 32, 2, 2, 'buckle');
  L.vline(24, 21, 31, 'tunic', 1);
  // 脖子、頭（小而立體）
  L.rows([[17, 22, 25], [18, 22, 25]], 'skin', 1);
  L.rows([[8, 19, 28], [9, 19, 28], [10, 19, 28], [11, 19, 28], [12, 19, 28], [13, 19, 28], [14, 20, 27], [15, 21, 26], [16, 22, 25]], 'skin');
  L.rows([[4, 20, 27], [5, 19, 28], [6, 18, 29], [7, 18, 29], [8, 18, 29]], 'hair');
  L.dots([[18, 9], [18, 10], [18, 11], [29, 9], [29, 10], [19, 9], [22, 9], [23, 9], [27, 9], [28, 9]], 'hair');
  L.dots([[21, 4], [20, 5], [22, 5]], 'hair', 4);
  L.dots([[20, 10], [21, 10], [22, 10], [25, 10], [26, 10], [27, 10]], 'brow');
  L.dots([[21, 11], [26, 11]], 'eye').dots([[22, 11], [25, 11]], 'iris');
  L.mark(24, 13, 1);
  L.dots([[23, 15], [24, 15]], 'lip');
  return render(L, BODY);
}

// ---------- 4. 黑框卡通：純黑粗輪廓、三階平塗、高對比 ----------
const TOON = {
  ...BODY,
  skin: m('#ffcca0'), hair: m('#a24a1e'), tunic: m('#2f8cf0'), pants: m('#3a3f8a'),
  shoe: m('#9a4f22'), belt: m('#5a2f14'), buckle: m('#ffd23a'), iris: m('#1f7ae8', { flat: true }),
};
function toon() {
  return render(baseLayer(false), TOON, { shade: 'cel', outlineColor: '#120c16' });
}

// ---------- 5. 復古 16 位元：低解析度、豆豆眼、兩階上色 ----------
const RETRO = {
  ...BODY,
  skin: m('#e8b088'), hair: m('#7a3c20'), tunic: m('#3c6cb0'), pants: m('#3a3550'),
  shoe: m('#6a3a20'), belt: m('#4a2a18'), buckle: m('#d8a840'), eye: m('#1a1018', { flat: true }),
};
function retro() {
  const L = new Layer(24, 28), A = 11.5;
  L.rows([[23, 8, 10], [24, 8, 10], [25, 7, 10]], 'shoe');
  for (let y = 18; y <= 22; y++) L.hline(9, 10, y, 'pants');
  L.hline(9, 11, 18, 'pants');
  L.rows([[11, 9, 11]], 'tunic');
  for (let y = 12; y <= 16; y++) L.hline(8, 11, y, 'tunic');
  L.hline(8, 11, 17, 'belt');
  for (let y = 12; y <= 14; y++) L.hline(6, 7, y, 'tunic');
  L.rows([[15, 6, 7], [16, 6, 7], [17, 6, 7]], 'skin');
  mirrorAt(L, A);
  L.rows([[4, 8, 15], [5, 8, 15], [6, 8, 15], [7, 8, 15], [8, 8, 15], [9, 9, 14], [10, 10, 13]], 'skin');
  L.rows([[1, 9, 14], [2, 8, 15], [3, 7, 16], [4, 7, 16]], 'hair');
  L.dots([[7, 5], [7, 6], [16, 5], [16, 6], [9, 5], [11, 5], [12, 5], [14, 5]], 'hair');
  L.dots([[10, 7], [13, 7]], 'eye');
  L.dots([[11, 9], [12, 9]], 'lip');
  const small = render(L, RETRO, { shade: 'retro', outlineColor: '#24140e' });
  // 每格放大成 2×2，維持粗顆粒感；腳底對齊其他樣式
  const out = Array.from({ length: H }, () => new Array(W).fill(null));
  small.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const yy = y * 2 + dy + 1, xx = x * 2 + dx;
      if (yy < H && xx < W) out[yy][xx] = c;
    }
  }));
  return out;
}

export const STYLES = [
  { id: 1, name: '粗壯 Q 版（目前）', note: '3 頭身、大拳大靴、圓柱狀明暗、彩色輪廓', make: current },
  { id: 2, name: '迷你 Q 版', note: '2 頭身、大頭大眼、可愛討喜', make: chibi },
  { id: 3, name: '英雄比例', note: '5 頭身、倒三角身材、比較帥氣寫實', make: heroic },
  { id: 4, name: '黑框卡通', note: '純黑粗輪廓、三階平塗、高對比', make: toon },
  { id: 5, name: '復古 16 位元', note: '低解析度、豆豆眼、兩階上色', make: retro },
];
