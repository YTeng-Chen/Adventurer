// T3 魔晶套裝（術士・法杖）：紫色晶石、銀色框架。頭上是一圈銀冠、前面豎起一排晶柱（頭冠，頭髮照常露出來）。
// 終結技：一排晶柱從地面竄出。
import { shade, span, pauldrons } from './kit.js';

const c = ['#1e1438', '#3a2a6a', '#6a4ab0', '#9a7af0', '#d8c8ff'];   // 晶石
const a = ['#4a4a60', '#9a9ab4', '#e8e8f8'];                        // 銀
const g = ['#c08aff', '#f0e0ff', '#ffffff'];                        // 晶光
// 一根晶柱：底在 (x, y)，高 h、半寬 w，往 lean 傾斜；左半亮、右半暗，中間一道亮線
function shard(G, x, y, h, w, lean, glow) {
  for (let k = 0; k < h; k++) {
    const half = Math.max(0, Math.round(w * (1 - Math.max(0, k - h + w + 1) / (w + 1)))), cx = x + Math.round(lean * k);
    for (let dx = -half; dx <= half; dx++) G.set(cx + dx, y - k, dx === 0 ? (glow ? g[1] : c[4]) : dx < 0 ? c[3] : c[2]);
  }
}
export default {
  key: 'crystal', tier: 3, helmOpen: true,
  pal: { c, a, g, t: a[2], fx: ['#ffffff', '#e8dcff', '#b89af8', '#7a5ad8', '#2a1a5a'], arc: [['#ffffff', '#b89af8'], ['#ffffff', '#e8dcff']] },
  aura: { kind: 'shards', cols: [g[1], c[4], a[2]] },
  stage: { slash: false, parts: ['spikes'], n: 9 },

  // 魔晶法杖：銀杖身，頂端一叢三根晶柱，史詩以上晶柱發光、外面繞一圈銀環
  weapon: { size: [27, 64], pivot: [13.5, 54.5], draw(px, r) {
    for (let y = 18; y <= 61; y++) for (let x = 12; x <= 14; x++) px.set(x, y, x === 12 ? a[0] : x === 14 ? a[1] : a[2]);
    for (const y of [26, 40]) span(px, 11, 15, y, r >= 1 ? g[0] : a[1]);
    span(px, 8, 18, 19, a[1]); span(px, 9, 17, 18, a[2]);                                     // 托座
    shard(px, 13, 17, 16, 3, 0, r >= 3); shard(px, 8, 17, 10, 2, -0.25, r >= 3); shard(px, 18, 17, 11, 2, 0.25, r >= 3);
    if (r >= 2) { px.set(13, 22, g[2]); px.set(13, 23, g[1]); }
    if (r >= 4) for (let x = 3; x <= 23; x++) if (x < 7 || x > 19) px.set(x, 12 + Math.round(((x - 13) / 10) ** 2 * 2), a[2]);
  } },

  // 魔晶冠：一圈銀冠，前面豎起晶柱（中間最高）
  helm(G, A, r) {
    const { L, R, B } = A, y = B - 3, tall = r >= 4 ? 2 : 0;
    if (A.side) {
      span(G, L + 2, R - 1, y, a[1]); span(G, L + 3, R - 2, y - 1, a[2]);
      shard(G, R - 4, y - 2, 7 + tall, 2, 0.15, r >= 3); shard(G, R - 9, y - 2, 9 + tall, 2, -0.1, r >= 3); shard(G, R - 14, y - 2, 6 + tall, 2, -0.3, r >= 3);
      if (r >= 2) G.set(R - 2, y, g[1]);
    } else {
      const mid = Math.round((L + R) / 2);
      span(G, L + 1, R, y, a[1]); span(G, L + 2, R - 1, y - 1, a[2]);
      shard(G, mid, y - 2, 10 + tall, 2, 0, r >= 3);
      for (const s of [-1, 1]) { shard(G, mid + s * 6, y - 2, 7 + tall, 2, s * 0.15, r >= 3); shard(G, mid + s * 11, y - 2, 4 + tall, 1, s * 0.25, r >= 3); }
      if (r >= 2) { span(G, mid - 1, mid + 1, y, g[1]); }
    }
  },

  // 魔晶法袍：紫袍、銀滾邊，胸前一顆晶石
  body: {
    own: true, robe: true, pants: [c[1], c[0]],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? a[2] : a[1];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[1] : g[0]) : a[1];
      if (L.center(x)) return y >= L.top + 2 && y <= L.top + 4 ? (r >= 3 ? g[1] : c[4]) : a[1];
      return shade(L, x, c);
    },
    skirt(L, x, y, it) { return y === L.robe ? (it.rarity >= 1 ? a[2] : a[1]) : L.center(x) ? a[1] : shade(L, x, c); },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[3] : a[1];
      if (y >= L.glove + 1) return null;
      return y === L.glove ? (it.rarity >= 1 ? a[2] : a[1]) : c[2];
    },
  },
  // 肩上的晶簇
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y, back) => {
      span(G, x - 2, x + 2, y, a[1]);
      shard(G, x, y - 1, 4 + (it.rarity >= 4 ? 1 : 0), 1, back * 0.3, it.rarity >= 3); shard(G, x + back * 2, y - 1, 3, 1, back * 0.5, it.rarity >= 3);
    });
  },
  feet: { start: 2, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[2] : a[1];
    if (y >= L.sole) return c[0];
    return shade(L, x, c);
  } },
};
