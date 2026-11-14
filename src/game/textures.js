// 把像素圖的色塊陣列變成 Phaser 貼圖，並組出紙娃娃角色。
// 之後換成美術畫的 spritesheet 時，只要改這個檔案。
import * as Phaser from 'phaser';
import { sprites } from '../ui/sprites.js';

export function gridTexture(scene, key, grid) {
  if (scene.textures.exists(key)) return key;
  const h = grid.length, w = grid[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!grid[y][x]) continue;
      ctx.fillStyle = grid[y][x];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  scene.textures.addCanvas(key, c);
  return key;
}

export function pixelTexture(scene) {
  if (!scene.textures.exists('px')) {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
    scene.textures.addCanvas('px', c);
  }
  return 'px';
}

export function enemyTexture(scene, shape, color) {
  return gridTexture(scene, `enemy-${shape}-${color}`, sprites.enemyGrid(shape, color));
}

const hex = (c) => parseInt(c.slice(1), 16);

// 紙娃娃角色：Container 裡每個部位一張 sprite，同樣大小疊在一起
export class Hero {
  constructor(scene, x, y, scale) {
    this.scene = scene;
    this.scale = scale;
    this.box = scene.add.container(x, y);
    this.layers = [];
    this.emitter = null;
    this.sig = '';
  }

  setEquip(equip) {
    const layers = sprites.heroLayers(equip);
    const glow = sprites.glow(equip);
    const sig = layers.map((l) => l.key).join('|') + (glow ? glow.rarity : '');
    if (sig === this.sig) return;
    this.sig = sig;
    for (const sp of this.layers) sp.destroy();
    this.layers = layers.map((l) => {
      gridTexture(this.scene, l.key, l.grid);
      return this.scene.add.image(0, 0, l.key).setOrigin(0, 0).setScale(this.scale);
    });
    this.box.add(this.layers);
    this.setGlow(glow);
  }

  // 史詩、傳說裝備的閃光粒子
  setGlow(glow) {
    if (this.emitter) { this.emitter.destroy(); this.emitter = null; }
    if (!glow) return;
    const s = this.scale, w = sprites.HERO_W * s, h = sprites.HERO_H * s;
    this.emitter = this.scene.add.particles(0, 0, pixelTexture(this.scene), {
      x: { min: 0, max: w }, y: { min: h * 0.2, max: h },
      speedY: { min: -26, max: -12 }, lifespan: 1100,
      scale: { start: s / 2, end: 0 }, alpha: { start: 1, end: 0 },
      tint: hex(sprites.shade(glow.color, 0.35)),
      frequency: glow.rarity === 4 ? 110 : 260,
    });
    this.box.add(this.emitter);
  }

  flash(ms = 120) {
    for (const sp of this.layers) sp.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => { for (const sp of this.layers) sp.clearTint(); });
  }

  get width() { return sprites.HERO_W * this.scale; }
  get height() { return sprites.HERO_H * this.scale; }
}
