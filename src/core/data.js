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
const CRAFT_COST = 4; // 每件裝備需要的材料數

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

// 材料：每個階級一種，在對應階級的地圖掉落。用哪一階的材料，就做出哪一階的裝備。
const MATS = { 1: '獸牙', 2: '古木芯', 3: '鐵礦石', 4: '冥骨', 5: '熔岩核心' };
const MAT_PRICE = (tier) => Math.round(3 * Math.pow(tier, 1.6));

const AREAS = [
  {
    n: '綠風草原', tier: 1, lv: 1, sky: '#9fd6ef', ground: '#6fb257',
    monsters: [
      { n: '史萊姆', shape: 'slime', c: '#62c46a', m: { hp: 0.8, atk: 0.8 }, magic: true },
      { n: '草原狼', shape: 'beast', c: '#b08a5a', m: { hp: 0.9, atk: 1.0 } },
      { n: '甲殼蟲', shape: 'bug', c: '#7a9a3a', m: { hp: 1.1, atk: 0.8 } },
    ],
    boss: { n: '史萊姆王', shape: 'slime', c: '#3fae55', magic: true },
  },
  {
    n: '幽暗森林', tier: 2, lv: 6, sky: '#3d5a52', ground: '#2f5233',
    monsters: [
      { n: '影狼', shape: 'beast', c: '#4a4f6a', m: { hp: 0.9, atk: 1.1 } },
      { n: '樹精', shape: 'golem', c: '#7a5a3a', m: { hp: 1.3, atk: 0.8 } },
      { n: '孢子菇', shape: 'slime', c: '#5ad0c0', m: { hp: 0.8, atk: 1.0 }, magic: true },
    ],
    boss: { n: '古樹守衛', shape: 'golem', c: '#5a7a3a' },
  },
  {
    n: '鐵鏽礦坑', tier: 3, lv: 12, sky: '#4a3a30', ground: '#5a4a3a',
    monsters: [
      { n: '礦坑哥布林', shape: 'humanoid', c: '#7aa04a', m: { hp: 0.9, atk: 1.1 } },
      { n: '鐵甲蟲', shape: 'bug', c: '#8a8a9a', m: { hp: 1.3, atk: 0.9 } },
      { n: '晶石魔像', shape: 'golem', c: '#7a6ad0', m: { hp: 1.1, atk: 1.0 }, magic: true },
    ],
    boss: { n: '鏽蝕巨像', shape: 'golem', c: '#a0603a' },
  },
  {
    n: '亡者墓穴', tier: 4, lv: 19, sky: '#2a2638', ground: '#3a3648',
    monsters: [
      { n: '骷髏劍士', shape: 'humanoid', c: '#d8d4c4', m: { hp: 0.9, atk: 1.15 } },
      { n: '墓碑魔像', shape: 'golem', c: '#6a6a7a', m: { hp: 1.35, atk: 0.9 } },
      { n: '怨靈', shape: 'ghost', c: '#9ab0e0', m: { hp: 0.8, atk: 1.15 }, magic: true },
    ],
    boss: { n: '亡靈君主', shape: 'humanoid', c: '#8a5ab0', magic: true },
  },
  {
    n: '熔岩火山', tier: 5, lv: 27, sky: '#5a2a20', ground: '#3a2020',
    monsters: [
      { n: '火蜥蜴', shape: 'beast', c: '#e0603a', m: { hp: 1.0, atk: 1.15 } },
      { n: '熔岩巨人', shape: 'golem', c: '#a04a2a', m: { hp: 1.4, atk: 0.95 } },
      { n: '炎之精靈', shape: 'ghost', c: '#f0a040', m: { hp: 0.85, atk: 1.2 }, magic: true },
    ],
    boss: { n: '炎龍', shape: 'beast', c: '#c03020', magic: true },
  },
];

const LOCATIONS = [
  { k: 'training', n: '鍛鍊室', d: '掛機提升基本屬性，各項訓練有上限' },
  { k: 'battle', n: '戰鬥地圖', d: '掛機打魔物，獲得經驗、金幣與材料' },
  { k: 'forge', n: '鍛造室', d: '掛機把材料鍛造成裝備' },
  { k: 'market', n: '市集', d: '掛機販賣多餘材料，累積市集聲望' },
  { k: 'guild', n: '公會', d: '掛機接雜事委託賺金幣，累積冒險者聲望、提升冒險者階級' },
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

// 冒險者階級：看冒險者聲望（在公會掛機、完成公會任務會增加）。
// 決定能穿哪些裝備，也決定在公會接委託的收入（gold 是每次結算的基本金幣）。
const RANKS = [
  { n: '新手', rep: 0, gold: 3 },
  { n: '初級冒險者', rep: 120, gold: 6 },
  { n: '中級冒險者', rep: 400, gold: 10 },
  { n: '高級冒險者', rep: 1000, gold: 16 },
  { n: '資深冒險者', rep: 2500, gold: 26 },
  { n: '傳奇冒險者', rep: 6000, gold: 40 },
];
// 各材料階級的裝備要幾階才能穿（RANKS 的位置）：T1 新手就能穿、T2 要初級冒險者……T5 要資深冒險者。
// 個別款式可以在 gear.js 用 rank 提高門檻。
const TIER_RANK = [0, 0, 1, 2, 3, 4];

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
  STATS, STAT_NAME, STAT_PCT, FORMS, MECHS, SLOTS, TYPE_NAME, ITEM_TYPES, GEAR, GEAR_BY_ID,
  RARITY, FORGE, CRAFT_COST, AFFIXES, EFFECTS, MATS, MAT_PRICE, AREAS, LOCATIONS,
  DEVICES, DEVICE_MAX_LV, deviceUpgradeCost, RANKS, TIER_RANK, BLESS_TIERS, BLESSINGS, BLESS_EVERY,
};
