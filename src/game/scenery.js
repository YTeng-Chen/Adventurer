// 戰鬥地圖的場景。共五種，依地圖順序輪流使用（第 6 張地圖會用回第 1 種）。
// 每種場景先在 312×224 的小畫布上用像素畫好，再放大 2 倍鋪滿戰鬥畫面；
// 上面再加一層會動的小東西（雲、螢火蟲、落塵、霧、火星），讓畫面不會死板。
import { W, H, GROUND } from './config.js';

export const SCENES = [
  { k: 'plains', n: '草原' },
  { k: 'forest', n: '森林' },
  { k: 'cave', n: '礦坑' },
  { k: 'graveyard', n: '墓地' },
  { k: 'volcano', n: '火山' },
];
export const sceneFor = (index) => SCENES[((index % SCENES.length) + SCENES.length) % SCENES.length].k;

const S = 2;                                   // 一格像素 = 畫面上 2×2
const SW = W / S, SH = H / S, SG = GROUND / S;  // 小畫布的寬、高、地面高度

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function painter(ctx) {
  const px = (col, x, y, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // 由上往下的色帶，交界處用棋盤格混色（像素畫的漸層）
  const bands = (cols, y0, y1) => {
    const h = (y1 - y0) / cols.length;
    cols.forEach((c, i) => {
      const a = Math.round(y0 + i * h), b = Math.round(y0 + (i + 1) * h);
      px(c, 0, a, SW, b - a);
      if (i > 0) for (let x = 0; x < SW; x++) if (x % 2 === 0) px(cols[i - 1], x, a); else px(c, x, a - 1);
    });
  };
  // 起伏的稜線（山、丘陵、樹林的剪影），從稜線一路塗到地面
  const ridge = (col, base, amp, r, waves = 3, to = SG) => {
    const ph = Array.from({ length: waves }, () => [r() * 6.28, 0.01 + r() * 0.04 * (1 + waves / 3)]);
    for (let x = 0; x < SW; x++) {
      const y = Math.round(base - amp * ph.reduce((s, [p, f], i) => s + Math.sin(x * f + p) / (i + 1), 0) / 1.6);
      px(col, x, y, 1, to - y);
    }
  };
  const disc = (col, cx, cy, r) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(col, cx + x, cy + y); };
  return { px, bands, ridge, disc };
}
// 地面：上緣一條亮邊，往下加深，撒一些小石子或草點
function ground(p, r, top, cols, dots) {
  p.px(cols[1], 0, SG, SW, SH - SG);
  p.px(cols[0], 0, SG, SW, 2);
  p.px(cols[2], 0, SG + 10, SW, SH - SG - 10);
  for (let x = 0; x < SW; x += 2) if (r() < 0.5) p.px(cols[1], x, SG + 10);
  for (let i = 0; i < 60; i++) p.px(dots[i % dots.length], r() * SW, SG + 3 + r() * (SH - SG - 4), r() < 0.3 ? 2 : 1, 1);
  if (top) for (let x = 0; x < SW; x += 1 + Math.floor(r() * 3)) top(x);
}

// 每種場景先整張塗上底色，稜線、樹林之間就不會留下透明的縫
const BASE = { plains: '#86bf8f', forest: '#10241c', cave: '#1a1410', graveyard: '#1f1c36', volcano: '#2a1010' };
function paint(k, ctx) { const p = painter(ctx); p.px(BASE[k], 0, 0, SW, SH); DRAW[k](p, rng(k.length * 977 + 13)); }

const DRAW = {
  plains(p, r) {
    p.bands(['#7cc4ec', '#90cff0', '#a6daf3', '#bde5f6', '#d4eef8'], 0, 150);
    p.disc('#fff1b8', 252, 40, 15); p.disc('#fffbe4', 252, 40, 11);
    p.ridge('#a9c9dc', 132, 26, r, 2);                                    // 遠山
    for (let x = 0; x < SW; x++) if (r() < 0.05) p.px('#c7dce8', x, 120 + r() * 10, 2, 1);
    p.ridge('#86bf8f', 160, 12, r, 3);                                    // 丘陵
    for (let i = 0; i < 9; i++) {                                              // 丘陵上的小樹
      const x = 10 + i * 34 + r() * 14, y = 152 + r() * 10;
      p.px('#4e7f4a', x + 2, y + 4, 2, 6); p.disc('#5e9f58', x + 3, y, 4); p.px('#7dbb6f', x + 1, y - 3, 3, 2);
    }
    p.ridge('#6aaa5a', 180, 6, r, 3);                                      // 近丘
    ground(p, r, (x) => { if (r() < 0.35) p.px('#8fd06a', x, SG - 1 - Math.floor(r() * 3), 1, 3); }, ['#9bd877', '#6fb257', '#5e9a49'], ['#ffffff', '#f4d24b', '#e8726a', '#4f8a3e']);
    for (const x of [24, 270]) {                                               // 木柵欄
      for (let i = 0; i < 4; i++) p.px('#8a6038', x + i * 7, SG - 12, 2, 13);
      p.px('#a87848', x - 1, SG - 10, 24, 2); p.px('#a87848', x - 1, SG - 5, 24, 2);
    }
    p.px('#8f9aa0', 210, SG - 5, 12, 6); p.px('#b7c0c4', 212, SG - 6, 8, 2);  // 石頭
  },
  forest(p, r) {
    p.bands(['#16302e', '#1d3a37', '#264842', '#30584d', '#3b6857'], 0, 172);
    for (let i = 0; i < 4; i++) {                                              // 從樹縫斜照下來的光
      const x0 = 30 + i * 80 + r() * 20;
      for (let y = 0; y < 170; y += 2) if ((y + i) % 4 < 2) p.px('rgba(190,240,190,0.07)', x0 + y * 0.35, y, 10, 2);
    }
    const pine = (x, base, h, col, trunk) => {
      p.px(trunk, x - 1, base - 6, 3, 6);
      for (let t = 0; t < 4; t++) {
        const top = base - 6 - h + t * (h / 4.4), w = 3 + t * 3 + h / 8;
        for (let y = 0; y < h / 3; y++) p.px(col, x - (w * y) / (h / 3), top + y, ((w * y) / (h / 3)) * 2 + 1, 1);
      }
    };
    for (let x = -6; x < SW; x += 12 + r() * 8) pine(x, 158, 44 + r() * 20, '#24443d', '#1d332e');
    for (let x = -10; x < SW; x += 20 + r() * 12) pine(x, 176, 52 + r() * 26, '#1a352d', '#142822');
    for (const x of [8, 64, 252, 300]) pine(x + r() * 10, SG + 2, 70 + r() * 20, '#10241c', '#0c1a14');
    ground(p, r, (x) => { if (r() < 0.25) p.px('#4f8a52', x, SG - 1 - Math.floor(r() * 2), 1, 2); }, ['#4b7a4a', '#2f5233', '#253f29'], ['#3f6b40', '#5d8f4f', '#1f3322']);
    for (const [x, s] of [[92, 1], [104, 0.7], [214, 1], [226, 0.8]]) {      // 紅香菇
      const w = Math.round(8 * s);
      p.px('#e8dcc8', x + w / 2 - 1, SG - 5 * s, 3, 5 * s); p.px('#c8463c', x, SG - 8 * s, w, 3 * s);
      p.px('#e85a4e', x + 1, SG - 9 * s, w - 2, 1); p.px('#ffffff', x + 2, SG - 7 * s, 1, 1); p.px('#ffffff', x + w - 3, SG - 8 * s, 1, 1);
    }
  },
  cave(p, r) {
    p.bands(['#1a1410', '#211913', '#291f17', '#31251b', '#3a2c20'], 0, SG);
    for (let i = 0; i < 70; i++) { const x = r() * SW, y = r() * 170; p.px(r() < 0.5 ? '#2e2319' : '#43331f', x, y, 2 + r() * 6, 1); }
    p.ridge('#2a2018', 150, 18, r, 3);                                     // 後面的岩壁
    for (let x = 0; x < SW; x += 6 + r() * 10) {                               // 鐘乳石
      const h = 6 + r() * 20, w = 3 + r() * 4;
      for (let y = 0; y < h; y++) p.px(y < 2 ? '#3a2d22' : '#16110d', x + (w * y) / h / 2, y, Math.max(1, w - (w * y) / h), 1);
    }
    for (const x of [40, 190]) {                                               // 木頭支架與吊燈
      p.px('#5a3c22', x, 92, 5, SG - 92); p.px('#5a3c22', x + 70, 92, 5, SG - 92); p.px('#6e4a2a', x - 4, 88, 83, 6); p.px('#8a6038', x - 4, 88, 83, 1);
      p.px('#3a3030', x + 37, 94, 1, 8); p.disc('rgba(255,200,90,0.12)', x + 37, 106, 16); p.disc('rgba(255,200,90,0.18)', x + 37, 106, 9);
      p.px('#2a2222', x + 34, 101, 7, 2); p.px('#ffd67a', x + 35, 103, 5, 5); p.px('#fff3c8', x + 36, 104, 3, 3);
    }
    const crystal = (x, y, h, col, hi) => { for (let i = 0; i < h; i++) p.px(col, x - Math.floor((h - i) / 4), y - i, 1 + Math.floor((h - i) / 2.2), 1); p.px(hi, x, y - h + 1, 1, h / 2); };
    for (const [x, h] of [[120, 14], [126, 9], [114, 8], [282, 12], [288, 7]]) crystal(x, SG, h, '#8a6ad8', '#d6c6ff');
    ground(p, r, null, ['#7a6650', '#5a4a3a', '#4a3c2e'], ['#8a7660', '#3a2e22', '#6a5a48']);
    for (let x = -2; x < SW; x += 9) p.px('#4a3420', x, SG + 6, 5, 2);       // 鐵軌
    p.px('#9a9aaa', 0, SG + 4, SW, 1); p.px('#9a9aaa', 0, SG + 9, SW, 1);
  },
  graveyard(p, r) {
    p.bands(['#100e1e', '#16142a', '#1d1a35', '#25213f', '#2f2a4a'], 0, 172);
    for (let i = 0; i < 70; i++) p.px(r() < 0.8 ? '#c8c8e8' : '#ffffff', r() * SW, r() * 120, 1, 1);
    p.disc('#e8e6f4', 252, 38, 13); p.disc('#d2d0e4', 248, 36, 3); p.disc('#d2d0e4', 256, 44, 2); p.disc('#16142a', 258, 33, 11);   // 彎月
    // 遠處的城堡剪影
    const c = '#1a1730';
    p.px(c, 40, 120, 90, 60); for (const [x, h] of [[38, 40], [70, 58], [104, 34], [126, 46]]) { p.px(c, x, 160 - h, 10, h); for (let i = 0; i < 10; i += 3) p.px(c, x + i, 158 - h, 2, 2); }
    p.px(c, 72, 98, 6, 8); p.px(c, 74, 90, 2, 8);
    for (const [x, y] of [[44, 126], [74, 112], [108, 132], [128, 120], [90, 140]]) p.px('#e0c060', x, y, 2, 3);
    p.ridge('#1f1c36', 176, 6, r, 3);
    const deadTree = (x, h) => {
      p.px('#120f20', x, SG - h, 4, h);
      for (let i = 0; i < 5; i++) { const y = SG - h + 4 + i * (h / 6), d = i % 2 ? 1 : -1; for (let s = 0; s < 8 + i * 2; s++) p.px('#120f20', x + 1 + d * s, y - s / 2, 2, 1); }
    };
    deadTree(20, 60); deadTree(290, 48);
    ground(p, r, (x) => { if (r() < 0.2) p.px('#4a4660', x, SG - 1, 1, 2); }, ['#55506a', '#3a3648', '#2e2b3a'], ['#4a4660', '#25222f', '#6a6680']);
    for (const [x, kind] of [[70, 0], [118, 1], [196, 0], [238, 2]]) {        // 墓碑
      if (kind === 2) { p.px('#4a4a58', x + 4, SG - 18, 3, 18); p.px('#4a4a58', x, SG - 13, 11, 3); p.px('#6a6a7a', x + 4, SG - 18, 1, 18); continue; }
      const w = kind ? 12 : 10, h = kind ? 16 : 13;
      p.px('#2a2834', x - 1, SG - h - 1, w + 2, h + 1); p.px('#6a6a7a', x, SG - h, w, h); p.px('#6a6a7a', x + 1, SG - h - 1, w - 2, 1);
      p.px('#8a8a98', x + 1, SG - h, 2, h - 1); p.px('#3e3c4a', x + w / 2 - 1, SG - h + 4, 3, 1); p.px('#3e3c4a', x + w / 2 - 2, SG - h + 7, 5, 1);
    }
    for (let x = 140; x < 186; x += 5) { p.px('#2a2834', x, SG - 14, 2, 14); p.px('#2a2834', x, SG - 16, 2, 1); }   // 鐵柵欄
    p.px('#2a2834', 140, SG - 11, 46, 1); p.px('#2a2834', 140, SG - 5, 46, 1);
  },
  volcano(p, r) {
    p.bands(['#1e0a0c', '#2e0f10', '#461814', '#652416', '#8a3418', '#b04a1c'], 0, 176);
    for (let i = 0; i < 6; i++) { const x = 150 + Math.sin(i) * 16 + i * 6, y = 50 - i * 9; p.disc('rgba(30,14,16,0.75)', x, y, 10 + i * 3); }  // 煙
    // 火山：大三角形剪影，山頂發光、熔岩沿著山坡流下來
    for (let y = 0; y < 110; y++) { const w = 26 + y * 1.25; p.px('#2a1214', 150 - w / 2, 70 + y, w, 1); }
    p.px('#ff8a2a', 140, 68, 22, 3); p.px('#ffd36a', 144, 68, 14, 1);
    for (const [x0, d] of [[146, -1], [156, 1], [151, 0.3]]) for (let y = 0; y < 70; y++) p.px(y % 9 < 6 ? '#ff6a1e' : '#c83c14', x0 + d * y * 0.45 + Math.sin(y / 4) * 1.5, 71 + y, 2, 1);
    p.ridge('#3a1614', 160, 14, r, 3);
    p.ridge('#2a1010', 182, 7, r, 3);
    ground(p, r, null, ['#5a2a22', '#3a2020', '#2a1616'], ['#4a2626', '#1e0e0e', '#6a3a2a']);
    for (const [x, w] of [[30, 26], [176, 34], [268, 18]]) {                  // 地上的熔岩池與裂縫
      p.px('#1e0e0e', x - 1, SG + 4, w + 2, 6); p.px('#ff6a1e', x, SG + 5, w, 4); p.px('#ffb84a', x + 2, SG + 6, w - 4, 2); p.px('#fff0a0', x + w / 3, SG + 6, w / 4, 1);
    }
    for (let i = 0; i < 6; i++) { let x = 60 + i * 40 + r() * 10, y = SG + 12; for (let s = 0; s < 10; s++) { p.px('#e0501a', x, y); x += r() < 0.5 ? 1 : -1; y += 1; } }
    for (const [x, h] of [[100, 14], [232, 10]]) { for (let y = 0; y < h; y++) p.px('#24100e', x + y / 3, SG - h + y, h - y / 1.5, 1); p.px('#4a2420', x + h / 3, SG - h, 3, 1); }
  },
};

// 會動的小東西：每種場景一種，畫在背景上面、角色後面
const AMBIENT = {
  plains: { n: 5, kind: 'cloud' },
  forest: { n: 16, kind: 'firefly', cols: [0xd8ff8a, 0xf4ffc8] },
  cave: { n: 22, kind: 'dust', cols: [0xbfa880, 0x8a7660] },
  graveyard: { n: 8, kind: 'fog' },
  volcano: { n: 26, kind: 'ember', cols: [0xffb84a, 0xff6a1e, 0xfff0a0] },
};

function cloudTexture(scene, key, seed) {
  if (scene.textures.exists(key)) return key;
  const r = rng(seed), w = 34 + Math.floor(r() * 20), h = 12;
  const tex = scene.textures.createCanvas(key, w, h), ctx = tex.context, p = painter(ctx);
  for (let i = 0; i < 4; i++) p.disc('#ffffff', 6 + i * ((w - 12) / 3), 7 - (i % 3 === 1 ? 2 : 0), 4 + (i % 2));
  p.px('#e2eef6', 2, 9, w - 4, 2);
  tex.refresh();
  return key;
}

export class Scenery {
  // index：第幾張地圖（決定用哪種場景）
  constructor(scene, index) {
    this.scene = scene;
    this.objs = [];
    this.set(index);
  }
  set(index) {
    const k = sceneFor(index);
    if (k === this.k) return;
    this.k = k;
    this.objs.forEach((o) => o.destroy()); this.objs = []; this.parts = [];
    const key = `scenery-${k}`;
    if (!this.scene.textures.exists(key)) {
      const tex = this.scene.textures.createCanvas(key, SW, SH);
      paint(k, tex.context);
      tex.refresh();
    }
    this.bg = this.scene.add.image(0, 0, key).setOrigin(0, 0).setScale(S).setDepth(-10);
    this.objs.push(this.bg);
    const a = AMBIENT[k], r = rng(41);
    for (let i = 0; i < a.n; i++) {
      let o;
      if (a.kind === 'cloud') o = this.scene.add.image(r() * W, 30 + r() * 140, cloudTexture(this.scene, `cloud-${i % 3}`, i % 3 + 5)).setScale(S).setAlpha(0.9);
      else if (a.kind === 'fog') o = this.scene.add.rectangle(r() * W, GROUND - 6 - r() * 40, 160 + r() * 160, 4 + Math.floor(r() * 3) * 2, 0xbfc4e8, 0.05 + r() * 0.04);
      else o = this.scene.add.rectangle(r() * W, r() * GROUND, S, S, a.cols[i % a.cols.length]);
      o.setDepth(-9);
      this.objs.push(o);
      this.parts.push({ o, kind: a.kind, v: 4 + r() * 10, ph: r() * 6.28, x0: o.x, y0: o.y });
    }
  }
  update(time, dt) {
    const s = dt / 1000;
    for (const p of this.parts) {
      const o = p.o;
      // p.x、p.y 是實際位置（小數），畫的時候才對齊像素格，慢慢移動時才不會卡住
      p.x ??= p.x0; p.y ??= p.y0;
      if (p.kind === 'cloud') { p.x -= p.v * s; if (p.x < -80) p.x = W + 40; }
      else if (p.kind === 'fog') { p.x += p.v * 1.4 * s; if (p.x - o.width / 2 > W) p.x = -o.width / 2; }
      else if (p.kind === 'firefly') {
        p.x = p.x0 + Math.sin(time / 1300 + p.ph) * 26; p.y = p.y0 * 0.6 + 80 + Math.sin(time / 900 + p.ph * 2) * 18;
        o.setAlpha(0.35 + 0.65 * Math.max(0, Math.sin(time / 500 + p.ph)));
      } else if (p.kind === 'dust') {
        p.y += p.v * 0.8 * s; p.x += Math.sin(time / 700 + p.ph) * 6 * s;
        if (p.y > GROUND) { p.y = 0; p.x = Math.random() * W; }
        o.setAlpha(0.5);
      } else if (p.kind === 'ember') {
        p.y -= p.v * 3 * s; p.x += Math.sin(time / 400 + p.ph) * 14 * s;
        o.setAlpha(Math.min(1, p.y / 200));
        if (p.y < 0) { p.y = GROUND + 10; p.x = Math.random() * W; }
      }
      o.x = Math.round(p.x / S) * S; o.y = Math.round(p.y / S) * S;
    }
  }
  destroy() { this.objs.forEach((o) => o.destroy()); this.objs = []; this.parts = []; }
}

// 把場景畫到一張 canvas 上（工具頁與測試用）
export const paintScene = paint;
