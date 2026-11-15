// 把像素圖的色塊陣列變成 Phaser 貼圖（魔物），並把骨架角色放進場景。
// 之後換成美術畫的 spritesheet 時，只要改這個檔案。
import * as Phaser from 'phaser';
import { sprites } from '../ui/sprites.js';
import { Rig, ANIMS } from '../rig/rig.js';
import { HERO_SCALE } from './config.js';

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

// 骨架角色（側面）：Rig 把角色和特效畫在一張低解析度的 canvas 上，這裡把它當成貼圖放進場景，每一格重畫。
// 動作：待機會一直播；play('slash') 之類的單次動作播完會回到待機。
let rigSeq = 0;
export class RigHero {
  // x：腳底中心的位置；groundY：地面高度
  constructor(scene, x, groundY) {
    this.scene = scene;
    this.x = x; this.groundY = groundY;
    this.rig = new Rig('side');
    this.cw = 260; this.ch = 232; this.footX = 96; this.footY = 220;   // 角色畫在自己的小畫布上，腳底在 (footX, footY)
    this.tex = scene.textures.createCanvas(`rig-hero-${rigSeq++}`, this.cw, this.ch);
    // 以腳底為基準縮放，HERO_SCALE 改變時角色仍然站在地面上
    this.image = scene.add.image(x, groundY, this.tex.key).setOrigin(this.footX / this.cw, this.footY / this.ch).setScale(HERO_SCALE);
    this.anim = 'idle'; this.t0 = scene.time.now; this.speed = 1;
    this.blinkAt = 1500 + Math.random() * 2000;
    this.flashUntil = 0;
    this.update = this.update.bind(this);
    scene.events.on('update', this.update);
    scene.events.once('shutdown', () => { scene.events.off('update', this.update); scene.textures.remove(this.tex.key); });
    this.update(scene.time.now);
  }
  setLook(equip, look) { this.rig.setEquip(equip); this.rig.setLook(look); }
  // speed > 1 會播得比較快（戰鬥紀錄播得快的時候用）
  play(name, speed = 1) { this.anim = name; this.t0 = this.scene.time.now; this.speed = speed; }
  flash(ms = 110) { this.flashUntil = this.scene.time.now + ms; }
  get topY() { return this.groundY - (this.rig.height + 1) * HERO_SCALE; }

  update(time) {
    let anim = ANIMS[this.anim];
    let t = ((time - this.t0) / 1000 / anim.dur) * this.speed;
    if (anim.loop) t %= 1;
    else if (t >= 1) { this.anim = 'idle'; this.t0 = time; this.speed = 1; anim = ANIMS.idle; t = 0; }
    let blink = false;
    if (time > this.blinkAt) { blink = true; if (time > this.blinkAt + 130) this.blinkAt = time + 2000 + Math.random() * 2600; }
    const pose = anim.pose(t), ctx = this.tex.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);
    this.rig.draw(ctx, this.footX, this.footY, pose, blink);
    if (time < this.flashUntil) {          // 受擊閃白：只把角色的像素塗白
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(0, 0, this.cw, this.ch);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.rig.drawFx(ctx, this.footX, this.footY, pose, time / 1000);
    this.tex.refresh();
  }
}
