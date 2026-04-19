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
import { Button, Input } from '@/components/ui'
import { t, type Language } from '@/lib/i18n'

/* ------------------------------------------------------------
   运势提示词 - 多语言支持，包含流年数据 JSON
   ------------------------------------------------------------ */

interface YearlyDataItem {
  基本資料: {
    出生年: number
    年干: string
    年支: string
  }
  年份: number
  流年命宮: string
  天干: string
  地支: string
  四化: string[]
}

interface MonthlyAnalysis {
  月份: number
  分數: number
  流月四化?: string[]
  評價: 'excellent' | 'good' | 'fair' | 'challenging'
  宮位?: string
  天干?: string
  地支?: string
}

/* ============================================================
   流月干支计算的辅助函数（与 ChartDisplay 保持一致）
   ============================================================ */

/**
 * 五虎遁法則：根據年份天干計算正月天干
 * @param year - 年份
 * @returns 正月天干，如"丙"、"戊"等
 */
function getFirstMonthGan(year: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const yearGan = ganList[(year - 1900 + 6) % 10]
  
  // 五虎遁法則
  const firstMonthMap: Record<string, string> = {
    '甲': '丙', '己': '丙',  // 甲己年起丙寅
    '乙': '戊', '庚': '戊',  // 乙庚年起戊寅
    '丙': '庚', '辛': '庚',  // 丙辛年起庚寅
    '丁': '壬', '壬': '壬',  // 丁壬年起壬寅
    '戊': '甲', '癸': '甲',  // 戊癸年起甲寅
  }
  
  return firstMonthMap[yearGan] || '甲'
}

/**
 * 計算指定月份的天干
 * @param year - 年份
 * @param lunarMonth - 農曆月份（1-12）
 * @returns 月份天干，如"丙"、"丁"等
 */
function getMonthlyGan(year: number, lunarMonth: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const firstMonthGan = getFirstMonthGan(year)
  const firstMonthGanIndex = ganList.indexOf(firstMonthGan)
  
  // 正月是firstMonthGan，後續每月遞進一位天干
  const monthGanIndex = (firstMonthGanIndex + lunarMonth - 1) % 10
  return ganList[monthGanIndex]
}

/**
 * 獲取農曆月份對應的地支
 * @param lunarMonth - 農曆月份（1-12）
 * @returns 地支，如"寅"、"卯"等
 */
function getMonthlyZhi(lunarMonth: number): string {
  const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  // 農曆月份對應地支：正月(寅=index 2)、二月(卯=index 3)...十一月(子=index 0)、十二月(丑=index 1)
  return zhiList[(lunarMonth + 1) % 12]
}

/**
 * 根據天干獲取四化（十干四化規則 - 紫微斗數基本法則）
 * @param gan - 天干，如"甲"、"乙"等
 * @returns 四化陣列 [祿, 權, 科, 忌]
 */
function getMutagenByGan(gan: string): string[] {
  const mutagenMap: Record<string, string[]> = {
    '甲': ['廉貞', '破軍', '武曲', '太陽'],
    '乙': ['天機', '天梁', '紫微', '太陰'],
    '丙': ['天同', '天機', '文昌', '廉貞'],
    '丁': ['太陰', '天同', '天機', '巨門'],
    '戊': ['貪狼', '太陰', '右弼', '天機'],
    '己': ['武曲', '貪狼', '天梁', '文曲'],
    '庚': ['太陽', '武曲', '太陰', '天同'],
    '辛': ['巨門', '太陽', '文曲', '文昌'],
    '壬': ['天梁', '紫微', '左輔', '武曲'],
    '癸': ['破軍', '巨門', '太陰', '貪狼'],
  }
  
  return mutagenMap[gan] || []
}

/**
 * 根据年份获取天干地支
 * @param year - 年份
 * @returns 干支字符串，如"甲寅"
 */
function getYearGanZhi(year: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  
  const gan = ganList[(year - 1900 + 6) % 10]
  const zhi = zhiList[(year - 1900) % 12]
  
  return gan + zhi
}

/**
 * 提取干支中的天干
 * @param ganZhi - 干支字符串
 * @returns 天干（如"甲"）
 */
function extractGan(ganZhi: string): string {
  return ganZhi.charAt(0) || ''
}

/**
 * 提取干支中的地支
 * @param ganZhi - 干支字符串
 * @returns 地支（如"寅"）
 */
function extractZhi(ganZhi: string): string {
  return ganZhi.charAt(1) || ''
}

/* ============================================================
   月份运势计算函数
   ============================================================ */

function calculateMonthlyScores(
  chart: FunctionalAstrolabe,
  year: number
): MonthlyAnalysis[] {
  const monthlyScores: MonthlyAnalysis[] = []
  
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

    try {
      // 计算流月的日期和干支信息
      const date = new Date(`${year}-${String(month).padStart(2, '0')}-15`)
      const horoscope = chart.horoscope(date)

      // 計算流月天干和地支（使用五虎遁法則，確保準確）
      const monthlyHeavenlyStem = getMonthlyGan(year, month)
      const monthlyEarthlyBranch = getMonthlyZhi(month)
      
      // 獲取流月四化 - 根據月份天干使用紫微斗數十干四化規則（iztro 返回值可能不準）
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

      // 获取流月命宮
      const monthlyPalace = (horoscope.monthly as any)?.palace

      monthlyScores.push({
        月份: month,
        分數: Math.round(monthScore),
        流月四化: monthlyMutagens.length > 0 ? monthlyMutagens : undefined,
        評價: evaluation,
        宮位: monthlyPalace ? String(monthlyPalace) : undefined,
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

function getForttunePrompt(language: Language, yearlyData?: YearlyDataItem[], monthlyAnalysis?: MonthlyAnalysis[]): string {
  const yearlyDataJson = yearlyData ? `\n\n【流年数据】\n${JSON.stringify(yearlyData, null, 2)}` : ''
  
  let monthlyDataJson = ''
  if (monthlyAnalysis) {
    monthlyDataJson = `\n\n【流月数据】\n${JSON.stringify(monthlyAnalysis.map(m => ({
      月份: m.月份,
      宮位: m.宮位,
      天干: m.天干,
      地支: m.地支,
      四化: m.流月四化,
    })), null, 2)}`
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
*注：流年运势受多方因素影响，分析仅供参考，切勿执着。*${yearlyDataJson}${monthlyDataJson}`
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
*注：流年運勢受多方因素影響，分析僅供參考，切勿執著。*${yearlyDataJsonTw}${monthlyDataJsonTw}`
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
  const [fortune, setFortune] = useState(yearlyFortune[defaultYear] || '')
  const [monthlyAnalysis, setMonthlyAnalysis] = useState<MonthlyAnalysis[] | null>(null)
  const [yearlyData, setYearlyData] = useState<YearlyDataItem[] | null>(null)
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

  const handleYearInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    if (input === '') {
      return
    }
    
    const inputYear = parseInt(input, 10)
    
    // 验证年份是否在有效范围内
    if (!isNaN(inputYear) && birthInfo && inputYear >= birthInfo.year && inputYear <= currentYear + 20) {
      setYear(inputYear)
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
        const horoscope = chart.horoscope(new Date(`${year}-6-15`))
        const yearly = horoscope.yearly
        const heavenlyStem = String(yearly.heavenlyStem || '')
        const earthlyBranch = String(yearly.earthlyBranch || '')
        const mutagens = (yearly.mutagen || []).map(m => String(m))
        
        // 使用 yearly.index 获取流年命宫（正确的宫位索引）
        let flowYearlyPalaceName = ''
        if (yearly.index !== undefined && yearly.index >= 0 && chart.palaces[yearly.index]) {
          flowYearlyPalaceName = String(chart.palaces[yearly.index].name || '')
        }
        
        const birthYearGanZhi = getYearGanZhi(birthInfo.year)
        const birthYearGan = extractGan(birthYearGanZhi)
        const birthYearZhi = extractZhi(birthYearGanZhi)
        
        const yearlyDataArray: YearlyDataItem[] = [{
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
        }]
        setYearlyData(yearlyDataArray)
      } catch (e) {
        console.error('[YearlyFortune] Error calculating yearly data:', e)
      }
      
      console.log(`[YearlyFortune] Calculated analysis:`, analysis)
    }
  }, [chart, year, yearlyFortune, birthInfo])

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
      const horoscope = chart.horoscope(new Date(`${year}-6-15`))

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
      
      const yearlyDataArray: YearlyDataItem[] = [{
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
      }]
      
      // 保存流年数据到 state（用于预览显示）
      setYearlyData(yearlyDataArray)
      
      console.log('[YearlyFortune] Final Yearly Data:', yearlyDataArray)

      // 计算月份分析
      let monthlyData = monthlyAnalysis
      if (!monthlyData) {
        monthlyData = calculateMonthlyScores(chart, year)
        setMonthlyAnalysis(monthlyData)
      }

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
        { role: 'system', content: getForttunePrompt(language, yearlyDataArray, monthlyData) },
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
  }, [chart, birthInfo, year, provider, currentSettings, enableThinking, enableWebSearch, searchApiKey, setYearlyFortune, language, monthlyAnalysis])

  const handleCopyPrompt = useCallback(() => {
    const prompt = monthlyAnalysis && yearlyData ? getForttunePrompt(language, yearlyData, monthlyAnalysis) : getForttunePrompt(language)
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setError(language === 'zh-TW' ? '複製失敗' : '复制失败')
    })
  }, [monthlyAnalysis, yearlyData, language])

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* 年份选择 - 输入框 */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={year}
                onChange={handleYearInput}
                placeholder={String(currentYear)}
                min={birthInfo?.year || 1900}
                max={currentYear + 20}
                className="w-20 text-center"
                style={{ fontSize: '13px' }}
              />
              <span className="text-text-muted text-xs sm:text-xs">年</span>
            </div>

            {/* 显示Prompt按钮 */}
            <button
              type="button"
              onClick={() => setShowYearlyFortunePrompt(!showYearlyFortunePrompt)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap"
            >
              {showYearlyFortunePrompt ? t('fortune.hidePrompt', language) : t('fortune.showPrompt', language)}
            </button>

            {/* 複製提示詞按鈕 */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              disabled={!monthlyAnalysis || !yearlyData}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
              {monthlyAnalysis && yearlyData ? getForttunePrompt(language, yearlyData, monthlyAnalysis) : getForttunePrompt(language)}
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
