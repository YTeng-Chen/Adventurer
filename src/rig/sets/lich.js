// T5 亡靈君主套裝（劍士・大劍）：紫黑的冥甲、白骨、綠色的魂火。全罩式頭盔：骷髏面甲配上一頂骨刺王冠。
// 大劍沿用龍炎三式的動作，火換成綠紫的魂火，終結技召喚一顆燃燒的骷髏。
import { tone, shade, ellipse, span, pauldrons, cape, hash } from './kit.js';

const c = ['#0e0812', '#22142a', '#3a2446', '#5a3a6e', '#8a6aa0'];   // 冥甲
const a = ['#8a8270', '#c8c0a8', '#f0ecdc'];                        // 骨
const g = ['#2ac870', '#8aff9a', '#e8ffe8'];                        // 魂火
export default {
  key: 'lich', tier: 5, helmFull: true, bladeFire: true,
  pal: { c, a, g, t: g[1], fx: ['#e8ffe8', '#8aff9a', '#4ad880', '#6a3aa0', '#1a0a2a'], arc: [['#e8ffe8', '#4ad880'], ['#ffffff', '#8aff9a']] },
  aura: { kind: 'wisps', cols: [g[1], g[2], c[4]] },
  stage: { beast: 'skull', slash: true, parts: ['wisps'] },

  // 亡君骨劍：白骨劍身、背上一節節像脊椎的骨刺，中間一道紫黑的血槽；護手是一顆骷髏
  weapon: { size: [27, 78], pivot: [13.5, 66.5], points: { base: [13.5, 50], tip: [13.5, 3] }, draw(px, r) {
    for (let y = 2; y <= 50; y++) {
      const half = y < 13 ? Math.round(((y - 2) / 11) * 5) : 5, L = 13 - half, R = 13 + half;
      for (let x = L; x <= R; x++) px.set(x, y, x >= 12 && x <= 14 && y > 7 && y < 48 ? (x === 13 && r >= 3 ? g[1] : c[2]) : x >= R ? a[2] : x <= L + 1 ? a[0] : a[1]);
      if (y > 14 && y < 48 && y % 5 === 0) { px.set(L - 1, y, a[1]); px.set(L - 2, y - 1, a[1]); px.set(L - 1, y - 1, a[0]); }   // 脊椎般的骨刺
      if (r >= 4 && y > 16 && y < 44 && y % 7 === 3) { px.set(10, y, g[1]); px.set(16, y + 2, g[1]); }
    }
    ellipse(px, 13, 55, 5.5, 4.5, (x, y) => (y > 56 ? a[0] : a[1]));                                         // 骷髏護手
    for (const x of [11, 15]) { px.set(x, 55, c[0]); px.set(x, 54, c[0]); if (r >= 2) px.set(x, 55, g[1]); }
    for (const x of [11, 13, 15]) px.set(x, 59, a[2]);
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) px.set(13 + s * (6 + k), 54 - k, k > 2 ? a[2] : a[1]);   // 兩邊往上翹的骨角
    for (let y = 60; y <= 72; y++) for (let x = 12; x <= 14; x++) px.set(x, y, (x + y) % 3 === 0 && r >= 1 ? g[0] : x === 12 ? c[0] : c[2]);
    ellipse(px, 13, 74, 2.5, 2, () => a[1]); px.set(13, 74, g[1]);
  } },

  // 亡靈王冠：紫黑頭盔上戴著骷髏面甲（眼窩裡燒著綠色魂火），頭頂一圈參差的骨刺王冠
  helm(G, A, r) {
    const { L, R, B } = A, eye = r >= 2 ? g[2] : g[1], tall = r >= 4 ? 2 : 0;
    const cx = A.side ? L + 13 : (L + R) / 2, cy = B + 1, rx = A.side ? 12 : 14.5, ry = 12.5;
    ellipse(G, cx, cy, rx, ry, (x, y) => tone(c, (A.side ? (x - cx) / rx * 0.5 : 0.4 - Math.abs(x - cx) / rx) - (y - cy) / ry * 0.8));
    const crown = (x, h) => { const top = Math.round(cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))); for (let k = 0; k < h; k++) { G.set(x, top - k + 1, k === h - 1 ? (r >= 3 ? g[1] : a[2]) : a[1]); if (k < h - 2) G.set(x + 1, top - k + 1, a[0]); } };
    if (A.side) {
      for (const [dx, h] of [[6, 5], [2, 7], [-2, 6], [-6, 4], [-9, 3]]) crown(cx + dx, h + tall);
      span(G, cx - 9, cx + 9, Math.round(cy - ry) + 3, a[0]);                                                // 王冠的環
      for (let y = B - 3; y <= B + 12; y++) {                                                                // 骷髏面甲
        const x0 = R - 10 + Math.max(0, y - B - 8) + Math.max(0, B - 1 - y), x1 = R + 1 - Math.max(0, y - B - 9) - Math.round(Math.max(0, B - y) * 0.8) + (y >= B + 4 && y <= B + 6 ? 1 : 0);   // 圓圓的額頭、突出的顴骨
        span(G, x0, x1, y, (x) => (x === x0 ? a[0] : y < B ? a[2] : a[1]));
      }
      for (let y = B + 1; y <= B + 4; y++) span(G, R - 5, R - 2, y, c[0]); span(G, R - 4, R - 3, B + 2, eye);   // 眼窩
      G.set(R, B + 6, c[0]); G.set(R, B + 7, c[0]);                                                          // 鼻孔
      for (let x = R - 6; x <= R; x += 2) { G.set(x, B + 9, c[0]); G.set(x, B + 10, c[0]); }                  // 牙縫
      if (r >= 1) span(G, R - 10, R - 6, B - 4, g[0]);
    } else {
      for (const [dx, h] of [[0, 8], [-4, 6], [4, 6], [-8, 5], [8, 5], [-11, 3], [11, 3]]) crown(cx + dx, h + tall);
      span(G, cx - 11, cx + 11, Math.round(cy - ry) + 4, a[0]);
      for (let y = B - 3; y <= B + 12; y++) { const half = 9 - Math.max(0, y - B - 7); span(G, cx - half, cx + half, y, y < B ? a[2] : a[1]); }
      for (const s of [-1, 1]) { for (let y = B + 1; y <= B + 4; y++) span(G, cx + s * 2, cx + s * 6, y, c[0]); span(G, cx + s * 3, cx + s * 5, B + 2, eye); }
      G.set(cx, B + 6, c[0]); G.set(cx, B + 7, c[0]);
      for (let x = cx - 5; x <= cx + 5; x += 2) { G.set(x, B + 9, c[0]); G.set(x, B + 10, c[0]); }
      if (r >= 2) { G.set(cx, Math.round(cy - ry) + 4, g[1]); }
    }
  },

  // 亡君骨鎧：紫黑的板甲，胸口一根胸骨與兩對肋骨，骷髏扣環
  body: {
    own: true, pants: [c[1], c[0]],
    torso(L, x, y, it) {
      const r = it.rarity, d = Math.abs(x - L.cx);
      if (y === L.top) return r >= 1 ? g[1] : a[1];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? a[2] : c[0];
      if (y >= L.shorts) return y === L.shorts + 3 && r >= 3 ? g[0] : L.dark(x) ? c[1] : c[2];
      if (L.center(x) && y > L.top && y < L.belt - 1) return a[1];                                          // 胸骨
      if ((y === L.top + 3 || y === L.top + 5) && d >= 1 && d <= 5) return d === 5 ? a[0] : a[1];          // 肋骨
      if (r >= 3 && (y === L.top + 4) && d >= 1 && d <= 4) return g[0];                                     // 肋骨之間的魂火
      return shade(L, x, c);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? a[2] : a[1];
      if (y >= L.glove) return y === L.glove ? (it.rarity >= 1 ? g[1] : a[0]) : c[2];
      return c[3];
    },
  },
  // 骷髏肩甲、紫色的破披風（史詩以上下襬燒著魂火）
  bodyExtras(P, view, it, ink) {
    const out = pauldrons(P, view, it, ink, (G, x, y, back) => {
      ellipse(G, x + back, y - 1, 3.8, 3, (px, py) => (py > y ? a[0] : py < y - 2 ? a[2] : a[1]));
      G.set(x + back - 1, y - 1, c[0]); G.set(x + back + 1, y - 1, it.rarity >= 2 ? g[1] : c[0]);
      for (let k = 0; k < 2 + (it.rarity >= 4 ? 1 : 0); k++) G.set(x + back * (3 + k), y - 3 - k, a[2]);
    });
    out.cape = cape(P, view, it, ink, { len: 24, spread: 0.38, ragged: 4, clasp: it.rarity >= 1 ? a[2] : a[1],
      col: (x, k, x0, x1, cut) => (k >= cut - 1 && it.rarity >= 3 ? (hash(x, k) > 0.5 ? g[1] : g[0]) : (x - x0) % 3 === 0 ? c[1] : c[2]) });
    return out;
  },
  feet: { start: -3, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? g[1] : a[1];
    if (y === start + 1) return a[2];
    if (y >= L.sole) return a[0];
    return shade(L, x, c);
  } },
};
