// 存檔：存在瀏覽器的 localStorage。讀不到或寫不進去時遊戲照常運作，只是不會保留進度。
import { world } from './world.js';
import { items } from './items.js';
import { data as D } from './data.js';
const KEY = 'adventurer-save-v1';

function load(now) {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw), now);
  } catch (e) { /* 存檔壞掉或無法讀取：開新遊戲 */ }
  return null;
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
}
function clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

// 補齊舊存檔缺少的欄位，轉換舊格式，最後依樣式表重建每件裝備的名稱與說明
function migrate(s, now) {
  const fresh = world.newGame(now);
  if ((s.v || 1) < 2) fromV1(s);
  fromBossUnlock(s);
  if (s.v < 3) fromV2(s);
  for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
  for (const k of ['forge', 'market', 'guild', 'counters', 'hunt', 'training', 'devices', 'equip']) {
    s[k] = { ...fresh[k], ...s[k] };
  }
  fixStage(s);
  fromIdleGuild(s, now);
  for (const it of allItems(s)) items.hydrate(it);
  return s;
}

// 公會以前可以掛機、任務做完馬上換新的；現在不能掛機，改成每日委託。舊的任務換成今天的委託
function fromIdleGuild(s, now) {
  if (s.location === 'guild') s.location = 'battle';
  if (s.guild.quests.some((q) => q.kind !== 'kill' && q.kind !== 'deliver')) s.guild.day = null;
  world.refreshQuests(s, now);
}

// 以前只要打倒頭目就解鎖下一張地圖，後來還要冒險者階級夠（第 i 張地圖要第 i 階）：已經解鎖的地圖，
// 把聲望補到去得了的階級、前面的頭目算打倒過，不讓舊玩家被擋在外面（之後 fromV2 再換成新的頭目）
function fromBossUnlock(s) {
  if (s.unlockedArea === undefined) return;
  const top = Math.min(s.unlockedArea, D.AREAS.length - 1);
  s.guild = s.guild || {};
  s.guild.rep = Math.max(s.guild.rep || 0, D.RANKS[top].rep);
  s.bossKills = s.bossKills || {};
  for (let i = 0; i < top; i++) s.bossKills[i] = s.bossKills[i] || 1;
  delete s.unlockedArea;
}

// v2 → v3：戰鬥地圖和魔物狩獵合併成一個玩法，每張地圖分三段、各有一個頭目；材料改成每種魔物各自的素材
//   材料：每階一種 → 分給那一階最早出現的地圖的三種魔物素材（平均分）
//   頭目：以前打倒第 i 張地圖的頭目，可以去 T(i+2) 的地圖 → 現在素材階級不超過 T(i+1) 的頭目都算打倒過
//   每日委託：交付的材料換了，換成今天的新委託
function fromV2(s) {
  const mats = {};
  for (const [k, n] of Object.entries(s.mats || {})) {
    const tier = /^m\d$/.test(k) ? +k.slice(1) : 0;
    if (!tier || !n) { if (k.includes('.')) mats[k] = n; continue; }
    const a = D.AREAS.find((x) => tier >= x.tier && tier < x.tier + D.STAGES);
    a.monsters.forEach((m, i) => {
      const part = Math.floor(n / a.monsters.length) + (i < n % a.monsters.length ? 1 : 0);
      if (part) mats[world.matKey(m.mat.id, tier)] = (mats[world.matKey(m.mat.id, tier)] || 0) + part;
    });
  }
  s.mats = mats;
  const old = Object.keys(s.bossKills || {}).filter((k) => !k.includes('-')).map(Number);
  const bossKills = {};
  if (old.length) {
    const upTo = Math.max(...old) + 1;
    D.AREAS.forEach((a, ai) => a.bosses.forEach((_, b) => { if (a.tier + b <= upTo) bossKills[`${ai}-${b}`] = 1; }));
  }
  s.bossKills = bossKills;
  if (s.guild) s.guild.day = null;
  if (s.forge) s.forge.def = s.forge.def || 'auto';
  s.v = 3;
}

// 目前選的地圖、段要能去，不能去就換到能去、等級也夠的段
function fixStage(s) {
  if (!world.areaOpen(s, s.areaIdx)) s.areaIdx = world.bestStage(s).area;
  if (!(s.stage >= 0) || !world.stageOpen(s, s.areaIdx, s.stage)) s.stage = world.fitStage(s, s.areaIdx);
}

function allItems(s) {
  return [...(s.bag || []), ...Object.values(s.equip || {})].filter(Boolean);
}

// v1 → v2：拿掉流派。材料從「流派-階級」併成每階一種，裝備改用樣式 id
function fromV1(s) {
  const mats = {};
  for (const [k, n] of Object.entries(s.mats || {})) {
    const tier = +k.split('-')[1];
    if (tier) mats['m' + tier] = (mats['m' + tier] || 0) + n;   // v2 的鍵（每階一種），之後 fromV2 再分成魔物素材
  }
  s.mats = mats;
  if (s.forge) { delete s.forge.tag; s.forge.def = 'auto'; }
  for (const it of allItems(s)) items.fromLegacy(it);
  s.v = 2;
}

export const save = { KEY, load, save: write, clear, migrate };
