// 戰鬥畫面的邏輯解析度（像素）。實際顯示時會等比例縮放；624:448 在手機上大約是螢幕高度的 1/3。
// 解析度取得比較高，角色（原圖 112 像素高）用原尺寸畫就只佔畫面高度的 1/4，細節不會因為縮小而糊掉。
export const W = 624;
export const H = 448;
export const GROUND = 392;

// 角色大小：HERO_SCALE 是顯示比例（0.5 = 56 像素高，約畫面高度的 1/8）。角色原圖的方塊是 2×2 像素，縮成一半剛好一格一點。
// 魔物圖是 32×32，跟著角色一起縮放。
export const HERO_SCALE = 0.5;
export const HERO_X = 150;   // 角色腳底中心的位置（偏左，留空間給魔物跑過來）
export const FOE_X = 180;    // 魔物左緣的位置（刀光砍得到的距離）
export const ENEMY_SCALE = 1;
export const BOSS_SCALE = 1.5;

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
