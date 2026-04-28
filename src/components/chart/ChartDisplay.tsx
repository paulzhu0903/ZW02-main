/* ============================================================
   命盤可视化组件
   對齊文墨天機標準：
   - 完整星曜 + 亮度（廟旺平陷）
   - 宮干 + 大限範圍
   - 博士/長生十二神 + 杂曜
   - 命主/身主 + 纳音五行
   ============================================================ */

import { useEffect } from 'react'
import { useChartStore, useSettingsStore } from '@/stores'
import { getChineseVariantCandidates } from '@/lib/localize-knowledge'
import type { BirthInfo } from '@/lib/astro'
import { generateChart } from '@/lib/astro'
import { SIHUA_BY_GAN } from '@/knowledge/sihua'
import { 
  type PalaceData,
  PALACE_POSITIONS,
  PALACE_BRANCH_INDEX,
  PALACE_NAME_TO_ENGLISH_MAP,
  MUTAGEN_COLORS,
} from './types'
import {
  getPalaceEdgePointTowardCenterWithDOM,
  getCenterBoundaryPointForPalace,
  collectMutagenLines,
  getMutagenType,
} from './mutagenLines'
import { MutagenControls } from './MutagenControls'
import { PalaceHintBubble } from './Bubble'
import { TimeTableModal } from './TimeTableModal'
import { DottedArcLayer } from './DottedArcLayer'
import { HoverHint } from '@/components/ui'

// 模組化組件和函數導入
import { PalaceCard } from './components/PalaceCard'
import { CenterInfo } from './components/CenterInfo'
import { DecadalAnnualMonthlyTable } from './components/DecadalAnnualMonthlyTable'

// 拆分後的輔助函數和常數
import { 
  getSanFangSiZhengBranches,
  hasDirection,
} from './utils/chartHelpers'

import { useChartDisplay, useChartCalculations } from './hooks/useChartDisplay'

/* ============================================================
   主命盤組件
   ============================================================ */

export function ChartDisplay() {
  const { chart, birthInfo, setBirthInfo, setChart } = useChartStore()
  const { language, defaultChartType, monthlyArrangementMethod, setCurrentChartType, arcFlowAnimationEnabled, lineExtensionAnimationEnabled } = useSettingsStore()
  
  // 使用自定義 hook 管理狀態
  const {
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
    bubbleActiveTab,
    setBubbleActiveTab,
    isCompactMobile,
    mutagenDisplay,
    setMutagenDisplay,
  } = useChartDisplay(chart, birthInfo, defaultChartType, monthlyArrangementMethod)

  // 初始化時設置全局狀態
  useEffect(() => {
    setCurrentChartType(chartType)
  }, [chartType, setCurrentChartType])

  // 使用計算 hook 獲取衍生資料
  const {
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
  } = useChartCalculations(
    chart,
    birthInfo,
    selectedDecadal,
    selectedAnnual,
    selectedMonthly,
    selectedDaily,
    selectedHourly,
    monthlyArrangementMethod,
  )

  // SVG 相關設定
  const arcResetVersion = 0
  const lineStrokeWidth = 2
  const lineDashArray = isCompactMobile ? '6,3' : '8,4'
  const arrowMarkerSize = isCompactMobile ? 7 : 10
  const arrowRefX = isCompactMobile ? 6.3 : 9
  const arrowRefY = isCompactMobile ? 2.2 : 3
  const arrowPath = isCompactMobile ? 'M0,0 L0,4.4 L6.5,2.2 z' : 'M0,0 L0,6 L9,3 z'

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
    
    // 找到選中宮位的詳細信息
    const selectedPalaceData = palaceData.find(p => p.name === selectedPalace)
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
  }, [selectedPalace, chart, mutagenDisplay, palaceData])

  if (!chart || !birthInfo) return null

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

  const getStemByRoleLabel = (
    label: string,
    labelsByPalaceName: Record<string, string>,
  ): string | null => {
    if (!label) return null
    const targetEnglishKey = Object.entries(labelsByPalaceName).find(([, mappedLabel]) => mappedLabel === label)?.[0]
    if (!targetEnglishKey) return null
    const targetPalace = palaceData.find((p) => (PALACE_NAME_TO_ENGLISH_MAP[p.name] || '') === targetEnglishKey)
    return targetPalace?.stem || null
  }

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
          const clickedDecadalLabel = decadalLabelsByPalaceName[englishKey] || ''
          const clickedAnnualLabel = annualLabelsByPalaceName[englishKey] || ''
          const clickedDecadalStem = getStemByRoleLabel(clickedDecadalLabel, decadalLabelsByPalaceName)
          const clickedAnnualStem = getStemByRoleLabel(clickedAnnualLabel, annualLabelsByPalaceName)

          setBubblePalace({
            palace,
            rect: e.currentTarget.getBoundingClientRect(),
            decadalLabel: clickedDecadalLabel,
            annualLabel: clickedAnnualLabel,
            decadalStem: clickedDecadalStem || decadalLifePalaceStem,
            annualStem: clickedAnnualStem || annualLifePalaceStem,
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
          yearGan={yearGan || ''}
          gender={gender || 'male'}
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
                        className={arcFlowAnimationEnabled ? "dash-flow" : ""}
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
              className={lineExtensionAnimationEnabled ? "dash-flow-slow" : ""}
            />
            {/* 四正連線：本宮 ↔ 對宮 */}
            <line x1={p0.x} y1={p0.y} x2={pOpp.x} y2={pOpp.y}
              stroke="rgba(0, 200, 255, 0.7)" strokeWidth="1.5" strokeDasharray="8 4"
              strokeDashoffset={0}
              className={lineExtensionAnimationEnabled ? "dash-flow-slow" : ""} />
            {/* 四正連線：前3宮 ↔ 後3宮 */}
            <line x1={pFwd3.x} y1={pFwd3.y} x2={pBack3.x} y2={pBack3.y}
              stroke="rgba(0, 200, 255, 0.7)" strokeWidth="1.5" strokeDasharray="8 4"
              strokeDashoffset={0}
              className={lineExtensionAnimationEnabled ? "dash-flow-slow" : ""} />
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
            solarDate={solarDate || ''} 
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
          allPalaces={palaceData}
          anchorRect={bubblePalace.rect}
          onClose={() => setBubblePalace(null)}
          activeTab={bubbleActiveTab}
          onTabChange={setBubbleActiveTab}
          chartType={chartType}
          decadalLabel={bubblePalace.decadalLabel}
          annualLabel={bubblePalace.annualLabel}
          decadalStem={bubblePalace.decadalStem}
          annualStem={bubblePalace.annualStem}
          annualGanZhi={bubblePalace.annualGanZhi}
          birthYearStem={yearGan}
          decadalLabelsByPalaceName={decadalLabelsByPalaceName}
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