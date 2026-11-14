// 戰鬥模擬：純運算，沒有畫面依賴。掛機結算時不記錄過程，狩獵與試煉會回傳完整紀錄供畫面播放。
import { stats } from './stats.js';
const S = () => stats;

function enemyStats(lv, m = {}, magic = false) {
  const atk = (6 + 3.1 * lv) * (m.atk || 1);
  return {
    hp: Math.round((55 + 27 * lv) * (m.hp || 1)),
    atk: magic ? 0 : atk, matk: magic ? atk : 0,
    def: 2 + 1.8 * lv, mdef: 2 + 1.8 * lv,
    spd: 92 + lv * 1.2 * (m.spd || 1), crit: 4 + (m.crit || 0), critDmg: 140, pen: 0, mpen: 0, lifesteal: 0,
  };
}

function mitig(def, pen) { return 100 / (100 + Math.max(0, def * (1 - pen / 100))); }
function rawDamage(a, t) {
  const phys = a.stats.atk * mitig(t.stats.def, a.stats.pen);
  const mag = a.stats.matk * mitig(t.stats.mdef, a.stats.mpen);
  return Math.max(phys, mag, 1);
}

function fighter(side, name, stats, eff) {
  return { side, name, stats, eff: eff || S().emptyEffects(), hp: stats.hp, maxHp: stats.hp,
    burn: 0, burnCap: 0, burnSrc: null, undyingUsed: false, actions: 0, next: 0 };
}

// opts: { maxActions, log, enemyHp }
function fight(rng, hero, enemy, opts = {}) {
  const maxActions = opts.maxActions || 60;
  const p = fighter('p', hero.name || '冒險者', hero.stats, hero.eff);
  const e = fighter('e', enemy.name, enemy.stats, enemy.eff);
  const log = opts.log ? [] : null;
  let dealt = 0;
  const rec = (o) => { if (log) log.push({ ...o, hpP: Math.max(0, Math.round(p.hp)), hpE: Math.max(0, Math.round(e.hp)) }); };

  function hurt(t, dmg, src) {
    dmg = dmg * (1 - (t.eff.dmgReduce || 0));
    dmg = Math.max(1, Math.round(dmg));
    t.hp -= dmg;
    if (src === p) dealt += dmg;
    if (t.hp <= 0 && t.eff.undying && !t.undyingUsed) {
      t.undyingUsed = true;
      t.hp = 1 + Math.round(t.maxHp * 0.3);
      rec({ who: t.side, kind: 'undying', dmg: 0 });
    }
    return dmg;
  }

  function strike(a, t, kind, mult = 1) {
    const raw = rawDamage(a, t);
    const crit = rng.chance(a.stats.crit / 100);
    const ramp = 1 + (a.eff.ramp || 0) * a.actions;
    let dmg = raw * rng.range(0.9, 1.1) * (crit ? a.stats.critDmg / 100 : 1) * ramp * mult;
    const done = hurt(t, dmg, a);
    if (a.stats.lifesteal > 0) a.hp = Math.min(a.maxHp, a.hp + done * a.stats.lifesteal / 100);
    rec({ who: a.side, kind, dmg: done, crit });
    if (t.hp <= 0) return;

    // 連鎖：暴擊時追加
    if (crit && a.eff.chain > 0) {
      let again = true, n = 0;
      while (again && n < 5 && t.hp > 0) {
        n++;
        const cd = hurt(t, raw * a.eff.chain * (a.stats.critDmg / 100) * ramp, a);
        rec({ who: a.side, kind: 'chain', dmg: cd, crit: true });
        again = !!a.eff.chainRepeat && rng.chance(a.stats.crit / 100);
      }
      if (t.hp <= 0) return;
    }
    // 燃燒：疊層
    if (a.eff.burnStacks > 0) {
      t.burnCap = a.eff.burnMax || 5;
      t.burn = Math.min(t.burnCap, t.burn + a.eff.burnStacks);
      t.burnSrc = a;
    }
    // 反擊
    if ((kind === 'attack' || kind === 'double') && t.eff.counterChance > 0 && rng.chance(t.eff.counterChance)) {
      strike(t, a, 'counter', t.eff.counterPct || 0.8);
    }
  }

  function burnTick(t) {
    if (t.burn <= 0 || !t.burnSrc) return;
    const src = t.burnSrc;
    const crit = src.eff.critBurn && rng.chance(src.stats.crit / 100);
    const base = Math.max(src.stats.matk, src.stats.atk * 0.5) * mitig(t.stats.mdef, src.stats.mpen);
    const dmg = base * t.burn * (src.eff.burnPct || 0.15) * (src.eff.burnMult || 1) * (crit ? src.stats.critDmg / 100 : 1);
    const done = hurt(t, dmg, src);
    rec({ who: src.side, kind: 'burn', dmg: done, crit, stacks: t.burn });
  }

  p.next = 1000 / p.stats.spd;
  e.next = 1000 / e.stats.spd;
  while (p.hp > 0 && e.hp > 0 && p.actions < maxActions) {
    const a = p.next <= e.next ? p : e;
    const t = a === p ? e : p;
    burnTick(a);
    if (a.hp > 0) {
      strike(a, t, 'attack');
      if (t.hp > 0 && a.hp > 0 && a.eff.doubleChance > 0 && rng.chance(a.eff.doubleChance)) strike(a, t, 'double');
    }
    a.actions++;
    a.next += 1000 / a.stats.spd;
  }
  const win = e.hp <= 0 && p.hp > 0;
  return { win, timeout: !win && p.hp > 0, dealt, actions: p.actions, hpLeft: Math.max(0, p.hp) / p.maxHp,
    maxHpP: p.maxHp, maxHpE: e.maxHp, log };
}

export const combat = { enemyStats, fight, rawDamage };
