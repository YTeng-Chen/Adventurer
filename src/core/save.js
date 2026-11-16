// 存檔：存在瀏覽器的 localStorage。讀不到或寫不進去時遊戲照常運作，只是不會保留進度。
import { world } from './world.js';
import { items } from './items.js';
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
  for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
  for (const k of ['forge', 'market', 'guild', 'counters', 'hunt', 'training', 'devices', 'equip']) {
    s[k] = { ...fresh[k], ...s[k] };
  }
  for (const it of allItems(s)) items.hydrate(it);
  return s;
}

function allItems(s) {
  return [...(s.bag || []), ...Object.values(s.equip || {})].filter(Boolean);
}

// v1 → v2：拿掉流派。材料從「流派-階級」併成每階一種，裝備改用樣式 id
function fromV1(s) {
  const mats = {};
  for (const [k, n] of Object.entries(s.mats || {})) {
    const tier = +k.split('-')[1];
    if (tier) mats[world.matKey(tier)] = (mats[world.matKey(tier)] || 0) + n;
  }
  s.mats = mats;
  for (const q of (s.guild && s.guild.quests) || []) {
    if (q.reward && q.reward.mat) q.reward.mat.key = world.matKey(+q.reward.mat.key.split('-')[1]);
  }
  if (s.forge) { delete s.forge.tag; s.forge.def = 'auto'; }
  for (const it of allItems(s)) items.fromLegacy(it);
  s.v = 2;
}

export const save = { KEY, load, save: write, clear, migrate };
