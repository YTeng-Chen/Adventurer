// T2 戰團套裝（劍士・劍）：哥布林頭目的戰利品。生鐵、補丁皮革、黃銅鉚釘，綠色的頭目徽章。
// 頭盔兩側一對往外再往上彎的牛角、頭頂一根尖刺；劍是一把背上帶鋸齒的寬刃砍刀。
import { tone, shade, stroke, span, shell, pauldrons } from './kit.js';

const c = ['#18181c', '#33333a', '#55555e', '#80808a', '#b4b4bc'];   // 生鐵
const a = ['#3e2614', '#6e4424', '#a06a3a'];                        // 皮革
const g = ['#4a8a1a', '#9adf4a', '#e0ffb0'];                        // 徽章的綠
const brass = '#d8a840', horn = ['#8a7a5a', '#cfc09a', '#f4ecd4'];
export default {
  key: 'goblin', tier: 2,
  pal: { c, a, g, t: brass, fx: ['#fff8e0', '#e0ffb0', '#9adf4a', '#4a8a1a', '#1e3a0a'], arc: [['#fff8e0', '#c8b070'], ['#f0ffd0', '#9adf4a']] },
  aura: { kind: 'sparks', cols: [brass, g[1]] },

  // 鋸刃砍刀：寬刃、刀背一排鋸齒、刀尖斜切
  weapon: { size: [21, 56], pivot: [10.5, 50.5], draw(px, r) {
    for (let y = 3; y <= 40; y++) {
      const L = 6, R = y < 10 ? 6 + Math.round((y - 3) * 1.3) : 15;
      for (let x = L; x <= R; x++) px.set(x, y, x >= R ? '#eef0f4' : x >= R - 1 ? c[4] : x <= L + 1 ? c[2] : c[3]);
      if (y > 8 && y < 38 && y % 4 === 0) { px.set(L - 1, y, c[2]); px.set(L - 2, y - 1, c[2]); px.set(L - 1, y - 1, c[2]); }   // 刀背的鋸齒
      if (r >= 3 && y > 10 && y < 37) px.set(10, y, g[1]);                                                                  // 史詩以上：發光的血槽
    }
    for (let x = 3; x <= 18; x++) { px.set(x, 41, r >= 1 ? brass : c[3]); px.set(x, 42, c[2]); }                              // 護手
    for (let y = 43; y <= 51; y++) for (let x = 9; x <= 11; x++) px.set(x, y, (x + y) % 3 === 0 ? a[2] : x === 9 ? a[0] : a[1]);
    for (let y = 52; y <= 54; y++) span(px, 8, 12, y, y === 53 && r >= 2 ? g[1] : brass);                                       // 柄頭：頭目徽章
  } },

  // 戰團角盔：生鐵頭盔、護鼻、黃銅鉚釘，一對牛角，頭頂尖刺
  helm(G, A, r) {
    const { L, R, B } = A, rivet = r >= 1 ? brass : c[4], big = r >= 4 ? 1.2 : 1, hornCol = (i, dy) => (i > 0.75 ? horn[2] : dy < 0 ? horn[1] : horn[0]);
    if (A.side) {
      stroke(G, [[L + 9, B - 7], [L + 3, B - 9], [L, B - 13 * big], [L + 1, B - 17 * big]], 1.6, 0.6, (i) => (i > 0.75 ? horn[1] : horn[0]));   // 後面的角
      const s = shell(G, A, c, { grow: 0.3, dy: 1, clip: B - 1 });
      span(G, L + 1, R + 1, B - 1, c[3]); span(G, L + 2, R + 1, B, c[2]);
      for (let x = L + 3; x <= R; x += 4) G.set(x, B - 1, rivet);
      for (let y = B + 1; y <= B + 5; y++) span(G, L + 1, L + 5, y, y === B + 5 ? c[1] : c[2]);                                   // 護頸
      for (let y = B + 1; y <= B + 4; y++) G.set(R, y, c[3]);                                                                     // 護鼻
      stroke(G, [[s.cx, s.cy - s.ry + 1], [s.cx - 1, s.cy - s.ry - 4]], 1.4, 0.4, (i) => (i > 0.6 ? c[4] : c[3]));               // 頭頂尖刺
      stroke(G, [[L + 14, B - 6], [L + 8, B - 9], [L + 5, B - 14 * big], [L + 7, B - 19 * big]], 2.2, 0.7, hornCol);              // 前面的角
      if (r >= 2) { G.set(R - 3, B - 3, g[1]); G.set(R - 3, B - 4, g[2]); }
    } else {
      const mid = (L + R) / 2;
      for (const s of [-1, 1]) stroke(G, [[mid + s * 11, B - 6], [mid + s * 17, B - 8], [mid + s * 20, B - 13 * big], [mid + s * 19, B - 18 * big]], 2.2, 0.7, hornCol);
      const sh = shell(G, A, c, { grow: 0.3, dy: 1, clip: B - 1 });
      span(G, L, R + 1, B - 1, c[3]); span(G, L - 1, R + 2, B, c[2]);
      for (let x = L + 1; x <= R; x += 4) G.set(x, B - 1, rivet);
      for (let y = B + 1; y <= B + 4; y++) span(G, mid, mid + 1, y, y === B + 4 ? c[2] : c[4]);
      stroke(G, [[mid + 0.5, sh.cy - sh.ry + 1], [mid + 0.5, sh.cy - sh.ry - 4]], 1.4, 0.4, (i) => (i > 0.6 ? c[4] : c[3]));
      if (r >= 2) { span(G, mid - 1, mid + 2, B - 4, g[1]); span(G, mid, mid + 1, B - 5, g[2]); }
    }
  },

  // 補丁皮甲：靠光的半邊是一片生鐵胸甲，另一半是皮革；黃銅扣環
  body: {
    own: true, pants: ['#4a3a2a', '#3a2c1e'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? brass : c[3];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[1] : brass) : a[0];
      if (y >= L.shorts) return L.dark(x) ? a[0] : a[1];
      if (L.light(x) || L.center(x)) return y === L.top + 5 && r >= 1 ? brass : tone(c, 0.6 - (y - L.top) * 0.12);   // 生鐵胸甲
      return y === L.top + 4 ? a[0] : shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[4] : c[3];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? brass : c[3]) : c[2];
      return a[1];
    },
  },
  // 生鐵護肩，兩根尖刺
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y, back) => {
      for (const [dy, x0, x1] of [[-2, -2, 2], [-1, -3, 3], [0, -3, 3]]) span(G, x + x0, x + x1, y + dy, dy === 0 ? c[2] : c[3]);
      if (it.rarity >= 1) G.set(x, y - 1, brass);
      for (const sx of [-1, 1]) for (let k = 0; k < 2 + (it.rarity >= 4 ? 1 : 0); k++) G.set(x + sx * 2 + back * k, y - 3 - k, k ? c[4] : c[3]);
    });
  },
  feet: { start: -1, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? brass : c[3];
    if (y >= L.sole) return c[0];
    return y === start + 1 ? c[4] : shade(L, x, c);
  } },
};
