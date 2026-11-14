// 像素圖：角色外觀分層（身體、鞋子、上衣、頭飾、武器），顏色依稀有度、造型依流派。
(function (A) {
  const OUT = '#1a1420';
  const BASE_PAL = {
    k: OUT, s: '#f2c79b', S: '#d49a6a', e: OUT, h: '#6b4423', H: '#4a2e17',
    c: '#8a7d6a', C: '#6a5f50', p: '#4a4a5a', b: '#5a3a2a',
    m: '#c8ccd4', M: '#8a8e98', w: '#8a5a2a', g: '#f2c84b',
  };

  const HERO = [
    '....................',
    '....................',
    '........kkkk........',
    '......kkhhhhkk......',
    '.....khhhhhhhhk.....',
    '.....khhhhhhhhk.....',
    '.....khsssssshk.....',
    '.....kssessessk.....',
    '.....kssssssssk.....',
    '......kssSSssk......',
    '........kssk........',
    '....kcccccccccck....',
    '...ksccccccccccsk...',
    '...ksccccccccccsk...',
    '...kSccccccccccSk...',
    '....kppppppppppk....',
    '....kppppkkppppk....',
    '....kppppkkppppk....',
    '....kbbbbkkbbbbk....',
    '...kbbbbbkkbbbbbk...',
    '...kkkkkk..kkkkkk...',
    '....................',
  ];

  // 各部位的造型，'.' 代表沿用下層
  const GEAR = {
    feet: {
      _: { y: 18, rows: ['....kAAAAkkAAAAk....', '...kALAAAkkALAAAk...', '...kkkkkk..kkkkkk...'] },
    },
    body: {
      blade: { y: 11, rows: [
        '....kAAAAAAAAAAk....',
        '...ksALAAAAAAAAsk...',
        '...ksAALAAAAAAAsk...',
        '...kSAAALAAAAAASk...',
        '....kaaaagaaaaak....',
      ] },
      guard: { y: 11, rows: [
        '..kmmAAAAAAAAAAmmk..',
        '..kMMAAAaaaaAAAMMk..',
        '...ksAAAaaaaAAAsk...',
        '...kSAAAAAAAAAASk...',
        '....kMMMMMMMMMMk....',
      ] },
      arcane: { y: 11, rows: [
        '....kAAAALLAAAAk....',
        '...ksAAAALLAAAAsk...',
        '...ksAAAALLAAAAsk...',
        '...kSAAAALLAAAASk...',
        '....kaaaaLLaaaak....',
        '....kAAAALLAAAAk....',
        '...kAAAAALLAAAAAk...',
        '...kaaaaaaaaaaaak...',
      ] },
    },
    head: {
      blade: { y: 4, rows: [
        '.....kAAAAAAAAk.....',
        '.....kaLaaaaaakAA...',
        '...............kA...',
      ] },
      guard: { y: 1, rows: [
        '........kkkk........',
        '......kkmmmmkk......',
        '.....kmmmmmmmmk.....',
        '....kmmmmAAmmmmk....',
        '....kMMMMMMMMMMk....',
        '....kM........Mk....',
        '....kM........Mk....',
        '....kM........Mk....',
      ] },
      arcane: { y: 0, rows: [
        '..........kk........',
        '.........kAAk.......',
        '........kAAAak......',
        '.......kAAAAAak.....',
        '......kggggggggk....',
        '...kkAAAAAAAAAAAAkk.',
      ] },
    },
    weapon: {
      blade: { y: 4, rows: [
        '..................k.',
        '.................kmk',
        '.................kmk',
        '.................kmk',
        '.................kmk',
        '.................kmk',
        '.................kLk',
        '...............kgAgk',
        '................kwk.',
        '................kwk.',
        '................kgk.',
      ] },
      guard: { y: 6, rows: [
        '...............kkkkk',
        '...............kAAAk',
        '...............kALAk',
        '...............kAAAk',
        '...............kkwkk',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kkk.',
      ] },
      arcane: { y: 1, rows: [
        '................kkk.',
        '...............kLook',
        '...............koook',
        '................kak.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kwk.',
        '................kkk.',
      ] },
    },
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function paint(grid, layer, pal, yOff = 0) {
    layer.rows.forEach((row, i) => {
      const y = layer.y + i + yOff;
      if (y < 0 || y >= grid.length) return;
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch !== '.') grid[y][x] = pal[ch] || pal.k;
      }
    });
  }

  // 把角色畫成色塊陣列；equip 為 { weapon, head, body, feet }
  function heroGrid(equip) {
    const grid = HERO.map((r) => r.split('').map((ch) => (ch === '.' ? null : BASE_PAL[ch])));
    const order = ['feet', 'body', 'head', 'weapon'];
    for (const slot of order) {
      const it = equip && equip[slot];
      if (!it) continue;
      const shapes = GEAR[slot];
      const layer = shapes[it.tag] || shapes._;
      if (!layer) continue;
      const col = A.data.RARITY[it.rarity].color;
      const tagCol = it.tag ? A.data.TAGS[it.tag].color : col;
      const pal = { ...BASE_PAL, A: col, a: shade(col, -0.35), L: shade(col, 0.45), o: tagCol };
      paint(grid, layer, pal);
    }
    return grid;
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

  function enemyGrid(shape, color) {
    const rows = ENEMY[shape] || ENEMY.slime;
    const pal = { k: OUT, B: color, b: shade(color, -0.35), l: shade(color, 0.45), w: '#f4f0e8', E: OUT, t: '#f4f0e8' };
    return rows.map((r) => r.split('').map((ch) => (ch === '.' ? null : pal[ch])));
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

  // 史詩、傳說裝備的閃光
  function sparkles(ctx, equip, x, y, scale, t) {
    const items = ['weapon', 'head', 'body', 'feet'].map((k) => equip && equip[k]).filter((it) => it && it.rarity >= 3);
    if (!items.length) return;
    const best = items.reduce((a, b) => (b.rarity > a.rarity ? b : a));
    const col = A.data.RARITY[best.rarity].color;
    const n = best.rarity === 4 ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const ph = (t / 600 + i / n) % 1;
      const px = x + ((i * 7 + 3) % 20) * scale;
      const py = y + (20 - ph * 22) * scale;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.fillStyle = shade(col, 0.4);
      ctx.fillRect(px, py, scale, scale);
    }
    ctx.globalAlpha = 1;
  }

  A.sprites = { heroGrid, enemyGrid, draw, sparkles, shade, HERO_W: 20, HERO_H: 22, ENEMY_W: 16 };
})(globalThis.ADV = globalThis.ADV || {});
