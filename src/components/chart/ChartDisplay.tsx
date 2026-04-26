/* ============================================================
   命盤可视化组件
   對齊文墨天機標準：
   - 完整星曜 + 亮度（廟旺平陷）
   - 宮干 + 大限範圍
   - 博士/長生十二神 + 杂曜
   - 命主/身主 + 纳音五行
   ============================================================ */

import { useState, useEffect, useRef } from 'react'
import { useChartStore, useSettingsStore } from '@/stores'
import { getChineseVariantCandidates } from '@/lib/localize-knowledge'
import type { FunctionalAstrolabe, BirthInfo } from '@/lib/astro'
import { calculateSolarTime, generateChart } from '@/lib/astro'
import { SIHUA_BY_GAN } from '@/knowledge/sihua'
import { 
  type PalaceData, 
  type StarData,
  PALACE_POSITIONS, 
  PALACE_BRANCH_INDEX,
  PALACE_ORDER,
  PALACE_NAME_TO_ENGLISH_MAP,
  MUTAGEN_COLORS,
  type StarTagProps,
} from './types'
import {
  getPalaceEdgePointTowardCenterWithDOM,
  getCenterBoundaryPointForPalace,
  collectMutagenLines,
  markSelfMutagens,
  markCausePalace,
  getMutagenType,
} from './mutagenLines'
import { MutagenControls } from './MutagenControls'
import { PalaceHintBubble } from './Bubble'
import { TimeTableModal } from './TimeTableModal' // 時間表查詢模態框
import { DottedArcLayer } from './DottedArcLayer'
import { HoverHint } from '@/components/ui'

// 模块化组件和函数导入
import { PalaceCard } from './components/PalaceCard'
import { CenterInfo } from './components/CenterInfo'
import { DecadalAnnualMonthlyTable } from './components/DecadalAnnualMonthlyTable'
import { getMonthlySequenceLabel } from './utils/lunar'


/* ============================================================
   辅助函数
   ============================================================ */

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

const EARTHLY_BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] as const
const PALACE_CLOCKWISE_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const
const CHINESE_DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'] as const
const SHICHEN_NAMES = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'] as const

function normalizeIndex(value: number): number {
  return ((value % 12) + 12) % 12
}

function getLunarMonthNumber(lunarDateText: string | undefined): number | null {
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

function hasDirection(mark: '得' | '失' | '得失' | undefined, target: '得' | '失'): boolean {
  if (!mark) return false
  if (mark === '得失') return true
  return mark === target
}

function getSanFangSiZhengBranches(selectedBranch: string): {
  sanFang: string[]
  siZheng: string[]
} {
  const indexToBranch = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
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

function getTimeBranchIndex(timeText: string | undefined): number | null {
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

function getMonthlySequenceByBranch(
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

  // 从selectedAnnualGanZhi中提取地支（最后一个字符）
  const yearlyBranch = selectedAnnualGanZhi.slice(-1)
  
  // 获取流年地支在宫位系统中的索引
  const yearlyIndex = PALACE_BRANCH_INDEX[yearlyBranch] ?? -1

  if (yearlyIndex < 0) return {}

  const monthlyMap: Record<string, string[]> = {}

  LUNAR_MONTH_NAMES.forEach((monthName, idx) => {
    const lunarMonth = idx + 1
    
    // 根据选择的方法计算月份宫位
    let monthlyIndex: number
    
    if (monthlyArrangementMethod === 'yuanYuePositioning') {
      // 正月定位法：正月所在宮位 = (流年地支 + 出生時支 - 出生月) mod 12
      // 然后每个月顺序推进
      const firstMonthIndex = normalizeIndex(yearlyIndex + birthTimeBranchIndex - birthLunarMonth)
      monthlyIndex = normalizeIndex(firstMonthIndex + lunarMonth - 1)
    } else {
      // 斗君法（iztro规则）：monthlyIndex = yearlyIndex - birthLunarMonth + birthTimeBranchIndex + lunarMonth
      monthlyIndex = normalizeIndex(yearlyIndex - birthLunarMonth + birthTimeBranchIndex + lunarMonth)
    }
    
    const targetPalace = palaceData.find((palace) => (PALACE_BRANCH_INDEX[palace.branch] ?? -1) === monthlyIndex)

    if (targetPalace) {
      if (!monthlyMap[targetPalace.branch]) {
        monthlyMap[targetPalace.branch] = []
      }
      
      // 計算流月天干和地支
      const monthlyGan = getMonthlyGan(selectedAnnualYear, lunarMonth)
      // 農曆月份對應地支：正月(寅)、二月(卯)、三月(辰)...十一月(子)、十二月(丑)
      const monthlyZhi = EARTHLY_BRANCH_ORDER[(lunarMonth + 1) % 12]
      const monthlyGanZhi = `${monthlyGan}${monthlyZhi}`
      
      // 合併月份名稱和干支（格式：正月庚寅月）
      monthlyMap[targetPalace.branch].push(`${monthName}月${monthlyGanZhi}月`)
    }
  })

  return monthlyMap
}

/**
 * 根据语言设置获取亮度显示字符
 * @param brightness - 亮度值（中文字符，如"廟"、"庙"、"望"、"平"、"陷"）
 * @param language - 语言代码
 * @returns 本地化后的亮度字符
 */

function parsePalaces(chart: FunctionalAstrolabe): PalaceData[] {
  return (chart.palaces || []).map((palace) => {
    const stem = palace.heavenlyStem as string
    
    // 主星（带亮度和四化）
    const majorStars: StarData[] = (palace.majorStars || []).map((s) => ({
      name: s.name as string,
      brightness: s.brightness as string | undefined,
      mutagen: s.mutagen as string | undefined,
      palaceStem: stem,  // 添加宮位天干
    }))

    // 辅星（完整，带亮度）
    const minorStars: StarData[] = (palace.minorStars || []).map((s) => ({
      name: s.name as string,
      brightness: s.brightness as string | undefined,
      mutagen: s.mutagen as string | undefined,
      palaceStem: stem,  // 添加宮位天干
    }))

    // 杂曜
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
      isCausePalace: false,  // 稍后由 markCausePalace 函数标记
    }
  })
}

function getDefaultDecadalAnnualSelection(
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

/* ============================================================
   主命盤組件
   ============================================================ */

export function ChartDisplay() {
  const { chart, birthInfo, setBirthInfo, setChart } = useChartStore()
  const { language, defaultChartType, monthlyArrangementMethod, setCurrentChartType } = useSettingsStore()
  const [selectedPalace, setSelectedPalace] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'flying' | 'trireme' | 'transformation'>(defaultChartType)

  // 初始化時設置全局狀態
  useEffect(() => {
    setCurrentChartType(chartType)
  }, [chartType, setCurrentChartType])
  const [selectedDecadal, setSelectedDecadal] = useState<number | null>(() => {
    if (!chart || !birthInfo) return null
    return getDefaultDecadalAnnualSelection(chart, birthInfo.year, new Date().getFullYear()).decadal
  })
  const [selectedAnnual, setSelectedAnnual] = useState<number | null>(() => {
    if (!chart || !birthInfo) return null
    return getDefaultDecadalAnnualSelection(chart, birthInfo.year, new Date().getFullYear()).annual
  })
  const [selectedMonthly, setSelectedMonthly] = useState<number | null>(null)
  const [selectedDaily, setSelectedDaily] = useState<number | null>(null)
  const [selectedHourly, setSelectedHourly] = useState<number | null>(null)
  const [isDecadalExpanded, setIsDecadalExpanded] = useState(false)
  const [showSanFangSiZheng, setShowSanFangSiZheng] = useState(false)
  const [showBubbleHint, setShowBubbleHint] = useState(false)
  const [directionFocus, setDirectionFocus] = useState<'得' | '失' | null>(null)
  const [showReversalCheck, setShowReversalCheck] = useState(false)
  const [showFlyGongToolbox, setShowFlyGongToolbox] = useState(false)
  const [isTimeTableModalOpen, setIsTimeTableModalOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 })
  
  // 宮位氣泡提示狀態
  const [bubblePalace, setBubblePalace] = useState<{
    palace: PalaceData
    rect: DOMRect
    decadalLabel: string
    annualLabel: string
    decadalStem: string | null
    annualStem: string | null
    annualGanZhi: string | null
  } | null>(null)
  const [isCompactMobile, setIsCompactMobile] = useState(false)
  const birthInfoKeyRef = useRef<string>('')
  const initializedRef = useRef(false)
  
  // 自化線顯示控制
  const [mutagenDisplay, setMutagenDisplay] = useState<{
    A: boolean
    B: boolean
    C: boolean
    D: boolean
  }>({ A: false, B: false, C: false, D: false })
  const arcResetVersion = 0

  const lineStrokeWidth = 2
  const lineDashArray = isCompactMobile ? '6,3' : '8,4'
  const arrowMarkerSize = isCompactMobile ? 7 : 10
  const arrowRefX = isCompactMobile ? 6.3 : 9
  const arrowRefY = isCompactMobile ? 2.2 : 3
  const arrowPath = isCompactMobile ? 'M0,0 L0,4.4 L6.5,2.2 z' : 'M0,0 L0,6 L9,3 z'

  if (!chart || !birthInfo) return null

  // 動態計算實際的 cellSize 和 grid 的偏移位置
  useEffect(() => {
    // 當 birthInfo 改變時重置大限和流年選擇
    const currentBirthInfoKey = `${birthInfo.year}-${birthInfo.month}-${birthInfo.day}-${birthInfo.hour}`
    if (currentBirthInfoKey !== birthInfoKeyRef.current) {
      birthInfoKeyRef.current = currentBirthInfoKey
      const defaults = getDefaultDecadalAnnualSelection(chart, birthInfo.year, new Date().getFullYear())
      setSelectedDecadal(defaults.decadal)
      setSelectedAnnual(defaults.annual)
      setSelectedMonthly(null)
      setSelectedDaily(null)
      setSelectedHourly(null)
      initializedRef.current = true
    } else if (!initializedRef.current) {
      // 首次掛載時初始化
      const defaults = getDefaultDecadalAnnualSelection(chart, birthInfo.year, new Date().getFullYear())
      setSelectedDecadal(defaults.decadal)
      setSelectedAnnual(defaults.annual)
      initializedRef.current = true
    }
    
    const updateGridLayout = () => {
      if (!gridRef.current) return

      const gridElement = gridRef.current
      const parentElement = gridElement.parentElement
      
      if (!parentElement) return
      
      // 獲取 grid 相對於父容器的位置
      const gridRect = gridElement.getBoundingClientRect()
      const parentRect = parentElement.getBoundingClientRect()
      const gridRelativeX = gridRect.left - parentRect.left
      const gridRelativeY = gridRect.top - parentRect.top
      setGridOffset({ x: gridRelativeX, y: gridRelativeY })
      setIsCompactMobile(window.innerWidth < 640)

    }

    updateGridLayout()
    
    // 在窗口 resize 時重新計算
    const resizeObserver = new ResizeObserver(() => {
      updateGridLayout()
    })
    
    // 監控grid容器的大小變化
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current)
    }
    
    // 監控window resize和scroll
    window.addEventListener('resize', updateGridLayout)
    window.addEventListener('scroll', updateGridLayout, true)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateGridLayout)
      window.removeEventListener('scroll', updateGridLayout, true)
    }
  }, [chartType, birthInfo])

  // 重置流月選擇（當 birthInfo 改變時）
  useEffect(() => {
    setSelectedMonthly(null)
    setSelectedDaily(null)
    setSelectedHourly(null)
  }, [birthInfo?.year, birthInfo?.month, birthInfo?.day])

  // 處理選中宮位的四化星樣式
  useEffect(() => {
    if (!gridRef.current || !chart) return
    
    const allStarTags = gridRef.current.querySelectorAll<HTMLElement>('span[data-star-name]')
    
    if (!selectedPalace) {
      // 移除所有已套用的樣式
      for (const tag of allStarTags) {
        tag.style.backgroundColor = ''
        tag.style.color = ''
      }
      return
    }
    
    // 獲取 palaceData
    let palaceDataComputed = parsePalaces(chart)
    palaceDataComputed = markSelfMutagens(palaceDataComputed)
    
    // 找到選中宮位的詳細信息
    const selectedPalaceData = palaceDataComputed.find(p => p.name === selectedPalace)
    if (!selectedPalaceData) return

    const stem = selectedPalaceData.stem
    const sihuaMap = SIHUA_BY_GAN[stem]
    if (!sihuaMap) return

    // 先清除所有星的樣式
    for (const tag of allStarTags) {
      tag.style.backgroundColor = ''
      tag.style.color = ''
    }

    // 為四個四化星應用樣式 - 根據 mutagenDisplay 控制显示
    const mutagenMapping: Record<string, 'A' | 'B' | 'C' | 'D'> = {
      '化禄': 'A',
      '化权': 'B',
      '化科': 'C',
      '化忌': 'D'
    }
    
    const mutagenKeys = ['化禄', '化权', '化科', '化忌']
    mutagenKeys.forEach(mutagenKey => {
      const label = mutagenMapping[mutagenKey]
      const shouldDisplay = mutagenDisplay[label] ?? true
      
      if (!shouldDisplay) return
      
      const mutagenStar = sihuaMap[mutagenKey]
      if (!mutagenStar) return

      const mutagenStarCandidates = getChineseVariantCandidates(mutagenStar)

      // 找到該星的 DOM 元素
      const starElements = Array.from(gridRef.current!.querySelectorAll<HTMLElement>('span[data-star-name]'))
      const starElement = starElements.find(el => {
        const starNameAttr = el.getAttribute('data-star-name') || ''
        return mutagenStarCandidates.includes(starNameAttr)
      })

      if (starElement) {
        // 提取四化類型作為顏色鍵
        const mutagenType = getMutagenType(mutagenKey)
        const colorInfo = MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]

        // 應用樣式
        starElement.style.backgroundColor = colorInfo.color
        starElement.style.color = 'white'
        starElement.style.padding = '0'
        starElement.style.borderRadius = '2px'
        starElement.style.display = 'inline-block'
        starElement.style.lineHeight = '1'
      }
    })
  }, [selectedPalace, chart, mutagenDisplay])

  // 計算生年天干
  const heavenlyStemList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const yearGan = heavenlyStemList[(birthInfo.year - 1900 + 6) % 10]
  const gender = birthInfo.gender as 'male' | 'female'

  let palaceData = parsePalaces(chart)
  // 標記自化（離心自化和向心自化）
  palaceData = markSelfMutagens(palaceData)
  // 標記來因宮
  palaceData = markCausePalace(palaceData, yearGan)

  // 由大限序號定位「大限命宮」天干，供三合盤額外四化顯示使用
  const decadalLifePalaceStem = (() => {
    if (selectedDecadal === null) return null

    const sortedDecadalPalaces = palaceData
      .filter(p => p.decadal?.range)
      .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])

    return sortedDecadalPalaces[selectedDecadal]?.stem || null
  })()

  const grid: (PalaceData | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null))

  palaceData.forEach((p) => {
    const pos = PALACE_POSITIONS[p.branch]
    if (pos) grid[pos.row][pos.col] = p
  })

  const hour = String(birthInfo.hour || 0).padStart(2, '0')
  const minute = String(birthInfo.minute || 0).padStart(2, '0')
  const birthTime = `${hour}:${minute}`
  const solarDate = calculateSolarTime(birthInfo)
  const genderDisplay = gender === 'male' ? '男' : '女'

  // 计算流年信息（如果选择了流年）
  let selectedAnnualYear: number | null = null
  let selectedAnnualAge: number | null = null
  let selectedAnnualGanZhi: string | null = null
  
  if (selectedDecadal !== null && selectedAnnual !== null) {
    // 计算排序后的大限数据（与表格中的排序保持一致）
    const sortedDecadalDataTemp = palaceData
      .filter(p => p.decadal?.range)
      .map((p) => ({
        ageStart: p.decadal.range[0],
        ageEnd: p.decadal.range[1],
      }))
      .sort((a, b) => a.ageStart - b.ageStart)
    
    const decadal = sortedDecadalDataTemp[selectedDecadal]
    if (decadal !== undefined) {
      selectedAnnualAge = decadal.ageStart + selectedAnnual
      selectedAnnualYear = birthInfo.year + (selectedAnnualAge - 1)
      selectedAnnualGanZhi = getYearGanZhi(selectedAnnualYear)
    }
  }

  // 由流年地支定位「年命宮」天干，供三合盤額外四化顯示使用
  const annualLifePalaceStem = (() => {
    if (!selectedAnnualGanZhi || selectedAnnual === null) return null
    const yearlyBranch = selectedAnnualGanZhi.slice(-1)
    return palaceData.find(p => p.branch === yearlyBranch)?.stem || null
  })()

  const monthlySequenceByBranch = getMonthlySequenceByBranch(chart, palaceData, selectedDecadal, selectedAnnual, selectedAnnualGanZhi, selectedAnnualYear, monthlyArrangementMethod)
  const selectedDailyLabel = selectedDaily !== null ? CHINESE_DAY_NAMES[selectedDaily] || '' : ''
  const selectedMonthlyLabel = (() => {
    if (selectedAnnualYear === null || selectedMonthly === null) return null
    return getMonthlySequenceLabel(selectedAnnualYear, selectedMonthly + 1)
  })()
  const selectedMonthlyPalaceBranch = (() => {
    if (selectedAnnualYear === null || selectedMonthly === null) return null

    const selectedMonthlyLabel = getMonthlySequenceLabel(selectedAnnualYear, selectedMonthly + 1)
    for (const [branch, labels] of Object.entries(monthlySequenceByBranch)) {
      if (labels.includes(selectedMonthlyLabel)) {
        return branch
      }
    }

    return null
  })()
  const selectedDailyPalaceBranch = (() => {
    if (selectedMonthlyPalaceBranch === null || selectedDaily === null) return null

    const monthlyPalaceIndex = PALACE_BRANCH_INDEX[selectedMonthlyPalaceBranch]
    if (monthlyPalaceIndex === undefined) return null

    // 規則：流日起算從當月初一直接起，第1日同流月宮，之後順時針遞進。
    const dailyPalaceIndex = normalizeIndex(monthlyPalaceIndex + selectedDaily)
    return PALACE_CLOCKWISE_BRANCHES[dailyPalaceIndex] || null
  })()
  const dailySequenceByBranch = (() => {
    const result: Record<string, string[]> = {}
    if (selectedMonthlyPalaceBranch === null) return result

    const monthlyPalaceIndex = PALACE_BRANCH_INDEX[selectedMonthlyPalaceBranch]
    if (monthlyPalaceIndex === undefined) return result

    // 流日起算從當月初一直接起，第1日同流月宮，之後順時針遞進
    for (let i = 0; i < 30; i++) {
      const palaceIndex = normalizeIndex(monthlyPalaceIndex + i)
      const branch = PALACE_CLOCKWISE_BRANCHES[palaceIndex]
      const dayLabel = CHINESE_DAY_NAMES[i]
      if (!result[branch]) {
        result[branch] = []
      }
      result[branch].push(dayLabel)
    }

    return result
  })()
  const hourlySequenceByBranch = (() => {
    const result: Record<string, string> = {}
    if (selectedDailyPalaceBranch === null || !selectedDailyLabel) return result

    const dailyPalaceIndex = PALACE_BRANCH_INDEX[selectedDailyPalaceBranch]
    if (dailyPalaceIndex === undefined) return result

    // 以流日所在宮位作為子時起點，順時針排滿12宮。
    for (let i = 0; i < 12; i++) {
      const palaceIndex = normalizeIndex(dailyPalaceIndex + i)
      const branch = PALACE_CLOCKWISE_BRANCHES[palaceIndex]
      const shichen = SHICHEN_NAMES[i]
      result[branch] = `${selectedDailyLabel}${shichen}`
    }

    return result
  })()
  const selectedHourlyPalaceBranch = (() => {
    if (selectedDailyPalaceBranch === null || selectedHourly === null) return null
    const dailyPalaceIndex = PALACE_BRANCH_INDEX[selectedDailyPalaceBranch]
    if (dailyPalaceIndex === undefined) return null
    const hourlyPalaceIndex = normalizeIndex(dailyPalaceIndex + selectedHourly)
    return PALACE_CLOCKWISE_BRANCHES[hourlyPalaceIndex] || null
  })()

  // 計算大限標籤映射 - 根據選中大限找出大命宮位
  let decadalLabelsByPalaceName: Record<string, string> = {}
  if (selectedDecadal !== null) {
    const decadalLabels = ['大命', '大父', '大福', '大田', '大官', '大友', '大遷', '大疾', '大財', '大子', '大夫', '大兄']
    const sortedDecadalPalaces = palaceData
      .filter((p: any) => p.decadal?.range)
      .sort((a: any, b: any) => a.decadal.range[0] - b.decadal.range[0])
    const decadalLifePalace = sortedDecadalPalaces[selectedDecadal]
    if (decadalLifePalace) {
      const lifeEnglishName = PALACE_NAME_TO_ENGLISH_MAP[decadalLifePalace.name]
      if (lifeEnglishName) {
        const lifeIndex = PALACE_ORDER.indexOf(lifeEnglishName)
        if (lifeIndex !== -1) {
          for (let i = 0; i < PALACE_ORDER.length; i++) {
            const palaceEnglishName = PALACE_ORDER[i]
            const labelIndex = (i - lifeIndex + PALACE_ORDER.length) % PALACE_ORDER.length
            decadalLabelsByPalaceName[palaceEnglishName] = decadalLabels[labelIndex]
          }
        }
      }
    }
  }

  // 計算流年標籤映射 - 根據流年地支找出年命宮位
  let annualLabelsByPalaceName: Record<string, string> = {}
  if (selectedAnnualGanZhi && selectedAnnual !== null) {
    const yearlyBranch = selectedAnnualGanZhi.slice(-1) // 提取地支
    const annualLabels = ['年命', '年父', '年福', '年田', '年官', '年友', '年遷', '年疾', '年財', '年子', '年夫', '年兄']
    
    // 找出流年地支對應的宮位（年命宮）
    const yearlyLifePalace = palaceData.find(p => p.branch === yearlyBranch)
    if (yearlyLifePalace) {
      // 獲取年命宮的英文名稱
      const lifeEnglishName = PALACE_NAME_TO_ENGLISH_MAP[yearlyLifePalace.name]
      if (lifeEnglishName) {
        // 在 PALACE_ORDER 中找出年命宮的位置
        const lifeIndex = PALACE_ORDER.indexOf(lifeEnglishName)
        if (lifeIndex !== -1) {
          // 從年命宮開始，為所有宮位分配標籤（以英文 key 存儲，避免中文字形差異）
          for (let i = 0; i < PALACE_ORDER.length; i++) {
            const palaceEnglishName = PALACE_ORDER[i]
            const labelIndex = (i - lifeIndex + PALACE_ORDER.length) % PALACE_ORDER.length
            annualLabelsByPalaceName[palaceEnglishName] = annualLabels[labelIndex]
          }
        }
      }
    }
  }

  // 沿用現有四化飛線，做最小反背接線：先過濾顯示中的線，再交給規格檔判定
  const allMutagenLines = collectMutagenLines(palaceData)
  const visibleMutagenLines = allMutagenLines.filter((line) => {
    if (line.label) {
      const shouldDisplay = mutagenDisplay[line.label as 'A' | 'B' | 'C' | 'D'] ?? true
      return shouldDisplay
    }
    return true
  })
  const activeMutagenLabels = (['A', 'B', 'C', 'D'] as const).filter((label) => mutagenDisplay[label])
  const singleActiveMutagenLabel = activeMutagenLabels.length === 1 ? activeMutagenLabels[0] : null

  const directionMarkByBranch: Record<string, '得' | '失' | '得失'> = {}
  if (singleActiveMutagenLabel) {
    const getBranches = new Set<string>()
    const lossBranches = new Set<string>()

    for (const line of visibleMutagenLines) {
      if (line.label !== singleActiveMutagenLabel) continue
      // 依規則：有離心就是失、有向心就是得
      if (line.isCounterMutagen && line.toPalace) {
        getBranches.add(line.toPalace)
      }
      if (line.isSelfCentrifugal && line.fromPalace) {
        lossBranches.add(line.fromPalace)
      }
    }

    const allBranches = new Set<string>([...getBranches, ...lossBranches])

    for (const branch of allBranches) {
      const hasGet = getBranches.has(branch)
      const hasLoss = lossBranches.has(branch)
      directionMarkByBranch[branch] = hasGet && hasLoss ? '得失' : hasGet ? '得' : '失'
    }
  }

  const selectedPalaceBranch = selectedPalace
    ? palaceData.find((palace) => palace.name === selectedPalace)?.branch
    : null

  const sanFangSiZhengResult = (() => {
    if (!selectedPalaceBranch || !singleActiveMutagenLabel) return null

    const groups = getSanFangSiZhengBranches(selectedPalaceBranch)
    if (groups.sanFang.length === 0 || groups.siZheng.length === 0) return null

    const getStats = (branches: string[]) => {
      const marks = branches.map((branch) => directionMarkByBranch[branch]).filter(Boolean) as Array<'得' | '失' | '得失'>
      const hasGet = marks.some((mark) => hasDirection(mark, '得'))
      const hasLoss = marks.some((mark) => hasDirection(mark, '失'))
      const getCount = marks.filter((mark) => hasDirection(mark, '得')).length
      const lossCount = marks.filter((mark) => hasDirection(mark, '失')).length

      // 反背：選中宮本身有四化，且三方/四正中其他宮也有四化
      const selectedHasMark = !!directionMarkByBranch[selectedPalaceBranch]
      const otherBranches = branches.filter((b) => b !== selectedPalaceBranch)
      const otherHasMark = otherBranches.some((b) => !!directionMarkByBranch[b])
      const hasReversal = selectedHasMark && otherHasMark

      return {
        hasGet,
        hasLoss,
        hasReversal,
        getCount,
        lossCount,
        total: marks.length, // 只計有四化的宮數
      }
    }

    return {
      sanFang: getStats(groups.sanFang),
      siZheng: getStats(groups.siZheng),
    }
  })()

  const effectiveDirectionFocus = showReversalCheck ? directionFocus : null

  const renderPalace = (palace: PalaceData | null, key: string) => {
    if (!palace) return <div key={key} />

    return (
      <div
        key={key}
        data-palace-branch={palace.branch}
        data-palace-name={palace.name}
        onClick={(e) => {
          if (!showBubbleHint) return
          const englishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
          setBubblePalace({
            palace,
            rect: e.currentTarget.getBoundingClientRect(),
            decadalLabel: decadalLabelsByPalaceName[englishKey] || '',
            annualLabel: annualLabelsByPalaceName[englishKey] || '',
            decadalStem: decadalLifePalaceStem,
            annualStem: annualLifePalaceStem,
            annualGanZhi: selectedAnnualGanZhi,
          })
        }}
      >
        <PalaceCard
          key={key}
          {...palace}
          isSelected={selectedPalace === palace.name}
          onClick={() => {
            setSelectedPalace(selectedPalace === palace.name ? null : palace.name)
          }}
          chartType={chartType}
          selectedDecadal={selectedDecadal}
          selectedAnnual={selectedAnnual}
          selectedMonthly={selectedMonthly}
          selectedDaily={selectedDaily}
          selectedHourly={selectedHourly}
          selectedMonthlyPalaceBranch={selectedMonthlyPalaceBranch}
          selectedDailyPalaceBranch={selectedDailyPalaceBranch}
          selectedHourlyPalaceBranch={selectedHourlyPalaceBranch}
          monthlySequenceLabels={
            (selectedMonthly !== null && selectedDaily === null)
              ? (monthlySequenceByBranch[palace.branch] || [])
              : (selectedMonthlyLabel ? [selectedMonthlyLabel] : [])
          }
          selectedDailyLabel={
            (selectedDaily !== null && selectedHourly === null)
              ? ((dailySequenceByBranch[palace.branch] && dailySequenceByBranch[palace.branch][0]) || '')
              : (palace.branch === selectedDailyPalaceBranch ? selectedDailyLabel : '')
          }
          selectedHourlyLabel={
            (selectedHourly !== null)
              ? (hourlySequenceByBranch[palace.branch] || '')
              : ''
          }
          selectedAnnualAge={selectedAnnualAge}
          selectedAnnualYear={selectedAnnualYear}
          selectedAnnualGanZhi={selectedAnnualGanZhi}
          selectedAnnualLabel={(() => {
            const englishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
            return annualLabelsByPalaceName[englishKey] || ''
          })()}
          selectedDecadalLabel={(() => {
            const englishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
            return decadalLabelsByPalaceName[englishKey] || ''
          })()}
          yearGan={yearGan}
          gender={gender}
          birthInfo={birthInfo}
          palaceData={palaceData}
          decadalLifePalaceStem={decadalLifePalaceStem}
          annualLifePalaceStem={annualLifePalaceStem}
          directionMark={directionMarkByBranch[palace.branch] ?? null}
          directionFocus={effectiveDirectionFocus}
        />
      </div>
    )
  }

  return (
    <div className="
      relative p-2 sm:p-3 lg:p-6
      bg-gradient-to-br from-white/[0.04] to-transparent
      backdrop-blur-xl border border-white/[0.08] rounded-xl sm:rounded-2xl
      shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      w-full
    ">

      {/* SVG 四化箭頭層 - 飛星盤和四化盤顯示 */}
      {(chartType === 'transformation' || chartType === 'flying') && (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 50 }}>
        <defs>
          {/* 綠色箭頭 - 化祿 */}
          <marker id="arrowFortune" markerWidth={arrowMarkerSize} markerHeight={arrowMarkerSize} refX={arrowRefX} refY={arrowRefY} orient="auto" markerUnits="strokeWidth">
            <path d={arrowPath} fill="#34C759" />
          </marker>
          {/* 紫色箭頭 - 化權 */}
          <marker id="arrowGold" markerWidth={arrowMarkerSize} markerHeight={arrowMarkerSize} refX={arrowRefX} refY={arrowRefY} orient="auto" markerUnits="strokeWidth">
            <path d={arrowPath} fill="#AF52DE" />
          </marker>
          {/* 藍色箭頭 - 化科 */}
          <marker id="arrowStar" markerWidth={arrowMarkerSize} markerHeight={arrowMarkerSize} refX={arrowRefX} refY={arrowRefY} orient="auto" markerUnits="strokeWidth">
            <path d={arrowPath} fill="#007AFF" />
          </marker>
          {/* 紅色箭頭 - 化忌 */}
          <marker id="arrowMisfortune" markerWidth={arrowMarkerSize} markerHeight={arrowMarkerSize} refX={arrowRefX} refY={arrowRefY} orient="auto" markerUnits="strokeWidth">
            <path d={arrowPath} fill="#FF3B30" />
          </marker>
        </defs>
        
        {/* 四化連線 - 先繪製向心自化（虛線） */}
        {(() => {
          const lines = visibleMutagenLines
          
          return (
            <>
              {/* 先繪製離心自化線（實線） - 從星耀實際位置出發 */}
              {lines
                .filter(line => line.isSelfCentrifugal)
                .map((line, idx) => {
                  const fromPalacePos = PALACE_POSITIONS[line.fromPalace]
                  const gridElement = gridRef.current
                  
                  if (!fromPalacePos || !gridElement) {
                    return null
                  }
                  
                  if (!line.starName) {
                    return null
                  }
                  
                  // 查詢palace card容器
                  const cardSelector = `[data-palace-branch="${line.fromPalace}"]`
                  const cardElement = gridElement.querySelector(cardSelector) as HTMLElement
                  if (!cardElement) {
                    return null
                  }
                  
                  // 查詢star tag（通過data-star-name屬性査找）
                  // 先嘗試完全匹配，再嘗試轉換後的名稱
                  const starElement = Array.from(cardElement.querySelectorAll('span[data-star-name]')).find(el => {
                    const starNameAttr = el.getAttribute('data-star-name') || ''
                    const attrCandidates = getChineseVariantCandidates(starNameAttr)
                    const lineCandidates = getChineseVariantCandidates(line.starName || '')
                    return attrCandidates.some(name => lineCandidates.includes(name))
                  }) as HTMLElement
                  
                  if (!starElement) {
                    return null
                  }
                  
                  // 獲取card和star的邊界信息
                  const gridRect = gridElement.getBoundingClientRect()
                  const cardRect = cardElement.getBoundingClientRect()
                  const starRect = starElement.getBoundingClientRect()
                  
                  // 相對於grid的坐標
                  const cardLeft = cardRect.left - gridRect.left
                  const cardRight = cardRect.right - gridRect.left
                  const cardCenterY = cardRect.top - gridRect.top + cardRect.height / 2
                  const cardTop = cardRect.top - gridRect.top
                  const cardBottom = cardRect.bottom - gridRect.top
                  const arrowLength = isCompactMobile ? 7 : 10 // 箭頭長度
                  const arrowExtension = 2 * arrowLength
                  
                  const starCenterX = starRect.left - gridRect.left + starRect.width / 2
                  const starTop = starRect.top - gridRect.top
                  const starBottom = starRect.bottom - gridRect.top
                  
                  let line1X1: number, line1Y1: number, line1X2: number, line1Y2: number
                  let line2X1: number | null = null, line2Y1: number | null = null, line2X2: number | null = null, line2Y2: number | null = null
                  
                  // 根據palace位置方向構建線條
                  if (fromPalacePos.row === 3) {
                    // 下排：從star底部垂直向下到card邊界外延伸（直接用cardBottom）
                    line1X1 = starCenterX
                    line1Y1 = starBottom
                    line1X2 = starCenterX
                    line1Y2 = cardBottom + arrowExtension
                  } else if (fromPalacePos.row === 0) {
                    // 上排：從star頂部垂直向上到card邊界外延伸（直接用cardTop）
                    line1X1 = starCenterX
                    line1Y1 = starTop
                    line1X2 = starCenterX
                    line1Y2 = cardTop - arrowExtension
                  } else if (fromPalacePos.col === 0) {
                    // 左邊：L型 - 先垂直後水平
                    // 第一段：從star底部垂直到轉彎點（card中心高度）
                    line1X1 = starCenterX
                    line1Y1 = starBottom
                    line1X2 = starCenterX
                    line1Y2 = cardCenterY
                    
                    // 第二段：從轉彎點水平到 card 左邊界外，額外突出 arrowExtension
                    line2X1 = starCenterX
                    line2Y1 = cardCenterY
                    line2X2 = cardLeft - arrowExtension
                    line2Y2 = cardCenterY
                  } else if (fromPalacePos.col === 3) {
                    // 右邊：L型 - 先垂直後水平
                    // 第一段：從star底部垂直到轉彎點（card中心高度）
                    line1X1 = starCenterX
                    line1Y1 = starBottom
                    line1X2 = starCenterX
                    line1Y2 = cardCenterY
                    
                    // 第二段：從轉彎點水平到 card 右邊界外，額外突出 arrowExtension
                    line2X1 = starCenterX
                    line2Y1 = cardCenterY
                    line2X2 = cardRight + arrowExtension
                    line2Y2 = cardCenterY
                  } else {
                    return null
                  }
                  
                  return (
                    <g key={`centrifugal-${idx}`}>
                      {/* 第一段線 - 有箭頭（上下排直接到邊界，左右邊是部分L型） */}
                      <line
                        x1={line1X1 + gridOffset.x}
                        y1={line1Y1 + gridOffset.y}
                        x2={line1X2 + gridOffset.x}
                        y2={line1Y2 + gridOffset.y}
                        stroke={line.color}
                        strokeWidth={lineStrokeWidth}
                        opacity={isCompactMobile ? 0.5 : 0.6}
                        markerEnd={line2X1 === null ? `url(#${line.markerColor})` : undefined}
                      />
                      {/* 第二段線（僅左右邊有） - 有箭頭 */}
                      {line2X1 !== null && line2Y1 !== null && (
                        <line
                          x1={line2X1 + gridOffset.x}
                          y1={line2Y1 + gridOffset.y}
                          x2={line2X2! + gridOffset.x}
                          y2={line2Y2! + gridOffset.y}
                          stroke={line.color}
                          strokeWidth={lineStrokeWidth}
                          opacity={isCompactMobile ? 0.5 : 0.6}
                          markerEnd={`url(#${line.markerColor})`}
                        />
                      )}
                      {/* 箭頭旁邊的ABCD標籤 */}
                      {line.label && (
                        <text
                          x={line2X2 !== null ? line2X2 + gridOffset.x + (fromPalacePos.col === 0 ? (isCompactMobile ? 4 : 6) : -(isCompactMobile ? 4 : 6)) : line1X2 + gridOffset.x + (isCompactMobile ? 4 : 6)}
                          y={line2Y2 !== null ? line2Y2 + gridOffset.y - (isCompactMobile ? 8 : 10) : line1Y2 + gridOffset.y + (fromPalacePos.row === 0 ? (isCompactMobile ? 10 : 14) : (isCompactMobile ? -4 : -8))}
                          fontSize={isCompactMobile ? '10' : '14'}
                          fontWeight="medium"
                          fill={line.color}
                          opacity="0.8"
                          textAnchor={line2X2 !== null ? (fromPalacePos.col === 0 ? 'start' : 'end') : 'start'}
                        >
                          {line.label}
                        </text>
                      )}
                    </g>
                  )
                })}
              
              {/* 再繪製向心自化虛線箭頭 */}
              {lines
                .filter(line => line.isCounterMutagen)
                .map((line, idx) => {
                  // 向心線：起點在fromPalace的邊界，終點在中宮的邊界對應toPalace的位置
                  const fromPos = getPalaceEdgePointTowardCenterWithDOM(line.fromPalace, gridRef.current)
                  const toPos = getCenterBoundaryPointForPalace(line.toPalace, gridRef.current)
                  
                  if (!fromPos || !toPos) return null
                  
                  // 計算線段長度的2%作為偏移量以避免重疊線條
                  const lineLength = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2)
                  const offsetAmount = lineLength * 0.02
                  
                  // 根據偏移方向應用垂直或水平偏移
                  const yOffsetAmount = (line.yOffset || 0) * offsetAmount
                  const xOffsetAmount = (line.xOffset || 0) * offsetAmount
                  
                  const adjustedFromPos = { 
                    x: fromPos.x + xOffsetAmount, 
                    y: fromPos.y + yOffsetAmount 
                  }
                  const adjustedToPos = { 
                    x: toPos.x + xOffsetAmount, 
                    y: toPos.y + yOffsetAmount 
                  }
                  
                  return (
                    <g key={`counter-${idx}`}>
                      {/* 向心自化虛線箭頭 */}
                      <line
                        x1={adjustedFromPos.x + gridOffset.x}
                        y1={adjustedFromPos.y + gridOffset.y}
                        x2={adjustedToPos.x + gridOffset.x}
                        y2={adjustedToPos.y + gridOffset.y}
                        stroke={line.color}
                        strokeWidth={lineStrokeWidth}
                        strokeDasharray={lineDashArray}
                        strokeDashoffset={0}
                        opacity={isCompactMobile ? 0.6 : 0.7}
                        markerEnd={`url(#${line.markerColor})`}
                        className="dash-flow"
                      />
                      {/* 向心自化標籤 - 位置在90%處（靠近箭頭） */}
                      {line.label && (
                        <>
                          {/* 標籤背景 - 跟中間區域相同的透明白色 */}
                          <rect
                            x={adjustedFromPos.x + (adjustedToPos.x - adjustedFromPos.x) * 0.9 + gridOffset.x - (isCompactMobile ? 8 : 10)}
                            y={adjustedFromPos.y + (adjustedToPos.y - adjustedFromPos.y) * 0.9 + gridOffset.y - (isCompactMobile ? 13 : 16)}
                            width={isCompactMobile ? '16' : '20'}
                            height={isCompactMobile ? '16' : '20'}
                            fill="rgba(255, 255, 255, 0.9)"
                            rx={isCompactMobile ? '8' : '10'}
                            opacity="1"
                          />
                          {/* 標籤文字 */}
                          <text
                            x={adjustedFromPos.x + (adjustedToPos.x - adjustedFromPos.x) * 0.9 + gridOffset.x}
                            y={adjustedFromPos.y + (adjustedToPos.y - adjustedFromPos.y) * 0.9 + gridOffset.y }
                            fill={line.color}
                            fontSize={isCompactMobile ? '14' : '18'}
                            fontWeight="medium"
                            textAnchor="middle"
                            opacity="1"
                          >
                            {line.label}
                          </text>
                        </>
                      )}
                    </g>
                  )
                })}
              
              {showFlyGongToolbox && (
                <DottedArcLayer
                  palaceData={palaceData}
                  selectedPalace={selectedPalace}
                  setSelectedPalace={setSelectedPalace}
                  gridRef={gridRef}
                  gridOffset={gridOffset}
                  isCompactMobile={isCompactMobile}
                  lineStrokeWidth={lineStrokeWidth}
                  lineDashArray={lineDashArray}
                  resetVersion={arcResetVersion}
                />
              )}
            </>
          )
        })()}
      </svg>
      )}

      {/* 三方四正 SVG 覆蓋層 */}
      {showSanFangSiZheng && selectedPalace && (() => {
        const INDEX_TO_BRANCH = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']
        const selectedPD = palaceData.find(p => p.name === selectedPalace)
        if (!selectedPD || !gridRef.current) return null
        const branchIndex = PALACE_BRANCH_INDEX[selectedPD.branch]
        if (branchIndex === undefined) return null
        const trine1 = INDEX_TO_BRANCH[(branchIndex + 4) % 12]
        const trine2 = INDEX_TO_BRANCH[(branchIndex + 8) % 12]
        const opposite = INDEX_TO_BRANCH[(branchIndex + 6) % 12]
        const fwd3 = INDEX_TO_BRANCH[(branchIndex + 3) % 12]
        const back3 = INDEX_TO_BRANCH[(branchIndex + 9) % 12]

        const gridEl = gridRef.current
        const gridRect = gridEl.getBoundingClientRect()

        // 與四化連線相同的座標系：相對 grid 再加 gridOffset
        const getCenter = (branch: string): { x: number; y: number } | null => {
          const el = gridEl.querySelector(`[data-palace-branch="${branch}"]`) as HTMLElement
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            x: (r.left - gridRect.left + r.width / 2) + gridOffset.x,
            y: (r.top - gridRect.top + r.height / 2) + gridOffset.y,
          }
        }

        const p0 = getCenter(selectedPD.branch)
        const p1 = getCenter(trine1)
        const p2 = getCenter(trine2)
        const pOpp = getCenter(opposite)
        const pFwd3 = getCenter(fwd3)
        const pBack3 = getCenter(back3)
        if (!p0 || !p1 || !p2 || !pOpp || !pFwd3 || !pBack3) return null

        const triPoints = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`
        return (
          <svg
            key={selectedPalace}
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
            style={{ zIndex: 48 }}
          >
            {/* 三合宮位黃色三角形 */}
            <polygon
              points={triPoints}
              fill="none"
              stroke="rgba(255, 213, 0, 0.6)"
              strokeWidth="1.5"
              strokeDasharray="8 4"
              strokeDashoffset={0}
              className="dash-flow-slow"
            />
            {/* 四正連線：本宮 ↔ 對宮 */}
            <line x1={p0.x} y1={p0.y} x2={pOpp.x} y2={pOpp.y}
              stroke="rgba(0, 200, 255, 0.7)" strokeWidth="1.5" strokeDasharray="8 4"
              strokeDashoffset={0}
              className="dash-flow-slow" />
            {/* 四正連線：前3宮 ↔ 後3宮 */}
            <line x1={pFwd3.x} y1={pFwd3.y} x2={pBack3.x} y2={pBack3.y}
              stroke="rgba(0, 200, 255, 0.7)" strokeWidth="1.5" strokeDasharray="8 4"
              strokeDashoffset={0}
              className="dash-flow-slow" />
          </svg>
        )
      })()}

      {/* 4x4 网格 */}
      <div ref={gridRef} className="grid grid-cols-4 gap-0 relative" style={{ zIndex: 2 }}>
        {/* Row 0 */}
        {grid[0].map((p, c) => renderPalace(p, `0-${c}`))}

        {/* Row 1: left + center(2x2) + right */}
        {renderPalace(grid[1][0], '1-0')}
        <div className="col-span-2 row-span-2" data-centerinfo>
          <CenterInfo 
            chart={chart} 
            solarDate={solarDate} 
            birthTime={birthTime} 
            birthInfo={birthInfo} 
            gender={genderDisplay} 
            language={language} 
            nativeName={birthInfo?.name}
            showSanFangSiZheng={showSanFangSiZheng}
            onToggleSanFangSiZheng={() => setShowSanFangSiZheng(v => !v)}
            showBubbleHint={showBubbleHint}
            onToggleBubbleHint={() => {
              setShowBubbleHint((v) => {
                if (v) setBubblePalace(null)
                return !v
              })
            }}
            showReversalCheck={showReversalCheck}
            onToggleReversalCheck={() => {
              setShowReversalCheck((prev) => {
                if (prev) setDirectionFocus(null)
                return !prev
              })
            }}
            showFlyGongToolbox={showFlyGongToolbox}
            onToggleFlyGongToolbox={() => setShowFlyGongToolbox((v) => !v)}
            onTimeTableClick={() => setIsTimeTableModalOpen(true)}
            onHourChange={(hour) => {
              if (birthInfo && birthInfo.year && birthInfo.month && birthInfo.day && birthInfo.gender) {
                const updatedBirthInfo: BirthInfo = {
                  year: birthInfo.year,
                  month: birthInfo.month,
                  day: birthInfo.day,
                  hour: hour,
                  minute: birthInfo.minute || 0,
                  gender: birthInfo.gender as 'male' | 'female',
                  isLeapMonth: birthInfo.isLeapMonth || false,
                  name: birthInfo.name,
                  birthLocation: birthInfo.birthLocation,
                }
                setBirthInfo(updatedBirthInfo)
                const newChart = generateChart(updatedBirthInfo)
                setChart(newChart)
              }
            }}
          />
        </div>
        {renderPalace(grid[1][3], '1-3')}

        {/* Row 2: left + right (center already spans) */}
        {renderPalace(grid[2][0], '2-0')}
        {renderPalace(grid[2][3], '2-3')}

        {/* Row 3 */}
        {grid[3].map((p, c) => renderPalace(p, `3-${c}`))}
      </div>

      {/* 盤面类型切换按钮 - 移到盘面下方 */}
      <div className="mt-4 sm:mt-10 mb-2 sm:mb-3 w-full overflow-x-auto px-0.5 sm:px-0">
        <div className="flex items-center justify-between gap-1 sm:gap-3 w-full min-w-max">
        {/* 第一部分：盤面類型按鈕（左邊） */}
        {/* 選擇盤面之後 prompt 會隨著改變 */}
        <div className="flex flex-nowrap justify-start gap-1 sm:gap-1.5 items-center shrink-0">
          {[
            { value: 'flying', label: '飛星' },
            { value: 'trireme', label: '三合' },
            { value: 'transformation', label: '四化' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setChartType(item.value as 'flying' | 'trireme' | 'transformation')
                // 同步更新全局狀態，以便 AIInterpretation 可以讀取
                useSettingsStore.getState().setCurrentChartType(item.value as 'flying' | 'trireme' | 'transformation')
              }}
              className={`
                h-6 sm:h-7 px-2 sm:px-3 rounded-md sm:rounded-lg font-medium transition-all duration-200 text-[10px] sm:text-[13px] whitespace-nowrap inline-flex items-center justify-center shrink-0
                ${chartType === item.value
                  ? 'bg-star text-white shadow-lg'
                  : 'bg-white/[0.05] text-text-secondary hover:bg-white/[0.1]'
                }
              `}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 三合盤時的中間間隔 - 讓收闔按鈕居中 */}
        {chartType === 'trireme' && <div className="flex-1" />}

        {/* 第二部分：收合按鈕 */}
        <HoverHint content={isDecadalExpanded ? '收起' : '展開'}>
          <button
            onClick={() => setIsDecadalExpanded(!isDecadalExpanded)}
            className="rounded-md sm:rounded-lg font-medium transition-all bg-star text-white hover:bg-star-light shadow-lg flex items-center justify-center w-7 h-6 sm:w-7 sm:h-7 shrink-0"
          >
            {isDecadalExpanded ? (
              <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" stroke="currentColor" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" stroke="currentColor" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            )}
          </button>
        </HoverHint>

        {/* 第三部分：ABCD 控制组件 - 飛星盤與四化盤顯示，三合盤隱藏 */}
        {(chartType === 'flying' || chartType === 'transformation') && (
          <MutagenControls 
            mutagenDisplay={mutagenDisplay} 
            setMutagenDisplay={setMutagenDisplay}
          />
        )}
        </div>
      </div>

      {/* 三方四正反背檢測*/}
      {showReversalCheck && sanFangSiZhengResult && (
        <div className="mb-2 px-1 sm:px-0">
          <div className="text-[11px] sm:text-[12px] text-gray-400 bg-white/[0.06] border border-white/[0.12] rounded-md px-0 py-0 flex flex-wrap gap-x-2 gap-y-1 items-center">
            <span className="font-semibold">反背統計：</span>
            
            <span className="flex items-center gap-x-1">
              三方&nbsp;
              <span className="text-gray-400 font-semibold">得{sanFangSiZhengResult.sanFang.getCount}</span>
              <span className="mx-0.5">/</span>
              <span className="text-gray-400 font-semibold">失{sanFangSiZhengResult.sanFang.lossCount}</span>
              <span className="text-gray-400 font-semibold ml-2">
                三方反背{sanFangSiZhengResult.sanFang.hasReversal ? '✓' : '✗'}
              </span>
            </span>
            
            <span className="flex items-center gap-x-1">
              四正&nbsp;
              <span className="text-gray-400 font-semibold">得{sanFangSiZhengResult.siZheng.getCount}</span>
              <span className="mx-0.5">/</span>
              <span className="text-gray-400 font-semibold">失{sanFangSiZhengResult.siZheng.lossCount}</span>
              <span className="text-gray-400 font-semibold ml-2">
                四正反背{sanFangSiZhengResult.siZheng.hasReversal ? '✓' : '✗'}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 大限流年表格 */}
      <div className="mt-0">
        <DecadalAnnualMonthlyTable 
          palaceData={palaceData} 
          birthInfo={birthInfo} 
          selectedDecadal={selectedDecadal} 
          setSelectedDecadal={setSelectedDecadal}
          selectedAnnual={selectedAnnual}
          setSelectedAnnual={setSelectedAnnual}
          selectedMonthly={selectedMonthly}
          setSelectedMonthly={setSelectedMonthly}
          selectedDaily={selectedDaily}
          setSelectedDaily={setSelectedDaily}
          selectedHourly={selectedHourly}
          setSelectedHourly={setSelectedHourly}
          isExpanded={isDecadalExpanded}
        />
      </div>

      {/* 宮位 AI 提示 */}
      {showBubbleHint && bubblePalace && (
        <PalaceHintBubble
          palace={bubblePalace.palace}
          anchorRect={bubblePalace.rect}
          onClose={() => setBubblePalace(null)}
          chartType={chartType}
          decadalLabel={bubblePalace.decadalLabel}
          annualLabel={bubblePalace.annualLabel}
          decadalStem={bubblePalace.decadalStem}
          annualStem={bubblePalace.annualStem}
          annualGanZhi={bubblePalace.annualGanZhi}
        />
      )}

      {/* 時間表查詢 */}
      <TimeTableModal
        isOpen={isTimeTableModalOpen}
        onClose={() => setIsTimeTableModalOpen(false)}
        birthInfo={birthInfo}
        palaceData={palaceData}
        language={language}
        selectedDecadal={selectedDecadal}
        selectedAnnual={selectedAnnual}
        onConfirm={(data: any) => {
          // 根据用户选择更新大限、流年及流月、流日、流时
          if (data.selectedDecadal !== undefined && data.selectedDecadal !== null) {
            setSelectedDecadal(data.selectedDecadal)
            if (data.selectedAnnual !== undefined && data.selectedAnnual !== null) {
              setSelectedAnnual(data.selectedAnnual)
              // 设置流月、流日、流时
              if (data.selectedMonthly !== undefined && data.selectedMonthly !== null) {
                setSelectedMonthly(data.selectedMonthly)
              }
              if (data.selectedDaily !== undefined && data.selectedDaily !== null) {
                setSelectedDaily(data.selectedDaily)
              }
              if (data.selectedHourly !== undefined && data.selectedHourly !== null) {
                setSelectedHourly(data.selectedHourly)
              }
            } else {
              setSelectedAnnual(null)
              setSelectedMonthly(null)
              setSelectedDaily(null)
              setSelectedHourly(null)
            }
            setIsDecadalExpanded(true)
          }
          setIsTimeTableModalOpen(false)
        }}
      />
    </div>
  )
}

export default ChartDisplay