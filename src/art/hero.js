// 角色與裝備的像素圖（40×46，正面）。每個部位一個圖層，疊起來就是角色。
// 造型：流派決定款式（劍士輕甲、守衛板甲、術士法袍），材料階級決定材質，稀有度決定滾邊、寶石與裝飾。
import { Layer, render } from './pixel.js';
import { BODY, gearMats } from './palette.js';

export const W = 40, H = 46, AXIS = 15.5, OY = 2;
const mk = () => new Layer(W, H, OY);

// ---------- 身體 ----------
function baseLayer() {
  const L = mk();
  // 腿與鞋
  L.rows([[30, 11, 20], [31, 11, 20]], 'pants');
  for (let y = 32; y <= 38; y++) L.hline(11, 14, y, 'pants');
  L.rows([[39, 10, 14], [40, 10, 14], [41, 9, 14]], 'shoe');
  // 上衣、腰帶
  L.rows([[19, 11, 15], [20, 10, 15]], 'tunic');
  for (let y = 21; y <= 27; y++) L.hline(10, 15, y, 'tunic');
  L.hline(10, 15, 28, 'belt').hline(10, 15, 29, 'tunic');
  // 手臂：短袖 + 皮膚
  L.rows([[20, 8, 9], [21, 8, 9], [22, 8, 9], [23, 8, 9]], 'tunic');
  for (let y = 24; y <= 29; y++) L.hline(8, 9, y, 'skin');
  L.rows([[30, 8, 9], [31, 8, 9]], 'skin');
  L.mirror(AXIS);
  // 腰帶扣、衣服摺痕
  L.rect(15, 28, 2, 1, 'buckle');
  for (let y = 22; y <= 27; y += 2) L.mark(13, y, 1);
  L.vline(15, 21, 27, 'tunic', 1);
  for (let y = 24; y <= 29; y++) { L.mark(9, y, 1); L.mark(22, y, 1); }
  for (let y = 32; y <= 38; y++) { L.mark(14, y, 1); L.mark(17, y, 1); }
  // 脖子
  L.hline(13, 18, 18, 'skin', 1);
  // 頭
  L.rows([[8, 9, 22], [9, 9, 22], [10, 9, 22], [11, 9, 22], [12, 9, 22], [13, 9, 22], [14, 9, 22], [15, 9, 22], [16, 10, 21], [17, 11, 20]], 'skin');
  L.dots([[8, 12], [8, 13], [23, 12], [23, 13]], 'skin');
  // 頭髮：頭頂、瀏海、兩側
  L.rows([[2, 12, 19], [3, 10, 21], [4, 9, 22], [5, 8, 23], [6, 8, 23], [7, 8, 23], [8, 8, 23]], 'hair');
  L.dots([[8, 9], [9, 9], [10, 9], [13, 9], [14, 9], [17, 9], [18, 9], [21, 9], [22, 9], [23, 9], [8, 10], [9, 10], [22, 10], [23, 10],
    [8, 11], [23, 11], [7, 10], [7, 11], [24, 10], [24, 11], [7, 12], [24, 12]], 'hair');
  L.dots([[12, 3], [11, 4], [13, 4], [10, 5], [15, 3], [16, 4]], 'hair', 4);
  L.dots([[9, 8], [12, 8], [15, 8], [16, 8], [19, 8], [22, 8], [14, 9], [17, 9]], 'hair', 1);
  // 瀏海下的陰影
  for (let x = 9; x <= 22; x++) if (L.get(x, 10) === 'skin') L.mark(x, 10, 1);
  L.dots([[11, 10], [12, 10], [19, 10], [20, 10]], 'skin', 1);
  // 臉：眼睛（睫毛、高光、虹膜）、腮紅、鼻子、嘴
  L.dots([[10, 11], [11, 11], [12, 11], [19, 11], [20, 11], [21, 11]], 'eye');
  L.dots([[11, 12], [19, 12]], 'white');
  L.dots([[12, 12], [20, 12], [11, 13], [12, 13], [19, 13], [20, 13]], 'iris');
  L.dots([[10, 14], [21, 14]], 'blush');
  L.mark(16, 14, 1);
  L.dots([[15, 16], [16, 16]], 'lip');
  return L;
}

// ---------- 裝備 ----------
const rar = (it) => it.rarity;

function weapon(it) {
  const L = mk(), r = rar(it);
  if (it.tag === 'blade') {
    // 長劍：劍身、血槽、護手、握柄、劍首
    const wide = r >= 3;
    for (let y = 8; y <= 26; y++) L.hline(wide ? 23 : 24, 26, y, 'metal');
    L.dots([[25, 6], [24, 7], [25, 7], [26, 7]], 'metal');
    if (wide) L.dots([[24, 7]], 'metal');
    for (let y = 9; y <= 25; y++) { L.mark(wide ? 23 : 24, y, 4); L.mark(25, y, r >= 3 ? 2 : 1, r >= 3 ? 'glow' : 'metal'); }
    L.hline(r >= 4 ? 19 : 21, r >= 4 ? 31 : 28, 27, r >= 1 ? 'trim' : 'metal');
    L.hline(22, 27, 28, r >= 1 ? 'trim' : 'metal');
    if (r >= 4) L.dots([[19, 26], [31, 26], [20, 26], [30, 26]], 'gold');
    L.rect(24, 29, 2, 5, 'leather');
    L.dots([[24, 30], [25, 32]], 'leather', 1);
    L.rect(24, 34, 2, 2, r >= 2 ? 'gem' : 'metal');
  } else if (it.tag === 'guard') {
    // 戰錘：木柄、錘頭、鉚釘
    L.rect(25, 16, 2, 22, 'wood');
    for (let y = 18; y <= 36; y += 3) L.mark(26, y, 1);
    L.rows([[9, 22, 29], [10, 21, 30], [11, 21, 30], [12, 21, 30], [13, 21, 30], [14, 21, 30], [15, 22, 29]], 'metal');
    L.vline(25, 10, 14, 'metal', 1).vline(26, 10, 14, 'metal', 1);
    L.dots([[22, 11], [29, 11], [22, 13], [29, 13]], 'metal', 4);
    if (r >= 1) L.hline(21, 30, 12, 'trim');
    if (r >= 2) L.dots([[25, 7], [26, 7], [25, 8], [26, 8]], 'metal').dots([[25, 12], [26, 12]], 'gem');
    if (r >= 3) L.dots([[19, 11], [20, 11], [20, 12], [31, 11], [32, 11], [31, 12]], 'metal').hline(22, 29, 14, 'glow');
    if (r >= 4) L.dots([[21, 9], [30, 9], [21, 15], [30, 15]], 'gold').dots([[25, 5], [26, 5], [25, 6], [26, 6]], 'gold');
    L.rect(25, 38, 2, 1, 'metal');
  } else {
    // 法杖：木杖、爪托、寶珠
    L.rect(25, 11, 2, 31, 'wood');
    for (let y = 14; y <= 40; y += 4) L.mark(26, y, 1);
    if (r >= 1) L.rect(25, 20, 2, 2, 'trim');
    const big = r >= 4;
    L.ellipse(25.5, 6, big ? 3.6 : 2.6, big ? 3.6 : 2.6, 'orb');
    L.dots([[24, 5], [24, 4]], 'orb', 4);
    L.dots([[23, 9], [22, 8], [28, 9], [29, 8], [22, 7], [29, 7]], 'metal');
    L.hline(24, 27, 10, 'metal');
    if (r >= 2) L.dots([[21, 6], [21, 5], [30, 6], [30, 5]], 'metal');
    if (r >= 3) L.dots([[20, 3], [31, 3], [19, 2], [32, 2]], 'glow');
    if (r >= 4) L.dots([[20, 5], [20, 4], [31, 5], [31, 4], [19, 3], [32, 3]], 'gold');
  }
  return L;
}

function head(it) {
  const L = mk(), r = rar(it);
  if (it.tag === 'blade') {
    // 頭巾：皮革頭帶、額前護片、飄帶
    L.rows([[7, 8, 23], [8, 8, 23]], 'leather');
    L.dots([[7, 9], [6, 10], [5, 10], [6, 11], [5, 12], [4, 12], [6, 9]], 'leather');
    L.dots([[5, 11], [4, 13]], 'leather', 1);
    if (r >= 1) L.rows([[6, 13, 18], [7, 12, 19], [8, 13, 18]], 'metal').hline(13, 18, 9, 'trim');
    if (r >= 2) L.dots([[15, 7], [16, 7]], 'gem');
    if (r >= 3) L.dots([[24, 6], [25, 5], [26, 4], [24, 7], [25, 6], [7, 6], [6, 5], [5, 4], [7, 7], [6, 6]], 'trim');
    if (r >= 4) L.rows([[6, 13, 18], [8, 13, 18]], 'gold').dots([[3, 13], [3, 14], [4, 14]], 'leather');
  } else if (it.tag === 'guard') {
    // 頭盔：圓頂、眉帶、鼻樑護片、護頰
    L.rows([[1, 12, 19], [2, 10, 21], [3, 9, 22], [4, 8, 23], [5, 8, 23], [6, 8, 23], [7, 8, 23], [8, 8, 23]], 'metal');
    L.hline(8, 23, 9, r >= 1 ? 'trim' : 'metal');
    L.rect(15, 9, 2, 4, 'metal');
    for (let y = 10; y <= 16; y++) { L.hline(7, 9, y, 'metal'); L.hline(22, 24, y, 'metal'); }
    L.dots([[8, 17], [23, 17]], 'metal');
    L.dots([[11, 3], [12, 2], [10, 4]], 'metal', 4);
    L.vline(15, 2, 7, 'metal', 1);
    L.dots([[9, 12], [22, 12], [9, 14], [22, 14]], 'metal', 1);
    if (r >= 2) L.dots([[15, 0], [16, 0], [14, 0], [13, 0], [12, 0], [11, 1], [10, 1], [9, 2], [8, 2], [7, 3], [6, 4], [15, -1]], 'trim').dots([[15, 5], [16, 5]], 'gem');
    if (r >= 3) L.dots([[6, 5], [5, 4], [4, 3], [4, 2], [25, 5], [26, 4], [27, 3], [27, 2], [5, 5], [26, 5]], 'wood');
    if (r >= 4) L.dots([[12, 0], [12, -1], [15, -1], [16, -1], [19, 0], [19, -1]], 'gold').hline(8, 23, 9, 'gold');
  } else {
    // 法師帽：寬帽沿、往後彎的帽尖、帽帶
    L.rows([[8, 5, 26], [9, 6, 25]], 'cloth');
    L.rows([[7, 9, 22], [6, 10, 21], [5, 10, 20], [4, 11, 19], [3, 11, 18], [2, 10, 16], [1, 9, 13], [0, 7, 10]], 'cloth');
    L.dots([[6, 1], [5, 1], [5, 2]], 'cloth');
    L.hline(9, 22, 7, r >= 1 ? 'trim' : 'leather');
    L.dots([[12, 4], [12, 3], [11, 2]], 'cloth', 4);
    if (r >= 2) L.dots([[15, 7], [16, 7], [15, 6], [16, 6]], 'gem');
    if (r >= 3) L.dots([[18, 3], [13, 5], [19, 5], [4, 0]], 'glow');
    if (r >= 4) L.dots([[14, 6], [17, 6], [14, 5], [17, 5]], 'gold').hline(5, 26, 9, 'gold');
  }
  return L;
}

function bodyArmor(it) {
  const L = mk(), r = rar(it);
  if (it.tag === 'blade') {
    // 皮甲：V 領、斜背帶、腰帶、袖子
    L.rows([[19, 11, 15], [20, 10, 15]], 'leather');
    for (let y = 21; y <= 29; y++) L.hline(10, 15, y, 'leather');
    for (let y = 20; y <= 26; y++) L.hline(8, 9, y, 'leather');
    L.mirror(AXIS);
    L.dots([[15, 19], [16, 19], [15, 20], [16, 20], [15, 21], [16, 21]], 'skin');
    L.dots([[15, 22], [16, 22]], 'leather', 1);
    for (let i = 0; i < 9; i++) L.set(11 + i, 20 + i, 'belt');
    L.hline(10, 21, 28, 'belt').rect(15, 28, 2, 1, 'buckle');
    for (let y = 21; y <= 26; y += 2) { L.mark(12, y, 1); L.mark(19, y + 1, 1); }
    if (r >= 1) L.hline(10, 21, 29, 'trim').dots([[8, 26], [9, 26], [22, 26], [23, 26]], 'trim');
    if (r >= 2) L.rows([[18, 8, 11], [19, 7, 11], [20, 7, 11], [21, 7, 10]], 'metal').dots([[15, 28], [16, 28]], 'gem');
    if (r >= 3) L.rows([[18, 20, 23], [19, 20, 24], [20, 21, 24], [21, 21, 24]], 'metal').rows([[18, 12, 19], [19, 11, 13], [20, 10, 12], [21, 10, 11]], 'cape');
    if (r >= 4) L.dots([[8, 19], [9, 18], [22, 18], [23, 19]], 'gold');
  } else if (it.tag === 'guard') {
    // 板甲：胸甲、大護肩、護臂、護手、腰甲
    L.rows([[19, 10, 15], [20, 9, 15]], 'metal');
    for (let y = 21; y <= 28; y++) L.hline(10, 15, y, 'metal');
    L.rows([[29, 10, 15], [30, 10, 13], [31, 11, 13]], 'metal');
    L.rows([[17, 7, 10], [18, 6, 11], [19, 5, 11], [20, 5, 10], [21, 6, 9]], 'metal');
    for (let y = 22; y <= 29; y++) L.hline(7, 9, y, 'metal');
    L.rows([[30, 7, 9], [31, 8, 9]], 'metal');
    L.mirror(AXIS);
    L.vline(15, 20, 27, 'metal', 4).vline(16, 20, 27, 'metal', 1);
    L.hline(10, 21, 24, 'metal', 1);
    L.hline(10, 21, 29, 'leather');
    L.dots([[6, 19], [7, 18], [8, 17]], 'metal', 4);
    L.dots([[8, 25], [8, 27], [23, 25], [23, 27]], 'metal', 1);
    if (r >= 1) L.dots([[5, 21], [6, 21], [6, 22], [26, 21], [25, 21], [25, 22]], 'trim').hline(10, 21, 19, 'trim');
    if (r >= 2) L.rect(15, 22, 2, 2, 'gem');
    if (r >= 3) L.dots([[6, 16], [7, 15], [25, 16], [24, 15], [5, 17], [26, 17]], 'metal').dots([[14, 21], [17, 21], [14, 24], [17, 24]], 'glow');
    if (r >= 4) L.hline(10, 21, 19, 'gold').dots([[15, 21], [16, 21], [15, 24], [16, 24]], 'gold');
  } else {
    // 法袍：長袍蓋到小腿、寬袖、腰帶、中央滾邊
    L.rows([[19, 11, 15], [20, 10, 15]], 'cloth');
    for (let y = 21; y <= 32; y++) L.hline(10, 15, y, 'cloth');
    for (let y = 33; y <= 38; y++) L.hline(9, 15, y, 'cloth');
    L.rows([[20, 8, 9], [21, 8, 9], [22, 8, 9], [23, 7, 9], [24, 7, 9], [25, 6, 9], [26, 6, 9], [27, 6, 9], [28, 6, 9]], 'cloth');
    L.mirror(AXIS);
    L.dots([[15, 19], [16, 19], [15, 20], [16, 20]], 'skin');
    L.hline(10, 21, 27, 'leather');
    L.vline(15, 21, 38, r >= 1 ? 'trim' : 'cloth', r >= 1 ? null : 1).vline(16, 21, 38, r >= 1 ? 'trim' : 'cloth', 1);
    for (let y = 30; y <= 37; y += 2) { L.mark(12, y, 1); L.mark(19, y + 1, 1); }
    L.dots([[6, 28], [7, 28], [24, 28], [25, 28]], 'cloth', 1);
    if (r >= 1) L.hline(9, 22, 38, 'trim').dots([[6, 28], [7, 28], [8, 28], [23, 28], [24, 28], [25, 28]], 'trim');
    if (r >= 2) L.rect(15, 27, 2, 1, 'gem').dots([[11, 36], [13, 35], [18, 35], [20, 36]], 'glow');
    if (r >= 3) L.rows([[16, 9, 11], [17, 9, 11], [18, 10, 12], [16, 20, 22], [17, 20, 22], [18, 19, 21]], 'cloth');
    if (r >= 4) L.hline(9, 22, 38, 'gold').dots([[15, 21], [16, 21], [15, 33], [16, 33]], 'gold');
  }
  return L;
}

// 史詩以上的上衣附披風，畫在身體後面
function cape(it) {
  const L = mk();
  L.rows([[19, 9, 15], [20, 8, 15]], 'cape');
  for (let y = 21; y <= 40; y++) L.hline(Math.max(4, 8 - Math.floor((y - 20) / 5)), 15, y, 'cape');
  L.mirror(AXIS);
  for (let y = 24; y <= 40; y += 3) { L.mark(9, y, 1); L.mark(22, y + 1, 1); }
  L.hline(5, 26, 41, it.rarity >= 4 ? 'gold' : 'lining');
  return L;
}

function feet(it) {
  const L = mk(), r = rar(it);
  if (it.tag === 'blade') {
    // 皮靴：翻邊、綁帶
    for (let y = 34; y <= 38; y++) L.hline(10, 14, y, 'leather');
    L.rows([[39, 10, 14], [40, 9, 14], [41, 8, 14]], 'leather');
    L.mirror(AXIS);
    L.hline(10, 14, 34, r >= 1 ? 'trim' : 'leather', r >= 1 ? null : 3).hline(17, 21, 34, r >= 1 ? 'trim' : 'leather', r >= 1 ? null : 3);
    L.hline(10, 14, 37, 'belt').hline(17, 21, 37, 'belt');
    if (r >= 2) L.dots([[12, 37], [19, 37]], 'gem');
    if (r >= 3) L.dots([[9, 35], [8, 34], [9, 36], [22, 35], [23, 34], [22, 36]], 'trim');
    if (r >= 4) L.dots([[8, 41], [9, 41], [23, 41], [22, 41]], 'gold');
  } else if (it.tag === 'guard') {
    // 鐵靴：護膝、護脛、尖頭鐵鞋
    for (let y = 32; y <= 38; y++) L.hline(10, 14, y, 'metal');
    L.rows([[39, 10, 14], [40, 9, 14], [41, 8, 14]], 'metal');
    L.mirror(AXIS);
    L.rect(11, 32, 3, 2, 'metal', 4).rect(18, 32, 3, 2, 'metal', 4);
    L.hline(10, 14, 35, 'metal', 1).hline(17, 21, 35, 'metal', 1);
    if (r >= 1) L.hline(10, 14, 38, 'trim').hline(17, 21, 38, 'trim');
    if (r >= 2) L.dots([[12, 33], [19, 33]], 'gem');
    if (r >= 3) L.dots([[9, 33], [8, 32], [22, 33], [23, 32]], 'metal');
    if (r >= 4) L.hline(8, 14, 41, 'gold').hline(17, 23, 41, 'gold');
  } else {
    // 布鞋：鞋頭往上捲
    L.rows([[38, 10, 14], [39, 10, 14], [40, 9, 14], [41, 9, 14]], 'cloth');
    L.dots([[8, 40], [7, 39]], 'cloth');
    L.mirror(AXIS);
    L.hline(10, 14, 38, r >= 1 ? 'trim' : 'cloth', r >= 1 ? null : 1).hline(17, 21, 38, r >= 1 ? 'trim' : 'cloth', r >= 1 ? null : 1);
    if (r >= 2) L.dots([[7, 39], [24, 39]], 'gem');
    if (r >= 3) L.dots([[12, 36], [19, 36], [11, 37], [20, 37]], 'glow');
    if (r >= 4) L.hline(9, 14, 41, 'gold').hline(17, 22, 41, 'gold');
  }
  return L;
}

const BUILD = { weapon, head, body: bodyArmor, feet };
const ORDER = ['feet', 'body', 'head', 'weapon'];

export function gearKey(slot, it) { return `gear-${slot}-${it.tag || 'none'}-${it.tier}-${it.rarity}`; }

let baseCache = null;
// 回傳 [{ key, grid }]，由下往上疊
export function heroLayers(equip) {
  const out = [];
  const body = equip && equip.body;
  if (body && body.rarity >= 3) out.push({ key: `cape-${body.tag}-${body.tier}-${body.rarity}`, grid: render(cape(body), gearMats(body)) });
  if (!baseCache) baseCache = render(baseLayer(), BODY);
  out.push({ key: 'hero-base-v2', grid: baseCache });
  for (const slot of ORDER) {
    const it = equip && equip[slot];
    if (!it || !BUILD[slot]) continue;
    out.push({ key: gearKey(slot, it), grid: render(BUILD[slot](it), gearMats(it)) });
  }
  return out;
}

// 單一裝備的圖（做背包圖示用）
export function gearGrid(slot, it) {
  return render(BUILD[slot](it), gearMats(it));
}

// 疊成一張（縮圖用）
export function heroGrid(equip) {
  const out = Array.from({ length: H }, () => new Array(W).fill(null));
  for (const l of heroLayers(equip)) l.grid.forEach((row, y) => row.forEach((c, x) => { if (c) out[y][x] = c; }));
  return out;
}
