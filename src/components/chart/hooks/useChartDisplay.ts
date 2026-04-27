/**
 * ChartDisplay 組件的狀態管理 hook
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FunctionalAstrolabe, BirthInfo } from '@/lib/astro'
import { calculateSolarTime } from '@/lib/astro'
import type { PalaceData } from '../types'
import { PALACE_POSITIONS, PALACE_BRANCH_INDEX, PALACE_NAME_TO_ENGLISH_MAP, PALACE_ORDER } from '../types'
import { 
  PALACE_CLOCKWISE_BRANCHES,
  EARTHLY_BRANCH_ORDER, 
  LUNAR_MONTH_NAMES, 
  CHINESE_DAY_NAMES, 
  SHICHEN_NAMES,
  HEAVENLY_STEMS,
  DECADAL_LABELS,
  ANNUAL_LABELS,
} from '../utils/chartConstants'
import { 
  getYearGanZhi, 
  getMonthlySequenceByBranch, 
  getDefaultDecadalAnnualSelection,
  normalizeIndex,
  parsePalaces,
} from '../utils/chartHelpers'
import { getMonthlySequenceLabel } from '../utils/lunar'
import { markSelfMutagens, markCausePalace } from '../mutagenLines'

export interface ChartDisplayState {
  selectedPalace: string | null
  chartType: 'flying' | 'trireme' | 'transformation'
  selectedDecadal: number | null
  selectedAnnual: number | null
  selectedMonthly: number | null
  selectedDaily: number | null
  selectedHourly: number | null
  isDecadalExpanded: boolean
  showSanFangSiZheng: boolean
  showBubbleHint: boolean
  directionFocus: '得' | '失' | null
  showReversalCheck: boolean
  showFlyGongToolbox: boolean
  isTimeTableModalOpen: boolean
  gridOffset: { x: number; y: number }
  bubblePalace: {
    palace: PalaceData
    rect: DOMRect
    decadalLabel: string
    annualLabel: string
    decadalStem: string | null
    annualStem: string | null
    annualGanZhi: string | null
  } | null
  isCompactMobile: boolean
  mutagenDisplay: {
    A: boolean
    B: boolean
    C: boolean
    D: boolean
  }
}

export function useChartDisplay(
  chart: FunctionalAstrolabe | null,
  birthInfo: BirthInfo | null,
  defaultChartType: 'flying' | 'trireme' | 'transformation',
  monthlyArrangementMethod: 'yuanYuePositioning' | 'douJun',
) {
  const [selectedPalace, setSelectedPalace] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'flying' | 'trireme' | 'transformation'>(defaultChartType)
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
  const [bubblePalace, setBubblePalace] = useState<ChartDisplayState['bubblePalace']>(null)
  const [isCompactMobile, setIsCompactMobile] = useState(false)
  const birthInfoKeyRef = useRef<string>('')
  const initializedRef = useRef(false)
  const [mutagenDisplay, setMutagenDisplay] = useState({
    A: false,
    B: false,
    C: false,
    D: false,
  })

  // Grid layout 效果
  useEffect(() => {
    if (!chart || !birthInfo) return

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

      const gridRect = gridElement.getBoundingClientRect()
      const parentRect = parentElement.getBoundingClientRect()
      const gridRelativeX = gridRect.left - parentRect.left
      const gridRelativeY = gridRect.top - parentRect.top
      setGridOffset({ x: gridRelativeX, y: gridRelativeY })
      setIsCompactMobile(window.innerWidth < 640)
    }

    updateGridLayout()

    const resizeObserver = new ResizeObserver(() => {
      updateGridLayout()
    })

    if (gridRef.current) {
      resizeObserver.observe(gridRef.current)
    }

    window.addEventListener('resize', updateGridLayout)
    window.addEventListener('scroll', updateGridLayout, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateGridLayout)
      window.removeEventListener('scroll', updateGridLayout, true)
    }
  }, [chartType, chart, birthInfo])

  // 重置流月選擇
  useEffect(() => {
    setSelectedMonthly(null)
    setSelectedDaily(null)
    setSelectedHourly(null)
  }, [birthInfo?.year, birthInfo?.month, birthInfo?.day])

  return {
    selectedPalace,
    setSelectedPalace,
    chartType,
    setChartType,
    selectedDecadal,
    setSelectedDecadal,
    selectedAnnual,
    setSelectedAnnual,
    selectedMonthly,
    setSelectedMonthly,
    selectedDaily,
    setSelectedDaily,
    selectedHourly,
    setSelectedHourly,
    isDecadalExpanded,
    setIsDecadalExpanded,
    showSanFangSiZheng,
    setShowSanFangSiZheng,
    showBubbleHint,
    setShowBubbleHint,
    directionFocus,
    setDirectionFocus,
    showReversalCheck,
    setShowReversalCheck,
    showFlyGongToolbox,
    setShowFlyGongToolbox,
    isTimeTableModalOpen,
    setIsTimeTableModalOpen,
    gridRef,
    gridOffset,
    bubblePalace,
    setBubblePalace,
    isCompactMobile,
    mutagenDisplay,
    setMutagenDisplay,
  }
}

/**
 * 計算圖表相關的衍生資料
 */
export function useChartCalculations(
  chart: FunctionalAstrolabe | null,
  birthInfo: BirthInfo | null,
  selectedDecadal: number | null,
  selectedAnnual: number | null,
  selectedMonthly: number | null,
  selectedDaily: number | null,
  selectedHourly: number | null,
  monthlyArrangementMethod: 'yuanYuePositioning' | 'douJun',
) {
  const yearGan = chart && birthInfo ? HEAVENLY_STEMS[(birthInfo.year - 1900 + 6) % 10] : null
  const gender = birthInfo?.gender as 'male' | 'female' | null

  let palaceData = chart ? parsePalaces(chart) : []
  
  // 標記自化和來因宮
  if (yearGan && palaceData.length > 0) {
    palaceData = markSelfMutagens(palaceData)
    palaceData = markCausePalace(palaceData, yearGan)
  }

  const grid: (PalaceData | null)[][] = Array(4)
    .fill(null)
    .map(() => Array(4).fill(null))

  palaceData.forEach((p) => {
    const pos = PALACE_POSITIONS[p.branch]
    if (pos) grid[pos.row][pos.col] = p
  })

  const hour = birthInfo ? String(birthInfo.hour || 0).padStart(2, '0') : '00'
  const minute = birthInfo ? String(birthInfo.minute || 0).padStart(2, '0') : '00'
  const birthTime = `${hour}:${minute}`
  const solarDate = birthInfo ? calculateSolarTime(birthInfo) : null
  const genderDisplay = gender === 'male' ? '男' : '女'

  // 計算流年信息
  let selectedAnnualYear: number | null = null
  let selectedAnnualAge: number | null = null
  let selectedAnnualGanZhi: string | null = null

  if (birthInfo && selectedDecadal !== null && selectedAnnual !== null) {
    const sortedDecadalDataTemp = palaceData
      .filter((p) => p.decadal?.range)
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

  // 大限命宮天干
  const decadalLifePalaceStem = (() => {
    if (selectedDecadal === null) return null
    const sortedDecadalPalaces = palaceData
      .filter((p) => p.decadal?.range)
      .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])
    return sortedDecadalPalaces[selectedDecadal]?.stem || null
  })()

  // 流年命宮天干
  const annualLifePalaceStem = (() => {
    if (!selectedAnnualGanZhi || selectedAnnual === null) return null
    const yearlyBranch = selectedAnnualGanZhi.slice(-1)
    return palaceData.find((p) => p.branch === yearlyBranch)?.stem || null
  })()

  const monthlySequenceByBranch = chart
    ? getMonthlySequenceByBranch(
        chart,
        palaceData,
        selectedDecadal,
        selectedAnnual,
        selectedAnnualGanZhi,
        selectedAnnualYear,
        monthlyArrangementMethod,
      )
    : {}

  const selectedDailyLabel = selectedDaily !== null ? CHINESE_DAY_NAMES[selectedDaily] || '' : ''
  const selectedMonthlyLabel = (() => {
    if (selectedAnnualYear === null || selectedMonthly === null) return null
    return getMonthlySequenceLabel(selectedAnnualYear, selectedMonthly + 1)
  })()

  const selectedMonthlyPalaceBranch = (() => {
    if (selectedAnnualYear === null || selectedMonthly === null) return null
    const label = getMonthlySequenceLabel(selectedAnnualYear, selectedMonthly + 1)
    for (const [branch, labels] of Object.entries(monthlySequenceByBranch)) {
      if (labels.includes(label)) {
        return branch
      }
    }
    return null
  })()

  const selectedDailyPalaceBranch = (() => {
    if (selectedMonthlyPalaceBranch === null || selectedDaily === null) return null
    const monthlyPalaceIndex = PALACE_BRANCH_INDEX[selectedMonthlyPalaceBranch]
    if (monthlyPalaceIndex === undefined) return null
    const dailyPalaceIndex = normalizeIndex(monthlyPalaceIndex + selectedDaily)
    return PALACE_CLOCKWISE_BRANCHES[dailyPalaceIndex] || null
  })()

  const dailySequenceByBranch = (() => {
    const result: Record<string, string[]> = {}
    if (selectedMonthlyPalaceBranch === null) return result
    const monthlyPalaceIndex = PALACE_BRANCH_INDEX[selectedMonthlyPalaceBranch]
    if (monthlyPalaceIndex === undefined) return result
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

  // 大限標籤映射
  let decadalLabelsByPalaceName: Record<string, string> = {}
  if (selectedDecadal !== null) {
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
            decadalLabelsByPalaceName[palaceEnglishName] = DECADAL_LABELS[labelIndex]
          }
        }
      }
    }
  }

  // 流年標籤映射
  let annualLabelsByPalaceName: Record<string, string> = {}
  if (selectedAnnualGanZhi && selectedAnnual !== null) {
    const yearlyBranch = selectedAnnualGanZhi.slice(-1)
    const yearlyLifePalace = palaceData.find((p) => p.branch === yearlyBranch)
    if (yearlyLifePalace) {
      const lifeEnglishName = PALACE_NAME_TO_ENGLISH_MAP[yearlyLifePalace.name]
      if (lifeEnglishName) {
        const lifeIndex = PALACE_ORDER.indexOf(lifeEnglishName)
        if (lifeIndex !== -1) {
          for (let i = 0; i < PALACE_ORDER.length; i++) {
            const palaceEnglishName = PALACE_ORDER[i]
            const labelIndex = (i - lifeIndex + PALACE_ORDER.length) % PALACE_ORDER.length
            annualLabelsByPalaceName[palaceEnglishName] = ANNUAL_LABELS[labelIndex]
          }
        }
      }
    }
  }

  return {
    yearGan,
    gender,
    palaceData,
    grid,
    birthTime,
    solarDate,
    genderDisplay,
    selectedAnnualYear,
    selectedAnnualAge,
    selectedAnnualGanZhi,
    decadalLifePalaceStem,
    annualLifePalaceStem,
    monthlySequenceByBranch,
    selectedDailyLabel,
    selectedMonthlyLabel,
    selectedMonthlyPalaceBranch,
    selectedDailyPalaceBranch,
    dailySequenceByBranch,
    hourlySequenceByBranch,
    selectedHourlyPalaceBranch,
    decadalLabelsByPalaceName,
    annualLabelsByPalaceName,
  }
}
