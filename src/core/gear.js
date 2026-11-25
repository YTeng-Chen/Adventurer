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
//   cost  鍛造配方：每一類素材要幾個（hard 硬材、hide 皮料、spirit 靈材，見 data.js 的 MAT_CATS），
//         全部用同一階的素材，用哪一階就做出哪一階的裝備。也可以寫頭目素材的 id，例如 dragonscale: 2（炎龍鱗）

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
  { id: 'longsword', type: 'weapon', n: '長劍', form: 'sword', look: 'sword', cost: { hard: 3, hide: 1 }, base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'saber', type: 'weapon', n: '彎刀', form: 'sword', look: 'sword', cost: { hard: 2, hide: 2 }, base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'twinblade', type: 'weapon', n: '雙刃', form: 'sword', look: 'sword', cost: { hard: 3, spirit: 1 }, base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'huntbow', type: 'weapon', n: '獵弓', form: 'bow', look: 'bow', cost: { hide: 3, hard: 1 }, base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'longbow', type: 'weapon', n: '長弓', form: 'bow', look: 'bow', cost: { hide: 2, hard: 1, spirit: 1 }, base: (T) => ({ atk: 9 * T + 3, crit: 2 }) },
  { id: 'warhammer', type: 'weapon', n: '戰錘', form: 'hammer', look: 'hammer', cost: { hard: 4 }, base: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }) },
  { id: 'greataxe', type: 'weapon', n: '重斧', form: 'hammer', look: 'hammer', cost: { hard: 3, hide: 1 }, base: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }) },
  { id: 'mace', type: 'weapon', n: '鎚矛', form: 'hammer', look: 'hammer', cost: { hard: 2, spirit: 2 }, base: (T) => ({ atk: 6 * T + 3, def: 3 * T + 1 }) },
  { id: 'staff', type: 'weapon', n: '法杖', form: 'staff', look: 'staff', cost: { spirit: 3, hard: 1 }, base: (T) => ({ matk: 9 * T + 3, mpen: 2 }) },
  { id: 'grimoire', type: 'weapon', n: '魔典', form: 'staff', look: 'staff', cost: { spirit: 2, hide: 2 }, base: (T) => ({ matk: 9 * T + 3, mpen: 2 }) },
  { id: 'crystalstaff', type: 'weapon', n: '水晶杖', form: 'staff', look: 'staff', cost: { spirit: 4 }, base: (T) => ({ matk: 9 * T + 3, mpen: 2 }) },

  // 炎龍套裝的武器：雙手大劍，自己一套連招（rig.js 的 COMBOS.greatsword）
  { id: 'dragonblade', type: 'weapon', n: '炎龍大劍', form: 'greatsword', look: 'dragonblade', set: 'dragon', tier: 5, cost: { hard: 3, hide: 1, dragonscale: 2 }, base: (T) => ({ atk: 11 * T + 6, crit: 4, critDmg: 10 }) },

  // ---------- 頭飾 ----------
  { id: 'bandana', type: 'head', n: '頭巾', look: 'cap', cost: { hide: 4 }, base: (T) => ({ hp: 22 * T, mdef: 3 * T, crit: 1 }) },
  { id: 'lighthelm', type: 'head', n: '輕盔', look: 'cap', cost: { hide: 2, hard: 2 }, base: (T) => ({ hp: 22 * T, mdef: 3 * T, crit: 1 }) },
  { id: 'ironhelm', type: 'head', n: '鐵盔', look: 'helm', cost: { hard: 3, hide: 1 }, base: (T) => ({ hp: 22 * T, mdef: 3 * T, def: 2 * T }) },
  { id: 'visorhelm', type: 'head', n: '護面盔', look: 'helm', cost: { hard: 3, spirit: 1 }, base: (T) => ({ hp: 22 * T, mdef: 3 * T, def: 2 * T }) },
  { id: 'pointyhat', type: 'head', n: '尖帽', look: 'wizard', cost: { spirit: 2, hide: 2 }, base: (T) => ({ hp: 22 * T, mdef: 3 * T, matk: 2 * T }) },
  { id: 'hood', type: 'head', n: '兜帽', look: 'wizard', cost: { hide: 3, spirit: 1 }, base: (T) => ({ hp: 22 * T, mdef: 3 * T, matk: 2 * T }) },

  { id: 'dragonhelm', type: 'head', n: '炎龍角盔', look: 'dragonhelm', set: 'dragon', tier: 5, cost: { hard: 2, spirit: 2, dragonscale: 1 }, base: (T) => ({ hp: 28 * T, mdef: 3 * T, def: 2 * T, crit: 2 }) },

  // ---------- 上衣 ----------
  { id: 'leatherarmor', type: 'body', n: '皮甲', look: 'leather', cost: { hide: 4 }, base: (T) => ({ hp: 35 * T, def: 4 * T, atk: 2 * T }) },
  { id: 'battlegarb', type: 'body', n: '戰衣', look: 'leather', cost: { hide: 3, hard: 1 }, base: (T) => ({ hp: 35 * T, def: 4 * T, atk: 2 * T }) },
  { id: 'platearmor', type: 'body', n: '板甲', look: 'plate', cost: { hard: 4 }, base: (T) => ({ hp: 50 * T, def: 4 * T }) },
  { id: 'chainmail', type: 'body', n: '鎖子甲', look: 'plate', cost: { hard: 3, hide: 1 }, base: (T) => ({ hp: 50 * T, def: 4 * T }) },
  { id: 'magerobe', type: 'body', n: '法袍', look: 'robe', cost: { spirit: 2, hide: 2 }, base: (T) => ({ hp: 35 * T, def: 4 * T, mdef: 3 * T }) },
  { id: 'longrobe', type: 'body', n: '長袍', look: 'robe', cost: { hide: 3, spirit: 1 }, base: (T) => ({ hp: 35 * T, def: 4 * T, mdef: 3 * T }) },

  { id: 'dragonmail', type: 'body', n: '炎龍鱗甲', look: 'dragonmail', set: 'dragon', tier: 5, cost: { hard: 2, hide: 2, dragonscale: 1 }, base: (T) => ({ hp: 50 * T, def: 5 * T, atk: 2 * T }) },

  // ---------- 鞋子 ----------
  { id: 'swiftboots', type: 'feet', n: '疾行靴', look: 'boots', cost: { hide: 3, spirit: 1 }, base: (T) => ({ spd: 6 + T, def: 2 * T }) },
  { id: 'shortboots', type: 'feet', n: '短靴', look: 'boots', cost: { hide: 4 }, base: (T) => ({ spd: 6 + T, def: 2 * T }) },
  { id: 'ironboots', type: 'feet', n: '鐵靴', look: 'greaves', cost: { hard: 3, hide: 1 }, base: (T) => ({ spd: 3 + T, def: 2 * T, mdef: 2 * T }) },
  { id: 'heavyboots', type: 'feet', n: '重靴', look: 'greaves', cost: { hard: 2, hide: 2 }, base: (T) => ({ spd: 3 + T, def: 2 * T, mdef: 2 * T }) },
  { id: 'clothshoes', type: 'feet', n: '布鞋', look: 'shoes', cost: { hide: 2, spirit: 2 }, base: (T) => ({ spd: 3 + T, def: 2 * T, matk: T }) },
  { id: 'starshoes', type: 'feet', n: '星紋鞋', look: 'shoes', cost: { spirit: 3, hide: 1 }, base: (T) => ({ spd: 3 + T, def: 2 * T, matk: T }) },

  { id: 'dragonclaw', type: 'feet', n: '炎龍爪靴', look: 'dragonclaw', set: 'dragon', tier: 5, cost: { hide: 2, hard: 2, dragonscale: 1 }, base: (T) => ({ spd: 7 + T, def: 2 * T, mdef: 2 * T }) },

  // ---------- 頭目套裝：每一隻頭目一套（武器、頭飾、上衣、鞋子），只在頭目那一階出現，配方要那隻頭目的素材 ----------
  // 外觀在 src/rig/sets/<套裝>.js；外觀代號是「套裝代號＋部位」。套裝效果在 data.js 的 SETS。
  // T1 甲蟲女王套裝（守衛）
  { id: 'beetlehammer', type: 'weapon', n: '女王甲殼鎚', form: 'hammer', look: 'beetleweapon', set: 'beetle', tier: 1, cost: { hard: 3, hide: 1, queenshell: 2 }, base: (T) => ({ atk: 7 * T + 4, def: 4 * T + 2 }) },
  { id: 'beetlehelm', type: 'head', n: '女王角盔', look: 'beetlehelm', set: 'beetle', tier: 1, cost: { hard: 2, hide: 2, queenshell: 1 }, base: (T) => ({ hp: 27 * T, mdef: 3 * T, def: 3 * T }) },
  { id: 'beetlemail', type: 'body', n: '女王甲殼鎧', look: 'beetlebody', set: 'beetle', tier: 1, cost: { hard: 3, hide: 1, queenshell: 1 }, base: (T) => ({ hp: 60 * T, def: 5 * T }) },
  { id: 'beetlegreaves', type: 'feet', n: '女王脛甲', look: 'beetlefeet', set: 'beetle', tier: 1, cost: { hard: 2, hide: 2, queenshell: 1 }, base: (T) => ({ spd: 4 + T, def: 3 * T, mdef: 2 * T }) },

  // T2 狼王套裝（弓手）
  { id: 'wolfbow', type: 'weapon', n: '狼牙長弓', form: 'bow', look: 'wolfweapon', set: 'wolf', tier: 2, cost: { hide: 3, hard: 1, wolffang: 2 }, base: (T) => ({ atk: 11 * T + 4, crit: 4 }) },
  { id: 'wolfhood', type: 'head', n: '狼王頭罩', look: 'wolfhelm', set: 'wolf', tier: 2, cost: { hide: 3, spirit: 1, wolffang: 1 }, base: (T) => ({ hp: 26 * T, mdef: 3 * T, crit: 2 }) },
  { id: 'wolfpelt', type: 'body', n: '狼王毛皮甲', look: 'wolfbody', set: 'wolf', tier: 2, cost: { hide: 3, hard: 1, wolffang: 1 }, base: (T) => ({ hp: 42 * T, def: 4 * T, atk: 3 * T }) },
  { id: 'wolfboots', type: 'feet', n: '狼王毛皮靴', look: 'wolffeet', set: 'wolf', tier: 2, cost: { hide: 3, spirit: 1, wolffang: 1 }, base: (T) => ({ spd: 8 + T, def: 2 * T }) },

  // T2 菇母套裝（術士）
  { id: 'sporestaff', type: 'weapon', n: '菇母法杖', form: 'staff', look: 'sporeweapon', set: 'spore', tier: 2, cost: { spirit: 3, hide: 1, sporesac: 2 }, base: (T) => ({ matk: 11 * T + 4, mpen: 3 }) },
  { id: 'sporecap', type: 'head', n: '菇母傘帽', look: 'sporehelm', set: 'spore', tier: 2, cost: { spirit: 2, hide: 2, sporesac: 1 }, base: (T) => ({ hp: 26 * T, mdef: 4 * T, matk: 3 * T }) },
  { id: 'sporerobe', type: 'body', n: '菇母孢衣', look: 'sporebody', set: 'spore', tier: 2, cost: { hide: 3, spirit: 1, sporesac: 1 }, base: (T) => ({ hp: 42 * T, def: 4 * T, mdef: 4 * T, matk: T }) },
  { id: 'sporeshoes', type: 'feet', n: '菇母軟鞋', look: 'sporefeet', set: 'spore', tier: 2, cost: { spirit: 2, hide: 2, sporesac: 1 }, base: (T) => ({ spd: 4 + T, def: 2 * T, matk: 2 * T }) },

  // T2 戰團套裝（劍士）
  { id: 'goblinblade', type: 'weapon', n: '戰團鋸刃', form: 'sword', look: 'goblinweapon', set: 'goblin', tier: 2, cost: { hard: 3, hide: 1, goblinbadge: 2 }, base: (T) => ({ atk: 11 * T + 4, crit: 3, pen: 2 }) },
  { id: 'goblinhelm', type: 'head', n: '戰團角盔', look: 'goblinhelm', set: 'goblin', tier: 2, cost: { hard: 3, hide: 1, goblinbadge: 1 }, base: (T) => ({ hp: 26 * T, mdef: 3 * T, def: 2 * T, crit: 1 }) },
  { id: 'goblinarmor', type: 'body', n: '戰團拼皮甲', look: 'goblinbody', set: 'goblin', tier: 2, cost: { hide: 2, hard: 2, goblinbadge: 1 }, base: (T) => ({ hp: 45 * T, def: 5 * T, atk: 2 * T }) },
  { id: 'goblinboots', type: 'feet', n: '戰團鐵靴', look: 'goblinfeet', set: 'goblin', tier: 2, cost: { hard: 3, hide: 1, goblinbadge: 1 }, base: (T) => ({ spd: 4 + T, def: 3 * T, mdef: 2 * T }) },

  // T3 史萊姆王套裝（守衛）
  { id: 'slimehammer', type: 'weapon', n: '凝膠王鎚', form: 'hammer', look: 'slimeweapon', set: 'slime', tier: 3, cost: { hard: 2, spirit: 2, slimecore: 2 }, base: (T) => ({ atk: 7 * T + 4, def: 4 * T + 2, hp: 6 * T }) },
  { id: 'slimecrown', type: 'head', n: '凝膠王冠', look: 'slimehelm', set: 'slime', tier: 3, cost: { spirit: 2, hard: 2, slimecore: 1 }, base: (T) => ({ hp: 30 * T, mdef: 3 * T, def: 3 * T }) },
  { id: 'slimemail', type: 'body', n: '凝膠鎧', look: 'slimebody', set: 'slime', tier: 3, cost: { hard: 2, spirit: 2, slimecore: 1 }, base: (T) => ({ hp: 62 * T, def: 5 * T }) },
  { id: 'slimeboots', type: 'feet', n: '凝膠靴', look: 'slimefeet', set: 'slime', tier: 3, cost: { hide: 2, spirit: 2, slimecore: 1 }, base: (T) => ({ spd: 4 + T, def: 3 * T, mdef: 2 * T, hp: 8 * T }) },

  // T3 影狼套裝（劍士）
  { id: 'shadowblade', type: 'weapon', n: '影爪刃', form: 'sword', look: 'shadowweapon', set: 'shadow', tier: 3, cost: { hard: 3, hide: 1, shadowclaw: 2 }, base: (T) => ({ atk: 11 * T + 5, crit: 4, pen: 2 }) },
  { id: 'shadowhood', type: 'head', n: '影狼兜帽', look: 'shadowhelm', set: 'shadow', tier: 3, cost: { hide: 3, spirit: 1, shadowclaw: 1 }, base: (T) => ({ hp: 26 * T, mdef: 3 * T, crit: 3 }) },
  { id: 'shadowgarb', type: 'body', n: '影狼夜行衣', look: 'shadowbody', set: 'shadow', tier: 3, cost: { hide: 3, hard: 1, shadowclaw: 1 }, base: (T) => ({ hp: 42 * T, def: 4 * T, atk: 3 * T, crit: 2 }) },
  { id: 'shadowboots', type: 'feet', n: '影狼靴', look: 'shadowfeet', set: 'shadow', tier: 3, cost: { hide: 3, spirit: 1, shadowclaw: 1 }, base: (T) => ({ spd: 9 + T, def: 2 * T }) },

  // T3 魔晶套裝（術士）
  { id: 'crystalrod', type: 'weapon', n: '魔晶法杖', form: 'staff', look: 'crystalweapon', set: 'crystal', tier: 3, cost: { spirit: 3, hard: 1, purecrystal: 2 }, base: (T) => ({ matk: 11 * T + 5, mpen: 4 }) },
  { id: 'crystalcrown', type: 'head', n: '魔晶冠', look: 'crystalhelm', set: 'crystal', tier: 3, cost: { spirit: 3, hard: 1, purecrystal: 1 }, base: (T) => ({ hp: 24 * T, mdef: 4 * T, matk: 4 * T }) },
  { id: 'crystalrobe', type: 'body', n: '魔晶法袍', look: 'crystalbody', set: 'crystal', tier: 3, cost: { spirit: 2, hide: 2, purecrystal: 1 }, base: (T) => ({ hp: 42 * T, def: 4 * T, mdef: 5 * T, matk: T }) },
  { id: 'crystalshoes', type: 'feet', n: '魔晶鞋', look: 'crystalfeet', set: 'crystal', tier: 3, cost: { spirit: 2, hide: 2, purecrystal: 1 }, base: (T) => ({ spd: 4 + T, def: 2 * T, mdef: T, matk: 2 * T }) },

  // T3 守墓人套裝（弓手）
  { id: 'gravebow', type: 'weapon', n: '提燈弓', form: 'bow', look: 'graveweapon', set: 'grave', tier: 3, cost: { hide: 2, hard: 2, lantern: 2 }, base: (T) => ({ atk: 11 * T + 5, crit: 4 }) },
  { id: 'gravehat', type: 'head', n: '守墓人寬簷帽', look: 'gravehelm', set: 'grave', tier: 3, cost: { hide: 3, spirit: 1, lantern: 1 }, base: (T) => ({ hp: 26 * T, mdef: 4 * T, crit: 2 }) },
  { id: 'gravecoat', type: 'body', n: '守墓人長大衣', look: 'gravebody', set: 'grave', tier: 3, cost: { hide: 3, hard: 1, lantern: 1 }, base: (T) => ({ hp: 46 * T, def: 4 * T, mdef: 3 * T, atk: 2 * T }) },
  { id: 'graveboots', type: 'feet', n: '守墓人皮靴', look: 'gravefeet', set: 'grave', tier: 3, cost: { hide: 3, hard: 1, lantern: 1 }, base: (T) => ({ spd: 8 + T, def: 2 * T }) },

  // T3 岩王套裝（劍士）
  { id: 'rockblade', type: 'weapon', n: '岩王巨劍', form: 'greatsword', look: 'rockweapon', set: 'rock', tier: 3, cost: { hard: 3, spirit: 1, lavaheart: 2 }, base: (T) => ({ atk: 11 * T + 6, crit: 3, def: 2 * T }) },
  { id: 'rockhelm', type: 'head', n: '岩王盔', look: 'rockhelm', set: 'rock', tier: 3, cost: { hard: 3, hide: 1, lavaheart: 1 }, base: (T) => ({ hp: 30 * T, mdef: 3 * T, def: 3 * T }) },
  { id: 'rockplate', type: 'body', n: '岩王重甲', look: 'rockbody', set: 'rock', tier: 3, cost: { hard: 3, hide: 1, lavaheart: 1 }, base: (T) => ({ hp: 60 * T, def: 6 * T }) },
  { id: 'rockboots', type: 'feet', n: '岩王戰靴', look: 'rockfeet', set: 'rock', tier: 3, cost: { hard: 3, hide: 1, lavaheart: 1 }, base: (T) => ({ spd: 4 + T, def: 3 * T, mdef: 2 * T }) },

  // ---------- 飾品 ----------
  { id: 'ring', type: 'acc', n: '戒指', look: 'ring', cost: { spirit: 3, hard: 1 }, base: ACC_BASES },
  { id: 'necklace', type: 'acc', n: '項鍊', look: 'necklace', cost: { spirit: 2, hide: 2 }, base: ACC_BASES },
  { id: 'bracelet', type: 'acc', n: '手鍊', look: 'bracelet', cost: { hard: 2, spirit: 2 }, base: ACC_BASES },
  { id: 'earring', type: 'acc', n: '耳飾', look: 'earring', cost: { spirit: 4 }, base: ACC_BASES },
  { id: 'amulet', type: 'acc', n: '護符', look: 'amulet', cost: { spirit: 3, hide: 1 }, base: ACC_BASES },
];
