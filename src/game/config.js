// 遊戲畫面的邏輯解析度（像素）。實際顯示時會等比例放大。
export const W = 480;
export const H = 150;
export const GROUND = 120;

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
