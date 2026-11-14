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

// 紙娃娃角色：Container 裡每個部位一張圖，同樣大小疊在一起。
// 會動：呼吸起伏、隨機眨眼、披風飄動；攻擊時武器以右手為支點揮動。
export class Hero {
  constructor(scene, x, y, scale) {
    this.scene = scene;
    this.scale = scale;
    this.box = scene.add.container(x, y);
    this.parts = [];
    this.images = [];
    this.weapon = null;
    this.emitter = null;
    this.sig = '';
    this.o = { breath: 0, blink: false, cape: 0 };
    this.t = 0;
    this.blinkAt = 1800 + Math.random() * 2000;
    this.timer = scene.time.addEvent({ delay: 100, loop: true, callback: () => this.tick() });
    scene.events.once('shutdown', () => this.timer.remove());
  }

  frameTexture(p) {
    const o = this.o;
    const key = `h:${p.key}|${o.breath}|${p.id === 'base' ? (o.blink ? 1 : 0) : ''}|${p.id === 'cape' ? o.cape : ''}`;
    return gridTexture(this.scene, key, p.frames(o));
  }

  setEquip(equip) {
    const parts = sprites.heroParts(equip);
    const glow = sprites.glow(equip);
    const sig = parts.map((p) => p.key).join('|') + (glow ? glow.rarity : '');
    if (sig === this.sig) return;
    this.sig = sig;
    this.parts = parts;
    for (const img of this.images) img.destroy();
    const P = sprites.PIVOT, s = this.scale;
    this.weapon = null;
    this.images = parts.map((p) => {
      const img = this.scene.add.image(0, 0, this.frameTexture(p)).setScale(s);
      if (p.id === 'weapon') {
        img.setOrigin(P.x / sprites.HERO_W, P.y / sprites.HERO_H).setPosition(P.x * s, P.y * s);
        this.weapon = img;
      } else img.setOrigin(0, 0);
      return img;
    });
    this.box.add(this.images);
    this.setGlow(glow);
  }

  tick() {
    this.t += 100;
    const o = this.o;
    const breath = Math.floor(this.t / 600) % 2;
    const cape = [0, 1, 2, 1][Math.floor(this.t / 200) % 4];
    let blink = o.blink;
    if (this.t >= this.blinkAt) { blink = true; if (this.t >= this.blinkAt + 130) { blink = false; this.blinkAt = this.t + 2200 + Math.random() * 2600; } }
    if (breath === o.breath && cape === o.cape && blink === o.blink) return;
    Object.assign(o, { breath, cape, blink });
    this.parts.forEach((p, i) => { const img = this.images[i]; if (img) img.setTexture(this.frameTexture(p)); });
  }

  // 武器揮動：先往後拉，再往前砍，回到原位
  swing() {
    const w = this.weapon;
    if (!w) return;
    this.scene.tweens.killTweensOf(w);
    w.angle = 0;
    this.scene.tweens.add({
      targets: w, angle: -35, duration: 70, ease: 'Quad.out',
      onComplete: () => this.scene.tweens.add({
        targets: w, angle: 55, duration: 90, ease: 'Quad.in',
        onComplete: () => this.scene.tweens.add({ targets: w, angle: 0, duration: 160, ease: 'Back.out' }),
      }),
    });
  }

  // 史詩、傳說裝備的閃光粒子
  setGlow(glow) {
    if (this.emitter) { this.emitter.destroy(); this.emitter = null; }
    if (!glow) return;
    const s = this.scale, w = sprites.HERO_W * s, h = sprites.HERO_H * s;
    this.emitter = this.scene.add.particles(0, 0, pixelTexture(this.scene), {
      x: { min: w * 0.15, max: w * 0.75 }, y: { min: h * 0.2, max: h * 0.9 },
      speedY: { min: -26, max: -12 }, lifespan: 1100,
      scale: { start: s / 2, end: 0 }, alpha: { start: 1, end: 0 },
      tint: hex(sprites.shade(glow.color, 0.35)),
      frequency: glow.rarity === 4 ? 110 : 260,
    });
    this.box.add(this.emitter);
  }

  flash(ms = 120) {
    for (const img of this.images) img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => { for (const img of this.images) img.clearTint(); });
  }

  get layers() { return this.images; }
  get width() { return sprites.HERO_W * this.scale; }
  get height() { return sprites.HERO_H * this.scale; }
}
