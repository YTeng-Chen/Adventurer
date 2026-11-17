// 遊戲狀態與掛機結算：鍛鍊室、戰鬥地圖（含頭目挑戰）、鍛造室、市集，以及公會的每日委託、冒險者階級。
// 全部是純函式（改動傳進來的 state），不碰畫面，方便測試與離線結算。
import { data } from './data.js';
import { rng as RNG } from './rng.js';
import { items } from './items.js';
import { stats } from './stats.js';
import { combat } from './combat.js';
const D = data;
const R = () => RNG;
const I = () => items;

const expNeed = (lv) => Math.floor(50 * Math.pow(lv, 2.2));
// 素材在 state.mats 裡的鍵：「素材 id.階級」，例如 'goo.2' 是 T2 的史萊姆黏液
const matKey = (id, tier) => `${id}.${tier}`;
const matId = (key) => key.split('.')[0];
const matTier = (key) => +key.split('.')[1];
const matDef = (key) => D.MATS[matId(key)];
const isBossMat = (key) => !!matDef(key) && matDef(key).cat === 'boss';
function matName(key) { const m = matDef(key); return m ? `${m.n} T${matTier(key)}` : key; }
const HUNT_MAX = 3, HUNT_REFILL_MS = 3600e3;

function newGame(now, seed = (now ^ 0x5eed) >>> 0) {
  const s = {
    v: 3, seed, createdAt: now, lastTick: now,
    hero: { level: 1, exp: 0 },
    gold: 0,
    training: Object.fromEntries(D.DEVICES.map((d) => [d.stat, 0])),
    devices: Object.fromEntries(D.DEVICES.map((d) => [d.k, d.unlock === 0 ? 1 : 0])),
    trainDevice: 'dummy',
    location: 'battle',
    areaIdx: 0, stage: 0,   // 在哪一張地圖的第幾段掛機（段從 0 算）
    bossKills: {},          // 各頭目打倒幾次，鍵是「地圖-段」，例如 '0-1' 是草原狼王
    forge: { level: 1, type: 'auto', def: 'auto', tier: 'auto', boost: false, progress: 0, status: '' },
    market: { rep: 0, keep: 8 },
    guild: { rep: 0, quests: [], qSeq: 0, day: null },   // 每日委託：day 是委託所屬的那一天（dayId）
    counters: { kills: 0, crafts: 0, sold: 0, trainTicks: 0, bossKills: 0 },
    monKills: {},   // 各種魔物的擊敗數，鍵是「地圖-魔物」的位置，例如 '1-0'
    mats: {}, bag: [], equip: { weapon: null, head: null, body: null, feet: null, acc1: null, acc2: null },
    itemSeq: 1,
    trial: null,
    appearance: null, // 外觀 { gender: 'm' | 'f', color: 髮色 }；第一次進遊戲時由玩家選
    hunt: { tickets: HUNT_MAX, refillAt: now },
    log: [],
  };
  // 新手武器：一把普通長劍（T1 的名稱前綴就是「新手」）
  const rng = R().make(seed);
  s.equip.weapon = I().createItem(rng, { def: 'longsword', tier: 1, rarity: 0, seq: s.itemSeq++ });
  s.seed = rng.state;
  refreshQuests(s, now);
  return s;
}

function addLog(s, msg, now) {
  s.log.unshift({ t: now, msg });
  if (s.log.length > 40) s.log.length = 40;
}

function hero(s, blessings = []) {
  const h = stats.computeHero(s, blessings);
  return { name: '冒險者', ...h };
}

function gainExp(s, n, sum) {
  s.hero.exp += n;
  if (sum) sum.exp += n;
  let up = 0;
  while (s.hero.exp >= expNeed(s.hero.level)) {
    s.hero.exp -= expNeed(s.hero.level);
    s.hero.level++;
    up++;
  }
  if (up && sum) sum.levels += up;
  return up;
}

function addMat(s, key, n, sum) {
  s.mats[key] = (s.mats[key] || 0) + n;
  if (sum) sum.mats[key] = (sum.mats[key] || 0) + n;
}

function newSummary() {
  return { ticks: 0, exp: 0, gold: 0, levels: 0, kills: 0, losses: 0, mats: {}, items: [], train: {}, sold: 0,
    marketRep: 0, notes: new Set() };
}

// ---------- 各地點的單次結算 ----------
function tickTraining(s, rng, sum) {
  const dev = D.DEVICES.find((d) => d.k === s.trainDevice);
  const lv = dev ? s.devices[dev.k] : 0;
  if (!dev || !lv) { sum.notes.add('沒有選擇可用的訓練設備'); return; }
  const cap = dev.cap * lv;
  const cur = s.training[dev.stat] || 0;
  if (cur >= cap) { sum.notes.add(`${dev.n}已達上限，升級設備才能繼續鍛鍊`); return; }
  const add = Math.min(dev.gain, cap - cur);
  s.training[dev.stat] = cur + add;
  sum.train[dev.stat] = (sum.train[dev.stat] || 0) + add;
  s.counters.trainTicks++;
  return gainExp(s, 1, sum);
}

// 這一段的魔物：等級跟著主角，但不會超出這一段的範圍
function battleEnemy(s, rng) {
  const area = D.AREAS[s.areaIdx], st = D.stageOf(s.areaIdx, s.stage);
  const mi = rng.int(0, area.monsters.length - 1), mon = area.monsters[mi];
  const lv = Math.max(st.lo, Math.min(st.hi, s.hero.level - 1 + rng.int(0, 2)));
  return { mon, mi, lv, st, enemy: { name: mon.n, stats: combat.enemyStats(lv, mon.m, mon.magic) } };
}

function tickBattle(s, rng, sum, h) {
  if (!stageOpen(s, s.areaIdx, s.stage)) {
    if (!areaOpen(s, s.areaIdx)) s.areaIdx = bestStage(s).area;
    s.stage = fitStage(s, s.areaIdx);
  }
  const { mon, mi, lv, st, enemy } = battleEnemy(s, rng);
  const r = combat.fight(rng, h, enemy, { maxActions: 40 });
  if (!r.win) { sum.losses++; return 0; }
  sum.kills++;
  s.counters.kills++;
  const mk = s.areaIdx + '-' + mi;
  s.monKills[mk] = (s.monKills[mk] || 0) + 1;
  const gold = 1 + Math.round(lv * 0.6);
  s.gold += gold; sum.gold += gold;
  // 掉落這隻魔物的素材，階級看在哪一段打到的（魔物不再掉裝備，裝備只能鍛造）
  if (rng.chance(0.6)) addMat(s, matKey(mon.mat.id, st.tier), rng.chance(0.15) ? 2 : 1, sum);
  return gainExp(s, 6 + 3 * lv, sum);
}

// ---------- 鍛造 ----------
// 配方（gear.js 的 cost）在 tier 階要用哪些素材：{ 素材鍵: 數量 }，湊不齊回傳 null。
// 同一類的素材先用數量最多的；頭目素材用它自己的階級
function recipePlan(s, g, tier) {
  if (g.tier && g.tier !== tier) return null;
  const plan = {};
  for (const [k, n] of Object.entries(g.cost || {})) {
    const keys = D.MAT_CATS[k]
      ? Object.keys(D.MATS).filter((id) => D.MATS[id].cat === k).map((id) => matKey(id, tier))
      : [matKey(k, D.MATS[k].tiers[0])];
    keys.sort((a, b) => (s.mats[b] || 0) - (s.mats[a] || 0) || (a < b ? -1 : 1));
    let need = n;
    for (const key of keys) {
      const take = Math.min(need, s.mats[key] || 0);
      if (take > 0) { plan[key] = take; need -= take; }
      if (!need) break;
    }
    if (need > 0) return null;
  }
  return plan;
}
// 配方的文字：「硬材 3、皮料 1、炎龍鱗 2」
function recipeText(g) {
  return Object.entries(g.cost || {}).map(([k, n]) => `${D.MAT_CATS[k] ? D.MAT_CATS[k].n : D.MATS[k].n} ${n}`).join('、');
}
const usesBossMat = (g) => Object.keys(g.cost || {}).some((k) => !D.MAT_CATS[k]);
const AUTO_TYPES = ['weapon', 'body', 'head', 'feet', 'acc'];
// 這次可以做什麼：先找最高可以做的階級，再從這一階做得出來的款式裡隨機挑。
// 沒指定款式時，要用頭目素材的款式（炎龍套裝）不會隨機做出來，免得用掉珍貴的素材。rng 為 null 時只檢查做不做得出來
function forgePlan(s, rng, type) {
  const f = s.forge, pick = f.type !== 'auto' && D.GEAR_BY_ID[f.def];
  const cands = pick && pick.type === type ? [pick] : I().defsOf(type).filter((g) => !usesBossMat(g));
  for (const tier of f.tier === 'auto' ? [5, 4, 3, 2, 1] : [+f.tier]) {
    const ok = cands.map((g) => ({ g, tier, plan: recipePlan(s, g, tier) })).filter((x) => x.plan);
    if (ok.length) return rng ? ok[rng.weighted(ok.map((x) => x.g.w ?? 1))] : ok[0];
  }
  return null;
}
// 自動輪流：從這一輪該做的部位開始，找第一個做得出來的
function forgeType(s) {
  const f = s.forge;
  if (f.type !== 'auto') return f.type;
  const at = f.autoIdx || 0;
  for (let i = 0; i < AUTO_TYPES.length; i++) {
    const type = AUTO_TYPES[(at + i) % AUTO_TYPES.length];
    if (forgePlan(s, null, type)) return type;
  }
  return AUTO_TYPES[at % AUTO_TYPES.length];
}
function forgeShort(s, type) {
  const f = s.forge, g = f.type !== 'auto' && D.GEAR_BY_ID[f.def];
  const at = f.tier === 'auto' ? '任何一階' : `T${f.tier} `;
  if (g && g.type === type) return `素材不足：${g.tier ? `T${g.tier} ` : at}${g.n}要 ${recipeText(g)}（同一階）`;
  return `素材不足：${at}的素材湊不出${f.type === 'auto' ? '任何裝備' : D.TYPE_NAME[type]}的配方`;
}
// 頭目素材（同一階、數量最多的一種），鍛造時加進去提高稀有度
function boostKey(s, tier) {
  return Object.keys(s.mats).filter((k) => isBossMat(k) && matTier(k) === tier && s.mats[k] > 0)
    .sort((a, b) => s.mats[b] - s.mats[a] || (a < b ? -1 : 1))[0] || null;
}

function tickForge(s, rng, sum, now) {
  const f = s.forge;
  if (s.bag.length >= D.BAG_CAP) { f.status = '背包已滿，鍛造暫停'; sum.notes.add(f.status); return 0; }
  const type = forgeType(s);
  if (!forgePlan(s, null, type)) { f.status = forgeShort(s, type); sum.notes.add(f.status); return 0; }
  f.progress++;
  f.status = `正在鍛造${D.TYPE_NAME[type]}`;
  if (f.progress < D.FORGE[f.level].ticks) return 0;
  f.progress = 0;
  const p = forgePlan(s, rng, type);
  for (const [k, n] of Object.entries(p.plan)) s.mats[k] -= n;
  const odds = D.FORGE[f.level].odds;
  let rarity = I().rollRarity(rng, odds);
  const bk = f.boost && boostKey(s, p.tier);
  if (bk) {
    s.mats[bk]--;
    for (let i = 1; i < D.BOOST_ROLLS; i++) rarity = Math.max(rarity, I().rollRarity(rng, odds));
  }
  const it = I().createItem(rng, { def: p.g.id, tier: p.tier, rarity, seq: s.itemSeq++ });
  s.bag.push(it); sum.items.push(it);
  s.counters.crafts++;
  if (f.type === 'auto') f.autoIdx = AUTO_TYPES.indexOf(type) + 1;
  if (it.rarity >= 3) addLog(s, `鍛造出${D.RARITY[it.rarity].n}裝備「${it.name}」`, now);
  return gainExp(s, 3, sum);
}

// 市集聲望：提升售價與每次賣出的數量，都有上限
const marketBonus = (rep) => 1 + Math.min(rep, 3000) / 2000;          // 最多 ×2.5
const marketSpeed = (rep) => 2 + Math.min(10, Math.floor(rep / 200)); // 最多一次 12 個
function tickMarket(s, rng, sum) {
  const m = s.market;
  let cap = marketSpeed(m.rep);
  // 保留數量：玩家設定的，或公會交付委託還需要的，取多的
  const keep = (k) => Math.max(m.keep, ...s.guild.quests.filter((q) => q.kind === 'deliver' && !q.done && q.mat === k).map((q) => q.need));
  // 頭目素材不賣（鍛造要用）
  const keys = Object.keys(s.mats).filter((k) => !isBossMat(k) && s.mats[k] > keep(k))
    .sort((a, b) => s.mats[b] - s.mats[a]);
  let sold = 0;
  for (const k of keys) {
    while (cap > 0 && s.mats[k] > keep(k)) {
      const tier = matTier(k);
      const price = Math.round(D.MAT_PRICE(tier) * marketBonus(m.rep));
      s.mats[k]--; s.gold += price; sum.gold += price; cap--; sold++;
    }
  }
  if (!sold) { sum.notes.add('沒有超過保留數量的素材可以賣'); return 0; }
  m.rep += sold; sum.marketRep += sold; sum.sold += sold;
  s.counters.sold += sold;
  return 0;
}

// 冒險者階級（RANKS 的位置），看冒險者聲望
function rankOf(rep) {
  let r = 0;
  D.RANKS.forEach((g, i) => { if (rep >= g.rep) r = i; });
  return r;
}
const rank = (s) => rankOf(s.guild.rep);
// ---------- 地圖的段與頭目 ----------
const bossKey = (ai, b) => `${ai}-${b}`;
const bossBeaten = (s, ai, b) => (s.bossKills[bossKey(ai, b)] || 0) > 0;
// 打倒過的頭目裡，最高的等級
function topBossLv(s) {
  let lv = 0;
  D.AREAS.forEach((a, ai) => a.bosses.forEach((_, b) => { if (bossBeaten(s, ai, b)) lv = Math.max(lv, D.stageOf(ai, b).bossLv); }));
  return lv;
}
// 地圖第 b 段還差哪些條件（回傳空陣列就是可以去）：
//   冒險者階級要夠（看這一段的素材階級）；第二、三段要打倒這張地圖前一段的頭目；
//   第一段（草原以外）要先在任何一張地圖打倒前一個等級的頭目
function stageNeeds(s, ai, b) {
  const a = D.AREAS[ai];
  if (!a || !(b >= 0 && b < D.STAGES)) return ['沒有這一段'];
  const st = D.stageOf(ai, b), needs = [];
  if (rank(s) < st.rank) needs.push(D.RANKS[st.rank].n);
  if (b > 0 && !bossBeaten(s, ai, b - 1)) needs.push('擊敗' + a.bosses[b - 1].n);
  if (b === 0 && st.lo > 1 && topBossLv(s) < st.lo - 1) needs.push(`擊敗任一隻 Lv${st.lo - 1} 的頭目`);
  return needs;
}
const stageOpen = (s, ai, b) => stageNeeds(s, ai, b).length === 0;
const areaNeeds = (s, ai) => stageNeeds(s, ai, 0);
const areaOpen = (s, ai) => stageOpen(s, ai, 0);
// 這張地圖目前能去的最後一段（都不能去是 -1）
function topStage(s, ai) {
  let top = -1;
  for (let b = 0; b < D.STAGES; b++) if (stageOpen(s, ai, b)) top = b;
  return top;
}
// 換地圖時預設去哪一段：能去、而且起始等級不超過主角等級 +1 的最後一段（都太高就第一段），免得一過去就一直輸
function fitStage(s, ai) {
  let fit = -1;
  for (let b = 0; b < D.STAGES; b++) if (stageOpen(s, ai, b) && (fit < 0 || D.stageOf(ai, b).lo <= s.hero.level + 1)) fit = b;
  return fit;
}
// 所有能去的段：['0-0', '0-1', '1-0', …]
function openStages(s) {
  const out = [];
  D.AREAS.forEach((a, ai) => { for (let b = 0; b < D.STAGES; b++) if (stageOpen(s, ai, b)) out.push(bossKey(ai, b)); });
  return out;
}
const parseStage = (k) => { const [area, b] = k.split('-').map(Number); return D.stageOf(area, b); };
const stageLabel = (st) => `${D.AREAS[st.area].n} Lv${st.lo}–${st.hi}`;
// 素材階級最高的一段（同階取後面的地圖）
function bestStage(s) {
  return openStages(s).map(parseStage).reduce((best, st) => (!best || st.tier >= best.tier ? st : best), null);
}
// 新開放的段寫進紀錄：before 是先前的 openStages
function logOpened(s, before, prefix, now) {
  const opened = openStages(s).filter((k) => !before.includes(k)).map((k) => `「${stageLabel(parseStage(k))}」`);
  if (opened.length) addLog(s, `${prefix}，可以前往${opened.join('、')}`, now);
  return opened;
}
// 增加冒險者聲望；晉升時記下來，並列出新開放的地圖
function addRep(s, n, now) {
  const before = rank(s), was = openStages(s);
  s.guild.rep += n;
  const after = rank(s);
  if (after === before) return;
  const msg = '晉升為' + D.RANKS[after].n;
  if (!logOpened(s, was, msg, now).length) addLog(s, msg, now);
}


// ---------- 結算 ----------
function settle(s, ticks, now = Date.now()) {
  const rng = R().make(s.seed);
  const sum = newSummary();
  let h = hero(s);
  for (let i = 0; i < ticks; i++) {
    sum.ticks++;
    let up = 0;
    if (s.location === 'training') up = tickTraining(s, rng, sum);
    else if (s.location === 'battle') up = tickBattle(s, rng, sum, h);
    else if (s.location === 'forge') up = tickForge(s, rng, sum, now);
    else if (s.location === 'market') up = tickMarket(s, rng, sum);
    if (up || s.location === 'training') h = hero(s);
  }
  if (sum.levels) addLog(s, `升到 ${s.hero.level} 級`, now);
  s.seed = rng.state;
  sum.notes = [...sum.notes];
  return sum;
}

// 依時間結算：回傳摘要（沒有經過完整一次結算時回傳 null）
function catchUp(s, now = Date.now()) {
  let elapsed = now - s.lastTick;
  if (elapsed < D.TICK_MS) return null;
  if (elapsed > D.OFFLINE_CAP_MS) { s.lastTick = now - D.OFFLINE_CAP_MS; elapsed = D.OFFLINE_CAP_MS; }
  const ticks = Math.floor(elapsed / D.TICK_MS);
  s.lastTick += ticks * D.TICK_MS;
  const sum = settle(s, ticks, now);
  sum.elapsed = ticks * D.TICK_MS;
  return sum;
}

// ---------- 玩家操作 ----------
function setLocation(s, k) { if (D.LOCATIONS.some((l) => l.k === k)) s.location = k; }
// 選擇戰鬥地圖：到那張地圖能去、等級也夠的最後一段（fitStage）
function setArea(s, i) {
  if (!areaOpen(s, i)) return false;
  s.areaIdx = i; s.stage = fitStage(s, i); return true;
}
// 選擇目前地圖的第幾段
function setStage(s, b) {
  if (!stageOpen(s, s.areaIdx, b)) return false;
  s.stage = b; return true;
}

function unlockDevice(s, k) {
  const d = D.DEVICES.find((x) => x.k === k);
  if (!d || s.devices[k] || s.gold < d.unlock) return false;
  s.gold -= d.unlock; s.devices[k] = 1; return true;
}
function upgradeDevice(s, k) {
  const lv = s.devices[k];
  if (!lv || lv >= D.DEVICE_MAX_LV) return false;
  const cost = D.deviceUpgradeCost(lv);
  if (s.gold < cost) return false;
  s.gold -= cost; s.devices[k] = lv + 1; return true;
}
function upgradeForge(s) {
  const next = D.FORGE[s.forge.level + 1];
  if (!next || s.gold < next.cost) return false;
  s.gold -= next.cost; s.forge.level++; return true;
}

function findBag(s, id) { return s.bag.findIndex((x) => x.id === id); }
function equip(s, id, slotK) {
  const i = findBag(s, id);
  if (i < 0) return false;
  const it = s.bag[i];
  let slot = slotK;
  if (!slot) {
    if (it.type === 'acc') slot = !s.equip.acc1 ? 'acc1' : !s.equip.acc2 ? 'acc2' : 'acc1';
    else slot = it.type;
  }
  const def = D.SLOTS.find((x) => x.k === slot);
  if (!def || def.type !== it.type) return false;
  s.bag.splice(i, 1);
  if (s.equip[slot]) s.bag.push(s.equip[slot]);
  s.equip[slot] = it;
  return true;
}
// 測試用：直接拿到一整套（每一件都穿上），換下來的裝備放回背包（背包滿了就不放）。回傳拿到的裝備
function giveSet(s, setKey, rarity = 4) {
  const rng = R().make(s.seed), got = [];
  for (const g of D.GEAR.filter((x) => x.set === setKey)) {
    const it = I().createItem(rng, { def: g.id, tier: g.tier || 5, rarity, seq: s.itemSeq++ });
    const slot = D.SLOTS.find((sl) => sl.type === it.type && !s.equip[sl.k])?.k || D.SLOTS.find((sl) => sl.type === it.type).k;
    if (s.equip[slot] && s.bag.length < D.BAG_CAP) s.bag.push(s.equip[slot]);
    s.equip[slot] = it;
    got.push(it);
  }
  s.seed = rng.state;
  return got;
}
// 測試用：每一款裝備各拿一件（傳說品質；限定階級的用那一階，其餘用 T5），放進背包，背包滿了就停。回傳拿到幾件、沒放進去幾件
function giveAllGear(s, rarity = 4) {
  const rng = R().make(s.seed);
  let got = 0, left = 0;
  for (const g of D.GEAR) {
    if (s.bag.length >= D.BAG_CAP) { left++; continue; }
    s.bag.push(I().createItem(rng, { def: g.id, tier: g.tier || 5, rarity, seq: s.itemSeq++ }));
    got++;
  }
  s.seed = rng.state;
  return { got, left };
}
// 測試用：刪除背包和身上的全部裝備。回傳刪掉幾件
function clearGear(s) {
  const n = s.bag.length + Object.values(s.equip).filter(Boolean).length;
  s.bag = [];
  for (const k of Object.keys(s.equip)) s.equip[k] = null;
  return n;
}
function unequip(s, slot) {
  if (!s.equip[slot] || s.bag.length >= D.BAG_CAP) return false;
  s.bag.push(s.equip[slot]); s.equip[slot] = null; return true;
}
function sell(s, id) {
  const i = findBag(s, id);
  if (i < 0) return 0;
  const price = I().sellPrice(s.bag[i]);
  s.bag.splice(i, 1); s.gold += price; return price;
}
function sellBelow(s, rarity) {
  let total = 0, n = 0;
  for (const it of s.bag.slice()) if (it.rarity < rarity) { total += sell(s, it.id); n++; }
  return { total, n };
}

// ---------- 公會：每日委託 ----------
// 公會不能掛機。每天（當地時間 00:00）刷新 GUILD.quests 個委託：擊敗指定魔物，或交付指定的素材。
// 完成後到公會領取金幣與冒險者聲望，每個委託一天只能完成一次。
function dayId(now) { return Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000); }
function dayResetAt(now) {
  const localMs = (dayId(now) + 1) * 86400000;
  return localMs + new Date(localMs).getTimezoneOffset() * 60000;
}

// 委託的段：多半是目前素材階級最高的段，有時是前面的段
function questStage(s, rng) {
  const open = openStages(s).map(parseStage), top = Math.max(...open.map((st) => st.tier));
  return rng.chance(D.GUILD.topChance) ? rng.pick(open.filter((st) => st.tier === top)) : rng.pick(open);
}
// 同一天的委託不重複：擊敗的魔物不同、交付的素材不同。taken 記已經用過的目標
const questKey = (q) => (q.kind === 'kill' ? `k${q.area}-${q.mon}` : `d${q.mat}`);
function makeQuest(s, rng, kind, taken) {
  const G = D.GUILD;
  for (let tries = 0; tries < 20; tries++) {
    const st = questStage(s, rng), a = D.AREAS[st.area], mon = rng.int(0, a.monsters.length - 1);
    const reward = { gold: G.gold[st.tier], rep: G.rep[st.tier] };
    const q = kind === 'kill'
      ? { kind, area: st.area, mon, need: rng.pick(G.killNeed), reward, done: false }
      : { kind, mat: matKey(a.monsters[mon].mat.id, st.tier), need: rng.pick(G.deliverNeed), reward, done: false };
    if (taken.has(questKey(q))) continue;
    taken.add(questKey(q));
    if (kind === 'kill') q.base = s.monKills[q.area + '-' + q.mon] || 0;   // 接到之後才開始算
    return { id: 'q' + (++s.guild.qSeq), ...q };
  }
  return kind === 'deliver' ? makeQuest(s, rng, 'kill', taken) : null;   // 能交付的素材都用過了：改成擊敗
}
// 換日就換一批新委託（至少一個擊敗、一個交付）。回傳是否換了
function refreshQuests(s, now) {
  const day = dayId(now);
  if (s.guild.day === day) return false;
  const rng = R().make(s.seed);
  const kinds = ['kill', 'deliver'];
  while (kinds.length < D.GUILD.quests) kinds.push(rng.pick(['kill', 'deliver']));
  const taken = new Set();
  s.guild.quests = kinds.map((k) => makeQuest(s, rng, k, taken)).filter(Boolean);
  s.guild.day = day;
  s.seed = rng.state;
  return true;
}
function questText(q) {
  if (q.kind === 'kill') { const a = D.AREAS[q.area]; return `在${a.n}擊敗${a.monsters[q.mon].n}`; }
  return `交付${matName(q.mat)}`;
}
function questProgress(s, q) {
  const have = q.kind === 'kill' ? (s.monKills[q.area + '-' + q.mon] || 0) - q.base : s.mats[q.mat] || 0;
  return Math.max(0, Math.min(q.need, have));
}
const questReady = (s, q) => !q.done && questProgress(s, q) >= q.need;
function claimQuest(s, id, now) {
  const q = s.guild.quests.find((x) => x.id === id);
  if (!q || !questReady(s, q)) return null;
  if (q.kind === 'deliver') s.mats[q.mat] -= q.need;   // 交付：素材交出去
  q.done = true;
  s.gold += q.reward.gold;
  addLog(s, `完成公會委託「${questText(q)} ${q.need} ${q.kind === 'kill' ? '隻' : '個'}」`, now);
  addRep(s, q.reward.rep, now);
  return q;
}

// ---------- 頭目挑戰 ----------
// 每一段的段尾有一個頭目。還沒打倒過的頭目隨時可以挑戰（輸了可以馬上再試）；
// 打倒過之後重打要用一張狩獵券（每小時恢復一張，最多 HUNT_MAX 張），可以再拿頭目素材和魔物素材。
function refreshTickets(s, now) {
  const h = s.hunt;
  if (h.tickets >= HUNT_MAX) { h.refillAt = now; return; }
  const gained = Math.floor((now - h.refillAt) / HUNT_REFILL_MS);
  if (gained > 0) {
    h.tickets = Math.min(HUNT_MAX, h.tickets + gained);
    h.refillAt = h.tickets >= HUNT_MAX ? now : h.refillAt + gained * HUNT_REFILL_MS;
  }
}
function bossEnemy(ai, b) {
  const st = D.stageOf(ai, b);
  return { name: st.boss.n, lv: st.bossLv, stats: combat.enemyStats(st.bossLv, D.BOSS, st.boss.magic) };
}
const huntCost = (s, ai, b) => (bossBeaten(s, ai, b) ? 1 : 0);
function hunt(s, ai, b, now) {
  refreshTickets(s, now);
  if (!stageOpen(s, ai, b)) return null;
  const cost = huntCost(s, ai, b);
  if (s.hunt.tickets < cost) return null;
  if (cost) {
    if (s.hunt.tickets === HUNT_MAX) s.hunt.refillAt = now;
    s.hunt.tickets -= cost;
  }
  const rng = R().make(s.seed);
  const st = D.stageOf(ai, b), a = D.AREAS[ai];
  const enemy = bossEnemy(ai, b);
  const r = combat.fight(rng, hero(s), enemy, { maxActions: D.BOSS.maxActions, log: true });
  const rewards = { gold: 0, mats: {}, unlocked: [], next: null };
  if (r.win) {
    const was = openStages(s);
    s.counters.bossKills++;
    const first = !bossBeaten(s, ai, b);
    s.bossKills[bossKey(ai, b)] = (s.bossKills[bossKey(ai, b)] || 0) + 1;
    rewards.gold = 60 * st.tier * st.tier * (first ? 3 : 1);
    s.gold += rewards.gold;
    const give = (k, n) => { addMat(s, k, n); rewards.mats[k] = (rewards.mats[k] || 0) + n; };
    give(matKey(st.boss.mat.id, st.tier), first ? 3 : 1 + rng.int(0, 1));            // 頭目素材
    for (let i = 0; i < 3; i++) give(matKey(rng.pick(a.monsters).mat.id, st.tier), 2 + rng.int(0, 2));   // 這張地圖的魔物素材
    const msg = `${first ? '首次' : ''}擊敗${st.boss.n}`;
    rewards.unlocked = logOpened(s, was, msg, now);
    if (first && b + 1 < D.STAGES && !stageOpen(s, ai, b + 1)) {          // 下一段還差冒險者階級
      rewards.next = { stage: stageLabel(D.stageOf(ai, b + 1)), needs: stageNeeds(s, ai, b + 1) };
    }
    if (!rewards.unlocked.length) addLog(s, msg + (rewards.next ? `；達到${rewards.next.needs.join('、')}就能前往「${rewards.next.stage}」` : ''), now);
  }
  s.seed = rng.state;
  return { r, rewards, boss: st.boss, stage: st, enemy };
}

export const world = {
  expNeed, matKey, matId, matTier, matDef, matName, isBossMat, marketBonus, marketSpeed, newGame, hero, settle, catchUp,
  setLocation, setArea, setStage, unlockDevice, upgradeDevice, upgradeForge,
  recipePlan, recipeText, forgePlan, forgeType, boostKey,
  equip, unequip, giveSet, giveAllGear, clearGear, sell, sellBelow, rankOf, rank,
  stageNeeds, stageOpen, areaNeeds, areaOpen, topStage, fitStage, openStages, bestStage, stageLabel, bossBeaten, topBossLv, addRep,
  dayId, dayResetAt, refreshQuests, questText, questProgress, questReady, claimQuest, refreshTickets, hunt, huntCost, bossEnemy,
  addLog, gainExp, HUNT_MAX, HUNT_REFILL_MS,
};
