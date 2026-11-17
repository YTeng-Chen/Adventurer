// 神之試煉：每週一重置。以週編號為種子，同一週的關卡與祝福選項固定。
// 每過 BLESS_EVERY 關從三個祝福中選一個；輸了這次挑戰就結束，可以從第 1 關重來。
import { data } from './data.js';
import { rng as RNG } from './rng.js';
import { combat } from './combat.js';
import { world } from './world.js';
const D = data;

// 以當地時間週一 00:00 為一週的開始
function weekId(now) {
  const local = now - new Date(now).getTimezoneOffset() * 60000;
  return Math.floor((local / 86400000 + 3) / 7); // 1970-01-01 是週四
}
function weekResetAt(now) {
  const w = weekId(now) + 1;
  const localMs = (w * 7 - 3) * 86400000;
  return localMs + new Date(localMs).getTimezoneOffset() * 60000;
}

function freshRun(week, best = 0) {
  return { week, floor: 1, blessings: [], alive: true, offer: null, best, rewarded: 0, attempts: 0 };
}
function ensure(s, now) {
  const w = weekId(now);
  if (!s.trial || s.trial.week !== w) s.trial = freshRun(w);
  return s.trial;
}

function enemy(week, floor) {
  const rng = RNG.make(RNG.hash('trial', week, floor));
  const area = D.AREAS[Math.min(D.AREAS.length - 1, Math.floor((floor - 1) / 6))];
  const boss = floor % 5 === 0;
  const mon = boss ? { ...area.bosses[D.STAGES - 1], m: { hp: 2.6, atk: 1.25, crit: 5 } } : rng.pick(area.monsters);
  const lv = Math.round(2 + floor * 1.3);
  const m = boss ? mon.m : { ...mon.m, hp: (mon.m.hp || 1) * 1.3 };
  return { name: (boss ? '試煉守護者・' : '') + mon.n, shape: mon.shape, c: mon.c, boss, lv,
    stats: combat.enemyStats(lv, m, mon.magic) };
}

// 祝福選項：每個關卡固定，越深的關卡越容易出高等級祝福
function rollOffer(week, floor, owned) {
  const rng = RNG.make(RNG.hash('bless', week, floor));
  const depth = Math.min(1, floor / 30);
  const weights = [55 - 30 * depth, 30, 12 + 15 * depth, 3 + 8 * depth];
  const picks = [];
  let guard = 0;
  while (picks.length < 3 && guard++ < 100) {
    const t = rng.weighted(weights);
    const pool = D.BLESSINGS.filter((b) => b.t === t && !owned.includes(b.id) && !picks.includes(b.id));
    if (pool.length) picks.push(rng.pick(pool).id);
  }
  return picks;
}

function fightFloor(s, now) {
  const run = ensure(s, now);
  if (!run.alive || run.offer) return null;
  const foe = enemy(run.week, run.floor);
  const rng = RNG.make(RNG.hash('fight', run.week, run.floor, run.attempts, s.seed));
  const h = world.hero(s, run.blessings);
  const r = combat.fight(rng, h, foe, { maxActions: 50, log: true });
  const out = { r, foe, floor: run.floor, rewards: null };
  if (r.win) {
    if (run.floor > run.rewarded) {
      run.rewarded = run.floor;
      const gold = 25 * run.floor + (foe.boss ? 150 * run.floor : 0);
      s.gold += gold;
      out.rewards = { gold };
      if (foe.boss) {   // 守護者關卡：那張地圖的一種魔物素材（階級隨關卡提高，不超出那張地圖掉得到的範圍）
        const ai = Math.min(D.AREAS.length - 1, Math.floor((run.floor - 1) / 6)), a = D.AREAS[ai];
        const tier = Math.max(a.tier, Math.min(a.tier + D.STAGES - 1, 1 + Math.floor(run.floor / 8)));
        const key = world.matKey(RNG.make(RNG.hash('trialmat', run.week, run.floor)).pick(a.monsters).mat.id, tier);
        s.mats[key] = (s.mats[key] || 0) + 5;
        out.rewards.mat = { key, n: 5 };
      }
    }
    run.best = Math.max(run.best, run.floor);
    if (run.floor % D.BLESS_EVERY === 0) run.offer = rollOffer(run.week, run.floor, run.blessings);
    run.floor++;
  } else {
    run.alive = false;
    world.addLog(s, `神之試煉止步於第 ${run.floor} 關`, now);
  }
  return out;
}

function choose(s, id) {
  const run = s.trial;
  if (!run || !run.offer || !run.offer.includes(id)) return false;
  run.blessings.push(id);
  run.offer = null;
  return true;
}

function restart(s, now) {
  const run = ensure(s, now);
  const next = freshRun(run.week, run.best);
  next.rewarded = run.rewarded;
  next.attempts = run.attempts + 1;
  s.trial = next;
  return next;
}

export const trial = { weekId, weekResetAt, ensure, enemy, rollOffer, fightFloor, choose, restart };
