import { EARTHLY_BRANCH_ORDER, LUNAR_MONTH_NAMES, PALACE_CLOCKWISE_BRANCHES } from './types'
import { getLunarMonthNumber, getTimeBranchIndex, getMonthlyGan, normalizeIndex } from './lunar'
import type { FunctionalAstrolabe } from '@/lib/astro'
import type { PalaceData, StarData } from '../types'
import { PALACE_BRANCH_INDEX } from '../types'
import { MINOR_STAR_STANDARD_BRIGHTNESS } from '@/lib/brightness'

export { normalizeIndex }

/**
 * 根據出生年地支決定一歲時的小限所在宮位（地支）
 * 規則：
 *  寅、午、戌年生： 一歲在 辰宮
 *  申、子、辰年生： 一歲在 戌宮
 *  巳、酉、丑年生： 一歲在 未宮
 *  亥、卯、未年生： 一歲在 丑宮
 */
export function getSmallLimitStartBranch(birthYearBranch: string): string | null {
  if (!birthYearBranch) return null
  const b = birthYearBranch
  if (['寅', '午', '戌'].includes(b)) return '辰'
  if (['申', '子', '辰'].includes(b)) return '戌'
  if (['巳', '酉', '丑'].includes(b)) return '未'
  if (['亥', '卯', '未'].includes(b)) return '丑'
  return null
}

/**
 * 計算某虛歲（age，虛歲）的小限所在宮位（地支）
 * age: 虛歲（1 為一歲）
 * gender: 'male' 為順時針（順序陣列中往前），'female' 為逆時針（往後）
 */
export function getSmallLimitBranchForAge(birthYearBranch: string, age: number, gender: 'male' | 'female' = 'male'): string | null {
  const start = getSmallLimitStartBranch(birthYearBranch)
  if (!start || !age || age < 1) return null
  const startIndex = PALACE_CLOCKWISE_BRANCHES.indexOf(start as typeof PALACE_CLOCKWISE_BRANCHES[number])
  if (startIndex === -1) return null

  const step = (age - 1) * (gender === 'male' ? 1 : -1)
  const finalIndex = normalizeIndex(startIndex + step)
  return PALACE_CLOCKWISE_BRANCHES[finalIndex]
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


export function getMonthlySequenceByBranch(
  chart: FunctionalAstrolabe,
  palaceData: PalaceData[],
  selectedDecadal: number | null,
  selectedAnnual: number | null,
  selectedAnnualGanZhi: string | null,
  selectedAnnualYear: number | null,
  _monthlyArrangementMethod?: 'yuanYuePositioning' | 'douJun',
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
    
    // 使用斗君法
    const monthlyIndex = normalizeIndex(yearlyIndex - birthLunarMonth + birthTimeBranchIndex + lunarMonth)
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
      brightness: (s.brightness as string) || MINOR_STAR_STANDARD_BRIGHTNESS[s.name as string],
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