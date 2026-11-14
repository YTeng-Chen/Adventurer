// 角色與裝備的像素圖（48×56，正面，Q 版粗壯比例：大手、大靴、寬護肩）。
// 每個部位一個圖層，疊起來就是角色；每層都有動畫影格（呼吸、眨眼、披風飄動）。
// 造型：流派決定款式（劍士冒險裝、守衛機甲、術士法袍），材料階級決定材質，稀有度決定滾邊、寶石與裝飾。
import { Layer, render } from './pixel.js';
import { BODY, gearMats } from './palette.js';

export const W = 48, H = 56, AXIS = 19.5, OY = 2;
export const PIVOT = { x: 31, y: 35.5 + OY }; // 武器揮動的支點：右手握把中心（像素邊界座標）
const SPLIT = 34 + OY;                          // 呼吸時腰部以上往下移一格
const mk = () => new Layer(W, H, OY);
const MX = (x) => Math.round(2 * AXIS - x);
// 左右對稱的點
function sym(L, pts, m, tone = null) { for (const [x, y] of pts) { L.set(x, y, m, tone); L.set(MX(x), y, m, tone); } return L; }
function symMark(L, pts, tone, m) { for (const [x, y] of pts) { L.mark(x, y, tone, m); L.mark(MX(x), y, tone, m); } return L; }

// ---------- 身體 ----------
export function baseLayer(blink) {
  const L = mk();
  // 鞋、腿、臀
  L.rows([[47, 12, 18], [48, 12, 18], [49, 12, 18], [50, 11, 18], [51, 11, 18]], 'shoe');
  L.hline(11, 18, 52, 'shoe', 1);
  for (let y = 37; y <= 46; y++) L.hline(13, 17, y, 'pants');
  L.rows([[34, 13, 19], [35, 13, 19], [36, 13, 19]], 'pants');
  // 上衣、腰帶
  L.rows([[21, 14, 19]], 'tunic');
  for (let y = 22; y <= 31; y++) L.hline(12, 19, y, 'tunic');
  L.hline(12, 19, 32, 'belt').hline(12, 19, 33, 'belt');
  // 手臂：袖子、前臂、拳頭
  L.hline(10, 13, 21, 'tunic');
  for (let y = 22; y <= 26; y++) L.hline(8, 11, y, 'tunic');
  for (let y = 27; y <= 32; y++) L.hline(8, 11, y, 'skin');
  for (let y = 33; y <= 37; y++) L.hline(7, 11, y, 'skin');
  L.mirror(AXIS);
  symMark(L, [[8, 35], [10, 35], [8, 36]], 1);
  L.rect(19, 32, 2, 2, 'buckle');
  L.dots([[18, 21], [19, 21], [20, 21], [21, 21], [19, 22], [20, 22]], 'skin');
  L.vline(20, 23, 31, 'tunic', 1);
  symMark(L, [[11, 27], [11, 28], [11, 29], [11, 30], [11, 31], [11, 32]], 1);
  // 脖子、頭
  L.rows([[19, 17, 22], [20, 17, 22]], 'skin', 1);
  L.rows([[8, 13, 26], [9, 13, 26], [10, 13, 26], [11, 13, 26], [12, 13, 26], [13, 13, 26], [14, 13, 26], [15, 13, 26], [16, 13, 26], [17, 14, 25], [18, 15, 24]], 'skin');
  sym(L, [[12, 13], [12, 14]], 'skin');
  // 頭髮
  L.rows([[3, 15, 24], [4, 13, 26], [5, 12, 27], [6, 11, 28], [7, 11, 28], [8, 11, 28], [9, 11, 28]], 'hair');
  L.dots([[11, 10], [12, 10], [13, 10], [16, 10], [17, 10], [22, 10], [23, 10], [26, 10], [27, 10], [28, 10]], 'hair');
  sym(L, [[11, 11], [11, 12], [11, 13], [11, 14], [11, 15], [12, 11], [12, 12]], 'hair');
  L.dots([[15, 4], [14, 5], [16, 5], [13, 6], [18, 4], [19, 5], [21, 4]], 'hair', 4);
  L.dots([[14, 9], [19, 9], [20, 9], [25, 9], [15, 10], [24, 10]], 'hair', 1);
  for (let x = 13; x <= 26; x++) if (L.get(x, 11) === 'skin' && L.get(x, 10)) L.mark(x, 11, 1);
  // 臉
  L.dots([[15, 11], [16, 11], [23, 11], [24, 11]], 'brow');
  if (blink) {
    L.dots([[14, 13], [15, 13], [16, 13], [23, 13], [24, 13], [25, 13]], 'eye');
  } else {
    L.dots([[14, 12], [15, 12], [16, 12], [23, 12], [24, 12], [25, 12]], 'eye');
    L.dots([[15, 13], [23, 13]], 'white');
    L.dots([[16, 13], [24, 13], [15, 14], [16, 14], [23, 14], [24, 14]], 'iris');
  }
  L.dots([[14, 15], [15, 15], [24, 15], [25, 15]], 'blush');
  L.mark(20, 15, 1);
  L.dots([[19, 17], [20, 17]], 'lip');
  return L;
}

// ---------- 武器（握把在右手，hand 是手套材質，畫手指包住握把） ----------
function fingers(L, hand) {
  if (!hand) return;
  L.hline(28, 32, 34, hand).hline(28, 32, 36, hand);
  L.dots([[29, 34], [31, 34], [29, 36], [31, 36]], hand, 1);
}
function weapon(it, hand) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'blade') {
    const right = r >= 3 ? 32 : 31;
    for (let y = 7; y <= 28; y++) L.hline(29, right, y, 'metal');
    L.dots([[30, 5], [29, 6], [30, 6], [31, 6]], 'metal');
    for (let y = 7; y <= 27; y++) { L.mark(29, y, 4); L.mark(30, y, r >= 3 ? 2 : 1, r >= 3 ? 'glow' : 'metal'); }
    L.rows([[29, 25, 36], [30, 26, 35]], r >= 1 ? 'trim' : 'metal');
    if (r >= 4) L.dots([[24, 28], [23, 27], [37, 28], [38, 27], [24, 29], [37, 29]], 'gold');
    L.rect(30, 31, 2, 8, 'leather');
    for (let y = 32; y <= 38; y += 2) L.mark(31, y, 1);
    L.rect(29, 39, 4, 2, r >= 2 ? 'gem' : 'metal');
  } else if (it.tag === 'guard') {
    // 戰錘：錘頭偏右上，避開頭盔
    L.rect(30, 8, 2, 43, 'wood');
    for (let y = 12; y <= 48; y += 4) L.mark(31, y, 1);
    L.rows([[0, 28, 39], [1, 27, 40], [2, 27, 40], [3, 27, 40], [4, 27, 40], [5, 27, 40], [6, 27, 40], [7, 28, 39]], 'metal');
    L.rect(27, 1, 2, 6, 'metal', 1).rect(39, 1, 2, 6, 'metal', 1);
    L.dots([[30, 1], [36, 1], [30, 6], [36, 6]], 'metal', 4);
    L.hline(29, 38, 3, r >= 1 ? 'trim' : 'metal', r >= 1 ? null : 1);
    L.dots([[32, 5], [33, 6]], 'metal', 1);
    if (r >= 2) L.rows([[-2, 33, 34], [-1, 32, 35]], 'metal').rect(33, 2, 2, 3, 'gem');
    if (r >= 3) L.rows([[2, 24, 26], [3, 25, 26], [4, 24, 26], [2, 41, 43], [3, 41, 42], [4, 41, 43]], 'metal').hline(29, 38, 5, 'glow');
    if (r >= 4) L.hline(28, 39, 0, 'gold').hline(28, 39, 7, 'gold');
    L.rect(29, 51, 4, 1, 'metal');
  } else {
    L.rect(30, 10, 2, 44, 'wood');
    for (let y = 14; y <= 52; y += 5) L.mark(31, y, 1);
    if (r >= 1) L.rect(30, 22, 2, 2, 'trim');
    const big = r >= 4;
    L.ellipse(30.5, 5, big ? 4.2 : 3.3, big ? 4.2 : 3.3, 'orb');
    L.dots([[29, 3], [28, 4], [29, 4]], 'orb', 4);
    L.dots([[26, 8], [27, 9], [28, 10], [35, 8], [34, 9], [33, 10], [26, 7], [35, 7]], 'metal');
    L.hline(28, 33, 11, r >= 4 ? 'gold' : 'metal');
    if (r >= 2) L.dots([[25, 5], [25, 4], [36, 5], [36, 4], [25, 6], [36, 6]], 'metal');
    if (r >= 3) L.dots([[23, 1], [38, 1], [22, 3], [39, 3]], 'glow');
    if (r >= 4) L.dots([[24, 2], [37, 2], [24, 3], [37, 3]], 'gold');
  }
  fingers(L, hand);
  return L;
}

// ---------- 頭飾 ----------
function head(it) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'guard') {
    // 機甲頭盔：圓頂、發光護目鏡、面罩、耳側旋鈕
    L.rows([[3, 15, 19], [4, 13, 19], [5, 12, 19], [6, 11, 19], [7, 11, 19], [8, 11, 19], [9, 11, 19], [10, 11, 19], [11, 11, 19]], 'metal');
    L.rows([[12, 11, 13], [13, 11, 13], [14, 11, 13]], 'metal');
    L.rows([[12, 14, 19], [13, 14, 19], [14, 14, 19]], 'visor');
    L.rows([[15, 12, 19], [16, 12, 19], [17, 12, 19], [18, 13, 19], [19, 15, 19]], 'metal');
    L.rows([[12, 9, 10], [13, 9, 10], [14, 9, 10], [15, 9, 10]], 'joint');
    L.mirror(AXIS);
    L.dots([[15, 12], [16, 12], [17, 12], [15, 13]], 'white');
    L.vline(19, 3, 11, 'metal', 3).vline(20, 3, 11, 'metal', 1);
    L.hline(17, 22, 17, 'metal', 1).hline(17, 22, 18, 'metal', 0);
    L.dots([[14, 5], [13, 6], [14, 6]], 'metal', 4);
    L.dots([[25, 7], [26, 8], [13, 16], [14, 17]], 'metal', 1);
    L.hline(11, 28, 11, r >= 1 ? 'trim' : 'metal', r >= 1 ? null : 1);
    if (r >= 2) L.rows([[0, 19, 20], [1, 18, 21], [2, 18, 21]], 'trim');
    if (r >= 3) sym(L, [[9, 6], [8, 5], [7, 4], [7, 3], [8, 6], [9, 7], [6, 2]], 'wood');
    if (r >= 4) L.dots([[14, 1], [14, 2], [25, 1], [25, 2], [19, 0], [20, 0]], 'gold').hline(11, 28, 11, 'gold');
  } else if (it.tag === 'blade') {
    // 寬沿冒險帽：方形帽冠、帽帶、徽章、羽毛
    L.rows([[1, 14, 19], [2, 13, 19], [3, 13, 19], [4, 13, 19], [5, 13, 19], [6, 13, 19], [7, 13, 19]], 'leather');
    L.rows([[8, 6, 19], [9, 6, 19]], 'leather');
    L.mirror(AXIS);
    L.mark(19, 1, 1).mark(20, 1, 1);
    L.hline(13, 26, 6, r >= 1 ? 'trim' : 'belt').hline(13, 26, 7, r >= 1 ? 'trim' : 'belt', 1);
    L.hline(6, 33, 9, 'leather', 1);
    L.rect(18, 5, 4, 3, r >= 4 ? 'gold' : 'metal');
    L.dots([[15, 2], [14, 3], [15, 3]], 'leather', 4);
    if (r >= 2) L.rect(19, 6, 2, 1, 'gem');
    if (r >= 3) L.dots([[27, 5], [28, 4], [29, 3], [30, 2], [31, 1], [28, 5], [29, 4], [30, 3], [31, 2], [32, 1]], 'trim');
    if (r >= 4) L.hline(13, 26, 6, 'gold');
  } else {
    // 法師帽：寬帽沿、往後彎的帽尖、帽帶
    L.rows([[9, 5, 19], [10, 7, 19]], 'cloth');
    L.rows([[8, 11, 19], [7, 12, 19], [6, 12, 19], [5, 13, 19], [4, 13, 19]], 'cloth');
    L.mirror(AXIS);
    L.rows([[3, 13, 19], [2, 12, 17], [1, 11, 15], [0, 9, 13], [-1, 7, 10]], 'cloth');
    L.hline(12, 27, 8, r >= 1 ? 'trim' : 'leather').hline(12, 27, 7, r >= 1 ? 'trim' : 'leather', 1);
    L.dots([[15, 4], [15, 5], [14, 2], [13, 1]], 'cloth', 4);
    if (r >= 2) L.rect(19, 7, 2, 2, 'gem');
    if (r >= 3) L.dots([[16, 3], [23, 5], [10, 0], [25, 7]], 'glow');
    if (r >= 4) L.dots([[22, 3], [23, 3], [24, 4], [24, 5], [23, 6]], 'gold').hline(7, 32, 10, 'gold');
  }
  return L;
}

// ---------- 上衣 ----------
function bodyArmor(it) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'guard') {
    // 機甲：胸甲、接縫、通風口、螺栓、大護肩、關節、粗護臂、手套
    L.rows([[21, 13, 19], [22, 12, 19]], 'metal');
    for (let y = 23; y <= 30; y++) L.hline(12, 19, y, 'metal');
    L.hline(14, 19, 31, 'joint').hline(14, 19, 32, 'joint');
    L.hline(12, 19, 33, 'metal').hline(12, 19, 34, 'metal');
    L.rows([[35, 17, 19], [36, 17, 19], [37, 18, 19]], 'metal');
    L.rows([[18, 8, 12], [19, 7, 13], [20, 6, 13], [21, 6, 13], [22, 6, 13], [23, 6, 12], [24, 7, 12], [25, 8, 11]], 'metal');
    for (let y = 26; y <= 28; y++) L.hline(8, 11, y, 'joint');
    for (let y = 29; y <= 34; y++) L.hline(6, 12, y, 'metal');
    for (let y = 35; y <= 38; y++) L.hline(7, 11, y, 'joint');
    L.mirror(AXIS);
    L.hline(12, 27, 26, 'metal', 1);
    L.vline(19, 22, 25, 'metal', 1).vline(20, 22, 25, 'metal', 3);
    L.hline(23, 25, 23, 'metal', 1).hline(23, 25, 25, 'metal', 1);
    symMark(L, [[13, 22], [13, 29], [9, 21]], 4);
    symMark(L, [[13, 23], [13, 30], [9, 22]], 1);
    symMark(L, [[6, 31], [7, 31], [8, 31], [9, 31], [10, 31], [11, 31], [12, 31]], 1);
    L.dots([[15, 24], [16, 25], [24, 28], [25, 29], [8, 20], [32, 32], [33, 33], [17, 34]], 'metal', 1);
    symMark(L, [[8, 36], [10, 36]], 1);
    L.rect(17, 33, 6, 2, r >= 1 ? 'trim' : 'metal', r >= 1 ? null : 3);
    if (r >= 1) { sym(L, [[7, 24], [8, 25], [9, 25], [10, 25], [11, 25], [12, 24]], 'trim'); L.hline(13, 26, 21, 'trim'); }
    if (r >= 2) L.rect(19, 23, 2, 2, 'gem');
    if (r >= 3) { sym(L, [[7, 17], [8, 16], [9, 17], [6, 18]], 'metal'); L.hline(14, 25, 26, 'glow'); }
    if (r >= 4) { L.hline(13, 26, 21, 'gold'); L.rect(17, 33, 6, 2, 'gold'); sym(L, [[8, 25], [9, 25], [10, 25], [11, 25]], 'gold'); }
  } else if (it.tag === 'blade') {
    // 冒險者皮甲：V 領、斜背帶、皮護臂、手套、腰包
    L.rows([[21, 13, 19], [22, 12, 19]], 'leather');
    for (let y = 23; y <= 31; y++) L.hline(12, 19, y, 'leather');
    for (let y = 22; y <= 28; y++) L.hline(8, 11, y, 'cloth');
    for (let y = 29; y <= 33; y++) L.hline(7, 11, y, 'leather');
    for (let y = 34; y <= 38; y++) L.hline(7, 11, y, 'leather');
    L.mirror(AXIS);
    L.dots([[18, 21], [19, 21], [20, 21], [21, 21], [19, 22], [20, 22]], 'skin');
    L.dots([[19, 23], [20, 23]], 'cloth');
    for (let i = 0; i < 10; i++) { L.set(13 + i, 22 + i, 'belt'); L.set(14 + i, 22 + i, 'belt'); }
    L.hline(12, 27, 32, 'belt').hline(12, 27, 33, 'belt').rect(19, 32, 2, 2, r >= 2 ? 'gem' : 'buckle');
    L.rect(22, 33, 3, 3, 'leather');
    for (let y = 24; y <= 30; y += 2) { L.mark(13, y, 3); L.mark(26, y, 1); }
    symMark(L, [[7, 30], [7, 32], [8, 36], [10, 36]], 1);
    if (r >= 1) { L.hline(12, 27, 31, 'trim'); sym(L, [[7, 29], [8, 29], [9, 29], [10, 29], [11, 29]], 'trim'); }
    if (r >= 2) L.rows([[19, 8, 12], [20, 7, 13], [21, 7, 13], [22, 7, 12], [23, 8, 11]], 'metal').mark(10, 20, 4);
    if (r >= 3) {
      L.rows([[19, 27, 31], [20, 26, 32], [21, 26, 32], [22, 27, 32], [23, 28, 31]], 'metal');
      L.rows([[21, 14, 25], [22, 13, 26], [23, 11, 13], [24, 10, 12], [25, 10, 11], [26, 9, 10]], 'cape');
      L.dots([[19, 21], [20, 21], [19, 22], [20, 22]], 'cape', 1);
    }
    if (r >= 4) sym(L, [[8, 19], [9, 19], [10, 19], [11, 19]], 'gold');
  } else {
    // 法袍：長袍、寬袖、披肩、腰帶與垂帶、中央滾邊
    L.rows([[21, 13, 19], [22, 12, 19]], 'cloth');
    for (let y = 23; y <= 36; y++) L.hline(12, 19, y, 'cloth');
    for (let y = 37; y <= 44; y++) L.hline(11, 19, y, 'cloth');
    L.hline(10, 19, 45, 'cloth').hline(10, 19, 46, 'cloth');
    for (let y = 22; y <= 24; y++) L.hline(8, 11, y, 'cloth');
    for (let y = 25; y <= 28; y++) L.hline(7, 11, y, 'cloth');
    for (let y = 29; y <= 32; y++) L.hline(6, 11, y, 'cloth');
    L.rows([[20, 10, 15], [21, 9, 15]], 'cloth');
    L.mirror(AXIS);
    L.dots([[18, 21], [19, 21], [20, 21], [21, 21]], 'skin');
    L.vline(19, 22, 46, r >= 1 ? 'trim' : 'cloth', r >= 1 ? null : 1).vline(20, 22, 46, r >= 1 ? 'trim' : 'cloth', 1);
    L.hline(12, 27, 31, 'leather').hline(12, 27, 32, 'leather');
    L.rect(21, 33, 2, 5, 'leather');
    for (let y = 37; y <= 45; y += 2) { L.mark(14, y, 1); L.mark(25, y + 1, 1); }
    symMark(L, [[6, 32], [7, 32], [8, 32], [9, 32]], 1);
    if (r >= 1) { L.hline(10, 29, 46, 'trim'); sym(L, [[9, 21], [10, 20], [11, 20], [12, 20], [13, 20], [14, 20], [15, 20]], 'trim'); }
    if (r >= 2) { L.rect(19, 31, 2, 2, 'gem'); L.dots([[13, 44], [16, 43], [23, 43], [26, 44]], 'glow'); }
    if (r >= 3) sym(L, [[13, 17], [13, 18], [14, 18], [13, 19], [14, 19], [12, 19], [12, 18]], 'cloth');
    if (r >= 4) { L.hline(10, 29, 46, 'gold'); L.dots([[19, 24], [20, 24], [19, 38], [20, 38]], 'gold'); }
  }
  return L;
}

// 史詩以上的上衣附披風，畫在身體後面；f = 飄動影格 0–2（往左後方飄）
function cape(it, f = 0) {
  const L = mk();
  L.rows([[19, 10, 29], [20, 9, 30], [21, 8, 31]], 'cape');
  for (let y = 22; y <= 47; y++) {
    const t = (y - 22) / 25;
    const sway = Math.round(t * t * [0, 2, 4][f]);
    const left = Math.round(8 - t * 5) - sway, right = Math.round(31 + t * 2) - Math.round(sway / 2);
    L.hline(left, right, y, 'cape');
    L.set(left, y, 'lining');
  }
  for (let x = 3; x <= 33; x++) if ((x + f) % 3 === 0 && L.get(x, 47)) L.set(x, 48, 'cape');
  for (let y = 25; y <= 45; y += 4) { L.mark(10 - Math.round((y - 22) / 6), y, 1); L.mark(29, y + 2, 1); }
  if (it.rarity >= 4) for (let x = 0; x < W; x++) if (L.get(x, 47) === 'cape') L.mark(x, 47, 2, 'gold');
  return L;
}

// ---------- 鞋子 ----------
function feet(it) {
  const L = mk(), r = it.rarity;
  if (it.tag === 'guard') {
    // 機甲靴：護膝、護脛、腳踝關節、厚重靴子
    L.rows([[39, 13, 17], [40, 12, 18], [41, 12, 18], [42, 13, 17]], 'metal');
    for (let y = 43; y <= 46; y++) L.hline(13, 17, y, 'metal');
    L.hline(13, 17, 47, 'joint');
    for (let y = 48; y <= 49; y++) L.hline(11, 18, y, 'metal');
    L.hline(10, 18, 50, 'metal').hline(10, 18, 51, 'metal').hline(10, 18, 52, 'joint');
    L.mirror(AXIS);
    symMark(L, [[15, 40]], 4);
    symMark(L, [[13, 44], [14, 44], [15, 44], [16, 44], [17, 44]], 1);
    symMark(L, [[11, 48], [12, 48], [13, 48], [14, 48], [15, 48], [16, 48], [17, 48], [18, 48]], 3);
    L.dots([[16, 49], [17, 50], [23, 45], [24, 46]], 'metal', 1);
    if (r >= 1) sym(L, [[13, 46], [14, 46], [15, 46], [16, 46], [17, 46]], 'trim');
    if (r >= 2) sym(L, [[15, 41]], 'gem');
    if (r >= 3) sym(L, [[10, 47], [9, 46], [10, 46], [9, 45], [8, 45]], 'metal');
    if (r >= 4) { L.hline(10, 18, 52, 'gold'); L.hline(21, 29, 52, 'gold'); }
  } else if (it.tag === 'blade') {
    // 皮靴：翻邊、綁帶與扣環
    for (let y = 41; y <= 48; y++) L.hline(12, 18, y, 'leather');
    L.hline(11, 18, 41, 'leather', 3).hline(11, 18, 42, 'leather', 3);
    L.hline(11, 18, 49, 'leather').hline(10, 18, 50, 'leather').hline(10, 18, 51, 'leather').hline(10, 18, 52, 'belt');
    L.hline(12, 18, 45, 'belt');
    L.mirror(AXIS);
    sym(L, [[15, 45]], r >= 2 ? 'gem' : 'buckle');
    if (r >= 1) { L.hline(11, 18, 41, 'trim'); L.hline(21, 28, 41, 'trim'); }
    if (r >= 3) sym(L, [[10, 42], [9, 41], [10, 41], [9, 40], [8, 40]], 'trim');
    if (r >= 4) { L.hline(10, 18, 52, 'gold'); L.hline(21, 29, 52, 'gold'); }
  } else {
    // 布鞋：鞋頭往上捲
    for (let y = 47; y <= 51; y++) L.hline(12, 18, y, 'cloth');
    L.dots([[11, 50], [10, 50], [9, 49], [9, 48]], 'cloth');
    L.hline(11, 18, 52, 'leather');
    L.mirror(AXIS);
    symMark(L, [[13, 48], [14, 48], [15, 48], [16, 48], [17, 48], [13, 50], [14, 50], [15, 50], [16, 50], [17, 50]], 1);
    if (r >= 1) { L.hline(12, 18, 47, 'trim'); L.hline(21, 27, 47, 'trim'); }
    if (r >= 2) sym(L, [[9, 48]], 'gem');
    if (r >= 3) sym(L, [[14, 49], [16, 49]], 'glow');
    if (r >= 4) { L.hline(11, 18, 52, 'gold'); L.hline(21, 28, 52, 'gold'); }
  }
  return L;
}

// ---------- 動畫影格 ----------
// 呼吸：腰部以上（含手臂、頭、武器）往下移一格
function breathe(grid) {
  const out = grid.map((row) => row.slice());
  for (let y = SPLIT; y >= 1; y--) {
    for (let x = 0; x < W; x++) {
      const c = grid[y - 1][x];
      if (c || y < SPLIT) out[y][x] = c;
    }
  }
  out[0] = new Array(W).fill(null);
  return out;
}

const BUILD = { weapon, head, body: bodyArmor, feet };
const ORDER = ['feet', 'body', 'head', 'weapon'];
const HAND = { guard: 'joint', blade: 'leather' };

export function gearKey(slot, it) { return `${slot}-${it.tag || 'none'}-${it.tier}-${it.rarity}`; }

const gridCache = new Map();
function cached(key, fn) { if (!gridCache.has(key)) gridCache.set(key, fn()); return gridCache.get(key); }

// 角色的各個部位（由下往上疊）。frames({ breath, blink, cape }) 回傳該影格的色塊陣列，key 用來快取貼圖。
export function heroParts(equip) {
  const parts = [];
  const body = equip && equip.body;
  if (body && body.rarity >= 3) {
    const k = 'cape-' + gearKey('body', body);
    parts.push({ id: 'cape', key: k, frames: (o) => cached(`${k}|${o.cape}|${o.breath}`, () => {
      const g = render(cape(body, o.cape), gearMats(body));
      return o.breath ? breathe(g) : g;
    }) });
  }
  parts.push({ id: 'base', key: 'base', frames: (o) => cached(`base|${o.blink ? 1 : 0}|${o.breath}`, () => {
    const g = render(baseLayer(o.blink), BODY);
    return o.breath ? breathe(g) : g;
  }) });
  for (const slot of ORDER) {
    const it = equip && equip[slot];
    if (!it) continue;
    const hand = slot === 'weapon' ? (body ? HAND[body.tag] || 'skin' : 'skin') : null;
    const k = gearKey(slot, it) + (hand ? '-' + hand : '');
    parts.push({ id: slot, key: k, frames: (o) => cached(`${k}|${o.breath}`, () => {
      const L = slot === 'weapon' ? weapon(it, hand) : BUILD[slot](it);
      const g = render(L, gearMats(it));
      return o.breath ? breathe(g) : g;
    }) });
  }
  return parts;
}

// 單一裝備的圖（背包圖示用，不含手）
export function gearGrid(slot, it) {
  return render(slot === 'weapon' ? weapon(it, null) : BUILD[slot](it), gearMats(it));
}

// 疊成一張靜態圖（縮圖、預覽用）
export function heroGrid(equip, o = { breath: 0, blink: false, cape: 0 }) {
  const out = Array.from({ length: H }, () => new Array(W).fill(null));
  for (const p of heroParts(equip)) p.frames(o).forEach((row, y) => row.forEach((c, x) => { if (c) out[y][x] = c; }));
  return out;
}

// 相容舊介面：每層一張（不分影格）
export function heroLayers(equip) {
  return heroParts(equip).map((p) => ({ key: p.key, grid: p.frames({ breath: 0, blink: false, cape: 0 }) }));
}
