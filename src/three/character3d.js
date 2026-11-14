// 3D 像素風角色（第二版）：用圓滑曲面組成的 Q 版模型，不是方塊。
// 頭是下巴收窄的橢圓球，臉畫在球面貼圖上；身體、手腳用旋轉曲面與膠囊形；頭髮是髮殼加上一撮撮立體的髮束。
// 單位：1 單位約等於 1.7 格像素；腳底在 y=0，臉朝 +Z。全身約 97 單位高，頭（含頭髮）約佔一半。
import * as THREE from 'three';
import { CHIBI } from '../art/chibi-data.js';

export const HAIR_COLORS = { ...CHIBI.hairColors, 深棕: ['#2e262e', '#453a43', '#63545e', '#827079'], 藍黑: ['#202840', '#34406a', '#4c5c90', '#7484bc'] };
const SKIN = '#f8ceb7', SKIN_SH = '#e6ae97', INK = '#17141b';
const TAU = Math.PI * 2, RAD = Math.PI / 180;

// ---------- 材質 ----------
const GRADIENT = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 165, 218, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
})();
const mat = (color, extra = {}) => new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: GRADIENT, ...extra });
function texMat(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRADIENT });
}
function canvas(w, h, fill) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (fill) { x.fillStyle = fill; x.fillRect(0, 0, w, h); }
  return [c, x];
}
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

// ---------- 幾何工具 ----------
// 球面的接縫（第一欄與最後一欄）法線取平均，卡通光影才不會出現一條線
function fixSeam(geo, wSeg, hSeg) {
  const n = geo.attributes.normal;
  for (let iy = 0; iy <= hSeg; iy++) {
    const a = iy * (wSeg + 1), b = a + wSeg;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
}
// 球（貼圖中央 u=0.5 對準正面 +Z，接縫在背面），可以用 shape(x,y,z,t) 改變每個頂點，t = y/r
function ball(r, shape, wSeg = 40, hSeg = 28) {
  const g = new THREE.SphereGeometry(r, wSeg, hSeg, -Math.PI / 2);
  if (shape) {
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      shape(v, v.y / r);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    fixSeam(g, wSeg, hSeg);
  }
  return g;
}
// 旋轉曲面：profile = [[半徑, 高度], ...]（由下往上），重新取樣成等高間距，貼圖正面在 u=0.5
function lathe(profile, { sx = 1, sz = 1, steps = 22, segs = 32 } = {}) {
  const y0 = profile[0][1], y1 = profile[profile.length - 1][1];
  const rAt = (y) => {
    for (let i = 0; i < profile.length - 1; i++) {
      const [ra, ya] = profile[i], [rb, yb] = profile[i + 1];
      if (y >= ya && y <= yb) return ra + ((rb - ra) * (y - ya)) / (yb - ya || 1);
    }
    return profile[profile.length - 1][0];
  };
  const pts = [new THREE.Vector2(0.001, y0)];
  for (let i = 0; i <= steps; i++) { const y = y0 + ((y1 - y0) * i) / steps; pts.push(new THREE.Vector2(Math.max(0.001, rAt(y)), y)); }
  pts.push(new THREE.Vector2(0.001, y1));
  const g = new THREE.LatheGeometry(pts, segs, Math.PI, TAU);
  g.scale(sx, 1, sz);
  return g;
}
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 16);

// 髮束：水滴形（根部圓、尖端收細），壓扁，並往外側彎
function tuftGeometry(L, R, bend = 0.18, flat = 0.5) {
  const pts = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const rad = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85);
    pts.push(new THREE.Vector2(Math.max(0.02, rad), t * L));
  }
  const g = new THREE.LatheGeometry(pts, 12, Math.PI, TAU);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / L;
    p.setZ(i, p.getZ(i) * flat + bend * L * t * t);
  }
  g.computeVertexNormals();
  return g;
}

// ---------- 臉（畫在球面貼圖上：512×256，正面中央在 x=256） ----------
function faceCanvas({ female, blink }) {
  const [c, x] = canvas(512, 256, SKIN);
  const cx = 256, eyeY = 116, eyeW = 30, eyeH = 47, gap = 33;
  const rr = (px, py, w, h, r) => { x.beginPath(); x.roundRect(px, py, w, h, r); x.fill(); };
  for (const s of [-1, 1]) {
    const ex = cx + s * gap - eyeW / 2;
    if (blink) {
      x.fillStyle = INK; rr(ex - 2, eyeY + eyeH * 0.55, eyeW + 4, 5, 2);
      x.fillRect(s < 0 ? ex - 5 : ex + eyeW + 1, eyeY + eyeH * 0.55 - 3, 5, 5);
      continue;
    }
    x.fillStyle = INK;
    rr(ex - 3, eyeY - 6, eyeW + 6, 9, 3);                                    // 上睫毛
    x.fillRect(s < 0 ? ex - 8 : ex + eyeW + 2, eyeY - 4, 6, female ? 5 : 7);  // 眼尾
    if (female) { x.fillRect(s < 0 ? ex - 12 : ex + eyeW + 7, eyeY - 9, 5, 6); x.fillRect(ex + 4, eyeY + eyeH + 1, eyeW - 8, 2); }
    x.fillStyle = '#29232d'; rr(ex, eyeY, eyeW, eyeH, 7);                    // 瞳孔
    x.fillStyle = '#5a4a58'; rr(ex + 3, eyeY + eyeH * 0.6, eyeW - 6, eyeH * 0.32, 4);
    x.fillStyle = '#a294a0'; rr(ex + 6, eyeY + eyeH * 0.78, eyeW - 12, eyeH * 0.15, 3);
    x.fillStyle = '#ffffff';
    rr(ex + 3, eyeY + 4, 9, 13, 3);                                           // 大高光
    x.fillRect(ex + eyeW - 9, eyeY + eyeH * 0.55, 5, 5);                      // 小高光
  }
  // 嘴、腮紅
  x.fillStyle = female ? '#e5737d' : '#d99e88';
  rr(cx - (female ? 7 : 6), 183, female ? 14 : 12, female ? 5 : 4, 2);
  if (female) {
    x.fillStyle = '#ffb0aa';
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 47, 171, 13, 6, 0, 0, TAU); x.fill(); }
  }
  return c;
}

// ---------- 頭 ----------
const HEAD_R = 19;
const LEG = 5;   // 腿比最初的設計加長幾個單位
function headGeometry() {
  return ball(HEAD_R, (v, t) => {
    let sx = 1.1, sz = 1.0;
    if (t < 0) { const k = -t; sx *= 1 - 0.3 * k * k; sz *= 1 - 0.22 * k * k; }   // 下巴收窄
    sx *= 1 + 0.07 * Math.exp(-(((t + 0.32) / 0.3) ** 2));                        // 臉頰鼓一點
    v.x *= sx; v.y *= 0.92; v.z *= sz * (v.z > 0 ? 0.95 : 1);
  });
}

// 頭髮：髮殼（頭頂＋後腦與兩側）＋髮束。座標以頭的中心為原點。
const HR = { x: 22.3, y: 19.3, z: 20.9 };
const scalp = (az, el, k = 1) => new THREE.Vector3(
  HR.x * Math.sin(az * RAD) * Math.cos(el * RAD) * k, HR.y * Math.sin(el * RAD) * k, HR.z * Math.cos(az * RAD) * Math.cos(el * RAD) * k);
function hairShell(m, backTheta = 0.72) {
  const g = new THREE.Group();
  const top = new THREE.SphereGeometry(1, 32, 12, 0, TAU, 0, Math.PI * 0.4);
  top.scale(HR.x, HR.y, HR.z);
  g.add(mesh(top, m));
  // 後腦與兩側（正面留給臉）：phi 以背面為中心左右各 128 度
  const back = new THREE.SphereGeometry(1, 32, 12, (270 - 128) * RAD, 256 * RAD, Math.PI * 0.3, Math.PI * (backTheta - 0.3));
  back.scale(HR.x, HR.y, HR.z);
  g.add(mesh(back, m));
  return g;
}
// 一撮髮束：從 base（方位角、仰角）長到 tip（方位角、仰角、往外的倍數）
function addTuft(group, m, [az, el], [az2, el2, k2 = 1.05], R = 4.5, { bend = 0.16, flat = 0.5, k = 1.01 } = {}) {
  const a = scalp(az, el, k), b = scalp(az2, el2, k2);
  const dir = b.clone().sub(a), L = dir.length();
  const y = dir.clone().normalize();
  const mid = a.clone().add(b).multiplyScalar(0.5).normalize();
  const z = mid.clone().sub(y.clone().multiplyScalar(mid.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const o = mesh(tuftGeometry(L, R, bend, flat), m);
  o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  o.position.copy(a);
  group.add(o);
  return o;
}

// 在兩個點之間放一撮髮束，normal 是壓扁的方向（通常是往外）
function addTuftPts(group, m, a, b, R, normal, { bend = 0.16, flat = 0.6 } = {}) {
  const dir = b.clone().sub(a), L = dir.length();
  const y = dir.clone().normalize();
  const z = normal.clone().sub(y.clone().multiplyScalar(normal.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const o = mesh(tuftGeometry(L, R, bend, flat), m);
  o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  o.position.copy(a);
  group.add(o);
  return o;
}

// 有種子的亂數：每次產生的亂髮都一樣
function rng(seed) { let v = seed >>> 0; return () => { v = (v + 0x6d2b79f5) >>> 0; let t = v; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 男生：蓬鬆亂翹的短髮（參考圖的髮型）。由下往上三層厚髮束＋頭頂一圈＋瀏海，每撮都有一點隨機的方向與深淺。
function hairMale(pal) {
  const g = new THREE.Group();
  const H = mat(pal[1], { side: THREE.DoubleSide }), M = mat(pal[2]), Dk = mat(pal[0]);
  const shell = hairShell(H); shell.scale.setScalar(1.07);
  g.add(shell);
  const r = rng(11);
  const j = (n) => (r() - 0.5) * 2 * n;
  const pick = () => (r() < 0.62 ? H : M);                         // 上面兩層只用基本色與亮色
  const pickLow = pick;
  const T = (m, a, b, R, o) => addTuft(g, m, a, b, R, { flat: 0.6, k: 1.05, ...o });
  // 下層：後腦與兩側往下，尖端往外翹（正面留給臉）
  for (const az of [70, 98, 126, 154, 182, 210, 238, 266, 294]) {
    const side = az > 180 ? 1 : -1;
    T(pickLow(), [az + j(5), 20 + j(5)], [az + side * 8 + j(5), -28 + j(6), 1.18 + j(0.03)], 8, { bend: 0.26 });
  }
  // 中層：錯開方位，蓋住下層的根部
  for (const az of [56, 84, 112, 140, 168, 196, 224, 252, 280, 308]) {
    const side = az > 180 ? 1 : -1;
    T(pick(), [az + j(6), 52 + j(4)], [az + side * 10 + j(6), 10 + j(6), 1.17 + j(0.04)], 8.5, { bend: 0.22 });
  }
  // 頭頂：從髮旋往四周蓋下來，貼著頭型，只有尖端微翹
  for (const az of [10, 55, 100, 145, 190, 235, 280, 325]) {
    T(pick(), [az + j(8), 86 + j(3)], [az + 12 + j(10), 44 + j(5), 1.13 + j(0.03)], 8.5, { bend: 0.18 });
  }
  // 幾撮翹出來的呆毛，打破圓圓的輪廓
  T(M, [-30, 70], [-58, 62, 1.3], 5, { bend: 0.4 });
  T(H, [40, 74], [72, 66, 1.3], 5, { bend: 0.4 });
  T(H, [5, 84], [-20, 80, 1.34], 4.5, { bend: 0.45 });
  T(H, [150, 70], [178, 56, 1.3], 5, { bend: 0.4 });
  T(M, [-115, 44], [-130, 22, 1.3], 5, { bend: 0.4 });
  T(H, [112, 40], [128, 16, 1.3], 5, { bend: 0.4 });
  // 瀏海：一撮撮蓋在額頭上，兩眼中間那撮最長
  const bang = { bend: 0.05, k: 1.05, flat: 0.55 };
  T(H, [-50, 48], [-58, 10, 1.09], 6.5, bang);
  T(M, [-30, 52], [-37, 13, 1.09], 6.2, bang);
  T(H, [-11, 55], [-18, 15, 1.09], 5.6, bang);
  T(Dk, [5, 57], [1, 1, 1.08], 4.6, bang);
  T(H, [20, 55], [25, 14, 1.09], 5.8, bang);
  T(H, [38, 52], [46, 12, 1.09], 6.2, bang);
  T(M, [56, 47], [66, 9, 1.09], 6.5, bang);
  return g;
}

// 女生：齊瀏海、兩側鬢髮、高馬尾（往一側垂下，正面也看得到）
function hairFemale(pal) {
  const g = new THREE.Group();
  const H = mat(pal[1], { side: THREE.DoubleSide }), M = mat(pal[2]), Dk = mat(pal[0]);
  const shell = hairShell(H, 0.72); shell.scale.setScalar(1.05);
  g.add(shell);
  const T = (m, a, b, R, o) => addTuft(g, m, a, b, R, o);
  const bang = { bend: 0.04, k: 1.05, flat: 0.5 };
  T(H, [-44, 50], [-49, 9, 1.08], 7, bang);
  T(M, [-23, 54], [-27, 12, 1.08], 6.6, bang);
  T(H, [-2, 56], [-3, 13, 1.08], 6.6, bang);
  T(H, [19, 54], [23, 12, 1.08], 6.6, bang);
  T(M, [40, 50], [46, 9, 1.08], 7, bang);
  for (const s of [-1, 1]) {
    T(H, [s * 63, 44], [s * 69, -38, 1.07], 5.5, { bend: 0.03, k: 1.04, flat: 0.55 });   // 鬢髮垂到下巴
  }
  // 側馬尾：髮圈在後腦側上方，頭髮先蓬起再垂到肩膀，掛在可以晃動的支點上
  const AZ = 218, tie = scalp(AZ, 56, 1.06);
  const out = new THREE.Vector3(Math.sin(AZ * RAD), 0, Math.cos(AZ * RAD)), up = new THREE.Vector3(0, 1, 0);
  const at = (o, u) => out.clone().multiplyScalar(o).add(up.clone().multiplyScalar(u));
  const tail = new THREE.Group();
  tail.position.copy(tie);
  tail.add(mesh(new THREE.SphereGeometry(4.4, 14, 10), mat('#e5737d')));
  tail.add(mesh(new THREE.SphereGeometry(7.5, 16, 12), H, ...at(7, 3).toArray()));              // 蓬起的髮根
  addTuftPts(tail, H, at(6, 6), at(15, -32), 9, out, { bend: 0.14, flat: 0.75 });
  addTuftPts(tail, M, at(11, -12), at(17, -44), 6.5, out, { bend: 0.1, flat: 0.75 });
  g.add(tail);
  g.userData.sway = tail;
  return g;
}

// ---------- 衣服貼圖 ----------
function hoodieCanvas() {
  const J = '#484049', JD = '#2f2a33', JL = '#62566300'.slice(0, 7);
  const [c, x] = canvas(256, 128, J);
  x.fillStyle = JL; x.fillRect(70, 0, 22, 128);                // 左前襟的亮面
  x.fillStyle = JD; x.fillRect(166, 0, 26, 128);               // 右側暗面
  x.fillStyle = '#e9e6e5'; x.fillRect(114, 0, 28, 128);        // 白色內搭
  x.fillStyle = '#c4bdc0'; x.fillRect(134, 0, 8, 128); x.fillRect(114, 100, 28, 28);
  x.fillStyle = INK; x.fillRect(110, 0, 4, 128); x.fillRect(142, 0, 4, 128);   // 拉鍊邊
  x.fillStyle = '#f2eff0'; x.fillRect(102, 24, 3, 42); x.fillRect(151, 24, 3, 46);   // 帽繩
  x.fillStyle = JD;
  x.fillRect(74, 84, 26, 3); x.fillRect(156, 84, 26, 3);       // 口袋
  x.fillRect(0, 114, 256, 14);                                 // 下襬
  x.fillRect(84, 44, 3, 22); x.fillRect(172, 56, 3, 20);       // 皺褶
  return c;
}
function teeCanvas() {
  const [c, x] = canvas(256, 128, '#ebe8e7');
  x.fillStyle = '#c9c2c5'; x.fillRect(160, 0, 40, 128);        // 右側陰影
  x.fillRect(0, 116, 256, 12);                                 // 下襬
  x.fillStyle = '#a69ca3'; x.fillRect(0, 0, 256, 7);           // 領口
  x.fillStyle = '#c9c2c5'; x.fillRect(96, 52, 3, 18); x.fillRect(150, 66, 3, 16);
  return c;
}
function shoeCanvas(female) {
  const upper = female ? '#f2eff0' : '#3a3540';
  const [c, x] = canvas(128, 64, upper);
  if (!female) { x.fillStyle = '#f2eff0'; x.fillRect(44, 22, 40, 22); }   // 白色鞋頭
  x.fillStyle = female ? '#d9d4d8' : '#f2eff0'; x.fillRect(0, 38, 128, 10);   // 鞋底側邊
  x.fillStyle = '#aaa5ad'; x.fillRect(0, 48, 128, 16);
  x.fillStyle = female ? '#aaa5ad' : '#f2eff0';
  x.fillRect(56, 8, 16, 3); x.fillRect(56, 14, 16, 3);                    // 鞋帶
  return c;
}

// ---------- 組裝 ----------
function build(look) {
  const female = look.gender === '女';
  const pal = HAIR_COLORS[look.color] || HAIR_COLORS['深棕'];
  const root = new THREE.Group();
  const skin = mat(SKIN), skinSh = mat(SKIN_SH);
  const pants = female ? '#4c72ac' : '#322d37';

  // 腿與鞋
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 5.3, 21 + LEG, 0);
    hip.add(mesh(capsule(female ? 4.6 : 5.1, 6.5 + LEG), mat(pants), 0, -8 - LEG / 2, 0));
    if (female) hip.add(mesh(new THREE.CylinderGeometry(5.1, 5.1, 3, 16), mat('#7398cc'), 0, -13.5 - LEG, 0));   // 反摺褲管
    const shoeGeo = ball(1, (v) => { v.x *= 5.9; v.y = Math.max(v.y * 4.6, -2.6); v.z *= 8.6; }, 28, 16);
    hip.add(mesh(shoeGeo, texMat(shoeCanvas(female)), 0, -17.4 - LEG, 2.6));
    root.add(hip);
    legs.push(hip);
  }
  // 上半身整體（腿加長後往上移）
  const upper = new THREE.Group();
  upper.position.y = LEG;
  root.add(upper);
  // 骨盆（褲子上半）
  upper.add(mesh(lathe([[9.6, 14], [10.2, 17], [10, 23]], { sx: 1.08, sz: 0.8, steps: 6 }), mat(pants)));

  // 軀幹（隨呼吸起伏）
  const torso = new THREE.Group();
  upper.add(torso);
  if (female) {
    torso.add(mesh(lathe([[8.2, 22], [8.2, 26]], { sx: 1.06, sz: 0.78, steps: 3 }), skin));           // 露出的腰
    torso.add(mesh(new THREE.CylinderGeometry(10.4, 10.4, 2.2, 24).scale(1.08, 1, 0.8), mat('#34527f'), 0, 22.6, 0));   // 褲頭
    torso.add(mesh(new THREE.BoxGeometry(2.2, 2.2, 1), mat('#d8ac4a'), 0, 22.6, 8.2));
    torso.add(mesh(lathe([[9.4, 25.5], [9.8, 27], [9.3, 33], [9.2, 39], [9.6, 43.5], [7.6, 47.5], [4.6, 49.5]], { sx: 1.1, sz: 0.8 }), texMat(teeCanvas())));
  } else {
    torso.add(mesh(lathe([[10.4, 20.5], [11.6, 23], [11.6, 31], [11.1, 38], [10.6, 43.5], [8.2, 47.5], [4.8, 49.5]], { sx: 1.15, sz: 0.82 }), texMat(hoodieCanvas())));
    // 帽兜：圍在脖子後面的一圈
    const hood = mesh(new THREE.TorusGeometry(8.4, 4.2, 10, 24, Math.PI * 1.4), mat('#484049'), 0, 48.6, -2.6);
    hood.rotation.set(Math.PI / 2 - 0.38, 0, 144 * RAD); hood.scale.set(1.25, 1.1, 1.05);
    torso.add(hood);
    const bag = mesh(new THREE.SphereGeometry(8, 16, 12), mat('#484049'), 0, 43.5, -8.5);
    bag.scale.set(1.35, 0.95, 0.62);
    torso.add(bag);
  }
  torso.add(mesh(new THREE.CylinderGeometry(4.4, 4.8, 7, 16), skinSh, 0, 50.5, 0));   // 脖子

  // 手臂（肩膀為支點，自然往外垂）
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * (female ? 11.6 : 14.6), 44.2, 0);
    const arm = new THREE.Group();
    arm.rotation.z = s * (female ? 0.16 : 0.2);
    shoulder.add(arm);
    if (female) {
      arm.add(mesh(capsule(3.9, 3), mat('#ebe8e7'), 0, -4.6, 0));      // 短袖
      arm.add(mesh(capsule(3.2, 9), skin, 0, -11.5, 0));
      arm.add(mesh(new THREE.SphereGeometry(3.7, 14, 10), skin, 0, -19.2, 0.4));
    } else {
      arm.add(mesh(capsule(4.6, 9.5), mat('#484049'), 0, -8.4, 0));      // 外套袖子
      arm.add(mesh(new THREE.CylinderGeometry(4.9, 4.9, 2.4, 16), mat('#2f2a33'), 0, -16.2, 0));   // 袖口
      arm.add(mesh(new THREE.SphereGeometry(4.2, 14, 10), skin, 0, -20.2, 0.5));
    }
    shoulder.userData.arm = arm;
    torso.add(shoulder);
    arms.push(shoulder);
  }

  // 頭（脖子為支點）
  const head = new THREE.Group();
  head.position.set(0, 50.5, 0);
  torso.add(head);
  const faceOpen = texMat(faceCanvas({ female, blink: false })), faceBlink = texMat(faceCanvas({ female, blink: true }));
  const headMesh = mesh(headGeometry(), faceOpen, 0, 17.5, 0);
  head.add(headMesh);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(3.6, 12, 10), s < 0 ? skin : skinSh, s * 21.3, 15, 0.5);
    ear.scale.set(0.55, 1, 0.8);
    head.add(ear);
  }
  const hair = female ? hairFemale(pal) : hairMale(pal);
  hair.position.set(0, 17.5, 0);
  head.add(hair);

  // 腳下的影子
  const shadow = mesh(new THREE.CircleGeometry(15, 24), new THREE.MeshBasicMaterial({ color: 0x0a0d13, transparent: true, opacity: 0.32, depthWrite: false }), 0, 0.2, 1);
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.7, 1);
  root.add(shadow);
  return { root, torso, head, headMesh, legs, arms, hair, faceOpen, faceBlink, shadow };
}

// ---------- 角色 ----------
export class Character3D {
  constructor(look) {
    this.group = new THREE.Group();
    this.t = Math.random() * 3;
    this.action = 'idle';
    this.attackT = -1;
    this.blinkAt = this.t + 1.5;
    this.setLook(look);
  }

  setLook(look) {
    if (this.model) this.group.remove(this.model.root);
    this.model = build({ gender: '男', color: '深棕', ...look });
    this.group.add(this.model.root);
  }

  play(action) {
    if (action === 'attack') { this.attackT = 0; return; }
    this.action = action;
  }

  update(dt) {
    this.t += dt;
    const M = this.model, t = this.t;
    const walking = this.action === 'walk';
    // 呼吸／走路的起伏
    M.torso.position.y = walking ? -Math.abs(Math.sin(t * 8)) * 1.2 : Math.sin(t * 2.2) * 0.45;
    M.head.rotation.z = Math.sin(t * 1.1) * 0.025;
    M.head.rotation.x = walking ? 0.04 : Math.sin(t * 2.2 + 1) * 0.015;
    const swing = walking ? Math.sin(t * 8) * 0.6 : 0;
    M.legs[0].rotation.x = swing; M.legs[1].rotation.x = -swing;
    M.arms[0].rotation.x = swing * 0.75;
    let armR = -swing * 0.75;
    // 攻擊：畫面右側的手往後舉起，再往前揮下
    if (this.attackT >= 0) {
      this.attackT += dt / 0.5;
      const p = this.attackT;
      if (p < 0.35) armR = -2.7 * (p / 0.35);
      else if (p < 0.6) armR = -2.7 + 3.6 * ((p - 0.35) / 0.25);
      else if (p < 1) armR = 0.9 * (1 - (p - 0.6) / 0.4);
      else this.attackT = -1;
      M.torso.rotation.x = p > 0.35 && p < 0.8 ? 0.1 : 0;
    } else M.torso.rotation.x = 0;
    M.arms[1].rotation.x = armR;
    if (M.hair.userData.sway) {
      M.hair.userData.sway.rotation.x = Math.sin(t * 1.9) * 0.07 + (walking ? 0.2 : 0);
      M.hair.userData.sway.rotation.z = Math.sin(t * 1.3) * 0.05;
    }
    // 眨眼
    if (t > this.blinkAt) {
      M.headMesh.material = M.faceBlink;
      if (t > this.blinkAt + 0.13) { M.headMesh.material = M.faceOpen; this.blinkAt = t + 2.2 + Math.random() * 2.5; }
    }
  }
}
