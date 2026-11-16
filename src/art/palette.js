// 材質色票：材料階級決定材質（青銅、苔綠金屬、鋼、冥鐵、炎龍），稀有度決定滾邊與寶石。
// 顏色刻意飽和、明亮：像素圖縮小後才不會灰濛濛。
import { ramp } from './pixel.js';

const cache = new Map();
const R = (hex) => { if (!cache.has(hex)) cache.set(hex, ramp(hex)); return cache.get(hex); };
const m = (hex, opts = {}) => ({ ramp: R(hex), ...opts });

// 角色本身
export const BODY = {
  skin: m('#f6c39a'),
  hair: m('#8f4f26'),
  brow: m('#5e3018', { flat: true }),
  eye: m('#25203a', { flat: true }),
  iris: m('#2f8ae0', { flat: true }),
  white: m('#ffffff', { flat: true, noOutline: true }),
  blush: m('#ff8f86', { flat: true, noOutline: true }),
  lip: m('#c4584e', { flat: true, noOutline: true }),
  tunic: m('#4f8fd0'),
  pants: m('#3d4470'),
  shoe: m('#84502c'),
  belt: m('#6e3f20'),
  buckle: m('#f2c14e'),
  joint: m('#3a3c4c'), // 裝甲底下的深色連身衣（關節）
};

// 階級 1–5 的材質
const TIER = {
  1: { metal: '#dc8c40', leather: '#ad6a38', cloth: '#e6c98e', wood: '#a0632e', name: '新手' },
  2: { metal: '#7cb85c', leather: '#71903a', cloth: '#3fa35e', wood: '#7e512a', name: '森林' },
  3: { metal: '#aac2dc', leather: '#80583e', cloth: '#4a72cc', wood: '#6e4830', name: '礦鐵' },
  4: { metal: '#8273b0', leather: '#5e3f6a', cloth: '#4c3a86', wood: '#e6dab6', name: '冥骨' },
  5: { metal: '#ee5a2e', leather: '#932f22', cloth: '#c4303c', wood: '#3c3042', name: '炎龍' },
};

// 稀有度的滾邊色：普通沒有滾邊、精良綠、稀有藍、史詩紫、傳說金
const TRIM = [null, '#4fd36a', '#3f9cff', '#b266ff', '#ffc531'];
const GEM = [null, '#62ee7c', '#4fc3ff', '#d07cff', '#ff7a2c'];
const CAPE = [null, null, null, '#8c4ad8', '#d43a2a'];
const ORB = '#a565e0';   // 法杖與巫師帽的寶珠

export function gearMats(item) {
  const t = TIER[item.tier] || TIER[1];
  const r = item.rarity;
  return {
    ...BODY,
    metal: m(t.metal),
    leather: m(t.leather),
    cloth: m(t.cloth),
    wood: m(t.wood),
    lining: m('#3a2440'),
    trim: m(TRIM[r] || t.metal),
    gold: m('#ffc531'),
    gem: m(GEM[r] || '#9aa3ad'),
    glow: m(r >= 3 ? TRIM[r] : '#7ff3ff', { flat: true }),
    visor: m(r >= 3 ? GEM[r] : '#6ff2dc', { flat: true }),
    orb: m(ORB),
    cape: m(CAPE[r] || '#b8742e'),
  };
}

export const TIER_NAME = Object.fromEntries(Object.entries(TIER).map(([k, v]) => [k, v.name]));
