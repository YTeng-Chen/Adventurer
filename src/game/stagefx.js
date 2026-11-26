// 戰鬥畫面尺度的大型特效：炎龍大劍的連招、炎龍套裝的光環、劍上的火。
// 角色身上的小特效（刀光、劍上的火舌）畫在骨架裡（src/rig/）；這裡畫的是要佔滿整個戰鬥畫面的部分：
// 火焰新月斬、橫越地面的火焰波、蓄力時畫面變暗與火焰漩渦、橫越天空的火龍、衝上畫面頂端的火柱、
// 命中時的停頓、鏡頭拉近、閃光、衝擊波、熔岩裂縫、碎石與火星雨。
// 混色：火焰本體（火柱、火龍、新月斬、火焰粒子）用一般混色，才保得住火的顏色；加亮混色只用在小亮點和光暈，
// 不然疊在白天的天空上會整片變白。
// 時間點都用連招的進度（0–1）表示，跟著 rig.js 的 COMBOS.greatsword 走。
// 擴充：主題套裝的大型特效由 src/rig/sets/<套裝>.js 的 stage 設定（stageTheme），RigHero.attack 會自動呼叫
// greatsword()（大劍）或 finisher()（其他形態）。套裝的畫面光環寫在 update() 裡，看 this.sets。
import * as Phaser from 'phaser';
import { W, H, GROUND } from './config.js';

const FIRE = [0xfff6d6, 0xffd166, 0xff8a2a, 0xe8461a, 0x8a1c10];
const ADD = Phaser.BlendModes.ADD, NORMAL = Phaser.BlendModes.NORMAL;
// 大劍連招裡各段的時間點（連招進度 0–1）。命中時間和 rig.js 的 hits 一致
// 炎龍的特效：顏色是火、大劍終結技召喚火龍、劍身一直燒著
const DRAGON_STAGE = { key: 'dragon', F: FIRE, beast: 'dragon', bladeFire: true, tier: 5 };
export const GS = { ignite: 0.02, hit1: 0.123, hit2: 0.292, charge: 0.36, launch: 0.577, hit3: 0.769, end: 1 };

// ---------- 用程式畫的貼圖（像素風：光暈是一圈一圈的階梯，不是平滑漸層） ----------
function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  scene.textures.addCanvas(key, c);
}
const css = (n, a = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
function makeTextures(scene, FIRE, sfx) {
  tex(scene, 'fx-px', 2, 2, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 2, 2); });
  // 圓形光暈（白色，用 tint 上色）
  tex(scene, 'fx-glow', 32, 32, (g) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5) / 16;
      if (d > 1) continue;
      g.fillStyle = `rgba(255,255,255,${d < 0.25 ? 1 : d < 0.5 ? 0.55 : d < 0.75 ? 0.25 : 0.1})`; g.fillRect(x, y, 1, 1);
    }
  });
  // 小火團（火焰粒子）
  tex(scene, 'fx-flame', 8, 8, (g) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const d = Math.hypot(x - 3.5, y - 3.5) / 4; if (d <= 1) { g.fillStyle = `rgba(255,255,255,${d < 0.5 ? 1 : 0.5})`; g.fillRect(x, y, 1, 1); } }
  });
  // 火焰新月斬：外緣最亮，往內轉紅，兩端收尖
  tex(scene, 'fx-slash-' + sfx, 96, 128, (g) => {
    const cx = 20, cy = 64, R = 70;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 96; x++) {
      const r = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx) / (Math.PI / 2.4);
      if (Math.abs(a) > 1) continue;
      const th = 22 * (1 - a * a), k = (R - r) / th;
      if (k < 0 || k > 1) continue;
      g.fillStyle = css(k < 0.12 ? FIRE[0] : k < 0.35 ? FIRE[1] : k < 0.65 ? FIRE[2] : FIRE[3], k > 0.85 ? 0.6 : 1); g.fillRect(x, y, 1, 1);
    }
  });
  // 圓環（衝擊波、熔岩圈）
  tex(scene, 'fx-ring', 64, 64, (g) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x - 31.5, y - 31.5); if (d <= 31.5 && d >= 27) { g.fillStyle = `rgba(255,255,255,${d > 30 ? 0.5 : 1})`; g.fillRect(x, y, 1, 1); } }
  });
  // 火柱：中心白熱、往外轉橘紅，平頂、頂端碎成一根根火舌
  tex(scene, 'fx-pillar-' + sfx, 32, 128, (g) => {
    const tongue = (x) => Math.round(4 + 10 * Math.abs(Math.sin(x * 2.3) * Math.cos(x * 0.7)));   // 每一欄的火舌長短不一
    for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) {
      const d = Math.abs(x - 15.5) / 16, w = 1 - Math.abs(Math.sin(y * 0.35 + x)) * 0.12;
      if (d > w || y < 16 - tongue(x)) continue;
      const k = d / w;
      g.fillStyle = css(k < 0.2 ? FIRE[0] : k < 0.45 ? FIRE[1] : k < 0.75 ? FIRE[2] : FIRE[3], y < 6 ? 0.5 : 1); g.fillRect(x, y, 1, 1);
    }
  });
  // 往上的光柱（蓄力時背後升起）
  tex(scene, 'fx-ray', 4, 64, (g) => { for (let y = 0; y < 64; y++) { g.fillStyle = `rgba(255,255,255,${(y / 64) ** 1.5})`; g.fillRect(0, y, 4, 1); } });
  // 實心火球（火龍的身體）：中間不透明，邊緣一圈半透明
  tex(scene, 'fx-orb', 16, 16, (g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; if (d <= 1) { g.fillStyle = `rgba(255,255,255,${d < 0.75 ? 1 : 0.55})`; g.fillRect(x, y, 1, 1); } }
  });
  // 火龍的頭（朝右，48×32）：頭顱、往前的長吻、張開的下顎、獠牙、發亮的眼睛、往後的雙角與火鬃，外圈描深紅邊
  tex(scene, 'fx-dhead-' + sfx, 52, 34, (g) => {
    const px = new Map(), set = (x, y, c) => px.set(`${x},${y}`, c);
    for (let y = 0; y < 34; y++) for (let x = 0; x < 52; x++) {
      const skull = ((x - 15) / 12) ** 2 + ((y - 15) / 9) ** 2 <= 1;
      const upper = x >= 18 && x <= 49 && y >= 8 + (x - 18) * 0.12 && y <= 18 - Math.max(0, x - 40) * 0.5;      // 上顎往前收尖
      const lower = x >= 16 && x <= 44 && y >= 21 + (x - 16) * 0.12 && y <= 26 + (x - 16) * 0.05 - Math.max(0, x - 38) * 0.6;   // 下顎往下張開
      const mane = x <= 9 && y >= 4 && y <= 28 && ((y + Math.floor(x / 2)) % 5) < 3 && x >= 9 - ((y * 7) % 9);    // 後腦的火鬃
      if (!(skull || upper || lower || mane)) continue;
      const shade = y < 11 ? FIRE[1] : y < 16 ? FIRE[2] : lower ? FIRE[3] : FIRE[2];
      set(x, y, mane ? (x % 3 ? FIRE[2] : FIRE[1]) : shade);
    }
    for (let i = 0; i < 14; i++) for (const [ox, oy] of [[0, 0], [0, 1], [1, 1]]) set(14 - i + ox, 6 - Math.round(i * 0.42) + oy, i > 9 ? FIRE[0] : FIRE[1]);   // 兩支往後的角
    for (let i = 0; i < 11; i++) for (const [ox, oy] of [[0, 0], [0, 1]]) set(19 - i + ox, 8 - Math.round(i * 0.25) + oy, FIRE[1]);
    for (const [x, y] of [[29, 11], [30, 11], [31, 11], [29, 12], [30, 12], [31, 12]]) set(x, y, 0xffffff);                       // 眼睛
    for (const [x, y] of [[28, 10], [32, 10], [32, 12]]) set(x, y, FIRE[0]);
    set(46, 12, FIRE[4]); set(47, 12, FIRE[4]);                                                                                     // 鼻孔
    for (let x = 22; x <= 42; x += 4) { set(x, 19, 0xffffff); set(x, 20, FIRE[0]); }                                               // 上排獠牙
    for (let x = 24; x <= 38; x += 5) set(x, 21, 0xffffff);                                                                         // 下排獠牙
    const out = new Map(px);
    for (const k of px.keys()) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!px.has(`${x + dx},${y + dy}`)) out.set(`${x + dx},${y + dy}`, FIRE[4]); }
    for (const [k, c] of out) { const [x, y] = k.split(',').map(Number); if (x < 0 || y < 0 || x >= 52 || y >= 34) continue; g.fillStyle = css(c); g.fillRect(x, y, 1, 1); }
  });
}

// 主題套裝用的貼圖（顏色跟著那一套）：從地面竄出的尖柱、亡靈的骷髏頭、隕石、幽魂
function makeThemeTextures(scene, F, sfx) {
  // 尖柱（晶柱、岩柱、骨刺、樹根）：底寬頂尖，靠左的一面亮、靠右的一面暗，中間一道亮線
  tex(scene, 'fx-spike-' + sfx, 24, 96, (g) => {
    for (let y = 0; y < 96; y++) {
      const half = 1 + (y / 96) * 10.5;
      for (let x = 0; x < 24; x++) {
        const d = (x - 11.5) / half;
        if (Math.abs(d) > 1) continue;
        g.fillStyle = css(Math.abs(d) > 0.85 ? F[4] : d < -0.35 ? F[1] : d < 0.05 ? F[0] : d < 0.5 ? F[2] : F[3]); g.fillRect(x, y, 1, 1);
      }
    }
  });
  // 骷髏頭（亡靈大劍的終結技，朝右）：頭骨、眼窩裡的鬼火、上排牙齒
  tex(scene, 'fx-skull-' + sfx, 30, 30, (g) => {
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
      const skull = ((x - 14) / 13) ** 2 + ((y - 12) / 11) ** 2 <= 1, jaw = x >= 8 && x <= 24 && y >= 20 && y <= 27;
      if (!skull && !jaw) continue;
      let c = y < 8 ? 0xf4f0e4 : 0xcfc8b4;
      if (jaw && !skull) c = (x % 3 === 0 && y < 24) ? 0x2a2030 : 0xb8b09c;
      if (Math.hypot(x - 19, y - 13) < 3.2 || Math.hypot(x - 10, y - 13) < 3) c = Math.hypot(x - 19, y - 13) < 1.6 || Math.hypot(x - 10, y - 13) < 1.4 ? F[0] : F[2];
      if (x >= 13 && x <= 16 && y >= 17 && y <= 19) c = 0x2a2030;
      g.fillStyle = css(c); g.fillRect(x, y, 1, 1);
    }
  });
  // 隕石（岩王大劍的終結技）：一顆粗糙的岩塊，下緣燒紅
  tex(scene, 'fx-rock-' + sfx, 28, 28, (g) => {
    for (let y = 0; y < 28; y++) for (let x = 0; x < 28; x++) {
      const r = 12 + Math.sin(Math.atan2(y - 14, x - 14) * 5) * 1.6, d = Math.hypot(x - 14, y - 14);
      if (d > r) continue;
      const lit = (x - 14) * 0.4 + (y - 14);
      g.fillStyle = css(d > r - 2.5 && lit > 2 ? F[1] : lit > 6 ? F[2] : lit < -6 ? 0x8a7a6a : lit < 0 ? 0x5a4a40 : 0x3a2e28); g.fillRect(x, y, 1, 1);
    }
  });
  // 幽魂：圓頭、往後拖的尾巴、兩個黑眼睛（朝右）
  tex(scene, 'fx-ghost-' + sfx, 24, 14, (g) => {
    for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) {
      const head = Math.hypot(x - 17, y - 7) <= 6, tail = x < 17 && Math.abs(y - 7 - Math.sin(x * 0.6) * 1.5) <= (x / 17) * 5;
      if (!head && !tail) continue;
      let c = head ? F[0] : x > 9 ? F[1] : F[2];
      if ((x === 19 || x === 15) && (y === 6 || y === 7)) c = F[4];
      g.fillStyle = css(c, head ? 1 : 0.55 + x / 40); g.fillRect(x, y, 1, 1);
    }
  });
}

export class StageFx {
  // hero：RigHero（提供腳底位置、劍的畫面座標、目標位置）
  // theme：這一組特效用的顏色與造型（stageTheme）；沒給就是炎龍
  constructor(scene, hero, theme = DRAGON_STAGE) {
    this.scene = scene; this.hero = hero; this.theme = theme; this.F = theme.F;
    makeTextures(scene, this.F, theme.key);
    makeThemeTextures(scene, this.F, theme.key);
    const em = (key, cfg, depth = 2.6) => scene.add.particles(0, 0, key, { emitting: false, blendMode: ADD, ...cfg }).setDepth(depth);
    this.embers = em('fx-px', { lifespan: { min: 700, max: 1500 }, speed: { min: 20, max: 90 }, angle: { min: 235, max: 305 }, gravityY: -30,
      scale: { start: 1.6, end: 0 }, alpha: { start: 1, end: 0 }, color: [this.F[0], this.F[1], this.F[2], this.F[3]] });
    this.flames = em('fx-flame', { lifespan: { min: 260, max: 560 }, speed: { min: 10, max: 50 }, angle: { min: 250, max: 290 }, gravityY: -120, blendMode: NORMAL,
      scale: { start: 1.6, end: 0.2 }, alpha: { start: 1, end: 0 }, color: [this.F[0], this.F[1], this.F[2], this.F[3], this.F[4]] });
    // 火柱：大團火焰從地面往上噴
    this.column = em('fx-flame', { lifespan: { min: 380, max: 700 }, speedY: { min: -900, max: -520 }, speedX: { min: -40, max: 40 }, blendMode: NORMAL,
      scale: { start: 4.5, end: 1.2 }, alpha: { start: 1, end: 0 }, color: [this.F[0], this.F[1], this.F[2], this.F[3], this.F[4]], colorEase: 'quad.in' }, 2.9);
    this.sparks = em('fx-px', { lifespan: { min: 250, max: 600 }, speed: { min: 160, max: 420 }, angle: { min: 200, max: 340 }, gravityY: 500,
      scale: { start: 1.2, end: 0.4 }, alpha: { start: 1, end: 0 }, color: [this.F[0], this.F[1], this.F[2]] });
    this.debris = em('fx-px', { lifespan: 1000, speed: { min: 110, max: 280 }, angle: { min: 215, max: 325 }, gravityY: 650, blendMode: Phaser.BlendModes.NORMAL,
      scale: { min: 1.5, max: 3 }, tint: [0x3a2a24, 0x5a4234, 0x2a1d18] }, 2.4);
    this.smoke = em('fx-glow', { lifespan: 1400, speed: { min: 10, max: 40 }, angle: { min: 240, max: 300 }, blendMode: Phaser.BlendModes.NORMAL,
      scale: { start: 0.8, end: 3 }, alpha: { start: 0.45, end: 0 }, tint: 0x2a1616 }, 2.3);
    this.inward = em('fx-flame', { lifespan: 380, scale: { start: 1.4, end: 0.3 }, alpha: { start: 0.2, end: 1 }, color: [this.F[3], this.F[2], this.F[1], this.F[0]], blendMode: NORMAL,
      moveToX: { onEmit: () => this.hero.x }, moveToY: { onEmit: () => this.hero.groundY - 30 } });
    // 蓄力時壓暗背景（魔物也一起暗），角色和特效在上面
    this.dark = scene.add.rectangle(0, 0, W, H, 0x050208, 1).setOrigin(0, 0).setDepth(1.5).setAlpha(0);
    // 套裝光環：角色背後脈動的火光
    this.halo = scene.add.image(hero.x, hero.groundY - 26, 'fx-glow').setBlendMode(ADD).setTint(this.F[2]).setDepth(1.9).setAlpha(0).setScale(3.4);
    // 命中時的火光（比鏡頭的 flash 淡、也比較短）
    this.flashRect = scene.add.rectangle(0, 0, W, H, this.F[2], 1).setOrigin(0, 0).setBlendMode(ADD).setDepth(3.5).setAlpha(0);
    // 穿齊套裝時的火光輪廓：用角色同一張圖再畫一份，塗成橘紅、加亮、放大一點墊在後面（比濾鏡省很多）
    this.aura = scene.add.image(hero.x, hero.groundY, hero.tex.key).setOrigin(hero.image.originX, hero.image.originY)
      .setTint(this.F[2]).setTintMode(Phaser.TintModes.FILL).setBlendMode(ADD).setDepth(1.95).setVisible(false);
    this.lastEmit = 0; this.sets = {};
    // 主題套裝用：水滴（往外噴、會落下）、葉子（慢慢飄落）
    this.drops = em('fx-orb', { lifespan: 900, speed: { min: 120, max: 330 }, angle: { min: 200, max: 340 }, gravityY: 700, blendMode: NORMAL,
      scale: { start: 0.55, end: 0.2 }, alpha: { start: 1, end: 0.4 }, tint: [this.F[1], this.F[2], this.F[3]] }, 2.6);
    this.leaves = em('fx-px', { lifespan: { min: 1200, max: 2200 }, speedX: { min: -60, max: 60 }, speedY: { min: -40, max: 40 }, gravityY: 40, rotate: { min: 0, max: 360 },
      blendMode: NORMAL, scale: { min: 1.4, max: 2.6 }, alpha: { start: 1, end: 0 }, tint: [this.F[1], this.F[2], this.F[3]] }, 2.6);
    this.objs = [this.drops, this.leaves, this.embers, this.flames, this.column, this.sparks, this.debris, this.smoke, this.inward, this.dark, this.halo, this.flashRect, this.aura];
  }
  key(name) { return name + '-' + this.theme.key; }
  // 換了一套特效（換武器、換套裝）時，把舊的整組拿掉。
  // 不能馬上銷毀：連招放到一半時，還有排好的計時器、補間會繼續往粒子發射器噴東西，
  // 發射器已經銷毀的話 Phaser 會丟錯誤，整個遊戲迴圈就停住（換裝備時當機）。
  // 所以先把常駐的光環、暗場藏起來、停止發射，等排好的特效都播完（最長約 3 秒）再真的銷毀。
  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.aura.setVisible(false); this.halo.setAlpha(0);
    const sc = this.scene, kill = () => { for (const o of this.objs) if (o.scene) o.destroy(); };
    if (sc.sys.isActive()) sc.time.delayedCall(5000, kill); else kill();
  }

  // 每一格：劍上的火、套裝光環
  update(time) {
    const h = this.hero, b = h.bladeStage;
    if (b && this.theme.bladeFire && time - this.lastEmit > 45) {                     // 劍上一直燒著的火：沿著劍身隨機冒火
      this.lastEmit = time;
      for (let i = 0; i < 2; i++) { const k = Math.random(); this.flames.emitParticleAt(b.base[0] + (b.tip[0] - b.base[0]) * k, b.base[1] + (b.tip[1] - b.base[1]) * k, 1); }
    }
    const n = this.sets[this.theme.key] || 0;
    if (n >= 2 && Math.random() < (n >= 4 ? 0.5 : 0.18)) this.embers.emitParticleAt(h.x + (Math.random() - 0.5) * 36, h.groundY - Math.random() * 50, 1);
    this.halo.setPosition(h.x, h.groundY - 26).setAlpha(n >= 4 ? 0.28 + 0.12 * Math.sin(time / 260) : 0);
    if (n >= 4) {
      const img = h.image, k = 1.07 + 0.02 * Math.sin(time / 180);
      this.aura.setVisible(true).setPosition(img.x, img.y + 1).setScale(img.scaleX * k, img.scaleY * k).setAlpha(0.45 + 0.2 * Math.sin(time / 230));
    } else this.aura.setVisible(false);
  }

  // 穿了幾件炎龍套裝：2 件以上飄火星，穿齊時角色外圍有一圈火光輪廓、背後有脈動的火光
  setSets(counts) { this.sets = counts || {}; }

  // ---------- 大劍連招：ms 是整套連招播多久；calm 為 true 時（掛機）暗場淡一點 ----------
  greatsword(ms, calm = false) {
    const sc = this.scene, h = this.hero, at = (k, fn) => sc.time.delayedCall(k * ms, fn);
    const tx = () => h.targetX ?? h.x + 60, ty = () => h.groundY - 26;
    at(GS.ignite, () => this.ignite());
    at(GS.hit1, () => this.crescent(tx(), ty(), -28, 1.25));
    at(GS.hit2, () => { this.crescent(tx(), ty() + 6, 8, 1.1); this.fireWave(h.x + 20, ms * 0.22); });
    at(GS.charge, () => this.charge((GS.launch - GS.charge) * ms, calm));
    at(GS.launch, () => this.dragon((GS.hit3 - GS.launch) * ms, tx()));
    at(GS.hit3, () => this.impact(tx(), calm));
  }
  // 單發快攻（連鎖、反擊）：一道火焰新月
  quick(ms) { const h = this.hero; this.scene.time.delayedCall(ms * 0.62, () => this.crescent(h.targetX ?? h.x + 60, h.groundY - 26, -20, 0.8)); }

  // ---------- 主題套裝的連招特效（劍、弓、鎚、法杖）：前面幾段命中時小小的爆光，最後一段蓄力、大爆發 ----------
  // hits：連招的命中時間表（rig.js 的 hits，0–1）；theme.stage：{ slash（前幾段用新月斬）, parts（終結技的組成）, n（數量） }
  //   parts：spikes 地面竄出尖柱、pillar 衝上天的光柱、wisps 幽魂從身邊飛向目標、slashx 兩道交叉的巨大斬擊、
  //          rain 從天上落下的箭雨或火雨、drops 噴濺的水滴、steam 蒸氣與齒輪碎片、leaves 漫天落葉
  finisher(ms, calm, hits) {
    const sc = this.scene, h = this.hero, st = this.theme.stage, at = (k, fn) => sc.time.delayedCall(k * ms, fn);
    const tx = () => h.targetX ?? h.x + 60, ty = () => h.groundY - 26;
    hits.slice(0, -1).forEach((ht, i) => at(ht.t, () => this.pop(tx(), ty() + (i % 2 ? 6 : -4), st.slash, i)));
    const last = hits[hits.length - 1].t, lead = Math.min(0.28, last * 0.4);
    at(last - lead, () => {
      this.charge(lead * ms, calm);
      if (st.parts.includes('wisps')) this.wisps(lead * ms, tx(), ty());
      if (st.parts.includes('rain')) this.rain(lead * ms, tx());
    });
    at(last, () => this.burst(tx(), calm, st));
  }
  // 前幾段命中：新月斬（劍、鎚）或爆光（弓、法杖）
  pop(x, y, slash, i) {
    if (slash) { this.crescent(x, y, i % 2 ? 10 : -26, 0.9); return; }
    this.glow(x, y, this.F[1], 2.6, 220);
    this.sparks.explode(14, x, y); this.embers.explode(12, x, y);
    this.scene.cameras.main.shake(70, 0.004);
  }
  // 單發快攻（主題套裝）
  quickHit(ms, hits) { const h = this.hero; this.scene.time.delayedCall(ms * hits[0].t, () => this.pop(h.targetX ?? h.x + 60, h.groundY - 26, this.theme.stage.slash, 0)); }
  // 終結技命中
  burst(x, calm, st) {
    const sc = this.scene, cam = sc.cameras.main, gy = GROUND, n = st.n || (this.theme.tier >= 4 ? 9 : 7);
    this.hero.hold(90);
    this.flashRect.setFillStyle(this.F[1]).setAlpha(calm ? 0.2 : 0.38);
    sc.tweens.add({ targets: this.flashRect, alpha: 0, duration: calm ? 160 : 260, ease: 'Quad.out' });
    cam.shake(calm ? 180 : 280, calm ? 0.008 : 0.015);
    const E = Phaser.Math.Easing.Quadratic;
    if (!calm) cam.zoomTo(1.06, 70, E.Out, true, (c, p) => { if (p === 1) cam.zoomTo(1, 380, E.InOut, true); });
    sc.tweens.add({ targets: this.dark, alpha: 0, duration: 420, delay: 80 });
    this.glow(x, gy - 20, this.F[2], 8, 520, 2.7, 0.5);
    this.glow(x, gy - 20, 0xffffff, 3, 180, 3, 0.8);
    for (const [s, d] of [[9, 460], [5, 320]]) {
      const ring = sc.add.image(x, gy, 'fx-ring').setBlendMode(ADD).setTint(d > 400 ? this.F[2] : this.F[0]).setDepth(2.5).setScale(0.5, 0.12);
      sc.tweens.add({ targets: ring, scaleX: s, scaleY: s * 0.16, alpha: 0, duration: d, ease: 'Quad.out', onComplete: () => ring.destroy() });
    }
    this.sparks.explode(36, x, gy - 24);
    this.embers.explode(30, x, gy - 30);
    const parts = st.parts;
    if (parts.includes('spikes')) this.spikes(x, gy, n);
    if (parts.includes('pillar')) {
      const pillar = sc.add.image(x, gy + 4, this.key('fx-pillar')).setOrigin(0.5, 1).setDepth(2.88).setScale(1.2, 0).setAlpha(0.95);
      sc.tweens.add({ targets: pillar, scaleY: (gy + 10) / 128, scaleX: 1.8, duration: 110, ease: 'Quad.out',
        onComplete: () => sc.tweens.add({ targets: pillar, alpha: 0, scaleX: 2.6, duration: 560, ease: 'Quad.in', onComplete: () => pillar.destroy() }) });
      sc.time.addEvent({ delay: 16, repeat: 20, callback: () => this.column.emitParticleAt(x + (Math.random() - 0.5) * 30, gy - 4, 3) });
    }
    if (parts.includes('slashx')) for (const [a, d] of [[-40, 0], [40, 70]]) sc.time.delayedCall(d, () => this.crescent(x + 20, gy - 40, a, 2.1));
    if (parts.includes('drops')) { this.drops.explode(40, x, gy - 20); this.smoke.explode(6, x, gy - 20); }
    if (parts.includes('steam')) {
      this.smoke.setParticleTint(0xd8d4cc); this.smoke.explode(16, x, gy - 16); this.smoke.setParticleTint(0x2a1616);
      this.debris.explode(30, x, gy - 6);
      const ring = sc.add.image(x, gy, 'fx-ring').setBlendMode(ADD).setTint(this.F[1]).setDepth(2.5).setScale(0.5, 0.12);
      sc.tweens.add({ targets: ring, scaleX: 14, scaleY: 2.2, alpha: 0, duration: 620, ease: 'Quad.out', onComplete: () => ring.destroy() });
    }
    if (parts.includes('leaves')) { this.leaves.explode(40, x, gy - 40); sc.time.delayedCall(200, () => { for (let i = 0; i < 30; i++) this.leaves.emitParticleAt(Math.random() * W, 10 + Math.random() * 60, 1); }); }
    if (!calm) sc.time.delayedCall(220, () => { for (let i = 0; i < 30; i++) this.embers.emitParticleAt(Math.random() * W, 20 + Math.random() * 120, 1); });
  }
  // 從地面竄出的尖柱：一根接一根，從中間往兩邊，停一下再沉回去
  spikes(x, gy, n) {
    const sc = this.scene;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2, sx = x + k * 16 + (Math.random() - 0.5) * 6, h = (1.3 - Math.abs(k) / n) * (0.9 + Math.random() * 0.4);
      sc.time.delayedCall(Math.abs(k) * 40, () => {
        const sp = sc.add.image(sx, gy + 6, this.key('fx-spike')).setOrigin(0.5, 1).setDepth(2.86).setAngle(k * 6 + (Math.random() - 0.5) * 10).setScale(0.9, 0);
        sc.tweens.add({ targets: sp, scaleY: h * 1.5, duration: 90, ease: 'Back.out',
          onComplete: () => sc.tweens.add({ targets: sp, scaleY: 0, alpha: 0.3, delay: 420, duration: 260, ease: 'Quad.in', onComplete: () => sp.destroy() }) });
        this.debris.explode(4, sx, gy - 4);
        this.sparks.explode(5, sx, gy - h * 60);
      });
    }
  }
  // 幽魂：從角色身邊一隻隻冒出，繞一段弧線撲向目標
  wisps(ms, tx, ty) {
    const sc = this.scene, h = this.hero, n = this.theme.tier >= 4 ? 10 : 7;
    for (let i = 0; i < n; i++) {
      const x0 = h.x + (Math.random() - 0.5) * 60, y0 = h.groundY - 20 - Math.random() * 70, cx = (x0 + tx) / 2 + (Math.random() - 0.5) * 80, cy = Math.min(y0, ty) - 60 - Math.random() * 90;
      const d = ms * (0.55 + 0.45 * (i / n));
      sc.time.delayedCall(ms - d, () => {
        const gh = sc.add.image(x0, y0, this.key('fx-ghost')).setDepth(2.84).setScale(2.2).setAlpha(0);
        const glow = sc.add.image(x0, y0, 'fx-glow').setBlendMode(ADD).setTint(this.F[1]).setDepth(2.83).setScale(1.6).setAlpha(0.5);
        let px = x0, py = y0;
        sc.tweens.addCounter({ from: 0, to: 1, duration: d, ease: 'Sine.in', onUpdate: (tw) => {
          const u = tw.getValue(), x = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * tx, y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * ty;
          gh.setPosition(x, y).setRotation(Math.atan2(y - py, x - px)).setAlpha(Math.min(1, u * 5)); glow.setPosition(x, y); px = x; py = y;
          if (Math.random() < 0.4) this.embers.emitParticleAt(x, y, 1);
        }, onComplete: () => { gh.destroy(); glow.destroy(); } });
      });
    }
  }
  // 箭雨（火雨）：從畫面上方斜斜落到目標附近，最後一根剛好在終結技命中時落地
  rain(ms, tx) {
    const sc = this.scene, n = this.theme.tier >= 4 ? 14 : 10;
    for (let i = 0; i < n; i++) {
      const d = 260, start = Math.max(0, ms - d - (n - 1 - i) * (ms * 0.5 / n)), x1 = tx + (Math.random() - 0.5) * 120, x0 = x1 - 90;
      sc.time.delayedCall(start, () => {
        const ar = sc.add.image(x0, -20, this.key('fx-ghost')).setDepth(2.84).setScale(1.8, 1.2).setRotation(Math.atan2(GROUND + 20, 90));
        sc.tweens.add({ targets: ar, x: x1, y: GROUND - 4, duration: d, ease: 'Quad.in', onComplete: () => { ar.destroy(); this.sparks.explode(6, x1, GROUND - 4); this.glow(x1, GROUND - 6, this.F[1], 1.6, 200); } });
      });
    }
  }

  ignite() {
    const b = this.hero.bladeStage;
    if (!b) return;
    for (let i = 0; i < 16; i++) { const k = i / 15; this.flames.emitParticleAt(b.base[0] + (b.tip[0] - b.base[0]) * k, b.base[1] + (b.tip[1] - b.base[1]) * k, 2); }
    this.glow(b.tip[0], b.tip[1], this.F[1], 2.2, 220);
  }
  // 一閃而過的光暈
  glow(x, y, color, scale, ms, depth = 2.7, alpha = 0.7) {
    const g = this.scene.add.image(x, y, 'fx-glow').setBlendMode(ADD).setTint(color).setScale(scale * 0.4).setDepth(depth).setAlpha(alpha);
    this.scene.tweens.add({ targets: g, scale, alpha: 0, duration: ms, ease: 'Quad.out', onComplete: () => g.destroy() });
    return g;
  }
  // 火焰新月斬：在目標身上展開再消失，噴出火星與火花
  crescent(x, y, angle, size) {
    const sc = this.scene;
    const s = sc.add.image(x - 30, y, this.key('fx-slash')).setDepth(2.8).setAngle(angle).setScale(0.3 * size, 0.6 * size);
    sc.tweens.add({ targets: s, scaleX: 1.6 * size, scaleY: 1.5 * size, x: x - 10, duration: 110, ease: 'Quad.out',
      onComplete: () => sc.tweens.add({ targets: s, alpha: 0, scaleX: 1.9 * size, duration: 240, onComplete: () => s.destroy() }) });
    this.glow(x, y, this.F[2], 4 * size, 260);
    this.embers.explode(26, x, y);
    this.sparks.explode(18, x, y);
    sc.cameras.main.shake(90, 0.005);
  }
  // 火焰波：從角色腳下沿著地面一路燒到畫面右邊
  fireWave(x0, ms) {
    const sc = this.scene, strip = sc.add.rectangle(x0, GROUND - 3, 4, 6, this.F[2]).setOrigin(0, 0.5).setBlendMode(ADD).setDepth(2.5);
    sc.tweens.addCounter({ from: x0, to: W + 30, duration: Math.max(260, ms), ease: 'Quad.out',
      onUpdate: (tw) => {
        const x = tw.getValue();
        this.flames.emitParticleAt(x + Math.random() * 12, GROUND - 2, 3);
        if (Math.random() < 0.5) this.embers.emitParticleAt(x, GROUND - 6, 1);
        strip.width = x - x0;
      },
      onComplete: () => sc.tweens.add({ targets: strip, alpha: 0, duration: 260, onComplete: () => strip.destroy() }) });
    const ring = sc.add.image(x0 + 30, GROUND, 'fx-ring').setBlendMode(ADD).setTint(this.F[1]).setDepth(2.5).setScale(0.6, 0.15);
    sc.tweens.add({ targets: ring, scaleX: 7, scaleY: 1.1, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => ring.destroy() });
    sc.cameras.main.shake(130, 0.007);
  }
  // 蓄力：背景暗下來、火焰漩渦往角色收、腳下熔岩圈擴大、背後升起光柱，開泛光
  charge(ms, calm) {
    const sc = this.scene, h = this.hero, cx = h.x, cy = h.groundY - 30;
    sc.tweens.add({ targets: this.dark, alpha: calm ? 0.32 : 0.55, duration: 160 });
    const n = Math.max(6, Math.round(ms / 30));
    sc.time.addEvent({ delay: 30, repeat: n, callback: () => {
      for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 90; this.inward.emitParticleAt(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, 1); }
    } });
    const ring = sc.add.image(cx, h.groundY, 'fx-ring').setBlendMode(ADD).setTint(this.F[2]).setDepth(1.95).setScale(0.4, 0.1);
    sc.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 0.6, duration: ms, ease: 'Sine.out', onComplete: () => sc.tweens.add({ targets: ring, alpha: 0, duration: 200, onComplete: () => ring.destroy() }) });
    for (let i = 0; i < 6; i++) {
      const r = sc.add.image(cx - 34 + i * 13 + Math.random() * 6, h.groundY, 'fx-ray').setOrigin(0.5, 1).setBlendMode(ADD).setTint(i % 2 ? this.F[1] : this.F[2]).setDepth(1.9).setScale(1 + Math.random(), 0).setAlpha(0.8);
      sc.tweens.add({ targets: r, scaleY: 2.2 + Math.random() * 1.8, duration: ms * (0.6 + 0.4 * Math.random()), ease: 'Sine.out', onComplete: () => sc.tweens.add({ targets: r, alpha: 0, duration: 180, onComplete: () => r.destroy() }) });
    }
    this.glow(cx, cy, this.F[2], 5, ms, 1.95);
  }
  // 火龍：從劍尖衝上天空、在空中繞一圈，再俯衝撲向目標。身體是一串越來越小的火球，後面拖著火焰
  dragon(ms, tx) {
    const sc = this.scene, h = this.hero, b = h.bladeStage;
    const x0 = b ? b.tip[0] : h.x, y0 = b ? b.tip[1] : h.groundY - 60;
    const P = (x, y) => new Phaser.Math.Vector2(x, y);
    const path = new Phaser.Curves.Spline([P(x0, y0), P(h.x + 10, 70), P(h.x + 120, 30), P(Math.min(W - 60, tx + 120), 90), P(tx + 40, 170), P(tx, GROUND - 16)]);
    // 身體：沿著飛行路線取點（不管幀數高低都連成一條），外層是一般混色的火球，裡面一條淡淡的加亮內芯
    const N = 46, SPAN = 0.42, body = [];
    for (let i = 0; i < N; i++) {
      const sz = Math.max(0.55, 2.9 - i * 0.05), col = [this.F[1], this.F[2], this.F[2], this.F[3], this.F[3], this.F[4]][Math.min(5, Math.floor(i / 8))];
      body.push({ i, s: sc.add.image(x0, y0, 'fx-orb').setDepth(2.75 - i * 0.0001).setTint(col).setScale(sz).setVisible(false) });
      body.push({ i, s: sc.add.image(x0, y0, 'fx-orb').setBlendMode(ADD).setDepth(2.76).setTint(this.F[1]).setScale(sz * 0.42).setAlpha(0.35).setVisible(false) });   // 連續的發光內芯
    }
    const beast = this.theme.beast, headKey = beast === 'skull' ? 'fx-skull' : beast === 'rock' ? 'fx-rock' : 'fx-dhead';
    const head = sc.add.image(x0, y0, this.key(headKey)).setDepth(2.85).setScale(beast === 'dragon' ? 2.4 : 2.6);
    const headGlow = sc.add.image(x0, y0, 'fx-glow').setBlendMode(ADD).setTint(this.F[1]).setDepth(2.8).setScale(2.4).setAlpha(0.55);
    sc.tweens.addCounter({ from: 0, to: 1, duration: Math.max(240, ms), ease: 'Sine.in',
      onUpdate: (tw) => {
        const u = tw.getValue(), p = path.getPoint(u), q = path.getPoint(Math.max(0, u - 0.01));
        for (const b of body) {
          const v = u - (b.i / N) * SPAN;
          if (v < 0) { b.s.setVisible(false); continue; }
          const at = path.getPoint(v), wob = Math.sin(v * 40 + b.i) * 2;
          b.s.setPosition(at.x, at.y + wob).setVisible(true);
        }
        head.setPosition(p.x, p.y).setRotation(beast === 'dragon' ? Math.atan2(p.y - q.y, p.x - q.x) : beast === 'rock' ? u * 9 : 0);
        headGlow.setPosition(p.x, p.y);
        this.flames.emitParticleAt(p.x, p.y, 3);
        const tail = path.getPoint(Math.max(0, u - Math.random() * SPAN));
        this.flames.emitParticleAt(tail.x, tail.y, 2);
        if (Math.random() < 0.6) this.embers.emitParticleAt(p.x, p.y, 1);
      },
      onComplete: () => [...body.map((b) => b.s), head, headGlow].forEach((s) => sc.tweens.add({ targets: s, alpha: 0, duration: 160, onComplete: () => s.destroy() })) });
  }
  // 終結技命中：停頓、閃光、鏡頭拉近、大震動、火柱衝上天、兩圈衝擊波、熔岩裂縫、碎石、濃煙、火星雨
  impact(x, calm) {
    const sc = this.scene, cam = sc.cameras.main, gy = GROUND;
    this.hero.hold(90);
    this.flashRect.setAlpha(calm ? 0.25 : 0.45);
    sc.tweens.add({ targets: this.flashRect, alpha: 0, duration: calm ? 160 : 260, ease: 'Quad.out' });
    cam.shake(calm ? 200 : 320, calm ? 0.01 : 0.018);
    const E = Phaser.Math.Easing.Quadratic;   // 鏡頭的緩動要傳函式（字串名稱鏡頭不認得）
    cam.zoomTo(calm ? 1.04 : 1.09, 70, E.Out, true, (c, p) => { if (p === 1) cam.zoomTo(1, 380, E.InOut, true); });
    sc.tweens.add({ targets: this.dark, alpha: 0, duration: 420, delay: 80 });
    // 火柱：一根衝到畫面頂端的火焰柱，加上不斷往上噴的大團火焰
    const pillar = sc.add.image(x, gy + 4, this.key('fx-pillar')).setOrigin(0.5, 1).setDepth(2.88).setScale(1.4, 0).setAlpha(0.95);
    sc.tweens.add({ targets: pillar, scaleY: (gy + 10) / 128, scaleX: 2, duration: 110, ease: 'Quad.out',
      onComplete: () => sc.tweens.add({ targets: pillar, alpha: 0, scaleX: 2.8, duration: 620, ease: 'Quad.in', onComplete: () => pillar.destroy() }) });
    sc.time.addEvent({ delay: 16, repeat: 26, callback: () => { this.column.emitParticleAt(x + (Math.random() - 0.5) * 34, gy - 4, 4); this.embers.emitParticleAt(x + (Math.random() - 0.5) * 60, gy - Math.random() * gy, 1); } });
    this.glow(x, gy - 10, this.F[2], 10, 560, 2.7, 0.55);
    this.glow(x, gy - 10, 0xffffff, 3.5, 200, 3, 0.9);
    // 地面的兩圈衝擊波
    for (const [s, d] of [[11, 480], [6, 340]]) {
      const ring = sc.add.image(x, gy, 'fx-ring').setBlendMode(ADD).setTint(d > 400 ? this.F[2] : this.F[0]).setDepth(2.5).setScale(0.5, 0.12);
      sc.tweens.add({ targets: ring, scaleX: s, scaleY: s * 0.16, alpha: 0, duration: d, ease: 'Quad.out', onComplete: () => ring.destroy() });
    }
    this.lavaCracks(x, gy);
    this.debris.explode(34, x, gy - 4);
    this.sparks.explode(50, x, gy - 20);
    this.smoke.explode(12, x, gy - 20);
    this.embers.explode(40, x, gy - 40);
    // 火星雨
    sc.time.delayedCall(220, () => { for (let i = 0; i < 50; i++) this.embers.emitParticleAt(Math.random() * W, 20 + Math.random() * 120, 1); });
  }
  // 熔岩裂縫：從命中點往左右兩邊鋸齒狀地裂開，縫裡發光，慢慢暗掉
  lavaCracks(x, gy) {
    const sc = this.scene, g = sc.add.graphics().setDepth(2.45).setBlendMode(ADD);
    const paths = [];
    for (const dir of [-1, 1]) for (let k = 0; k < 2; k++) {
      const pts = [[x, gy + 2]]; let px = x, py = gy + 2;
      const len = 120 + Math.random() * 160;
      while (Math.abs(px - x) < len) { px += dir * (6 + Math.random() * 10); py = gy + 2 + (Math.random() - 0.5) * 6 + k * 4; pts.push([px, py]); }
      paths.push(pts);
    }
    let p = 0;
    sc.tweens.addCounter({ from: 0, to: 1, duration: 900, onUpdate: (tw) => {
      p = tw.getValue();
      const grow = Math.min(1, p * 5), fade = 1 - Math.max(0, (p - 0.35) / 0.65);
      g.clear();
      for (const pts of paths) {
        const n = Math.max(2, Math.round(pts.length * grow));
        for (const [w, c, a] of [[5, this.F[3], 0.5], [2, this.F[1], 1]]) {
          g.lineStyle(w, c, a * fade); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
          g.strokePath();
        }
      }
    }, onComplete: () => g.destroy() });
  }
}
