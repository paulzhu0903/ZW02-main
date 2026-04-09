# 四柱天干地支信息搜索结果

## 📋 搜索日期：2026年4月5日

---

## 1️⃣ FunctionalAstrolabe 对象的四柱相关属性

### 主要属性（来自 iztro v2.5.4）

| 属性名 | 类型 | 说明 | 中文显示 | 使用文件 |
|--------|------|------|---------|---------|
| `chineseDate` | `string` | 四柱干支信息（年月日时完整干支） | "干支" | ChartDisplay.tsx |
| `lunarDate` | `string` | 农历日期多格式信息（如"一九七〇年八月初三"） | "农历" | ChartDisplay.tsx |
| `time` | `string` | 时辰名称（如"子时"、"午时"） | "時間" | ChartDisplay.tsx |
| `timeRange` | `string` | 时辰时间范围（如"00:00-02:00"） | - | ChartDisplay.tsx |
| `fiveElementsClass` | `string` | 五行局名称（如"金三局"、"水二局"） | "五行局" | ChartDisplay.tsx |
| `soul` | `string` | 命主星曜名称 | "命主" | ChartDisplay.tsx |
| `body` | `string` | 身主星曜名称 | "身主" | ChartDisplay.tsx |
| `zodiac` | `string` | 十二生肖（如"鼠"、"虎"） | "生肖" | ChartDisplay.tsx |
| `sign` | `string` | 西方星座（如"白羊座"） | "星座" | ChartDisplay.tsx |
| `palaces` | `Array` | 十二宫位数组 | - | fortune-score.ts |

---

## 2️⃣ 四柱实际访问方式

### 从 chineseDate 提取四柱信息

```typescript
// 在 ChartDisplay.tsx 中的实现
const yearGanZhi = chart.chineseDate?.split(' ')[0] || ''  // 获取年柱干支

// 示例：
// chart.chineseDate = "甲辰 丙子 己卯 丁酉"
// 分解后：
//   - 年柱: 甲辰
//   - 月柱: 丙子
//   - 日柱: 己卯
//   - 时柱: 丁酉
```

### 从宫位对象获取天干地支

```typescript
// 在 knowledge/index.ts 中的实现
for (const palace of palaces) {
  const palaceName = String(palace.name)
  const heavenlyStem = String(palace.heavenlyStem || '')  // 宫天干
  const earthlyBranch = String(palace.earthlyBranch || '')  // 宫地支
}
```

---

## 3️⃣ Chart 对象可用属性完整列表

### 基础信息属性
- ✅ `chineseDate` - 四柱干支
- ✅ `lunarDate` - 农历日期
- ✅ `time` - 时辰名称
- ✅ `timeRange` - 时辰时间段
- ✅ `zodiac` - 生肖
- ✅ `sign` - 星座

### 命理信息属性
- ✅ `fiveElementsClass` - 五行局
- ✅ `soul` - 命主
- ✅ `body` - 身主

### 宫位相关属性
- ✅ `palaces` - 宫位数组
  - `palaces[0].name` - 宫位名（如"命宫"）
  - `palaces[0].heavenlyStem` - 宫天干
  - `palaces[0].earthlyBranch` - 宫地支
  - `palaces[0].majorStars` - 主星数组
  - `palaces[0].minorStars` - 辅星数组
  - `palaces[0].adjectiveStars` - 杂曜数组
  - `palaces[0].decadal` - 大限信息 { range: [number, number] }
  - `palaces[0].boshi12` - 博士十二神
  - `palaces[0].changsheng12` - 长生十二神
  - `palaces[0].isBodyPalace` - 是否为身宫

---

## 4️⃣ 代码片段参考

### 片段 1：在 ChartDisplay.tsx 中提取年柱纳音

```typescript
// src/components/chart/ChartDisplay.tsx (第 585-598 行)
function CenterInfo({ chart, solarDate, gender, language }: CenterInfoProps) {
  // 计算年柱纳音
  const yearGanZhi = chart.chineseDate?.split(' ')[0] || ''
  const nayin = getNayin(yearGanZhi)

  // 获取生年天干用于判断阴阳
  const yearGan = yearGanZhi.charAt(0) // 第一个字是天干
  const yangGanList = ['甲', '丙', '戊', '庚', '壬']
  const isYangGan = yangGanList.includes(yearGan)
}
```

### 片段 2：纳音五行表（60甲子对照）

```typescript
// src/components/chart/ChartDisplay.tsx (第 38-44 行)
const NAYIN_TABLE: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金', // ... 更多条目
}

function getNayin(ganZhi: string): string {
  return NAYIN_TABLE[ganZhi] || ''
}
```

### 片段 3：在 knowledge/index.ts 中提取宫位天干地支

```typescript
// src/knowledge/index.ts (第 87-128 行)
export function extractKnowledge(chart: FunctionalAstrolabe, birthYear?: number): KnowledgeContext {
  const palaces = chart.palaces || []

  for (const palace of palaces) {
    const palaceName = String(palace.name)
    const stem = String(palace.heavenlyStem || '')      // 宫天干
    const branch = String(palace.earthlyBranch || '')   // 宫地支
    const majorStars = palace.majorStars || []
    const minorStars = palace.minorStars || []
    const decadal = palace.decadal as { range?: [number, number] } | undefined
    
    // 构建宫位数据
    const palaceData: PalaceData = {
      name: palaceName,
      stem: stem,
      majorStars: majorStarsData,
      minorStars: minorStarsData,
      adjectiveStars: adjectiveStarsData,
      isBodyPalace: !!palace.isBodyPalace,
      decadalRange: decadal?.range ? `${decadal.range[0]}-${decadal.range[1]}` : undefined,
    }
  }
}
```

### 片段 4：四化飞行表（根据天干查询化星）

```typescript
// src/components/chart/ChartDisplay.tsx (第 223-238 行)
function calculateMutagenDestination(stem: string, mutagen: string): string | null {
  const mutagenStarMap: Record<string, Record<string, string>> = {
    '甲': { '禄': '廉贞', '权': '破军', '科': '武曲', '忌': '太阳' },
    '乙': { '禄': '天机', '权': '天梁', '科': '紫微', '忌': '太阴' },
    '丙': { '禄': '天同', '权': '天机', '科': '文昌', '忌': '廉贞' },
    // ... 更多天干对应的化星
    '癸': { '禄': '破军', '权': '巨门', '科': '太阴', '忌': '贪狼' },
  }
  return mutagenStarMap[stem]?.[mutagen] || null
}
```

### 片段 5：使用 horoscope() 获取流年信息

```typescript
// src/knowledge/index.ts (第 200-210 行)
if (birthYear) {
  const currentYear = new Date().getFullYear()
  for (let year = currentYear - 10; year <= currentYear + 5; year++) {
    try {
      const horoscope = chart.horoscope(new Date(`${year}-6-15`))
      const yearly = horoscope.yearly
      
      context.流年.push({
        year,
        stem: String(yearly.heavenlyStem || ''),      // 流年天干
        branch: String(yearly.earthlyBranch || ''),   // 流年地支
        mutagens: (yearly.mutagen || []).map(m => String(m)),
      })
    } catch {
      // 忽略计算错误
    }
  }
}
```

---

## 5️⃣ 四柱干支信息关键发现

### 📌 年柱干支 (Year Pillar)
- **源属性**: `chart.chineseDate`
- **提取方式**: `chart.chineseDate.split(' ')[0]`
- **格式示例**: "甲辰"、"乙巳"、"丙午"
- **用途**: 
  - 计算纳音五行（通过 NAYIN_TABLE 对照）
  - 判断生年阴阳（第一个字为天干）
  - 生成大运干支

### 📌 月柱干支 (Month Pillar)
- **源属性**: `chart.chineseDate`（第二个空格分割元素）
- **格式示例**: "丙子"、"丁丑"
- **说明**: 根据农历月份确定，与月律有关

### 📌 日柱干支 (Day Pillar)
- **源属性**: `chart.chineseDate`（第三个空格分割元素）
- **格式示例**: "己卯"、"庚辰"
- **说明**: 根据农历日期确定

### 📌 时柱干支 (Hour Pillar)
- **源属性**: `chart.chineseDate`（第四个空格分割元素）
- **对应属性**: `chart.time` (时辰名称)、`chart.timeRange` (时间范围)
- **格式示例**: "丁酉"、"戊戌"
- **说明**: 根据出生时辰确定，12个时辰对应12地支

### 📌 国际化翻译
```typescript
// i18n.ts 中的翻译键名
'chart.ganZhi': '干支'        // 显示整个四柱
'chart.time': '时间'          // 显示时辰
'chart.lunarCalendar': '农历'  // 显示农历信息
```

---

## 6️⃣ iztro 版本与依赖

```json
{
  "iztro": "^2.5.4",
  "name": "app",
  "dependencies": {
    "date-fns": "^4.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  }
}
```

**主要导入**:
```typescript
import { astro } from 'iztro'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
```

**配置标准**:
- 年分界: 正月初一 (yearDivide: normal)
- 运限分界: 正月初一 (horoscopeDivide: normal)
- 子初换日: 23:00 即换日 (dayDivide: forward)
- 安星法: 中州派 (algorithm: zhongzhou)

---

## 7️⃣ 没有直接找到的属性

❌ `dayGan`, `dayBranch` - 不存在这样的属性
❌ `monthGan`, `monthBranch` - 不存在这样的属性
❌ `yearGan`, `yearBranch` - 需要从 `chineseDate` 分割获取
❌ `monthStem`, `monthBranch` - 需要从 `chineseDate` 分割获取

**✅ 建议**: 所有四柱信息都应该从 `chart.chineseDate` 字符串中分割获取，这是 iztro 库的标准做法。

---

## 📁 相关文件清单

| 文件路径 | 相关内容 | 行号范围 |
|---------|---------|---------|
| [src/lib/astro.ts](src/lib/astro.ts) | iztro 封装配置、FunctionalAstrolabe 类型导出 | 1-100 |
| [src/components/chart/ChartDisplay.tsx](src/components/chart/ChartDisplay.tsx) | 四柱显示、纳音计算、宫位解析 | 38-950 |
| [src/lib/fortune-score.ts](src/lib/fortune-score.ts) | LifetimeKLinePoint 中的 ganZhi 属性 | 45-100 |
| [src/knowledge/index.ts](src/knowledge/index.ts) | 四柱信息提取、horoscope 使用 | 1-300 |
| [src/lib/i18n.ts](src/lib/i18n.ts) | 干支显示的多语言翻译 | 95-252 |
| [src/components/kline/LifeKLine.tsx](src/components/kline/LifeKLine.tsx) | 显示 ganZhi 信息的生命曲线 | 59 |

---

## 🎯 快速参考代码片段

### 提取所有四柱干支
```typescript
const chineseDate = chart.chineseDate  // "甲辰 丙子 己卯 丁酉"
const [yearGanZhi, monthGanZhi, dayGanZhi, hourGanZhi] = chineseDate.split(' ')

console.log({
  年柱: yearGanZhi,    // "甲辰"
  月柱: monthGanZhi,   // "丙子"
  日柱: dayGanZhi,     // "己卯"
  时柱: hourGanZhi,    // "丁酉"
})
```

### 获取宫位天干地支
```typescript
const palace = chart.palaces[0]  // 获取第一个宫位（通常是命宫）
const stem = palace.heavenlyStem   // 宫天干
const branch = palace.earthlyBranch  // 宫地支
console.log(`${stem}${branch}`)  // 宫干支组合
```

### 计算纳音五行
```typescript
const yearGanZhi = chart.chineseDate.split(' ')[0]
const nayin = NAYIN_TABLE[yearGanZhi]  // 获取年柱纳音
console.log(nayin)  // "海中金"、"炉中火" 等
```

---

## 📚 总结

✅ **已确认**: chart 对象包含完整的四柱干支信息  
✅ **获取方式**: 通过 `chart.chineseDate` 字符串分割获取  
✅ **宫位信息**: 每个宫位都有独立的 `heavenlyStem` 和 `earthlyBranch`  
✅ **运势信息**: 通过 `chart.horoscope()` 方法获取流年/流月/流日四柱  
✅ **文档化**: 所有属性都在代码注释中有说明  

⚠️ **注意**: iztro 库通过 `chineseDate` 字符串存储四柱信息，需要手动分割处理

