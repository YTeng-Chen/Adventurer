// T3 史萊姆王套裝（守衛・鎚）：半透明的綠凝膠、金色王冠、粉紅的王核。頭上頂著一團會往下滴的凝膠，上面戴著小王冠。
// 終結技：凝膠噴泉衝上天、四處噴濺。
import { tone, shade, ellipse, span, shell, pauldrons, hash } from './kit.js';

const c = ['#0e3a1c', '#1e6a30', '#2fa048', '#5ad06a', '#a8f4a0'];   // 凝膠
const a = ['#8a5a1a', '#e0a830', '#ffe48a'];                        // 王冠金
const g = ['#b83a7a', '#ff7ab8', '#ffd0e8'];                        // 王核
const shine = '#eaffe4';
// 凝膠的明暗：左上有一塊亮光
const gel = (x, y, cx, cy, rx, ry) => {
  const u = (x - cx) / rx, v = (y - cy) / ry;
  if (Math.hypot(u + 0.45, v + 0.5) < 0.18) return shine;
  return tone(c, -u * 0.4 - v * 0.9);
};
export default {
  key: 'slime', tier: 3,
  pal: { c, a, g, t: a[2], fx: ['#f0ffe8', '#a8f4a0', '#5ad06a', '#2fa048', '#0e3a1c'], arc: [['#f0ffe8', '#5ad06a'], ['#fff6d0', '#e0a830']] },
  aura: { kind: 'bubbles', cols: [c[4], shine, a[2]] },
  stage: { slash: true, parts: ['drops', 'pillar'] },

  // 凝膠巨鎚：鎚頭是一大團圓圓的凝膠，裡面包著王核；金色的鎚柄和箍
  weapon: { size: [33, 64], pivot: [16.5, 58.5], draw(px, r) {
    ellipse(px, 16, 15, 15, 12, (x, y, e) => (e > 0.82 ? c[1] : gel(x, y, 16, 15, 15, 12)));
    for (const [x, len] of [[6, 3], [12, 2], [24, 4]]) for (let k = 0; k < len; k++) px.set(x, 25 + k, k === len - 1 ? c[3] : c[2]);   // 往下滴
    ellipse(px, 17, 16, r >= 2 ? 4 : 3, r >= 2 ? 4 : 3, (x, y, e) => (e < 0.3 ? g[2] : e < 0.7 ? g[1] : g[0]));                    // 王核
    if (r >= 4) for (const [x, y] of [[9, 9], [25, 12], [12, 21]]) px.set(x, y, shine);
    for (let x = 12; x <= 20; x++) { px.set(x, 28, r >= 1 ? a[2] : a[1]); px.set(x, 29, a[1]); }
    for (let y = 30; y <= 61; y++) for (let x = 15; x <= 17; x++) px.set(x, y, x === 15 ? a[0] : y % 7 === 0 && r >= 1 ? a[2] : a[1]);
    px.set(16, 62, a[2]);
  } },

  // 凝膠王冠：一團凝膠蓋在頭上、從邊緣往下滴，頂上一頂金色小王冠
  helm(G, A, r) {
    const { L, R, B } = A;
    const s = shell(G, A, c, { grow: 1, dy: 2, tall: 1, clip: B - 1 });
    ellipse(G, s.cx, s.cy, s.rx, s.ry, (x, y) => (y > B - 1 ? null : gel(x, y, s.cx, s.cy, s.rx, s.ry)));
    const drips = A.side ? [[L + 1, 4], [L + 4, 6], [L + 8, 3], [R - 3, 2]] : [[L + 1, 5], [L + 4, 3], [R - 3, 3], [R, 6]];
    for (const [x, len] of drips) for (let k = 0; k <= len; k++) { G.set(x, B - 1 + k, k === len ? c[3] : c[2]); if (k < len - 1) G.set(x + 1, B - 1 + k, c[2]); }
    span(G, s.cx - s.rx + 1, s.cx + s.rx - 1, B - 1, c[1]);
    const cx = A.side ? s.cx + 1 : s.cx, top = Math.round(s.cy - s.ry) + 1, w = A.side ? 5 : 6;    // 王冠
    for (let y = top - 2; y <= top; y++) span(G, cx - w, cx + w, y, y === top ? a[1] : a[2]);
    for (const dx of [-w, 0, w]) for (let k = 1; k <= (dx === 0 ? 4 : 3); k++) G.set(cx + dx, top - 2 - k, k === (dx === 0 ? 4 : 3) && r >= 2 ? g[1] : a[2]);
    for (const dx of [-w + 2, w - 2]) G.set(cx + dx, top - 3, a[1]);
    if (r >= 1) { G.set(cx, top - 1, g[1]); G.set(cx - 3, top - 1, g[2]); G.set(cx + 3, top - 1, g[2]); }
  },

  // 凝膠鎧：一層透亮的凝膠，左上有亮光、零星的泡泡，金領、王核扣環
  body: {
    own: true, pants: ['#1e4a2a', '#143a1e'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? a[2] : c[4];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[2] : g[1]) : a[1];
      if (y >= L.shorts) return L.dark(x) ? c[1] : c[2];
      if (L.light(x) && y <= L.top + 3) return shine;
      if ((y === L.top + 5 && L.center(x)) || (r >= 3 && hash(x, y) > 0.9)) return c[4];                  // 泡泡
      return shade(L, x, c);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[4] : c[3];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? a[2] : a[1]) : c[2];
      return c[3];
    },
  },
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y) => {
      ellipse(G, x, y - 1, 3.6, 2.8, (px, py) => gel(px, py, x, y - 1, 3.6, 2.8));
      G.set(x - 2, y + 2, c[2]); G.set(x + 1, y + 2, c[2]); G.set(x + 1, y + 3, c[3]);            // 往下滴
    });
  },
  feet: { start: -1, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[2] : c[4];
    if (y >= L.sole) return c[1];
    return y === start + 1 && L.light(x) ? shine : shade(L, x, c);
  } },
};
