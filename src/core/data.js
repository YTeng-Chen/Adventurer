// 遊戲資料表：數值、職業、稀有度、地圖、材料、祝福、設備。
// 平衡用的數字都集中在這裡，調整時不用改邏輯。每一款裝備的資料在 gear.js。
import { GEAR } from './gear.js';
const TICK_MS = 5000;                 // 掛機每 5 秒結算一次
const OFFLINE_CAP_MS = 12 * 3600e3;   // 離線最多結算 12 小時
const AFFIX_CAP = 3;                  // 每件裝備詞條上限
const BAG_CAP = 60;

const STATS = [
  { k: 'hp', n: '生命' },
  { k: 'atk', n: '物理攻擊' },
  { k: 'matk', n: '魔法攻擊' },
  { k: 'def', n: '物理防禦' },
  { k: 'mdef', n: '魔法防禦' },
  { k: 'spd', n: '速度' },
  { k: 'crit', n: '暴擊率', pct: true },
  { k: 'critDmg', n: '暴擊傷害', pct: true },
  { k: 'pen', n: '物理穿透', pct: true },
  { k: 'mpen', n: '魔法穿透', pct: true },
  { k: 'lifesteal', n: '吸血', pct: true },
];
const STAT_NAME = Object.fromEntries(STATS.map((s) => [s.k, s.n]));
const STAT_PCT = Object.fromEntries(STATS.map((s) => [s.k, !!s.pct]));

// 職業由武器的攻擊方式決定，每種職業有一個戰鬥機制（stats.js 的 applyMech）
const FORMS = {
  sword: { n: '劍', cls: '劍士', mech: 'chain' },
  bow: { n: '弓', cls: '弓手', mech: 'chain' },
  hammer: { n: '鎚', cls: '守衛', mech: 'counter' },
  staff: { n: '法杖', cls: '術士', mech: 'burn' },
  greatsword: { n: '大劍', cls: '劍士', mech: 'chain' },
};

// 套裝：同一套穿越多件，效果越多（need 是要穿幾件）。pct 是百分比加成、flat 是固定加成、eff 是戰鬥效果，寫法和祝福一樣
const SETS = {
  dragon: { n: '炎龍套裝', pieces: 4, color: '#ff7a2c', bonus: [
    { need: 2, d: '物理攻擊、生命 +12%', pct: { atk: 12, hp: 12 } },
    { need: 4, d: '炎龍之怒：攻擊附加 1 層燃燒、燃燒傷害 +10%、暴擊傷害 +30%', flat: { critDmg: 30 }, eff: { burnStacks: 1, burnPct: 0.1 } },
  ] },
  // 頭目套裝（gear.js 的「頭目套裝」、外觀在 src/rig/sets/）
  beetle: { n: '甲蟲女王套裝', pieces: 4, color: '#7fd05a', bonus: [
    { need: 2, d: '防禦、生命 +6%', pct: { def: 6, hp: 6 } },
    { need: 4, d: '女王之殼：反擊機率 +10%、受到的傷害 -5%', eff: { counterChance: 0.1, dmgReduce: 0.05 } },
  ] },
  wolf: { n: '狼王套裝', pieces: 4, color: '#c2bcb8', bonus: [
    { need: 2, d: '速度 +6、暴擊 +3', flat: { spd: 6, crit: 3 } },
    { need: 4, d: '狼群突襲：12% 機率再攻擊一次', eff: { doubleChance: 0.12 } },
  ] },
  spore: { n: '菇母套裝', pieces: 4, color: '#5ae0c0', bonus: [
    { need: 2, d: '魔法攻擊 +8%', pct: { matk: 8 } },
    { need: 4, d: '孢子瘴氣：攻擊附加 1 層燃燒、燃燒傷害 +5%', eff: { burnStacks: 1, burnPct: 0.05 } },
  ] },
  goblin: { n: '戰團套裝', pieces: 4, color: '#9adf4a', bonus: [
    { need: 2, d: '物理攻擊 +8%', pct: { atk: 8 } },
    { need: 4, d: '戰團號令：連鎖追加傷害 +30%', eff: { chain: 0.3 } },
  ] },
  slime: { n: '史萊姆王套裝', pieces: 4, color: '#5ad06a', bonus: [
    { need: 2, d: '生命 +12%', pct: { hp: 12 } },
    { need: 4, d: '王之再生：受到致命傷時保留 1 點生命並回復 30%（每場一次）、吸血 +4%', flat: { lifesteal: 4 }, eff: { undying: 1 } },
  ] },
  shadow: { n: '影狼套裝', pieces: 4, color: '#9a5aff', bonus: [
    { need: 2, d: '暴擊 +5、穿透 +4', flat: { crit: 5, pen: 4 } },
    { need: 4, d: '影襲：15% 機率再攻擊一次、暴擊傷害 +20%', flat: { critDmg: 20 }, eff: { doubleChance: 0.15 } },
  ] },
  crystal: { n: '魔晶套裝', pieces: 4, color: '#b89af8', bonus: [
    { need: 2, d: '魔法攻擊 +10%', pct: { matk: 10 } },
    { need: 4, d: '魔晶共鳴：魔法穿透 +10、燃燒傷害 +8%', flat: { mpen: 10 }, eff: { burnPct: 0.08 } },
  ] },
  grave: { n: '守墓人套裝', pieces: 4, color: '#3ad8a0', bonus: [
    { need: 2, d: '物理攻擊 +10%', pct: { atk: 10 } },
    { need: 4, d: '送葬：每次行動傷害 +4%，可疊加', eff: { ramp: 0.04 } },
  ] },
  rock: { n: '岩王套裝', pieces: 4, color: '#ff7a1a', bonus: [
    { need: 2, d: '防禦、物理攻擊 +10%', pct: { def: 10, atk: 10 } },
    { need: 4, d: '岩王之軀：受到的傷害 -8%、攻擊附加 1 層燃燒、燃燒可以暴擊', eff: { dmgReduce: 0.08, burnStacks: 1, critBurn: 1 } },
  ] },
};
const MECHS = {
  chain: { n: '連鎖', color: '#e0564a' },
  counter: { n: '反擊', color: '#4a8fe0' },
  burn: { n: '燃燒', color: '#a565e0' },
};

const SLOTS = [
  { k: 'weapon', n: '武器', type: 'weapon' },
  { k: 'head', n: '頭飾', type: 'head' },
  { k: 'body', n: '上衣', type: 'body' },
  { k: 'feet', n: '鞋子', type: 'feet' },
  { k: 'acc1', n: '飾品一', type: 'acc' },
  { k: 'acc2', n: '飾品二', type: 'acc' },
];
const TYPE_NAME = { weapon: '武器', head: '頭飾', body: '上衣', feet: '鞋子', acc: '飾品' };
const ITEM_TYPES = Object.keys(TYPE_NAME);
const GEAR_BY_ID = Object.fromEntries(GEAR.map((g) => [g.id, g]));

const RARITY = [
  { n: '普通', color: '#9aa3ad', mult: 1.0, affixes: 0 },
  { n: '精良', color: '#4fb35e', mult: 1.15, affixes: 1 },
  { n: '稀有', color: '#3f86dd', mult: 1.35, affixes: 2 },
  { n: '史詩', color: '#a35ddc', mult: 1.6, affixes: 3, effect: 1 },
  { n: '傳說', color: '#e8962a', mult: 2.0, affixes: 3, effect: 2 },
];
// 鍛造室等級對應的稀有度機率（普通、精良、稀有、史詩、傳說）
const FORGE = [
  null,
  { n: '簡易火爐', cost: 0, odds: [60, 28, 9, 2.5, 0.5], ticks: 6 },
  { n: '精鐵熔爐', cost: 500, odds: [45, 33, 15, 6, 1], ticks: 5 },
  { n: '符文鐵砧', cost: 2500, odds: [32, 35, 21, 10, 2], ticks: 4 },
  { n: '星火鍛爐', cost: 10000, odds: [20, 35, 27, 14, 4], ticks: 3 },
  { n: '神匠工坊', cost: 40000, odds: [10, 32, 32, 19, 7], ticks: 2 },
];

const AFFIXES = [
  { k: 'atk', v: (T) => 3 * T + 2 },
  { k: 'matk', v: (T) => 3 * T + 2 },
  { k: 'hp', v: (T) => 15 * T + 5 },
  { k: 'def', v: (T) => 2 * T + 1 },
  { k: 'mdef', v: (T) => 2 * T + 1 },
  { k: 'spd', v: (T) => 2 + T / 2 },
  { k: 'crit', v: (T) => 1.5 + T / 2 },
  { k: 'critDmg', v: (T) => 5 + 3 * T },
  { k: 'pen', v: (T) => 2 + T },
  { k: 'mpen', v: (T) => 2 + T },
  { k: 'lifesteal', v: (T) => 1 + T / 2 },
];
// 史詩、傳說裝備的特殊效果：會改變戰鬥行為
const EFFECTS = [
  { k: 'chain', n: '追擊', v: [0.4, 0.7], d: (v) => `暴擊時追加 ${Math.round(v * 100)}% 傷害` },
  { k: 'counterChance', n: '反射', v: [0.15, 0.25], d: (v) => `被攻擊時 ${Math.round(v * 100)}% 機率反擊` },
  { k: 'burnStacks', n: '灼燒', v: [1, 2], d: (v) => `攻擊附加 ${v} 層燃燒` },
  { k: 'doubleChance', n: '連擊', v: [0.2, 0.35], d: (v) => `${Math.round(v * 100)}% 機率再攻擊一次` },
  { k: 'dmgReduce', n: '堅壁', v: [0.08, 0.15], d: (v) => `受到的傷害降低 ${Math.round(v * 100)}%` },
  { k: 'lifesteal', n: '飲血', v: [6, 12], stat: true, d: (v) => `吸血 +${v}%` },
];

// ---------- 材料 ----------
// 每種魔物掉自己的素材，每個頭目也有專屬素材。素材分三類，鍛造的配方（gear.js 的 cost）寫要哪幾類各幾個：
// 同一類、同一階的素材可以互相代替（例如 T2 的硬材：硬甲殼、樹精木芯、鐵甲殼都可以）。
// 魔物素材的階級看在地圖的哪一段打到的（綠風草原第一段是 T1、第二段 T2…）；頭目素材的階級就是那一段的階級。
const MAT_CATS = {
  hard: { n: '硬材', d: '甲殼、礦石、木芯、石頭' },
  hide: { n: '皮料', d: '毛皮、皮革、布' },
  spirit: { n: '靈材', d: '黏液、孢子、晶石、靈魂、火焰' },
};
const MAT_PRICE = (tier) => Math.round(3 * Math.pow(tier, 1.6));

// ---------- 戰鬥地圖 ----------
// 每張地圖分三段（STAGES），每段 10 級、掉一個階級的素材，段尾有一個頭目：打倒才能去下一段。
//   lv    第一段的最低等級（綠風草原 1：三段是 1–10、11–20、21–30）
//   tier  第一段掉的素材階級（綠風草原 1：三段是 T1、T2、T3）
//   monsters  三種魔物，mat 是牠掉的素材（id 存檔用，加了就不要改）
//   bosses    三段的頭目，依序在第一、二、三段的段尾
// 每一段要的冒險者階級：T1 新手、T2 初級、T3 中級、T4 高級、T5 資深（RANKS 的位置 = 階級 - 1）。
// 每張地圖的第一段，還要先在任何一張地圖打倒前一個等級的頭目（例如幽暗森林從 11 級開始，要先打倒一隻 Lv10 的頭目）。
const STAGES = 3, STAGE_SPAN = 10;
const AREAS = [
  {
    n: '綠風草原', tier: 1, lv: 1, sky: '#9fd6ef', ground: '#6fb257',
    monsters: [
      { n: '史萊姆', shape: 'slime', c: '#62c46a', m: { hp: 0.8, atk: 0.8 }, magic: true, mat: { id: 'goo', n: '史萊姆黏液', cat: 'spirit' } },
      { n: '草原狼', shape: 'beast', c: '#b08a5a', m: { hp: 0.9, atk: 1.0 }, mat: { id: 'wolfhide', n: '狼皮', cat: 'hide' } },
      { n: '甲殼蟲', shape: 'bug', c: '#7a9a3a', m: { hp: 1.1, atk: 0.8 }, mat: { id: 'shell', n: '硬甲殼', cat: 'hard' } },
    ],
    bosses: [
      { n: '甲蟲女王', shape: 'bug', c: '#5a8a2a', mat: { id: 'queenshell', n: '女王甲殼' } },
      { n: '草原狼王', shape: 'beast', c: '#8a6a4a', mat: { id: 'wolffang', n: '狼王之牙' } },
      { n: '史萊姆王', shape: 'slime', c: '#3fae55', magic: true, mat: { id: 'slimecore', n: '史萊姆王核心' } },
    ],
  },
  {
    n: '幽暗森林', tier: 2, lv: 11, sky: '#3d5a52', ground: '#2f5233',
    monsters: [
      { n: '影狼', shape: 'beast', c: '#4a4f6a', m: { hp: 0.9, atk: 1.1 }, mat: { id: 'shadowhide', n: '影狼皮', cat: 'hide' } },
      { n: '樹精', shape: 'golem', c: '#7a5a3a', m: { hp: 1.3, atk: 0.8 }, mat: { id: 'heartwood', n: '樹精木芯', cat: 'hard' } },
      { n: '孢子菇', shape: 'slime', c: '#5ad0c0', m: { hp: 0.8, atk: 1.0 }, magic: true, mat: { id: 'spore', n: '發光孢子', cat: 'spirit' } },
    ],
    bosses: [
      { n: '孢子菇母', shape: 'slime', c: '#3ab0a0', magic: true, mat: { id: 'sporesac', n: '孢子囊' } },
      { n: '影狼首領', shape: 'beast', c: '#3a3f5a', mat: { id: 'shadowclaw', n: '影狼首領之爪' } },
      { n: '古樹守衛', shape: 'golem', c: '#5a7a3a', mat: { id: 'treeheart', n: '古樹之心' } },
    ],
  },
  {
    n: '鐵鏽礦坑', tier: 2, lv: 11, sky: '#4a3a30', ground: '#5a4a3a',
    monsters: [
      { n: '礦坑哥布林', shape: 'humanoid', c: '#7aa04a', m: { hp: 0.9, atk: 1.1 }, mat: { id: 'goblinhide', n: '哥布林皮革', cat: 'hide' } },
      { n: '鐵甲蟲', shape: 'bug', c: '#8a8a9a', m: { hp: 1.3, atk: 0.9 }, mat: { id: 'ironshell', n: '鐵甲殼', cat: 'hard' } },
      { n: '晶石魔像', shape: 'golem', c: '#7a6ad0', m: { hp: 1.1, atk: 1.0 }, magic: true, mat: { id: 'crystal', n: '魔晶碎片', cat: 'spirit' } },
    ],
    bosses: [
      { n: '哥布林頭目', shape: 'humanoid', c: '#5a8a3a', mat: { id: 'goblinbadge', n: '頭目徽章' } },
      { n: '晶石魔像王', shape: 'golem', c: '#9a7af0', magic: true, mat: { id: 'purecrystal', n: '純淨魔晶' } },
      { n: '鏽蝕巨像', shape: 'golem', c: '#a0603a', mat: { id: 'rustcore', n: '鏽蝕核心' } },
    ],
  },
  {
    n: '亡者墓穴', tier: 3, lv: 21, sky: '#2a2638', ground: '#3a3648',
    monsters: [
      { n: '骷髏劍士', shape: 'humanoid', c: '#d8d4c4', m: { hp: 0.9, atk: 1.15 }, mat: { id: 'shroud', n: '裹屍布', cat: 'hide' } },
      { n: '墓碑魔像', shape: 'golem', c: '#6a6a7a', m: { hp: 1.35, atk: 0.9 }, mat: { id: 'gravestone', n: '墓石', cat: 'hard' } },
      { n: '怨靈', shape: 'ghost', c: '#9ab0e0', m: { hp: 0.8, atk: 1.15 }, magic: true, mat: { id: 'tear', n: '怨靈之淚', cat: 'spirit' } },
    ],
    bosses: [
      { n: '守墓人', shape: 'humanoid', c: '#7a7a6a', mat: { id: 'lantern', n: '守墓人提燈' } },
      { n: '怨靈之母', shape: 'ghost', c: '#7a90d0', magic: true, mat: { id: 'grudge', n: '怨念結晶' } },
      { n: '亡靈君主', shape: 'humanoid', c: '#8a5ab0', magic: true, mat: { id: 'crown', n: '亡靈王冠' } },
    ],
  },
  {
    n: '熔岩火山', tier: 3, lv: 21, sky: '#5a2a20', ground: '#3a2020',
    monsters: [
      { n: '火蜥蜴', shape: 'beast', c: '#e0603a', m: { hp: 1.0, atk: 1.15 }, mat: { id: 'salamander', n: '火蜥蜴皮', cat: 'hide' } },
      { n: '熔岩巨人', shape: 'golem', c: '#a04a2a', m: { hp: 1.4, atk: 0.95 }, mat: { id: 'lavarock', n: '熔岩石', cat: 'hard' } },
      { n: '炎之精靈', shape: 'ghost', c: '#f0a040', m: { hp: 0.85, atk: 1.2 }, magic: true, mat: { id: 'flame', n: '火焰精華', cat: 'spirit' } },
    ],
    bosses: [
      { n: '熔岩巨人王', shape: 'golem', c: '#c0502a', mat: { id: 'lavaheart', n: '熔岩之心' } },
      { n: '火焰精靈王', shape: 'ghost', c: '#ffb040', magic: true, mat: { id: 'ember', n: '不滅火種' } },
      { n: '炎龍', shape: 'beast', c: '#c03020', magic: true, mat: { id: 'dragonscale', n: '炎龍鱗' } },
    ],
  },
];
// 地圖第 b 段（0 起算）的等級範圍、素材階級、頭目
function stageOf(ai, b) {
  const a = AREAS[ai];
  const lo = a.lv + b * STAGE_SPAN, hi = lo + STAGE_SPAN - 1;
  return { area: ai, b, lo, hi, tier: a.tier + b, boss: a.bosses[b], bossLv: hi, rank: a.tier + b - 1 };
}
// 所有素材：id → { n, cat（頭目素材是 'boss'）, tiers（掉得到的階級）, area, src（哪一隻魔物或頭目） }
const MATS = {};
AREAS.forEach((a, ai) => {
  const tiers = Array.from({ length: STAGES }, (_, b) => a.tier + b);
  a.monsters.forEach((m) => { MATS[m.mat.id] = { ...m.mat, tiers, area: ai, src: m.n }; });
  a.bosses.forEach((bo, b) => { MATS[bo.mat.id] = { ...bo.mat, cat: 'boss', tiers: [a.tier + b], area: ai, src: bo.n }; });
});
// 頭目：等級是那一段的最高等級，數值是同等級魔物的倍數；要在 maxActions 回合內打倒。
// 大約要穿那一階的稀有裝備，或比頭目高幾級才打得過
const BOSS = { hp: 4.5, atk: 1.35, crit: 6, maxActions: 40 };
// 鍛造時加入一個同階的頭目素材：稀有度抽兩次取好的
const BOOST_ROLLS = 2;

const LOCATIONS = [
  { k: 'training', n: '鍛鍊室', d: '掛機提升基本屬性，各項訓練有上限' },
  { k: 'battle', n: '戰鬥地圖', d: '掛機打魔物，獲得經驗、金幣與素材；打倒頭目就能刷更高等級的魔物' },
  { k: 'forge', n: '鍛造室', d: '掛機把材料鍛造成裝備' },
  { k: 'market', n: '市集', d: '掛機販賣多餘材料，累積市集聲望' },
];

// 鍛鍊室設備：每次結算加多少、每級上限、解鎖費用
const DEVICES = [
  { k: 'dummy', n: '木人樁', stat: 'atk', gain: 1, cap: 15, unlock: 0 },
  { k: 'crystal', n: '魔力水晶', stat: 'matk', gain: 1, cap: 15, unlock: 200 },
  { k: 'field', n: '體能訓練場', stat: 'hp', gain: 5, cap: 80, unlock: 150 },
  { k: 'rack', n: '鐵甲架', stat: 'def', gain: 1, cap: 12, unlock: 300 },
  { k: 'ward', n: '結界符陣', stat: 'mdef', gain: 1, cap: 12, unlock: 300 },
  { k: 'track', n: '疾風跑道', stat: 'spd', gain: 0.5, cap: 8, unlock: 600 },
];
const DEVICE_MAX_LV = 5;
const deviceUpgradeCost = (lv) => Math.round(250 * Math.pow(3, lv - 1));

// 冒險者階級：看冒險者聲望（完成公會的每日委託會增加），決定能刷到哪一階（stageOf 的 rank）。
const RANKS = [
  { n: '新手', rep: 0 },
  { n: '初級冒險者', rep: 120 },
  { n: '中級冒險者', rep: 400 },
  { n: '高級冒險者', rep: 1000 },
  { n: '資深冒險者', rep: 2500 },
  { n: '傳奇冒險者', rep: 6000 },
];
// 公會的每日委託：每天幾個、要擊敗幾隻／交付幾個（隨機挑一個）、多常出在目前最高的地圖，
// 以及完成的獎勵（依委託那一段的素材階級 T1–T5）
const GUILD = {
  quests: 3,
  killNeed: [25, 30, 35, 40],
  deliverNeed: [12, 16, 20, 24],
  topChance: 0.7,
  rep: [0, 40, 60, 90, 130, 180],
  gold: [0, 80, 200, 400, 700, 1100],
};

// 神之試煉的祝福：四個等級
const BLESS_TIERS = [
  { n: '一般祝福', color: '#9aa3ad' },
  { n: '稀世祝福', color: '#3f86dd' },
  { n: '史詩祝福', color: '#a35ddc' },
  { n: '神之祝福', color: '#e8b52a' },
];
const BLESSINGS = [
  { id: 'might', t: 0, n: '力量', d: '物理與魔法攻擊 +12%', pct: { atk: 12, matk: 12 } },
  { id: 'vigor', t: 0, n: '堅韌', d: '生命 +15%', pct: { hp: 15 } },
  { id: 'swift', t: 0, n: '迅捷', d: '速度 +10', flat: { spd: 10 } },
  { id: 'aim', t: 0, n: '精準', d: '暴擊率 +6%', flat: { crit: 6 } },
  { id: 'bulwark', t: 0, n: '鐵壁', d: '物理與魔法防禦 +15%', pct: { def: 15, mdef: 15 } },
  { id: 'thirst', t: 1, n: '嗜血', d: '吸血 +8%', flat: { lifesteal: 8 } },
  { id: 'sunder', t: 1, n: '破甲', d: '物理穿透 +20%', flat: { pen: 20 } },
  { id: 'insight', t: 1, n: '洞悉', d: '魔法穿透 +20%', flat: { mpen: 20 } },
  { id: 'lethal', t: 1, n: '致命', d: '暴擊傷害 +40%', flat: { critDmg: 40 } },
  { id: 'instinct', t: 1, n: '連擊本能', d: '15% 機率再攻擊一次', eff: { doubleChance: 0.15 } },
  { id: 'chainbolt', t: 2, n: '連鎖閃電', d: '暴擊時追加 60% 傷害', eff: { chain: 0.6 } },
  { id: 'thorns', t: 2, n: '荊棘', d: '被攻擊時反擊機率 +30%', eff: { counterChance: 0.3 } },
  { id: 'hellfire', t: 2, n: '業火', d: '攻擊附加 1 層燃燒，燃燒上限 +3', eff: { burnStacks: 1, burnMax: 3 } },
  { id: 'frenzy', t: 2, n: '狂熱', d: '每次行動傷害 +4%，可疊加', eff: { ramp: 0.04 } },
  { id: 'hawk', t: 2, n: '鷹眼', d: '暴擊率 +15%、暴擊傷害 +20%', flat: { crit: 15, critDmg: 20 } },
  { id: 'twin', t: 3, n: '雙重打擊', d: '50% 機率再攻擊一次', eff: { doubleChance: 0.5 } },
  { id: 'undying', t: 3, n: '不朽', d: '受到致命傷時保留 1 點生命並回復 30%，每場一次', eff: { undying: 1 } },
  { id: 'judgement', t: 3, n: '神罰之火', d: '燃燒可以暴擊，燃燒傷害 +10%', eff: { critBurn: 1, burnPct: 0.1 } },
  { id: 'haste', t: 3, n: '時間加速', d: '速度 +40%', pct: { spd: 40 } },
  { id: 'storm', t: 3, n: '連鎖風暴', d: '連鎖可以連續觸發，追加傷害 +30%', eff: { chainRepeat: 1, chain: 0.3 } },
];
const BLESS_EVERY = 3; // 每過 3 關選一次祝福

export const data = {
  TICK_MS, OFFLINE_CAP_MS, AFFIX_CAP, BAG_CAP,
  STATS, STAT_NAME, STAT_PCT, FORMS, MECHS, SETS, SLOTS, TYPE_NAME, ITEM_TYPES, GEAR, GEAR_BY_ID,
  RARITY, FORGE, AFFIXES, EFFECTS, MAT_CATS, MATS, MAT_PRICE, BOOST_ROLLS, BOSS, AREAS, STAGES, STAGE_SPAN, stageOf, LOCATIONS,
  DEVICES, DEVICE_MAX_LV, deviceUpgradeCost, RANKS, GUILD, BLESS_TIERS, BLESSINGS, BLESS_EVERY,
};
