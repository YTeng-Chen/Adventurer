// 3D 像素風角色：用方塊組成的 Q 版模型，臉與衣服正面直接用 2D 手繪像素圖當貼圖。
// 單位：1 單位 = 1 格像素；腳底在 y=0，臉朝 +Z。部位：腿、軀幹（含手臂、頭）、頭髮殼、裝備。
// 動作：待機呼吸、眨眼、走路、攻擊揮擊（程式動畫，不需要美術做動作檔）。
import * as THREE from 'three';
import { CHIBI } from '../art/chibi-data.js';
import { gearMats } from '../art/palette.js';
import { normalizeLook, blinkRows } from '../art/chibi.js';

const NEAR = THREE.NearestFilter;
const GRADIENT = (() => {
  const t = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = NEAR; t.needsUpdate = true;
  return t;
})();
const HIDE = new THREE.MeshBasicMaterial({ visible: false });

// ---------- 貼圖工具 ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = NEAR; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const toon = (map, alpha = false) => new THREE.MeshToonMaterial({ map, gradientMap: GRADIENT, alphaTest: alpha ? 0.5 : 0 });
const tint = (hex) => new THREE.MeshToonMaterial({ color: new THREE.Color(hex), gradientMap: GRADIENT });
const SKIN_SET = 'SlsrEegWKbm';
// 從 2D 手繪圖裁一塊；only：只複製這些字母；fill：其他地方填的顏色
function crop(rows, x0, y0, w, h, pal, { fill = null, only = null } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, w, h); }
  for (let y = 0; y < h; y++) {
    const row = rows[y0 + y] || '';
    for (let x = 0; x < w; x++) {
      const ch = row[x0 + x];
      if (!ch || ch === '.' || (only && !only.includes(ch))) continue;
      ctx.fillStyle = pal[ch]; ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}
// 純色貼圖，可以在上面加幾條色帶：bands = [[y0, y1, color], ...]
function plain(w, h, color, bands = [], extra) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  for (const [a, b, col] of bands) { ctx.fillStyle = col; ctx.fillRect(0, a, w, b - a + 1); }
  if (extra) extra(ctx, w, h);
  return c;
}
function box(w, h, d, mats, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(x, y, z);
  return m;
}
// 六面材質順序：右(+X)、左(-X)、上、下、前(+Z)、後(-Z)
const six = (r, l, t, b, f, k) => [r, l, t, b, f, k];
const same = (m) => six(m, m, m, m, m, m);

// ---------- 頭髮貼圖 ----------
function hairTexture(w, h, pal, { rowsWithHair = null, light = true, strands = 7 } = {}) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  for (let x = 0; x < w; x++) {
    let bottom = h - 1;
    if (rowsWithHair) bottom = rowsWithHair - ((x * 5) % 3);     // 下緣鋸齒
    for (let y = 0; y <= Math.min(h - 1, bottom); y++) {
      let col = pal.H;
      if (light && y < 3) col = pal.M;
      if (light && y < 1 && x % 4 !== 0) col = pal.L;
      if (x % strands === 3 && y > 2) col = pal.D;
      if (y >= bottom - 1) col = pal.D;
      ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}
function hairTop(w, d, pal) {
  const c = canvas(w, d), ctx = c.getContext('2d');
  ctx.fillStyle = pal.H; ctx.fillRect(0, 0, w, d);
  // 天使光環：一圈亮色
  for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot((x - w / 2) / (w / 2), (y - d / 2) / (d / 2));
    if (r > 0.45 && r < 0.65) { ctx.fillStyle = (x + y) % 3 ? pal.M : pal.L; ctx.fillRect(x, y, 1, 1); }
  }
  ctx.fillStyle = pal.D; ctx.fillRect(Math.floor(w / 2), d / 2, 1, d / 2);
  return c;
}

// 2D 座標對應：2D 畫布第 R 列 ↔ 3D 高度 y ≈ 100.5 − R（臉的位置對齊）
const yOf = (R) => 100.5 - R;
const HAIR_TOP_R = 10;

// 髮型：髮殼（包住頭）＋長髮、馬尾、丸子頭的立體頭髮塊
function buildHair(style, pal) {
  const g = new THREE.Group();
  const front = CHIBI.hair[style].front;
  const isHair = (ch) => 'DHML'.includes(ch);
  const buzz = style === '平頭';
  const W = buzz ? 37 : 39, D = buzz ? 32 : 33, Hh = 44;
  const topY = buzz ? 88 : 91;
  // 側面：2D 圖左側（x 10–17）有頭髮的最低一列
  let sideLast = 0;
  for (let r = 0; r < Hh; r++) {
    const row = front[HAIR_TOP_R + r] || '';
    for (let x = 10; x <= 17; x++) if (isHair(row[x])) sideLast = r;
  }
  sideLast = Math.min(sideLast, Hh - 1);
  const backLast = buzz ? Math.min(sideLast + 4, Hh - 1) : Math.max(sideLast, 40);
  const frontTex = toon(tex(crop(front, buzz ? 13 : 12, HAIR_TOP_R + (topY === 91 ? 0 : 3), W, Hh, pal)), true);
  const sideTex = toon(tex(hairTexture(D, Hh, pal, { rowsWithHair: sideLast })), true);
  const backTex = toon(tex(hairTexture(W, Hh, pal, { rowsWithHair: backLast })), true);
  const topTex = toon(tex(hairTop(W, D, pal)));
  g.add(box(W, Hh, D, six(sideTex, sideTex, topTex, HIDE, frontTex, backTex), 0, topY - Hh / 2, 15.6 - D / 2));

  const hairMat = tint(pal.H), darkMat = tint(pal.D), lightMat = tint(pal.M), tieMat = tint('#17141b');
  if (style === '長直髮') {
    const panel2 = toon(tex(hairTexture(40, 62, pal, { light: false, strands: 5 })));
    g.add(box(40, 62, 5, six(hairMat, hairMat, hairMat, darkMat, hairMat, panel2), 0, 55, -19.5));
    for (const sx of [-1, 1]) g.add(box(5, 34, 5, six(hairMat, hairMat, hairMat, darkMat, toon(tex(hairTexture(5, 34, pal, { light: false, strands: 3 }))), hairMat), sx * 18, 46, 8));
  }
  if (style === '高馬尾') {
    const tail = new THREE.Group();
    tail.position.set(12, 84, -17);
    tail.add(box(7, 6, 7, same(tieMat), 0, 0, 0));
    tail.add(box(10, 14, 9, six(hairMat, hairMat, lightMat, darkMat, hairMat, hairMat), 3, -9, -2));
    tail.add(box(9, 14, 8, same(hairMat), 5, -22, -2));
    tail.add(box(6, 10, 6, six(hairMat, hairMat, hairMat, darkMat, hairMat, hairMat), 6, -33, -1));
    g.add(tail);
    g.userData.sway = tail;
  }
  if (style === '丸子頭') {
    g.add(box(18, 2, 18, same(tieMat), 0, 92, -3));
    g.add(box(16, 11, 16, six(hairMat, hairMat, lightMat, darkMat, hairMat, hairMat), 0, 98.5, -3));
  }
  if (style === '長直髮') g.userData.sway = null;
  return g;
}

// ---------- 身體 ----------
function buildBody(look) {
  const pal = (() => { const [D, Hc, M, L] = CHIBI.hairColors[look.color]; return { ...CHIBI.pal, D, H: Hc, M, L }; })();
  const female = look.gender === '女';
  const rows = CHIBI.bodies[look.gender];
  const P = CHIBI.pal;
  const parts = {};

  // 臉（正面貼圖）＋眨眼版本
  const faceCanvas = (blink) => {
    const r = blink ? blinkRows(rows) : rows;
    const c = canvas(34, 44), ctx = c.getContext('2d');
    ctx.fillStyle = P.S; ctx.fillRect(0, 0, 34, 44);
    ctx.drawImage(crop(r, 16, 32, 32, 24, P, { only: SKIN_SET }), 1, 16);
    ctx.fillStyle = P.s; ctx.fillRect(0, 42, 34, 2);
    return c;
  };
  parts.faceOpen = toon(tex(faceCanvas(false)));
  parts.faceBlink = toon(tex(faceCanvas(true)));
  const skin = tint(P.S), skinShade = tint(P.s);

  const root = new THREE.Group();
  const legs = [], arms = [];
  // 腿與鞋（左右）
  const pants = female ? P.B : P.P;
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 6, 19, 0);
    const legFront = toon(tex(crop(rows, side < 0 ? 20 : 34, 84, 10, 14, P, { fill: pants })));
    const legSide = toon(tex(plain(10, 14, pants, female ? [[12, 13, P.h]] : [])));
    hip.add(box(10, 14, 10, six(legSide, legSide, legSide, legSide, legFront, legSide), 0, -7, 0));
    const shoeTop = female ? P.w : P.O;
    const shoeFront = toon(tex(plain(11, 6, shoeTop, female ? [[5, 5, P.n]] : [[3, 4, P.w], [5, 5, P.n]])));
    const shoeSide = toon(tex(plain(15, 6, shoeTop, female ? [[5, 5, P.n]] : [[4, 4, P.w], [5, 5, P.n]])));
    const shoeTopM = tint(shoeTop);
    const shoe = box(11, 6, 15, six(shoeSide, shoeSide, shoeTopM, tint(P.n), shoeFront, shoeSide), 0, -16, 2);
    hip.add(shoe);
    hip.userData.shoe = shoe;
    root.add(hip);
    legs.push(hip);
  }
  // 軀幹（會隨呼吸上下）：衣服、手臂、脖子、頭
  const torso = new THREE.Group();
  root.add(torso);
  const top = female ? P.T : P.J;
  const torsoFront = toon(tex(crop(rows, 18, 62, 28, 22, P, { fill: top })));
  const torsoBands = female ? [[18, 19, P.S], [20, 21, P.d]] : [[20, 21, P.j]];
  const torsoSide = toon(tex(plain(14, 22, top, torsoBands)));
  const torsoBack = toon(tex(plain(28, 22, top, torsoBands, female ? null : (ctx) => { ctx.fillStyle = P.j; ctx.fillRect(8, 0, 12, 6); })));
  torso.add(box(28, 22, 14, six(torsoSide, torsoSide, tint(top), tint(top), torsoFront, torsoBack), 0, 30, 0));
  if (!female) torso.add(box(22, 6, 8, same(tint(P.J)), 0, 42, -5));     // 帽兜
  torso.add(box(10, 5, 10, same(skinShade), 0, 42, 0));                   // 脖子
  // 手臂（肩膀為支點）
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 16.5, 40, 0);
    const armFront = toon(tex(crop(rows, side < 0 ? 12 : 47, 64, 5, 16, P, { fill: female ? P.S : top })));
    const armSideC = female ? plain(6, 16, P.S, [[0, 7, P.T]]) : plain(6, 16, top, [[14, 15, P.j]]);
    const armSide = toon(tex(armSideC));
    shoulder.add(box(5, 16, 6, six(armSide, armSide, tint(top), tint(top), armFront, armSide), 0, -8, 0));
    const hand = new THREE.Group();
    hand.position.set(0, -19, 0);
    hand.add(box(6, 6, 7, same(skin)));
    shoulder.add(hand);
    shoulder.userData.hand = hand;
    torso.add(shoulder);
    arms.push(shoulder);
  }
  // 頭（脖子為支點）
  const head = new THREE.Group();
  head.position.set(0, 41, 0);
  torso.add(head);
  const headMats = six(skin, skin, skin, skin, parts.faceOpen, skin);
  const headMesh = box(34, 44, 30, headMats, 0, 22, 0);
  head.add(headMesh);
  for (const side of [-1, 1]) head.add(box(3, 9, 6, same(side < 0 ? skin : skinShade), side * 18.5, 15, 0));
  const hair = buildHair(look.style, pal);
  hair.position.set(0, -41, 0);
  head.add(hair);
  return { root, torso, head, headMesh, legs, arms, hair, parts };
}

// ---------- 裝備（簡化版：流派決定款式，材料階級決定顏色，稀有度決定滾邊與裝飾） ----------
function colorsOf(it) {
  const m = gearMats(it);
  const c = (k) => m[k].ramp[2];
  return { metal: c('metal'), leather: c('leather'), cloth: c('cloth'), wood: c('wood'), trim: c('trim'), gem: c('gem'),
    gold: c('gold'), orb: c('orb'), cape: c('cape'), belt: c('belt'), r: it.rarity };
}
function weapon3d(it) {
  const C = colorsOf(it), g = new THREE.Group();
  const trim = C.r >= 1 ? C.trim : C.metal;
  if (it.tag === 'blade') {
    g.add(box(2, 7, 2, same(tint(C.leather)), 0, 0, 0));
    g.add(box(C.r >= 4 ? 14 : 10, 2, 3, same(tint(C.r >= 4 ? C.gold : trim)), 0, 4.5, 0));
    g.add(box(C.r >= 3 ? 4 : 3, 22, 1.5, same(tint(C.metal)), 0, 16.5, 0));
    if (C.r >= 3) g.add(box(1, 18, 1.8, same(tint(C.trim)), 0, 16, 0));
    g.add(box(3, 2, 3, same(tint(C.r >= 2 ? C.gem : C.metal)), 0, -4.5, 0));
  } else if (it.tag === 'guard') {
    g.add(box(2, 28, 2, same(tint(C.wood)), 0, 8, 0));
    g.add(box(13, 9, 9, same(tint(C.metal)), 0, 24, 0));
    g.add(box(13.5, 2, 9.5, same(tint(trim)), 0, 24, 0));
    if (C.r >= 2) g.add(box(3, 5, 3, same(tint(C.metal)), 0, 31, 0));
    if (C.r >= 3) for (const s of [-1, 1]) g.add(box(4, 3, 3, same(tint(C.metal)), s * 8.5, 24, 0));
  } else {
    g.add(box(2, 40, 2, same(tint(C.wood)), 0, 12, 0));
    const orb = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), new THREE.MeshToonMaterial({ color: new THREE.Color(C.orb), gradientMap: GRADIENT, emissive: new THREE.Color(C.orb), emissiveIntensity: 0.35 }));
    orb.position.set(0, 35, 0);
    g.add(orb);
    g.add(box(9, 2, 9, same(tint(C.r >= 4 ? C.gold : C.metal)), 0, 31, 0));
  }
  return g;
}
function head3d(it) {
  const C = colorsOf(it), g = new THREE.Group();
  const trim = C.r >= 1 ? C.trim : null;
  if (it.tag === 'blade') {
    // 寬沿冒險帽：帽沿壓在頭髮上，帽冠套住頭頂
    g.add(box(52, 2, 46, same(tint(C.leather)), 0, 80, 0));
    g.add(box(42, 13, 36, same(tint(C.leather)), 0, 87.5, -1));
    g.add(box(42.5, 3, 36.5, same(tint(trim || C.belt)), 0, 82.5, -1));
    g.add(box(7, 4, 1, same(tint(C.r >= 4 ? C.gold : C.metal)), 0, 83, 17.5));
    if (C.r >= 3) g.add(box(2, 14, 2, same(tint(C.trim)), 18, 92, -8));
  } else if (it.tag === 'guard') {
    const M = tint(C.metal);
    g.add(box(44, 12, 38, same(M), 0, 87, -1));                       // 頭頂
    g.add(box(42, 30, 4, same(M), 0, 70, -19));                       // 後面
    for (const s of [-1, 1]) {
      g.add(box(4, 30, 34, same(M), s * 20, 70, -1));                 // 兩側
      g.add(box(6, 14, 4, same(M), s * 16, 62, 17));                  // 護頰
    }
    g.add(box(42, 4, 4, same(tint(trim || C.metal)), 0, 80, 17));     // 眉帶
    g.add(box(3, 8, 3, same(M), 0, 74, 18.5));                        // 鼻樑
    if (C.r >= 2) g.add(box(4, 10, 16, same(tint(C.trim)), 0, 97, -4));
    if (C.r >= 3) for (const s of [-1, 1]) g.add(box(3, 10, 3, same(tint(C.wood)), s * 23, 93, -2));
    if (C.r >= 4) for (const s of [-1, 0, 1]) g.add(box(3, 4, 3, same(tint(C.gold)), s * 12, 95, 12));
  } else {
    // 法師帽：帽沿壓在頭髮上，帽尖往後彎
    const M = tint(C.cloth);
    g.add(box(54, 2, 48, same(M), 0, 80, 0));
    g.add(box(42, 10, 36, same(M), 0, 86, -1));
    g.add(box(42.5, 3, 36.5, same(tint(trim || C.leather)), 0, 82.5, -1));
    g.add(box(28, 9, 24, same(M), -1, 95, -3));
    g.add(box(17, 8, 15, same(M), -3, 103, -6));
    g.add(box(9, 6, 8, same(M), -6, 109, -10));
    if (C.r >= 2) g.add(box(4, 4, 1, same(tint(C.gem)), 0, 83, 17.5));
  }
  return g;
}
function body3d(it) {
  const C = colorsOf(it), g = new THREE.Group();
  const trim = C.r >= 1 ? C.trim : null;
  if (it.tag === 'blade') {
    g.add(box(30, 18, 16, same(tint(C.leather)), 0, 32, 0));
    g.add(box(30.5, 3, 16.5, same(tint(C.belt)), 0, 24, 0));
    if (trim) g.add(box(30.5, 1.5, 16.5, same(tint(trim)), 0, 22, 0));
    if (C.r >= 2) g.add(box(10, 5, 10, same(tint(C.metal)), -16.5, 42, 0));
    if (C.r >= 3) g.add(box(10, 5, 10, same(tint(C.metal)), 16.5, 42, 0));
  } else if (it.tag === 'guard') {
    g.add(box(30, 22, 16, same(tint(C.metal)), 0, 30, 0));
    for (const s of [-1, 1]) {
      g.add(box(11, 7, 12, same(tint(C.metal)), s * 16.5, 42, 0));
      if (trim) g.add(box(11.5, 1.5, 12.5, same(tint(trim)), s * 16.5, 38.5, 0));
    }
    if (trim) g.add(box(30.5, 2, 16.5, same(tint(trim)), 0, 40, 0));
    if (C.r >= 2) g.add(box(4, 4, 1, same(tint(C.gem)), 0, 34, 8.5));
  } else {
    g.add(box(30, 22, 16, same(tint(C.cloth)), 0, 30, 0));
    g.add(box(32, 18, 18, same(tint(C.cloth)), 0, 11, 0));
    g.add(box(30.5, 3, 16.5, same(tint(C.leather)), 0, 24, 0));
    g.add(box(3, 38, 1, same(tint(trim || C.cloth)), 0, 22, 9.2));
    if (trim) g.add(box(32.5, 1.5, 18.5, same(tint(trim)), 0, 2.5, 0));
    if (C.r >= 2) g.add(box(4, 4, 1, same(tint(C.gem)), 0, 24, 9.5));
  }
  return g;
}
function feet3d(it) {
  const C = colorsOf(it);
  const col = it.tag === 'guard' ? C.metal : it.tag === 'blade' ? C.leather : C.cloth;
  const h = it.tag === 'arcane' ? 6.5 : 11;
  const mk = () => {
    const g = new THREE.Group();
    g.add(box(12, h, 16, same(tint(col)), 0, -16 + (h - 6) / 2, 2));
    if (C.r >= 1) g.add(box(12.5, 1.5, 16.5, same(tint(C.trim)), 0, -16 + h - 3.5, 2));
    return g;
  };
  return [mk(), mk()];
}

// ---------- 角色 ----------
export class Character3D {
  constructor(look, equip = {}) {
    this.group = new THREE.Group();
    this.t = 0;
    this.action = 'idle';
    this.attackT = -1;
    this.blinkAt = 2;
    this.setLook(look, equip);
  }

  setLook(look, equip = {}) {
    if (this.model) this.group.remove(this.model.root);
    const l = normalizeLook(look);
    this.model = buildBody(l);
    const M = this.model;
    // 裝備
    if (equip.body) {
      const b = body3d(equip.body);
      M.torso.add(b);
      if (equip.body.rarity >= 3) {
        const cape = box(26, 34, 1.5, same(tint(colorsOf(equip.body).cape)), 0, 24, -8.5);
        M.torso.add(cape);
        M.cape = cape;
      }
    }
    if (equip.feet) feet3d(equip.feet).forEach((f, i) => { M.legs[i].userData.shoe.visible = false; M.legs[i].add(f); });
    if (equip.head) { const h = head3d(equip.head); h.position.set(0, -41, 0); M.head.add(h); }
    if (equip.weapon) {
      const w = weapon3d(equip.weapon);
      w.position.set(1, 0, 4);
      w.rotation.set(0.3, 0, -0.42);       // 往前、往外傾，避開頭部，露在身體旁邊
      M.arms[1].userData.hand.add(w);     // 畫面右側那隻手（和 2D 版一樣）
    }
    this.group.add(M.root);
  }

  play(action) {
    if (action === 'attack') { this.attackT = 0; return; }
    this.action = action;
  }

  update(dt) {
    this.t += dt;
    const M = this.model, t = this.t;
    const walking = this.action === 'walk';
    // 呼吸／走路的上下起伏（整格移動，像素才不會糊）
    const bob = walking ? Math.round(Math.abs(Math.sin(t * 8)) * 2) : (Math.sin(t * 2.4) > 0.2 ? 1 : 0);
    M.torso.position.y = -bob;
    // 走路：腿和手臂前後擺動
    const swing = walking ? Math.sin(t * 8) * 0.65 : 0;
    M.legs[0].rotation.x = swing; M.legs[1].rotation.x = -swing;
    M.arms[0].rotation.x = swing * 0.8;
    let armR = -swing * 0.8 - 0.35 + (walking ? 0 : Math.sin(t * 2.4) * 0.03);   // 持武器的手稍微抬起
    // 攻擊：右手往後舉起，再往前揮下
    if (this.attackT >= 0) {
      this.attackT += dt / 0.45;
      const p = this.attackT;
      if (p < 0.35) armR = -0.35 - 2.25 * (p / 0.35);
      else if (p < 0.6) armR = -2.6 + 3.5 * ((p - 0.35) / 0.25);
      else if (p < 1) armR = 0.9 - 1.25 * ((p - 0.6) / 0.4);
      else this.attackT = -1;
      M.torso.rotation.x = p > 0.35 && p < 0.8 ? 0.12 : 0;
    } else M.torso.rotation.x = 0;
    M.arms[1].rotation.x = armR;
    // 頭髮、披風輕輕晃
    if (M.hair.userData.sway) M.hair.userData.sway.rotation.x = Math.sin(t * 1.8) * 0.06;
    if (M.cape) M.cape.rotation.x = 0.08 + Math.sin(t * 2.2) * 0.05 + (walking ? 0.15 : 0);
    // 眨眼
    if (t > this.blinkAt) {
      M.headMesh.material[4] = M.parts.faceBlink;
      if (t > this.blinkAt + 0.13) { M.headMesh.material[4] = M.parts.faceOpen; this.blinkAt = t + 2.2 + Math.random() * 2.5; }
    }
  }
}
