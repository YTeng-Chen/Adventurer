// 裝備產生：部位 × 流派 × 材料階級 × 稀有度，加上隨機詞條與特殊效果。
(function (A) {
  const D = A.data;

  const NAME_PARTS = {
    weapon: { blade: ['長劍', '彎刀', '雙刃'], guard: ['戰錘', '重斧', '鎚矛'], arcane: ['法杖', '魔典', '水晶杖'] },
    head: { blade: ['頭巾', '輕盔'], guard: ['鐵盔', '護面盔'], arcane: ['尖帽', '兜帽'] },
    body: { blade: ['皮甲', '戰衣'], guard: ['板甲', '鎖子甲'], arcane: ['法袍', '長袍'] },
    feet: { blade: ['疾行靴', '短靴'], guard: ['鐵靴', '重靴'], arcane: ['布鞋', '星紋鞋'] },
    acc: ['戒指', '項鍊', '手鍊', '耳飾', '護符'],
  };
  const TIER_PREFIX = ['', '新手', '森林', '礦鐵', '冥骨', '炎龍'];

  function round(k, v) { return D.STAT_PCT[k] ? Math.round(v * 10) / 10 : Math.round(v); }

  function createItem(rng, { type, tag, tier, rarity, seq }) {
    const R = D.RARITY[rarity];
    const jitter = () => rng.range(0.9, 1.1);
    let base = {};
    if (type === 'acc') {
      base = rng.pick(D.BASE.acc)(tier);
      tag = null;
    } else if (type === 'weapon') {
      base = D.BASE.weapon[tag](tier);
    } else {
      base = { ...D.BASE[type]._(tier) };
      const extra = D.BASE[type][tag](tier);
      for (const k in extra) base[k] = (base[k] || 0) + extra[k];
    }
    for (const k in base) base[k] = round(k, base[k] * R.mult * jitter());

    // 詞條：不重複，最多 AFFIX_CAP 條
    const n = Math.min(R.affixes, D.AFFIX_CAP);
    const pool = D.AFFIXES.slice();
    const affixes = [];
    for (let i = 0; i < n && pool.length; i++) {
      const a = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
      affixes.push({ k: a.k, v: round(a.k, a.v(tier) * rng.range(0.7, 1.3)) });
    }

    let effect = null;
    if (R.effect) {
      const e = rng.pick(D.EFFECTS);
      const v = e.v[R.effect - 1];
      effect = { k: e.k, n: e.n, v, stat: !!e.stat, d: e.d(v) };
    }

    const nameBase = type === 'acc' ? rng.pick(NAME_PARTS.acc) : rng.pick(NAME_PARTS[type][tag]);
    const name = (effect ? effect.n + '之' : '') + TIER_PREFIX[tier] + nameBase;
    return { id: 'it' + seq, name, type, tag, tier, rarity, base, affixes, effect };
  }

  function rollRarity(rng, odds) { return rng.weighted(odds); }

  function sellPrice(it) {
    return Math.round((10 + 12 * it.tier * it.tier) * (1 + it.rarity * it.rarity * 0.6));
  }

  // 粗略評分：用在背包排序與「比目前好」的提示
  function score(it) {
    const s = A.stats.itemStats(it);
    const w = { hp: 0.25, atk: 3, matk: 3, def: 2, mdef: 2, spd: 3, crit: 4, critDmg: 1.2, pen: 2.5, mpen: 2.5, lifesteal: 4 };
    let total = 0;
    for (const k in s) total += (w[k] || 1) * s[k];
    if (it.effect && !it.effect.stat) total *= 1.25;
    return Math.round(total);
  }

  function fmtStat(k, v) {
    const p = D.STAT_PCT[k];
    const num = p ? (Math.round(v * 10) / 10) : Math.round(v);
    return `${D.STAT_NAME[k]} +${num}${p ? '%' : ''}`;
  }

  A.items = { createItem, rollRarity, sellPrice, score, fmtStat };
})(globalThis.ADV = globalThis.ADV || {});
