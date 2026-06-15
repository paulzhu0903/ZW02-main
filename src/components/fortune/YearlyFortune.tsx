/* ============================================================
   年度运势组件
   基于流年盘分析当年运势
   ============================================================ */

import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'
import { useChartStore, useSettingsStore, useContentCacheStore } from '@/stores'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { extractKnowledge, buildPromptContext } from '@/knowledge'
import { Button, Select } from '@/components/ui'
import { t, type Language } from '@/lib/i18n'
import { getShichenOptions } from '@/lib/astro'
import { PALACE_ORDER, PALACE_NAME_MAP_ZH, PALACE_NAME_TO_ENGLISH_MAP, DECADAL_PALACE_MAP, ANNUAL_PALACE_MAP, NATAL_PALACE_MAP, type FortuneMonthlyAnalysis, type FortuneYearlyDataItem } from '@/components/chart/types'
import { ANNUAL_LABELS, MONTHLY_LABELS, CHINESE_DAY_NAMES, LUNAR_MONTH_DISPLAY_NAMES, LUNAR_MONTH_MAP, SHICHEN_NAMES } from '@/components/chart/utils/types'
import { getMonthlySequenceLabel } from '@/components/chart/utils/lunar'
import { getDecadalPalaceIndex } from '@/components/chart/mutagenLines'
import { toTraditionalChinese } from '@/lib/localize-knowledge'
import { solar2lunar } from 'iztro/lib/calendar'
import { getMonthlyGan, getMonthlyZhi, getYearGanZhi, getMutagenByGan, extractGan, extractZhi } from '@/lib/mutagen'

/* ============================================================
   常数和选项生成
   ============================================================ */

function getGanZhiYear(year: number) {
  return getYearGanZhi(year)
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}月`,
}))

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}日`,
}))

const HOUR_SELECT_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}))

const MINUTE_SELECT_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}))

const SHICHEN_OPTIONS = getShichenOptions().map((option) => ({
  ...option,
  label: toTraditionalChinese(option.label),
}))

/* ============================================================
   日期时间工具函数
   ============================================================ */

/**
 * 获取农历月份的中文表示
 */
function getLunarMonthLabel(month: number | string, isLeap: boolean): string {
  const monthNumber = typeof month === 'number'
    ? month
    : (LUNAR_MONTH_MAP[String(month)] ?? Number(month))
  const label = LUNAR_MONTH_DISPLAY_NAMES[monthNumber - 1] || `${monthNumber}月`
  return isLeap ? `閏${label}` : label
}

/**
 * 获取农历日期的中文表示
 */
function getLunarDayLabel(day: number): string {
  return CHINESE_DAY_NAMES[day - 1] || `${day}日`
}

/**
 * 获取农历时辰的中文表示
 * 遵循 astro.ts hourToTimeIndex 的转换逻辑
 * iztro 时辰: 0=早子(00-01), 1=丑(01-03), ..., 6=午(11-13), 7=未(13-15), ..., 11=亥, 12=晚子(23-00)
 */
function getLunarHourLabel(hour: number): string {
  let shichenIndex: number
  if (hour === 23) {
    shichenIndex = 0  // 晚子时 23:00-00:00
  } else if (hour >= 0 && hour < 1) {
    shichenIndex = 0  // 早子时 00:00-01:00
  } else {
    shichenIndex = Math.floor((hour + 1) / 2)  // 其他时辰
  }
  
  return SHICHEN_NAMES[shichenIndex] || ''
}

function getFlowMonthLabel(year: number, lunarMonth: number, isLeap: boolean = false): string {
  let label = getMonthlySequenceLabel(year, lunarMonth)
  if (isLeap) {
    label = `閏${label}`
  }

  label = label.replace('十一', '冬').replace('十二', '臘')
  return label
}

function getPalaceEnglishKey(name: string): string {
  return PALACE_NAME_TO_ENGLISH_MAP[name.trim()] || ''
}

/**
 * 获取指定月份的流月标籤映射（基于该月份的流月命宮位置）
 */
function getMonthlyLabelsForMonth(
  monthlyData: FortuneMonthlyAnalysis[],
  chart: FunctionalAstrolabe,
  targetMonth: number
): Record<string, string> {
  // 找到目标月份的数据
  const monthData = monthlyData.find(m => m.月份 === targetMonth)
  if (!monthData || monthData.宮位索引 === undefined) {
    return {}
  }

  const flowLifeIndex = monthData.宮位索引
  const result: Record<string, string> = {}

  // 根据流月命宮位置，推导该月份每个宮位的流月標籤
  for (let i = 0; i < 12; i++) {
    const palaceIndex = (flowLifeIndex + i) % 12
    const palaceName = chart.palaces[palaceIndex]?.name
    if (!palaceName) continue

    const monthLabel = MONTHLY_LABELS[i]
    result[palaceName] = monthLabel
  }

  return result
}

/**
 * 生成完整的日期时间信息（西历和农历）
 */
function formatCompleteDateTime(year: number, month: number, day: number, hour: number, minute: number): string {
  const lines: string[] = []
  
  // 西历信息
  lines.push(`【西曆】${year}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`)
  lines.push(`【時間】${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  
  // 农历信息
  try {
    const lunarResult = solar2lunar(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    if (lunarResult) {
      const lunarYear = lunarResult.lunarYear
      const lunarMonth = lunarResult.lunarMonth
      const lunarDay = lunarResult.lunarDay
      const isLeap = lunarResult.isLeapMonth || false
      
      const monthLabel = getLunarMonthLabel(lunarMonth, isLeap)
      const dayLabel = getLunarDayLabel(lunarDay)
      const hourLabel = getLunarHourLabel(hour)
      
      lines.push(`【農曆】${lunarYear}年${monthLabel}${dayLabel}`)
      lines.push(`【農曆時辰】${hourLabel}`)
      lines.push(`【天干地支】${getYearGanZhi(lunarYear)}年 (${getMonthlyGan(lunarYear, lunarMonth)}${getMonthlyZhi(lunarMonth)}月)`)
    }
  } catch (e) {
    console.error('[YearlyFortune] Error converting to lunar:', e)
  }
  
  return lines.join('\n')
}

/* ============================================================
   运势提示词 - 多语言支持，包含流年数据 JSON
   ============================================================ */


/* ============================================================
   月份运势计算函数
   ============================================================ */

function calculateMonthlyScores(
  chart: FunctionalAstrolabe,
  year: number
): FortuneMonthlyAnalysis[] {
  const monthlyScores: FortuneMonthlyAnalysis[] = []
  
  // 基础分数（50分作为中线）
  const baseScore = 50

  try {
    // 先测试一个日期来验证horoscope对象
    const testDate = new Date(`${year}-6-15`)
    const testHoroscope = chart.horoscope(testDate)
    
    if (import.meta.env.DEV) {
      console.log('[calculateMonthlyScores] Test Horoscope:', {
        date: testDate,
        yearly: testHoroscope.yearly,
        monthly: testHoroscope.monthly,
        keys: Object.keys(testHoroscope),
      })
    }
  } catch (e) {
    console.error('[calculateMonthlyScores] Error getting horoscope:', e)
  }

  for (let month = 1; month <= 12; month++) {
    let monthScore = baseScore
    const monthlyMutagens: string[] = []
      let lunarMonthLabel = ''
      let lunarMonthNumber = month
      let lunarYear = year
      let lunarIsLeap = false

      try {
        // 计算流月的日期和干支信息
        const dateString = `${year}-${String(month).padStart(2, '0')}-15`
        const date = new Date(dateString)
        const horoscope = chart.horoscope(date)
        const lunarResult = solar2lunar(dateString)

        if (lunarResult) {
          lunarMonthNumber = lunarResult.lunarMonth || month
          lunarYear = lunarResult.lunarYear || year
          lunarIsLeap = lunarResult.isLeapMonth || false
          lunarMonthLabel = getLunarMonthLabel(lunarMonthNumber, lunarIsLeap)
        }

        // 計算流月天干和地支（使用五虎遁法則，確保準確）
        const monthlyHeavenlyStem = getMonthlyGan(lunarYear, lunarMonthNumber)
        const monthlyEarthlyBranch = getMonthlyZhi(lunarMonthNumber)
        const monthlyMutagenArray = getMutagenByGan(monthlyHeavenlyStem)
      
      for (const star of monthlyMutagenArray) {
        const starName = String(star)
        monthlyMutagens.push(starName)
        
        // 根据四化调整分数
        if (starName.includes('禄') || starName.includes('祿')) {
          monthScore += 15  // 禄星加分最多
        } else if (starName.includes('权') || starName.includes('權')) {
          monthScore += 10  // 权星加分
        } else if (starName.includes('科')) {
          monthScore += 8   // 科星加分
        } else if (starName.includes('忌')) {
          monthScore -= 18  // 忌星减分最多
        }
      }

      // 流年四化对月份的影响 - 使用防御性编码
      const yearlyMutagen = (horoscope.yearly?.mutagen as string[] | string | undefined) || []
      const yearlyMutagenArray = Array.isArray(yearlyMutagen) ? yearlyMutagen : yearlyMutagen ? [yearlyMutagen] : []
      
      for (const star of yearlyMutagenArray) {
        const starName = String(star)
        if (starName.includes('禄') || starName.includes('祿')) {
          monthScore += 5
        } else if (starName.includes('权') || starName.includes('權')) {
          monthScore += 3
        } else if (starName.includes('忌')) {
          monthScore -= 8
        }
      }

      // 归一化分数到 0-100
      monthScore = Math.max(0, Math.min(100, monthScore))

      // 评估等级 - 调整标准使其更合理（基础分50，需要明显高于或低于）
      let evaluation: 'excellent' | 'good' | 'fair' | 'challenging'
      if (monthScore >= 65) {
        evaluation = 'excellent'
      } else if (monthScore >= 55) {
        evaluation = 'good'
      } else if (monthScore >= 45) {
        evaluation = 'fair'
      } else {
        evaluation = 'challenging'
      }

      const monthlyPalace = (horoscope.monthly as any)?.palace
      const monthlyPalaceIndex = (horoscope.monthly as any)?.index
      const monthlyPalaceName = monthlyPalace
        ? String(monthlyPalace)
        : (typeof monthlyPalaceIndex === 'number' && chart.palaces[monthlyPalaceIndex])
          ? String(chart.palaces[monthlyPalaceIndex].name || '')
          : undefined

      monthlyScores.push({
        月份: month,
        分數: Math.round(monthScore),
        流月: lunarMonthLabel ? getFlowMonthLabel(lunarYear, lunarMonthNumber, lunarIsLeap) : undefined,
        流月四化: monthlyMutagens.length > 0 ? monthlyMutagens : undefined,
        評價: evaluation,
        宮位: monthlyPalaceName || undefined,
        宮位索引: typeof monthlyPalaceIndex === 'number' ? monthlyPalaceIndex : undefined,
        天干: monthlyHeavenlyStem,
        地支: monthlyEarthlyBranch,
      })
    } catch (e) {
      console.error(`[calculateMonthlyScores] Error for month ${month}:`, e)
      monthlyScores.push({
        月份: month,
        分數: baseScore,
        評價: 'fair',
      })
    }
  }

  return monthlyScores
}

function getForttunePrompt(language: Language, year?: number, month?: number, day?: number, hour?: number, minute?: number, yearlyData?: FortuneYearlyDataItem[], monthlyAnalysis?: FortuneMonthlyAnalysis[]): string {
  // 生成完整的日期时间信息
  const dateTimeInfo = (year && month && day !== undefined && hour !== undefined && minute !== undefined) 
    ? formatCompleteDateTime(year, month, day, hour, minute)
    : ''
  
  const dateTimeJson = dateTimeInfo ? `\n\n【查詢日期時間】\n${dateTimeInfo}` : ''
  
  const yearlyDataJson = yearlyData ? `\n\n【流年數據】\n${JSON.stringify(yearlyData, null, 2)}` : ''
  
  let monthlyDataJson = ''
  if (monthlyAnalysis) {
    monthlyDataJson = `\n\n【流月數據】\n${JSON.stringify(monthlyAnalysis.map(m => ({
      月份: m.月份,
      流月: m.流月,
      宮位: m.宮位,
      天干: m.天干,
      地支: m.地支,
      四化: m.流月四化,
    })), null, 2)}`
  }

  // 構建論命座標系（借鑑 TimeTableModal 的日期/干支表述）
  let coordinateJson = ''
  if (yearlyData && yearlyData.length > 0) {
    const y = yearlyData[0]

    if (y.宮位列表 && y.宮位列表.length > 0) {
      // 建立宮位索引到月份資料的映射
      const palaceIndexToMonthMap: Record<number, FortuneMonthlyAnalysis> = {}
      monthlyAnalysis?.forEach(monthData => {
        if (typeof monthData.宮位索引 === 'number') {
          palaceIndexToMonthMap[monthData.宮位索引] = monthData
        }
      })

      const lines = y.宮位列表.map((p) => {
        const stemBranch = `${p.天干 || ''}${p.地支 || ''}`.trim()
        const stars = p.主星 && p.主星.length > 0 ? p.主星.join('、') : ''
        const flags: string[] = []
        const eng = PALACE_NAME_TO_ENGLISH_MAP[p.宮位]
        const palaceDisplay = eng ? (language === 'zh-TW' ? toTraditionalChinese(PALACE_NAME_MAP_ZH[eng] || p.宮位) : (PALACE_NAME_MAP_ZH[eng] || p.宮位)) : p.宮位
        if (p.本命) flags.push(typeof p.本命 === 'string' ? p.本命 : (eng ? (NATAL_PALACE_MAP[eng] || '本命') : '本命'))
        if (p.大限) flags.push(typeof p.大限 === 'string' ? p.大限 : (DECADAL_PALACE_MAP[eng || p.宮位] || `大${palaceDisplay.replace('宫', '').replace('宮', '')}`))
        if (p.流年) flags.push(typeof p.流年 === 'string' ? p.流年 : (ANNUAL_PALACE_MAP[eng || p.宮位] || `年${palaceDisplay.replace('宫', '').replace('宮', '')}`))
        const months = p.流月 ? p.流月.join(' ') : ''
        // 根據宮位索引找到對應月份的干支資訊
        const palaceMonthInfo = typeof p.宮位索引 === 'number' ? palaceIndexToMonthMap[p.宮位索引] : undefined
        const monthlyInfo = palaceMonthInfo?.流月 ? palaceMonthInfo.流月 : ''
        return [palaceDisplay, stemBranch, stars, flags.join(' '), months, monthlyInfo].filter(Boolean).join(' ')
      })
      coordinateJson = `\n\n【論命座標系】\n${lines.join('\n')}`
    } else {
      const lunarMonthLabel = month ? `${month}月` : undefined
      const monthlyGanZhi = (year && month) ? `${getMonthlyGan(year, month)}${getMonthlyZhi(month)}` : undefined

      const coordObj: any = {
        宮位: y.流年命宮 || '',
        重要宮位: ['命宮', '疾厄宮', '財帛宮'],
        天干: y.天干 || '',
        地支: y.地支 || '',
        主星: (y.四化 && y.四化.length > 0) ? String(y.四化[0]) : '',
      }

      if (lunarMonthLabel || monthlyGanZhi) {
        coordObj.流月 = lunarMonthLabel ? `${lunarMonthLabel}${monthlyGanZhi ? ' ' + monthlyGanZhi + '月' : ''}` : (monthlyGanZhi ? `${monthlyGanZhi}月` : undefined)
      }

      coordinateJson = `\n\n【論命座標系】\n${JSON.stringify(coordObj, null, 2)}`
    }
  }

  if (language === 'zh-CN') {
    return `# Role
你是一位精通流年推算的紫微斗数专家。根据提供的命盘信息进行解读。在分析流年时，你严格遵循"本命为体，大限为用，流年为应"的原则，运用"限流叠宫"和"流年四化"技法，精准捕捉该年份的吉凶趋势。

# Analysis Logic
1.  **叠宫分析**：推演流年命宫叠入本命/大限何宫，以此判断今年的核心际遇（例如：流年命宫叠本命官禄，主事业变动）。
2.  **四化引动**：重点分析流年天干引发的四化（禄权科忌）落入何宫，指出得失所在。
3.  **时间应期**：结合月令，指出吉凶可能发生的具体时间段。

# Output Format
请严格按照以下结构输出分析报告：

## [年份] 岁次流年运程

### 壹· 年度总象
* **流年定调**：给这一年定一个关键词（如：破局之年、蛰伏之年、开拓之年）。
* **核心际遇**：基于"叠宫"理论，简述今年最核心的关注点是什么（是求财、升迁，还是由于家庭变故分心）。

### 贰· 名利机缘（事业/财运）
* **事业走势**：流年官禄宫分析。是否有升职、跳槽或创业的契机？工作压力源自何处？
* **求财建议**：流年财帛宫分析。适合进取投资还是保守储蓄？是否有意外破耗？

### 叁· 情感与家宅
* **流年姻缘**：流年夫妻宫分析。单身者是否有正缘？已婚者感情是否和睦？
* **家宅平安**：流年田宅与父母宫分析。是否涉及房产变动、装修或长辈健康问题。

### 肆· 月令趋势
* **吉运月份**：基于流月四化分析，指出运势较顺遂的农历月份，适合开展重要事项。
* **注意月份**：指出压力较大或易出问题的农历月份，提示需谨慎行事。

### 伍· 锦囊寄语
* **行事准则**：给出一句针对今年的具体行动建议（如：宜静不宜动，宜守不宜攻）。
* **关键提醒**：关于健康或安全的特别嘱咐。

---
*注：流年运势受多方因素影响，分析仅供参考，切勿执着。*${dateTimeJson}${yearlyDataJson}${monthlyDataJson}`
    + coordinateJson
  } else {
    // zh-TW
    const yearlyDataJsonTw = yearlyData ? `\n\n【流年數據】\n${JSON.stringify(yearlyData.map(item => ({
      基本資料: item.基本資料,
      年份: item.年份,
      流年命宮: item.流年命宮,
      天干: item.天干,
      地支: item.地支,
      四化: item.四化,
    })), null, 2)}` : ''

    let monthlyDataJsonTw = ''
    if (monthlyAnalysis) {
      monthlyDataJsonTw = `\n\n【流月數據】\n${JSON.stringify(monthlyAnalysis.map(m => ({
        月份: m.月份,
        流月: m.流月,
        宮位: m.宮位,
        天干: m.天干,
        地支: m.地支,
        四化: m.流月四化,
      })), null, 2)}`
    }

    return `# Role
你是一位精通流年推算的紫微斗数專家。根據提供的命盤資訊進行解讀。在分析流年時，你嚴格遵循"本命為體，大限為用，流年為應"的原則，運用"限流疊宮"和"流年四化"技法，精準捕捉該年份的吉凶趨勢。

# Analysis Logic
1.  **疊宮分析**：推演流年命宮疊入本命/大限何宮，以此判斷今年的核心際遇（例如：流年命宮疊本命官祿，主事業變動）。
2.  **四化引動**：重點分析流年天干引發的四化（祿權科忌）落入何宮，指出得失所在。
3.  **時間應期**：結合月令，指出吉凶可能發生的具體時間段。指出的月份應該基於計算的月份運勢數據。

# Output Format
請嚴格按照以下結構輸出分析報告：

## [年份] 歲次流年運程

### 壹· 年度總象
* **流年定調**：給這一年定一個關鍵詞（如：破局之年、蟄伏之年、開拓之年）。
* **核心際遇**：基於"疊宮"理論，簡述今年最核心的關注點是什麼（是求財、升遷，還是由於家庭變故分心）。

### 貳· 名利機緣（事業/財運）
* **事業走勢**：流年官祿宮分析。是否有升職、跳槽或創業的契機？工作壓力源自何處？
* **求財建議**：流年財帛宮分析。適合進取投資還是保守儲蓄？是否有意外破耗？

### 叁· 情感與家宅
* **流年姻緣**：流年夫妻宮分析。單身者是否有正緣？已婚者感情是否和睦？
* **家宅平安**：流年田宅與父母宮分析。是否涉及房產變動、裝修或長輩健康問題。

### 肆· 月令趨勢
* **吉運月份**：基於流月四化分析，指出運勢較順遂的農曆月份，適合開展重要事項。
* **注意月份**：指出壓力較大或易出問題的農曆月份，提示需謹慎行事。

### 伍· 錦囊寄語
* **行事準則**：給出一句針對今年的具體行動建議（如：宜靜不宜動，宜守不宜攻）。
* **關鍵提醒**：關於健康或安全的特別囑咐。

---
*注：流年運勢受多方因素影響，分析僅供參考，切勿執著。*${dateTimeJson}${yearlyDataJsonTw}${monthlyDataJsonTw}`
    + coordinateJson
  }
}

/* ------------------------------------------------------------
   Markdown 自定义样式组件
   ------------------------------------------------------------ */

const MarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gold mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-gold/90 mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-medium text-star-light mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-gold font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none space-y-1.5 mb-3 pl-4">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1.5 mb-3 pl-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="relative pl-4 before:content-['◆'] before:absolute before:left-0 before:text-star/60 before:text-xs">
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-gold/40 pl-4 my-3 italic text-text-secondary">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-text-muted not-italic">{children}</em>
  ),
}

/* ------------------------------------------------------------
   构建流年盘详细信息
   ------------------------------------------------------------ */

interface HoroscopeData {
  heavenlyStem: string
  earthlyBranch: string
  mutagen: string[]
  index: number
  palaceNames: string[]
}

interface YearlyContextStarItem {
  name: unknown
  brightness?: unknown
  mutagen?: unknown
}

interface YearlyContextPalace {
  name: unknown
  majorStars: YearlyContextStarItem[]
  minorStars: YearlyContextStarItem[]
  adjectiveStars: Array<{ name: unknown }>
}

interface YearlyContextChart {
  palaces: YearlyContextPalace[]
}

function buildYearlyContext(
  chart: YearlyContextChart,
  horoscope: { yearly: HoroscopeData; decadal: HoroscopeData },
  year: number
): string {
  const lines: string[] = []
  const yearly = horoscope.yearly
  const decadal = horoscope.decadal

  lines.push('【流年盘信息】')
  lines.push('')

  // 流年基础信息
  lines.push('## 流年基础')
  lines.push(`- 流年：${year}年（${yearly.heavenlyStem}${yearly.earthlyBranch}年）`)
  lines.push(`- 流年四化：${yearly.mutagen.join('、')}`)
  
  // 获取流年命宫位置 - 使用 yearly.index
  let yearlyPalaceName = ''
  if (yearly.index !== undefined && yearly.index >= 0 && chart.palaces[yearly.index]) {
    yearlyPalaceName = String(chart.palaces[yearly.index].name || '')
  }
  lines.push(`- 流年命宫位置：${yearlyPalaceName}`)
  lines.push('')

  // 大限信息
  lines.push('## 当前大限')
  lines.push(`- 大限天干：${decadal.heavenlyStem}`)
  lines.push(`- 大限四化：${decadal.mutagen.join('、')}`)
  
  // 获取大限命宫位置 - 使用 decadal.index
  let decadalPalaceName = ''
  if (decadal.index !== undefined && decadal.index >= 0 && chart.palaces[decadal.index]) {
    decadalPalaceName = String(chart.palaces[decadal.index].name || '')
  }
  lines.push(`- 大限命宫位置：${decadalPalaceName}`)
  lines.push('')

  // 流年各宫分析（重点宫位）
  lines.push('## 流年重点宫位星曜')
  const importantPalaces = ['命宫', '父母宫', '福德宫', '田宅宫', '官禄宫', '交友宫', '迁移宫', '疾厄宫', '财帛宫', '子女宫', '兄弟宫', '夫妻宫']

  for (const palaceName of importantPalaces) {
    const palace = chart.palaces.find(p => String(p.name) === palaceName)
    if (!palace) continue

    const majorStarsStr = palace.majorStars.map(s => {
      let str = String(s.name)
      if (s.brightness) str += `(${s.brightness})`
      if (s.mutagen) str += `[${s.mutagen}]`
      return str
    }).join('、') || '无主星'

    const minorStarsStr = palace.minorStars.map(s => {
      let str = String(s.name)
      if (s.mutagen) str += `[${s.mutagen}]`
      return str
    }).join('、')

    const adjectiveStarsStr = (palace.adjectiveStars || []).map(s => String(s.name)).join('、')

    lines.push(`### ${palaceName}`)
    lines.push(`- 主星：${majorStarsStr}`)
    if (minorStarsStr) lines.push(`- 輔星：${minorStarsStr}`)
    if (adjectiveStarsStr) lines.push(`- 雜曜：${adjectiveStarsStr}`)
    lines.push('')
  }

  return lines.join('\n')
}

/* ------------------------------------------------------------
   年度运势组件
   ------------------------------------------------------------ */

export function YearlyFortune() {
  const { chart, birthInfo } = useChartStore()
  const { provider, providerSettings, enableThinking, enableWebSearch, searchApiKey, language } = useSettingsStore()
  const { yearlyFortune, setYearlyFortune, showYearlyFortunePrompt, setShowYearlyFortunePrompt } = useContentCacheStore()
  const currentSettings = providerSettings[provider]

  const currentYear = new Date().getFullYear()

  // 生成年份选项 - 从出生年开始到当前年之后20年
  const generateYearOptions = useCallback(() => {
    if (!birthInfo) return []

    const startYear = birthInfo.year
    const endYear = currentYear + 20  // 包含未来20年
    
    const years = []
    for (let y = startYear; y <= endYear; y++) {
      years.push(y)
    }

    return years.sort((a, b) => b - a)  // 倒序排列，最新的在前
  }, [birthInfo, currentYear])

  const yearOptions = generateYearOptions()
  const defaultYear = yearOptions.includes(currentYear) ? currentYear : (yearOptions.length > 0 ? yearOptions[0] : currentYear)

  const [year, setYear] = useState<number>(defaultYear)
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [day, setDay] = useState<number>(new Date().getDate())
  const [hour, setHour] = useState<number>(new Date().getHours())
  const [minute, setMinute] = useState<number>(new Date().getMinutes())
  const [inputMode, setInputMode] = useState<'solar' | 'ganZhi'>('solar')
  const [fortune, setFortune] = useState(yearlyFortune[defaultYear] || '')
  const [monthlyAnalysis, setMonthlyAnalysis] = useState<FortuneMonthlyAnalysis[] | null>(null)
  const [yearlyData, setYearlyData] = useState<FortuneYearlyDataItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 当出生信息变化时，重置年份为当前年份
  useEffect(() => {
    if (defaultYear > 0 && defaultYear !== year) {
      setYear(defaultYear)
      setFortune(yearlyFortune[defaultYear] || '')
    }
  }, [defaultYear])

  const handleYearInput = useCallback((value: number) => {
    if (birthInfo && value >= birthInfo.year && value <= currentYear + 20) {
      setYear(value)
    }
  }, [birthInfo, currentYear])

  // 组件挂载和年份改变时计算月份分析和流年数据，并从缓存恢复运势
  useEffect(() => {
    if (chart && year && birthInfo) {
      console.log(`[YearlyFortune] useEffect triggered for year ${year}`)
      
      // 从缓存恢复该年份的运势内容（如果有的话）
      if (yearlyFortune[year]) {
        setFortune(yearlyFortune[year])
        console.log(`[YearlyFortune] Restored fortune from cache for year ${year}`)
      } else {
        // 只有当新年份时且缓存中没有时才清空
        setFortune('')
      }
      
      // 计算月份分析
      const analysis = calculateMonthlyScores(chart, year)
      setMonthlyAnalysis(analysis)
      
      // 同时计算流年数据用于预览
      try {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const horoscope = chart.horoscope(new Date(dateStr))
        const yearly = horoscope.yearly
        const heavenlyStem = String(yearly.heavenlyStem || '')
        const earthlyBranch = String(yearly.earthlyBranch || '')
        const mutagens = (yearly.mutagen || []).map(m => String(m))
        
        // 使用 yearly.index 获取流年命宫（正确的宫位索引）
        let flowYearlyPalaceName = ''
        if (yearly.index !== undefined && yearly.index >= 0 && chart.palaces[yearly.index]) {
          flowYearlyPalaceName = String(chart.palaces[yearly.index].name || '')
        }

        // 获取大限命宮（若有）
        let decadalPalaceName = ''
        try {
          const decadal = (horoscope as any).decadal
          if (decadal && decadal.index !== undefined && decadal.index >= 0 && chart.palaces[decadal.index]) {
            decadalPalaceName = String(chart.palaces[decadal.index].name || '')
          }
        } catch (e) {
          decadalPalaceName = ''
        }

        // 本命宮（一般為命宫）
        let natalPalaceName = ''
        try {
          const natalPalace = (chart.palaces || []).find((p: any) => String(p.name) === '命宫')
          if (natalPalace) natalPalaceName = String(natalPalace.name || '')
        } catch (e) {
          natalPalaceName = ''
        }
        
        const birthYearGanZhi = getYearGanZhi(birthInfo.year)
        const birthYearGan = extractGan(birthYearGanZhi)
        const birthYearZhi = extractZhi(birthYearGanZhi)

        const decadalIndex = (horoscope as any).decadal?.index
        const annualIndex = yearly.index
        
        // 计算虚岁和大限号
        const virtualAge = year - birthInfo.year + 1
        const decadalNum = Math.floor((virtualAge - 1) / 10)
        
const monthlyLabelsByPalace = getMonthlyLabelsForMonth(analysis, chart, month)
        const palaceList = (chart.palaces || []).map((p: any, idx: number) => {
          const palaceName = String(p.name || '')
          const palaceIdxKey = String(idx)
          const palaceKey = getPalaceEnglishKey(palaceName)
          const palaceStem = String(p.heavenlyStem || '')
          const palaceBranch = String(p.earthlyBranch || '')
          const mainStars = ((p.majorStars || []).map((s: any) => String(s.name))).filter(Boolean)
          const isNatal = palaceName === '命宫' || palaceName === '命宮'
          const englishName = PALACE_NAME_TO_ENGLISH_MAP[palaceName]
          const natalLabel = englishName ? NATAL_PALACE_MAP[englishName] : (isNatal ? '本命' : undefined)
          
          // 计算大限标签：获得该宫位在大限盘中的对应宫位
          let decadalLabel: string | undefined = undefined
          if (englishName && PALACE_ORDER.includes(englishName) && birthInfo.gender) {
            const palaceIndex = PALACE_ORDER.indexOf(englishName)
            const decadalPalaceIndex = getDecadalPalaceIndex(palaceIndex, decadalNum, birthInfo.gender as 'male' | 'female', birthYearGan)
            const decadalEnglishName = PALACE_ORDER[decadalPalaceIndex]
            decadalLabel = DECADAL_PALACE_MAP[decadalEnglishName]
          }
          
          // 计算流年标签：基于流年命宫位置推导
          let annualLabel: string | undefined = undefined
          if (englishName && PALACE_ORDER.includes(englishName) && yearly.earthlyBranch) {
            const yearlyLifePalace = (chart.palaces || []).find((palace: any) => String(palace.earthlyBranch || palace.branch) === String(yearly.earthlyBranch))
            const yearlyLifeEnglish = yearlyLifePalace ? PALACE_NAME_TO_ENGLISH_MAP[String(yearlyLifePalace.name)] : undefined
            if (yearlyLifeEnglish) {
              const palaceIndex = PALACE_ORDER.indexOf(englishName)
              const lifeIndex = PALACE_ORDER.indexOf(yearlyLifeEnglish)
              if (palaceIndex !== -1 && lifeIndex !== -1) {
                const labelIndex = (palaceIndex - lifeIndex + PALACE_ORDER.length) % PALACE_ORDER.length
                annualLabel = ANNUAL_LABELS[labelIndex]
              }
            }
          }

          const monthLabel = monthlyLabelsByPalace[palaceName]
          const months = monthLabel ? [monthLabel] : undefined

          return {
            宮位: palaceName,
            天干: palaceStem,
            地支: palaceBranch,
            主星: mainStars,
            本命: natalLabel || undefined,
            大限: decadalLabel || undefined,
            流年: annualLabel || undefined,
            流月: months,
            宮位索引: idx,
          }
        })

        const yearlyDataArray: FortuneYearlyDataItem[] = [{
          基本資料: {
            出生年: birthInfo.year,
            年干: birthYearGan,
            年支: birthYearZhi,
          },
          年份: year,
          流年命宮: flowYearlyPalaceName,
          天干: heavenlyStem,
          地支: earthlyBranch,
          四化: mutagens,
          本命宮: natalPalaceName,
          大限命宮: decadalPalaceName,
          宮位列表: palaceList,
        }]
        setYearlyData(yearlyDataArray)
      } catch (e) {
        console.error('[YearlyFortune] Error calculating yearly data:', e)
      }
      
      console.log(`[YearlyFortune] Calculated analysis:`, analysis)
    }
  }, [chart, year, month, day, yearlyFortune, birthInfo])

  const handleAnalyze = useCallback(async () => {
    if (!chart || !birthInfo) return
    if (!currentSettings.apiKey) {
      setError(t('fortune.configureApiLong', language))
      return
    }

    setLoading(true)
    setError(null)
    setFortune('')

    try {
      // 获取流年运限数据
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const horoscope = chart.horoscope(new Date(dateStr))

      console.log('[YearlyFortune] Horoscope Object:', {
        yearly: horoscope.yearly,
        keys: Object.keys(horoscope),
      })
      
      // 获取年龄
      const age = year - birthInfo.year + 1

      // 提取本命盘完整信息
      const knowledge = extractKnowledge(chart, birthInfo.year)
      const natalContext = buildPromptContext(knowledge)

      // 构建流年盘信息
      const yearlyContext = buildYearlyContext(chart, horoscope, year)

      // 准备流年数据 - 直接使用 horoscope.yearly（已在 buildYearlyContext 中验证正确性）
      const yearly = horoscope.yearly
      const heavenlyStem = String(yearly.heavenlyStem || '')
      const earthlyBranch = String(yearly.earthlyBranch || '')
      const mutagens = (yearly.mutagen || []).map(m => String(m))

      // 获取流年命宫 - 使用 yearly.index 正确定位宫位
      let flowYearlyPalaceName = ''
      if (yearly.index !== undefined && yearly.index >= 0 && chart.palaces[yearly.index]) {
        flowYearlyPalaceName = String(chart.palaces[yearly.index].name || '')
      }
      // 获取大限命宮（若有）
      let decadalPalaceName = ''
      try {
        const decadal = (horoscope as any).decadal
        if (decadal && decadal.index !== undefined && decadal.index >= 0 && chart.palaces[decadal.index]) {
          decadalPalaceName = String(chart.palaces[decadal.index].name || '')
        }
      } catch (e) {
        decadalPalaceName = ''
      }

      // 本命宮（一般為命宫）
      let natalPalaceName = ''
      try {
        const natalPalace = (chart.palaces || []).find((p: any) => String(p.name) === '命宫')
        if (natalPalace) natalPalaceName = String(natalPalace.name || '')
      } catch (e) {
        natalPalaceName = ''
      }
      
      // 获取出生年的干支
      const birthYearGanZhi = getYearGanZhi(birthInfo.year)
      const birthYearGan = extractGan(birthYearGanZhi)
      const birthYearZhi = extractZhi(birthYearGanZhi)
      
      console.log('[YearlyFortune] Year Data Debug:', {
        year,
        age,
        heavenlyStem,
        earthlyBranch,
        mutagens,
        flowYearlyPalaceName,
        birthYear: birthInfo.year,
        birthYearGanZhi,
      })
      
      const monthlyData = monthlyAnalysis || calculateMonthlyScores(chart, year)
      if (!monthlyAnalysis) {
        setMonthlyAnalysis(monthlyData)
      }

      const decadalIndex = (horoscope as any).decadal?.index
      const annualIndex = yearly.index
      
      // 计算虚岁和大限号
      const virtualAge = year - birthInfo.year + 1
      const decadalNum = Math.floor((virtualAge - 1) / 10)
      
      const monthlyLabelsByPalace = monthlyData ? getMonthlyLabelsForMonth(monthlyData, chart, month) : {}
      const palaceList = (chart.palaces || []).map((p: any, idx: number) => {
        const palaceName = String(p.name || '')
        const palaceIdxKey = String(idx)
        const palaceStem = String(p.heavenlyStem || '')
        const palaceBranch = String(p.earthlyBranch || '')
        const mainStars = ((p.majorStars || []).map((s: any) => String(s.name))).filter(Boolean)
        const isNatal = palaceName === '命宫' || palaceName === '命宮'
        const englishName = PALACE_NAME_TO_ENGLISH_MAP[palaceName]
        const natalLabel = englishName ? NATAL_PALACE_MAP[englishName] : (isNatal ? '本命' : undefined)
        
        // 计算大限标签：获得该宫位在大限盘中的对应宫位
        let decadalLabel: string | undefined = undefined
        if (englishName && PALACE_ORDER.includes(englishName) && birthInfo.gender) {
          const palaceIndex = PALACE_ORDER.indexOf(englishName)
          const decadalPalaceIndex = getDecadalPalaceIndex(palaceIndex, decadalNum, birthInfo.gender as 'male' | 'female', birthYearGan)
          const decadalEnglishName = PALACE_ORDER[decadalPalaceIndex]
          decadalLabel = DECADAL_PALACE_MAP[decadalEnglishName]
        }
        
        // 计算流年标签：基于流年命宫位置推导
        let annualLabel: string | undefined = undefined
        if (englishName && PALACE_ORDER.includes(englishName) && yearly.earthlyBranch) {
          const yearlyLifePalace = (chart.palaces || []).find((palace: any) => String(palace.earthlyBranch || palace.branch) === String(yearly.earthlyBranch))
          const yearlyLifeEnglish = yearlyLifePalace ? PALACE_NAME_TO_ENGLISH_MAP[String(yearlyLifePalace.name)] : undefined
          if (yearlyLifeEnglish) {
            const palaceIndex = PALACE_ORDER.indexOf(englishName)
            const lifeIndex = PALACE_ORDER.indexOf(yearlyLifeEnglish)
            if (palaceIndex !== -1 && lifeIndex !== -1) {
              const labelIndex = (palaceIndex - lifeIndex + PALACE_ORDER.length) % PALACE_ORDER.length
              annualLabel = ANNUAL_LABELS[labelIndex]
            }
          }
        }

        const monthLabel = monthlyLabelsByPalace[palaceName]
        const months = monthLabel ? [monthLabel] : undefined

        return {
          宮位: palaceName,
          天干: palaceStem,
          地支: palaceBranch,
          主星: mainStars,
          本命: natalLabel || undefined,
          大限: decadalLabel || undefined,
          流年: annualLabel || undefined,
          流月: months,
          宮位索引: idx,
        }
      })

      const yearlyDataArray: FortuneYearlyDataItem[] = [{
        基本資料: {
          出生年: birthInfo.year,
          年干: birthYearGan,
          年支: birthYearZhi,
        },
        年份: year,
        流年命宮: flowYearlyPalaceName,
        天干: heavenlyStem,
        地支: earthlyBranch,
        四化: mutagens,
        本命宮: natalPalaceName,
        大限命宮: decadalPalaceName,
        宮位列表: palaceList,
      }]
      
      // 保存流年数据到 state（用于预览显示）
      setYearlyData(yearlyDataArray)
      
      console.log('[YearlyFortune] Final Yearly Data:', yearlyDataArray)

      const userMessage = `请分析以下命盘的 ${year} 年运势：

## 基本信息
- 出生：${birthInfo.year}年${birthInfo.month}月${birthInfo.day}日
- 性别：${birthInfo.gender === 'male' ? '男' : '女'}
- 五行局：${chart.fiveElementsClass}
- 分析年份：${year}年

${natalContext}

${yearlyContext}

请结合本命盘、流年盘和月份分析数据，给出详细的 ${year} 年运势分析。`

      const messages: ChatMessage[] = [
        { role: 'system', content: getForttunePrompt(language, year, month, day, hour, minute, yearlyDataArray, monthlyData) },
        { role: 'user', content: userMessage },
      ]

      const config: LLMConfig = {
        provider,
        apiKey: currentSettings.apiKey,
        baseUrl: currentSettings.customBaseUrl || undefined,
        model: currentSettings.customModel || undefined,
        enableThinking,
        enableWebSearch,
        searchApiKey: searchApiKey || undefined,
      }

      let fullText = ''
      for await (const token of streamChat(config, messages)) {
        fullText += token
        setFortune(fullText)
      }

      // 保存到全局缓存
      setYearlyFortune(year, fullText)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [chart, birthInfo, year, month, day, hour, minute, provider, currentSettings, enableThinking, enableWebSearch, searchApiKey, setYearlyFortune, language, monthlyAnalysis])

  const handleCopyPrompt = useCallback(() => {
    const prompt = monthlyAnalysis && yearlyData ? getForttunePrompt(language, year, month, day, hour, minute, yearlyData, monthlyAnalysis) : getForttunePrompt(language)
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setError(language === 'zh-TW' ? '複製失敗' : '复制失败')
    })
  }, [monthlyAnalysis, yearlyData, language, year, month, day, hour, minute])

  if (!chart) return null

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* 统一容器 */}
      <div
        className="
          relative p-6 lg:p-8
          bg-gradient-to-br from-white/[0.04] to-transparent
          backdrop-blur-xl border border-white/[0.08] rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        "
      >
        {/* 顶部发光线 */}
        <div
          className="
            absolute top-0 left-1/2 -translate-x-1/2
            w-1/3 h-px
            bg-gradient-to-r from-transparent via-gold/50 to-transparent
          "
        />

        {/* 标题和控制区 */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <h2
              className="
                text-xl lg:text-2xl font-semibold
                bg-gradient-to-r from-gold via-gold-light to-gold
                bg-clip-text text-transparent
              "
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {t('nav.fortune', language)}
            </h2>
          </div>

          {/* 输入模式切换 */}
          <div className="space-y-1.5">
            <span className="text-xs sm:text-sm text-text-secondary font-medium">{t('form.inputMode', language)}</span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputMode('solar')
                  setError(null)
                }}
                className={`
                  rounded-lg sm:rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200
                  ${inputMode === 'solar'
                    ? 'bg-gradient-to-r from-star to-star-dark text-white shadow-[0_4px_20px_rgba(124,58,237,0.25)]'
                    : 'bg-white/[0.04] border border-white/[0.08] text-text-secondary hover:bg-white/[0.08] hover:border-white/[0.12]'
                  }
                `}
              >
                西曆
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('ganZhi')
                  setError(null)
                }}
                className={`
                  rounded-lg sm:rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200
                  ${inputMode === 'ganZhi'
                    ? 'bg-gradient-to-r from-gold to-gold-dark text-night shadow-[0_4px_20px_rgba(245,158,11,0.25)]'
                    : 'bg-white/[0.04] border border-white/[0.08] text-text-secondary hover:bg-white/[0.08] hover:border-white/[0.12]'
                  }
                `}
              >
                干支
              </button>
            </div>
          </div>

          {/* 日期输入 */}
          {inputMode === 'solar' ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <Select
                  options={Array.from({ length: currentYear + 20 - (birthInfo?.year || 1900) + 1 }, (_, i) => ({
                    value: (birthInfo?.year || 1900) + i,
                    label: `${(birthInfo?.year || 1900) + i}年`,
                  })).reverse()}
                  value={year}
                  onChange={(e) => handleYearInput(Number(e.target.value))}
                />
                <Select
                  options={MONTH_OPTIONS}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                />
                <Select
                  options={DAY_OPTIONS}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <Select
                  options={HOUR_SELECT_OPTIONS}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                />
                <Select
                  options={MINUTE_SELECT_OPTIONS}
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-text-muted">{t('form.dateHint', language)}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div>
                <Select
                  options={Array.from({ length: currentYear + 20 - (birthInfo?.year || 1900) + 1 }, (_, i) => {
                    const y = (birthInfo?.year || 1900) + i
                    return {
                      value: y,
                      label: `${y}年 ${getGanZhiYear(y)}`,
                    }
                  }).reverse()}
                  value={year}
                  onChange={(e) => handleYearInput(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <Select
                  options={MONTH_OPTIONS}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                />
                <Select
                  options={DAY_OPTIONS}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <Select
                  options={SHICHEN_OPTIONS}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                />
                <Select
                  options={MINUTE_SELECT_OPTIONS}
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-text-muted">{t('form.lunarDateHint', language)}</p>
            </div>
          )}

          {/* 显示完整日期时间信息 */}
          <div className="p-3 rounded-lg bg-white/[0.08] border border-gold/20">
            <div className="text-xs font-semibold text-gold mb-2">📅 查詢日期時間</div>
            <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words font-mono">
              {formatCompleteDateTime(year, month, day, hour, minute)}
            </pre>
          </div>

          {/* 操作按钮组 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* 显示Prompt按钮 */}
            <button
              type="button"
              onClick={() => setShowYearlyFortunePrompt(!showYearlyFortunePrompt)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap"
            >
              {showYearlyFortunePrompt ? t('fortune.hidePrompt', language) : t('fortune.showPrompt', language)}
            </button>

            {/* 複製提示詞按鈕 */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              disabled={!monthlyAnalysis || !yearlyData}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? t('fortune.copied', language) : t('fortune.copyPrompt', language)}
            </button>

            {/* 开始解读按钮 */}
            <Button
              onClick={handleAnalyze}
              disabled={loading || !currentSettings.apiKey}
              size="sm"
              variant="gold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-night border-t-transparent rounded-full animate-spin" />
                  {t('fortune.analyzing', language)}
                </span>
              ) : t('fortune.view', language)}
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-misfortune/10 text-misfortune text-sm border border-misfortune/20">
            {error}
          </div>
        )}

        {/* Prompt 预览（测试模式）*/}
        {showYearlyFortunePrompt && (
          <div className="mb-6 p-4 rounded-lg bg-white/[0.08] border border-gold/20">
            <div className="text-xs font-semibold text-gold mb-3 uppercase">📋 System Prompt</div>
            <pre className="text-xs text-text-secondary overflow-auto max-h-64 whitespace-pre-wrap break-words font-mono bg-white/5 p-3 rounded">
              {monthlyAnalysis && yearlyData ? getForttunePrompt(language, year, month, day, hour, minute, yearlyData, monthlyAnalysis) : getForttunePrompt(language)}
            </pre>
          </div>
        )}

        {/* 未配置提示 */}
        {!currentSettings.apiKey && !fortune && !showYearlyFortunePrompt && (
          <div className="text-text-muted text-sm py-8 text-center">
            {t('fortune.configureApiLong', language)}
          </div>
        )}

        {/* 未分析提示 */}
        {currentSettings.apiKey && !fortune && !loading && !showYearlyFortunePrompt && (
          <div className="text-text-muted text-sm py-8 text-center">
            {t('fortune.selectYearHint', language)}
          </div>
        )}

        {/* 加载中 */}
        {loading && !fortune && (
          <div className="flex items-center justify-center gap-3 text-text-muted py-12">
            <div className="w-5 h-5 border-2 border-star border-t-transparent rounded-full animate-spin" />
            <span>{t('fortune.analyzingFull', language).replace('{year}', String(year))}</span>
          </div>
        )}

        {/* 运势内容+ Markdown 渲染 */}
        {fortune && (
          <div
            className="
              prose prose-invert max-w-none
              text-text-secondary text-lg lg:text-xl leading-loose
            "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {fortune}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
