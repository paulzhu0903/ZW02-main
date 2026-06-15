import { getSihuaByGan } from '@/knowledge/sihua'

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const FIRST_MONTH_GAN_MAP: Record<string, string> = {
  '甲': '丙',
  '己': '丙',
  '乙': '戊',
  '庚': '戊',
  '丙': '庚',
  '辛': '庚',
  '丁': '壬',
  '壬': '壬',
  '戊': '甲',
  '癸': '甲',
}

export function getYearGanZhi(year: number): string {
  const gan = HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10]
  const zhi = EARTHLY_BRANCHES[((year - 4) % 12 + 12) % 12]
  return gan + zhi
}

export function extractGan(ganZhi: string): string {
  return ganZhi.charAt(0) || ''
}

export function extractZhi(ganZhi: string): string {
  return ganZhi.charAt(1) || ''
}

export function getFirstMonthGan(year: number): string {
  const yearGan = HEAVENLY_STEMS[((year - 4) % 10 + 10) % 10]
  return FIRST_MONTH_GAN_MAP[yearGan] || '甲'
}

export function getMonthlyGan(year: number, lunarMonth: number): string {
  const firstMonthGan = getFirstMonthGan(year)
  const firstMonthGanIndex = HEAVENLY_STEMS.indexOf(firstMonthGan)
  const monthGanIndex = ((firstMonthGanIndex + lunarMonth - 1) % 10 + 10) % 10
  return HEAVENLY_STEMS[monthGanIndex]
}

export function getMonthlyZhi(lunarMonth: number): string {
  return EARTHLY_BRANCHES[(lunarMonth + 1) % 12]
}

export function getMutagenByGan(gan: string): string[] {
  const sihuaMap = getSihuaByGan(gan)
  if (!sihuaMap) return []

  const result: string[] = []
  const lu = sihuaMap['化禄'] || sihuaMap['化祿']
  const quan = sihuaMap['化权'] || sihuaMap['化權']
  const ke = sihuaMap['化科']
  const ji = sihuaMap['化忌']

  if (lu) result.push(lu)
  if (quan) result.push(quan)
  if (ke) result.push(ke)
  if (ji) result.push(ji)

  return result
}
