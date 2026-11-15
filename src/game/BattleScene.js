// 戰鬥播放：把 combat.fight() 回傳的紀錄一行一行播出來。戰鬥結果在播放前就已經算好。
import * as Phaser from 'phaser';
import { RigHero, enemyTexture } from './textures.js';
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

    const g = this.add.graphics();
    g.fillStyle(0x1d2740).fillRect(0, 0, W, GROUND);
    g.fillStyle(0x2a3554).fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle(0x34416a);
    for (let x = 0; x < W; x += 32) g.fillRect(x, GROUND, 16, 4);

    this.hero = new RigHero(this, HERO_X, GROUND);
    this.hero.setLook(equip, look);

    const es = foe.boss ? BOSS_SCALE : ENEMY_SCALE;
    this.foe = this.add.image(FOE_X, GROUND + 6, enemyTexture(this, foe.shape, foe.c)).setOrigin(0, 1).setScale(es);   // 站在刀光砍得到的距離
    this.foeX = this.foe.x;
    this.tweens.add({ targets: this.foe, y: '-=4', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.bars = this.add.graphics();
    this.hpTextP = this.add.text(32, 44, '', FONT(18, '#ece4d2'));
    this.hpTextE = this.add.text(W - 32, 44, '', FONT(18, '#ece4d2')).setOrigin(1, 0);
    this.hpP = r.maxHpP; this.hpE = r.maxHpE;
    this.drawBars();

    const log = r.log;
    const step = Math.max(60, Math.min(320, 11000 / Math.max(1, log.length)));
    this.timer = this.time.addEvent({ delay: step, loop: true, callback: () => this.next() });

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

  next() {
    const line = this.r.log[this.i];
    if (!line) { this.finish(); return; }
    this.i++;
    this.hpP = line.hpP; this.hpE = line.hpE;
    this.drawBars();
    if (line.kind !== 'undying') {
      // 燃燒是持續傷害：受傷的是被燒的一方
      const target = line.kind === 'burn' ? (line.who === 'p' ? 'e' : 'p') : line.who === 'p' ? 'e' : 'p';
      this.hit(target, line);
      if (line.kind !== 'burn') this.lunge(line.who, line.crit);
    }
    this.bus.emit('battle:line', { i: this.i - 1, line });
  }

  lunge(who, crit) {
    if (who === 'p') this.hero.play(crit ? 'jump' : 'slash', crit ? 2.2 : 1.6);   // 暴擊用跳斬
    else this.tweens.add({ targets: this.foe, x: this.foeX - 12, duration: 90, yoyo: true, ease: 'Quad.out' });
  }

  hit(target, line) {
    let x, y;
    if (target === 'e') {
      this.foe.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(110, () => this.foe.clearTint());
      x = this.foe.x + this.foe.displayWidth / 2; y = this.foe.y - this.foe.displayHeight;
    } else {
      this.hero.flash(110);
      this.hero.play('hurt');
      x = HERO_X; y = this.hero.topY;
    }
    if (line.crit) this.cameras.main.shake(90, 0.006);
    const color = line.crit && line.kind === 'attack' ? '#f2b84b' : FLOAT[line.kind] || '#ffffff';
    const t = this.add.text(x, y + 30, (line.crit ? '!' : '') + Math.round(line.dmg).toLocaleString('en-US'), FONT(line.crit ? 24 : 18, color)).setOrigin(0.5, 1);
    this.tweens.add({ targets: t, y: t.y - 44, alpha: 0, duration: 850, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.timer) this.timer.remove();
    const last = this.r.log[this.r.log.length - 1];
    if (last) { this.hpP = last.hpP; this.hpE = last.hpE; this.drawBars(); }
    if (this.hpE <= 0) this.tweens.add({ targets: this.foe, alpha: 0.25, duration: 400 });
    if (this.hpP <= 0) this.tweens.add({ targets: this.hero.image, alpha: 0.35, duration: 400 });
    this.bus.emit('battle:end', { i: this.r.log.length });
  }
}
