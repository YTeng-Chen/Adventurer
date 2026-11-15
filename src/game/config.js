// 戰鬥畫面的邏輯解析度（像素）。實際顯示時會等比例放大；312:224 在手機上大約是螢幕高度的 1/3。
export const W = 312;
export const H = 224;
export const GROUND = 196;

// 角色是骨架動畫（側面，112 像素高、原尺寸顯示），大約佔畫面面積的一成；要調整角色大小，改 HERO_SCALE。
export const HERO_SCALE = 1;
export const HERO_X = 96;    // 角色腳底中心的位置
export const FOE_X = 162;    // 魔物左緣的位置（刀光砍得到的距離）
export const ENEMY_SCALE = 2;   // 魔物圖 32×32
export const BOSS_SCALE = 3;

// Phaser 文字只用來顯示數字與短英文（傷害、EXP），中文都交給 HTML
export const FONT = (size, color) => ({
  fontFamily: '"Pixelify Sans", ui-monospace, monospace',
  fontSize: `${size}px`,
  fontStyle: '700',
  color,
  stroke: '#0a0d13',
  strokeThickness: 3,
  resolution: 3,
});
