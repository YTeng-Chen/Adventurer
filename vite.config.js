import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // 相對路徑：打包結果放在任何資料夾、任何網址底下都能開
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // Phaser、Three.js 本身就很大，不用警告
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        model3d: resolve(import.meta.dirname, 'tools/model3d.html'), // 3D 角色原型（不影響遊戲）
        rig: resolve(import.meta.dirname, 'tools/rig.html'),         // 2D 骨架動畫原型（不影響遊戲）
      },
    },
  },
});
