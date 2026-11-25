// T3 岩王套裝（劍士・大劍）：熔岩巨人王的玄武岩，裂縫裡透著岩漿光。全罩式的岩盔只留一道發光的眼縫。
// 大劍沿用龍炎三式的動作，終結技召喚一顆燃燒的隕石砸下來。
import { tone, shade, ellipse, span, pauldrons, hash } from './kit.js';

const c = ['#141010', '#2a2220', '#463a34', '#6a5a50', '#9a8a7a'];   // 玄武岩
const a = ['#b8360e', '#ff7a1a', '#ffc06a'];                        // 岩漿
// 岩石：一塊塊的明暗（不是條紋），裂縫在 crack 為 true 的地方
const rock = (x, y, t) => tone(c, t + (hash(Math.floor(x / 4), Math.floor(y / 4)) - 0.5) * 0.35);
export default {
  key: 'rock', tier: 3, helmFull: true, bladeFire: true,
  pal: { c, a, g: a, t: a[2], fx: ['#fff0c2', '#ffc06a', '#ff7a1a', '#c83a10', '#3a1a10'], arc: [['#fff0c2', '#ff7a1a'], ['#fff0c2', '#ffc06a']] },
  aura: { kind: 'motes', cols: [a[2], a[1], a[0]] },
  stage: { beast: 'rock', slash: true, parts: ['spikes', 'pillar'] },

  // 岩王巨劍：一整塊粗糙的岩板，中間一道岩漿裂縫，護手是兩塊岩石
  weapon: { size: [27, 78], pivot: [13.5, 66.5], points: { base: [13.5, 52], tip: [13.5, 4] }, draw(px, r) {
    for (let y = 3; y <= 52; y++) {
      const half = y < 12 ? Math.round(((y - 3) / 9) * 6) : 6 + (hash(y, 2) > 0.7 ? 1 : 0), L = 13 - half, R = 13 + half - (hash(y, 5) > 0.75 ? 1 : 0);
      for (let x = L; x <= R; x++) px.set(x, y, Math.abs(x - 13 - Math.round(Math.sin(y * 0.3))) < 1 && y > 7 && y < 50 ? a[r >= 3 ? 2 : 1] : rock(x, y, -(x - 13) / 8 * 0.6 + 0.1));
    }
    for (const s of [-1, 1]) ellipse(px, 13 + s * 8, 55, 4.5, 3, (x, y) => rock(x, y, -(y - 55) / 3 * 0.5));
    for (let y = 53; y <= 57; y++) span(px, 11, 15, y, y === 55 ? a[r >= 2 ? 2 : 1] : c[2]);
    for (let y = 58; y <= 72; y++) for (let x = 11; x <= 15; x++) px.set(x, y, (x + y) % 4 === 0 && r >= 1 ? a[0] : x === 11 ? c[0] : c[1]);
    ellipse(px, 13, 74, 3, 2.5, () => c[3]); px.set(13, 74, a[1]);
  } },

  // 岩王盔：全罩式的大岩塊，一道橫的眼縫透出岩漿光，頭頂一排岩脊
  helm(G, A, r) {
    const { L, R, B } = A, eye = r >= 2 ? a[2] : a[1];
    const cx = A.side ? L + 13.5 : (L + R) / 2, cy = B + 1, rx = A.side ? 12 : 14.5, ry = 12.5;
    // 方方的岩塊（超橢圓），上面比下面寬一點
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const v = (y - cy) / ry, u = (x - cx) / (rx * (1 - Math.max(0, v) * 0.12));
      if (u ** 4 + v ** 4 > 1) continue;
      G.set(x, y, rock(x, y, (A.side ? u * 0.5 : 0.4 - Math.abs(u)) - v * 0.8));
    }
    span(G, cx - rx + 1, cx + rx - 1, B - 1, c[4]); span(G, cx - rx + 1, cx + rx - 1, B, c[1]);                 // 眉骨的岩簷
    for (let k = 0; k < 5; k++) {                                                    // 頭頂的岩脊
      const x = A.side ? cx + 6 - k * 4 : cx - 8 + k * 4, top = Math.round(cy - ry * Math.max(0, 1 - ((x - cx) / rx) ** 4) ** 0.25);
      for (let i = 1; i <= 3 - Math.abs(k - (A.side ? 1 : 2)) * 0.6; i++) span(G, x - 1, x + 1 - (i > 1 ? 1 : 0), top - i + 1, i === 1 ? c[3] : c[4]);
    }
    if (A.side) {
      span(G, R - 9, R + 1, B + 4, c[0]); span(G, R - 7, R, B + 5, eye); span(G, R - 9, R + 1, B + 6, c[0]);   // 眼縫
      for (let y = B + 7; y <= B + 13; y++) G.set(R - 3 + Math.round(hash(y, 1)), y, r >= 3 ? a[1] : c[1]);  // 下巴的裂縫
      if (r >= 3) for (let k = 0; k < 6; k++) G.set(cx - 6 - k, B - 4 + Math.round(k * 0.8), a[0]);
    } else {
      span(G, cx - 10, cx + 10, B + 4, c[0]); span(G, cx - 9, cx + 9, B + 5, c[0]); span(G, cx - 10, cx + 10, B + 6, c[0]);
      for (const s of [-1, 1]) span(G, cx + s * 3, cx + s * 7, B + 5, eye);
      for (let y = B + 2; y <= B + 13; y++) G.set(cx, y, y === B + 5 ? c[0] : c[3]);                        // 護鼻
      if (r >= 3) for (let k = 0; k < 5; k++) { G.set(cx - 9 + k, B - 6 + k, a[0]); G.set(cx + 9 - k, B - 6 + k, a[0]); }
    }
  },

  // 岩王重甲：大塊的岩板，胸口一道岩漿裂縫，熔岩扣
  body: {
    own: true, pants: [c[1], c[0]],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y <= L.top + 1) return y === L.top && r >= 1 ? a[1] : rock(x, y, 0.5);
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? a[r >= 2 ? 2 : 1] : c[1];
      if (y >= L.shorts) return y === L.shorts + 3 && r >= 3 ? a[0] : rock(x, y, L.dark(x) ? -0.6 : -0.2);
      if (L.center(x) && y > L.top + 2 && y < L.belt - 1) return r >= 2 ? a[1] : a[0];                      // 胸口的裂縫
      return rock(x, y, L.light(x) ? 0.5 : L.dark(x) ? -0.6 : 0);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[4] : c[3];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? a[1] : c[3]) : c[2];
      return c[2];
    },
  },
  // 岩塊護肩，裂縫發光
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y, back) => {
      ellipse(G, x + back, y - 1, 4.5, 3.2, (px, py) => rock(px, py, -(py - y + 1) / 3));
      if (it.rarity >= 3) { G.set(x, y - 2, a[1]); G.set(x + 1, y - 1, a[0]); }
    });
  },
  feet: { start: -3, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[1] : c[3];
    if (y >= L.sole) return it.rarity >= 3 && y === L.sole ? a[1] : c[0];
    return rock(x, y, L.light(x) ? 0.4 : L.dark(x) ? -0.6 : 0);
  } },
};
