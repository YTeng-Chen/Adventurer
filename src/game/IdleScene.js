// 掛機場景：只在「戰鬥地圖」掛機時顯示。角色待機，每次結算時揮一刀、魔物閃一下並換一隻，跳出這次的收穫。
import * as Phaser from 'phaser';
import { data as D } from '../core/data.js';
import { RigHero, enemyTexture } from './textures.js';
import { W, H, GROUND, FONT, HERO_X, FOE_X, ENEMY_SCALE } from './config.js';

export class IdleScene extends Phaser.Scene {
  constructor() { super('Idle'); }

  create() {
    this.bus = this.registry.get('bus');
    this.getState = this.registry.get('getState');
    this.sig = '';

    this.bg = this.add.graphics();
    this.foe = this.add.image(FOE_X, GROUND + 12, enemyTexture(this, 'slime', '#62c46a')).setOrigin(0, 1).setScale(ENEMY_SCALE);
    this.tweens.add({ targets: this.foe, y: '-=4', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.hero = new RigHero(this, HERO_X, GROUND);

    const offs = [
      this.bus.on('state', () => this.refresh()),
      this.bus.on('tick', (sum) => this.onTick(sum)),
    ];
    this.events.once('shutdown', () => offs.forEach((off) => off()));
    this.events.on('wake', () => { this.sig = ''; this.refresh(); });
    this.refresh();
  }

  refresh() {
    const s = this.getState();
    if (!s) return;
    this.hero.setLook(s.equip, s.appearance);
    const sig = String(s.areaIdx);
    if (sig === this.sig) return;
    this.sig = sig;
    this.drawPlace(s);
    this.nextFoe(s);
  }

  nextFoe(s) {
    const area = D.AREAS[s.areaIdx];
    const m = area.monsters[Math.floor(Math.random() * area.monsters.length)];
    this.foe.setTexture(enemyTexture(this, m.shape, m.c));
  }

  drawPlace(s) {
    const g = this.bg, area = D.AREAS[s.areaIdx];
    const c = (h) => parseInt(h.slice(1), 16);
    g.clear();
    g.fillStyle(c(area.sky)).fillRect(0, 0, W, GROUND);
    g.fillStyle(0xffffff, 0.15).fillRect(56, 60, 88, 16).fillRect(380, 108, 120, 16);
    g.fillStyle(c(area.ground)).fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle(0x000000, 0.18);
    for (let x = 0; x < W; x += 40) g.fillRect(x, GROUND, 20, 6);
  }

  onTick(sum) {
    const s = this.getState();
    if (!s || !this.scene.isActive() || s.location !== 'battle') return; // 戰鬥播放時掛機場景在睡覺
    this.hero.play('slash');
    this.foe.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(140, () => { this.foe.clearTint(); this.nextFoe(s); });
    const parts = [];
    if (sum.exp) parts.push(`+${sum.exp} EXP`);
    if (sum.gold) parts.push(`+${sum.gold} G`);
    if (sum.items.length) parts.push(`+${sum.items.length} ITEM`);
    if (!parts.length) return;
    const t = this.add.text(HERO_X, this.hero.topY - 10, parts.join('  '), FONT(20, '#f2b84b')).setOrigin(0.3, 1);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 1500, ease: 'Quad.out', onComplete: () => t.destroy() });
  }
}
