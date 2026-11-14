import { defineConfig } from 'vite';

export default defineConfig({
  // 相對路徑：打包結果放在任何資料夾、任何網址底下都能開
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // Phaser 本身約 1.3MB，不用警告
  },
});
