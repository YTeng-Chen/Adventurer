---
name: gear-design
description: 設計、新增或重畫冒險者遊戲的裝備：單件、整套（含套裝效果）、新外觀、新武器形態與連招、戰鬥特效。使用者說「做一組／一件 XX 裝備」「新增 XX 武器」「重畫 XX」「特效不夠帥」「裝備太醜」，或要大量製作裝備時使用。
---

# 製作裝備

這個 skill 整理了做「T5 炎龍套裝」時的流程與踩過的坑。做裝備時照著做，做完一定要實際看過畫面、反覆修到好看，再交給使用者。

## 1. 先問清楚

使用者沒講的，用 AskUserQuestion 一次問完（最多 4 題，推薦選項放第一個）。常見要問的：

- **主題與配色**：給 3–4 個具體方向，各寫出外觀特徵與特效風格（例如「炎龍：黑紅龍鱗、熔岩裂紋、火龍與火柱」）。
- **部位**：只做武器？一整套（武器、頭飾、上衣、鞋子）？要不要飾品？
- **武器**：沿用現有形態（劍、弓、鎚、法杖、大劍）的連招，還是新的形態與連招？
- **取得方式**：跟一般裝備一樣隨機（`tier` 限定階級），或其他。
- **套裝效果**：要不要、幾件生效。

大量製作時，先列出整批清單（名稱、部位、階級、外觀、形態、數值方向）給使用者確認，再一套一套做，每做完一套就提交一次。

## 2. 改哪些檔案

| 要做的事 | 檔案 |
| --- | --- |
| 新款式（沿用現有外觀） | `src/core/gear.js` 加一列，其他自動出現（鍛造、掉落、背包、鍛造室款式選單） |
| 新外觀 | 武器 `src/rig/rig.js` 的 `WEAPON_LOOKS`；上衣 `BODY_LOOKS`；鞋子 `FEET_LOOKS`；超出身體輪廓的部分（護肩、披風、爪）`EXTRAS`；頭飾 `src/rig/hats.js` 的 `STYLES`（全罩式另外加進 `FULL`）；背包圖示把外觀加進 `rig.js` 的 `RIG_ICON_LOOKS` |
| 主題套裝 | 美術與跟著角色的特效放在自己的檔案（照 `src/rig/dragon.js`）；套裝效果 `src/core/data.js` 的 `SETS`；套裝光環 `rig.js` 的 `SET_AURAS`（小）、`src/game/stagefx.js` 的 `STAGE_SETS` 與 `update()`（大） |
| 新武器形態 | `data.js` 的 `FORMS`（職業與職業機制）；`rig.js` 的 `COMBOS`，以及 `ANIMS` 的 `combo_<形態>`、`quick_<形態>`；`src/game/IdleScene.js` 的 `RANGE`、`FINISH_REACH`（掛機時打多遠）；大型特效在 `stagefx.js` 加同名方法並加進 `STAGE_STYLES` |

設定頁的「取得全部裝備」測試按鈕會自動包含 `GEAR` 裡的每一款；`/tools/rig.html` 的服裝選單會自動列出 `SETS` 裡的每一套，不用另外加。

## 3. 資料與數值

`gear.js` 每一列：`id`（存檔用，加了就不能改）、`type`、`n`（名稱）、`look`、`form`（武器才有）、`base(T)`、選填 `w`（權重）、`tier`（只在這一階出現，名稱不加階級前綴）、`set`。

- **數值參考（T5，普通稀有度、浮動前）**：一般劍 物攻 48、暴擊 2；炎龍大劍 物攻 61、暴擊 4、暴傷 10。主題套裝大約比同部位的一般款式高 15–25%，再看套裝效果調整。改數值前先對照 `gear.js` 裡同部位的其他款式。
- **名稱**：一般款式的名稱是「材料階級前綴＋款式」（`items.js` 的 `TIER_PREFIX`：新手、森林、礦鐵、冥骨、熔岩）。新的主題名不要和前綴重複，不然一般裝備會被誤認成套裝（以前 T5 前綴叫「炎龍」就出過這個問題）。
- **套裝效果**（`SETS`）：`{ need, d, pct, flat, eff }`，寫法和祝福一樣；`eff` 用 `stats.js` 的 `emptyEffects()` 裡有的鍵。
- **測試**（`tests/core.test.js`）：照「炎龍套裝」那幾個測試加：只在指定階級出現、名稱、形態與職業、套裝 2／4 件效果、鍛造指定款式只用對的材料。

## 4. 外觀

### 座標與單位

- 角色 112 像素高，裝備用「大格」上色（1 大格 = 2×2 像素，`P.unit`）。上衣、鞋子是照身體零件的輪廓上色（`painters`），所以不能超出身體；超出的部分用 `EXTRAS`（零件內的像素座標，側面後面的手腳要調暗）。
- 頭飾用 `hats.js` 的 `HAT_AT`：`L`、`R` 是左右、`B` 是帽簷那一列，側面朝右（`R` 是臉那一側）。頭本身大約 30×28 大格。
- 武器畫在自己的小畫布上，劍尖朝上、握柄是支點；比一般武器大的，像 `drawDragonBlade` 那樣自己指定大小和 `points`（劍身兩端，火焰特效沿著燒）。
- 男女（`m`、`f`）、側面與正面都要畫，四種都要檢查。

### 設計原則（從使用者的回饋學到的）

- **看的是輪廓，不是紋理。** 遊戲裡角色只有戰鬥畫面高度的 1/8，細紋會糊成一片。用大塊的明暗（一個光源方向）表現體積；不要用棋盤格或滿滿的橫條紋，那會很花、像「T2 裝備」。
- **主題特徵要一眼看出來**，而且要長在輪廓上：龍角從後腦長出來往上翹，龍吻、獠牙、發光的眼睛，不要貼在表面。
- **不要太寬**：頭飾側面用 `hat-size.mjs` 量，一般頭盔約 30 格，全罩式側面不超過 36 格。
- **全罩式頭盔**要確認臉和下巴沒有從下面露出來（側面最容易漏），頭髮會自動藏起來。
- **披風、垂下來的東西**不要在手的高度出現亮色，會被看成手套。
- **稀有度要有層次**：0 素面 → 1 金邊 → 2 寶石 → 3 發光 → 4 更多金飾、更長的角。主題套裝用自己的色盤，不吃材料階級的顏色。

## 5. 動作與特效

### 連招

`COMBOS` 的一筆：`dur`（秒）、`hits`（命中時間 0–1、這段的傷害比例 `w`、力道 `power`）、`pose(t, T)`。關鍵格用秒寫比較好讀（`const S = (sec) => sec / dur`）。前兩段俐落，終結技給足時間。雙手武器讓後面的手跟著前面的手（`armL`、`elbowL` 跟 `armR`、`elbowR` 差幾度）。`quick(COMBOS.x, cut)` 的 `cut` 要剛好包住第一段命中。

### 特效要畫在對的地方

- **跟著角色的小特效**（刀光、武器上的火、腳下的圈）畫在骨架裡（`drawFx`、`dragon.js` 的 `fireFx`），會跟著角色縮成一半。
- **要讓人覺得帥的大特效一定要畫在戰鬥畫面上**（`stagefx.js`，Phaser 粒子與圖片）：佔滿畫面的斬擊、橫越天空的龍、衝到畫面頂端的柱子、暗場、衝擊波、地裂、碎石、火星雨、命中停頓、鏡頭拉近、閃光。只畫在骨架裡的特效，使用者會覺得「只有 T2 的程度」。
- 大特效的時間點用連招進度表示（像 `GS`），和 `hits` 對齊；`RigHero.attack` 會自動呼叫。

### 一定要避開的坑

- **混色**：有顏色的本體（火柱、龍、斬擊、火焰粒子）用一般混色；加亮混色（ADD）只用在小亮點和光暈。不然疊在白天的天空上整片變白。
- **不要開全畫面泛光**，也**不要在角色上加 Glow 濾鏡**：會把畫面洗白，而且很吃效能（濾鏡讓 60 幀掉到 24）。要發光輪廓，就用角色同一張圖畫一份塗色、加亮、放大一點墊在後面。
- **鏡頭的緩動要傳函式**（`Phaser.Math.Easing.Quadratic.Out`），傳字串（`'Quad.out'`）會丟錯誤，整個遊戲迴圈直接停住。
- **沿路徑的長條特效**（龍的身體）要沿著路徑取點，不要用「每一格的位置紀錄」，幀數一低就會斷成一顆一顆。
- **命中停頓**（`hero.hold(ms)`）只用在最後一擊，前面的命中時間是排好的，停頓會讓傷害數字和動作對不上。
- **掛機時**每一套連招都會播，暗場、閃光、震動要淡一點（`calm`）。

## 6. 檢查（每次改完都要做，不要只靠想像）

先開開發伺服器（`npm run dev`，背景執行），腳本都在專案根目錄跑。這台雲端機器沒有 GPU、截圖很慢，所以用遊戲內部截圖。

```bash
npm test
npx vite build
node .claude/skills/gear-design/scripts/rig-shots.mjs <輸出資料夾> "gear=<套裝>&anim=idle&t=0.2&rarity=4&tier=5" "gear=<套裝>&anim=idle&view=front&gender=f&rarity=1&tier=5" "gear=<套裝>&anim=combo_<形態>&t=0.3"
node .claude/skills/gear-design/scripts/hat-size.mjs <頭飾外觀>
node .claude/skills/gear-design/scripts/record.mjs <輸出資料夾> --set <套裝> --area 4 --wait 4500 --ms 5600
node .claude/skills/gear-design/scripts/record.mjs <輸出資料夾> --set <套裝> --hunt 4 --prefix hunt
python3 .claude/skills/gear-design/scripts/sheet.py sheet.png --cols 6 --scale 0.33 --every 3 "<輸出資料夾>/rec-*.png"
python3 .claude/skills/gear-design/scripts/sheet.py best.png --cols 3 --scale 0.5 --best 12 "<輸出資料夾>/hunt-*.png"
node .claude/skills/gear-design/scripts/fps.mjs --set <套裝>
```

- 截圖放在 scratchpad，不要放進專案資料夾。用 Read 看縮圖表，小地方用 `--crop` 放大。
- 要看：男女、側面正面、各稀有度；白天（草原 `--area 0`）和暗的地圖（火山 `--area 4`）都要看，特效在亮背景最容易出問題；掛機和狩獵都要看。
- `fps.mjs`：穿上之後不能明顯掉幀，絕對不能出現 0（代表卡住，通常是腳本錯誤，會一起印出來）。
- 自己先挑毛病、修好，再給使用者看。

## 7. 交付

1. 更新 `README.md`（「怎麼玩」的裝備說明、「架構」裡的外觀與特效段落、「加新裝備」）。
2. 提交（commit 訊息寫清楚做了什麼、為什麼）並推送到工作分支。
3. 更新試玩連結 https://claude.ai/artifact/Ln1NoniDpHWPTCkbkkUgKH（用同一個網址）：
   ```bash
   npx vite build --base ./ --outDir <scratchpad>/preview --emptyOutDir
   python3 .claude/skills/gear-design/scripts/publish-prep.py <scratchpad>/preview
   ```
   用 Artifact 發佈 `<scratchpad>/preview/adventurer.html`（`root` 設成那個資料夾、`url` 用上面的網址），`files` 列出腳本印出的 assets；上一版的 assets 檔名不同，在 `files` 裡設成 `null` 刪掉。
4. 做一張展示圖（男女、正面側面、連招的幾個關鍵瞬間），用 SendUserFile 傳給使用者。
5. 用中文回報：做了什麼（外觀、連招、套裝效果、數值）、怎麼在試玩連結看到（設定 → 取得全部裝備，再到背包穿上）、還沒做或要使用者決定的事。
