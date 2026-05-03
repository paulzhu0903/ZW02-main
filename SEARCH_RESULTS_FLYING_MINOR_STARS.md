# 飛星盤面雜曜(Minor Stars)顯示相關代碼搜索結果

## 概述
搜索了飛星盤面中雜曜顯示相關的代碼邏輯，發現 `flyingShowMinorStars` 狀態已定義但尚未完全集成到宮位渲染邏輯中。

---

## 一、flyingShowMinorStars 狀態定義

### 位置：src/stores/index.ts

**狀態定義（第164行）**
```typescript
flyingShowMinorStars: boolean  // 顯示飛星盤面中的輔星、雜曜
```

**初始值（第263行）**
```typescript
flyingShowMinorStars: false,  // 默認隱藏
```

**Setter 方法（第316行）**
```typescript
setFlyingShowMinorStars: (value) => set({ flyingShowMinorStars: value }),
```

---

## 二、SettingsPanel.tsx 中的 UI 控制

### 位置：src/components/SettingsPanel.tsx

**狀態提取（第88行）**
```typescript
flyingShowMinorStars,
```

**Setter 提取（第123行）**
setFlyingShowMinorStars,
```

**UI 控制開關（第375行）**
```typescript
<SettingToggle checked={flyingShowMinorStars} onChange={() => setFlyingShowMinorStars(!flyingShowMinorStars)}>
  {t('settings.showMinorStars', language)}
</SettingToggle>
```

**位置所在的宮位内容**
```
飛星盤面設定 (Flying Chart Settings)
├─ showGods（顯示神佛）
├─ showMinorStars（顯示雜曜） ← flyingShowMinorStars 在這裡
├─ showBodyPalace（顯示身宮）
├─ showCausePalace（顯示因果宮）
├─ showCommandMutagen（顯示命盤四化）
├─ showCentralFixBoard（顯示中宮固定盤）
├─ showCentralEightCharacters（顯示中宮八字）
├─ useColorMultiArrow（使用彩色多箭頭）
└─ showTripleQuaternaryLine（顯示三四化線）
```

---

## 三、宮位卡片中的雜曜渲染邏輯

### 位置：src/components/chart/components/PalaceCard.tsx

**組件接收的 Props（第23行）**
```typescript
export function PalaceCard({
  name, stem, branch, majorStars, minorStars, adjectiveStars,  // ← minorStars 在此接收
  ...
  chartType = 'flying',
  ...
}: PalaceCardProps)
```

**Store 中提取的狀態（第26行）**
```typescript
const { language, transformationShowGods, flyingShowGods, transformationShowCausePalace, transformationHideMinorStars } = useSettingsStore()
```

**重要發現⚠️**
- 從 store 中提取了 `transformationHideMinorStars` 用於四化盤面
- **但沒有提取 `flyingShowMinorStars`** ⚠️

**雜曜渲染邏輯（第181-202行）**
```typescript
{(chartType === 'flying' || chartType === 'transformation' || chartType === 'trireme') && minorStars.map((star, i) => {
  // 四化盤中，如果隱藏輔星，則只顯示四個重要輔星（左輔、右弼、文昌、文曲）
  const keyMinorStars = ['左輔', '左辅', '右弼', '文昌', '文曲']
  const shouldShow = !transformationHideMinorStars || chartType !== 'transformation' || keyMinorStars.includes(star.name)
  
  if (!shouldShow) return null
  
  return (
    <div key={`minor-wrap-${i}`} className={`${STAR_SLOT_WIDTH_CLASS} flex justify-center items-start`}>
      <StarTag
        key={`minor-${i}`}
        star={star}
        isMajorStar={isMajorStarName(star.name)}
        chartType={chartType}
        selectedDecadal={selectedDecadal}
        selectedAnnual={selectedAnnual}
        isCurrentDecadalPalace={isCurrentDecadalPalace}
        isCurrentAnnualPalace={isCurrentAnnualPalace}
        decadalLifePalaceStem={decadalLifePalaceStem}
        annualLifePalaceStem={annualLifePalaceStem}
        selectedAnnualGanZhi={selectedAnnualGanZhi}
        yearGan={yearGan}
      />
    </div>
  )
})}
```

**當前邏輯問題分析**
1. 雜曜始終顯示（在三種盤面中都顯示）
2. 只有四化盤面(`chartType === 'transformation'`)使用 `transformationHideMinorStars` 來隱藏
3. 飛星盤面(`chartType === 'flying'`)**沒有應用** `flyingShowMinorStars` 狀態

---

## 四、宮位內的星曜渲染結構

### 宮位卡片容器結構

```
PalaceCard (宮位卡片)
├─ 主星渲染區域 (majorStars)
│  ├─ majorStars.map(star => StarTag)
│  └─ (顯示紫微、天府等主星)
│
├─ 輔星、雜曜區域 (minorStars)
│  ├─ minorStars.map(star => 
│  │   ├─ div.minor-wrap (容器)
│  │   └─ StarTag(star)
│  │ )
│  └─ (當前始終顯示，無控制)
│
└─ 雜曜容器 (adjectiveStars) - 飛星、三合獨有
   ├─ 條件：chartType === 'flying' || chartType === 'trireme'
   └─ adjectiveStars.map(star => StarTag)
```

### StarTag 組件位置
- 路徑：[src/components/chart/components/StarTag.tsx](src/components/chart/components/StarTag.tsx)
- 職責：渲染單個星曜，包含星名、亮度、四化資訊等

---

## 五、雜曜數據結構

### 宮位類型定義
位置：[src/components/chart/types.ts](src/components/chart/types.ts#L24)

```typescript
// PalaceData 結構
{
  majorStars: StarData[]      // 主星（紫微、天府等）
  minorStars: StarData[]      // 輔星、雜曜（左輔、右弼、文昌、文曲等）
  adjectiveStars: StarData[]  // 雜曜（形容詞性，飛星、三合專用）
}

// StarData 結構
{
  name: string        // 星名（如"左輔"）
  brightness: string  // 亮度級別（如"廟", "旺", "平", "陷"）
  mutagen?: MutagenInfo
}
```

---

## 六、相關文件位置總結

| 功能 | 文件 | 行數 |
|-----|------|------|
| 狀態定義 | [src/stores/index.ts](src/stores/index.ts#L164) | 164, 207, 263, 316 |
| UI 控制 | [src/components/SettingsPanel.tsx](src/components/SettingsPanel.tsx#L375) | 88, 123, 375 |
| 宮位渲染 | [src/components/chart/components/PalaceCard.tsx](src/components/chart/components/PalaceCard.tsx#L181) | 26(store), 181(render) |
| 宮位類型 | [src/components/chart/types.ts](src/components/chart/types.ts#L24) | 24 |
| 星曜組件 | [src/components/chart/components/StarTag.tsx](src/components/chart/components/StarTag.tsx) | - |
| 亮度定義 | [src/components/chart/utils/chartHelpers.ts](src/components/chart/utils/chartHelpers.ts#L101) | 101-117 |

---

## 七、核心問題和待完成項

### ⚠️ **問題 1：flyingShowMinorStars 未被使用**
- ✅ 狀態在 store 中已定義
- ✅ UI 控制開關已在 SettingsPanel.tsx 中實現
- ❌ **邏輯未在 PalaceCard.tsx 中應用**

### ❌ **問題 2：PalaceCard.tsx 未提取 flyingShowMinorStars**
```typescript
// 現在的代碼（第26行）
const { language, transformationShowGods, flyingShowGods, transformationShowCausePalace, transformationHideMinorStars } = useSettingsStore()

// 應該添加：
// const { ..., flyingShowMinorStars } = useSettingsStore()
```

### ❌ **問題 3：雜曜顯示邏輯未區分飛星和四化**
```typescript
// 現在的邏輯（第184行）只針對四化盤面
const shouldShow = !transformationHideMinorStars || chartType !== 'transformation' || keyMinorStars.includes(star.name)

// 應該改為支持飛星的邏輯，例如：
// const shouldShow = !(!flyingShowMinorStars && chartType === 'flying') && 
//                   (!transformationHideMinorStars || chartType !== 'transformation' || keyMinorStars.includes(star.name))
```

---

## 八、下一步實現建議

1. **在 PalaceCard.tsx 中提取 `flyingShowMinorStars` 狀態**
2. **修改雜曜渲染條件邏輯**，支持飛星盤面的隱藏控制
3. **測試確認**：
   - 切換"飛星盤面"→"顯示雜曜"開關，驗證宮位卡片中的輔星是否顯示/隱藏
   - 確保四化盤面的 `transformationHideMinorStars` 邏輯不受影響

---

## 補充：雜曜涵蓋範圍

根據代碼中 `keyMinorStars` 的定義，以下星曜被視為"重要輔星"（四化盤面時優先顯示）：
- 左輔 / 左辅
- 右弼
- 文昌
- 文曲

其他輔星和雜曜（如天魁、天鉞、祿存等）在四化盤面中會被隱藏（如果啟用 `transformationHideMinorStars`）。

