// 角色數值：等級基礎 + 鍛鍊 + 裝備 + 職業機制 + 祝福。
import { data } from './data.js';
const D = data;

function emptyStats() { return Object.fromEntries(D.STATS.map((s) => [s.k, 0])); }
function addStats(into, add, mult = 1) {
  for (const k in add) into[k] = (into[k] || 0) + add[k] * mult;
  return into;
}
function emptyEffects() {
  return {
    chain: 0, chainRepeat: 0, counterChance: 0, counterPct: 0.8, burnStacks: 0, burnMax: 5,
    burnPct: 0.15, burnMult: 0, doubleChance: 0, dmgReduce: 0, ramp: 0, undying: 0, critBurn: 0,
  };
}

function levelStats(lv) {
  const n = lv - 1;
  return {
    hp: 120 + 22 * n, atk: 12 + 3 * n, matk: 12 + 3 * n, def: 6 + 2 * n, mdef: 6 + 2 * n,
    spd: 100 + n, crit: 5, critDmg: 150, pen: 0, mpen: 0, lifesteal: 0,
  };
}

// 職業判定：只看武器、頭飾、上衣、鞋子的流派標籤
function resolveClass(equip) {
  const counts = {};
  for (const slot of D.CLASS_SLOTS) {
    const it = equip[slot];
    if (it && it.tag) counts[it.tag] = (counts[it.tag] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [t1, c1] = sorted[0] || [null, 0];
  const [t2, c2] = sorted[1] || [null, 0];
  if (c1 >= 3) {
    const full = c1 === 4;
    return { name: D.TAGS[t1].n, kind: full ? '全套專精' : '專精', counts,
      mechs: [[t1, full ? D.FULLSET_FACTOR : 1]] };
  }
  if (c1 === 2 && c2 === 2) {
    const key = [t1, t2].sort().join('+');
    return { name: D.HYBRID_NAMES[key], kind: '混合職業', counts,
      mechs: [[t1, D.HYBRID_FACTOR], [t2, D.HYBRID_FACTOR]] };
  }
  if (c1 === 2) {
    return { name: '見習' + D.TAGS[t1].n, kind: '入門', counts, mechs: [[t1, D.PARTIAL_FACTOR]] };
  }
  return { name: '冒險者', kind: '無職業', counts, mechs: [] };
}

// 職業機制：f 是強度係數
function applyMech(tag, f, stats, eff) {
  if (tag === 'blade') { stats.crit += 8 * f; eff.chain += 0.5 * f; }
  if (tag === 'guard') { eff.dmgReduce += 0.15 * f; eff.counterChance += 0.3 * f; }
  if (tag === 'arcane') { eff.burnStacks += 1; eff.burnMult += f; stats.mpen += 10 * f; }
}

function mechText(tag, f) {
  const p = (x) => Math.round(x * 100);
  if (tag === 'blade') return `連鎖：暴擊率 +${Math.round(8 * f)}%，暴擊時追加 ${p(0.5 * f)}% 傷害`;
  if (tag === 'guard') return `反擊：受到傷害 -${p(0.15 * f)}%，被攻擊時 ${p(0.3 * f)}% 機率反擊`;
  if (tag === 'arcane') return `燃燒：每次攻擊附加燃燒（強度 ${p(f)}%），魔法穿透 +${Math.round(10 * f)}%`;
  return '';
}

function itemStats(it) {
  const s = { ...it.base };
  for (const a of it.affixes || []) s[a.k] = (s[a.k] || 0) + a.v;
  if (it.effect && it.effect.stat) s[it.effect.k] = (s[it.effect.k] || 0) + it.effect.v;
  return s;
}

// 計算角色最終數值與戰鬥效果
function computeHero(state, blessingIds = []) {
  const stats = addStats(emptyStats(), levelStats(state.hero.level));
  addStats(stats, state.training);
  const eff = emptyEffects();
  for (const slot of D.SLOTS) {
    const it = state.equip[slot.k];
    if (!it) continue;
    addStats(stats, itemStats(it));
    if (it.effect && !it.effect.stat) eff[it.effect.k] += it.effect.v;
  }
  const cls = resolveClass(state.equip);
  for (const [tag, f] of cls.mechs) applyMech(tag, f, stats, eff);

  const pct = {};
  for (const id of blessingIds) {
    const b = D.BLESSINGS.find((x) => x.id === id);
    if (!b) continue;
    if (b.flat) addStats(stats, b.flat);
    if (b.pct) addStats(pct, b.pct);
    if (b.eff) for (const k in b.eff) eff[k] = (eff[k] || 0) + b.eff[k];
  }
  for (const k in pct) stats[k] *= 1 + pct[k] / 100;
  if (eff.burnStacks > 0 && !eff.burnMult) eff.burnMult = 1;

  stats.crit = Math.min(stats.crit, 100);
  stats.pen = Math.min(stats.pen, 80);
  stats.mpen = Math.min(stats.mpen, 80);
  eff.dmgReduce = Math.min(eff.dmgReduce, 0.6);
  eff.counterChance = Math.min(eff.counterChance, 0.8);
  eff.doubleChance = Math.min(eff.doubleChance, 0.8);
  return { stats, eff, cls };
}

// 戰力：給玩家一個直覺的比較數字
function power(stats) {
  const off = Math.max(stats.atk, stats.matk) * (1 + (stats.crit / 100) * (stats.critDmg / 100 - 1)) * (stats.spd / 100);
  const tank = stats.hp * (1 + (stats.def + stats.mdef) / 200);
  return Math.round(off * 6 + tank * 0.5);
}

export const stats = { emptyStats, addStats, emptyEffects, levelStats, resolveClass, applyMech, mechText, itemStats, computeHero, power };
