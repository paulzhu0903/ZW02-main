/**
 * 農曆轉換和計算函數
 */

// 常數定義
export const EARTHLY_BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] as const
export const PALACE_CLOCKWISE_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const
export const DISPLAY_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'] as const
export const CHINESE_DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'] as const
export const SHICHEN_NAMES = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'] as const

/**
 * 正規化索引到 0-11 範圍
 */
export function normalizeIndex(value: number): number {
  return ((value % 12) + 12) % 12
}

/**
 * 根據年份獲取天干地支
 * @param year - 年份
 * @returns 干支字符串，如"甲寅"
 */
export function getYearGanZhi(year: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  
  const gan = ganList[(year - 1900 + 6) % 10]
  const zhi = zhiList[(year - 1900) % 12]
  
  return gan + zhi
}

/**
 * 從農曆日期文本提取農曆月份
 * @param lunarDateText - 農曆日期文本，如"庚戌年八月初三"
 * @returns 農曆月份（1-12），未找到返回 null
 */
export function getLunarMonthNumber(lunarDateText: string | undefined): number | null {
  if (!lunarDateText) return null

  const match = lunarDateText.match(/年(闰|閏)?(正|一|二|三|四|五|六|七|八|九|十[一二]?|冬|腊|臘)月/)
  const lunarMonthText = match?.[2]
  if (!lunarMonthText) return null

  const monthMap: Record<string, number> = {
    '正': 1, '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9,
    '十': 10,
    '十一': 11, '冬': 11,
    '十二': 12, '腊': 12, '臘': 12,
  }

  return monthMap[lunarMonthText] ?? null
}

/**
 * 從時間文本提取時支（地支）
 * @param timeText - 時間文本，如"未時"或"未"
 * @returns 時支在 EARTHLY_BRANCH_ORDER 中的索引，未找到返回 null
 */
export function getTimeBranchIndex(timeText: string | undefined): number | null {
  if (!timeText) return null

  const match = timeText.match(/[子丑寅卯辰巳午未申酉戌亥]/)
  if (!match) return null

  const index = EARTHLY_BRANCH_ORDER.indexOf(match[0] as typeof EARTHLY_BRANCH_ORDER[number])
  return index >= 0 ? index : null
}

/**
 * 五虎遁法則：根據年份天干計算正月天干
 * @param year - 年份
 * @returns 正月天干，如"丙"、"戊"等
 */
export function getFirstMonthGan(year: number): string {
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
export function getMonthlyGan(year: number, lunarMonth: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const firstMonthGan = getFirstMonthGan(year)
  const firstMonthGanIndex = ganList.indexOf(firstMonthGan)
  
  // 正月是firstMonthGan，後續每月遞進一位天干
  const monthGanIndex = (firstMonthGanIndex + lunarMonth - 1) % 10
  return ganList[monthGanIndex]
}

/**
 * 計算月份序列標籤（格式：正月庚寅月）
 */
export function getMonthlySequenceLabel(year: number, lunarMonth: number): string {
  const monthName = LUNAR_MONTH_NAMES[lunarMonth - 1]
  const monthlyGan = getMonthlyGan(year, lunarMonth)
  const monthlyZhi = EARTHLY_BRANCH_ORDER[(lunarMonth + 1) % 12]
  return `${monthName}月${monthlyGan}${monthlyZhi}月`
}
