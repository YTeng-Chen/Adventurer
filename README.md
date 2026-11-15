# 冒險者 ADVENTURE（暫定名稱）

像素風的放置養成 RPG 原型：平日掛機養成，假日挑戰神之試煉、親手搭配祝福。

## 開始開發

需要 Node.js 20 以上。

```bash
npm install
```

```bash
npm run dev
```

開啟終端機顯示的網址就能玩。其他指令：

- `npm run build`：打包到 `dist/`，整個資料夾放到任何網頁空間都能開。
- `npm run preview`：在本機預覽打包結果。
- `npm test`：執行遊戲規則的測試。
- 開發時打開 `/tools/sprites.html`：一次看男女角色、所有流派、稀有度、材料階級的裝備像素圖。
- 開發時打開 `/tools/hairstyles.html`：髮型挑選頁（男女各 3 種髮型、6 種髮色）。
- 開發時打開 `/tools/rig.html`：2D 骨架動畫原型（`src/rig/`）。角色取自 `tools/art/ref/` 的正面參考圖，由 `tools/art/build_rig_parts.py` 切成零件；可播放待機、走路、揮砍、跳斬，並切換裝備。還沒接進遊戲。
- 開發時打開 `/tools/model3d.html`：3D 像素風人物設計稿（Three.js，`src/three/`）。人物由圓滑曲面組成，頭髮是一撮撮立體髮束，用低解析度算繪再描邊；可切換角度、動作、髮色。還沒接進遊戲。

第一次進遊戲會先建立角色（性別、髮型、髮色），之後可以在角色面板按「更換外觀」修改。進度存在瀏覽器裡。頁面底部的「快轉 1 小時」是測試用的，可以馬上看到離線收穫。

## 怎麼玩

- **掛機地點**：鍛鍊室、戰鬥地圖、鍛造室、市集、公會，同時只能選一處。每 5 秒結算一次，關掉網頁也會繼續（最多 12 小時）。
- **裝備與職業**：鍛造時用哪個流派的材料，就做出哪個流派的裝備。武器、頭飾、上衣、鞋子中有 3 件同流派就是專精職業，2+2 會變成混合職業；飾品不影響職業，專門出詞條。史詩、傳說裝備有會改變戰鬥行為的特殊效果。角色外觀會隨裝備改變。
- **魔物狩獵**：用狩獵券挑戰各地圖的頭目，首次擊敗解鎖下一張地圖。
- **神之試煉**：每週一重置，每過 3 關從三個祝福中選一個（一般、稀世、史詩、神之四級）。

## 架構

分成三層，彼此只透過明確的介面溝通：

| 資料夾 | 負責 | 用到 |
| --- | --- | --- |
| `src/core/` | 遊戲規則：數值、戰鬥、掛機結算、鍛造、試煉、存檔。純運算，不碰畫面 | 無 |
| `src/ui/` | 文字多的畫面：HUD、角色數值、掛機地點、背包、任務、祝福選擇 | HTML / CSS |
| `src/game/` | 會動的畫面：掛機場景、戰鬥播放、傷害數字、裝備閃光 | Phaser 4 |

- 戰鬥結果由 `core` 先算好，Phaser 只負責把戰鬥紀錄播出來，所以「跳過」不會改變結果。
- HTML 介面和 Phaser 不直接互相呼叫，而是透過 `src/bus.js` 的事件（`state`、`tick`、`battle:start` 等，說明寫在檔案開頭）。
- 角色是手繪的動漫迷你 Q 版紙娃娃：後髮、披風、身體、鞋子、上衣、前髮、頭飾、武器各一層，換裝備或換髮型只換那一層。角色會呼吸、眨眼、披風會飄，攻擊時武器以右手為支點揮動。
- 身體與髮型是手繪的高解析度像素圖（角色 68×108 格，參考大頭、寬臉、大眼、兩側耳朵、厚帽兜、大球鞋的比例）：`tools/art/character.py` 用 Python（需要 Pillow）畫出來，執行 `python3 tools/art/character.py --export` 輸出 `src/art/chibi-data.js` 與 `tools/hairstyles-data.js`。髮色用四階色票替換，所以每種髮型都能換色。
- 裝備在 `src/art/chibi.js` 用程式照同樣的畫風（黑色輪廓、卡通平塗）畫，設計座標放大 2 倍後再描 1 格細的輪廓：流派決定款式（劍士冒險帽與皮甲、守衛騎士盔與板甲、術士法帽與法袍），材料階級決定材質，稀有度決定滾邊、寶石與裝飾（羽毛、角、披風）。之後換成美術畫的圖，只需要改 `src/art/chibi.js` 與 `src/game/textures.js`。

```
index.html          頁面骨架
src/main.js         進入點
src/bus.js          介面與 Phaser 之間的事件
src/style.css       樣式
src/core/           遊戲規則（data.js 是所有平衡數值）
src/ui/app.js       HTML 介面
src/ui/sprites.js   像素圖入口（魔物資料）
src/art/            角色（chibi.js、chibi-data.js）、裝備、圖示的像素繪製
src/game/           Phaser：IdleScene、BattleScene、textures
tests/              遊戲規則測試
tools/sprites.html  像素圖預覽（開發用）
tools/hairstyles.html 髮型挑選頁（開發用）
tools/art/          手繪角色的產生工具（Python）
```

## 點子苗圃同步

`IDEA_MAP.md` 可以匯入點子苗圃的「實作」分支。更新方式寫在 `.claude/skills/idea-map-sync/SKILL.md`。
