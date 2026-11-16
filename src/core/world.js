// 遊戲狀態與掛機結算：鍛鍊室、戰鬥地圖、鍛造室、市集，以及魔物狩獵、公會的每日委託、冒險者階級。
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

function battleEnemy(rng, area) {
  const mi = rng.int(0, area.monsters.length - 1), mon = area.monsters[mi];
  const lv = area.lv + rng.int(0, 2);
  return { mon, mi, lv, enemy: { name: mon.n, stats: combat.enemyStats(lv, mon.m, mon.magic) } };
}

function tickBattle(s, rng, sum, h) {
  if (!areaOpen(s, s.areaIdx)) s.areaIdx = topArea(s);
  const area = D.AREAS[s.areaIdx];
  const { mi, lv, enemy } = battleEnemy(rng, area);
  const r = combat.fight(rng, h, enemy, { maxActions: 40 });
  if (!r.win) { sum.losses++; return 0; }
  sum.kills++;
  s.counters.kills++;
  const mk = s.areaIdx + '-' + mi;
  s.monKills[mk] = (s.monKills[mk] || 0) + 1;
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
  // 保留數量：玩家設定的，或公會交付委託還需要的，取多的
  const keep = (k) => Math.max(m.keep, ...s.guild.quests.filter((q) => q.kind === 'deliver' && !q.done && matKey(q.tier) === k).map((q) => q.need));
  const keys = Object.keys(s.mats).filter((k) => s.mats[k] > keep(k))
    .sort((a, b) => s.mats[b] - s.mats[a]);
  let sold = 0;
  for (const k of keys) {
    while (cap > 0 && s.mats[k] > keep(k)) {
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
// 這張地圖（和它的頭目）還差哪些條件：冒險者階級要夠，而且要打倒前一張地圖的頭目。回傳空陣列就是可以去
function areaNeeds(s, i) {
  const a = D.AREAS[i];
  if (!a) return ['沒有這張地圖'];
  const needs = [];
  if (rank(s) < a.rank) needs.push(D.RANKS[a.rank].n);
  if (i > 0 && !s.bossKills[i - 1]) needs.push('擊敗' + D.AREAS[i - 1].boss.n);
  return needs;
}
const areaOpen = (s, i) => areaNeeds(s, i).length === 0;
const openAreas = (s) => D.AREAS.map((a, i) => areaOpen(s, i));
// 新開放的地圖寫進紀錄：before 是先前的 openAreas
function logOpened(s, before, prefix, now) {
  const opened = D.AREAS.filter((a, i) => !before[i] && areaOpen(s, i)).map((a) => `「${a.n}」`);
  if (opened.length) addLog(s, `${prefix}，可以前往${opened.join('、')}`, now);
  return opened.length > 0;
}
// 目前能去的最高一張地圖
function topArea(s) {
  let top = 0;
  D.AREAS.forEach((a, i) => { if (areaOpen(s, i)) top = i; });
  return top;
}
// 增加冒險者聲望；晉升時記下來，並列出新開放的地圖
function addRep(s, n, now) {
  const before = rank(s), was = openAreas(s);
  s.guild.rep += n;
  const after = rank(s);
  if (after === before) return;
  const msg = '晉升為' + D.RANKS[after].n;
  if (!logOpened(s, was, msg, now)) addLog(s, msg, now);
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

// ---------- 公會：每日委託 ----------
// 公會不能掛機。每天（當地時間 00:00）刷新 GUILD.quests 個委託：擊敗指定魔物，或交付指定的材料。
// 完成後到公會領取金幣與冒險者聲望，每個委託一天只能完成一次。
function dayId(now) { return Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000); }
function dayResetAt(now) {
  const localMs = (dayId(now) + 1) * 86400000;
  return localMs + new Date(localMs).getTimezoneOffset() * 60000;
}

// 委託的地圖：多半是目前能去的最高一張，有時是前面的地圖
function questArea(s, rng) {
  const open = D.AREAS.map((a, i) => i).filter((i) => areaOpen(s, i));
  return rng.chance(D.GUILD.topChance) ? open[open.length - 1] : rng.pick(open);
}
// 同一天的委託不重複：擊敗的魔物不同、交付的材料不同。taken 記已經用過的目標
const questKey = (q) => (q.kind === 'kill' ? `k${q.area}-${q.mon}` : `d${q.tier}`);
function makeQuest(s, rng, kind, taken) {
  const G = D.GUILD;
  for (let tries = 0; tries < 20; tries++) {
    const ai = questArea(s, rng), a = D.AREAS[ai];
    const reward = { gold: G.gold[a.tier], rep: G.rep[a.tier] };
    const q = kind === 'kill'
      ? { kind, area: ai, mon: rng.int(0, a.monsters.length - 1), need: rng.pick(G.killNeed), reward, done: false }
      : { kind, tier: a.tier, need: rng.pick(G.deliverNeed), reward, done: false };
    if (taken.has(questKey(q))) continue;
    taken.add(questKey(q));
    if (kind === 'kill') q.base = s.monKills[q.area + '-' + q.mon] || 0;   // 接到之後才開始算
    return { id: 'q' + (++s.guild.qSeq), ...q };
  }
  return kind === 'deliver' ? makeQuest(s, rng, 'kill', taken) : null;   // 能交付的材料都用過了：改成擊敗
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
  return `交付${D.MATS[q.tier]}`;
}
function questProgress(s, q) {
  const have = q.kind === 'kill' ? (s.monKills[q.area + '-' + q.mon] || 0) - q.base : s.mats[matKey(q.tier)] || 0;
  return Math.max(0, Math.min(q.need, have));
}
const questReady = (s, q) => !q.done && questProgress(s, q) >= q.need;
function claimQuest(s, id, now) {
  const q = s.guild.quests.find((x) => x.id === id);
  if (!q || !questReady(s, q)) return null;
  if (q.kind === 'deliver') s.mats[matKey(q.tier)] -= q.need;   // 交付：材料交出去
  q.done = true;
  s.gold += q.reward.gold;
  addLog(s, `完成公會委託「${questText(q)} ${q.need} ${q.kind === 'kill' ? '隻' : '個'}」`, now);
  addRep(s, q.reward.rep, now);
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
  const rewards = { gold: 0, mats: {}, item: null, unlocked: null, next: null };
  const a = D.AREAS[areaIdx];
  if (r.win) {
    const was = openAreas(s);
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
    const msg = `${first ? '首次' : ''}擊敗${a.boss.n}`;
    const nextIdx = areaIdx + 1;
    if (first && D.AREAS[nextIdx]) {
      if (!was[nextIdx] && areaOpen(s, nextIdx)) rewards.unlocked = D.AREAS[nextIdx].n;
      else if (!areaOpen(s, nextIdx)) rewards.next = { area: D.AREAS[nextIdx].n, needs: areaNeeds(s, nextIdx) };   // 還差冒險者階級
    }
    if (!logOpened(s, was, msg, now)) addLog(s, msg + (rewards.next ? `；達到${rewards.next.needs.join('、')}就能前往「${rewards.next.area}」` : ''), now);
  }
  s.seed = rng.state;
  return { r, rewards, boss: a.boss, enemy };
}

export const world = {
  expNeed, matKey, matTier, marketBonus, marketSpeed, newGame, hero, settle, catchUp, setLocation, setArea, unlockDevice, upgradeDevice, upgradeForge,
  equip, unequip, sell, sellBelow, rankOf, rank, areaNeeds, areaOpen, topArea, addRep,
  dayId, dayResetAt, refreshQuests, questText, questProgress, questReady, claimQuest, refreshTickets, hunt, bossEnemy,
  addLog, gainExp, HUNT_MAX, HUNT_REFILL_MS,
};
