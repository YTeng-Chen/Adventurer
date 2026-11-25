// T4 怨靈套裝（術士・法杖）：怨靈之母的藍白幽光、破舊的布。頭上是一頂尖尖的破兜帽，帽尖往後垂；法杖頂端的籠子裡關著一團魂火。
// 終結技：一群幽魂撲向目標，落點衝起幽光柱。
import { tone, shade, stroke, span, shell, pauldrons, cape, hash, orb } from './kit.js';

const c = ['#141a30', '#2a3458', '#4a5a90', '#7a90d0', '#c0d0ff'];   // 幽光
const a = ['#4a4e66', '#8a90a8', '#d4d8e8'];                        // 舊布
const g = ['#4ac8e8', '#a0f0ff', '#f0ffff'];                        // 魂火
const wood = ['#1a1418', '#2e2428', '#4a3a3e'];
export default {
  key: 'grudge', tier: 4,
  pal: { c, a, g, t: g[1], fx: ['#f0ffff', '#a0f0ff', '#6ab8e8', '#3a5aa0', '#141a30'], arc: [['#f0ffff', '#6ab8e8'], ['#ffffff', '#a0f0ff']] },
  aura: { kind: 'wisps', cols: [g[1], g[2], c[4]] },
  stage: { slash: false, parts: ['wisps', 'pillar'] },

  // 魂籠法杖：彎曲的黑木杖身，頂端一個鐵籠，籠裡一團魂火
  weapon: { size: [25, 64], pivot: [12.5, 54.5], draw(px, r) {
    for (let y = 17; y <= 62; y++) { const x0 = 11 + Math.round(Math.sin(y * 0.22) * 1.3); for (let x = x0; x < x0 + 3; x++) px.set(x, y, x === x0 ? wood[0] : x === x0 + 2 ? wood[2] : wood[1]); }
    orb(px, 12, 9, r >= 2 ? 5 : 4, [g[0], g[1], g[2]]);                                             // 魂火
    for (let y = 2; y <= 16; y++) for (const x of [5, 12, 19]) if (x !== 12 || y < 4 || y > 14) px.set(x + (x === 12 ? 0 : Math.round(Math.sin((y - 2) / 14 * Math.PI) * (x < 12 ? -1.5 : 1.5))), y, a[1]);   // 籠子的鐵條
    span(px, 7, 17, 2, a[2]); span(px, 6, 18, 16, a[1]); px.set(12, 1, a[2]); px.set(12, 0, a[1]);
    if (r >= 4) for (let k = 0; k < 6; k++) px.set(18 + (k % 2), 18 + k * 2, g[1]);                // 傳說：杖身垂下一條魂火的鏈
  } },

  // 怨靈兜帽：尖尖的破兜帽，帽尖往後垂，帽緣破成一條條，臉在兜帽的陰影裡
  helm(G, A, r) {
    const { L, R, B } = A;
    if (A.side) {
      for (let y = B - 1; y <= B + 9; y++) span(G, L - Math.round((y - B) * 0.22), L + 7, y, (x) => (y > B + 6 && hash(x, 7) > 0.55 ? null : x >= L + 6 ? c[2] : c[1]));   // 後面垂下來的布，下緣破碎
      const s = shell(G, A, c, { grow: 1, dy: 1, tall: 1, clip: B });
      stroke(G, [[s.cx - 4, s.cy - s.ry + 2], [s.cx - 10, s.cy - s.ry + 1], [s.cx - 13, s.cy - s.ry + 5], [s.cx - 14, s.cy - s.ry + 10]], 2.2, 0.6, (i) => (i > 0.85 && r >= 3 ? g[1] : i > 0.5 ? c[2] : c[3]));   // 帽尖往後垂
      span(G, s.cx - 6, R + 1, B, c[0]); span(G, R - 6, R + 1, B + 1, c[1]);                                   // 帽簷的陰影
      for (let k = 0; k < 4; k++) G.set(R + 1 - (k % 2), B + 2 + k, c[2]);                                       // 臉側的破布
      if (r >= 3) for (const [x, y] of [[R + 3, B - 6], [R + 5, B - 3]]) { G.set(x, y, g[1]); G.set(x, y - 1, g[2]); }   // 飄在旁邊的魂火
    } else {
      const mid = (L + R) / 2;
      for (const sd of [-1, 1]) for (let y = B - 1; y <= B + 10; y++) span(G, mid + sd * 12, mid + sd * 15, y, (x) => (y > B + 7 && hash(x, 7) > 0.5 ? null : Math.abs(x - mid) > 14 ? c[1] : c[2]));
      const sh = shell(G, A, c, { grow: 1, dy: 1, tall: 1, clip: B });
      stroke(G, [[mid, sh.cy - sh.ry + 1], [mid + 3, sh.cy - sh.ry - 4], [mid + 7, sh.cy - sh.ry - 5]], 2, 0.6, (i) => (i > 0.8 && r >= 3 ? g[1] : c[3]));
      span(G, mid - 11, mid + 11, B, c[0]);
      if (r >= 3) for (const sd of [-1, 1]) { G.set(mid + sd * 18, B - 4, g[1]); G.set(mid + sd * 18, B - 5, g[2]); }
    }
    if (r >= 1) { const x = A.side ? R - 3 : (L + R) / 2; G.set(x, B - 1, g[1]); G.set(x + (A.side ? -1 : 1), B - 1, g[2]); }
  },

  // 怨靈長袍：藍灰的舊袍、幽藍的腰帶，下襬破成一條條
  body: {
    own: true, robe: true, pants: [c[1], c[0]],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? g[1] : a[2];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? g[r >= 2 ? 2 : 1] : c[2];
      if (L.center(x) && y > L.top) return r >= 3 ? g[0] : c[1];
      return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
    },
    skirt(L, x, y, it) {
      if (y >= L.robe - 1) return hash(x, 3) > 0.5 ? (it.rarity >= 3 ? g[0] : c[2]) : c[1];                  // 破碎的下襬
      return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? a[2] : a[1];
      if (y >= L.glove + 1) return null;
      return y === L.glove ? (it.rarity >= 1 ? g[1] : c[2]) : a[1];
    },
  },
  bodyExtras(P, view, it, ink) {
    const out = pauldrons(P, view, it, ink, (G, x, y) => { span(G, x - 3, x + 3, y - 1, a[2]); span(G, x - 3, x + 3, y, a[1]); for (const dx of [-3, 0, 3]) G.set(x + dx, y + 1, a[1]); });
    out.cape = cape(P, view, it, ink, { len: 22, spread: 0.42, ragged: 5, clasp: it.rarity >= 1 ? g[1] : a[2],
      col: (x, k, x0, x1, cut) => (k >= cut - 1 ? (it.rarity >= 3 ? g[1] : c[3]) : (x - x0) % 4 === 0 ? c[1] : c[2]) });
    return out;
  },
  feet: { start: 2, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? g[1] : a[2];
    if (y >= L.sole) return c[0];
    return (y + x) % 3 === 0 ? a[0] : a[1];                                                                  // 一圈圈的布條
  } },
};
