# 自化數據擴展實現总结

## 概要
已成功扩展离心自化（離心自化）和向心自化（向心自化）的数据结构，从简单字符串数组扩展为包含完整宫位、星曜、四化类型和标签的对象数组。

## 修改内容

### 1. 新增 SelfMutagenInfo 类型接口 (src/knowledge/index.ts, 第72-79行)
```typescript
export interface SelfMutagenInfo {
  來源宮位: string       // 四化来源宫位
  目標對宮: string       // 目标对宫
  星曜: string           // 被四化的星名
  四化: string           // 四化类型（化禄/化权/化科/化忌）
  代號: 'A' | 'B' | 'C' | 'D' | '?'  // 标签（A/B/C/D）
}
```

### 2. 更新 ChartIndicatorPalaceSummary 类型 (第81-89行)
- `離心自化` 从 `string[]` 改为 `(string | SelfMutagenInfo)[]`
- `向心自化` 从 `string[]` 改为 `(string | SelfMutagenInfo)[]`

### 3. 更新 ChartIndicators 类型中的北派四化重點 (第109-110行)
- `離心自化` 从 `string[]` 改为 `(string | SelfMutagenInfo)[]`
- `向心自化` 从 `string[]` 改为 `(string | SelfMutagenInfo)[]`

### 4. 修改 collectPalaceMutagenHighlights 函数 (第268-327行)
从返回简单字符串数组改为返回完整对象：
```typescript
{
  self: (string | SelfMutagenInfo)[]
  counter: (string | SelfMutagenInfo)[]
}
```

关键改进：
- 收集来源宫位和目标对宫信息
- 正规化宫位名称和星名
- 获取正确的标签（A/B/C/D）
- 使用Set防止重复

### 5. 更新去重逻辑 (第430-453行)
增强 flatMap 和 filter 逻辑以支持对象类型的去重：
- 字符串：使用 indexOf 比较
- 对象：使用 JSON.stringify 进行深度比较

### 6. 更新 buildPromptContext 函数 (第847-860行)
修改 self 和 counter 的格式化逻辑：
```typescript
const selfStr = self
  .map(item => typeof item === 'string' ? item : `${item.星曜}${item.四化}`)
  .join('、')
```

## 數據流

### 离心自化（Self Mutation）
- **定义**: 本宫天干的四化指向本宫内的星
- **特点**: 宫位内部的能量流动
- **來源**: 本宫天干 → 本宫的星
- **例子**: "命宫天干四化指向命宫内的太阳"

### 向心自化（Counter Mutation）
- **定义**: 对宫天干的四化指向本宫内的星
- **特点**: 来自对宫的能量影响
- **來源**: 对宫天干 → 本宫的星
- **例子**: "迁移宫天干四化指向命宫内的太阴"

## 输出示例

### JSON (buildChartIndicators)
```json
{
  "北派四化重點": {
    "離心自化": [
      {
        "來源宮位": "命宫",
        "目標對宮": "迁移",
        "星曜": "太阳",
        "四化": "化禄",
      }
    ],
    "向心自化": [
      {
        "來源宮位": "迁移",
        "目標對宮": "命宫",
        "星曜": "太阴",
        "四化": "化科",
      }
    ]
  }
}
```

### 文本 (buildPromptContext)
```
- 命宫【我宮】：甲子
  主星：紫微、贪狼
  男女星：女
  離心自化：太阳化禄、紫微化权、太阴化科
  向心自化：天同化忌、廉贞化禄
```

## 编译状态
✅ No errors found  
✅ All types properly defined  
✅ Type safety maintained  

## 兼容性
- 保持向后兼容：字段类型为 `(string | SelfMutagenInfo)[]`
- 现有代码中如果只有字符串也能正常使用
- UI 组件需要更新以显示新的对象信息

## 下一步工作（可选）
1. 更新 UI 组件以充分利用新的详细信息
2. 在图表上显示宫位和星名信息
3. 添加自化方向的可视化展示
