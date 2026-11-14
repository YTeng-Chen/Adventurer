const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load');
const { data: D, world: W, stats: S, items: I, combat: C, trial: T, rng: R } = A;

const NOW = Date.UTC(2026, 10, 16, 2, 0, 0); // 2026-11-16（週一）

function item(over) {
  return { id: 'x', name: 't', type: 'weapon', tag: 'blade', tier: 1, rarity: 0, base: {}, affixes: [], effect: null, ...over };
}

test('隨機數有種子就能重現', () => {
  const a = R.make(42), b = R.make(42);
  for (let i = 0; i < 5; i++) assert.equal(a.next(), b.next());
});

test('職業判定：3 件同流派為專精、2+2 為混合職業、飾品不影響', () => {
  const eq = (tags) => Object.fromEntries(D.CLASS_SLOTS.map((k, i) => [k, tags[i] ? item({ type: k, tag: tags[i] }) : null]));
  assert.equal(S.resolveClass(eq(['blade', 'blade', 'blade', null])).name, '劍士');
  assert.equal(S.resolveClass(eq(['blade', 'blade', 'blade', 'blade'])).kind, '全套專精');
  assert.equal(S.resolveClass(eq(['blade', 'guard', 'blade', 'guard'])).name, '劍盾騎士');
  assert.equal(S.resolveClass(eq(['arcane', 'arcane', 'guard', null])).name, '見習術士');
  assert.equal(S.resolveClass(eq([null, null, null, null])).name, '冒險者');
  const withAcc = { ...eq(['blade', 'blade', null, null]), acc1: item({ type: 'acc', tag: null }) };
  assert.equal(S.resolveClass(withAcc).name, '見習劍士');
});

test('裝備詞條不超過上限、史詩以上才有特殊效果', () => {
  const rng = R.make(7);
  for (let r = 0; r < D.RARITY.length; r++) {
    for (let i = 0; i < 30; i++) {
      const it = I.createItem(rng, { type: 'acc', tag: null, tier: 3, rarity: r, seq: i });
      assert.ok(it.affixes.length <= D.AFFIX_CAP);
      assert.equal(new Set(it.affixes.map((a) => a.k)).size, it.affixes.length);
      assert.equal(!!it.effect, r >= 3);
      assert.equal(it.tag, null);
    }
  }
});

test('新角色打得贏草原魔物', () => {
  const s = W.newGame(NOW, 1);
  const rng = R.make(3);
  let wins = 0;
  for (let i = 0; i < 50; i++) {
    const r = C.fight(rng, W.hero(s), { name: 'slime', stats: C.enemyStats(1, { hp: 0.8, atk: 0.8 }, true) });
    if (r.win) wins++;
  }
  assert.ok(wins >= 45, `只贏了 ${wins}/50`);
});

test('離線結算：最多 12 小時，時間會往前推', () => {
  const s = W.newGame(NOW, 1);
  const sum = W.catchUp(s, NOW + 48 * 3600e3);
  assert.equal(sum.ticks, D.OFFLINE_CAP_MS / D.TICK_MS);
  assert.ok(s.hero.level > 1);
  assert.ok(s.gold > 0);
  assert.equal(W.catchUp(s, NOW + 48 * 3600e3), null);
});

test('同樣的存檔結算兩次，結果相同', () => {
  const a = W.newGame(NOW, 9), b = W.newGame(NOW, 9);
  W.settle(a, 500, NOW); W.settle(b, 500, NOW);
  assert.deepEqual(a, b);
});

test('鍛鍊室有上限', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'training';
  W.settle(s, 100, NOW);
  assert.equal(s.training.atk, D.DEVICES[0].cap);
  s.gold = 1e6;
  assert.ok(W.upgradeDevice(s, 'dummy'));
  W.settle(s, 100, NOW);
  assert.equal(s.training.atk, D.DEVICES[0].cap * 2);
});

test('鍛造用材料決定流派，材料不足就不鍛造', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'forge';
  s.forge.type = 'weapon';
  W.settle(s, 20, NOW);
  assert.equal(s.bag.length, 0);
  s.mats['arcane-2'] = 8;
  W.settle(s, D.FORGE[1].ticks * 2, NOW);
  assert.equal(s.bag.length, 2);
  assert.ok(s.bag.every((it) => it.tag === 'arcane' && it.tier === 2));
  assert.equal(s.mats['arcane-2'], 0);
  assert.equal(s.counters.crafts, 2);
});

test('市集只賣超過保留數量的材料', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'market';
  s.mats['blade-1'] = 20;
  W.settle(s, 50, NOW);
  assert.equal(s.mats['blade-1'], s.market.keep);
  assert.ok(s.gold > 0);
  assert.equal(s.market.rep, 20 - s.market.keep);
});

test('公會任務完成後可以領獎並換新任務', () => {
  const s = W.newGame(NOW, 1);
  s.guild.quests[0] = { id: 'qx', kind: 'kills', n: '擊敗魔物', need: 3, base: 0, reward: { gold: 99, rep: 5 } };
  assert.equal(W.claimQuest(s, 'qx', NOW), null);
  s.counters.kills = 3;
  const gold = s.gold;
  assert.ok(W.claimQuest(s, 'qx', NOW));
  assert.equal(s.gold, gold + 99);
  assert.notEqual(s.guild.quests[0].id, 'qx');
});

test('裝備穿脫：替換下來的回到背包', () => {
  const s = W.newGame(NOW, 1);
  const rng = R.make(5);
  const it = I.createItem(rng, { type: 'weapon', tag: 'arcane', tier: 1, rarity: 2, seq: 99 });
  s.bag.push(it);
  assert.ok(W.equip(s, it.id));
  assert.equal(s.equip.weapon.id, it.id);
  assert.equal(s.bag[0].name, '新手長劍');
});

test('神之試煉：同一週關卡與祝福固定，跨週重置', () => {
  const w = T.weekId(NOW);
  assert.deepEqual(T.rollOffer(w, 3, []), T.rollOffer(w, 3, []));
  assert.equal(T.rollOffer(w, 3, []).length, 3);
  const s = W.newGame(NOW, 1);
  s.hero.level = 30;
  T.ensure(s, NOW);
  for (let i = 0; i < 3; i++) T.fightFloor(s, NOW);
  assert.equal(s.trial.floor, 4);
  assert.equal(s.trial.offer.length, 3);
  assert.equal(T.fightFloor(s, NOW), null, '有祝福待選時不能繼續');
  assert.ok(T.choose(s, s.trial.offer[0]));
  assert.equal(s.trial.blessings.length, 1);
  T.ensure(s, NOW + 7 * 86400e3);
  assert.equal(s.trial.floor, 1);
  assert.equal(s.trial.blessings.length, 0);
});

test('週一重置時間落在下週一', () => {
  const at = T.weekResetAt(NOW);
  assert.ok(at > NOW && at - NOW <= 7 * 86400e3);
  assert.equal(T.weekId(at), T.weekId(NOW) + 1);
  assert.equal(T.weekId(at - 1), T.weekId(NOW));
});

test('祝福會改變戰鬥行為：連鎖只在有暴擊加成時出現', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 10;
  const foe = { name: 'dummy', stats: C.enemyStats(8, { hp: 4 }) };
  const plain = C.fight(R.make(1), W.hero(s, []), foe, { log: true, maxActions: 80 });
  const storm = C.fight(R.make(1), W.hero(s, ['storm', 'hawk']), foe, { log: true, maxActions: 80 });
  assert.equal(plain.log.filter((l) => l.kind === 'chain').length, 0);
  assert.ok(storm.log.filter((l) => l.kind === 'chain').length > 0);
});

test('魔物狩獵：擊敗頭目解鎖下一張地圖，消耗狩獵券', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 25;
  const out = W.hunt(s, 0, NOW);
  assert.ok(out.r.win);
  assert.equal(s.unlockedArea, 1);
  assert.equal(s.hunt.tickets, W.HUNT_MAX - 1);
  W.hunt(s, 0, NOW); W.hunt(s, 0, NOW);
  assert.equal(W.hunt(s, 0, NOW), null);
  W.refreshTickets(s, NOW + W.HUNT_REFILL_MS);
  assert.equal(s.hunt.tickets, 1);
});
