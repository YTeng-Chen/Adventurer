// 遊戲畫面的邏輯解析度（像素）。實際顯示時會等比例放大。
export const W = 480;
export const H = 150;
export const GROUND = 120;

// 角色圖 40×46、魔物圖 32×32，都放大 2 倍；頭目 3 倍
export const HERO_SCALE = 2;
export const ENEMY_SCALE = 2;
export const BOSS_SCALE = 3;
export const HERO_Y = GROUND - 46 * HERO_SCALE + 6; // 角色圖下方留 2 格空白

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
