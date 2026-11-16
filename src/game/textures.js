// 把像素圖的色塊陣列變成 Phaser 貼圖（魔物），並把骨架角色放進場景。
// 之後換成美術畫的 spritesheet 時，只要改這個檔案。
import * as Phaser from 'phaser';
import { sprites } from '../ui/sprites.js';
import { Rig, ANIMS, attackStyle } from '../rig/rig.js';
import { HERO_SCALE } from './config.js';
import { StageFx } from './stagefx.js';

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
// 動作：待機會一直播；attack() 之類的單次動作播完會回到待機。
let rigSeq = 0;
export class RigHero {
  // x：腳底中心的位置；groundY：地面高度
  constructor(scene, x, groundY) {
    this.scene = scene;
    this.x = x; this.groundY = groundY;
    this.rig = new Rig('side');
    this.cw = 340; this.ch = 300; this.footX = 110; this.footY = 284;   // 角色畫在自己的小畫布上，腳底在 (footX, footY)；留空間給跳躍和大劍的火柱
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
  setLook(equip, look) {
    this.rig.setEquip(equip); this.rig.setLook(look); this.style = attackStyle(equip && equip.weapon);
    // 炎龍：拿大劍或穿 2 件以上才建立戰鬥畫面尺度的特效（stagefx.js）
    const n = this.rig.dragonSet || 0;
    if (!this.fx && (this.style === 'greatsword' || n >= 2)) this.fx = new StageFx(this.scene, this);
    if (this.fx) this.fx.setSet(n);
  }
  // 目標在畫面上的 x（魔物中心）：魔法球、箭、命中的爆光會飛到那裡
  setTarget(screenX) { this.reach = (screenX - this.x) / HERO_SCALE; this.targetX = screenX; }
  // 依武器播放攻擊：full 為 true 是三段連招，否則是單發快攻。回傳命中的時間表 [{ ms, w, power }]
  attack(full, speed = 1) {
    const name = `${full ? 'combo' : 'quick'}_${this.style || 'sword'}`, anim = ANIMS[name];
    this.play(name, speed);
    const ms = (anim.dur * 1000) / speed;
    if (this.fx && this.style === 'greatsword') { if (full) this.fx.greatsword(ms, this.scene.sys.settings.key === 'Idle'); else this.fx.quick(ms); }
    return anim.hits.map((h) => ({ ms: (h.t * anim.dur * 1000) / speed, w: h.w, power: h.power }));
  }
  // 命中時停頓一下（動作停住，之後接著播）
  hold(ms) { this.holdFrom = this.scene.time.now; this.holdUntil = this.holdFrom + ms; }
  // speed > 1 會播得比較快（戰鬥紀錄播得快的時候用）
  play(name, speed = 1) { this.anim = name; this.t0 = this.scene.time.now; this.speed = speed; }
  flash(ms = 110) { this.flashUntil = this.scene.time.now + ms; }
  get topY() { return this.groundY - (this.rig.height + 1) * HERO_SCALE; }

  update(time) {
    if (this.holdUntil && time >= this.holdUntil) { this.t0 += this.holdUntil - this.holdFrom; this.holdUntil = 0; }
    let anim = ANIMS[this.anim];
    let t = (((this.holdUntil ? this.holdFrom : time) - this.t0) / 1000 / anim.dur) * this.speed;
    if (anim.loop) t %= 1;
    else if (t >= 1) { this.anim = 'idle'; this.t0 = time; this.speed = 1; anim = ANIMS.idle; t = 0; }
    let blink = false;
    if (time > this.blinkAt) { blink = true; if (time > this.blinkAt + 130) this.blinkAt = time + 2000 + Math.random() * 2600; }
    const pose = anim.pose(t, this.reach), ctx = this.tex.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);
    this.rig.draw(ctx, this.footX, this.footY, pose, blink, time / 1000);
    if (time < this.flashUntil) {          // 受擊閃白：只把角色的像素塗白
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(0, 0, this.cw, this.ch);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.rig.drawFx(ctx, this.footX, this.footY, pose, time / 1000);
    this.tex.refresh();
    // 劍身在戰鬥畫面上的位置（給大型特效用）
    const b = this.rig.bladeAt(), at = (p) => [this.x + (p[0] - this.footX) * HERO_SCALE, this.groundY + (p[1] - this.footY) * HERO_SCALE];
    this.bladeStage = b ? { base: at(b.base), tip: at(b.tip) } : null;
    if (this.fx) this.fx.update(time);
  }
}
