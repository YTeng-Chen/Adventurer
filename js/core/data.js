// 遊戲資料表：數值、職業、稀有度、地圖、材料、祝福、設備。
// 平衡用的數字都集中在這裡，調整時不用改邏輯。
(function (A) {
  const TICK_MS = 5000;                 // 掛機每 5 秒結算一次
  const OFFLINE_CAP_MS = 12 * 3600e3;   // 離線最多結算 12 小時
  const AFFIX_CAP = 3;                  // 每件裝備詞條上限
  const BAG_CAP = 60;

  // 混搭職業的機制強度。混搭要比專精更強還是只求靈活「待決定」，先用 0.6 當暫定值。
  const HYBRID_FACTOR = 0.6;
  const PARTIAL_FACTOR = 0.5;   // 只有 2 件同流派、其餘雜湊時
  const FULLSET_FACTOR = 1.25;  // 4 件同流派

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

  // 流派標籤 = 職業。裝備的流派由鍛造時用的材料決定。
  const TAGS = {
    blade: { n: '劍士', mech: '連鎖', d: '暴擊時追加一次傷害', color: '#e0564a' },
    guard: { n: '守衛', mech: '反擊', d: '受到傷害降低，被攻擊時機率反擊', color: '#4a8fe0' },
    arcane: { n: '術士', mech: '燃燒', d: '攻擊附加燃燒，每回合造成魔法傷害', color: '#a565e0' },
  };
  const TAG_KEYS = Object.keys(TAGS);
  const HYBRID_NAMES = {
    'blade+guard': '劍盾騎士',
    'arcane+blade': '魔劍士',
    'arcane+guard': '聖殿守護者',
  };

  const SLOTS = [
    { k: 'weapon', n: '武器', type: 'weapon' },
    { k: 'head', n: '頭飾', type: 'head' },
    { k: 'body', n: '上衣', type: 'body' },
    { k: 'feet', n: '鞋子', type: 'feet' },
    { k: 'acc1', n: '飾品一', type: 'acc' },
    { k: 'acc2', n: '飾品二', type: 'acc' },
  ];
  const CLASS_SLOTS = ['weapon', 'head', 'body', 'feet']; // 飾品不影響職業
  const TYPE_NAME = { weapon: '武器', head: '頭飾', body: '上衣', feet: '鞋子', acc: '飾品' };

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

  // 各部位的基本數值（T = 材料階級）
  const BASE = {
    weapon: {
      blade: (T) => ({ atk: 9 * T + 3, crit: 2 }),
      guard: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }),
      arcane: (T) => ({ matk: 9 * T + 3, mpen: 2 }),
    },
    head: {
      _: (T) => ({ hp: 22 * T, mdef: 3 * T }),
      blade: (T) => ({ crit: 1 }),
      guard: (T) => ({ def: 2 * T }),
      arcane: (T) => ({ matk: 2 * T }),
    },
    body: {
      _: (T) => ({ hp: 35 * T, def: 4 * T }),
      blade: (T) => ({ atk: 2 * T }),
      guard: (T) => ({ hp: 15 * T }),
      arcane: (T) => ({ mdef: 3 * T }),
    },
    feet: {
      _: (T) => ({ spd: 3 + T, def: 2 * T }),
      blade: () => ({ spd: 3 }),
      guard: (T) => ({ mdef: 2 * T }),
      arcane: (T) => ({ matk: T }),
    },
    acc: [ // 飾品是詞條專用，基本數值隨機一種
      (T) => ({ crit: 2 + T }),
      (T) => ({ critDmg: 8 + 4 * T }),
      (T) => ({ pen: 3 + T }),
      (T) => ({ mpen: 3 + T }),
      (T) => ({ spd: 2 + T }),
      (T) => ({ hp: 18 * T }),
    ],
  };
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

  // 材料：階級 × 流派。鍛造時用哪種材料，就決定裝備的流派。
  const MATS = {
    1: { blade: '狼牙', guard: '甲殼', arcane: '凝膠' },
    2: { blade: '影爪', guard: '樹皮甲', arcane: '螢光孢子' },
    3: { blade: '鏽刃碎片', guard: '鐵礦石', arcane: '魔晶礦' },
    4: { blade: '骨刃', guard: '墓碑石', arcane: '怨靈精華' },
    5: { blade: '火龍牙', guard: '熔岩核心', arcane: '炎之魂' },
  };
  const MAT_PRICE = (tier) => Math.round(3 * Math.pow(tier, 1.6));

  const AREAS = [
    {
      n: '綠風草原', tier: 1, lv: 1, sky: '#9fd6ef', ground: '#6fb257',
      monsters: [
        { n: '史萊姆', shape: 'slime', c: '#62c46a', tag: 'arcane', m: { hp: 0.8, atk: 0.8 }, magic: true },
        { n: '草原狼', shape: 'beast', c: '#b08a5a', tag: 'blade', m: { hp: 0.9, atk: 1.0 } },
        { n: '甲殼蟲', shape: 'bug', c: '#7a9a3a', tag: 'guard', m: { hp: 1.1, atk: 0.8 } },
      ],
      boss: { n: '史萊姆王', shape: 'slime', c: '#3fae55', magic: true },
    },
    {
      n: '幽暗森林', tier: 2, lv: 6, sky: '#3d5a52', ground: '#2f5233',
      monsters: [
        { n: '影狼', shape: 'beast', c: '#4a4f6a', tag: 'blade', m: { hp: 0.9, atk: 1.1 } },
        { n: '樹精', shape: 'golem', c: '#7a5a3a', tag: 'guard', m: { hp: 1.3, atk: 0.8 } },
        { n: '孢子菇', shape: 'slime', c: '#5ad0c0', tag: 'arcane', m: { hp: 0.8, atk: 1.0 }, magic: true },
      ],
      boss: { n: '古樹守衛', shape: 'golem', c: '#5a7a3a' },
    },
    {
      n: '鐵鏽礦坑', tier: 3, lv: 12, sky: '#4a3a30', ground: '#5a4a3a',
      monsters: [
        { n: '礦坑哥布林', shape: 'humanoid', c: '#7aa04a', tag: 'blade', m: { hp: 0.9, atk: 1.1 } },
        { n: '鐵甲蟲', shape: 'bug', c: '#8a8a9a', tag: 'guard', m: { hp: 1.3, atk: 0.9 } },
        { n: '晶石魔像', shape: 'golem', c: '#7a6ad0', tag: 'arcane', m: { hp: 1.1, atk: 1.0 }, magic: true },
      ],
      boss: { n: '鏽蝕巨像', shape: 'golem', c: '#a0603a' },
    },
    {
      n: '亡者墓穴', tier: 4, lv: 19, sky: '#2a2638', ground: '#3a3648',
      monsters: [
        { n: '骷髏劍士', shape: 'humanoid', c: '#d8d4c4', tag: 'blade', m: { hp: 0.9, atk: 1.15 } },
        { n: '墓碑魔像', shape: 'golem', c: '#6a6a7a', tag: 'guard', m: { hp: 1.35, atk: 0.9 } },
        { n: '怨靈', shape: 'ghost', c: '#9ab0e0', tag: 'arcane', m: { hp: 0.8, atk: 1.15 }, magic: true },
      ],
      boss: { n: '亡靈君主', shape: 'humanoid', c: '#8a5ab0', magic: true },
    },
    {
      n: '熔岩火山', tier: 5, lv: 27, sky: '#5a2a20', ground: '#3a2020',
      monsters: [
        { n: '火蜥蜴', shape: 'beast', c: '#e0603a', tag: 'blade', m: { hp: 1.0, atk: 1.15 } },
        { n: '熔岩巨人', shape: 'golem', c: '#a04a2a', tag: 'guard', m: { hp: 1.4, atk: 0.95 } },
        { n: '炎之精靈', shape: 'ghost', c: '#f0a040', tag: 'arcane', m: { hp: 0.85, atk: 1.2 }, magic: true },
      ],
      boss: { n: '炎龍', shape: 'beast', c: '#c03020', magic: true },
    },
  ];

  const LOCATIONS = [
    { k: 'training', n: '鍛鍊室', d: '掛機提升基本屬性，各項訓練有上限' },
    { k: 'battle', n: '戰鬥地圖', d: '掛機打魔物，獲得經驗、金幣與材料' },
    { k: 'forge', n: '鍛造室', d: '掛機把材料鍛造成裝備' },
    { k: 'market', n: '市集', d: '掛機販賣多餘材料，累積市集聲望' },
    { k: 'guild', n: '公會', d: '掛機接雜事委託賺金幣，累積冒險者聲望' },
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

  const GUILD_RANKS = [
    { n: 'F', rep: 0, gold: 3 },
    { n: 'E', rep: 120, gold: 6 },
    { n: 'D', rep: 400, gold: 10 },
    { n: 'C', rep: 1000, gold: 16 },
    { n: 'B', rep: 2500, gold: 26 },
    { n: 'A', rep: 6000, gold: 40 },
  ];

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

  A.data = {
    TICK_MS, OFFLINE_CAP_MS, AFFIX_CAP, BAG_CAP, HYBRID_FACTOR, PARTIAL_FACTOR, FULLSET_FACTOR,
    STATS, STAT_NAME, STAT_PCT, TAGS, TAG_KEYS, HYBRID_NAMES, SLOTS, CLASS_SLOTS, TYPE_NAME,
    RARITY, FORGE, CRAFT_COST, BASE, AFFIXES, EFFECTS, MATS, MAT_PRICE, AREAS, LOCATIONS,
    DEVICES, DEVICE_MAX_LV, deviceUpgradeCost, GUILD_RANKS, BLESS_TIERS, BLESSINGS, BLESS_EVERY,
  };
})(globalThis.ADV = globalThis.ADV || {});
