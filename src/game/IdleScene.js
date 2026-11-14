// 掛機場景：角色在目前的掛機地點待機，每次結算時播一個小動作和跳字。
import * as Phaser from 'phaser';
import { data as D } from '../core/data.js';
import { Hero, enemyTexture } from './textures.js';
import { W, H, GROUND, FONT, HERO_Y, HERO_SCALE, ENEMY_SCALE, BOSS_SCALE } from './config.js';

const SHORT = { hp: 'HP', atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', spd: 'SPD' };

export class IdleScene extends Phaser.Scene {
  constructor() { super('Idle'); }

  create() {
    this.bus = this.registry.get('bus');
    this.getState = this.registry.get('getState');
    this.sig = '';

    this.bg = this.add.graphics();
    this.glow = this.add.rectangle(372, GROUND - 74, 54, 42, 0xff8c28).setOrigin(0, 0).setVisible(false);
    this.tweens.add({ targets: this.glow, alpha: { from: 0.35, to: 0.75 }, duration: 380, yoyo: true, repeat: -1 });
    this.props = this.add.graphics();

    this.foe = this.add.image(332, GROUND + 6, enemyTexture(this, 'slime', '#62c46a')).setOrigin(0, 1).setScale(ENEMY_SCALE).setVisible(false);
    this.tweens.add({ targets: this.foe, y: '-=2', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.hero = new Hero(this, 96, HERO_Y, HERO_SCALE);
    this.heroX = this.hero.box.x;
    this.tweens.add({ targets: this.hero.box, y: '-=2', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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
    this.hero.setEquip(s.equip);
    const sig = `${s.location}|${s.areaIdx}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.drawPlace(s);
    if (s.location === 'battle') this.nextFoe(s);
    this.foe.setVisible(s.location === 'battle');
  }

  nextFoe(s) {
    const area = D.AREAS[s.areaIdx];
    const m = area.monsters[Math.floor(Math.random() * area.monsters.length)];
    this.foe.setTexture(enemyTexture(this, m.shape, m.c));
  }

  drawPlace(s) {
    const g = this.bg, p = this.props, L = s.location, area = D.AREAS[s.areaIdx];
    const pal = {
      training: ['#4a3a2c', '#6b5240'], battle: [area.sky, area.ground], forge: ['#2a1c18', '#4a3226'],
      market: ['#6a8fb0', '#8a7a5a'], guild: ['#3a2c22', '#5a4434'],
    }[L];
    const c = (h) => parseInt(h.slice(1), 16);
    g.clear();
    g.fillStyle(c(pal[0])).fillRect(0, 0, W, GROUND);
    g.fillStyle(c(pal[1])).fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle(0x000000, 0.18);
    for (let x = 0; x < W; x += 20) g.fillRect(x, GROUND, 10, 3);

    p.clear();
    this.glow.setVisible(L === 'forge');
    const gy = GROUND;
    if (L === 'training') {
      p.fillStyle(0x8a5a2a).fillRect(352, gy - 60, 12, 60).fillRect(338, gy - 46, 40, 8);
      p.fillStyle(0x5a3a1a).fillRect(350, gy - 66, 16, 8);
    } else if (L === 'forge') {
      p.fillStyle(0x3a3a44).fillRect(364, gy - 32, 70, 32);
      p.fillStyle(0x5a5a66).fillRect(330, gy - 22, 26, 10).fillRect(337, gy - 12, 12, 12);
    } else if (L === 'market') {
      for (let i = 0; i < 6; i++) p.fillStyle(i % 2 ? 0xf2e2c0 : 0xd0584a).fillRect(330 + i * 18, gy - 78, 18, 14);
      p.fillStyle(0x8a5a2a).fillRect(332, gy - 64, 6, 64).fillRect(432, gy - 64, 6, 64).fillRect(330, gy - 28, 110, 8);
      p.fillStyle(0xe0564a).fillRect(350, gy - 36, 8, 8);
      p.fillStyle(0x62c46a).fillRect(370, gy - 36, 8, 8);
      p.fillStyle(0xa565e0).fillRect(390, gy - 36, 8, 8);
    } else if (L === 'guild') {
      p.fillStyle(0x7a5a3a).fillRect(336, gy - 84, 90, 58);
      p.fillStyle(0xe8dcc0);
      for (let i = 0; i < 4; i++) p.fillRect(346 + (i % 2) * 40, gy - 76 + Math.floor(i / 2) * 26, 30, 20);
    } else if (L === 'battle') {
      p.fillStyle(0xffffff, 0.15).fillRect(40, 22, 44, 8).fillRect(220, 36, 60, 8);
    }
  }

  onTick(sum) {
    const s = this.getState();
    if (!s || !this.scene.isActive()) return; // 戰鬥播放時掛機場景在睡覺
    const L = s.location;
    // 角色動作：戰鬥、鍛鍊是往前衝，其他地點是小跳一下
    if (L === 'battle' || L === 'training') {
      this.tweens.add({ targets: this.hero.box, x: this.heroX + 18, duration: 110, yoyo: true, ease: 'Quad.out' });
      this.hero.swing();
    } else {
      this.tweens.add({ targets: this.hero.layers, y: '-=5', duration: 120, yoyo: true, ease: 'Quad.out' });
    }
    if (L === 'battle') {
      this.foe.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(140, () => { this.foe.clearTint(); this.nextFoe(s); });
    }
    const parts = [];
    if (sum.exp) parts.push(`+${sum.exp} EXP`);
    if (sum.gold) parts.push(`+${sum.gold} G`);
    for (const k in sum.train) parts.push(`+${sum.train[k]} ${SHORT[k] || k.toUpperCase()}`);
    if (sum.items.length) parts.push(`+${sum.items.length} ITEM`);
    if (!parts.length) return;
    const t = this.add.text(this.heroX - 6, this.hero.box.y - 10, parts.join('  '), FONT(10, '#f2b84b'));
    this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1500, ease: 'Quad.out', onComplete: () => t.destroy() });
  }
}
