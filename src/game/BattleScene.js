// 戰鬥播放：把 combat.fight() 回傳的紀錄一行一行播出來。戰鬥結果在播放前就已經算好。
import * as Phaser from 'phaser';
import { RigHero, enemyTexture } from './textures.js';
import { Scenery } from './scenery.js';
import { W, H, GROUND, FONT, HERO_X, FOE_X, ENEMY_SCALE, BOSS_SCALE } from './config.js';

const FLOAT = { attack: '#ffffff', double: '#9fe0ff', chain: '#7af0ff', counter: '#d0d6e0', burn: '#ffa040' };

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(payload) {
    this.payload = payload;
    this.i = 0;
    this.done = false;
  }

  create() {
    this.bus = this.registry.get('bus');
    const { foe, r, equip, look } = this.payload;
    this.r = r;

    this.scenery = new Scenery(this, this.payload.scene || 0);   // 頭目用那張地圖的場景，試煉照關卡輪流
    this.add.rectangle(0, 0, W, 64, 0x0a0d13, 0.35).setOrigin(0, 0).setDepth(3);   // 血條後面壓暗一點，比較好讀

    this.hero = new RigHero(this, HERO_X, GROUND);
    this.hero.image.setDepth(2);
    this.hero.setLook(equip, look);

    const es = foe.boss ? BOSS_SCALE : ENEMY_SCALE;
    this.foe = this.add.image(FOE_X, GROUND + 6, enemyTexture(this, foe.shape, foe.c)).setOrigin(0, 1).setScale(es).setDepth(1);   // 站在刀光砍得到的距離
    this.foeX = this.foe.x;
    this.tweens.add({ targets: this.foe, y: '-=4', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.bars = this.add.graphics().setDepth(4);
    this.hpTextP = this.add.text(32, 44, '', FONT(18, '#ece4d2')).setDepth(4);
    this.hpTextE = this.add.text(W - 32, 44, '', FONT(18, '#ece4d2')).setOrigin(1, 0).setDepth(4);
    this.hpP = r.maxHpP; this.hpE = r.maxHpE;
    this.drawBars();

    this.hero.setTarget(this.foe.x + this.foe.displayWidth / 2);

    // 播放速度：玩家的一次攻擊是一套三段連招，需要比較長的時間；紀錄很長時整體加快
    const log = r.log;
    this.pace = Math.max(1, Math.min(2.4, log.length / 26));     // 動作加速的倍率
    this.time.delayedCall(350, () => this.next());

    const offs = [this.bus.on('battle:skip', () => this.finish())];
    this.events.once('shutdown', () => offs.forEach((off) => off()));
  }

  drawBars() {
    const g = this.bars, bw = (W - 96) / 2;
    const bar = (x, v, max, col) => {
      g.fillStyle(0x0a0d13).fillRect(x - 2, 18, bw + 4, 18);
      g.fillStyle(0x3a2228).fillRect(x, 20, bw, 14);
      g.fillStyle(col).fillRect(x, 20, Math.max(0, (v / max) * bw), 14);
    };
    g.clear();
    bar(32, this.hpP, this.r.maxHpP, 0x6cc77a);
    bar(W - 32 - bw, this.hpE, this.r.maxHpE, 0xe66a5e);
    const n = (v) => Math.round(v).toLocaleString('en-US');
    this.hpTextP.setText(`${n(this.hpP)} / ${n(this.r.maxHpP)}`);
    this.hpTextE.setText(`${n(this.hpE)} / ${n(this.r.maxHpE)}`);
  }

  // 播下一行戰鬥紀錄。每一行播完（動作需要的時間）才排下一行
  next() {
    if (this.done) return;
    const line = this.r.log[this.i];
    if (!line) { this.finish(); return; }
    this.i++;
    let wait = 260 / this.pace;
    if (line.kind === 'undying') {
      this.setHp(line);
    } else if (line.kind === 'burn') {
      this.setHp(line);
      this.pop(line.who === 'p' ? 'e' : 'p', line.dmg, line, 1);
    } else if (line.who === 'p') {
      wait = this.heroAttack(line);
    } else {
      this.setHp(line);
      this.tweens.add({ targets: this.foe, x: this.foeX - 12, duration: 90, yoyo: true, ease: 'Quad.out' });
      this.hero.flash(110);
      this.hero.play('hurt');
      this.pop('p', line.dmg, line, line.crit ? 2 : 1);
      wait = 340 / this.pace;
    }
    this.bus.emit('battle:line', { i: this.i - 1, line });
    this.timer = this.time.delayedCall(wait, () => this.next());
  }

  update(time, dt) { this.scenery.update(time, Math.min(dt, 50)); }

  setHp(line) { this.hpP = line.hpP; this.hpE = line.hpE; this.drawBars(); }

  // 玩家攻擊：一般攻擊是三段連招，傷害照比例分三次跳出來；追擊、連鎖、反擊是單發快攻。回傳這個動作要播多久
  heroAttack(line) {
    const full = line.kind === 'attack';
    const speed = (full ? 1.25 : 1.5) * this.pace;
    const hits = this.hero.attack(full, speed);
    const hp0 = this.hpE, hpP = line.hpP;
    let given = 0;
    hits.forEach((h, n) => this.time.delayedCall(h.ms, () => {
      if (this.done) return;
      const last = n === hits.length - 1;
      const part = last ? line.dmg - given : Math.round(line.dmg * h.w);
      given += part;
      this.hpP = hpP;
      this.hpE = last ? line.hpE : Math.max(line.hpE, hp0 - given);
      this.drawBars();
      this.foe.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(90, () => this.foe.clearTint());
      this.tweens.add({ targets: this.foe, x: this.foeX + 3 + h.power * 2, duration: 60, yoyo: true, ease: 'Quad.out' });   // 被打退一點
      if (h.power >= 3 || (last && line.crit)) this.cameras.main.shake(110 + h.power * 20, 0.003 + h.power * 0.0015);
      this.pop('e', part, { ...line, crit: line.crit && last }, last && hits.length > 1 ? 2 : 1, n);
    }));
    return hits[hits.length - 1].ms + (full ? 260 : 150) / this.pace;
  }

  // 跳出傷害數字。big：1 一般、2 終結技或暴擊（字比較大）；n 是連招的第幾段（往旁邊錯開，不會疊在一起）
  pop(target, dmg, line, big = 1, n = 0) {
    let x, y;
    if (target === 'e') { x = this.foe.x + this.foe.displayWidth / 2 + (n - 1) * 14; y = this.foe.y - this.foe.displayHeight - 4 - n * 6; }
    else { x = HERO_X; y = this.hero.topY; }
    const color = line.crit && line.kind === 'attack' ? '#f2b84b' : FLOAT[line.kind] || '#ffffff';
    const size = (big > 1 ? 24 : 16) + (line.crit ? 4 : 0);
    const t = this.add.text(x, y + 20, (line.crit ? '!' : '') + Math.round(dmg).toLocaleString('en-US'), FONT(size, color)).setOrigin(0.5, 1).setDepth(6);
    if (big > 1) { t.setScale(1.6); this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' }); }   // 彈一下
    this.tweens.add({ targets: t, y: t.y - 44, alpha: 0, duration: 850, delay: big > 1 ? 120 : 0, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.timer) this.timer.remove();
    this.time.removeAllEvents();
    this.foe.clearTint();
    const last = this.r.log[this.r.log.length - 1];
    if (last) { this.hpP = last.hpP; this.hpE = last.hpE; this.drawBars(); }
    if (this.hpE <= 0) this.tweens.add({ targets: this.foe, alpha: 0.25, duration: 400 });
    if (this.hpP <= 0) this.tweens.add({ targets: this.hero.image, alpha: 0.35, duration: 400 });
    this.bus.emit('battle:end', { i: this.r.log.length });
  }
}
