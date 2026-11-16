// 裝備樣式表：每一款裝備一筆。要加新裝備，就在這裡加一列。
//
//   id    存檔用的代號，加了就不要改（舊存檔靠它找到這一款）
//   type  部位：weapon、head、body、feet、acc
//   n     名稱（前面會自動加上材料階級，例如「森林長劍」）
//   look  外觀：用哪一種畫法。很多款可以共用同一種外觀；要新的外觀，得在畫圖的程式加一種畫法（README 有寫在哪裡）
//   form  武器才有：攻擊方式，也決定職業（data.js 的 FORMS）
//   base  基本數值，T 是材料階級。可以是陣列：鍛造時隨機挑一種（飾品用）
//   w     出現的權重，預設 1；稀有的款式可以設小一點
//   tier  只在這個材料階級出現（鍛造、掉落都一樣）；名稱前面不再加材料階級，例如「炎龍大劍」
//   set   屬於哪一套（data.js 的 SETS）：同一套穿越多件，套裝效果越多

// 飾品的基本數值：隨機一種，飾品主要靠詞條
const ACC_BASES = [
  (T) => ({ crit: 2 + T }),
  (T) => ({ critDmg: 8 + 4 * T }),
  (T) => ({ pen: 3 + T }),
  (T) => ({ mpen: 3 + T }),
  (T) => ({ spd: 2 + T }),
  (T) => ({ hp: 18 * T }),
];

export const GEAR = [
  // ---------- 武器 ----------
  { id: 'longsword', type: 'weapon', n: '長劍', form: 'sword', look: 'sword', base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'saber', type: 'weapon', n: '彎刀', form: 'sword', look: 'sword', base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'twinblade', type: 'weapon', n: '雙刃', form: 'sword', look: 'sword', base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'huntbow', type: 'weapon', n: '獵弓', form: 'bow', look: 'bow', base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'longbow', type: 'weapon', n: '長弓', form: 'bow', look: 'bow', base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'warhammer', type: 'weapon', n: '戰錘', form: 'hammer', look: 'hammer', base: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }) },
  { id: 'greataxe', type: 'weapon', n: '重斧', form: 'hammer', look: 'hammer', base: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }) },
  { id: 'mace', type: 'weapon', n: '鎚矛', form: 'hammer', look: 'hammer', base: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }) },
  { id: 'staff', type: 'weapon', n: '法杖', form: 'staff', look: 'staff', base: (T) => ({ matk: 9 * T + 3, mpen: 2 }) },
  { id: 'grimoire', type: 'weapon', n: '魔典', form: 'staff', look: 'staff', base: (T) => ({ matk: 9 * T + 3, mpen: 2 }) },
  { id: 'crystalstaff', type: 'weapon', n: '水晶杖', form: 'staff', look: 'staff', base: (T) => ({ matk: 9 * T + 3, mpen: 2 }) },

  // 炎龍套裝的武器：雙手大劍，自己一套連招（rig.js 的 COMBOS.greatsword）
  { id: 'dragonblade', type: 'weapon', n: '炎龍大劍', form: 'greatsword', look: 'dragonblade', set: 'dragon', tier: 5, base: (T) => ({ atk: 11 * T + 6, crit: 4, critDmg: 10 }) },

  // ---------- 頭飾 ----------
  { id: 'bandana', type: 'head', n: '頭巾', look: 'cap', base: (T) => ({ hp: 22 * T, mdef: 3 * T, crit: 1 }) },
  { id: 'lighthelm', type: 'head', n: '輕盔', look: 'cap', base: (T) => ({ hp: 22 * T, mdef: 3 * T, crit: 1 }) },
  { id: 'ironhelm', type: 'head', n: '鐵盔', look: 'helm', base: (T) => ({ hp: 22 * T, mdef: 3 * T, def: 2 * T }) },
  { id: 'visorhelm', type: 'head', n: '護面盔', look: 'helm', base: (T) => ({ hp: 22 * T, mdef: 3 * T, def: 2 * T }) },
  { id: 'pointyhat', type: 'head', n: '尖帽', look: 'wizard', base: (T) => ({ hp: 22 * T, mdef: 3 * T, matk: 2 * T }) },
  { id: 'hood', type: 'head', n: '兜帽', look: 'wizard', base: (T) => ({ hp: 22 * T, mdef: 3 * T, matk: 2 * T }) },

  { id: 'dragonhelm', type: 'head', n: '炎龍角盔', look: 'dragonhelm', set: 'dragon', tier: 5, base: (T) => ({ hp: 28 * T, mdef: 3 * T, def: 2 * T, crit: 2 }) },

  // ---------- 上衣 ----------
  { id: 'leatherarmor', type: 'body', n: '皮甲', look: 'leather', base: (T) => ({ hp: 35 * T, def: 4 * T, atk: 2 * T }) },
  { id: 'battlegarb', type: 'body', n: '戰衣', look: 'leather', base: (T) => ({ hp: 35 * T, def: 4 * T, atk: 2 * T }) },
  { id: 'platearmor', type: 'body', n: '板甲', look: 'plate', base: (T) => ({ hp: 50 * T, def: 4 * T }) },
  { id: 'chainmail', type: 'body', n: '鎖子甲', look: 'plate', base: (T) => ({ hp: 50 * T, def: 4 * T }) },
  { id: 'magerobe', type: 'body', n: '法袍', look: 'robe', base: (T) => ({ hp: 35 * T, def: 4 * T, mdef: 3 * T }) },
  { id: 'longrobe', type: 'body', n: '長袍', look: 'robe', base: (T) => ({ hp: 35 * T, def: 4 * T, mdef: 3 * T }) },

  { id: 'dragonmail', type: 'body', n: '炎龍鱗甲', look: 'dragonmail', set: 'dragon', tier: 5, base: (T) => ({ hp: 50 * T, def: 5 * T, atk: 2 * T }) },

  // ---------- 鞋子 ----------
  { id: 'swiftboots', type: 'feet', n: '疾行靴', look: 'boots', base: (T) => ({ spd: 6 + T, def: 2 * T }) },
  { id: 'shortboots', type: 'feet', n: '短靴', look: 'boots', base: (T) => ({ spd: 6 + T, def: 2 * T }) },
  { id: 'ironboots', type: 'feet', n: '鐵靴', look: 'greaves', base: (T) => ({ spd: 3 + T, def: 2 * T, mdef: 2 * T }) },
  { id: 'heavyboots', type: 'feet', n: '重靴', look: 'greaves', base: (T) => ({ spd: 3 + T, def: 2 * T, mdef: 2 * T }) },
  { id: 'clothshoes', type: 'feet', n: '布鞋', look: 'shoes', base: (T) => ({ spd: 3 + T, def: 2 * T, matk: T }) },
  { id: 'starshoes', type: 'feet', n: '星紋鞋', look: 'shoes', base: (T) => ({ spd: 3 + T, def: 2 * T, matk: T }) },

  { id: 'dragonclaw', type: 'feet', n: '炎龍爪靴', look: 'dragonclaw', set: 'dragon', tier: 5, base: (T) => ({ spd: 7 + T, def: 2 * T, mdef: 2 * T }) },

  // ---------- 飾品 ----------
  { id: 'ring', type: 'acc', n: '戒指', look: 'ring', base: ACC_BASES },
  { id: 'necklace', type: 'acc', n: '項鍊', look: 'necklace', base: ACC_BASES },
  { id: 'bracelet', type: 'acc', n: '手鍊', look: 'bracelet', base: ACC_BASES },
  { id: 'earring', type: 'acc', n: '耳飾', look: 'earring', base: ACC_BASES },
  { id: 'amulet', type: 'acc', n: '護符', look: 'amulet', base: ACC_BASES },
];
