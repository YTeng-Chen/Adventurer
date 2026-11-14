// 像素圖入口：角色與裝備在 src/art，魔物在這裡（原本 16×16，用 Scale2x 放大成 32×32，和角色同樣的像素密度）。
import { data } from '../core/data.js';
import { scale2x } from '../art/pixel.js';
import { heroLayers, heroParts, heroGrid, W as HERO_W, H as HERO_H, PIVOT } from '../art/hero.js';
import { itemIconGrid } from '../art/icons.js';

const OUT = '#1a1420';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const ENEMY = {
  slime: [
    '................', '................', '................', '................', '................',
    '......kkkk......', '....kkllBBkk....', '...klllBBBBBk...', '..klBBBBBBBBBk..', '..kBBwEBBwEBBk..',
    '..kBBBBBBBBBBk..', '.kBBBBBttBBBBBk.', '.kbBBBBBBBBBBbk.', '.kbbbbbbbbbbbbk.', '..kkkkkkkkkkkk..', '................',
  ],
  beast: [
    '................', '................', '................', '.kk.kk..........', '.kBkBk..........',
    'kBBBBBk.........', 'kBwEBBBkkkkkkk..', 'kBBBBBBBBBBBBBkk', 'ktttBBBBBBBBBBBk', '.kkkBBBBBBBBBBk.',
    '...kbBBBBBBBBbk.', '...kbbkkkkkkbbk.', '...kbk.....kbk..', '...kbk.....kbk..', '...kkk.....kkk..', '................',
  ],
  bug: [
    '................', '................', '................', '................', '................',
    '....k......k....', '.....k....k.....', '....kkkkkkkk....', '...klllBBBBBk...', '..klBBBBkBBBBk..',
    '.kwEBBBBkBBBBBk.', '.kBBBBBBkBBBBBk.', '..kbBBBBkBBBBbk.', '..kkbbbbkbbbbk..', '.k.k.k....k.k.k.', '................',
  ],
  golem: [
    '................', '....kkkkkkk.....', '...kBBBBBBBk....', '...kBwEBwEBk....', '...kBBBBBBBk....',
    '...kbBtttBbk....', '.kkkkkkkkkkkkk..', 'kBBkBBBlBBBkBBk.', 'kBBkBBBBBBBkBBk.', 'kBBkBBBBBBBkBBk.',
    'kbbkbBBBBBbkbbk.', 'kkkkkbbbbbkkkkk.', '....kBBkBBk.....', '....kBBkBBk.....', '...kkkkkkkkk....', '................',
  ],
  humanoid: [
    '................', '.....kkkkk......', '....kBBBBBk.....', '....kEwBEwk.....', '....kBBBBBk.....',
    '.....ktttk......', '...kkkBBBkkk....', '..kBkBBBBBkBk...', '..kBkBlBBBkBk...', '..kbkBBBBBkbk...',
    '...k.kbbbk.k....', '.....kBkBk......', '.....kBkBk......', '.....kBkBk......', '....kkk.kkk.....', '................',
  ],
  ghost: [
    '................', '................', '.....kkkkk......', '...kkllBBBkk....', '..klBBBBBBBBk...',
    '..kBwEBBwEBBk...', '.kBBBBBBBBBBBk..', '.kBBBBkkkBBBBk..', '.kBBBBBBBBBBBk..', '.kBBBBBBBBBBBBk.',
    '..kBBBBBBBBBBBk.', '..kbBBbBBBbBBbk.', '...kbk.kbk.kbk..', '....k...k...k...', '................', '................',
  ],
};

function enemyGrid16(shape, color) {
  const rows = ENEMY[shape] || ENEMY.slime;
  const pal = { k: OUT, B: color, b: shade(color, -0.35), l: shade(color, 0.45), w: '#f4f0e8', E: OUT, t: '#f4f0e8' };
  return rows.map((r) => r.split('').map((ch) => (ch === '.' ? null : pal[ch])));
}

const enemyCache = new Map();
function enemyGrid(shape, color) {
  const key = shape + color;
  if (!enemyCache.has(key)) enemyCache.set(key, scale2x(enemyGrid16(shape, color)));
  return enemyCache.get(key);
}

// 史詩以上的裝備會發光：回傳最高稀有度的顏色
function glow(equip) {
  let best = null;
  for (const slot of ['feet', 'body', 'head', 'weapon']) {
    const it = equip && equip[slot];
    if (it && it.rarity >= 3 && (!best || it.rarity > best.rarity)) best = it;
  }
  return best ? { rarity: best.rarity, color: data.RARITY[best.rarity].color } : null;
}

function draw(ctx, grid, x, y, scale, { flip = false, flash = 0, alpha = 1 } = {}) {
  const w = grid[0].length;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < w; c++) {
      let col = grid[r][c];
      if (!col) continue;
      if (flash) col = shade(col, flash);
      ctx.fillStyle = col;
      const cx = flip ? w - 1 - c : c;
      ctx.fillRect(Math.round(x + cx * scale), Math.round(y + r * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
  ctx.restore();
}

export const sprites = { heroGrid, heroLayers, heroParts, PIVOT, glow, enemyGrid, itemIconGrid, draw, shade, HERO_W, HERO_H, ENEMY_W: 32 };
