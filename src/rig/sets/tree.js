// T4 古樹套裝（弓手・弓）：古樹守衛的樹皮、青苔與新葉。頭上是一圈長出鹿角般枝枒的木冠（頭冠，頭髮照常露出來）。
// 終結技：荊棘從地面竄出、漫天落葉。
import { tone, shade, stroke, span, pauldrons, cape, hash } from './kit.js';

const c = ['#1e140c', '#3a2818', '#5a4026', '#7e5e3a', '#a8885a'];   // 樹皮
const a = ['#2a6a2a', '#4aa83a', '#9ae05a'];                        // 葉
const g = ['#9ae05a', '#d8ff8a', '#ffffe0'];                        // 新芽的光
const bark = (x, y, t) => tone(c, t + (hash(Math.floor(x / 2), Math.floor(y / 4)) - 0.5) * 0.4);
// 一小叢葉子
const leaf = (G, x, y, r, big) => { G.set(x, y, a[1]); G.set(x + 1, y, a[2]); G.set(x, y - 1, a[2]); if (big) { G.set(x - 1, y, a[0]); G.set(x + 1, y - 1, r >= 3 ? g[1] : a[1]); } };
export default {
  key: 'tree', tier: 4, helmOpen: true,
  pal: { c, a, g, t: g[1], fx: ['#ffffe0', '#d8ff8a', '#9ae05a', '#4aa83a', '#1e4a1a'], arc: [['#ffffe0', '#9ae05a'], ['#ffffe0', '#d8ff8a']] },
  aura: { kind: 'leaves', cols: [a[2], a[1], g[1]] },
  stage: { slash: false, parts: ['spikes', 'leaves'], n: 11 },

  // 古木長弓：彎彎的樹枝當弓臂，上面冒出葉子，握把纏著藤
  weapon: { size: [26, 62], pivot: [17.5, 30.5], draw(px, r) {
    for (let y = 3; y <= 58; y++) {
      const bend = Math.round(10 * (1 - ((y - 30.5) / 27.5) ** 2)) + (hash(y >> 2, 3) > 0.6 ? 1 : 0);
      for (let k = 0; k < 3; k++) px.set(4 + bend + k, y, k === 0 ? c[3] : k === 2 ? c[1] : c[2]);
    }
    for (const [x, y] of [[6, 5], [5, 56], [11, 14], [11, 47], [13, 22]]) leaf(px, x, y, r, true);
    if (r >= 2) for (const [x, y] of [[4, 9], [4, 52]]) leaf(px, x, y, r, false);
    for (let y = 25; y <= 36; y++) for (let x = 15; x <= 20; x++) px.set(x, y, (x + y) % 3 === 0 ? a[0] : x === 15 ? c[1] : c[2]);
    if (r >= 3) { px.set(18, 30, g[1]); px.set(18, 31, g[2]); }
  } },

  // 古木冠：一圈木環，往上長出兩支鹿角般的枝枒，枝頭有葉
  helm(G, A, r) {
    const { L, R, B } = A, y = B - 3, big = r >= 4 ? 1.25 : 1, br = (i, dy) => (i > 0.7 ? c[4] : dy < 0 ? c[3] : c[2]);
    if (A.side) {
      span(G, L + 2, R - 1, y, c[2]); span(G, L + 3, R - 2, y - 1, c[3]);
      for (const [x0, s] of [[R - 5, 1], [L + 9, -1]]) {
        const pts = [[x0, y - 1], [x0 + s, y - 7 * big], [x0 - 2 * s * (s < 0 ? -1 : 1), y - 12 * big]];
        stroke(G, s > 0 ? [[x0, y - 1], [x0 + 1, y - 7 * big], [x0 - 2, y - 13 * big]] : [[x0, y - 1], [x0 - 2, y - 6 * big], [x0 - 5, y - 11 * big]], 1.2, 0.5, br);
        stroke(G, s > 0 ? [[x0 + 1, y - 6 * big], [x0 + 4, y - 9 * big]] : [[x0 - 2, y - 5 * big], [x0 + 1, y - 9 * big]], 0.8, 0.4, br);
        void pts;
      }
      for (const [x, yy] of [[R - 7, y - 13], [R - 1, y - 9], [L + 4, y - 11], [L + 10, y - 9]]) leaf(G, x, Math.round(yy * 1 + (big - 1) * -8), r, true);
      if (r >= 2) G.set(R - 3, y, g[1]);
    } else {
      const mid = (L + R) / 2;
      span(G, L + 1, R, y, c[2]); span(G, L + 2, R - 1, y - 1, c[3]);
      for (const s of [-1, 1]) {
        stroke(G, [[mid + s * 6, y - 1], [mid + s * 9, y - 7 * big], [mid + s * 8, y - 13 * big]], 1.2, 0.5, br);
        stroke(G, [[mid + s * 9, y - 6 * big], [mid + s * 14, y - 9 * big]], 0.8, 0.4, br);
        for (const [dx, dy] of [[8, -14], [14, -10], [4, -6]]) leaf(G, mid + s * dx, y + Math.round(dy * big), r, true);
      }
      if (r >= 2) { span(G, mid - 1, mid + 1, y, g[1]); G.set(mid, y - 2, a[2]); }
    }
  },

  // 樹皮甲：一塊塊的樹皮，肩上與腰間長著青苔，藤蔓腰帶繫著一朵花
  body: {
    own: true, pants: ['#3a2c1c', '#2a1e12'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y <= L.top + 1) return y === L.top && r >= 1 ? g[1] : a[L.dark(x) ? 0 : 1];                       // 青苔的領口
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? '#ff9ac8' : g[1]) : a[0];
      if (y >= L.shorts) return L.dark(x) ? a[0] : a[1];                                                     // 葉子裙甲
      if (L.center(x) && r >= 3) return g[0];
      return bark(x, y, L.light(x) ? 0.5 : L.dark(x) ? -0.6 : 0);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? a[2] : a[1];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? g[1] : a[0]) : c[2];
      return c[3];
    },
  },
  bodyExtras(P, view, it, ink) {
    const out = pauldrons(P, view, it, ink, (G, x, y, back) => {
      for (const [dx, dy] of [[-2, -1], [0, -2], [2, -1], [back * 3, -3]]) leaf(G, x + dx, y + dy, it.rarity, true);
    });
    out.cape = cape(P, view, it, ink, { len: 17, spread: 0.32, ragged: 3,
      col: (x, k, x0, x1, cut) => (k === cut ? a[2] : hash(x, k >> 1) > 0.75 ? a[2] : (x + k) % 5 === 0 ? a[0] : a[1]) });
    return out;
  },
  feet: { start: -2, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? g[1] : a[1];
    if (y >= L.sole) return c[0];
    return bark(x, y, L.light(x) ? 0.4 : L.dark(x) ? -0.6 : 0);
  } },
};
