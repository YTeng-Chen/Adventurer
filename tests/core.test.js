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

test('鍛造：照配方用同一階的素材，同一類可以互相代替；可以指定款式和階級，素材不足就不鍛造', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'forge';
  s.forge.type = 'weapon';
  s.forge.def = 'staff';   // 法杖：靈材 3、硬材 1
  W.settle(s, 20, NOW);
  assert.equal(s.bag.length, 0);
  assert.match(s.forge.status, /法杖要 靈材 3、硬材 1/);
  // T2 的靈材有兩種（發光孢子、魔晶碎片）可以混著用；T1 另外也湊得出一把
  s.mats[W.matKey('spore', 2)] = 4; s.mats[W.matKey('crystal', 2)] = 2; s.mats[W.matKey('heartwood', 2)] = 2;
  s.mats[W.matKey('goo', 1)] = 3; s.mats[W.matKey('shell', 1)] = 1;
  W.settle(s, D.FORGE[1].ticks * 2, NOW);
  assert.equal(s.bag.length, 2);
  assert.ok(s.bag.every((it) => it.def === 'staff' && it.form === 'staff' && it.tier === 2 && it.name.endsWith('森林法杖')), '自動先用最高階');
  assert.equal((s.mats[W.matKey('spore', 2)] || 0) + (s.mats[W.matKey('crystal', 2)] || 0) + (s.mats[W.matKey('heartwood', 2)] || 0), 0);
  assert.equal(s.mats[W.matKey('goo', 1)], 3, 'T1 沒動到');
  s.forge.tier = 1;
  W.settle(s, D.FORGE[1].ticks, NOW);
  assert.equal(s.bag.length, 3);
  assert.equal(s.bag[2].tier, 1);
  assert.equal(s.mats[W.matKey('goo', 1)] + s.mats[W.matKey('shell', 1)], 0);
  assert.equal(s.counters.crafts, 3);
});

test('鍛造加入頭目素材：每件多用一個同階的頭目素材，沒有就照常鍛造', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'forge'; s.forge.type = 'acc'; s.forge.boost = true;
  s.mats[W.matKey('goo', 1)] = 40; s.mats[W.matKey('shell', 1)] = 10; s.mats[W.matKey('wolfhide', 1)] = 10;
  s.mats[W.matKey('queenshell', 1)] = 2;
  W.settle(s, D.FORGE[1].ticks * 3, NOW);
  assert.equal(s.bag.length, 3);
  assert.equal(s.mats[W.matKey('queenshell', 1)], 0);
  assert.equal(W.boostKey(s, 1), null);
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

test('舊存檔（有流派）：材料併成每階一種再分給那一階的魔物素材，裝備對應到樣式', async () => {
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
  assert.equal(m.v, 3);
  // T1 有 7 個、T3 有 2 個：都分給綠風草原的三種魔物素材
  assert.deepEqual(m.mats, { 'goo.1': 3, 'wolfhide.1': 2, 'shell.1': 2, 'goo.3': 1, 'wolfhide.3': 1 });
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

test('市集只賣超過保留數量的素材，公會交付委託要的會留著，頭目素材不賣', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'market';
  s.guild.quests = [];
  const k = W.matKey('goo', 1), boss = W.matKey('queenshell', 1);
  s.mats[k] = 20; s.mats[boss] = 5;
  W.settle(s, 50, NOW);
  assert.equal(s.mats[k], s.market.keep);
  assert.equal(s.mats[boss], 5);
  assert.ok(s.gold > 0);
  assert.equal(s.market.rep, 20 - s.market.keep);
  s.guild.quests = [{ id: 'qd', kind: 'deliver', mat: k, need: 15, reward: { gold: 1, rep: 1 }, done: false }];
  s.mats[k] = 30;
  W.settle(s, 50, NOW);
  assert.equal(s.mats[k], 15);
});

test('公會：每天刷新委託（擊敗指定魔物、交付材料），完成拿金幣與聲望，一天只能領一次', () => {
  const s = W.newGame(NOW, 1);
  assert.equal(s.guild.quests.length, D.GUILD.quests);
  assert.ok(s.guild.quests.some((q) => q.kind === 'kill') && s.guild.quests.some((q) => q.kind === 'deliver'));
  assert.ok(D.LOCATIONS.every((l) => l.k !== 'guild'), '公會不能掛機');
  assert.equal(W.refreshQuests(s, NOW + 1000), false, '同一天不會換');

  // 擊敗指定魔物：只算接到委託之後、那一種魔物
  const kill = { id: 'qk', kind: 'kill', area: 0, mon: 1, need: 5, base: s.monKills['0-1'] || 0, reward: { gold: 80, rep: 40 }, done: false };
  const deliver = { id: 'qd', kind: 'deliver', mat: W.matKey('wolfhide', 1), need: 12, reward: { gold: 80, rep: 80 }, done: false };
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

  // 交付：素材夠才能交，交了會扣掉
  s.mats[W.matKey('wolfhide', 1)] = 20;
  assert.equal(W.questText(deliver), '交付狼皮 T1');
  assert.ok(W.claimQuest(s, 'qd', NOW));
  assert.equal(s.mats[W.matKey('wolfhide', 1)], 8);
  assert.match(s.log[0].msg, /晉升為初級冒險者/);

  // 隔天換一批新的
  assert.ok(W.refreshQuests(s, NOW + 86400e3));
  assert.ok(s.guild.quests.every((q) => !q.done && q.id !== 'qk' && q.id !== 'qd'));
  assert.ok(W.dayResetAt(NOW) > NOW && W.dayResetAt(NOW) - NOW <= 86400e3);
});

test('委託只出在能去的段', () => {
  const s = W.newGame(NOW, 1);
  for (let d = 1; d <= 20; d++) {
    W.refreshQuests(s, NOW + d * 86400e3);
    assert.equal(s.guild.quests.length, D.GUILD.quests);
    assert.ok(s.guild.quests.every((q) => (q.kind === 'kill' ? q.area === 0 : W.matDef(q.mat).area === 0 && W.matTier(q.mat) === 1)));
    const keys = s.guild.quests.map((q) => (q.kind === 'kill' ? `k${q.mon}` : q.mat));
    assert.equal(new Set(keys).size, keys.length, '同一天不重複');
  }
  // 中級冒險者、打倒草原前兩個頭目：草原三段、森林和礦坑第一段、墓穴和火山第一段都能去
  s.guild.rep = D.RANKS[2].rep; s.bossKills = { '0-0': 1, '0-1': 1 };
  const areas = new Set();
  for (let d = 21; d <= 60; d++) {
    W.refreshQuests(s, NOW + d * 86400e3);
    for (const q of s.guild.quests) {
      if (q.kind === 'kill') areas.add(q.area);
      else { const m = W.matDef(q.mat); assert.ok(W.stageOpen(s, m.area, W.matTier(q.mat) - D.AREAS[m.area].tier), q.mat); }
    }
  }
  assert.ok(areas.has(3) || areas.has(4));
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

test('頭目：還沒打倒過可以免費挑戰，打倒過之後重打要狩獵券；首次擊敗金幣比較多', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 25;
  const out = W.hunt(s, 0, 0, NOW);
  assert.ok(out.r.win);
  assert.equal(s.bossKills['0-0'], 1);
  assert.equal(s.hunt.tickets, W.HUNT_MAX, '第一次不用狩獵券');
  assert.equal(out.rewards.mats[W.matKey('queenshell', 1)], 3, '掉頭目素材');
  assert.ok(Object.keys(out.rewards.mats).length >= 2, '也掉這張地圖的魔物素材');
  assert.equal(s.bag.length, 0, '不掉裝備');
  const again = W.hunt(s, 0, 0, NOW);
  assert.equal(s.hunt.tickets, W.HUNT_MAX - 1);
  assert.ok(again.rewards.gold < out.rewards.gold);
  W.hunt(s, 0, 0, NOW); W.hunt(s, 0, 0, NOW);
  assert.equal(s.hunt.tickets, 0);
  assert.equal(W.hunt(s, 0, 0, NOW), null);
  W.refreshTickets(s, NOW + W.HUNT_REFILL_MS);
  assert.equal(s.hunt.tickets, 1);
});

test('魔物不掉裝備，掉牠自己的素材；等級跟著主角但不超出那一段', () => {
  // 主角 40 級在草原第一段（Lv1–10）：魔物都是 10 級，每隻經驗 6 + 3×10
  const s = W.newGame(NOW, 1);
  s.hero.level = 40;
  const sum = W.settle(s, 300, NOW);
  assert.equal(s.bag.length, 0);
  assert.deepEqual(Object.keys(s.mats).sort(), ['goo.1', 'shell.1', 'wolfhide.1']);
  assert.ok(sum.kills > 0);
  assert.equal(sum.exp, sum.kills * 36);
  // 主角 1 級：魔物 1–2 級
  const low = W.newGame(NOW, 2);
  low.hero.exp = -1e9;   // 不讓它升級，方便算
  const s2 = W.settle(low, 50, NOW);
  assert.ok(s2.exp >= s2.kills * 9 && s2.exp <= s2.kills * 12);
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

test('地圖的段：冒險者階級要夠、要打倒前一段的頭目；其他地圖的第一段要先打倒前一個等級的頭目', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 60;
  assert.equal(D.RANKS[W.rank(s)].n, '新手');
  assert.ok(W.stageOpen(s, 0, 0));
  assert.deepEqual(W.stageNeeds(s, 0, 1), ['初級冒險者', '擊敗甲蟲女王']);
  assert.deepEqual(W.areaNeeds(s, 1), ['初級冒險者', '擊敗任一隻 Lv10 的頭目']);
  assert.equal(W.setStage(s, 1), false);
  assert.equal(W.setArea(s, 1), false);
  assert.equal(W.hunt(s, 0, 1, NOW), null);
  assert.equal(s.hunt.tickets, W.HUNT_MAX, '還不能去就不會扣狩獵券');

  // 先打倒第一段的頭目：階級還不夠，告訴玩家還差什麼
  const out = W.hunt(s, 0, 0, NOW);
  assert.ok(out.r.win);
  assert.deepEqual(out.rewards.unlocked, []);
  assert.deepEqual(out.rewards.next, { stage: '綠風草原 Lv11–20', needs: ['初級冒險者'] });
  assert.match(s.log[0].msg, /達到初級冒險者就能前往「綠風草原 Lv11–20」/);
  assert.equal(W.stageOpen(s, 0, 1), false);

  // 再晉升：草原第二段、森林、礦坑的第一段一起開放
  W.addRep(s, D.RANKS[1].rep, NOW);
  assert.match(s.log[0].msg, /晉升為初級冒險者，可以前往「綠風草原 Lv11–20」、「幽暗森林 Lv11–20」、「鐵鏽礦坑 Lv11–20」/);
  assert.ok(W.setArea(s, 1));
  assert.equal(s.stage, 0);
  assert.ok(W.setArea(s, 0));
  assert.equal(s.stage, 1, '換地圖時到那張地圖能去、等級也夠的最後一段');
  s.hero.level = 5;
  assert.ok(W.setArea(s, 0));
  assert.equal(s.stage, 0, '等級不夠第二段（11 級起）：先去第一段');
  s.hero.level = 60;
  assert.ok(W.setStage(s, 0));
  assert.equal(W.bestStage(s).tier, 2);
});

test('階級先到、後打倒頭目：打倒時開放下一段和其他地圖', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 60;
  W.addRep(s, D.RANKS[1].rep, NOW);
  assert.equal(s.log[0].msg, '晉升為初級冒險者');
  assert.deepEqual(W.stageNeeds(s, 0, 1), ['擊敗甲蟲女王']);
  const out = W.hunt(s, 0, 0, NOW);
  assert.deepEqual(out.rewards.unlocked, ['「綠風草原 Lv11–20」', '「幽暗森林 Lv11–20」', '「鐵鏽礦坑 Lv11–20」']);
  assert.match(s.log[0].msg, /首次擊敗甲蟲女王，可以前往「綠風草原 Lv11–20」/);
});

test('高等級的段掉高階素材，裝備不限階級都能穿', () => {
  const s = W.newGame(NOW, 1);
  s.hero.level = 60;
  s.guild.rep = D.RANKS[4].rep;
  s.bossKills = { '0-0': 1, '0-1': 1, '4-0': 1, '4-1': 1 };
  assert.ok(W.setArea(s, 4));
  assert.equal(s.stage, 2);
  W.settle(s, 200, NOW);
  assert.ok(['salamander', 'lavarock', 'flame'].some((id) => s.mats[W.matKey(id, 5)] > 0));
  assert.equal(s.bag.length, 0);
  const it = I.createItem(R.make(2), { def: 'staff', tier: 5, rarity: 0, seq: 500 });
  const fresh = W.newGame(NOW, 1);
  fresh.bag.push(it);
  assert.ok(W.equip(fresh, it.id), '新手也能穿 T5');
});

test('舊存檔：打頭目解鎖過的地圖，聲望補到去得了的階級；換成新的頭目和素材', async () => {
  const { save } = await import('../src/core/save.js');
  const old = JSON.parse(JSON.stringify(W.newGame(NOW, 1)));
  old.v = 2; old.unlockedArea = 2; old.guild.rep = 5; old.bossKills = { 0: 2 };
  old.mats = { m1: 5, m4: 3 }; delete old.stage;
  const m = save.migrate(old, NOW);
  assert.equal(m.unlockedArea, undefined);
  assert.equal(m.v, 3);
  // 以前能去鐵鏽礦坑（T3）：現在素材 T2 以下的頭目都算打倒過，T3 的段都能去，T4 還不行
  assert.deepEqual(m.bossKills, { '0-0': 1, '0-1': 1, '1-0': 1, '2-0': 1 });
  assert.ok(W.stageOpen(m, 2, 1));
  assert.equal(W.stageOpen(m, 2, 2), false);
  assert.ok(W.stageOpen(m, 3, 0));
  assert.deepEqual(m.mats, { 'goo.1': 2, 'wolfhide.1': 2, 'shell.1': 1, 'shadowhide.4': 1, 'heartwood.4': 1, 'spore.4': 1 });
  assert.equal(m.stage, 0);
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

test('炎龍套裝要用炎龍鱗，只能用 T5 素材；沒指定款式時不會用掉頭目素材', () => {
  const s = W.newGame(NOW, 1);
  s.location = 'forge'; s.forge.type = 'weapon'; s.forge.def = 'dragonblade';
  s.mats[W.matKey('lavarock', 5)] = 20; s.mats[W.matKey('salamander', 5)] = 20;
  s.mats[W.matKey('ironshell', 3)] = 20; s.mats[W.matKey('goblinhide', 3)] = 20;
  W.settle(s, D.FORGE[1].ticks * 2, NOW);
  assert.equal(s.bag.length, 0);
  assert.match(s.forge.status, /炎龍鱗 2/);
  s.mats[W.matKey('dragonscale', 5)] = 2;
  W.settle(s, D.FORGE[1].ticks, NOW);
  assert.equal(s.bag.length, 1);
  assert.equal(s.bag[0].name, '炎龍大劍');
  assert.equal(s.mats[W.matKey('dragonscale', 5)], 0);
  assert.equal(s.mats[W.matKey('ironshell', 3)], 20, '沒用到 T3 素材');
  s.forge.def = 'auto'; s.mats[W.matKey('dragonscale', 5)] = 5;
  W.settle(s, D.FORGE[1].ticks * 3, NOW);
  assert.equal(s.bag.length, 4);
  assert.ok(s.bag.slice(1).every((it) => !it.set));
  assert.equal(s.mats[W.matKey('dragonscale', 5)], 5);
});

test('測試用：直接拿到整套炎龍套裝並穿上，換下來的放回背包', () => {
  const s = W.newGame(NOW, 1);
  const old = s.equip.weapon;
  const got = W.giveSet(s, 'dragon');
  assert.equal(got.length, 4);
  assert.deepEqual(['weapon', 'head', 'body', 'feet'].map((k) => s.equip[k].set), ['dragon', 'dragon', 'dragon', 'dragon']);
  assert.ok(got.every((it) => it.rarity === 4 && it.tier === 5));
  assert.ok(s.bag.includes(old));
  assert.deepEqual(W.hero(s).sets[0].bonus.map((b) => b.on), [true, true]);
});

test('測試用：取得全部裝備，每一款各一件放進背包，背包滿了就停', () => {
  const s = W.newGame(NOW, 1);
  s.bag = [];
  const r = W.giveAllGear(s);
  assert.equal(r.got, D.GEAR.length);
  assert.equal(r.left, 0);
  assert.deepEqual(new Set(s.bag.map((it) => it.def)).size, D.GEAR.length);
  assert.ok(s.bag.every((it) => it.rarity === 4));
  const full = W.giveAllGear(s);
  assert.equal(s.bag.length, D.BAG_CAP);
  assert.equal(full.got + full.left, D.GEAR.length);
});

test('測試用：刪除全部裝備，背包和身上都清空', () => {
  const s = W.newGame(NOW, 1);
  W.giveAllGear(s);
  W.giveSet(s, 'dragon');
  const n = s.bag.length + Object.values(s.equip).filter(Boolean).length;
  assert.equal(W.clearGear(s), n);
  assert.equal(s.bag.length, 0);
  assert.ok(Object.values(s.equip).every((x) => x === null));
});
