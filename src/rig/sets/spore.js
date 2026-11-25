// T2 菇母套裝（術士・法杖）：青綠的菇傘、奶油色的菇柄、發光的孢子。頭飾是一頂大菇傘帽（傘下一圈菌褶），法杖頂端長著一朵發光的菇。
import { tone, shade, ellipse, span, pauldrons } from './kit.js';

const c = ['#0c2a2c', '#165050', '#23807a', '#38b4a4', '#86ecd6'];   // 菇傘
const a = ['#7a6a4a', '#cfc09a', '#fff2d0'];                        // 菇柄、菌褶
const g = ['#3ad8a0', '#9affdc', '#f0fff8'];                        // 孢子的光
// 菇傘：半圓頂，上面的斑點（spots 在 rarity 3 以上發光）
function cap(G, cx, cy, rx, ry, clip, r) {
  ellipse(G, cx, cy, rx, ry, (x, y, e) => {
    if (y > clip) return null;
    const spot = [[-0.45, -0.35], [0.15, -0.65], [0.5, -0.2], [-0.1, -0.15]].some(([sx, sy]) => Math.hypot((x - cx) / rx - sx, (y - cy) / ry - sy) < 0.13);
    if (spot) return r >= 3 ? g[1] : a[2];
    return tone(c, -((x - cx) / rx) * 0.3 - ((y - cy) / ry) * 1.1 - 0.2);
  });
}
export default {
  key: 'spore', tier: 2,
  pal: { c, a, g, t: a[2], fx: ['#f0fff8', '#9affdc', '#3ad8a0', '#23807a', '#0c2a2c'], arc: [['#f0fff8', '#5ae0c0'], ['#ffffff', '#9affdc']] },
  aura: { kind: 'spores', cols: [g[1], g[2], c[4]] },

  // 菇杖：彎彎的菇柄當杖身，頂端一朵大菇，傘下有光
  weapon: { size: [25, 60], pivot: [12.5, 50.5], draw(px, r) {
    for (let y = 9; y <= 58; y++) { const x0 = 11 + Math.round(Math.sin(y * 0.18) * 1.2); for (let x = x0; x < x0 + 3; x++) px.set(x, y, x === x0 ? a[0] : x === x0 + 2 ? a[1] : a[2]); }
    if (r >= 3) for (let y = 11; y <= 14; y++) for (let x = 9; x <= 15; x++) px.set(x, y, Math.abs(x - 12) < 2 ? g[2] : g[1]);   // 傘下的光
    cap(px, 12, 10, 11, 9, 9, r);
    span(px, 2, 22, 10, a[1]); for (let x = 3; x <= 21; x += 2) px.set(x, 11, a[0]);                   // 菌褶
    if (r >= 2) for (const [x, y] of [[4, 16], [20, 18], [7, 21]]) px.set(x, y, g[1]);                   // 飄著的孢子
    if (r >= 4) { cap(px, 17, 30, 4, 3, 30, 3); px.set(15, 31, a[1]); px.set(19, 31, a[1]); }            // 傳說：杖身再長出一朵小菇
  } },

  // 菇傘帽：寬寬的菇傘，傘下一圈菌褶
  helm(G, A, r) {
    const { L, R, B } = A;
    const cx = A.side ? L + 13 : (L + R) / 2, rx = A.side ? 15.5 : 17;
    cap(G, cx, B - 2, rx, 13, B - 2, r);
    span(G, cx - rx + 1, cx + rx - 1, B - 1, a[1]);
    for (let x = Math.round(cx - rx + 2); x <= cx + rx - 2; x += 2) G.set(x, B - 1, a[0]);                // 菌褶
    if (r >= 1) span(G, cx - rx + 3, cx + rx - 3, B, a[2]);
    if (r >= 4) { cap(G, cx + (A.side ? -6 : 7), B - 15, 3.5, 3, B - 15, 3); G.set(cx + (A.side ? -6 : 7), B - 14, a[1]); }   // 頂上的小菇
  },

  // 孢衣：青綠的菇傘披肩、奶油色的長袍，下襬一圈菇傘色的荷葉邊
  body: {
    own: true, robe: true, pants: [a[1], a[0]],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? a[2] : c[3];
      if (y <= L.top + 3) return y === L.top + 3 ? c[1] : shade(L, x, c);                        // 菇傘披肩
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? (r >= 2 ? g[2] : g[1]) : c[1];
      if (L.center(x) && r >= 3 && y > L.top + 4 && y < L.belt) return g[1];                         // 胸前一串發光的孢子
      return shade(L, x, [a[0], a[0], a[1], a[2], a[2]]);
    },
    skirt(L, x, y, it) { return y === L.robe ? (it.rarity >= 1 ? c[3] : c[2]) : y === L.robe - 1 ? c[1] : shade(L, x, [a[0], a[0], a[1], a[2], a[2]]); },
    arm(L, y) {
      if (y <= L.pad) return y < L.pad ? c[3] : c[2];
      if (y >= L.glove + 1) return null;
      return y === L.glove ? c[2] : a[1];
    },
  },
  // 肩上各長一朵小菇
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y, back) => { cap(G, x + back, y - 2, 3.2, 2.6, y - 2, it.rarity >= 3 ? 3 : 0); G.set(x + back, y - 1, a[1]); });
  },
  feet: { start: 2, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? a[2] : c[3];
    if (y >= L.sole) return c[0];
    return shade(L, x, c);
  } },
};
