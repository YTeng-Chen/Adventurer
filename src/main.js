// 進入點：先啟動 HTML 介面（遊戲狀態在這裡），再啟動 Phaser 畫面。
import './style.css';
import { bus } from './bus.js';
import { startUI } from './ui/app.js';
import { createGame } from './game/index.js';

const ui = startUI(bus);

// 等像素字型載入再開 Phaser，否則傷害數字會先用預設字型畫出來（最多等 1.5 秒）
const fontReady = document.fonts
  ? Promise.race([document.fonts.load('700 12px "Pixelify Sans"'), new Promise((r) => setTimeout(r, 1500))])
  : Promise.resolve();

fontReady.catch(() => {}).finally(() => {
  createGame(document.getElementById('stage'), { bus, getState: ui.getState });
});
