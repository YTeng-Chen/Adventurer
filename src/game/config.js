// 遊戲畫面的邏輯解析度（像素）。實際顯示時會等比例放大。
export const W = 480;
export const H = 170;
export const GROUND = 142;

// 角色是骨架動畫（側面，112 像素高，原尺寸顯示）；魔物圖 32×32 放大 2 倍，頭目 3 倍
export const HERO_X = 196;   // 角色腳底中心的位置
export const ENEMY_SCALE = 2;
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
