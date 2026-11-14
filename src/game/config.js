// 遊戲畫面的邏輯解析度（像素）。實際顯示時會等比例放大。
export const W = 480;
export const H = 170;
export const GROUND = 142;

// 角色圖 44×54（手繪 Q 版）、魔物圖 32×32，都放大 2 倍；頭目 3 倍
export const HERO_SCALE = 2;
export const ENEMY_SCALE = 2;
export const BOSS_SCALE = 3;
export const HERO_Y = GROUND - 52 * HERO_SCALE; // 鞋底輪廓在角色圖第 52 列，讓腳踩在地面上

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
