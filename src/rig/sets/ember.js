// T4 焰靈套裝（劍士・劍）：火焰精靈王的不滅火種，金橘色的火、白金的甲。頭上是一圈往上竄的火焰冠（頭冠，頭髮照常露出來），劍是波浪形的火焰劍。
// 終結技：兩道交叉的火焰斬，落點衝起金色火柱。
import { tone, shade, span, pauldrons } from './kit.js';

const c = ['#3a1a08', '#7a3a10', '#c06a1a', '#f0a030', '#ffe08a'];   // 火
const a = ['#a88040', '#f4d890', '#fffaf0'];                        // 白金
const g = ['#ff8a2a', '#ffd166', '#fff6d6'];
// 一簇火舌：底在 (x, y)，高 h，往 lean 飄；中間亮、外面暗
function flame(G, x, y, h, w, lean) {
  for (let k = 0; k < h; k++) {
    const t = k / h, half = Math.max(0, Math.round(w * Math.sin((1 - t) * Math.PI * 0.6 + 0.3) * (1 - t * 0.6))), cx = x + Math.round(lean * t * t * h);
    for (let dx = -half; dx <= half; dx++) G.set(cx + dx, y - k, Math.abs(dx) < half * 0.4 ? (t < 0.6 ? c[4] : c[3]) : Math.abs(dx) < half ? c[3] : c[2]);
  }
}
export default {
  key: 'ember', tier: 4, helmOpen: true,
  pal: { c, a, g, t: a[2], fx: ['#fffaf0', '#ffe08a', '#f0a030', '#c06a1a', '#5a2008'], arc: [['#fffaf0', '#f0a030'], ['#ffffff', '#ffd166']] },
  aura: { kind: 'motes', cols: [g[2], g[1], c[3]] },
  stage: { slash: true, parts: ['slashx', 'pillar'] },

  // 焰靈劍：波浪形的劍身，中間白熱、兩邊金橘，護手是一對火焰翼
  weapon: { size: [23, 60], pivot: [11.5, 53.5], draw(px, r) {
    for (let y = 2; y <= 44; y++) {
      const wave = Math.round(Math.sin(y * 0.55) * 1.2), half = y < 8 ? Math.round((y - 2) / 2) : 3, cx = 11 + wave;
      for (let x = cx - half; x <= cx + half; x++) px.set(x, y, Math.abs(x - cx) < 1 ? (r >= 3 ? '#ffffff' : c[4]) : Math.abs(x - cx) < half ? c[3] : c[2]);
    }
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { px.set(11 + s * (2 + k), 46 - Math.round(k * k * 0.12), k > 4 ? c[4] : c[3]); px.set(11 + s * (2 + k), 47 - Math.round(k * k * 0.12), c[2]); }
    span(px, 8, 14, 46, r >= 1 ? a[2] : a[1]); span(px, 9, 13, 47, a[1]);
    for (let y = 48; y <= 56; y++) for (let x = 10; x <= 12; x++) px.set(x, y, (x + y) % 3 === 0 && r >= 1 ? a[2] : x === 10 ? c[1] : a[0]);
    span(px, 10, 12, 57, r >= 2 ? g[2] : g[1]); px.set(11, 58, g[1]);
  } },

  // 火焰冠：白金的額環，往上竄出五簇火舌（中間最高），額前一顆火種
  helm(G, A, r) {
    const { L, R, B } = A, y = B - 3, tall = r >= 4 ? 3 : 0;
    if (A.side) {
      span(G, L + 2, R - 1, y, a[1]); span(G, L + 3, R - 2, y - 1, a[2]);
      flame(G, R - 4, y - 2, 7 + tall, 2, -0.25); flame(G, R - 9, y - 2, 10 + tall, 2.5, -0.3); flame(G, R - 14, y - 2, 7 + tall, 2, -0.35); flame(G, L + 6, y - 2, 5, 1.5, -0.4);
      G.set(R - 2, y, r >= 2 ? g[2] : g[1]);
    } else {
      const mid = Math.round((L + R) / 2);
      span(G, L + 1, R, y, a[1]); span(G, L + 2, R - 1, y - 1, a[2]);
      flame(G, mid, y - 2, 11 + tall, 3, 0);
      for (const s of [-1, 1]) { flame(G, mid + s * 6, y - 2, 8 + tall, 2, s * 0.2); flame(G, mid + s * 11, y - 2, 5 + tall, 1.5, s * 0.3); }
      span(G, mid - 1, mid + 1, y, r >= 2 ? g[2] : g[1]);
    }
  },

  // 焰靈甲：白金胸甲，胸口一道往上燒的火紋，裙甲下緣是火焰
  body: {
    own: true, pants: ['#5a2a10', '#3a1a08'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? g[1] : a[2];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? g[r >= 2 ? 2 : 1] : c[2];
      if (y >= L.shorts) return y >= L.shorts + 2 ? (L.center(x) ? c[4] : c[3]) : c[2];
      if (Math.abs(x - L.cx) <= (y - L.top) * 0.3 && y > L.top + 2) return y > L.belt - 3 ? c[3] : r >= 3 ? c[4] : c[2];   // 往上燒的火紋
      return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? a[2] : a[1];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? g[1] : c[2]) : a[0];
      return c[2];
    },
  },
  // 肩上兩簇往後飄的火
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y, back) => {
      span(G, x - 2, x + 2, y, a[1]); span(G, x - 2, x + 2, y - 1, a[2]);
      flame(G, x, y - 2, 5 + (it.rarity >= 4 ? 2 : 0), 1.6, back * 0.4);
    });
  },
  feet: { start: -2, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? g[1] : a[2];
    if (y >= L.sole) return it.rarity >= 3 && y === L.sole ? g[1] : c[1];
    return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
  } },
};
