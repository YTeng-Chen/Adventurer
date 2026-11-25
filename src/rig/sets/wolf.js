// T2 狼王套裝（弓手・弓）：灰色狼毛、棕皮革、狼牙。頭飾是一整顆狼頭頭罩（狼吻蓋在額頭上、兩隻豎起的耳朵、獠牙），背後披著狼皮。
import { tone, shade, ellipse, stroke, span, shell, pauldrons, cape, hash } from './kit.js';

const c = ['#1e1c1e', '#3a3638', '#5e585a', '#8a8486', '#c2bcb8'];   // 狼毛
const a = ['#3a2414', '#6a4426', '#9a6a3e'];                        // 皮革
const g = ['#a86a10', '#ffc23a', '#fff0b0'];                        // 琥珀眼
const fang = ['#b8ac94', '#e8e0cc', '#fffaf0'];
export default {
  key: 'wolf', tier: 2,
  pal: { c, a, g, t: fang[2], fx: ['#ffffff', '#e8eef4', '#b8c8d8', '#7a8898', '#3a4450'], arc: [['#ffffff', '#b8c8d8'], ['#fff8e0', '#ffc23a']] },
  aura: { kind: 'motes', cols: ['#e8eef4', '#b8c8d8', g[1]] },

  // 狼牙長弓：深色木弓臂，兩端是彎彎的狼牙，握把纏著狼毛
  weapon: { size: [24, 58], pivot: [16.5, 29.5], draw(px, r) {
    for (let y = 4; y <= 54; y++) {
      const bend = Math.round(9 * (1 - ((y - 29) / 25) ** 2));
      for (let k = 0; k < 3; k++) px.set(4 + bend + k, y, k === 0 ? (r >= 1 ? a[2] : a[1]) : k === 2 ? a[0] : a[1]);
      if (r >= 3 && y % 8 === 1 && y > 8 && y < 50) px.set(5 + bend, y, g[1]);
    }
    for (const [y0, s] of [[4, -1], [54, 1]]) stroke(px, [[5, y0], [3, y0 + s * 2], [2, y0 + s * 5]], 1.3, 0.5, (i) => (i > 0.6 ? fang[2] : fang[1]));   // 兩端的狼牙
    for (let y = 24; y <= 35; y++) for (let x = 14; x <= 19; x++) px.set(x, y, y === 24 || y === 35 ? (r >= 1 ? fang[1] : c[2]) : x === 14 ? c[1] : x > 17 ? c[2] : c[3]);   // 握把的狼毛
    if (r >= 2) { px.set(16, 29, g[2]); px.set(17, 29, g[1]); px.set(16, 30, g[1]); }
    if (r >= 4) for (const y of [20, 39]) stroke(px, [[15, y], [18, y + (y < 29 ? -3 : 3)]], 1, 0.5, () => fang[2]);   // 傳說：多兩顆牙墜
  } },

  // 狼頭頭罩：狼的上顎像帽簷蓋在額頭、往前伸出狼吻，兩隻豎起的耳朵，琥珀色的眼睛，後腦垂下狼毛
  helm(G, A, r) {
    const { L, R, B } = A, eye = r >= 2 ? g[2] : g[1];
    if (A.side) {
      for (let y = B - 1; y <= B + 7; y++) span(G, L - Math.round((y - B) * 0.3) - (hash(y, 3) > 0.5 ? 1 : 0), L + 5, y, (x) => (x === L + 5 ? c[2] : y % 3 === 0 ? c[1] : c[2]));   // 後腦垂下的狼毛
      const s = shell(G, A, c, { grow: 0.8, dy: 1, clip: B - 1 });
      for (const [x0, h] of [[L + 6, 7], [L + 11, 8]]) for (let k = 0; k < h; k++) span(G, x0 + Math.round(k * 0.25), x0 + 4 - Math.round(k * 0.4), s.cy - s.ry - k + 2, k > h - 3 ? c[1] : k > 1 ? (x0 > L + 8 ? a[2] : c[3]) : c[3]);   // 耳朵（裡面是皮色）
      for (let x = R - 9; x <= R + 6; x++) {                                     // 狼吻：從額頭往前伸
        const top = Math.round(B - 5 + Math.max(0, x - (R - 2)) * 0.45), bot = B;
        for (let y = top; y <= bot; y++) G.set(x, y, y === top ? c[4] : y === bot ? c[1] : tone(c, 0.3 - (y - top) * 0.25));
      }
      G.set(R + 6, B - 2, c[0]); G.set(R + 6, B - 1, c[0]); G.set(R + 5, B - 2, c[0]);   // 鼻頭
      span(G, R - 7, R - 5, B - 4, eye); G.set(R - 6, B - 5, c[0]);                       // 狼眼
      for (const [x, len] of [[R - 1, 2], [R + 2, 3], [R + 4, 2]]) for (let k = 1; k <= len; k++) G.set(x, B + k, k === len ? fang[2] : fang[1]);   // 獠牙
      if (r >= 1) span(G, L + 2, R - 8, B - 1, fang[1]);                                    // 一排牙齒做的頭帶
      if (r >= 4) for (let k = 0; k < 4; k++) G.set(s.cx - 4 - k * 2, s.cy - s.ry + 2 + k, g[1]);
    } else {
      const mid = (L + R) / 2;
      for (const s of [-1, 1]) for (let y = B; y <= B + 6; y++) span(G, mid + s * 13, mid + s * 15, y, y % 3 === 0 ? c[1] : c[2]);   // 兩側垂下的狼毛
      const sh = shell(G, A, c, { grow: 0.8, dy: 1, clip: B - 1 });
      for (const s of [-1, 1]) for (let k = 0; k < 8; k++) span(G, mid + s * (6 + Math.round(k * 0.3)), mid + s * (11 - Math.round(k * 0.4)), sh.cy - sh.ry - k + 3, k > 5 ? c[1] : Math.abs(k - 3) < 3 && k > 0 ? a[2] : c[3]);   // 耳朵
      for (let y = B - 6; y <= B; y++) { const half = 3 + Math.round((y - B + 6) * 0.6); span(G, mid - half, mid + half, y, y === B - 6 ? c[4] : y === B ? c[1] : c[3]); }   // 狼吻（正面看是往下的鼻樑）
      span(G, mid - 1, mid + 1, B - 1, c[0]); G.set(mid, B, c[0]);                          // 鼻頭
      for (const s of [-1, 1]) { span(G, mid + s * 6, mid + s * 8, B - 4, eye); G.set(mid + s * 7, B - 5, c[0]); }
      for (const dx of [-5, -3, 3, 5]) for (let k = 1; k <= 2; k++) G.set(mid + dx, B + k, k === 2 ? fang[2] : fang[1]);
      if (r >= 1) { span(G, L + 1, mid - 6, B - 1, fang[1]); span(G, mid + 6, R, B - 1, fang[1]); }
    }
  },

  // 狼皮甲：皮革胸甲，毛領，胸前一串狼牙（稀有以上）
  body: {
    own: true, pants: ['#3e3a36', '#2c2826'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y <= L.top + 1) return y === L.top && r >= 1 ? fang[1] : L.dark(x) ? c[2] : c[4];   // 毛領
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[2] : g[1]) : a[0];
      if (y >= L.shorts) return L.dark(x) ? c[1] : c[2];
      if (y === L.top + 2 && r >= 2 && L.center(x)) return fang[2];
      if (L.center(x)) return a[0];                                                           // 中間的綁帶
      return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[4] : c[3];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? fang[1] : c[3]) : c[2];
      return a[1];
    },
  },
  // 肩上的狼毛、背後的狼皮披風
  bodyExtras(P, view, it, ink) {
    const out = pauldrons(P, view, it, ink, (G, x, y, back) => {
      for (let k = 0; k < 4; k++) span(G, x - 3 + (back < 0 ? 0 : k), x + 2 - (back < 0 ? k : 0), y - 2 + k, k === 0 ? c[4] : k === 3 ? c[2] : c[3]);
      G.set(x + back * 4, y - 1, c[3]); G.set(x + back * 4, y, c[2]);
    });
    out.cape = cape(P, view, it, ink, { len: 19, spread: 0.3, ragged: 3, clasp: it.rarity >= 1 ? fang[2] : c[4],
      col: (x, k, x0, x1, cut) => (k === cut ? c[1] : k < 3 ? c[4] : (x - x0) % 4 === 0 ? c[2] : c[3]) });
    return out;
  },
  // 毛皮靴：靴口一圈狼毛
  feet: { start: -1, paint(L, x, y, it, start) {
    if (y <= start + 1) return y === start ? c[4] : c[3];
    if (y >= L.sole) return a[0];
    return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
  } },
};
