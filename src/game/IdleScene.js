// 戰鬥地圖的掛機畫面：主角往前走（背景跟著捲動），走一段就遇到一群從右邊跑來的魔物，
// 魔物進到武器打得到的距離就停下來，用武器的三段連招打，一次可以打到好幾隻；打完再繼續往前走。
// 這裡只是表演：經驗、金幣、掉落還是由 core 每 5 秒結算一次（結算時頭上跳出這次的收穫）。
import * as Phaser from 'phaser';
import { data as D } from '../core/data.js';
import { world as Wd } from '../core/world.js';
import { RigHero, enemyTexture } from './textures.js';
import { Scenery } from './scenery.js';
import { W, GROUND, FONT, HERO_X } from './config.js';

const WALK_SPEED = 40;          // 走路時地面往後退多快（像素／秒），配合走路動作的步伐（一步約 0.35 秒），腳才不會滑
const WALK_MS = [1600, 3200];   // 打完之後走多久才遇到下一群
const WAVE = [2, 5];            // 一群有幾隻
const WAVE_GAP = 420;           // 同一群裡，每隔多久跑出一隻
const MAX_FOES = 9;             // 畫面上最多幾隻（太多就先不生）
// 各種魔物的體型（32×32 圖的放大倍率）、要打幾下、跑多快（像素／秒）、跑步的樣子
const KIND = {
  slime: { size: 0.8, hp: 2, speed: 150, run: 'hop' },
  bug: { size: 0.85, hp: 2, speed: 230, run: 'scuttle' },
  beast: { size: 1.15, hp: 3, speed: 300, run: 'gallop' },
  ghost: { size: 1.05, hp: 3, speed: 170, run: 'float' },
  humanoid: { size: 1.35, hp: 4, speed: 200, run: 'trot' },
  golem: { size: 1.75, hp: 6, speed: 120, run: 'stomp' },
};
// 武器的攻擊範圍（從主角腳底往前算，畫面像素）：近戰打得到範圍內所有魔物，遠程會挑最近的一隻
const RANGE = { sword: 62, hammer: 66, staff: 330, bow: 360, greatsword: 74 };
const FINISH_REACH = { sword: 26, hammer: 26, greatsword: 90 };   // 近戰終結技多打多遠（衝擊波、大劍的火龍與火柱）

export class IdleScene extends Phaser.Scene {
  constructor() { super('Idle'); }

  create() {
    this.bus = this.registry.get('bus');
    this.getState = this.registry.get('getState');
    this.foes = [];
    this.areaIdx = -1;
    this.vx = 0;          // 目前場景捲動的速度：走路時是 WALK_SPEED，遇到魔物就停下來
    this.walk(0);

    this.scenery = new Scenery(this, 0);
    this.hero = new RigHero(this, HERO_X, GROUND);
    this.hero.image.setDepth(2);

    const offs = [
      this.bus.on('state', () => this.refresh()),
      this.bus.on('tick', (sum) => this.onTick(sum)),
    ];
    this.events.once('shutdown', () => offs.forEach((off) => off()));
    this.events.on('wake', () => this.refresh());
    this.refresh();
  }

  refresh() {
    const s = this.getState();
    if (!s) return;
    this.hero.setLook(s.equip, s.appearance);
    const st = Wd.hero(s).stats;
    this.atk = Math.max(st.atk, st.matk); this.crit = st.crit || 0;
    if (s.areaIdx !== this.areaIdx) {          // 換地圖：換場景、清掉場上的魔物
      this.areaIdx = s.areaIdx;
      this.scenery.set(s.areaIdx);
      this.foes.forEach((f) => f.img.destroy());
      this.foes = [];
      this.walk(this.time.now);
    }
  }

  // ---------- 走路與遇敵 ----------
  // 開始往前走，走一段時間後遇到下一群魔物
  walk(time) {
    this.mode = 'walk';
    this.waveAt = time + WALK_MS[0] + Math.random() * (WALK_MS[1] - WALK_MS[0]);
    this.waveLeft = 0;
    if (this.hero && this.hero.anim === 'idle') this.hero.play('walk');
  }
  alive() { return this.foes.filter((f) => !f.dead); }
  // 一群魔物跑出來：時間到了先放第一隻，之後每隔 WAVE_GAP 放一隻
  spawnWave(time) {
    if (this.mode === 'walk' && !this.waveLeft && time >= this.waveAt) {
      this.waveLeft = WAVE[0] + Math.floor(Math.random() * (WAVE[1] - WAVE[0] + 1));
      this.nextSpawn = time;
    }
    if (this.waveLeft && time >= this.nextSpawn && this.alive().length < MAX_FOES) {
      this.spawn();
      this.waveLeft--;
      this.nextSpawn = time + WAVE_GAP * (0.7 + Math.random() * 0.6);
    }
  }
  // 走路時：最近的魔物進到打得到的距離就停下來；戰鬥時：這一群都打完了，停一下再繼續走
  checkMode(time) {
    const style = this.hero.style || 'sword';
    if (this.mode === 'walk') {
      if (this.inReach(this.nearest(), style, 16)) {   // 多留一點距離給煞車
        this.mode = 'fight';
        this.resumeAt = 0;
      }
    } else if (!this.waveLeft && !this.alive().length) {
      this.resumeAt ||= time + 700;
      if (time >= this.resumeAt) this.walk(time);
    }
    // 走路動作：速度快停下來時換回待機，開始走時換成走路（攻擊動作播完會自己回到待機）
    if (this.mode === 'fight' && this.hero.anim === 'walk' && this.vx < 10) this.hero.play('idle');
    if (this.mode === 'walk' && this.hero.anim === 'idle') this.hero.play('walk');
  }

  // ---------- 魔物 ----------
  spawn() {
    const area = D.AREAS[this.areaIdx];
    const m = area.monsters[Math.floor(Math.random() * area.monsters.length)];
    const k = KIND[m.shape] || KIND.slime;
    const size = k.size * (0.92 + Math.random() * 0.16);
    const img = this.add.image(W + 40, GROUND, enemyTexture(this, m.shape, m.c)).setOrigin(0.5, 1).setScale(size).setDepth(1);
    this.foes.push({ img, k, size, hp: k.hp, x: W + 40, kb: 0, ph: Math.random() * 6, nextBite: 0, dead: false,
      half: 16 * size, foot: 2 * size, fly: m.shape === 'ghost' ? 14 : 0 });
  }

  // 每隻魔物跑到主角前面停下；後來的排在前一隻後面一點，擠成一團
  // 主角在走路時，地面往後退，魔物也跟著被往後帶（看起來更快衝過來）
  moveFoes(time, dt) {
    const alive = this.alive().sort((a, b) => a.x - b.x);
    let front = HERO_X + 22;                    // 這一隻的左緣最多跑到哪裡
    for (const f of alive) {
      const target = front + f.half;
      const running = f.x > target + 0.5;
      if (running) f.x = Math.max(target, f.x - ((f.k.speed + this.vx) * dt) / 1000);
      front = Math.max(front, f.x - f.half) + 8;
      f.kb *= Math.pow(0.002, dt / 1000);        // 被打退的距離慢慢回來
      this.pose(f, time, dt, running);
    }
  }

  // 跑步與待機的樣子：只動位置、縮放和角度，所以一張圖就能跑起來
  pose(f, time, dt, running) {
    const sp = running ? f.k.speed / 70 : 1.2;
    f.ph += (dt / 1000) * sp * Math.PI;
    const s = Math.sin(f.ph), a = Math.abs(s), sz = f.size;
    let dy = 0, sx = 1, sy = 1, rot = 0;
    switch (f.k.run) {
      case 'hop': dy = running ? -a * 7 : -a * 1.5; sy = 1 - (running ? 0.18 : 0.06) * Math.cos(f.ph * 2) * 0.5 - (running ? 0.06 : 0); sx = 2 - sy; break;
      case 'gallop': dy = -a * (running ? 4 : 1); rot = running ? s * 0.14 : 0; break;
      case 'scuttle': dy = running ? -(Math.sin(f.ph * 3) > 0 ? 2 : 0) : 0; sy = 1 + (running ? 0.04 : 0.03) * Math.sin(f.ph * 3); break;
      case 'float': dy = -f.fly - Math.sin(time / 300 + f.ph) * 4; rot = Math.sin(time / 500 + f.ph) * 0.08; break;
      case 'trot': dy = -a * (running ? 4 : 1); rot = running ? s * 0.09 : s * 0.03; break;
      case 'stomp': dy = -a * (running ? 3 : 1); rot = s * (running ? 0.06 : 0.02); break;
    }
    f.img.x = Math.round(f.x + f.kb);
    f.img.y = Math.round(GROUND + f.foot + dy);
    f.img.setScale(sz * sx, sz * sy).setRotation(rot);
  }

  // ---------- 主角攻擊 ----------
  nearest() { return this.alive().sort((a, b) => a.x - b.x)[0]; }
  inReach(f, style, extra = 0) { return f && f.x - f.half <= HERO_X + RANGE[style] + extra; }

  attack() {
    const style = this.hero.style || 'sword';
    const t = this.nearest();
    if (!this.inReach(t, style)) return;
    this.hero.setTarget(t.x);
    const hits = this.hero.attack(true, 1.15);
    this.busyUntil = this.time.now + hits[hits.length - 1].ms + 200;
    hits.forEach((h, n) => this.time.delayedCall(h.ms, () => this.strike(style, t, h, n === hits.length - 1)));
  }

  // 一段攻擊命中：決定打到哪些魔物
  strike(style, target, h, last) {
    const alive = this.foes.filter((f) => !f.dead);
    if (!alive.length) return;
    const tgt = !target.dead ? target : this.nearest();
    let hit;
    if (style === 'sword' || style === 'hammer' || style === 'greatsword') {
      const reach = RANGE[style] + (last ? FINISH_REACH[style] : 0);   // 終結技打得比較遠
      hit = alive.filter((f) => f.x - f.half <= HERO_X + reach);
    } else if (style === 'staff') {
      hit = alive.filter((f) => Math.abs(f.x - tgt.x) <= (last ? 90 : 26));   // 魔法球會炸到旁邊的；光束打一整排
    } else {
      hit = last ? alive.filter((f) => f.x >= tgt.x - f.half) : [tgt];        // 弓：最後一箭貫穿
    }
    if (h.power >= 3) this.cameras.main.shake(100, 0.004);
    hit.forEach((f, i) => this.damage(f, h.power >= 3 ? 2 : 1, h.power, i));
  }

  damage(f, n, power, i) {
    f.hp -= n;
    f.kb += 3 + power * 2;
    f.img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(80, () => { if (!f.dead) f.img.clearTint(); });
    // 傷害數字：用角色的攻擊力表演，真正的戰鬥結果由 core 結算
    const crit = Math.random() * 100 < this.crit;
    const v = Math.round(this.atk * (power >= 3 ? 1.6 : 1) * (crit ? 1.8 : 1) * (0.9 + Math.random() * 0.2));
    const t = this.add.text(f.x + (i % 2 ? 8 : -6), f.img.y - f.half * 2 - 2, (crit ? '!' : '') + v, FONT(crit ? 18 : 13, crit ? '#f2b84b' : '#ffffff')).setOrigin(0.5, 1).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 650, ease: 'Quad.out', onComplete: () => t.destroy() });
    if (f.hp <= 0) this.kill(f);
  }

  kill(f) {
    f.dead = true;
    const { img } = f, x = img.x, y = img.y - f.half;
    img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.tweens.add({ targets: img, scaleX: f.size * 1.3, scaleY: f.size * 0.3, alpha: 0, duration: 220, ease: 'Quad.in', onComplete: () => img.destroy() });
    // 碎片往外噴，再掉一顆金幣
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, d = 14 + Math.random() * 12;
      const p = this.add.rectangle(x, y, 2, 2, i % 2 ? 0xffffff : 0xf2b84b).setDepth(5);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 380, ease: 'Quad.out', onComplete: () => p.destroy() });
    }
    const coin = this.add.rectangle(x, y, 4, 4, 0xf2b84b).setStrokeStyle(1, 0xb27b1c).setDepth(5);
    this.tweens.add({ targets: coin, y: y - 18, duration: 200, ease: 'Quad.out', yoyo: true, onComplete: () => this.tweens.add({ targets: coin, alpha: 0, duration: 300, onComplete: () => coin.destroy() }) });
    this.time.delayedCall(300, () => { this.foes = this.foes.filter((x2) => x2 !== f); });
  }

  // 貼在主角面前的魔物偶爾撞一下主角（只是表演）
  bite(time) {
    for (const f of this.foes) {
      if (f.dead || f.x - f.half > HERO_X + 30 || time < f.nextBite) continue;
      f.nextBite = time + 1400 + Math.random() * 1600;
      f.kb -= 6;
      this.hero.flash(70);
    }
  }

  update(time, dt) {
    const s = this.getState();
    if (!s || s.location !== 'battle') return;
    dt = Math.min(dt, 50);                      // 從背景回來時不要一口氣跳太多
    // 速度慢慢加減，起步和煞車才不會一下子跳
    const goal = this.mode === 'walk' ? WALK_SPEED : 0;
    this.vx += (goal - this.vx) * Math.min(1, dt / 140);
    if (Math.abs(goal - this.vx) < 0.5) this.vx = goal;
    this.scenery.update(time, dt, this.vx);
    this.spawnWave(time);
    this.moveFoes(time, dt);
    this.checkMode(time);
    this.bite(time);
    if (this.mode === 'fight' && this.vx < 10 && !(time < this.busyUntil)) this.attack();   // 停穩了才出手
  }

  onTick(sum) {
    const s = this.getState();
    if (!s || !this.scene.isActive() || s.location !== 'battle') return; // 戰鬥播放時掛機場景在睡覺
    const parts = [];
    if (sum.exp) parts.push(`+${sum.exp} EXP`);
    if (sum.gold) parts.push(`+${sum.gold} G`);
    if (sum.items.length) parts.push(`+${sum.items.length} ITEM`);
    if (!parts.length) return;
    const t = this.add.text(HERO_X, this.hero.topY - 10, parts.join('  '), FONT(16, '#f2b84b')).setOrigin(0.3, 1).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 1500, ease: 'Quad.out', onComplete: () => t.destroy() });
  }
}

