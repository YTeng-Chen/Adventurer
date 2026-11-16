// 遊戲狀態與掛機結算：鍛鍊室、戰鬥地圖、鍛造室、市集、公會、魔物狩獵、公會任務。
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
const matKey = (tier) => `m${tier}`;          // 材料在 state.mats 裡的鍵：每個階級一種
const matTier = (key) => +key.slice(1);
const HUNT_MAX = 3, HUNT_REFILL_MS = 3600e3;

function newGame(now, seed = (now ^ 0x5eed) >>> 0) {
  const s = {
    v: 2, seed, createdAt: now, lastTick: now,
    hero: { level: 1, exp: 0 },
    gold: 0,
    training: Object.fromEntries(D.DEVICES.map((d) => [d.stat, 0])),
    devices: Object.fromEntries(D.DEVICES.map((d) => [d.k, d.unlock === 0 ? 1 : 0])),
    trainDevice: 'dummy',
    location: 'battle',
    areaIdx: 0, bossKills: {},
    forge: { level: 1, type: 'auto', def: 'auto', progress: 0, status: '' },
    market: { rep: 0, keep: 8 },
    guild: { rep: 0, quests: [], qSeq: 0 },
    counters: { kills: 0, crafts: 0, sold: 0, trainTicks: 0, guildTicks: 0, bossKills: 0 },
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
  while (s.guild.quests.length < 3) s.guild.quests.push(makeQuest(s, rng));
  s.seed = rng.state;
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
    guildRep: 0, marketRep: 0, notes: new Set() };
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

function battleEnemy(rng, area) {
  const mon = rng.pick(area.monsters);
  const lv = area.lv + rng.int(0, 2);
  return { mon, lv, enemy: { name: mon.n, stats: combat.enemyStats(lv, mon.m, mon.magic) } };
}

function tickBattle(s, rng, sum, h) {
  if (!areaOpen(s, s.areaIdx)) s.areaIdx = topArea(s);
  const area = D.AREAS[s.areaIdx];
  const { lv, enemy } = battleEnemy(rng, area);
  const r = combat.fight(rng, h, enemy, { maxActions: 40 });
  if (!r.win) { sum.losses++; return 0; }
  sum.kills++;
  s.counters.kills++;
  s.counters['kill' + s.areaIdx] = (s.counters['kill' + s.areaIdx] || 0) + 1;
  const gold = 1 + Math.round(lv * 0.6);
  s.gold += gold; sum.gold += gold;
  if (rng.chance(0.6)) addMat(s, matKey(area.tier), rng.chance(0.15) ? 2 : 1, sum);
  // 少量機率直接掉落裝備
  if (rng.chance(0.012) && s.bag.length < D.BAG_CAP) {
    const it = I().createItem(rng, { type: rng.pick(D.ITEM_TYPES), tier: area.tier,
      rarity: I().rollRarity(rng, D.FORGE[2].odds), seq: s.itemSeq++ });
    s.bag.push(it); sum.items.push(it);
  }
  return gainExp(s, 6 + 3 * lv, sum);
}

// 鍛造：用身上最高階、數量夠的材料
function pickTier(s) {
  for (let tier = 5; tier >= 1; tier--) if ((s.mats[matKey(tier)] || 0) >= D.CRAFT_COST) return tier;
  return 0;
}
const AUTO_TYPES = ['weapon', 'body', 'head', 'feet', 'acc'];

function tickForge(s, rng, sum, now) {
  const f = s.forge;
  if (s.bag.length >= D.BAG_CAP) { f.status = '背包已滿，鍛造暫停'; sum.notes.add(f.status); return 0; }
  const type = f.type === 'auto' ? AUTO_TYPES[(f.autoIdx || 0) % AUTO_TYPES.length] : f.type;
  const tier = pickTier(s);
  if (!tier) {
    f.status = `材料不足：鍛造需要 ${D.CRAFT_COST} 個同階材料`;
    sum.notes.add(f.status);
    return 0;
  }
  f.progress++;
  f.status = `正在鍛造${D.TYPE_NAME[type]}`;
  if (f.progress < D.FORGE[f.level].ticks) return 0;
  f.progress = 0;
  s.mats[matKey(tier)] -= D.CRAFT_COST;
  // 指定了款式就做那一款，否則在這個部位裡隨機
  const def = f.type !== 'auto' && D.GEAR_BY_ID[f.def] && D.GEAR_BY_ID[f.def].type === type ? f.def : undefined;
  const it = I().createItem(rng, { def, type, tier, rarity: I().rollRarity(rng, D.FORGE[f.level].odds), seq: s.itemSeq++ });
  s.bag.push(it); sum.items.push(it);
  s.counters.crafts++;
  if (f.type === 'auto') f.autoIdx = (f.autoIdx || 0) + 1;
  if (it.rarity >= 3) addLog(s, `鍛造出${D.RARITY[it.rarity].n}裝備「${it.name}」`, now);
  return gainExp(s, 3, sum);
}

// 市集聲望：提升售價與每次賣出的數量，都有上限
const marketBonus = (rep) => 1 + Math.min(rep, 3000) / 2000;          // 最多 ×2.5
const marketSpeed = (rep) => 2 + Math.min(10, Math.floor(rep / 200)); // 最多一次 12 個
function tickMarket(s, rng, sum) {
  const m = s.market;
  let cap = marketSpeed(m.rep);
  const keys = Object.keys(s.mats).filter((k) => s.mats[k] > m.keep)
    .sort((a, b) => s.mats[b] - s.mats[a]);
  let sold = 0;
  for (const k of keys) {
    while (cap > 0 && s.mats[k] > m.keep) {
      const tier = matTier(k);
      const price = Math.round(D.MAT_PRICE(tier) * marketBonus(m.rep));
      s.mats[k]--; s.gold += price; sum.gold += price; cap--; sold++;
    }
  }
  if (!sold) { sum.notes.add('沒有超過保留數量的材料可以賣'); return 0; }
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
// 冒險者階級夠高才能去這張地圖、狩獵這張地圖的頭目
const areaOpen = (s, i) => !!D.AREAS[i] && rank(s) >= D.AREAS[i].rank;
// 目前能去的最高一張地圖
function topArea(s) {
  let top = 0;
  D.AREAS.forEach((a, i) => { if (areaOpen(s, i)) top = i; });
  return top;
}
// 增加冒險者聲望；晉升時記下來，並列出新開放的地圖
function addRep(s, n, now) {
  const before = rank(s);
  s.guild.rep += n;
  const after = rank(s);
  if (after === before) return;
  const opened = D.AREAS.filter((a) => a.rank > before && a.rank <= after).map((a) => `「${a.n}」`);
  addLog(s, `晉升為${D.RANKS[after].n}${opened.length ? `，可以前往${opened.join('、')}` : ''}`, now);
}

function tickGuild(s, rng, sum, now) {
  const g = D.RANKS[rank(s)];
  const gold = Math.round(g.gold * (1 + s.hero.level * 0.05));
  s.gold += gold; sum.gold += gold;
  addRep(s, 1, now); sum.guildRep += 1;
  s.counters.guildTicks++;
  return gainExp(s, 1, sum);
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
    else if (s.location === 'guild') up = tickGuild(s, rng, sum, now);
    if (up || s.location === 'training') h = hero(s);
  }
  if (sum.levels) addLog(s, `升到 ${s.hero.level} 級`, now);
  for (const it of sum.items) if (it.rarity >= 3 && s.location === 'battle') addLog(s, `魔物掉落${D.RARITY[it.rarity].n}裝備「${it.name}」`, now);
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
// 選擇戰鬥地圖：冒險者階級不夠就不能去
function setArea(s, i) {
  if (!areaOpen(s, i)) return false;
  s.areaIdx = i; return true;
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

// ---------- 公會任務 ----------
function makeQuest(s, rng) {
  const r = rank(s);
  const k = 1 + r * 0.6;
  const opts = [
    { kind: 'kills', n: '擊敗魔物', need: Math.round(30 * k) },
    { kind: 'kill' + topArea(s), n: `在${D.AREAS[topArea(s)].n}擊敗魔物`, need: Math.round(20 * k) },
    { kind: 'crafts', n: '鍛造裝備', need: Math.round(4 * k) },
    { kind: 'sold', n: '在市集賣出材料', need: Math.round(25 * k) },
    { kind: 'trainTicks', n: '在鍛鍊室鍛鍊', need: Math.round(20 * k) },
    { kind: 'guildTicks', n: '完成雜事委託', need: Math.round(20 * k) },
  ];
  const q = rng.pick(opts);
  const tier = D.AREAS[topArea(s)].tier;
  const reward = { gold: Math.round(60 * k * tier), rep: Math.round(15 * k) };
  if (rng.chance(0.5)) reward.mat = { key: matKey(tier), n: 3 + r };
  return { id: 'q' + (++s.guild.qSeq), kind: q.kind, n: q.n, need: q.need, base: s.counters[q.kind] || 0, reward };
}
function questProgress(s, q) { return Math.min(q.need, (s.counters[q.kind] || 0) - q.base); }
function claimQuest(s, id, now) {
  const i = s.guild.quests.findIndex((q) => q.id === id);
  if (i < 0) return null;
  const q = s.guild.quests[i];
  if (questProgress(s, q) < q.need) return null;
  s.gold += q.reward.gold;
  addRep(s, q.reward.rep, now);
  if (q.reward.mat) addMat(s, q.reward.mat.key, q.reward.mat.n);
  const rng = R().make(s.seed);
  s.guild.quests[i] = makeQuest(s, rng);
  s.seed = rng.state;
  addLog(s, `完成公會任務「${q.n} ${q.need} 次」`, now);
  return q;
}

// ---------- 魔物狩獵 ----------
function refreshTickets(s, now) {
  const h = s.hunt;
  if (h.tickets >= HUNT_MAX) { h.refillAt = now; return; }
  const gained = Math.floor((now - h.refillAt) / HUNT_REFILL_MS);
  if (gained > 0) {
    h.tickets = Math.min(HUNT_MAX, h.tickets + gained);
    h.refillAt = h.tickets >= HUNT_MAX ? now : h.refillAt + gained * HUNT_REFILL_MS;
  }
}
function bossEnemy(areaIdx) {
  const a = D.AREAS[areaIdx];
  return { name: a.boss.n, stats: combat.enemyStats(a.lv + 4, { hp: 6, atk: 1.35, crit: 6 }, a.boss.magic) };
}
function hunt(s, areaIdx, now) {
  refreshTickets(s, now);
  if (s.hunt.tickets <= 0 || !areaOpen(s, areaIdx)) return null;
  if (s.hunt.tickets === HUNT_MAX) s.hunt.refillAt = now;
  s.hunt.tickets--;
  const rng = R().make(s.seed);
  const enemy = bossEnemy(areaIdx);
  const r = combat.fight(rng, hero(s), enemy, { maxActions: 30, log: true });
  const rewards = { gold: 0, mats: {}, item: null };
  const a = D.AREAS[areaIdx];
  if (r.win) {
    s.counters.bossKills++;
    const first = !s.bossKills[areaIdx];
    s.bossKills[areaIdx] = (s.bossKills[areaIdx] || 0) + 1;
    rewards.gold = 60 * a.tier * a.tier * (first ? 3 : 1);
    s.gold += rewards.gold;
    const k = matKey(a.tier), n = 6 + rng.int(0, 6);
    addMat(s, k, n); rewards.mats[k] = n;
    if (s.bag.length < D.BAG_CAP) {
      const it = I().createItem(rng, { type: rng.pick(D.ITEM_TYPES),
        tier: a.tier, rarity: Math.max(2, I().rollRarity(rng, D.FORGE[3].odds)), seq: s.itemSeq++ });
      s.bag.push(it); rewards.item = it;
    }
    addLog(s, `${first ? '首次' : ''}擊敗${a.boss.n}`, now);
  }
  s.seed = rng.state;
  return { r, rewards, boss: a.boss, enemy };
}

export const world = {
  expNeed, matKey, matTier, marketBonus, marketSpeed, newGame, hero, settle, catchUp, setLocation, setArea, unlockDevice, upgradeDevice, upgradeForge,
  equip, unequip, sell, sellBelow, rankOf, rank, areaOpen, topArea, addRep, questProgress, claimQuest, refreshTickets, hunt, bossEnemy,
  addLog, gainExp, HUNT_MAX, HUNT_REFILL_MS,
};
