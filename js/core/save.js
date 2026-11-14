// 存檔：存在瀏覽器的 localStorage。讀不到或寫不進去時遊戲照常運作，只是不會保留進度。
(function (A) {
  const KEY = 'adventurer-save-v1';

  function load(now) {
    try {
      const raw = globalThis.localStorage && localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw), now);
    } catch (e) { /* 存檔壞掉或無法讀取：開新遊戲 */ }
    return null;
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  // 補齊舊存檔缺少的欄位
  function migrate(s, now) {
    const fresh = A.world.newGame(now);
    for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
    for (const k of ['forge', 'market', 'guild', 'counters', 'hunt', 'training', 'devices', 'equip']) {
      s[k] = { ...fresh[k], ...s[k] };
    }
    return s;
  }

  A.save = { KEY, load, save, clear, migrate };
})(globalThis.ADV = globalThis.ADV || {});
