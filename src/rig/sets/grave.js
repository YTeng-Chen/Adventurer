// T3 守墓人套裝（弓手・弓）：灰黑的長大衣、黃銅扣、綠色的鬼火。頭上是一頂寬簷帽，弓下吊著一盞鬼火提燈。
// 終結技：鬼火箭雨從天而降，落點衝起一道鬼火柱。
import { shade, span, pauldrons, cape, orb } from './kit.js';

const c = ['#141418', '#24242c', '#3a3a46', '#5a5a68', '#8a8a98'];   // 大衣
const a = ['#6a4a1a', '#b08030', '#e8c060'];                        // 黃銅
const g = ['#1a8a6a', '#8affd0', '#f0fff8'];                        // 鬼火
const wood = ['#1e1612', '#3a2a20', '#5a4232'];
export default {
  key: 'grave', tier: 3,
  pal: { c, a, g, t: a[2], fx: ['#f0fff8', '#8affd0', '#3ad8a0', '#1a8a6a', '#0a2a24'], arc: [['#f0fff8', '#3ad8a0'], ['#ffffff', '#8affd0']] },
  aura: { kind: 'wisps', cols: [g[1], g[2], g[0]] },
  stage: { slash: false, parts: ['rain', 'pillar'] },

  // 提燈弓：黑木弓臂、黃銅包角，握把下面吊著一盞鬼火提燈
  weapon: { size: [26, 62], pivot: [17.5, 28.5], draw(px, r) {
    for (let y = 3; y <= 54; y++) {
      const bend = Math.round(9 * (1 - ((y - 28.5) / 25.5) ** 2));
      for (let k = 0; k < 3; k++) px.set(4 + bend + k, y, y < 7 || y > 50 ? (r >= 1 ? a[2] : a[1]) : k === 0 ? wood[2] : k === 2 ? wood[0] : wood[1]);
    }
    for (let y = 23; y <= 33; y++) for (let x = 15; x <= 20; x++) px.set(x, y, y === 23 || y === 33 ? a[1] : x === 15 ? c[0] : c[2]);
    for (let y = 34; y <= 49; y++) px.set(18, y, y % 2 ? a[0] : a[1]);                                    // 吊鏈
    span(px, 15, 21, 50, a[1]); span(px, 15, 21, 58, a[1]); span(px, 17, 19, 49, a[2]);
    for (let y = 51; y <= 57; y++) for (let x = 15; x <= 21; x++) px.set(x, y, x === 15 || x === 21 ? a[0] : Math.abs(x - 18) <= 1 && y > 52 && y < 56 ? g[2] : g[1]);   // 燈籠裡的鬼火
    if (r >= 2) orb(px, 18, 28, 1.5, [g[0], g[1], g[2]]);
    if (r >= 4) for (const y of [20, 37]) px.set(14, y, g[1]);
  } },

  // 寬簷帽：高高的帽身、寬帽簷、黃銅扣的帽帶；史詩以上帽帶插著一朵鬼火、傳說多一根烏鴉羽毛
  helm(G, A, r) {
    const { L, R, B } = A;
    if (A.side) {
      span(G, L - 3, R + 4, B, c[1]); span(G, L - 2, R + 3, B - 1, c[2]); G.set(R + 4, B + 1, c[1]); G.set(L - 3, B - 1, c[1]);   // 帽簷
      for (let y = B - 11; y <= B - 2; y++) span(G, L + 4 + Math.round((B - 2 - y) * 0.15), R - 4 - Math.round((B - 2 - y) * 0.1), y, (x) => (x >= R - 7 ? c[3] : x <= L + 6 ? c[1] : c[2]));
      span(G, L + 4, R - 4, B - 3, c[0]); span(G, L + 4, R - 4, B - 2, c[0]);                              // 帽帶
      span(G, R - 8, R - 6, B - 3, a[1]); G.set(R - 7, B - 2, a[2]);
      if (r >= 3) { G.set(L + 6, B - 4, g[1]); G.set(L + 6, B - 5, g[2]); G.set(L + 7, B - 4, g[1]); }
      if (r >= 4) for (let k = 0; k < 8; k++) G.set(L + 5 - Math.round(k * 0.4), B - 4 - k, k % 3 ? '#1a1a24' : '#3a3a50');
    } else {
      const mid = (L + R) / 2;
      span(G, L - 4, R + 4, B, c[1]); span(G, L - 3, R + 3, B - 1, c[2]);
      for (let y = B - 11; y <= B - 2; y++) span(G, L + 5, R - 5, y, (x) => (x < mid - 5 ? c[3] : x > mid + 5 ? c[1] : c[2]));
      span(G, L + 5, R - 5, B - 3, c[0]); span(G, L + 5, R - 5, B - 2, c[0]);
      span(G, mid - 1, mid + 1, B - 3, a[1]); G.set(mid, B - 2, a[2]);
      if (r >= 3) { G.set(mid + 7, B - 4, g[1]); G.set(mid + 7, B - 5, g[2]); }
    }
  },

  // 長大衣：高領、一排黃銅釦、提燈扣環，下襬到膝蓋，前面開衩
  body: {
    own: true, robe: true, pants: [c[1], c[0]],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y <= L.top + 1) return y === L.top && r >= 1 ? a[2] : c[3];                                      // 高領
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[1] : a[2]) : wood[1];
      if (L.center(x)) return y % 2 === 0 && y < L.belt ? (r >= 1 ? a[2] : a[1]) : c[0];                  // 釦子
      return shade(L, x, c);
    },
    skirt(L, x, y, it) { return L.center(x) ? c[0] : y === L.robe ? (it.rarity >= 3 ? g[0] : c[1]) : shade(L, x, c); },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[3] : c[2];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? a[1] : c[3]) : wood[1];
      return c[2];
    },
  },
  // 短披肩
  bodyExtras(P, view, it, ink) {
    const out = pauldrons(P, view, it, ink, (G, x, y) => { span(G, x - 3, x + 3, y - 1, c[3]); span(G, x - 3, x + 3, y, c[2]); if (it.rarity >= 1) G.set(x, y - 1, a[1]); });
    out.cape = cape(P, view, it, ink, { len: 12, spread: 0.25, ragged: 1, clasp: it.rarity >= 1 ? a[2] : a[1],
      col: (x, k, x0, x1, cut) => (k === cut ? c[1] : (x - x0) % 3 === 0 ? c[1] : c[2]) });
    return out;
  },
  feet: { start: -1, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[1] : wood[2];
    if (y === start + 2 && L.center(x)) return a[2];
    if (y >= L.sole) return c[0];
    return shade(L, x, [wood[0], wood[0], wood[1], wood[2], wood[2]]);
  } },
};
