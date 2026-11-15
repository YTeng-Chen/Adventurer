// 戰鬥畫面的邏輯解析度（像素）。實際顯示時會等比例縮放；624:448 在手機上大約是螢幕高度的 1/3。
// 解析度取得比較高，角色（原圖 112 像素高）用原尺寸畫就只佔畫面高度的 1/4，細節不會因為縮小而糊掉。
export const W = 624;
export const H = 448;
export const GROUND = 392;

// 角色大小：HERO_SCALE 是顯示比例（1 = 112 像素高，約畫面高度的 1/4）。魔物圖是 32×32。
export const HERO_SCALE = 1;
export const HERO_X = 224;   // 角色腳底中心的位置
export const FOE_X = 284;    // 魔物左緣的位置（刀光砍得到的距離）
export const ENEMY_SCALE = 2;
export const BOSS_SCALE = 3;

// Phaser 文字只用來顯示數字與短英文（傷害、EXP），中文都交給 HTML
export const FONT = (size, color) => ({
  fontFamily: '"Pixelify Sans", ui-monospace, monospace',
  fontSize: `${size}px`,
  fontStyle: '700',
  color,
  stroke: '#0a0d13',
  strokeThickness: 5,
  resolution: 2,
});
