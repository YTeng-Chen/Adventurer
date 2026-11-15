// 建立 Phaser 遊戲。Phaser 只負責畫面上會動的部分：掛機場景與戰鬥播放。
import * as Phaser from 'phaser';
import { IdleScene } from './IdleScene.js';
import { BattleScene } from './BattleScene.js';
import { W, H } from './config.js';

export function createGame(parent, { bus, getState }) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    pixelArt: true,
    backgroundColor: '#0a0d13',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    callbacks: {
      preBoot: (g) => { g.registry.set('bus', bus); g.registry.set('getState', getState); },
    },
    scene: [IdleScene, BattleScene],
  });

  // 戰鬥：掛機場景先睡著，播完再叫醒
  bus.on('battle:start', (payload) => {
    game.scene.sleep('Idle');
    game.scene.start('Battle', payload);
  });
  bus.on('battle:close', () => {
    game.scene.stop('Battle');
    game.scene.wake('Idle');
  });
  // 戰鬥畫面只有需要時才顯示：藏起來時停止更新省電，顯示時重新量尺寸
  bus.on('stage:show', (show) => {
    if (show) { game.loop.wake(); requestAnimationFrame(() => game.scale.refresh()); }
    else game.loop.sleep();
  });
  return game;
}
