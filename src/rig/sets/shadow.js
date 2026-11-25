// T3 影狼套裝（劍士・劍）：夜色般的深紫黑、發光的紫色刃口。頭上是帶狼耳的兜帽、額前一片短狼吻面甲，臉下半蒙著圍巾。
// 終結技：一群影狼從身邊撲向目標，兩道巨大的交叉斬擊。
import { tone, shade, stroke, span, shell, pauldrons, cape, hash } from './kit.js';

const c = ['#0c0a16', '#1c1830', '#2e2a4e', '#4a4478', '#7a74b0'];   // 影
const a = ['#5a2a9a', '#9a5aff', '#e0c8ff'];                        // 紫光
export default {
  key: 'shadow', tier: 3,
  pal: { c, a, g: a, t: a[2], fx: ['#f0e0ff', '#c8a0ff', '#8a5ae0', '#4a2a8a', '#120a24'], arc: [['#f0e0ff', '#8a5ae0'], ['#ffffff', '#c8a0ff']] },
  aura: { kind: 'wisps', cols: [a[2], a[1], c[4]] },
  stage: { slash: true, parts: ['wisps', 'slashx'] },

  // 影爪刃：微微往前彎的黑刃，刃口一道紫光；護手是三根往前抓的爪
  weapon: { size: [25, 60], pivot: [10.5, 53.5], draw(px, r) {
    for (let y = 2; y <= 44; y++) {
      const k = (44 - y) / 42, cx = 10 + Math.round(k * k * 6), half = y < 8 ? Math.round((y - 2) / 2) : 3;
      for (let x = cx - half; x <= cx + half; x++) px.set(x, y, x === cx + half ? a[r >= 3 ? 2 : 1] : x >= cx + half - 1 ? c[3] : x <= cx - half ? c[0] : c[1]);
    }
    for (const [x0, y0] of [[4, 45], [10, 44], [16, 45]]) stroke(px, [[x0, y0], [x0 + 2, y0 - 3], [x0 + 4, y0 - 4]], 1, 0.5, (i) => (i > 0.6 ? (r >= 1 ? a[2] : c[4]) : c[2]));   // 爪
    span(px, 4, 17, 46, c[2]); span(px, 5, 16, 47, r >= 1 ? a[1] : c[3]);
    for (let y = 48; y <= 56; y++) for (let x = 9; x <= 11; x++) px.set(x, y, (x + y) % 3 === 0 ? a[0] : x === 9 ? c[0] : c[1]);
    span(px, 9, 11, 57, r >= 2 ? a[2] : c[3]);
  } },

  // 影狼兜帽：深色兜帽、兩隻尖耳、額前的短狼吻面甲（紫色眼縫），下半臉蒙著圍巾
  helm(G, A, r) {
    const { L, R, B } = A, eye = r >= 2 ? a[2] : a[1];
    if (A.side) {
      for (let y = B - 1; y <= B + 9; y++) span(G, L - Math.round((y - B) * 0.25), L + 6, y, (x) => (x === L + 6 ? c[2] : c[1]));   // 兜帽垂在後腦
      const s = shell(G, A, c, { grow: 0.8, dy: 1, clip: B });
      for (const [x0, h] of [[L + 6, 6], [L + 11, 7]]) for (let k = 0; k < h; k++) span(G, x0 + Math.round(k * 0.4), x0 + 3 - Math.round(k * 0.3), s.cy - s.ry - k + 2, k > h - 2 ? a[1] : c[2]);
      for (let x = R - 10; x <= R + 3; x++) {                                    // 狼吻面甲
        const top = Math.round(B - 4 + Math.max(0, x - (R - 3)) * 0.6), bot = B + 1 - Math.max(0, x - R);
        for (let y = top; y <= bot; y++) G.set(x, y, y === top ? c[4] : y === bot ? (r >= 1 ? a[1] : c[2]) : c[3]);
      }
      span(G, R - 7, R - 4, B - 1, eye);
      for (let y = B + 9; y <= B + 12; y++) span(G, R - 9, R + 1 - Math.max(0, y - B - 11), y, y === B + 9 ? c[3] : c[2]);   // 圍巾
      for (let k = 0; k < 9; k++) span(G, L + 3 - k, L + 5 - k, B + 10 + Math.round(k * 0.5) + (hash(k, 4) > 0.6 ? 1 : 0), k > 6 && r >= 3 ? a[1] : c[2]);   // 圍巾尾巴往後飄
    } else {
      const mid = (L + R) / 2;
      for (const s of [-1, 1]) for (let y = B - 1; y <= B + 9; y++) span(G, mid + s * 13, mid + s * 15, y, c[1]);
      const sh = shell(G, A, c, { grow: 0.8, dy: 1, clip: B });
      for (const s of [-1, 1]) for (let k = 0; k < 7; k++) span(G, mid + s * (6 + Math.round(k * 0.4)), mid + s * (10 - Math.round(k * 0.3)), sh.cy - sh.ry - k + 3, k > 5 ? a[1] : c[2]);
      for (let y = B - 4; y <= B + 1; y++) { const half = y < B - 1 ? 3 : 4 + (y - B); span(G, mid - half, mid + half, y, y === B + 1 ? (r >= 1 ? a[1] : c[2]) : c[3]); }
      for (const s of [-1, 1]) span(G, mid + s * 6, mid + s * 9, B - 1, eye);
      for (let y = B + 9; y <= B + 12; y++) span(G, mid - 9 + (y - B - 9), mid + 9 - (y - B - 9), y, y === B + 9 ? c[3] : c[2]);
    }
  },

  // 夜行衣：深色皮衣、斜斜的紫色扣帶
  body: {
    own: true, pants: [c[1], c[0]],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? a[1] : c[3];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? a[2] : a[1]) : c[0];
      if (y >= L.shorts) return L.dark(x) ? c[0] : c[1];
      if (Math.abs((x - L.cx) - (y - L.top - 4)) < 1 && y > L.top) return r >= 3 ? a[1] : a[0];             // 斜扣帶
      return shade(L, x, c);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[3] : c[2];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? a[1] : c[3]) : c[1];
      return c[2];
    },
  },
  bodyExtras(P, view, it, ink) {
    const out = pauldrons(P, view, it, ink, (G, x, y, back) => {
      for (let k = 0; k < 3; k++) span(G, x - 2 + (back < 0 ? 0 : k), x + 2 - (back < 0 ? k : 0), y - 1 + k, k === 0 ? c[3] : c[2]);
      for (let k = 0; k < 3; k++) G.set(x + back * (2 + k), y - 2 - k, k === 2 ? a[1] : c[3]);
    });
    out.cape = cape(P, view, it, ink, { len: 21, spread: 0.4, ragged: 5, clasp: it.rarity >= 1 ? a[1] : c[3],
      col: (x, k, x0, x1, cut) => (k >= cut - 1 && it.rarity >= 3 ? a[1] : (x - x0) % 4 === 0 ? c[0] : c[1]) });
    return out;
  },
  feet: { start: 0, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[1] : c[3];
    if (y >= L.sole) return it.rarity >= 3 && y === L.sole ? a[1] : c[0];
    return shade(L, x, c);
  } },
};
