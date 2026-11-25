// T4 巨像套裝（守衛・鎚）：鏽蝕巨像的青銅、銅綠、熔爐的橘光。全罩式的桶盔只留一道發亮的眼縫，頭頂一枚齒輪。
// 終結技：熔爐光柱衝天、蒸氣與齒輪碎片四散。
import { tone, shade, ellipse, span, pauldrons } from './kit.js';

const c = ['#2a140a', '#4a2614', '#7a4422', '#a8643a', '#d89a62'];   // 青銅
const a = ['#1e5a50', '#3a9a86', '#7ad8c0'];                        // 銅綠
const g = ['#c85a10', '#ffb040', '#fff0b0'];                        // 熔爐
// 齒輪：中心 (cx, cy)、半徑 rr，teeth 個齒
function gear(G, cx, cy, rr, teeth, col, hub) {
  for (let y = Math.floor(cy - rr - 2); y <= Math.ceil(cy + rr + 2); y++) for (let x = Math.floor(cx - rr - 2); x <= Math.ceil(cx + rr + 2); x++) {
    const d = Math.hypot(x - cx, y - cy), ang = Math.atan2(y - cy, x - cx), tooth = Math.cos(ang * teeth) > 0.3;
    if (d <= rr || (tooth && d <= rr + 1.6)) G.set(x, y, d < rr * 0.4 ? hub : d > rr - 0.8 ? c[2] : col);
  }
}
export default {
  key: 'colossus', tier: 4, helmFull: true,
  pal: { c, a, g, t: g[1], fx: ['#fff0b0', '#ffd080', '#ffb040', '#c86a20', '#4a2614'], arc: [['#fff0d0', '#ffb040'], ['#ffffff', '#ffd080']] },
  aura: { kind: 'sparks', cols: [g[1], g[2]] },
  stage: { slash: true, parts: ['steam', 'pillar'] },

  // 齒輪巨鎚：長方形的青銅鎚頭，側面一枚發光的齒輪，邊緣長著銅綠
  weapon: { size: [33, 66], pivot: [16.5, 60.5], draw(px, r) {
    for (let y = 4; y <= 22; y++) for (let x = 2; x <= 30; x++) px.set(x, y, y >= 20 ? a[1] : x <= 3 || x >= 29 ? c[1] : tone(c, 0.6 - (y - 4) / 18 * 1.4));
    for (const x of [4, 28]) for (const y of [6, 19]) px.set(x, y, c[4]);                                      // 鉚釘
    gear(px, 16, 13, 6, 8, c[3], r >= 3 ? g[2] : g[1]);
    for (let y = 23; y <= 63; y++) for (let x = 15; x <= 17; x++) px.set(x, y, x === 15 ? c[0] : y % 8 === 0 && r >= 1 ? a[1] : c[2]);
    span(px, 13, 19, 23, c[3]); span(px, 13, 19, 24, c[2]);
    if (r >= 4) for (const x of [6, 26]) { px.set(x, 2, g[1]); px.set(x, 3, c[2]); }                           // 傳說：鎚頭冒火的排氣孔
  } },

  // 巨像桶盔：方方的青銅桶盔，一道發光的眼縫，下面一排透氣孔，頭頂一枚齒輪
  helm(G, A, r) {
    const { L, R, B } = A, eye = r >= 2 ? g[2] : g[1];
    const cx = A.side ? L + 13.5 : (L + R) / 2, cy = B + 1.5, rx = A.side ? 11.5 : 13.5, ry = 12;
    if (r >= 2) gear(G, A.side ? cx - 3 : cx, cy - ry - 1, 4, 6, c[3], g[1]);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x - cx) / rx, v = (y - cy) / ry;
      if (u ** 6 + Math.max(0, -v) ** 2 + Math.max(0, v) ** 8 > 1) continue;              // 上圓下方的桶子
      G.set(x, y, y >= cy + ry - 2 ? a[1] : tone(c, (A.side ? u * 0.5 : 0.5 - Math.abs(u) * 1.1) - v * 0.7));
    }
    if (A.side) {
      for (let y = Math.round(cy - ry + 2); y <= cy + ry - 3; y++) G.set(cx - 2, y, c[1]);                // 接縫
      span(G, R - 10, R + 1, B + 3, c[0]); span(G, R - 9, R, B + 4, eye); span(G, R - 10, R + 1, B + 5, c[0]);
      for (let x = R - 7; x <= R; x += 2) G.set(x, B + 9, c[0]);
      for (const [x, y] of [[cx - 6, B - 4], [cx - 6, B + 6], [cx + 2, B - 6]]) G.set(x, y, c[4]);
    } else {
      for (let y = Math.round(cy - ry + 1); y <= cy + ry - 3; y++) G.set(cx, y, y === B + 4 ? c[0] : c[4]);
      span(G, cx - 10, cx + 10, B + 3, c[0]); for (const s of [-1, 1]) span(G, cx + s * 2, cx + s * 9, B + 4, eye); span(G, cx - 10, cx + 10, B + 5, c[0]);
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) G.set(cx + s * (3 + k * 2), B + 9, c[0]);
      for (const s of [-1, 1]) for (const y of [B - 6, B + 7]) G.set(cx + s * 11, y, c[4]);
    }
  },

  // 巨像鎧：鉚釘接合的青銅板，胸口一個熔爐格柵，銅綠腰帶
  body: {
    own: true, pants: ['#3a2a22', '#2a1e18'],
    torso(L, x, y, it) {
      const r = it.rarity;
      if (y === L.top) return r >= 1 ? g[1] : c[4];
      if (y >= L.belt && y < L.shorts) return L.buckle(x) ? g[r >= 2 ? 2 : 1] : a[1];
      if (y >= L.shorts) return y === L.shorts ? a[2] : L.dark(x) ? c[1] : c[2];
      if (Math.abs(x - L.cx) <= 2 && y >= L.top + 2 && y <= L.top + 5) return y % 2 ? c[0] : g[r >= 3 ? 2 : 1];   // 熔爐格柵
      if (y === L.top + 7) return a[1];
      return shade(L, x, [c[1], c[1], c[2], c[3], c[4]]);
    },
    arm(L, y, it) {
      if (y <= L.pad) return y < L.pad ? c[4] : c[3];
      if (y >= L.glove) return y === L.glove ? a[1] : c[2];
      return c[3];
    },
  },
  // 大圓肩甲，鉚釘一圈
  bodyExtras(P, view, it, ink) {
    return pauldrons(P, view, it, ink, (G, x, y, back) => {
      ellipse(G, x + back, y - 1, 4.8, 3.4, (px, py, e) => (e > 0.75 ? (py > y ? a[1] : c[2]) : py < y - 2 ? c[4] : c[3]));
      for (const dx of [-3, 0, 3]) G.set(x + back + dx, y, c[4]);
      if (it.rarity >= 4) { G.set(x + back * 3, y - 5, c[2]); G.set(x + back * 3, y - 6, g[1]); }               // 排氣管
    });
  },
  feet: { start: -3, paint(L, x, y, it, start) {
    if (y === start) return it.rarity >= 1 ? g[1] : c[4];
    if (y >= L.sole) return c[0];
    if (y === L.sole - 1) return a[1];
    return shade(L, x, [c[1], c[1], c[2], c[3], c[4]]);
  } },
};
