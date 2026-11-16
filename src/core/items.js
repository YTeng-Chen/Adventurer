// 裝備產生：樣式（gear.js）× 材料階級 × 稀有度，加上隨機詞條與特殊效果。
// 裝備物件只靠 def（樣式 id）、tier、rarity 和抽到的數值就能重建；名稱、部位、外觀、形態、效果說明
// 都由 hydrate 從樣式表補上，所以改了樣式表的名稱或說明，舊存檔讀進來就會跟著更新。
import { data } from './data.js';
import { stats } from './stats.js';
const D = data;

const TIER_PREFIX = ['', '新手', '森林', '礦鐵', '冥骨', '炎龍'];

function round(k, v) { return D.STAT_PCT[k] ? Math.round(v * 10) / 10 : Math.round(v); }

function defsOf(type) { return D.GEAR.filter((g) => g.type === type); }
// 只在某個材料階級出現的款式（tier），其他階級不會抽到
function pickDef(rng, type, tier) {
  const pool = defsOf(type).filter((g) => !g.tier || g.tier === tier);
  return pool[rng.weighted(pool.map((g) => g.w ?? 1))];
}

// def：指定樣式 id；沒指定就從 type 部位的樣式裡隨機挑
function createItem(rng, { def, type, tier, rarity, seq }) {
  const g = (def && D.GEAR_BY_ID[def]) || pickDef(rng, type, tier);
  const R = D.RARITY[rarity];
  const make = Array.isArray(g.base) ? rng.pick(g.base) : g.base;
  const base = make(tier);
  for (const k in base) base[k] = round(k, base[k] * R.mult * rng.range(0.9, 1.1));

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
    effect = { k: e.k, v: e.v[R.effect - 1] };
  }
  return hydrate({ id: 'it' + seq, def: g.id, tier, rarity, base, affixes, effect });
}

// 從樣式表補上衍生欄位：type、look、form（武器）、name、效果的名稱與說明
function hydrate(it) {
  const g = D.GEAR_BY_ID[it.def];
  if (!g) return it;   // 樣式表裡已經沒有這一款：保留存檔裡原本的資料
  it.type = g.type;
  it.look = g.look;
  if (g.form) it.form = g.form; else delete it.form;
  if (g.set) it.set = g.set; else delete it.set;
  if (it.effect) {
    const e = D.EFFECTS.find((x) => x.k === it.effect.k);
    if (e) Object.assign(it.effect, { n: e.n, stat: !!e.stat, d: e.d(it.effect.v) });
  }
  it.name = (it.effect && it.effect.n ? it.effect.n + '之' : '') + (g.tier ? '' : TIER_PREFIX[it.tier] || '') + g.n;
  return it;
}

// 舊存檔（還有流派、沒有樣式 id）的裝備：用名稱找回是哪一款，找不到就用流派對應的外觀
const LEGACY_LOOK = {
  weapon: { blade: 'sword', guard: 'hammer', arcane: 'staff' },
  head: { blade: 'cap', guard: 'helm', arcane: 'wizard' },
  body: { blade: 'leather', guard: 'plate', arcane: 'robe' },
  feet: { blade: 'boots', guard: 'greaves', arcane: 'shoes' },
};
function fromLegacy(it) {
  if (it.def) return it;
  const defs = defsOf(it.type);
  const byName = defs.filter((g) => (it.name || '').endsWith(g.n)).sort((a, b) => b.n.length - a.n.length)[0];
  const look = LEGACY_LOOK[it.type] && LEGACY_LOOK[it.type][it.tag];
  const g = byName || defs.find((x) => x.look === look) || defs[0];
  it.def = g.id;
  delete it.tag;
  return it;
}

function rollRarity(rng, odds) { return rng.weighted(odds); }

function sellPrice(it) {
  return Math.round((10 + 12 * it.tier * it.tier) * (1 + it.rarity * it.rarity * 0.6));
}

// 粗略評分：用在背包排序與「比目前好」的提示
function score(it) {
  const s = stats.itemStats(it);
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

export const items = { createItem, hydrate, fromLegacy, defsOf, rollRarity, sellPrice, score, fmtStat };
