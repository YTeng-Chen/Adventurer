// 2D 骨架動畫：角色拆成零件（頭、身體、上臂、前臂、大腿、小腿），掛在關節上；動作是讓關節轉動、移動。
// 一件裝備只要照零件的形狀上色，所有動作都能用；一個動作做一次，所有裝備都適用。
// 全部畫在低解析度的 canvas 上（不做平滑），旋轉後仍然是一格一格的像素。
// 座標：零件用還原後的像素格（男女都是 112 列高）。身體位置（LM）與上色用「大格」：一大格 = 2×2 像素（P.unit），
// 和參考圖原本的方塊差不多大，衣服才不會比角色細緻。
// 角度單位是度，正值為順時針，0 度表示自然下垂。
// 性別：'m' 男、'f' 女，各有自己的零件圖與身體位置；動作共用。
// 兩種視角：側面（朝右；戰鬥與掛機用，後面的手腳是調暗的複製品）與正面（角色建立與預覽用）。
import { RIG_PARTS } from './parts-data.js';
import { gearMats } from '../art/palette.js';
import { CHIBI } from '../art/chibi-data.js';

const RAD = Math.PI / 180;
const INK = RIG_PARTS.m.front.ink;
export const HAIR_COLORS = CHIBI.hairColors;
export const DEFAULT_HAIR = '深棕';   // 參考圖原本的髮色，不重新上色
export const GENDERS = { m: '男生', f: '女生' };

// 各性別、各視角的身體位置（單位是大格）：衣服與裝備照這些位置上色
// foot：腳底中心；top：肩膀；belt：腰帶；shorts：褲子開始；pad：袖子／護肩到哪一列；
// glove：手套開始；robe：法袍下襬；boot：靴子開始；sole：鞋底；eyes、blinkY：眨眼；band：頭帶
const LM = {
  m: {
    front: { foot: [15.5, 56], cx: 15.5, top: 29, belt: 38, shorts: 39, pad: 34, glove: 40, robe: 47, boot: 48, sole: 54,
      light: (x) => x <= 11, dark: (x) => x >= 20, buckle: (x) => x === 15, center: (x) => x === 15,
      eyes: [[8, 20, 12, 23], [18, 20, 22, 23]], blinkY: 23,
      band: { x0: 2, x1: 29, knot: [29, 16, 30, 19], top: (x) => 14 + Math.round(((x - 15.5) / 13) ** 2), gem: (x) => x === 15 || x === 16 } },
    side: { foot: [15, 56], cx: 15, top: 29, belt: 38, shorts: 39, pad: 34, glove: 40, robe: 47, boot: 48, sole: 54,
      light: (x) => x >= 17, dark: (x) => x <= 12, buckle: (x) => x >= 18, center: (x) => x >= 18,
      eyes: [[19, 21, 22, 23]], blinkY: 23,
      band: { x0: 2, x1: 26, knot: [1, 14, 2, 18], top: (x) => 13 + Math.round((x - 3) / 12), gem: (x) => x >= 25 } },
  },
  f: {
    front: { foot: [16.1, 56], cx: 16.5, top: 29, belt: 38, shorts: 39, pad: 33, glove: 41, robe: 47, boot: 48, sole: 54,
      light: (x) => x <= 12, dark: (x) => x >= 21, buckle: (x) => x === 16, center: (x) => x === 16,
      eyes: [[9, 19, 13, 23], [18, 19, 22, 23]], blinkY: 22,
      band: { x0: 3, x1: 29, knot: [29, 16, 30, 19], top: (x) => 14 + Math.round(((x - 16.5) / 13) ** 2), gem: (x) => x === 16 || x === 17 } },
    side: { foot: [15, 56], cx: 15.5, top: 29, belt: 38, shorts: 39, pad: 33, glove: 40, robe: 47, boot: 48, sole: 54,
      light: (x) => x >= 18, dark: (x) => x <= 13, buckle: (x) => x >= 19, center: (x) => x >= 19,
      eyes: [[19, 21, 22, 23]], blinkY: 23,
      band: { x0: 2, x1: 27, knot: [1, 14, 2, 18], top: (x) => 13 + Math.round((x - 4) / 13), gem: (x) => x >= 26 } },
  },
};

// ---------- 零件圖 ----------
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function kind(hex) {   // 這格是輪廓、皮膚，還是其他（頭髮、短褲、背心、眼白）
  const [r, g, b] = rgb(hex);
  if (r + g + b < 130) return 'ink';
  if (r > 190 && g > 140 && b > 110 && r - b > 25) return 'skin';
  return 'other';
}
const darker = (hex, f) => { const [r, g, b] = rgb(hex); return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// 把零件畫成 canvas；paint(x, y, 顏色, 種類) 回傳新的顏色，回傳 null 表示這格不畫；
// x、y 的單位是大格。dim 是整體調暗（後面的手腳）
function partCanvas(P, name, paint, dim = 1) {
  const part = P.parts[name], S = P.scale, U = P.unit;
  const c = makeCanvas(part.rows[0].length * S, part.rows.length * S), ctx = c.getContext('2d');
  part.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const hex = P.pal[ch];
    const col = paint ? paint(Math.floor((part.x + i) / U), Math.floor((part.y + j) / U), hex, kind(hex)) : hex;
    if (!col) return;
    ctx.fillStyle = dim < 1 ? darker(col, dim) : col; ctx.fillRect(i * S, j * S, S, S);
  }));
  return c;
}
const inBox = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

// 頭：換髮色（皮膚、眼白、蝴蝶結不動）、眨眼
function headPainter(L, skin, hair, blink) {
  const pal = hair !== DEFAULT_HAIR && HAIR_COLORS[hair];
  return (x, y, hex, k) => {
    if (blink && L.eyes.some((b) => inBox(x, y, b))) return y === L.blinkY ? INK : y < L.blinkY ? skin : hex;   // 閉眼：只留一條線
    const lum = rgb(hex).reduce((a, b) => a + b, 0);
    if (!pal || lum < 130 || lum >= 440 || L.eyes.some((b) => inBox(x, y, b))) return hex;   // 輪廓、皮膚、白色、眼睛
    return lum < 200 ? pal[0] : lum < 250 ? pal[1] : pal[2];
  };
}

// ---------- 衣服與裝備：照身體零件的形狀上色，所以一定合身 ----------
// 穿上衣時搭配的長褲與便鞋（男生深藍長褲、女生牛仔褲）
const BASICS = {
  m: { pants: '#3d4470', pantsD: '#343a62', shoe: '#3a3540', sole: '#f2eff0' },
  f: { pants: '#4f74ad', pantsD: '#3f5f93', shoe: '#3a3540', sole: '#f2eff0' },
};
function mats(it) {
  const m = gearMats(it), c = (k) => ({ d: m[k].ramp[1], b: m[k].ramp[2], l: m[k].ramp[3] });
  return { metal: c('metal'), leather: c('leather'), cloth: c('cloth'), trim: it.rarity >= 1 ? m.trim.ramp[2] : null, gem: it.rarity >= 2 ? m.gem.ramp[2] : null,
    gold: m.gold.ramp[2], wood: c('wood'), orb: m.orb.ramp[2], orbL: m.orb.ramp[3], belt: m.belt.ramp[2] };
}
const shadeX = (L, x, c) => (L.light(x) ? c.l : L.dark(x) ? c.d : c.b);

// 每個零件一個上色函式。equip = { head, body, feet }（遊戲裡的裝備物件）；沒穿裝備的部位維持參考圖原本的樣子。
// bare 為 true 時不穿任何東西（預覽頁用）。
function painters(L, view, BASIC, skin, equip, bare) {
  if (bare) return { torso: () => null, arm: () => null, leg: () => null, head: null };
  const body = equip.body && { it: equip.body, m: mats(equip.body) }, feet = equip.feet && { it: equip.feet, m: mats(equip.feet) }, head = equip.head && { it: equip.head, m: mats(equip.head) };
  const robe = body && body.it.tag === 'arcane', front = view === 'front';
  const torso = (x, y, hex, k) => {
    if (k === 'ink' || y < L.top) return null;
    if (!body) return null;                                                                                  // 沒穿上衣：就是參考圖的樣子
    if (y >= L.shorts) return robe ? shadeX(L, x, body.m.cloth) : L.dark(x) ? BASIC.pantsD : BASIC.pants;   // 短褲 → 長褲（法袍會蓋住）
    const { it, m } = body, tag = it.tag;
    if (y >= L.belt) return L.buckle(x) ? (m.gem || m.gold) : m.belt;
    if (m.trim && y === L.top) return m.trim;
    if (tag === 'guard') return L.center(x) ? m.metal.l : y === L.top + 4 || y === L.top + 7 ? m.metal.d : shadeX(L, x, m.metal);   // 板甲：中線與甲片接縫
    if (tag === 'arcane') return L.center(x) ? (m.trim || m.cloth.l) : shadeX(L, x, m.cloth);                                       // 法袍：中央滾邊
    if (front && y <= L.top + 2 && Math.abs(x - L.cx) <= (L.top + 3 - y) * 0.6) return skin;                                          // 皮甲：V 領
    if (front && x - (L.cx - 4) === y - L.top - 1) return m.belt;                                                                      // 斜背帶
    return shadeX(L, x, m.leather);
  };
  const arm = (x, y, hex, k) => {
    if (k === 'ink') return null;
    if (!body) return null;
    const { it, m } = body, tag = it.tag;
    if (tag === 'guard') return y <= L.pad ? (y < L.pad ? m.metal.l : m.metal.b) : y >= L.glove ? m.metal.d : y === L.glove - 1 && m.trim ? m.trim : m.metal.b;
    if (tag === 'arcane') return y >= L.glove + 1 ? null : y === L.glove ? (m.trim || m.cloth.d) : y <= L.pad ? m.cloth.l : m.cloth.b;   // 寬袖，露出手
    if (y <= L.pad) return it.rarity >= 2 ? (y < L.pad ? m.metal.l : m.metal.b) : m.leather.l;   // 稀有以上有金屬護肩
    return y >= L.glove ? m.leather.d : y === L.glove - 1 && m.trim ? m.trim : m.cloth.b;
  };
  const leg = (x, y, hex, k) => {
    if (k === 'ink') return null;
    const tag = feet && feet.it.tag;
    if (!feet && !body) return null;                                                 // 沒穿上衣也沒穿鞋：赤腳
    const start = !feet ? L.boot + 3 : tag === 'guard' ? L.boot - 2 : tag === 'arcane' ? L.boot + 2 : L.boot;
    if (y >= start) {
      if (!feet) return y >= L.sole ? BASIC.sole : BASIC.shoe;                       // 有上衣沒鞋子：配一雙便鞋
      const c = tag === 'guard' ? feet.m.metal : tag === 'arcane' ? feet.m.cloth : feet.m.leather;
      if (y === start && feet.m.trim) return feet.m.trim;
      return y >= L.sole ? c.d : shadeX(L, x, c);
    }
    if (robe && y <= L.robe) return y === L.robe ? (body.m.trim || body.m.cloth.d) : shadeX(L, x, body.m.cloth);   // 法袍下襬蓋到膝蓋
    return body ? (L.dark(x) ? BASIC.pantsD : BASIC.pants) : null;                  // 長褲跟著上衣；只穿鞋子時腿還是原樣
  };
  // 頭飾：綁在額頭上的頭帶（劍士布頭巾、守衛金屬護額、術士飾帶），髮絲的黑線蓋在上面
  const band = head && (() => {
    const { it, m } = head, c = it.tag === 'guard' ? m.metal : it.tag === 'arcane' ? m.cloth : m.leather;
    const main = it.tag === 'blade' && m.trim ? { l: m.trim, b: m.trim, d: c.d } : c;
    return (x, y, hex, k) => {
      const B = L.band, knot = B.knot;
      if (it.tag !== 'guard' && inBox(x, y, knot)) return y === knot[1] ? main.l : main.b;   // 打結垂下的布
      if (x < B.x0 || x > B.x1 || k === 'ink') return null;
      const top = B.top(x);
      if (m.gem && B.gem(x) && (y === top || y === top + 1)) return m.gem;   // 中央的寶石
      return y === top ? main.l : y === top + 1 ? (it.tag === 'guard' ? main.b : m.trim || main.d) : null;
    };
  })();
  return { torso, arm, leg, head: band };
}

// ---------- 武器：握柄是支點，朝上 ----------
function weaponCanvas(it) {
  const m = it ? mats(it) : null, tag = it ? it.tag : 'blade';
  const metal = m ? m.metal : { l: '#eef3f8', b: '#b9c7d8', d: '#8fa0b6' }, grip = m ? m.leather : { b: '#84502c', d: '#5e3a1e' };
  const gold = m && it.rarity >= 4 ? m.gold : m && m.trim ? m.trim : m ? metal.b : '#f2c14e';
  const c = makeCanvas(17, 48), x = c.getContext('2d');
  const r = (col, px, py, w, h) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  if (tag === 'guard') {          // 戰錘
    r(INK, 6, 12, 5, 36); r(m.wood.b, 7, 13, 2, 34); r(m.wood.d, 9, 13, 1, 34);
    r(INK, 0, 0, 17, 13); r(metal.b, 1, 1, 15, 11); r(metal.l, 1, 1, 15, 3); r(metal.d, 1, 9, 15, 3); r(gold, 1, 5, 15, 2);
    if (m.gem) r(m.gem, 7, 4, 3, 4);
    return { canvas: c, pivot: [8.5, 42.5] };
  }
  if (tag === 'arcane') {         // 法杖
    r(INK, 6, 9, 5, 39); r(m.wood.b, 7, 10, 2, 37); r(m.wood.d, 9, 10, 1, 37);
    r(INK, 3, 0, 11, 11); r(m.orb, 4, 1, 9, 9); r(m.orbL, 5, 2, 3, 3); r(INK, 3, 10, 11, 3); r(gold, 4, 11, 9, 1);
    return { canvas: c, pivot: [8.5, 40.5] };
  }
  if (it && it.form === 'bow') {   // 弓：握把在中間，弓臂往前彎、弦在後
    const limb = m.trim ? { b: m.trim, l: m.trim } : m.wood;
    for (let y = 1; y <= 47; y++) {
      const bend = Math.round(7 * (1 - ((y - 24) / 23) ** 2));          // 弓臂的弧度
      r(INK, 3 + bend, y, 5, 1); r(limb.b, 4 + bend, y, 3, 1); r(limb.l || limb.b, 4 + bend, y, 1, 1);
      r('#f4f0e6', 3, y, 1, 1);                                        // 弦
    }
    r(INK, 10, 20, 6, 9); r(grip.b, 11, 21, 4, 7); r(gold, 11, 21, 4, 1); r(gold, 11, 27, 4, 1);
    return { canvas: c, pivot: [12.5, 24.5] };
  }
  r(INK, 5, 3, 7, 34); r(INK, 6, 1, 5, 2); r(INK, 7, 0, 3, 1);                          // 劍
  r(metal.l, 6, 3, 2, 33); r(metal.b, 8, 2, 1, 34); r(metal.d, 9, 3, 2, 33);
  r(metal.l, 7, 1, 1, 2); r(metal.d, 9, 2, 1, 1);
  if (it && it.rarity >= 3) r(m.trim, 8, 5, 1, 28);                                      // 史詩以上：劍身的光紋
  r(INK, 2, 36, 13, 5); r(gold, 3, 37, 11, 3);
  r(INK, 6, 41, 5, 7); r(grip.b, 7, 41, 2, 5); r(grip.d, 9, 41, 1, 5); r(gold, 7, 46, 3, 1);
  return { canvas: c, pivot: [8.5, 43.5] };
}

// ---------- 動作：輸入 0–1 的進度，回傳姿勢與特效 ----------
// 姿勢的欄位：x、y（整個人的位移，y 負值是往上）、bodyY（上半身下沉）、torso、head、armL/R、elbowL/R、legL/R、kneeL/R、weapon（角度）。
// 特效（fx）用的座標以腳底為原點：x 往前（右）、y 往上，單位是角色原圖的像素。
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const REST = { x: 0, y: 0, bodyY: 0, torso: 0, head: 0, armL: 0, armR: 0, elbowL: 0, elbowR: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0, weapon: 0, fx: [] };
const GUARD = { ...REST, elbowR: -14, weapon: 14 };          // 拿著武器站好的姿勢
const CH = Object.keys(REST).filter((k) => k !== 'fx');
const REACH = 84;                                            // 預設的目標距離（腳底到魔物中心）
const TY = 30;                                               // 目標的高度（魔物身體中間）

// 關鍵格動畫：frames = [[時間, 姿勢], ...]，沒寫的欄位用 GUARD；相鄰兩格之間平滑過渡
function kf(t, frames) {
  let i = 0;
  while (i < frames.length - 2 && t > frames[i + 1][0]) i++;
  const [t0, a] = frames[i], [t1, b] = frames[i + 1], k = ease(seg(t, t0, t1));
  const out = { fx: [] };
  for (const c of CH) out[c] = lerp(a[c] ?? GUARD[c], b[c] ?? GUARD[c], k);
  out.x = Math.round(out.x); out.y = Math.round(out.y); out.bodyY = Math.round(out.bodyY);
  return out;
}
// 飛行物在 t0–t1 之間從 from 飛到 to（arc 是中途多拱起的高度）；不在這段時間回傳 null
function fly(t, t0, t1, from, to, arc = 0) {
  if (t < t0 || t > t1) return null;
  const k = (t - t0) / (t1 - t0);
  return { x: lerp(from[0], to[0], k), y: lerp(from[1], to[1], k) + Math.sin(k * Math.PI) * arc, k };
}
// 命中的共同特效：魔物位置的爆光；power 2 以上加震動。hits 是這個動作的命中時間表
function hitFx(fx, t, hits, T, colors) {
  hits.forEach((h, i) => {
    if (t >= h.t && t < h.t + 0.05) fx.push({ type: 'hit', power: h.power });
    if (t >= h.t && t < h.t + 0.14) fx.push({ type: 'burst', x: T, y: TY, p: seg(t, h.t, h.t + 0.14), size: 12 + h.power * 9, c: colors[i] || colors[0], rays: 6 + h.power * 2 });
    if (h.power >= 2 && t >= h.t && t < h.t + 0.07) fx.push({ type: 'shake', amount: 2 + h.power });
  });
}
const C = { ice: ['#ffffff', '#8fd3ff'], gold: ['#fff3c4', '#f2b84b'], fire: ['#fff3c4', '#ff8a3c'], arcane: ['#ffffff', '#c58bff'], wind: ['#f4ffd8', '#9be36a'] };

// 三段連招。每種武器一套：前兩段快、第三段是終結技（跳起或蓄力，命中時停頓一下、畫面震動）。
// hits：命中的時間（0–1）、這一段佔整次攻擊傷害的比例 w、力道 power（決定爆光大小與震動）。
const COMBOS = {
  // 劍：下劈 → 反手上挑 → 跳斬
  sword: { name: '劍・三連斬', dur: 1.05, hits: [{ t: 0.16, w: 0.25, power: 1 }, { t: 0.42, w: 0.3, power: 1 }, { t: 0.8, w: 0.45, power: 3 }],
    pose(t, T = REACH) {
      const p = kf(t, [
        [0, {}],
        [0.08, { armR: -150, elbowR: -60, weapon: 150, torso: -7, head: -4, x: -3 }],
        [0.16, { armR: -62, elbowR: -6, weapon: 190, torso: 9, x: 8, legL: -12, legR: 14, kneeL: 14, armL: 22, elbowL: -20 }],
        [0.26, { armR: -20, elbowR: -10, weapon: 215, torso: 12, x: 10, legL: -10, legR: 12, bodyY: 1 }],
        [0.34, { armR: 34, elbowR: -20, weapon: 232, torso: 14, x: 12, bodyY: 3, kneeL: 24, kneeR: 24, legL: -12, legR: -12 }],
        [0.42, { armR: -142, elbowR: -28, weapon: 118, torso: -9, head: -6, x: 18, legL: -14, legR: 16, kneeL: 10 }],
        [0.52, { armR: -160, elbowR: -40, weapon: 150, torso: -10, head: -6, x: 18 }],
        [0.6, { armR: -165, elbowR: -40, weapon: 170, x: 18, bodyY: 4, legL: -26, legR: -26, kneeL: 52, kneeR: 52 }],
        [0.72, { armR: -170, elbowR: -40, weapon: 175, torso: -10, head: -8, x: 24, y: -36, legL: -34, kneeL: 60, legR: 18, kneeR: 30, armL: -40, elbowL: -30 }],
        [0.8, { armR: -48, elbowR: -4, weapon: 200, torso: 14, x: 28, bodyY: 4, legL: -24, legR: -24, kneeL: 48, kneeR: 48, armL: 30 }],
        [0.9, { armR: -48, elbowR: -4, weapon: 200, torso: 14, x: 28, bodyY: 4, legL: -24, legR: -24, kneeL: 48, kneeR: 48, armL: 30 }],
        [1, {}],
      ]);
      const fx = p.fx;
      if (t > 0.09 && t < 0.3) fx.push({ type: 'arc', from: -175, to: lerp(-175, -50, seg(t, 0.09, 0.17)), r: 52, alpha: 1 - seg(t, 0.18, 0.3), width: 8, c: C.ice });
      if (t > 0.35 && t < 0.56) fx.push({ type: 'arc', from: -20, to: lerp(-20, -178, seg(t, 0.35, 0.43)), r: 54, alpha: 1 - seg(t, 0.44, 0.56), width: 9, c: C.ice });
      if (t > 0.73 && t < 0.96) fx.push({ type: 'arc', from: -195, to: lerp(-195, -28, seg(t, 0.73, 0.81)), r: 58, alpha: 1 - seg(t, 0.82, 0.96), width: 13, c: C.gold });
      if (t > 0.8) fx.push({ type: 'shock', x: 34, p: seg(t, 0.8, 1), power: 1 }, { type: 'sparks', x: 34, p: seg(t, 0.8, 0.98) });
      hitFx(fx, t, this.hits, T, [C.ice, C.ice, C.gold]);
      return p;
    } },
  // 鎚：當頭砸 → 橫掃 → 跳起重砸（地面裂開、碎石飛起）
  hammer: { name: '鎚・碎地三擊', dur: 1.25, hits: [{ t: 0.2, w: 0.25, power: 2 }, { t: 0.5, w: 0.3, power: 1 }, { t: 0.84, w: 0.45, power: 4 }],
    pose(t, T = REACH) {
      const p = kf(t, [
        [0, {}],
        [0.12, { armR: -170, elbowR: -30, weapon: 160, torso: -10, head: -6, x: -2 }],
        [0.2, { armR: -40, elbowR: -4, weapon: 205, torso: 16, x: 10, bodyY: 3, legL: -18, legR: 12, kneeL: 30, kneeR: 16 }],
        [0.3, { armR: -24, elbowR: -6, weapon: 214, torso: 14, x: 10, bodyY: 2, legL: -12, legR: 10 }],
        [0.4, { armR: 62, elbowR: -22, weapon: 250, torso: -12, head: -4, x: 8, legL: 8, legR: -8 }],
        [0.5, { armR: -96, elbowR: -8, weapon: 176, torso: 13, x: 18, legL: -16, legR: 16, kneeL: 16, armL: 26 }],
        [0.6, { armR: -150, elbowR: -30, weapon: 140, torso: 2, x: 18 }],
        [0.68, { armR: -170, elbowR: -30, weapon: 165, x: 18, bodyY: 5, legL: -28, legR: -28, kneeL: 56, kneeR: 56 }],
        [0.78, { armR: -176, elbowR: -24, weapon: 176, torso: -12, head: -8, x: 24, y: -44, legL: -40, kneeL: 70, legR: -10, kneeR: 60, armL: -50, elbowL: -30 }],
        [0.84, { armR: -35, elbowR: 0, weapon: 210, torso: 18, x: 28, bodyY: 5, legL: -26, legR: -26, kneeL: 52, kneeR: 52, armL: 30 }],
        [0.95, { armR: -35, elbowR: 0, weapon: 210, torso: 18, x: 28, bodyY: 5, legL: -26, legR: -26, kneeL: 52, kneeR: 52, armL: 30 }],
        [1, {}],
      ]);
      const fx = p.fx;
      if (t > 0.13 && t < 0.34) fx.push({ type: 'arc', from: -185, to: lerp(-185, -40, seg(t, 0.13, 0.21)), r: 54, alpha: 1 - seg(t, 0.22, 0.34), width: 11, c: C.fire });
      if (t > 0.2 && t < 0.4) fx.push({ type: 'shock', x: 30, p: seg(t, 0.2, 0.4), power: 0.6 });
      if (t > 0.42 && t < 0.64) fx.push({ type: 'arc', from: 70, to: lerp(70, -110, seg(t, 0.42, 0.51)), r: 56, alpha: 1 - seg(t, 0.52, 0.64), width: 12, c: C.fire });
      if (t > 0.79 && t < 0.98) fx.push({ type: 'arc', from: -200, to: lerp(-200, -24, seg(t, 0.79, 0.85)), r: 60, alpha: 1 - seg(t, 0.86, 0.98), width: 15, c: C.gold });
      if (t > 0.84) fx.push({ type: 'shock', x: 38, p: seg(t, 0.84, 1), power: 1.6 }, { type: 'sparks', x: 38, p: seg(t, 0.84, 1) },
        { type: 'debris', x: 38, p: seg(t, 0.84, 1) }, { type: 'crack', x: 38, p: seg(t, 0.84, 0.9), alpha: 1 - seg(t, 0.94, 1) });
      hitFx(fx, t, this.hits, T, [C.fire, C.fire, C.gold]);
      return p;
    } },
  // 法杖：魔法球 → 兩顆弧線魔法球 → 蓄力（腳下魔法陣、光點聚集）後射出光束
  staff: { name: '法杖・奧術連彈', dur: 1.3, hits: [{ t: 0.22, w: 0.25, power: 1 }, { t: 0.5, w: 0.3, power: 1 }, { t: 0.9, w: 0.45, power: 3 }],
    pose(t, T = REACH) {
      const p = kf(t, [
        [0, {}],
        [0.08, { armR: 12, elbowR: -44, weapon: 4, torso: -5, x: -2 }],
        [0.14, { armR: -72, elbowR: -8, weapon: 58, torso: 7, x: 3, legL: -8, legR: 8 }],
        [0.26, { armR: -40, elbowR: -16, weapon: 30, torso: 2 }],
        [0.34, { armR: -152, elbowR: -40, weapon: 120, torso: -7, head: -4 }],
        [0.42, { armR: -80, elbowR: -6, weapon: 66, torso: 9, x: 4, legL: -10, legR: 10 }],
        [0.52, { armR: -50, elbowR: -20, weapon: 36, torso: 2 }],
        [0.6, { armR: -28, elbowR: -34, weapon: 6, armL: -64, elbowL: -44, torso: -3, bodyY: 1 }],
        [0.76, { armR: -34, elbowR: -40, weapon: 2, armL: -80, elbowL: -50, torso: -6, head: -5, y: -7, legL: 6, legR: -6, kneeL: 14, kneeR: 10 }],
        [0.82, { armR: -88, elbowR: 0, weapon: 76, armL: 24, torso: 11, x: 5, y: -4, legL: -12, legR: 12 }],
        [0.94, { armR: -88, elbowR: 0, weapon: 76, armL: 24, torso: 11, x: 3, y: 0, legL: -12, legR: 12 }],
        [1, {}],
      ]);
      const fx = p.fx, tip = [44, 64];
      const o1 = fly(t, 0.14, 0.22, tip, [T, TY]);
      if (o1) fx.push({ type: 'orb', x: o1.x, y: o1.y, r: 5, c: C.arcane, dir: [1, -0.35] });
      const o2 = fly(t, 0.42, 0.5, tip, [T, TY], 22), o3 = fly(t, 0.45, 0.53, tip, [T, TY], -14);
      if (o2) fx.push({ type: 'orb', x: o2.x, y: o2.y, r: 5, c: C.arcane, dir: [1, 0.2 - o2.k] });
      if (o3) fx.push({ type: 'orb', x: o3.x, y: o3.y, r: 5, c: C.ice, dir: [1, o3.k - 0.6] });
      if (t >= 0.53 && t < 0.63) fx.push({ type: 'burst', x: T, y: TY, p: seg(t, 0.53, 0.63), size: 16, c: C.ice, rays: 6 });
      if (t > 0.56 && t < 0.96) fx.push({ type: 'ring', x: 0, rx: lerp(8, 34, seg(t, 0.56, 0.7)), rot: t * 500, c: C.arcane, alpha: Math.min(seg(t, 0.56, 0.62), 1 - seg(t, 0.88, 0.96)) });
      if (t > 0.6 && t < 0.82) fx.push({ type: 'gather', x: 30, y: 96 + 7 * seg(t, 0.6, 0.76), p: seg(t, 0.6, 0.82), c: C.arcane, n: 10 });
      if (t > 0.74 && t < 0.83) fx.push({ type: 'orb', x: 30, y: 103, r: lerp(3, 8, seg(t, 0.74, 0.83)), c: C.arcane, dir: [0, 0] });
      if (t > 0.82 && t < 1) fx.push({ type: 'beam', x0: 46, x1: lerp(46, T + 60, seg(t, 0.82, 0.9)), y: 62, h: lerp(13, 2, seg(t, 0.9, 1)), c: C.arcane, alpha: 1 - seg(t, 0.93, 1) });
      if (t >= 0.9) fx.push({ type: 'burst', x: T, y: TY, p: seg(t, 0.9, 1), size: 44, c: C.ice, rays: 14, ring: true });
      hitFx(fx, t, this.hits, T, [C.arcane, C.arcane, C.arcane]);
      return p;
    } },
  // 弓：一箭 → 連射兩箭 → 後跳蓄力、射出貫穿箭
  bow: { name: '弓・貫穿三連射', dur: 1.15, hits: [{ t: 0.18, w: 0.25, power: 1 }, { t: 0.44, w: 0.3, power: 1 }, { t: 0.86, w: 0.45, power: 3 }],
    pose(t, T = REACH) {
      const aim = { armR: -76, elbowR: 0, weapon: 28, armL: -52, elbowL: -92 }, loose = { armR: -76, elbowR: 0, weapon: 28, armL: -30, elbowL: -40 };
      const p = kf(t, [
        [0, {}],
        [0.1, { ...aim, torso: -4 }],
        [0.14, { ...loose, torso: 3, x: -2 }],
        [0.3, { ...aim, armR: -84, torso: -6, x: -2 }],
        [0.37, { ...loose, armR: -84, torso: 2, x: -4 }],
        [0.4, { ...aim, armR: -70, torso: -3, x: -4 }],
        [0.43, { ...loose, armR: -70, torso: 3, x: -6 }],
        [0.54, { ...aim, x: -16, y: -18, torso: -14, legL: -30, kneeL: 60, legR: 10, kneeR: 40 }],
        [0.62, { ...aim, x: -24, bodyY: 4, torso: -6, legL: -30, legR: 14, kneeL: 44, kneeR: 30 }],
        [0.79, { ...aim, armL: -60, elbowL: -100, x: -24, bodyY: 4, torso: -8, legL: -30, legR: 14, kneeL: 44, kneeR: 30 }],
        [0.82, { ...loose, x: -30, bodyY: 3, torso: 6, legL: -26, legR: 12, kneeL: 38, kneeR: 26 }],
        [0.93, { ...loose, x: -30, bodyY: 3, torso: 6, legL: -26, legR: 12, kneeL: 38, kneeR: 26 }],
        [1, {}],
      ]);
      const fx = p.fx, nock = [38, 66];
      const a1 = fly(t, 0.14, 0.18, nock, [T, TY + 2]);
      if (a1) fx.push({ type: 'arrow', x: a1.x, y: a1.y, ang: 24, len: 22, c: C.wind });
      const a2 = fly(t, 0.37, 0.44, [nock[0] - 4, nock[1] + 4], [T, TY + 8]), a3 = fly(t, 0.43, 0.5, [nock[0] - 6, nock[1]], [T, TY - 6]);
      if (a2) fx.push({ type: 'arrow', x: a2.x, y: a2.y, ang: 22, len: 22, c: C.wind });
      if (a3) fx.push({ type: 'arrow', x: a3.x, y: a3.y, ang: 27, len: 22, c: C.wind });
      if (t >= 0.5 && t < 0.6) fx.push({ type: 'burst', x: T, y: TY - 6, p: seg(t, 0.5, 0.6), size: 14, c: C.wind, rays: 6 });
      if (t > 0.62 && t < 0.8) fx.push({ type: 'gather', x: 20, y: 62, p: seg(t, 0.62, 0.8), c: C.gold, n: 8 });
      if (t > 0.7 && t < 0.8) fx.push({ type: 'orb', x: 22, y: 62, r: lerp(2, 5, seg(t, 0.7, 0.8)), c: C.gold, dir: [0, 0] });
      const a4 = fly(t, 0.8, 0.86, [14, 62], [T + 10, TY + 4]);
      if (a4) fx.push({ type: 'arrow', x: a4.x, y: a4.y, ang: 18, len: 40, c: C.gold, big: true });
      if (t > 0.82 && t < 1) fx.push({ type: 'beam', x0: 14, x1: lerp(14, T + 66, seg(t, 0.82, 0.88)), y: 62, h: lerp(5, 1, seg(t, 0.86, 1)), c: C.gold, alpha: 0.8 * (1 - seg(t, 0.88, 1)), slope: (TY + 4 - 62) / (T - 4) });
      hitFx(fx, t, this.hits, T, [C.wind, C.wind, C.gold]);
      return p;
    } },
};
// 追擊、連鎖、反擊用的單發快攻：只播連招的第一段，然後收招
function quick(combo, cut) {
  const h = combo.hits[0];
  return { name: combo.name + '（單發）', dur: combo.dur * cut * 1.25, hits: [{ t: (h.t / cut) * 0.8, w: 1, power: h.power }],
    pose(t, T = REACH) {
      if (t < 0.8) return combo.pose((t / 0.8) * cut, T);
      const a = combo.pose(cut, T), k = ease(seg(t, 0.8, 1)), out = { fx: [] };
      for (const c of CH) out[c] = Math.round(lerp(a[c], GUARD[c], k));
      return out;
    } };
}

export const ANIMS = {
  idle: { name: '待機', dur: 1.8, loop: true, pose(t) {
    const b = Math.sin(t * Math.PI * 2);
    return { ...REST, bodyY: b > 0.25 ? 1 : 0, armL: b * 1.5, armR: -b * 1.5, elbowR: -14 - b * 3, elbowL: -6 * Math.abs(b), head: b * 0.8, weapon: 14 };
  } },
  walk: { name: '走路', dur: 0.7, loop: true, pose(t) {
    const s = Math.sin(t * Math.PI * 2), c = Math.cos(t * Math.PI * 2);
    return { ...REST, bodyY: Math.abs(s) > 0.7 ? 1 : 0, legL: s * 26, legR: -s * 26, kneeL: Math.max(0, c) * 34, kneeR: Math.max(0, -c) * 34,
      armL: -s * 22, armR: s * 16 - 6, elbowL: -14, elbowR: -22, torso: 3, weapon: 20 };
  } },
  combo_sword: COMBOS.sword, combo_hammer: COMBOS.hammer, combo_staff: COMBOS.staff, combo_bow: COMBOS.bow,
  quick_sword: quick(COMBOS.sword, 0.27), quick_hammer: quick(COMBOS.hammer, 0.31), quick_staff: quick(COMBOS.staff, 0.27), quick_bow: quick(COMBOS.bow, 0.24),
  // 受擊：往後仰一下
  hurt: { name: '受擊', dur: 0.32, pose(t) {
    const k = Math.sin(seg(t, 0, 1) * Math.PI);
    return { ...REST, x: -5 * k, torso: -12 * k, head: -8 * k, armL: -20 * k, armR: -24 * k, elbowR: -14, legL: -8 * k, kneeR: 12 * k, weapon: 14 + 20 * k, fx: [] };
  } },
};
// 武器決定攻擊方式：劍士的武器是劍或弓（form），守衛是鎚，術士是法杖；空手用劍的動作
export function attackStyle(weapon) {
  if (!weapon) return 'sword';
  if (weapon.form === 'bow') return 'bow';
  return { guard: 'hammer', arcane: 'staff' }[weapon.tag] || 'sword';
}

// ---------- 骨架 ----------
const FAR = 0.74;   // 側面時，後面的手腳調暗
const LIMBS = ['armL', 'armLf', 'armR', 'armRf', 'legL', 'legLf', 'legR', 'legRf'];
export class Rig {
  constructor(view = 'side', gender = 'm') {
    this.view = view;
    this.look = { gender, color: DEFAULT_HAIR };
    this.equip = {};
    this.weapon = true;
    this.bare = false;
    this.rebuild();
  }
  setView(view) { if (view !== this.view) { this.view = view; this.rebuild(); } }
  // look：{ gender: 'm' | 'f', color: 髮色名稱 }；缺少或不認得的值用預設（男生、原本的髮色）
  setLook(look) {
    const color = HAIR_COLORS[look && look.color] ? look.color : DEFAULT_HAIR, gender = look && RIG_PARTS[look.gender] ? look.gender : 'm';
    if (color !== this.look.color || gender !== this.look.gender) { this.look = { gender, color }; this.rebuild(); }
  }
  get height() { return this.P.H * this.S; }
  // equip：{ weapon, head, body, feet }，內容是遊戲裡的裝備物件（需要 tag、tier、rarity）
  setEquip(equip, bare = false) {
    const e = equip || {};
    const sig = ['weapon', 'head', 'body', 'feet'].map((k) => (e[k] ? `${e[k].tag}-${e[k].tier}-${e[k].rarity}-${e[k].form || ''}` : '')).join('|') + bare;
    if (sig === this.sig) return;
    this.sig = sig; this.equip = { ...e }; this.bare = bare;
    this.rebuild();
  }
  rebuild() {
    const g = this.look.gender, P = this.P = RIG_PARTS[g][this.view], L = LM[g][this.view], side = this.view === 'side';
    const S = this.S = P.scale;
    this.foot = [L.foot[0] * P.unit, L.foot[1] * P.unit];
    // 零件的位置與支點換算成畫面上的像素
    this.G = Object.fromEntries(Object.entries(P.parts).map(([n, p]) => [n, { x: p.x * S, y: p.y * S, pivot: [p.pivot[0] * S, p.pivot[1] * S] }]));
    this.hand = P.hands.armR.map((v) => v * S);
    const src = (n) => (P.parts[n] ? n : n.replace('L', 'R'));       // 側面的後手、後腿沿用前手、前腿的圖
    const far = (n) => (side && n.includes('L') ? FAR : 1);
    const paint = painters(L, this.view, BASICS[g], P.skin, this.equip, this.bare);
    this.body = { torso: partCanvas(P, 'torso'), head: partCanvas(P, 'head', headPainter(L, P.skin, this.look.color, false)), headBlink: partCanvas(P, 'head', headPainter(L, P.skin, this.look.color, true)) };
    this.gear = { torso: partCanvas(P, 'torso', paint.torso), head: paint.head ? partCanvas(P, 'head', paint.head) : null };
    for (const n of LIMBS) {
      this.body[n] = partCanvas(P, src(n), null, far(n));
      this.gear[n] = partCanvas(P, src(n), n.startsWith('arm') ? paint.arm : paint.leg, far(n));
    }
    this.held = weaponCanvas(this.equip.weapon);
    const best = Math.max(-1, ...['weapon', 'head', 'body', 'feet'].map((k) => (this.equip[k] ? this.equip[k].rarity : -1)));
    this.glow = best >= 3 ? gearMats({ tier: 1, rarity: best, tag: null }).trim.ramp[3] : null;   // 史詩以上會冒光點
  }
  geo(name) { return this.G[name] || this.G[name.replace('L', 'R')]; }

  image(ctx, name, part, blink) {
    const [px, py] = part.pivot;
    ctx.drawImage(name === 'head' && blink ? this.body.headBlink : this.body[name], -Math.round(px), -Math.round(py));
    if (this.gear[name]) ctx.drawImage(this.gear[name], -Math.round(px), -Math.round(py));
  }
  // 單一零件（頭、身體）：繞自己的支點轉
  part(ctx, name, deg, blink) {
    const part = this.geo(name);
    ctx.save();
    ctx.translate(Math.round(part.x + part.pivot[0]), Math.round(part.y + part.pivot[1]));
    ctx.rotate(Math.round(deg) * RAD);
    this.image(ctx, name, part, blink);
    ctx.restore();
  }
  // 手或腿：上段繞肩膀（髖部）轉，下段再繞手肘（膝蓋）轉；held() 畫握在手上的武器
  limb(ctx, name, deg, bend, held, dx = 0) {
    const up = this.geo(name), low = this.geo(name + 'f');
    const ux = Math.round(up.x + up.pivot[0]), uy = Math.round(up.y + up.pivot[1]);
    const lx = Math.round(low.x + low.pivot[0]), ly = Math.round(low.y + low.pivot[1]);
    ctx.save();
    ctx.translate(ux + dx, uy);
    ctx.rotate(Math.round(deg) * RAD);
    this.image(ctx, name, up);
    ctx.translate(lx - ux, ly - uy);
    ctx.rotate(Math.round(bend) * RAD);
    if (held) held(lx, ly);
    this.image(ctx, name + 'f', low);
    ctx.restore();
  }

  // 在 (ox, oy)（腳底中心）畫出角色。pose 來自 ANIMS；blink 為 true 時閉眼
  draw(ctx, ox, oy, pose, blink = false) {
    const side = this.view === 'side';
    // 側面時持武器的手自然往前伸、武器朝前上方；正面是預覽用，手肘膝蓋不彎
    const armed = this.weapon && this.equip.weapon;
    if (side) pose = armed ? { ...pose, armR: pose.armR - 14, weapon: pose.weapon + 62 } : { ...pose, elbowR: Math.min(0, pose.elbowR + 14) };   // 空手時手自然下垂，和參考圖一樣
    else pose = { ...pose, elbowL: 0, elbowR: 0, kneeL: 0, kneeR: 0 };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(ox - this.foot[0] + pose.x), Math.round(oy - this.foot[1] + pose.y));
    this.limb(ctx, 'legL', pose.legL, pose.kneeL);   // 側面：後面的腿站著時剛好被前面的腿擋住
    this.limb(ctx, 'legR', pose.legR, pose.kneeR);
    // 上半身：整體上下起伏，並繞腰部前後傾
    const t = this.G.torso, tx = Math.round(t.x + t.pivot[0]), ty = Math.round(t.y + t.pivot[1]);
    ctx.translate(tx, ty + pose.bodyY);
    ctx.rotate(Math.round(pose.torso) * RAD);
    ctx.translate(-tx, -ty);
    const hand = this.hand;
    const held = armed ? (lx, ly) => {   // 有裝備武器才畫      // 武器畫在前臂下面，拳頭蓋住握柄
      ctx.save();
      ctx.translate(Math.round(hand[0] - lx), Math.round(hand[1] - ly));
      ctx.rotate(Math.round(pose.weapon) * RAD);
      ctx.drawImage(this.held.canvas, -Math.round(this.held.pivot[0]), -Math.round(this.held.pivot[1]));
      ctx.restore();
    } : null;
    if (side) this.limb(ctx, 'armL', pose.armL, pose.elbowL);   // 後面的手：垂著時被身體擋住，擺動時才露出來
    this.part(ctx, 'torso', 0);
    if (!side) this.limb(ctx, 'armL', pose.armL, pose.elbowL);
    this.part(ctx, 'head', pose.head, blink);
    this.limb(ctx, 'armR', pose.armR, pose.elbowR, held);
    ctx.restore();
  }

  // 特效：刀光、衝擊波、火花、裝備光點（都用一格一格的像素畫）。time 是秒，用來讓光點飄動
  drawFx(ctx, ox, oy, pose, time = 0) {
    const sh = this.G.armR;
    const cx = ox - this.foot[0] + pose.x + sh.x + sh.pivot[0], cy = oy - this.foot[1] + pose.y + pose.bodyY + sh.y + sh.pivot[1];
    const dot = (x, y, col, w = 1, h = w) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    if (this.glow) {
      for (let i = 0; i < 5; i++) {
        const ph = (time * 0.7 + i / 5) % 1;
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        dot(ox + pose.x - 16 + ((i * 13) % 32), oy + pose.y - 20 - ph * 60, this.glow, 1, i % 2 ? 1 : 2);
      }
      ctx.globalAlpha = 1;
    }
    for (const f of pose.fx) {
      const [core, edge] = f.c || ['#ffffff', '#8fd3ff'];
      if (f.type === 'arc') {
        // 刀光：沿著揮砍的弧線（可以順時針也可以逆時針），越靠近武器這一端越亮、越寬；尾端變細變淡
        const span = f.to - f.from, n = Math.max(1, Math.round(Math.abs(span) / 1.2));
        for (let s = 0; s <= n; s++) {
          const k = s / n, a = f.from + span * k, w = Math.max(1, Math.round(f.width * k));
          for (let i = 0; i < w; i++) {
            const r = f.r - i;
            ctx.globalAlpha = f.alpha * (0.25 + 0.75 * k);
            dot(cx - Math.sin(a * RAD) * r, cy + Math.cos(a * RAD) * r, i === 0 || i === w - 1 ? edge : core);
          }
        }
      } else if (f.type === 'shock') {           // 貼著地面往兩邊散開的衝擊波
        const pw = f.power || 1, w = (16 + f.p * 70) * pw, x0 = ox + (f.x ?? 30);
        ctx.globalAlpha = 1 - f.p;
        for (let x = -w; x <= w; x++) {
          const h = Math.round((1 - (x / w) ** 2) * (5 - f.p * 3) * pw);
          if (Math.abs(x) > w - 10 * pw) dot(x0 + x, oy - h, '#fff3c4', 1, Math.max(1, h));
        }
      } else if (f.type === 'sparks') {
        for (let i = 0; i < 14; i++) {
          const ang = (-150 + i * 9.5) * RAD, sp = 26 + ((i * 37) % 22), big = i % 4 === 0 ? 2 : 1;
          ctx.globalAlpha = 1 - f.p;
          dot(ox + (f.x ?? 30) + Math.cos(ang) * sp * f.p, oy - 4 + Math.sin(ang) * sp * f.p + 30 * f.p * f.p, i % 3 ? '#f2b84b' : '#ffffff', big);
        }
      } else if (f.type === 'debris') {          // 碎石：往上噴再落下
        for (let i = 0; i < 9; i++) {
          const vx = -34 + i * 9 + ((i * 7) % 5), vy = 60 + ((i * 29) % 40);
          ctx.globalAlpha = 1 - f.p * f.p;
          dot(ox + f.x + vx * f.p, oy - (vy * f.p - 110 * f.p * f.p), i % 2 ? '#6b5240' : '#8f7458', 2 + (i % 2));
        }
      } else if (f.type === 'crack') {           // 地面的裂痕
        ctx.globalAlpha = f.alpha;
        for (let i = 0; i < 5; i++) {
          const dir = (i - 2) * 0.55, len = (14 + ((i * 11) % 12)) * f.p;
          for (let s = 0; s < len; s++) dot(ox + f.x + Math.sin(dir) * s * 1.6 + (s % 3 === 0 ? 1 : 0), oy + 1 + Math.cos(dir) * s * 0.25, s < 3 ? '#fff3c4' : '#0a0d13', 1, 2);
        }
      } else if (f.type === 'orb') {             // 魔法球：亮核心、外圈，後面拖著光點
        const X = ox + f.x, Y = oy - f.y, r = Math.round(f.r);
        for (let i = 1; i <= 6; i++) {
          ctx.globalAlpha = 0.6 - i * 0.09;
          dot(X - f.dir[0] * i * 4 - r / 2, Y + f.dir[1] * i * 4 - r / 2 + ((i * 5 + Math.round(time * 30)) % 3) - 1, edge, Math.max(1, r - i));
        }
        ctx.globalAlpha = 1;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= r + 0.3) dot(X + dx, Y + dy, d < r * 0.55 ? core : edge);
        }
        dot(X - r - 2, Y, core, 2, 1); dot(X + r + 1, Y, core, 2, 1); dot(X, Y - r - 2, core, 1, 2); dot(X, Y + r + 1, core, 1, 2);
      } else if (f.type === 'arrow') {           // 箭：箭身、箭頭，後面拖一道風
        const X = ox + f.x, Y = oy - f.y, a = f.ang * RAD, ux = Math.cos(a), uy = Math.sin(a), th = f.big ? 2 : 1;
        for (let s = 0; s < f.len * 2.2; s++) { ctx.globalAlpha = 0.35 * (1 - s / (f.len * 2.2)); dot(X - ux * (f.len + s), Y - uy * (f.len + s), edge, th); }
        ctx.globalAlpha = 1;
        for (let s = 0; s < f.len; s++) dot(X - ux * s, Y - uy * s, s < 4 ? core : s > f.len - 5 ? edge : '#c9a66b', th);
        dot(X + ux * 2, Y + uy * 2, core, th + 1);
      } else if (f.type === 'ring') {            // 腳下的魔法陣：兩圈橢圓加上繞著轉的符點
        ctx.globalAlpha = f.alpha;
        for (let a = 0; a < 360; a += 3) {
          const x = Math.cos(a * RAD), y = Math.sin(a * RAD) * 0.28;
          dot(ox + f.x + x * f.rx, oy + 1 + y * f.rx, edge);
          if (a % 6 === 0) dot(ox + f.x + x * f.rx * 0.62, oy + 1 + y * f.rx * 0.62, core);
        }
        for (let i = 0; i < 6; i++) {
          const a = (f.rot + i * 60) * RAD;
          dot(ox + f.x + Math.cos(a) * f.rx * 0.82 - 1, oy + Math.sin(a) * f.rx * 0.82 * 0.28, core, 2);
          dot(ox + f.x + Math.cos(a) * f.rx * 0.82, oy - 6 - ((time * 40 + i * 9) % 26), edge, 1, 2);      // 往上飄的光
        }
      } else if (f.type === 'gather') {          // 光點往一點聚集
        for (let i = 0; i < f.n; i++) {
          const a = (i * 137 + time * 200) * RAD, r = (30 + (i * 13) % 16) * (1 - f.p);
          ctx.globalAlpha = 0.4 + 0.6 * f.p;
          dot(ox + f.x + Math.cos(a) * r, oy - f.y + Math.sin(a) * r, i % 2 ? core : edge, i % 3 ? 1 : 2);
        }
      } else if (f.type === 'beam') {            // 光束：亮的核心加外圈，邊緣有鋸齒
        ctx.globalAlpha = f.alpha;
        const h = Math.max(1, Math.round(f.h));
        for (let x = f.x0; x <= f.x1; x += 2) {
          const y = oy - (f.y + (f.slope || 0) * (x - f.x0)), j = ((x * 7 + Math.round(time * 60)) % 3) - 1;
          dot(ox + x, y - h / 2 + j, edge, 2, h);
          if (h > 2) dot(ox + x, y - h / 4, core, 2, Math.max(1, Math.round(h / 2)));
        }
      } else if (f.type === 'burst') {           // 命中的爆光：中心閃一下，光芒往外射
        const X = ox + f.x, Y = oy - f.y;
        ctx.globalAlpha = 1 - f.p;
        if (f.p < 0.4) { const r = Math.round(f.size * 0.3 * (1 - f.p / 0.4)); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.hypot(dx, dy) <= r) dot(X + dx, Y + dy, core); }
        for (let i = 0; i < f.rays; i++) {
          const a = (i * 360 / f.rays + 17) * RAD, r0 = f.size * (0.25 + 0.6 * f.p), r1 = f.size * (0.5 + 0.7 * f.p);
          for (let r = r0; r <= r1; r += 1) dot(X + Math.cos(a) * r, Y + Math.sin(a) * r, r > (r0 + r1) / 2 ? edge : core, i % 2 ? 1 : 2);
        }
        if (f.ring) for (let a = 0; a < 360; a += 4) dot(X + Math.cos(a * RAD) * f.size * f.p, Y + Math.sin(a * RAD) * f.size * f.p, core, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
}
