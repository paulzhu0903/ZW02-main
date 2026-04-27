/**
 * 命盤輔助函數
 */

import { EARTHLY_BRANCH_ORDER, LUNAR_MONTH_MAP, LUNAR_MONTH_NAMES, PALACE_CLOCKWISE_BRANCHES, HEAVENLY_STEMS, FIRST_MONTH_GAN_MAP } from './chartConstants'
import type { FunctionalAstrolabe, BirthInfo } from '@/lib/astro'
import type { PalaceData, StarData } from '../types'
import { PALACE_BRANCH_INDEX, PALACE_POSITIONS, PALACE_ORDER, PALACE_NAME_TO_ENGLISH_MAP } from '../types'

/**
 * 根據年份獲取天干地支
 * @param year - 年份
 * @returns 干支字符串，如"甲寅"
 */
export function getYearGanZhi(year: number): string {
  const ganList = HEAVENLY_STEMS
  const zhiList = EARTHLY_BRANCH_ORDER
  
  const gan = ganList[(year - 1900 + 6) % 10]
  const zhi = zhiList[(year - 1900) % 12]
  
  return gan + zhi
}

export function normalizeIndex(value: number): number {
  return ((value % 12) + 12) % 12
}

export function getLunarMonthNumber(lunarDateText: string | undefined): number | null {
  if (!lunarDateText) return null

  const match = lunarDateText.match(/年(闰|閏)?(正|一|二|三|四|五|六|七|八|九|十[一二]?|冬|腊|臘)月/)
  const lunarMonthText = match?.[2]
  if (!lunarMonthText) return null

  return LUNAR_MONTH_MAP[lunarMonthText] ?? null
}

export function hasDirection(mark: '得' | '失' | '得失' | undefined, target: '得' | '失'): boolean {
  if (!mark) return false
  if (mark === '得失') return true
  return mark === target
}

export function getSanFangSiZhengBranches(selectedBranch: string): {
  sanFang: string[]
  siZheng: string[]
} {
  const indexToBranch = PALACE_CLOCKWISE_BRANCHES
  const branchIndex = PALACE_BRANCH_INDEX[selectedBranch]

  if (branchIndex === undefined) {
    return { sanFang: [], siZheng: [] }
  }

  const trine1 = indexToBranch[(branchIndex + 4) % 12]
  const trine2 = indexToBranch[(branchIndex + 8) % 12]
  const opposite = indexToBranch[(branchIndex + 6) % 12]
  const forward3 = indexToBranch[(branchIndex + 3) % 12]
  const backward3 = indexToBranch[(branchIndex + 9) % 12]

  return {
    sanFang: [selectedBranch, trine1, trine2],
    siZheng: [selectedBranch, opposite, forward3, backward3],
  }
}

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
  const ganList = HEAVENLY_STEMS
  const yearGan = ganList[(year - 1900 + 6) % 10]
  
  return FIRST_MONTH_GAN_MAP[yearGan] || '甲'
}

/**
 * 計算指定月份的天干
 * @param year - 年份
 * @param lunarMonth - 農曆月份（1-12）
 * @returns 月份天干，如"丙"、"丁"等
 */
export function getMonthlyGan(year: number, lunarMonth: number): '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸' {
  const ganList = HEAVENLY_STEMS
  const firstMonthGan = getFirstMonthGan(year)
  const firstMonthGanIndex = ganList.indexOf(firstMonthGan as typeof ganList[0])
  
  const monthGanIndex = (firstMonthGanIndex + lunarMonth - 1) % 10
  return ganList[monthGanIndex] as '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'
}

export function getMonthlySequenceByBranch(
  chart: FunctionalAstrolabe,
  palaceData: PalaceData[],
  selectedDecadal: number | null,
  selectedAnnual: number | null,
  selectedAnnualGanZhi: string | null,
  selectedAnnualYear: number | null,
  monthlyArrangementMethod: 'yuanYuePositioning' | 'douJun' = 'yuanYuePositioning',
): Record<string, string[]> {
  if (selectedDecadal === null || selectedAnnual === null || !selectedAnnualGanZhi || selectedAnnualYear === null) return {}

  const birthLunarMonth = getLunarMonthNumber((chart as any).lunarDate)
  const birthTimeBranchIndex = getTimeBranchIndex((chart as any).time)

  if (birthLunarMonth === null || birthTimeBranchIndex === null) return {}

  const yearlyBranch = selectedAnnualGanZhi.slice(-1)
  const yearlyIndex = PALACE_BRANCH_INDEX[yearlyBranch] ?? -1

  if (yearlyIndex < 0) return {}

  const monthlyMap: Record<string, string[]> = {}

  LUNAR_MONTH_NAMES.forEach((monthName, idx) => {
    const lunarMonth = idx + 1
    
    let monthlyIndex: number
    
    if (monthlyArrangementMethod === 'yuanYuePositioning') {
      const firstMonthIndex = normalizeIndex(yearlyIndex + birthTimeBranchIndex - birthLunarMonth)
      monthlyIndex = normalizeIndex(firstMonthIndex + lunarMonth - 1)
    } else {
      monthlyIndex = normalizeIndex(yearlyIndex - birthLunarMonth + birthTimeBranchIndex + lunarMonth)
    }
    
    const targetPalace = palaceData.find((palace) => (PALACE_BRANCH_INDEX[palace.branch] ?? -1) === monthlyIndex)

    if (targetPalace) {
      if (!monthlyMap[targetPalace.branch]) {
        monthlyMap[targetPalace.branch] = []
      }
      
      const monthlyGan = getMonthlyGan(selectedAnnualYear, lunarMonth)
      const monthlyZhi = EARTHLY_BRANCH_ORDER[(lunarMonth + 1) % 12]
      const monthlyGanZhi = `${monthlyGan}${monthlyZhi}`
      
      monthlyMap[targetPalace.branch].push(`${monthName}月${monthlyGanZhi}月`)
    }
  })

  return monthlyMap
}

export function parsePalaces(chart: FunctionalAstrolabe): PalaceData[] {
  return (chart.palaces || []).map((palace) => {
    const stem = palace.heavenlyStem as string
    
    const majorStars: StarData[] = (palace.majorStars || []).map((s) => ({
      name: s.name as string,
      brightness: s.brightness as string | undefined,
      mutagen: s.mutagen as string | undefined,
      palaceStem: stem,
    }))

    const minorStars: StarData[] = (palace.minorStars || []).map((s) => ({
      name: s.name as string,
      brightness: s.brightness as string | undefined,
      mutagen: s.mutagen as string | undefined,
      palaceStem: stem,
    }))

    const adjectiveStars: string[] = ((palace as any).adjectiveStars || []).map(
      (s: any) => s.name as string
    )

    return {
      name: palace.name as string,
      stem,
      branch: palace.earthlyBranch as string,
      majorStars,
      minorStars,
      adjectiveStars,
      decadal: palace.decadal as { range: [number, number] },
      boshi12Deity: palace.boshi12 as string || '',
      longlifeDeity: palace.changsheng12 as string || '',
      isLife: palace.name === '命宫',
      isBody: palace.isBodyPalace === true,
      isCausePalace: false,
    }
  })
}

export function getDefaultDecadalAnnualSelection(
  chart: FunctionalAstrolabe,
  birthYear: number,
  currentYear: number,
): { decadal: number; annual: number } {
  const decadalData = parsePalaces(chart)
    .filter((p) => p.decadal?.range)
    .map((p) => ({
      ageStart: p.decadal.range[0],
      ageEnd: p.decadal.range[1],
    }))
    .sort((a, b) => a.ageStart - b.ageStart)

  if (decadalData.length === 0) {
    return { decadal: 0, annual: 0 }
  }

  const currentAge = currentYear - birthYear + 1
  let decadalIndex = decadalData.findIndex((item) => currentAge >= item.ageStart && currentAge <= item.ageEnd)

  if (decadalIndex < 0) {
    decadalIndex = currentAge < decadalData[0].ageStart ? 0 : decadalData.length - 1
  }

  const target = decadalData[decadalIndex]
  const maxAnnualOffset = Math.max(0, target.ageEnd - target.ageStart)
  const annualIndex = Math.max(0, Math.min(currentAge - target.ageStart, maxAnnualOffset))

  return { decadal: decadalIndex, annual: annualIndex }
}
