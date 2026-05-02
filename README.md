# 🌟 紫微斗數排盤系統 (Zi Wei Dou Shu Charting System)

![React](https://img.shields.io/badge/React-18.x-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.x-purple?style=flat&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=flat&logo=tailwind-css)

這是一個功能完整、現代化的**紫微斗數前端排盤與分析系統**。專案支援基礎命盤排盤、大限/流年/流月/流日/流時的動態推算、飛星四化（向心/離心自化）軌跡視覺化，以及進階的 **ABCD 反背格局判定與 AI 輔助解讀**。

## ✨ 核心功能 (Core Features)

- ⏱️ **多維度時間流轉推算**
  支援本命、大限、流年、流月、流日、流時的動態切換。支援五虎遁法則與各種曆法轉換（農曆月份、干支計算）。
- 💫 **飛星四化視覺化 (Flying Stars & Mutagens)**
  計算並標記本宮自化（離心）與對宮化入（向心）。支援祿(A)、權(B)、科(C)、忌(D)的飛行軌跡動態繪製與重疊偏移處理。
- 🔍 **進階格局分析 (ABCD Reversal Analysis)**
  針對命盤中的四化飛線進行進階分析，自動判定「反背」格局（如祿入而不守、權到反爭等），並提供三方四正的得失統計。
- 💬 **AI 智慧解讀氣泡 (Smart Hint Bubbles)**
  點擊宮位即可查看該宮位在不同時間維度（本命/大限/流年）的沖照關係、三合位與一六共宗位分析。
- 🌍 **國際化與客製化 (i18n & Customization)**
  支援繁體中文 (`zh-TW`) 與簡體中文 (`zh-CN`)。

## 🛠️ 技術棧 (Tech Stack)

- **框架**: React + TypeScript + Vite
- **樣式**: Tailwind CSS (客製化毛玻璃 Glassmorphism 風格)
- **狀態管理**: Zustand (`useChartStore`, `useSettingsStore`)
- **資料驗證**: Zod
- **圖表繪製**: 依賴 DOM Rect 與 SVG 進行動態連線與精準標記

---

## 📁 核心模組架構 (Module Architecture)

### 1. 狀態管理 (State Management)
* **`hooks/useChartDisplay.ts`**
  - **`useChartDisplay`**: 處理當前選中的宮位、時間層級、圖表模式（飛星/三合/四化），以及畫面彈窗與 Grid 佈局偏移計算。
  - **`useChartCalculations`**: 根據目前的時間層級，動態計算對應的宮位資料、天干地支、以及各個宮位在大限/流年中的標籤（如「大命」、「年財」等）。

### 2. 命理核心演算法 (Astrological Logic)
* **`utils/chartHelpers.ts`**
  - **宮位解析 (`parsePalaces`)**: 將原始星盤資料轉化為前端 UI 所需的 `PalaceData` 格式。
  - **干支與曆法 (`getYearGanZhi`, `getFirstMonthGan`, `getMonthlyGan`)**: 提供年份干支計算與五虎遁法（計算正月天干）。
  - **流月排列 (`getMonthlySequenceByBranch`)**: 提供不同流月排列法（正月定位法 / 斗君法）。
  - **宮位關係 (`getSanFangSiZhengBranches`)**: 計算任意地支的三方與四正宮位。
* **`utils/lunar.ts`**
  - 農曆轉換與字串解析相關的純函數，支援時間地支與農曆月份提取。

### 3. 飛星與四化引擎 (Mutagen Engine)
* **`mutagenLines.ts`**
  - **飛線收集**: 掃描命盤中所有的向心自化（對宮）與離心自化（本宮），並產生帶有座標與顏色標記的連接線 (`MutagenLine`)。
  - **來因宮標記 (`markCausePalace`)**: 透過生年天干尋找並標記命盤的來因宮。
  - **邊界計算**: 精確計算 DOM 節點間的 SVG 連線起點與終點 (`getCenterBoundaryPointForPalace`)，避免箭頭重疊。

### 4. 進階分析：ABCD 反背規格 (Advanced Analysis)
* **`abcdReversalSpec.ts`**
  - 透過對 `MutagenLine` 的分析，判斷盤面是否存在反背現象。
  - 支援判斷機理：`gainThenLoss` (得而復失)、`counterpartyConflict` (對待沖突)、`centrifugalDissipation` (離心消散)。
  - 自動生成判定結果的嚴重程度（`weak`, `medium`, `strong`）與對應的解說文案。

### 5. 類型與顯示設定 (Types & Localization)
* **`types.ts` & `utils/types.ts`**
  - 定義所有前端介面 (Interfaces)，包含 `StarData`, `PalaceData`, `MutagenLine`。
  - 定義命盤的 UI 座標 `PALACE_POSITIONS`（12宮在畫面上的位置映射）。
  - 提供靜態映射表：六十甲子納音表、對宮映射表、主星列表、四化顏色設定等。
* **`utils/localization.ts`**
  - 處理繁簡體切換，補全星曜亮度的多語系支援（廟、旺、得、利、平、陷）。
  - 生肖與星座的多語系名稱轉換。

---

## 🎨 UI 與視覺設計規格 (UI Specifications)

- **十二宮位網格 (12-Palace Grid)**：
  - 以 `4x4` 的網格佈局排列十二宮，中間空出 `2x2` 的區塊為中宮（顯示命盤摘要資料）。
  - 由 `PALACE_POSITIONS` 控制渲染，例如：巳宮(0,0)、午宮(0,1)...
- **飛星線條 (Flying Lines)**：
  - <span style="color:#34C759">祿(A)</span>：綠色 (`#34C759`)
  - <span style="color:#AF52DE">權(B)</span>：紫色 (`#AF52DE`)
  - <span style="color:#007AFF">科(C)</span>：藍色 (`#007AFF`)
  - <span style="color:#FF3B30">忌(D)</span>：紅色 (`#FF3B30`)
  - 自動處理重疊線段，依照起點所屬邊界（上下或左右）套用 `xOffset` 與 `yOffset`，並支援動畫流動效果。

## 🚀 快速開始 (Getting Started)

```bash
# 安裝依賴庫
npm install

# 啟動開發伺服器
npm run dev

# 建立生產環境版本
npm run build
```

## 🛠️ 開發與維護指南 (Development Guide)

- **新增四化邏輯**：請於 `mutagenLines.ts` 的 `collectMutagenLines` 中擴充，這裡集中處理了所有飛線的產生邏輯。
- **變更圖表佈局**：可在 `useChartDisplay.ts` 中調整 `gridOffset` 計算，以及修改 `types.ts` 中的 `PALACE_POSITIONS`。
- **擴增語系**：更新 `utils/localization.ts` 的映射字典，並在 `lib/i18n` 中補齊對應的翻譯檔。
- **修改氣泡文案**：請至 `Bubble.tsx` 中的 `formatLine1` ~ `formatLine4` 集中統一修改。
