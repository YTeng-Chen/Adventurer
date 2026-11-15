// 2D 骨架動畫：角色拆成零件（頭、身體、上臂、前臂、大腿、小腿），掛在關節上；動作是讓關節轉動、移動。
// 一件裝備只要照零件的形狀上色，所有動作都能用；一個動作做一次，所有裝備都適用。
// 全部畫在低解析度的 canvas 上（不做平滑），旋轉後仍然是一格一格的像素。
// 座標：零件、身體位置（LM）都用參考圖原本的像素格（男生 30×59、女生 32×66）；畫的時候每格是 2×2 像素（P.scale）。
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

// 各性別、各視角的身體位置（參考圖的像素列）：衣服與裝備照這些位置上色
// foot：腳底中心；top：肩膀；crop：短版上衣的下緣（露出腰）；belt：腰帶；shorts：褲子開始；pad：袖子／護肩到哪一列；
// glove：手套開始；robe：法袍下襬；boot：靴子開始；sole：鞋底；eyes、blinkY：眨眼；band：頭帶
const LM = {
  m: {
    front: { foot: [15.5, 59], cx: 15, top: 28, belt: 38, shorts: 39, pad: 32, glove: 40, robe: 50, boot: 52, sole: 57,
      light: (x) => x <= 11, dark: (x) => x >= 19, buckle: (x) => x === 15, center: (x) => x === 15,
      eyes: [[7, 19, 11, 23], [17, 19, 21, 23]], blinkY: 22,
      band: { x0: 2, x1: 27, knot: [26, 15, 27, 18], top: (x) => 13 + Math.round(((x - 15) / 12) ** 2), gem: (x) => x === 15 } },
    side: { foot: [16, 59], cx: 15.5, top: 28, belt: 38, shorts: 39, pad: 32, glove: 40, robe: 50, boot: 52, sole: 57,
      light: (x) => x >= 18, dark: (x) => x <= 13, buckle: (x) => x >= 19, center: (x) => x >= 19,
      eyes: [[20, 20, 23, 22]], blinkY: 22,
      band: { x0: 3, x1: 27, knot: [2, 14, 3, 18], top: (x) => 13 + Math.round((x - 4) / 14), gem: (x) => x >= 26 } },
  },
  f: {
    front: { foot: [16, 66], cx: 15.5, top: 32, crop: 39, belt: 42, shorts: 43, pad: 36, glove: 44, robe: 56, boot: 58, sole: 64,
      light: (x) => x <= 12, dark: (x) => x >= 19, buckle: (x) => x === 15 || x === 16, center: (x) => x === 15 || x === 16,
      eyes: [[9, 24, 12, 27], [18, 24, 21, 27]], blinkY: 26,
      band: { x0: 3, x1: 22, knot: [27, 21, 28, 25], top: (x) => 16 + Math.round(((x - 13) / 10) ** 2), gem: (x) => x === 15 || x === 16 } },
    side: { foot: [16, 65], cx: 16.5, top: 32, crop: 39, belt: 41, shorts: 42, pad: 36, glove: 43, robe: 55, boot: 57, sole: 63,
      light: (x) => x >= 19, dark: (x) => x <= 13, buckle: (x) => x >= 20, center: (x) => x >= 20,
      eyes: [[19, 23, 21, 25]], blinkY: 25,
      band: { x0: 13, x1: 27, knot: [11, 20, 12, 24], top: (x) => 15 + Math.round((x - 13) / 10), gem: (x) => x >= 26 } },
  },
};

// ---------- 零件圖 ----------
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function kind(hex) {   // 這格是輪廓、皮膚，還是其他（頭髮、短褲、背心、眼白）
  const [r, g, b] = rgb(hex);
  if (r + g + b < 60) return 'ink';
  if (r > 190 && g > 140 && b > 110 && r - b > 25) return 'skin';
  return 'other';
}
const darker = (hex, f) => { const [r, g, b] = rgb(hex); return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// 把零件畫成 canvas（每格 scale×scale 像素）；paint(x, y, 顏色, 種類) 回傳新的顏色，回傳 null 表示這格不畫；
// x、y 是參考圖的像素格。dim 是整體調暗（後面的手腳）
function partCanvas(P, name, paint, dim = 1) {
  const part = P.parts[name], S = P.scale;
  const c = makeCanvas(part.rows[0].length * S, part.rows.length * S), ctx = c.getContext('2d');
  part.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const hex = P.pal[ch];
    const col = paint ? paint(part.x + i, part.y + j, hex, kind(hex)) : hex;
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
    if (!pal || lum < 60 || lum >= 450 || L.eyes.some((b) => inBox(x, y, b))) return hex;   // 輪廓、皮膚、白色、眼睛
    return lum < 140 ? pal[0] : lum < 300 ? pal[1] : pal[2];
  };
}

// ---------- 衣服與裝備：照身體零件的形狀上色，所以一定合身 ----------
const BASICS = {
  m: { tee: '#e9e6e5', teeD: '#c4bdc0', pants: '#3d4470', pantsD: '#343a62', shoe: '#3a3540', sole: '#f2eff0' },
  f: { tee: '#f4f1f0', teeD: '#cfc8cb', pants: '#4f74ad', pantsD: '#3f5f93', shoe: '#3a3540', sole: '#f2eff0' },   // 短版白 T＋牛仔褲
};
function mats(it) {
  const m = gearMats(it), c = (k) => ({ d: m[k].ramp[1], b: m[k].ramp[2], l: m[k].ramp[3] });
  return { metal: c('metal'), leather: c('leather'), cloth: c('cloth'), trim: it.rarity >= 1 ? m.trim.ramp[2] : null, gem: it.rarity >= 2 ? m.gem.ramp[2] : null,
    gold: m.gold.ramp[2], wood: c('wood'), orb: m.orb.ramp[2], orbL: m.orb.ramp[3], belt: m.belt.ramp[2] };
}
const shadeX = (L, x, c) => (L.light(x) ? c.l : L.dark(x) ? c.d : c.b);

// 每個零件一個上色函式。equip = { head, body, feet }（遊戲裡的裝備物件）；沒穿的部位用基本服裝（男生白 T、長褲；女生短版白 T、牛仔褲）。
// bare 為 true 時不穿任何東西（只在預覽頁看基本身體用）。
function painters(L, view, BASIC, skin, equip, bare) {
  if (bare) return { torso: () => null, arm: () => null, leg: () => null, head: null };
  const body = equip.body && { it: equip.body, m: mats(equip.body) }, feet = equip.feet && { it: equip.feet, m: mats(equip.feet) }, head = equip.head && { it: equip.head, m: mats(equip.head) };
  const robe = body && body.it.tag === 'arcane', front = view === 'front';
  const torso = (x, y, hex, k) => {
    if (k === 'ink' || y < L.top) return null;
    if (y >= L.shorts) return robe ? shadeX(L, x, body.m.cloth) : L.dark(x) ? BASIC.pantsD : BASIC.pants;   // 短褲 → 長褲（法袍會蓋住）
    if (!body) {
      if (L.crop && y > L.crop) return skin;                                          // 短版上衣：露出腰
      if (front && y <= L.top + 1 && Math.abs(x - L.cx) <= L.top + 2 - y) return skin;   // 圓領
      return L.dark(x) ? BASIC.teeD : BASIC.tee;
    }
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
    if (!body) return y <= L.pad ? BASIC.tee : null;                                  // 短袖
    const { it, m } = body, tag = it.tag;
    if (tag === 'guard') return y <= L.pad ? (y < L.pad ? m.metal.l : m.metal.b) : y >= L.glove ? m.metal.d : y === L.glove - 1 && m.trim ? m.trim : m.metal.b;
    if (tag === 'arcane') return y >= L.glove + 1 ? null : y === L.glove ? (m.trim || m.cloth.d) : y <= L.pad ? m.cloth.l : m.cloth.b;   // 寬袖，露出手
    if (y <= L.pad) return it.rarity >= 2 ? (y < L.pad ? m.metal.l : m.metal.b) : m.leather.l;   // 稀有以上有金屬護肩
    return y >= L.glove ? m.leather.d : y === L.glove - 1 && m.trim ? m.trim : m.cloth.b;
  };
  const leg = (x, y, hex, k) => {
    if (k === 'ink') return null;
    const tag = feet && feet.it.tag;
    const start = !feet ? L.boot + 3 : tag === 'guard' ? L.boot - 2 : tag === 'arcane' ? L.boot + 2 : L.boot;
    if (y >= start) {
      if (!feet) return y >= L.sole ? BASIC.sole : BASIC.shoe;
      const c = tag === 'guard' ? feet.m.metal : tag === 'arcane' ? feet.m.cloth : feet.m.leather;
      if (y === start && feet.m.trim) return feet.m.trim;
      return y >= L.sole ? c.d : shadeX(L, x, c);
    }
    if (robe && y <= L.robe) return y === L.robe ? (body.m.trim || body.m.cloth.d) : shadeX(L, x, body.m.cloth);   // 法袍下襬蓋到膝蓋
    return L.dark(x) ? BASIC.pantsD : BASIC.pants;
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
  r(INK, 5, 3, 7, 34); r(INK, 6, 1, 5, 2); r(INK, 7, 0, 3, 1);                          // 劍
  r(metal.l, 6, 3, 2, 33); r(metal.b, 8, 2, 1, 34); r(metal.d, 9, 3, 2, 33);
  r(metal.l, 7, 1, 1, 2); r(metal.d, 9, 2, 1, 1);
  if (it && it.rarity >= 3) r(m.trim, 8, 5, 1, 28);                                      // 史詩以上：劍身的光紋
  r(INK, 2, 36, 13, 5); r(gold, 3, 37, 11, 3);
  r(INK, 6, 41, 5, 7); r(grip.b, 7, 41, 2, 5); r(grip.d, 9, 41, 1, 5); r(gold, 7, 46, 3, 1);
  return { canvas: c, pivot: [8.5, 43.5] };
}

// ---------- 動作：輸入 0–1 的進度，回傳姿勢與特效 ----------
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const REST = { x: 0, y: 0, bodyY: 0, torso: 0, head: 0, armL: 0, armR: 0, elbowL: 0, elbowR: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0, weapon: 0, fx: [] };

export const ANIMS = {
  idle: { name: '待機', dur: 1.8, loop: true, pose(t) {
    const b = Math.sin(t * Math.PI * 2);
    return { ...REST, bodyY: b > 0.25 ? 1 : 0, armL: 2 + b * 1.5, armR: -2 - b * 1.5, elbowR: -14 - b * 3, elbowL: -6, head: b * 0.8, weapon: 14 };
  } },
  walk: { name: '走路', dur: 0.7, loop: true, pose(t) {
    const s = Math.sin(t * Math.PI * 2), c = Math.cos(t * Math.PI * 2);
    return { ...REST, bodyY: Math.abs(s) > 0.7 ? 1 : 0, legL: s * 26, legR: -s * 26, kneeL: Math.max(0, c) * 34, kneeR: Math.max(0, -c) * 34,
      armL: -s * 22, armR: s * 16 - 6, elbowL: -14, elbowR: -22, torso: 3, weapon: 20 };
  } },
  // 揮砍：往後舉起 → 往前砍下（刀光）→ 收回
  slash: { name: '揮砍', dur: 0.62, pose(t) {
    const a = ease(seg(t, 0, 0.32)), b = ease(seg(t, 0.32, 0.5)), c = ease(seg(t, 0.5, 1));
    const fx = [];
    if (t > 0.3 && t < 0.72) fx.push({ type: 'arc', from: -175, to: lerp(-175, -50, b), r: 52, alpha: 1 - seg(t, 0.5, 0.72), width: 8 });
    if (t > 0.42 && t < 0.6) fx.push({ type: 'hit', power: 1 });
    return { ...REST, x: lerp(lerp(0, -3, a), 7, b) * (1 - c), torso: lerp(lerp(0, -7, a), 9, b) * (1 - c), head: lerp(0, -4, a) * (1 - b),
      armR: lerp(lerp(0, -150, a), -62, b) * (1 - c), elbowR: lerp(lerp(-14, -60, a), -6, b) * (1 - c) - 14 * c, weapon: lerp(lerp(14, 150, a), 190, b) * (1 - c) + 14 * c,
      armL: lerp(0, 22, b) * (1 - c), elbowL: -20 * (1 - c), legL: lerp(0, -12, b) * (1 - c), legR: lerp(0, 14, b) * (1 - c), kneeL: lerp(0, 14, b) * (1 - c),
      bodyY: b > 0.5 && c < 0.5 ? 1 : 0, fx };
  } },
  // 跳斬：蹲下 → 跳起、武器舉過頭 → 落下重擊（大刀光、衝擊波、火花）→ 起身
  jump: { name: '跳斬', dur: 1.15, pose(t) {
    const crouch = ease(seg(t, 0, 0.14)), up = ease(seg(t, 0.14, 0.45)), down = seg(t, 0.52, 0.62), land = ease(seg(t, 0.62, 1));
    const air = up * (1 - down * down), d = ease(down);
    const fx = [];
    if (t > 0.5 && t < 0.8) fx.push({ type: 'arc', from: -190, to: lerp(-190, -30, d), r: 56, alpha: 1 - seg(t, 0.62, 0.8), width: 11, gold: true });
    if (t > 0.6 && t < 0.95) fx.push({ type: 'shock', p: seg(t, 0.6, 0.95) });
    if (t > 0.6 && t < 0.9) fx.push({ type: 'sparks', p: seg(t, 0.6, 0.9) });
    if (t > 0.6 && t < 0.72) fx.push({ type: 'hit', power: 2 });
    if (t > 0.6 && t < 0.7) fx.push({ type: 'shake', amount: 3 });
    const squat = crouch * (1 - up) + (t > 0.62 ? 1 - land : 0) * 0.9;
    return { ...REST, x: 10 * ease(seg(t, 0.14, 0.62)) * (1 - land), y: -34 * air, bodyY: Math.round(squat * 4), torso: lerp(lerp(0, -10, up), 14, d) * (1 - land),
      head: lerp(0, -8, up) * (1 - down), armR: lerp(lerp(0, -165, up), -48, d) * (1 - land), elbowR: lerp(lerp(-14, -40, up), -4, d) * (1 - land) - 14 * land,
      weapon: lerp(lerp(14, 170, up), 200, d) * (1 - land) + 14 * land, armL: lerp(lerp(0, -40, up), 30, d) * (1 - land), elbowL: -30 * air,
      legL: -34 * air - squat * 26, legR: 18 * air - squat * 26, kneeL: 60 * air + squat * 52, kneeR: 30 * air + squat * 52, fx };
  } },
  // 忙碌：鍛造、買賣、接委託時舉手忙一下
  work: { name: '忙碌', dur: 0.45, pose(t) {
    const k = Math.sin(seg(t, 0, 1) * Math.PI);
    return { ...REST, bodyY: k > 0.5 ? 1 : 0, armR: -50 * k, elbowR: -14 - 50 * k, armL: -30 * k, elbowL: -40 * k, head: 4 * k, weapon: 14 + 30 * k, fx: [] };
  } },
  // 受擊：往後仰一下
  hurt: { name: '受擊', dur: 0.32, pose(t) {
    const k = Math.sin(seg(t, 0, 1) * Math.PI);
    return { ...REST, x: -5 * k, torso: -12 * k, head: -8 * k, armL: -20 * k, armR: -24 * k, elbowR: -14, legL: -8 * k, kneeR: 12 * k, weapon: 14 + 20 * k, fx: [] };
  } },
};

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
    const sig = ['weapon', 'head', 'body', 'feet'].map((k) => (e[k] ? `${e[k].tag}-${e[k].tier}-${e[k].rarity}` : '')).join('|') + bare;
    if (sig === this.sig) return;
    this.sig = sig; this.equip = { ...e }; this.bare = bare;
    this.rebuild();
  }
  rebuild() {
    const g = this.look.gender, P = this.P = RIG_PARTS[g][this.view], L = LM[g][this.view], side = this.view === 'side';
    const S = this.S = P.scale;
    this.foot = [L.foot[0] * S, L.foot[1] * S];
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
    if (side) pose = { ...pose, armR: pose.armR - 14, weapon: pose.weapon + 62 };
    else pose = { ...pose, elbowL: 0, elbowR: 0, kneeL: 0, kneeR: 0 };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(ox - this.foot[0] + pose.x), Math.round(oy - this.foot[1] + pose.y));
    this.limb(ctx, 'legL', pose.legL, pose.kneeL, null, side ? -2 : 0);
    this.limb(ctx, 'legR', pose.legR, pose.kneeR);
    // 上半身：整體上下起伏，並繞腰部前後傾
    const t = this.G.torso, tx = Math.round(t.x + t.pivot[0]), ty = Math.round(t.y + t.pivot[1]);
    ctx.translate(tx, ty + pose.bodyY);
    ctx.rotate(Math.round(pose.torso) * RAD);
    ctx.translate(-tx, -ty);
    const hand = this.hand;
    const held = this.weapon ? (lx, ly) => {      // 武器畫在前臂下面，拳頭蓋住握柄
      ctx.save();
      ctx.translate(Math.round(hand[0] - lx), Math.round(hand[1] - ly));
      ctx.rotate(Math.round(pose.weapon) * RAD);
      ctx.drawImage(this.held.canvas, -Math.round(this.held.pivot[0]), -Math.round(this.held.pivot[1]));
      ctx.restore();
    } : null;
    if (side) this.limb(ctx, 'armL', pose.armL, pose.elbowL, null, 4);   // 後面的手：往前錯開一點，從身體後面露出來
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
    if (this.glow) {
      ctx.fillStyle = this.glow;
      for (let i = 0; i < 5; i++) {
        const ph = (time * 0.7 + i / 5) % 1;
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.fillRect(Math.round(ox + pose.x - 16 + ((i * 13) % 32)), Math.round(oy + pose.y - 20 - ph * 60), 1, i % 2 ? 1 : 2);
      }
      ctx.globalAlpha = 1;
    }
    for (const f of pose.fx) {
      if (f.type === 'arc') {
        // 刀光：沿著揮砍的弧線，越靠近武器尖端越亮、越寬；尾端變細變淡
        const span = f.to - f.from;
        for (let a = f.from; a <= f.to; a += 1.2) {
          const k = (a - f.from) / (span || 1);
          const w = Math.max(1, Math.round(f.width * k));
          for (let i = 0; i < w; i++) {
            const r = f.r - i, x = cx - Math.sin(a * RAD) * r, y = cy + Math.cos(a * RAD) * r;
            const edge = i === 0 || i === w - 1;
            ctx.globalAlpha = f.alpha * (0.25 + 0.75 * k);
            ctx.fillStyle = edge ? (f.gold ? '#f2b84b' : '#8fd3ff') : (f.gold ? '#fff3c4' : '#ffffff');
            ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          }
        }
        ctx.globalAlpha = 1;
      } else if (f.type === 'shock') {
        const w = 16 + f.p * 70;
        ctx.globalAlpha = 1 - f.p;
        ctx.fillStyle = '#fff3c4';
        for (let x = -w; x <= w; x++) {
          const h = Math.round((1 - (x / w) ** 2) * (5 - f.p * 3));
          if (Math.abs(x) > w - 10) ctx.fillRect(Math.round(ox + 30 + x), oy - h, 1, Math.max(1, h));
        }
        ctx.globalAlpha = 1;
      } else if (f.type === 'sparks') {
        for (let i = 0; i < 14; i++) {
          const ang = (-150 + i * 9.5) * RAD, sp = 26 + ((i * 37) % 22);
          const x = ox + 30 + Math.cos(ang) * sp * f.p, y = oy - 4 + Math.sin(ang) * sp * f.p + 30 * f.p * f.p;
          ctx.globalAlpha = 1 - f.p;
          ctx.fillStyle = i % 3 ? '#f2b84b' : '#ffffff';
          ctx.fillRect(Math.round(x), Math.round(y), i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}
