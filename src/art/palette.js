// 材質色票：材料階級決定材質（青銅、苔皮、鋼、冥骨、龍鱗），稀有度決定滾邊與寶石。
import { ramp } from './pixel.js';
import { data as D } from '../core/data.js';

const cache = new Map();
const R = (hex) => { if (!cache.has(hex)) cache.set(hex, ramp(hex)); return cache.get(hex); };
const m = (hex, opts = {}) => ({ ramp: R(hex), ...opts });

// 角色本身
export const BODY = {
  skin: m('#f0bf96'),
  hair: m('#7a4a26'),
  eye: m('#2a2238', { flat: true }),
  iris: m('#3f6aa8', { flat: true }),
  white: m('#fbf6ec', { flat: true, noOutline: true }),
  blush: m('#ec8f86', { flat: true, noOutline: true }),
  lip: m('#b8625a', { flat: true, noOutline: true }),
  tunic: m('#8f8068'),
  pants: m('#4b4c60'),
  shoe: m('#5c3c2a'),
  belt: m('#5a3a24'),
  buckle: m('#d9b45a'),
};

// 階級 1–5 的材質
const TIER = {
  1: { metal: '#b97c42', leather: '#93613a', cloth: '#c9b48c', wood: '#8d5c2e', name: '新手' },
  2: { metal: '#7f9a68', leather: '#62723f', cloth: '#4f7f55', wood: '#6b4a2a', name: '森林' },
  3: { metal: '#a3afbf', leather: '#6f5444', cloth: '#56688f', wood: '#5b4232', name: '礦鐵' },
  4: { metal: '#6c6680', leather: '#4d3d50', cloth: '#3d3358', wood: '#d8d0b6', name: '冥骨' },
  5: { metal: '#c0473a', leather: '#7a2a24', cloth: '#8c2c34', wood: '#2f2834', name: '炎龍' },
};

// 稀有度的滾邊色：普通沒有滾邊、精良綠、稀有藍、史詩紫、傳說金
const TRIM = [null, '#5cbf6a', '#4b8fe6', '#a866e0', '#efb935'];
const GEM = [null, '#6fd47a', '#5aa8ff', '#c47cff', '#ff8a3c'];

export function gearMats(item) {
  const t = TIER[item.tier] || TIER[1];
  const r = item.rarity;
  const tagColor = item.tag ? D.TAGS[item.tag].color : GEM[Math.max(1, r)];
  return {
    ...BODY,
    metal: m(t.metal),
    leather: m(t.leather),
    cloth: m(t.cloth),
    wood: m(t.wood),
    lining: m('#3a2b3a'),
    trim: m(TRIM[r] || t.metal),
    gold: m('#e3b23c'),
    gem: m(GEM[r] || '#9aa3ad', { flat: false }),
    glow: m(r >= 3 ? TRIM[r] : tagColor),
    orb: m(tagColor),
    cape: m(r >= 4 ? '#c8402e' : TRIM[r] || t.cloth),
  };
}

export const TIER_NAME = Object.fromEntries(Object.entries(TIER).map(([k, v]) => [k, v.name]));
