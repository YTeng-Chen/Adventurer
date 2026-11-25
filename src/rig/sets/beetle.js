// T1 甲蟲女王套裝（守衛・鎚）：翠綠甲殼、金色女王紋。頭盔是一頂甲蟲殼，額頭長出往上翹的獨角、兩根觸角往後掃。
import { tone, shade, ellipse, stroke, span, shell, pauldrons } from './kit.js';

const c = ['#0f2416', '#1d4a28', '#2f7a38', '#4fae48', '#9be070'];   // 甲殼
const a = ['#7a4e14', '#d49a2a', '#ffe27a'];                        // 女王金
const g = ['#b86a10', '#ffb02a', '#fff0a0'];                        // 琥珀
export default {
  key: 'beetle', tier: 1,
  pal: { c, a, g, t: a[2], fx: ['#fffbe0', '#ffe27a', '#9be070', '#4fae48', '#1d4a28'], arc: [['#f4ffd8', '#7fd05a'], ['#fffbe0', '#ffc531']] },
  aura: { kind: 'motes', cols: [a[2], g[1], c[4]] },

  // 甲殼戰鎚：鎚頭是一片橢圓的甲蟲殼（中間一道殼縫），頂上一根短角，接縫處一圈金箍
  weapon: { size: [31, 62], pivot: [15.5, 56.5], draw(px, r) {
    ellipse(px, 15, 16, 14, 9, (x, y, e) => (e > 0.8 ? c[1] : tone(c, -(x - 15) / 14 * 0.5 - (y - 16) / 9 * 0.9)));
    for (let y = 8; y <= 24; y++) px.set(15, y, r >= 3 ? g[1] : c[0]);                         // 殼縫（史詩以上發光）
    stroke(px, [[15, 8], [15, 3], [18, 0]], 2, 0.6, (i) => (i > 0.6 ? (r >= 4 ? a[2] : c[4]) : c[3]));   // 頂上的角
    if (r >= 2) for (const x of [8, 22]) { px.set(x, 14, g[2]); px.set(x, 15, g[1]); px.set(x + 1, 15, g[1]); }  // 兩顆琥珀
    for (let x = 11; x <= 19; x++) { px.set(x, 25, r >= 1 ? a[2] : a[1]); px.set(x, 26, a[1]); }     // 金箍
    for (let y = 27; y <= 59; y++) for (let x = 14; x <= 16; x++) px.set(x, y, (y % 6 === 0 && r >= 1) ? a[1] : x === 14 ? c[0] : c[1]);
    px.set(15, 60, a[1]);
  } },

  // 甲蟲角盔：貼著頭的甲殼、金色的盔緣，額頭的獨角往上再往後彎，兩根觸角
  helm(G, A, r) {
    const { L, R, B } = A, rim = r >= 1 ? a[2] : a[1], big = r >= 4 ? 1.2 : 1;
    if (A.side) {
      stroke(G, [[L + 11, B - 10], [L + 5, B - 16], [L - 1, B - 18]], 0.7, 0.5, (i) => (i > 0.85 ? a[2] : c[1]));            // 後面的觸角
      const s = shell(G, A, c, { grow: 0.5, dy: 2, tall: 1, clip: B - 1 });
      for (let k = 0; k <= 9; k++) G.set(s.cx - 2 - k, Math.round(s.cy - s.ry + 3 + k * 0.9), c[1]);   // 殼的接縫：從頭頂斜斜往後下
      span(G, L + 1, R + 1, B - 1, rim); span(G, L + 3, R + 2, B, a[1]);                                                    // 盔緣
      for (let y = B + 1; y <= B + 5; y++) span(G, L + 1, L + 4, y, y === B + 5 ? a[1] : c[2]);                             // 護頸
      stroke(G, [[R - 4, B - 3], [R - 2, B - 10 * big], [R - 4, B - 16 * big], [R - 8, B - 20 * big]], 2.4, 0.6, (i, dy) => (i > 0.8 ? (r >= 4 ? a[2] : c[4]) : dy < 0 ? c[4] : c[3]));   // 獨角
      stroke(G, [[L + 13, B - 11], [L + 7, B - 17], [L + 1, B - 20]], 0.7, 0.5, (i) => (i > 0.85 ? a[2] : c[1]));            // 前面的觸角
      if (r >= 2) { G.set(R - 3, B - 3, g[1]); G.set(R - 4, B - 3, g[2]); }
    } else {
      const mid = (L + R) / 2;
      for (const s of [-1, 1]) stroke(G, [[mid + s * 5, B - 10], [mid + s * 11, B - 16], [mid + s * 16, B - 18]], 0.7, 0.5, (i) => (i > 0.85 ? a[2] : c[1]));
      shell(G, A, c, { grow: 0.5, dy: 2, tall: 1, clip: B - 1 });
      for (let y = B - 11; y <= B - 2; y++) G.set(mid, y, c[1]);                                                            // 中間的殼縫
      span(G, L, R + 1, B - 1, rim); span(G, L - 1, R + 2, B, a[1]);
      for (const s of [-1, 1]) for (let y = B + 1; y <= B + 5; y++) span(G, mid + s * 13, mid + s * 15, y, y === B + 5 ? a[1] : c[2]);   // 護頰
      stroke(G, [[mid, B - 2], [mid, B - 11 * big], [mid + 1, B - 18 * big], [mid + 3, B - 21 * big]], 2.4, 0.6, (i, dy, w, s) => (i > 0.8 ? (r >= 4 ? a[2] : c[4]) : s % 2 ? c[3] : c[4]));
      if (r >= 2) { G.set(mid - 1, B - 1, g[2]); G.set(mid + 1, B - 1, g[2]); G.set(mid, B - 1, g[1]); }
    }
  },

  // 甲殼鎧：胸口兩片大甲殼（中間一道殼縫），金色女王紋、琥珀扣
  body: {
    own: true, pants: ['#2c3a22', '#1e2818'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? a[2] : c[3];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[2] : g[1]) : a[1];
      if (y >= L.shorts) return y === L.shorts + 3 && r >= 3 ? a[2] : L.dark(x) ? c[1] : c[2];
      if (L.center(x) && y > L.top) return y === L.top + 3 && r >= 2 ? g[1] : c[0];
      if (y === L.top + 6) return c[0];
      return y <= L.top + 2 && L.light(x) ? c[4] : shade(L, x, c);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[4] : it.rarity >= 1 ? a[2] : c[3];
      if (y >= L.glove) return y === L.glove ? a[1] : c[1];
      return c[2];
    },
  },
  // 護肩：兩片小甲殼
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y) => {
      ellipse(G, x, y - 1, 3.5, 2.6, (px, py, e) => (e > 0.7 ? (it.rarity >= 1 ? a[2] : c[1]) : py < y - 1 ? c[4] : c[3]));
    });
  },
  // 甲殼脛甲
  feet: { start: -2, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[2] : c[3];
    if (y === start + 1) return c[4];
    if (y >= L.sole) return c[0];
    return shade(L, x, c);
  } },
};
