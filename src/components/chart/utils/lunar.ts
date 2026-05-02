/**
 * 農曆轉換和計算函數
 */

import {
  EARTHLY_BRANCH_ORDER,
  LUNAR_MONTH_NAMES,
  HEAVENLY_STEMS,
  FIRST_MONTH_GAN_MAP,
  LUNAR_MONTH_MAP
} from './types'

export { 
  CHINESE_DAY_NAMES,
  LUNAR_MONTH_DISPLAY_NAMES,
  LUNAR_MONTH_DISPLAY_NAMES as DISPLAY_MONTH_NAMES,
  EARTHLY_BRANCH_ORDER,
  SHICHEN_NAMES
} from './types'

/**
 * 預先編譯的正則表達式，提升效能
 */
const LUNAR_MONTH_REGEX = /年(闰|閏)?(正|一|二|三|四|五|六|七|八|九|十[一二]?|冬|腊|臘)月/
const TIME_BRANCH_REGEX = /[子丑寅卯辰巳午未申酉戌亥]/

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
  // 西元 4 年為甲子年，使用安全的正數取模運算支援 1900 年以前的年份
  const gan = HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10]
  const zhi = EARTHLY_BRANCH_ORDER[((year - 4) % 12 + 12) % 12]

  return gan + zhi
}

/**
 * 從農曆日期文本提取農曆月份
 * @param lunarDateText - 農曆日期文本，如"庚戌年八月初三"
 * @returns 農曆月份（1-12），未找到返回 null
 */
export function getLunarMonthNumber(lunarDateText: string | undefined): number | null {
  if (!lunarDateText) return null

  const match = lunarDateText.match(LUNAR_MONTH_REGEX)
  const lunarMonthText = match?.[2]
  if (!lunarMonthText) return null

  return LUNAR_MONTH_MAP[lunarMonthText] ?? null
}

/**
 * 從時間文本提取時支（地支）
 * @param timeText - 時間文本，如"未時"或"未"
 * @returns 時支在 EARTHLY_BRANCH_ORDER 中的索引，未找到返回 null
 */
export function getTimeBranchIndex(timeText: string | undefined): number | null {
  if (!timeText) return null

  const match = timeText.match(TIME_BRANCH_REGEX)
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
  const yearGan = HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10]
  return FIRST_MONTH_GAN_MAP[yearGan] || '甲'
}

/**
 * 計算指定月份的天干
 * @param year - 年份
 * @param lunarMonth - 農曆月份（1-12）
 * @returns 月份天干，如"丙"、"丁"等
 */
export function getMonthlyGan(year: number, lunarMonth: number): string {
  const firstMonthGan = getFirstMonthGan(year)
  const firstMonthGanIndex = HEAVENLY_STEMS.indexOf(firstMonthGan as typeof HEAVENLY_STEMS[number])
  
  // 正月是firstMonthGan，後續每月遞進一位天干
  const monthGanIndex = ((firstMonthGanIndex + lunarMonth - 1) % 10 + 10) % 10
  return HEAVENLY_STEMS[monthGanIndex]
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
