# 離心自化線 (Centrifugal Mutagen Lines) 調試指南

## 問題描述
離心實線 (離心自化) 沒有完全出現在命盤上。

## 調試步驟

### 1. 打開瀏覽器開發者工具
- F12 或 右鍵 → 檢查
- 切換到 **Console** 標籤
- 清除舊日誌

### 2. 重新加載應用並輸入出生數據
- 每個命盤生成會輸出調試日誌

### 3. 查看輸出的日誌信息

#### 第一步：查看線條收集日誌

```
[Mutagen] 總共收集到 X 條線，其中離心線 Y 條
[Mutagen] 應顯示的線條: 總共 X 條，離心線 Y 條
```

**問題診斷：**
- 如果離心線數量為 0 → 線條根本未被收集
- 如果離心線數量減少 → 線條被過濾掉（檢查 mutagenDisplay 狀態）

#### 第二步：查看宮位天干查找日誌

```
[Mutagen] 無法找到天干 "甲" 的四化表，宮位: 命
[Mutagen] 無法找到對宮，原宮: 財
```

**問題診斷：**
- 警告日誌表示 SIHUA_BY_GAN 查找失敗
- 檢查 knowledge/sihua/index.ts 中的天干鍵是否正確

#### 第三步：查看線條生成日誌

```
[Mutagen Centrifugal] 命 (甲) → 遷: 紫微 [A] 禄
[Mutagen Centrifugal] 財 (乙) → 事: 天府 [B] 权
```

**問題診斷：**
- 如果沒有看到這些日誌 → 線條未生成
- 如果日誌數量少於預期 → 某些宮位或天干有問題

#### 第四步：查看星耀元素查找日誌

```
[Centrifugal] 成功找到 紫微 in 命
[Centrifugal] 未找到星耀元素: 天府 in 財
[Centrifugal] 可用的星耀: 紫微, 天相, ...
```

**問題診斷：**
- 警告日誌表示星耀元素未在 DOM 中找到
- 檢查 data-star-name 屬性中的星耀名稱是否與線條期望的名稱匹配

### 4. 常見問題排查清單

| 問題 | 症狀 | 檢查項目 |
|------|------|--------|
| 線條未生成 | 無 `[Mutagen Centrifugal]` 日誌 | 1. SIHUA_BY_GAN 鍵值 2. 宮位中的星耀 |
| 星耀未找到 | `[Centrifugal] 未找到星耀元素` | 1. data-star-name 屬性 2. STAR_NAME_MAP 映射 3. 星耀名稱拼寫 |
| 線條被過濾 | 日誌顯示線條但未顯示 | 1. 檢查 Settings Panel 中的 A/B/C/D 開關 2. mutagenDisplay 狀態 |

## 數據結構參考

### SIHUA_BY_GAN 結構
```typescript
SIHUA_BY_GAN = {
  '甲': { '化禄': '紫微', '化权': '天府', '化科': '廉貞', '化忌': '右弼' },
  '乙': { '化禄': '天府', '化权': '紫微', ... },
  // ... 其他天干
}
```

### MutagenLine 結構 (離心自化)
```typescript
{
  fromPalace: '命',        // 源宮位
  toPalace: '遷',          // 對宮
  type: '禄',              // 虛化類型
  color: '#00FF00',        // 線條顏色
  markerColor: '#00FF00',  // 標記顏色
  isSelfCentrifugal: true, // 標記為離心線
  label: 'A',              // A/B/C/D 標籤
  starName: '紫微',        // 星耀名稱
  palaceRow: 0,            // 宮位行
  palaceCol: 0,            // 宮位列
}
```

## 解決方案流程

### 情景 1：線條數量為 0
1. 檢查 SIHUA_BY_GAN 是否正確導入
2. 檢查宮位天干是否與 SIHUA_BY_GAN 的鍵匹配
3. 檢查命盤中是否有相應的星耀

### 情景 2：星耀未找到
1. 在 Chrome DevTools 中檢查 HTML 元素的 data-star-name 屬性
2. 比較實際值與 line.starName
3. 更新 STAR_NAME_MAP（如果需要）

### 情景 3：線條被過濾
1. 打開 Settings Panel
2. 查看 A/B/C/D 開關狀態
3. 確保相應的類型已啟用

## 如何禁用調試日誌

找到以下行並刪除或註解：

**mutagenLines.ts:**
- Line: `console.warn(\`[Mutagen] 無法找到天干...\`)`
- Line: `console.log(\`[Mutagen Centrifugal]...\`)`

**ChartDisplay.tsx:**
- Line: `console.log(\`[Mutagen] 總共收集到...\`)`
- Line: `console.warn(\`[Centrifugal] 未找到星耀元素...\`)`
- Line: `console.log(\`[Centrifugal] 成功找到...\`)`

## 預期輸出示例

```
[Mutagen] 總共收集到 36 條線，其中離心線 12 條
[Mutagen Centrifugal] 命 (甲) → 遷: 紫微 [A] 禄
[Mutagen Centrifugal] 命 (甲) → 遷: 天府 [B] 权
[Mutagen Centrifugal] 命 (甲) → 遷: 廉貞 [C] 科
[Mutagen Centrifugal] 命 (甲) → 遷: 右弼 [D] 忌
[Mutagen] 應顯示的線條: 總共 36 條，離心線 12 條
[Centrifugal] 成功找到 紫微 in 命
[Centrifugal] 成功找到 天府 in 命
[Centrifugal] 成功找到 廉貞 in 命
[Centrifugal] 成功找到 右弼 in 命
```

此時，你應該在命盤上看到四條從命宮的星耀出發的實線。
