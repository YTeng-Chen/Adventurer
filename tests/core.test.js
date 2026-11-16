import test from 'node:test';
import assert from 'node:assert/strict';
import { data as D } from '../src/core/data.js';
import { world as W } from '../src/core/world.js';
import { stats as S } from '../src/core/stats.js';
import { items as I } from '../src/core/items.js';
import { combat as C } from '../src/core/combat.js';
import { trial as T } from '../src/core/trial.js';
import { rng as R } from '../src/core/rng.js';

const NOW = Date.UTC(2026, 10, 16, 2, 0, 0); // 2026-11-16（週一）

function item(over) {
  return { id: 'x', name: 't', def: 'longsword', type: 'weapon', form: 'sword', tier: 1, rarity: 0, base: {}, affixes: [], effect: null, ...over };
}

test('隨機數有種子就能重現', () => {
  const a = R.make(42), b = R.make(42);
  for (let i = 0; i < 5; i++) assert.equal(a.next(), b.next());
});

test('職業由武器決定：劍或弓是連鎖、鎚是反擊、法杖是燃燒，防具不影響', () => {
  const cls = (form, extra = {}) => S.resolveClass({ weapon: form ? item({ form }) : null, ...extra });
  assert.equal(cls('sword').name, '劍士');
  assert.deepEqual(cls('bow').mechs, ['chain']);
  assert.deepEqual(cls('hammer').mechs, ['counter']);
  assert.equal(cls('staff').name, '術士');
  assert.equal(cls(null).name, '冒險者');
  assert.deepEqual(cls(null).mechs, []);
  assert.equal(cls('staff', { body: item({ def: 'platearmor', type: 'body', form: undefined }) }).name, '術士');
});

test('裝備詞條不超過上限、史詩以上才有特殊效果', () => {
  const rng = R.make(7);
  for (let r = 0; r < D.RARITY.length; r++) {
    for (let i = 0; i < 30; i++) {
      const it = I.createItem(rng, { type: 'acc', tier: 3, rarity: r, seq: i });
      assert.ok(it.affixes.length <= D.AFFIX_CAP);
      assert.equal(new Set(it.affixes.map((a) => a.k)).size, it.affixes.length);
      assert.equal(!!it.effect, r >= 3);
      assert.equal(it.type, 'acc');
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

test('鍛造用材料決定階級、可以指定款式，材料不足就不鍛造', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'forge';
  s.forge.type = 'weapon';
  s.forge.def = 'staff';
  W.settle(s, 20, NOW);
  assert.equal(s.bag.length, 0);
  s.mats[W.matKey(2)] = 8;
  W.settle(s, D.FORGE[1].ticks * 2, NOW);
  assert.equal(s.bag.length, 2);
  assert.ok(s.bag.every((it) => it.def === 'staff' && it.form === 'staff' && it.tier === 2 && it.name.endsWith('森林法杖')));
  assert.equal(s.mats[W.matKey(2)], 0);
  assert.equal(s.counters.crafts, 2);
});

test('裝備樣式表：id 不重複、部位正確、武器的形態都有職業', () => {
  assert.equal(new Set(D.GEAR.map((g) => g.id)).size, D.GEAR.length);
  for (const g of D.GEAR) {
    assert.ok(D.ITEM_TYPES.includes(g.type), g.id);
    assert.ok(g.n && g.look && g.base, g.id);
    assert.equal(!!g.form, g.type === 'weapon', g.id);
    if (g.form) assert.ok(D.FORMS[g.form], g.id);
  }
  for (const t of D.ITEM_TYPES) assert.ok(I.defsOf(t).length > 0, t);
});

test('舊存檔（有流派）：材料併成每階一種，裝備對應到樣式', async () => {
  const { save } = await import('../src/core/save.js');
  const s = W.newGame(NOW, 1);
  const old = JSON.parse(JSON.stringify(s));
  old.v = 1;
  old.mats = { 'blade-1': 3, 'guard-1': 4, 'arcane-3': 2 };
  old.forge = { ...old.forge, tag: 'guard' }; delete old.forge.def;
  old.guild.quests[0] = { id: 'qo', kind: 'crafts', n: '鍛造裝備', need: 4, base: 0, reward: { gold: 60, rep: 15, mat: { key: 'guard-2', n: 3 } } };
  old.equip.weapon = { id: 'a', name: '新手長劍', type: 'weapon', tag: 'blade', tier: 1, rarity: 0, base: { atk: 12 }, affixes: [], effect: null, form: 'sword' };
  old.bag = [
    { id: 'b', name: '連擊之森林長弓', type: 'weapon', tag: 'blade', tier: 2, rarity: 3, base: { atk: 30 }, affixes: [], effect: { k: 'doubleChance', n: '連擊', v: 0.2, stat: false, d: 'old' }, form: 'bow' },
    { id: 'c', name: '礦鐵板甲', type: 'body', tag: 'guard', tier: 3, rarity: 1, base: { hp: 150 }, affixes: [], effect: null },
    { id: 'd', name: '冥骨耳飾', type: 'acc', tag: null, tier: 4, rarity: 0, base: { crit: 6 }, affixes: [], effect: null },
  ];
  const m = save.migrate(old, NOW);
  assert.equal(m.v, 2);
  assert.deepEqual(m.mats, { [W.matKey(1)]: 7, [W.matKey(3)]: 2 });
  assert.ok(m.guild.quests.every((q) => q.kind === 'kill' || q.kind === 'deliver'), '舊任務換成每日委託');
  assert.equal(m.forge.def, 'auto');
  assert.equal(m.forge.tag, undefined);
  assert.equal(m.equip.weapon.def, 'longsword');
  assert.deepEqual(m.bag.map((it) => it.def), ['longbow', 'platearmor', 'earring']);
  assert.ok(m.bag.every((it) => it.tag === undefined));
  assert.equal(m.bag[0].form, 'bow');
  assert.equal(m.bag[0].name, '連擊之森林長弓');
  assert.equal(m.bag[0].effect.d, '20% 機率再攻擊一次');
  assert.equal(m.bag[0].base.atk, 30, '抽到的數值不變');
  assert.equal(m.bag[2].look, 'earring');
});

test('市集只賣超過保留數量的材料，公會交付委託要的會留著', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'market';
  s.guild.quests = [];
  s.mats[W.matKey(1)] = 20;
  W.settle(s, 50, NOW);
  assert.equal(s.mats[W.matKey(1)], s.market.keep);
  assert.ok(s.gold > 0);
  assert.equal(s.market.rep, 20 - s.market.keep);
  s.guild.quests = [{ id: 'qd', kind: 'deliver', tier: 1, need: 15, reward: { gold: 1, rep: 1 }, done: false }];
  s.mats[W.matKey(1)] = 30;
  W.settle(s, 50, NOW);
  assert.equal(s.mats[W.matKey(1)], 15);
});

test('公會：每天刷新委託（擊敗指定魔物、交付材料），完成拿金幣與聲望，一天只能領一次', () => {
  const s = W.newGame(NOW, 1);
  assert.equal(s.guild.quests.length, D.GUILD.quests);
  assert.ok(s.guild.quests.some((q) => q.kind === 'kill') && s.guild.quests.some((q) => q.kind === 'deliver'));
  assert.ok(D.LOCATIONS.every((l) => l.k !== 'guild'), '公會不能掛機');
  assert.equal(W.refreshQuests(s, NOW + 1000), false, '同一天不會換');

  // 擊敗指定魔物：只算接到委託之後、那一種魔物
  const kill = { id: 'qk', kind: 'kill', area: 0, mon: 1, need: 5, base: s.monKills['0-1'] || 0, reward: { gold: 80, rep: 40 }, done: false };
  const deliver = { id: 'qd', kind: 'deliver', tier: 1, need: 12, reward: { gold: 80, rep: 80 }, done: false };
  s.guild.quests = [kill, deliver];
  assert.equal(W.questText(kill), '在綠風草原擊敗草原狼');
  assert.equal(W.claimQuest(s, 'qk', NOW), null);
  s.hero.level = 10;
  W.settle(s, 60, NOW);
  assert.ok(s.monKills['0-1'] >= 5);
  const gold = s.gold;
  assert.ok(W.claimQuest(s, 'qk', NOW));
  assert.equal(s.gold, gold + 80);
  assert.equal(s.guild.rep, 40);
  assert.equal(W.claimQuest(s, 'qk', NOW), null, '一天只能領一次');

  // 交付：材料夠才能交，交了會扣掉
  s.mats[W.matKey(1)] = 20;
  assert.equal(W.questText(deliver), '交付獸牙');
  assert.ok(W.claimQuest(s, 'qd', NOW));
  assert.equal(s.mats[W.matKey(1)], 8);
  assert.match(s.log[0].msg, /晉升為初級冒險者/);

  // 隔天換一批新的
  assert.ok(W.refreshQuests(s, NOW + 86400e3));
  assert.ok(s.guild.quests.every((q) => !q.done && q.id !== 'qk' && q.id !== 'qd'));
  assert.ok(W.dayResetAt(NOW) > NOW && W.dayResetAt(NOW) - NOW <= 86400e3);
});

test('委託只出在能去的地圖', () => {
  const s = W.newGame(NOW, 1);
  for (let d = 1; d <= 20; d++) {
    W.refreshQuests(s, NOW + d * 86400e3);
    assert.equal(s.guild.quests.length, D.GUILD.quests);
    assert.ok(s.guild.quests.every((q) => (q.kind === 'kill' ? q.area === 0 : q.tier === 1)));
    const keys = s.guild.quests.map((q) => (q.kind === 'kill' ? `k${q.mon}` : 'd'));
    assert.equal(new Set(keys).size, keys.length, '同一天不重複');
  }
  s.guild.rep = D.RANKS[2].rep; s.bossKills = { 0: 1, 1: 1 };
  const areas = new Set();
  for (let d = 21; d <= 60; d++) {
    W.refreshQuests(s, NOW + d * 86400e3);
    for (const q of s.guild.quests) if (q.kind === 'kill') areas.add(q.area);
  }
  assert.ok(areas.has(2) && [...areas].every((a) => a <= 2));
});

test('裝備穿脫：替換下來的回到背包', () => {
  const s = W.newGame(NOW, 1);
  const rng = R.make(5);
  const it = I.createItem(rng, { def: 'staff', tier: 1, rarity: 2, seq: 99 });
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
  s.equip.weapon = null;   // 空手：沒有劍士的連鎖
  const foe = { name: 'dummy', stats: C.enemyStats(8, { hp: 4 }) };
  const plain = C.fight(R.make(1), W.hero(s, []), foe, { log: true, maxActions: 80 });
  const storm = C.fight(R.make(1), W.hero(s, ['storm', 'hawk']), foe, { log: true, maxActions: 80 });
  assert.equal(plain.log.filter((l) => l.kind === 'chain').length, 0);
  assert.ok(storm.log.filter((l) => l.kind === 'chain').length > 0);
});

test('魔物狩獵：消耗狩獵券，首次擊敗金幣比較多', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 25;
  const out = W.hunt(s, 0, NOW);
  assert.ok(out.r.win);
  assert.equal(s.bossKills[0], 1);
  assert.equal(s.hunt.tickets, W.HUNT_MAX - 1);
  const again = W.hunt(s, 0, NOW);
  assert.ok(again.rewards.gold < out.rewards.gold);
  W.hunt(s, 0, NOW);
  assert.equal(W.hunt(s, 0, NOW), null);
  W.refreshTickets(s, NOW + W.HUNT_REFILL_MS);
  assert.equal(s.hunt.tickets, 1);
});

test('新遊戲還沒有外觀，舊存檔也會補上空的外觀欄位（第一次進遊戲時讓玩家選）', async () => {
  const { save } = await import('../src/core/save.js');
  const s = W.newGame(NOW, 1);
  assert.equal(s.appearance, null);
  const old = JSON.parse(JSON.stringify(s));
  delete old.appearance;
  const migrated = save.migrate(old, NOW);
  assert.equal(migrated.appearance, null);
  migrated.appearance = { gender: '女', style: '高馬尾', color: '粉紅' };
  assert.deepEqual(save.migrate(JSON.parse(JSON.stringify(migrated)), NOW).appearance, { gender: '女', style: '高馬尾', color: '粉紅' });
});

test('武器有形態（決定攻擊動作），其他部位沒有', () => {
  const rng = R.make(7);
  const forms = new Set();
  for (let i = 0; i < 80; i++) forms.add(I.createItem(rng, { type: 'weapon', tier: 1, rarity: 0, seq: i }).form);
  assert.deepEqual([...forms].sort(), ['bow', 'hammer', 'staff', 'sword']);
  assert.equal(I.createItem(rng, { type: 'body', tier: 1, rarity: 0, seq: 99 }).form, undefined);
  assert.equal(I.createItem(rng, { def: 'huntbow', tier: 1, rarity: 0, seq: 100 }).form, 'bow');
});

test('地圖和狩獵要兩個條件：冒險者階級夠、打倒前一張地圖的頭目', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 40;
  assert.equal(D.RANKS[W.rank(s)].n, '新手');
  assert.ok(W.areaOpen(s, 0));
  assert.deepEqual(W.areaNeeds(s, 1), ['初級冒險者', '擊敗史萊姆王']);
  assert.equal(W.setArea(s, 1), false);
  assert.equal(W.hunt(s, 1, NOW), null);
  assert.equal(s.hunt.tickets, W.HUNT_MAX, '還不能去就不會扣狩獵券');

  // 先打倒頭目：階級還不夠，告訴玩家還差什麼
  const out = W.hunt(s, 0, NOW);
  assert.ok(out.r.win);
  assert.equal(out.rewards.unlocked, null);
  assert.deepEqual(out.rewards.next, { area: '幽暗森林', needs: ['初級冒險者'] });
  assert.match(s.log[0].msg, /達到初級冒險者就能前往「幽暗森林」/);
  assert.equal(W.areaOpen(s, 1), false);

  // 再晉升：兩個條件都達成
  W.addRep(s, D.RANKS[1].rep, NOW);
  assert.match(s.log[0].msg, /晉升為初級冒險者，可以前往「幽暗森林」/);
  assert.ok(W.setArea(s, 1));
  assert.equal(W.topArea(s), 1);
  assert.ok(W.hunt(s, 1, NOW));
});

test('階級先到、後打倒頭目：打倒時解鎖下一張地圖', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 40;
  W.addRep(s, D.RANKS[1].rep, NOW);
  assert.equal(s.log[0].msg, '晉升為初級冒險者');
  assert.deepEqual(W.areaNeeds(s, 1), ['擊敗史萊姆王']);
  const out = W.hunt(s, 0, NOW);
  assert.equal(out.rewards.unlocked, '幽暗森林');
  assert.match(s.log[0].msg, /首次擊敗史萊姆王，可以前往「幽暗森林」/);
});

test('高級地圖掉高階材料，裝備不限階級都能穿', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 60;
  s.guild.rep = D.RANKS[D.AREAS[4].rank].rep;
  s.bossKills = { 0: 1, 1: 1, 2: 1, 3: 1 };
  assert.ok(W.setArea(s, 4));
  W.settle(s, 200, NOW);
  assert.ok(s.mats[W.matKey(5)] > 0);
  const it = I.createItem(R.make(2), { def: 'staff', tier: 5, rarity: 0, seq: 500 });
  const fresh = W.newGame(NOW, 1);
  fresh.bag.push(it);
  assert.ok(W.equip(fresh, it.id), '新手也能穿 T5');
});

test('舊存檔：打頭目解鎖過的地圖，聲望補到去得了的階級', async () => {
  const { save } = await import('../src/core/save.js');
  const old = JSON.parse(JSON.stringify(W.newGame(NOW, 1)));
  old.unlockedArea = 2; old.guild.rep = 5; old.bossKills = { 0: 2 };
  const m = save.migrate(old, NOW);
  assert.equal(m.unlockedArea, undefined);
  assert.deepEqual(m.bossKills, { 0: 2, 1: 1 });
  assert.ok(W.areaOpen(m, 2));
  assert.equal(W.areaOpen(m, 3), false);
});

test('炎龍套裝：只在 T5 出現，名稱不加階級前綴，大劍是劍士', () => {
  const rng = R.make(21);
  const seen = { 1: new Set(), 5: new Set() };
  for (let i = 0; i < 400; i++) for (const tier of [1, 5]) seen[tier].add(I.createItem(rng, { type: D.ITEM_TYPES[i % 5], tier, rarity: 0, seq: i }).def);
  for (const id of ['dragonblade', 'dragonhelm', 'dragonmail', 'dragonclaw']) {
    assert.ok(seen[5].has(id), id + ' 在 T5 會出現');
    assert.ok(!seen[1].has(id), id + ' 不會在 T1 出現');
  }
  const blade = I.createItem(rng, { def: 'dragonblade', tier: 5, rarity: 0, seq: 999 });
  assert.equal(blade.name, '炎龍大劍');
  assert.equal(blade.form, 'greatsword');
  assert.equal(blade.set, 'dragon');
  assert.equal(S.resolveClass({ weapon: blade }).name, '劍士');
});

test('套裝效果：2 件、4 件各有加成', () => {
  const s = W.newGame(NOW, 1);
  const rng = R.make(3);
  const base = W.hero(s);
  const piece = (def) => I.createItem(rng, { def, tier: 5, rarity: 0, seq: 1 });
  s.equip.head = piece('dragonhelm');
  const one = W.hero(s);
  assert.equal(one.sets[0].count, 1);
  assert.ok(one.sets[0].bonus.every((b) => !b.on));
  s.equip.body = piece('dragonmail');
  const two = W.hero(s);
  assert.deepEqual(two.sets[0].bonus.map((b) => b.on), [true, false]);
  const noSet = S.computeHero({ ...s, equip: { ...s.equip, head: { ...s.equip.head, set: undefined }, body: { ...s.equip.body, set: undefined } } });
  assert.ok(Math.abs(two.stats.hp - noSet.stats.hp * 1.12) < 0.01, '生命 +12%');
  s.equip.weapon = piece('dragonblade'); s.equip.feet = piece('dragonclaw');
  const four = W.hero(s);
  assert.deepEqual(four.sets[0].bonus.map((b) => b.on), [true, true]);
  assert.equal(four.eff.burnStacks, 1);
  assert.ok(Math.abs(four.eff.burnPct - 0.25) < 1e-9);
  assert.equal(base.sets.length, 0);
});

test('鍛造指定只在 T5 的款式：只用 T5 材料', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'forge'; s.forge.type = 'weapon'; s.forge.def = 'dragonblade';
  s.mats[W.matKey(3)] = 20;
  W.settle(s, D.FORGE[1].ticks * 2, NOW);
  assert.equal(s.bag.length, 0);
  assert.match(s.forge.status, /T5/);
  s.mats[W.matKey(5)] = 4;
  W.settle(s, D.FORGE[1].ticks, NOW);
  assert.equal(s.bag.length, 1);
  assert.equal(s.bag[0].name.endsWith('炎龍大劍'), true);
  assert.equal(s.mats[W.matKey(3)], 20);
});
