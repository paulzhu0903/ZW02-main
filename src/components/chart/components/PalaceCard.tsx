/**
 * 宮位卡片組件
 */

import { useSettingsStore } from '@/stores'
import { t } from '@/lib/i18n'
import {
  type PalaceData,
  PALACE_BRANCH_INDEX,
  PALACE_ORDER,
  PALACE_NAME_TO_ENGLISH_MAP,
  type PalaceCardProps,
} from '../types'
import {
  isMajorStarName,
  getDecadalPalaceIndex,
} from '../mutagenLines'
import { StarTag } from './StarTag'

export function PalaceCard({
  name, stem, branch, majorStars, minorStars, adjectiveStars,
  boshi12Deity, longlifeDeity, isLife, isBody, isCausePalace, isSelected, onClick, chartType = 'flying', selectedDecadal = null, selectedAnnual = null, monthlySequenceLabels = [], selectedDailyLabel = '', selectedHourlyLabel = '', selectedAnnualAge = null, selectedAnnualYear = null, selectedAnnualGanZhi = null, selectedAnnualLabel = '', selectedDecadalLabel = '', yearGan = '', gender = 'male', birthInfo = null, palaceData = null, decadalLifePalaceStem = null, annualLifePalaceStem = null, directionMark = null, directionFocus = null, selectedMonthlyPalaceBranch = null, selectedDailyPalaceBranch = null, selectedHourlyPalaceBranch = null
}: PalaceCardProps) {
  const { language, transformationShowGods, flyingShowGods, transformationShowCausePalace, transformationHideMinorStars } = useSettingsStore()
  const hasMergedDailyHourly = !!selectedDailyLabel && !!selectedHourlyLabel && selectedHourlyLabel.startsWith(selectedDailyLabel)
  
  // 計算流年和虛歲 - 基於當前宮位在大限中的相對位置
  let decadalYear: number | null = null
  let masterAge: number | null = null
  
  if (selectedDecadal !== null && selectedDecadal !== undefined && birthInfo && palaceData) {
    // 獲取全局decadalData信息
    const decadalDataArray = (palaceData as PalaceData[])
      .filter(p => (p as any).decadal?.range)
      .map((p: any) => ({
        ageStart: p.decadal.range[0],
        ageEnd: p.decadal.range[1],
      }))
      .sort((a: any, b: any) => a.ageStart - b.ageStart)
    
    if (decadalDataArray[selectedDecadal]) {
      // 如果有選中流年，計算該宮位對應的年份和虛歲
      if (selectedAnnual !== null && selectedAnnual !== undefined && selectedAnnualAge !== null && selectedAnnualGanZhi) {
        // 根據流年地支和選中宮位，計算相對偏移
        const yearlyBranch = selectedAnnualGanZhi.slice(-1) // 提取地支
        
        // 找出流年地支對應的宮位（年命宮）
        const yearlyLifePalace = palaceData.find(p => p.branch === yearlyBranch)
        if (yearlyLifePalace) {
          // 計算該宮位相對於年命宮的位置
          const lifeIndex = PALACE_BRANCH_INDEX[yearlyLifePalace.branch] ?? -1
          const currentIndex = PALACE_BRANCH_INDEX[branch] ?? -1
          
          if (lifeIndex !== -1 && currentIndex !== -1) {
            // 計算該宮位對應的標籤索引
            const labelIndex = (currentIndex - lifeIndex + 12) % 12
            
            // 該宮位的虛歲和年份 = 基礎虛歲 + 標籤索引
            masterAge = selectedAnnualAge + labelIndex
            if (masterAge !== null) {
              decadalYear = birthInfo.year + (masterAge - 1)
            }
          }
        }
      } else {
        // 沒有選中流年，使用原來的邏輯
        const decadalStartAge = decadalDataArray[selectedDecadal].ageStart
        
        // 計算當前宮位在大限中的相對位置
        const palaceIndex = PALACE_BRANCH_INDEX[branch] ?? -1
        const decadalStartIndex = (selectedDecadal * 10) % 12
        const relativePosition = (palaceIndex - decadalStartIndex + 12) % 12
        
        // 只有相對位置在0-9範圍內的宮位才顯示流年
        if (relativePosition < 10) {
          masterAge = decadalStartAge + relativePosition
          if (masterAge !== null) {
            decadalYear = birthInfo.year + (masterAge - 1)
          }
        }
      }
    }
  }

  // 获取英文参数名
  const englishPalaceName = PALACE_NAME_TO_ENGLISH_MAP[name]
  
  // 计算是否是当前选中的宫位（优先级：流時 > 流日 > 流月 > 流年 > 大限）
  let isCurrentHighlightPalace = false
  let isCurrentDecadalPalace = false
  let isCurrentAnnualPalace = false
  
  if (selectedAnnual !== null && selectedAnnual !== undefined && selectedAnnualGanZhi) {
    // 有選流年時的邏輯
    const yearlyBranch = selectedAnnualGanZhi.slice(-1)
    
    // 流年命宮判定（用於 getMutagenColors）
    isCurrentAnnualPalace = branch === yearlyBranch
    
    // 高亮宮位判定（優先最細粒度）
    if (selectedHourlyPalaceBranch) {
      isCurrentHighlightPalace = branch === selectedHourlyPalaceBranch
    } else if (selectedDailyPalaceBranch) {
      isCurrentHighlightPalace = branch === selectedDailyPalaceBranch
    } else if (selectedMonthlyPalaceBranch) {
      isCurrentHighlightPalace = branch === selectedMonthlyPalaceBranch
    } else {
      // 流月、流日、流時都為 null 時，顯示流年命宮高亮
      isCurrentHighlightPalace = branch === yearlyBranch
    }
  } else if (selectedDecadal !== null && selectedDecadal !== undefined && englishPalaceName) {
    // 只選了大限，沒選流年
    if (selectedDecadal === 0) {
      isCurrentDecadalPalace = englishPalaceName === 'ming'
      isCurrentHighlightPalace = englishPalaceName === 'ming'
    } else {
      const originIndex = PALACE_ORDER.indexOf(englishPalaceName)
      if (originIndex !== -1) {
        const newIndex = getDecadalPalaceIndex(originIndex, selectedDecadal, gender, yearGan)
        const newPalaceKey = PALACE_ORDER[newIndex]
        isCurrentDecadalPalace = newPalaceKey === 'ming'
        isCurrentHighlightPalace = newPalaceKey === 'ming'
      }
    }
  }
  
  // 原始宫位名称（用于右下角显示）
  const originalPalaceName = englishPalaceName 
    ? t(`palace.${englishPalaceName}`, language) || name
    : name

  // 宮位名稱固定為原始序列，不因大限/流年切換而改名
  const displayPalaceName = originalPalaceName
  const annualPalaceLabel = ''
  const shouldUseFixedAnnual = selectedAnnual !== null && monthlySequenceLabels.length > 0
  const displayYear = shouldUseFixedAnnual ? selectedAnnualYear : decadalYear
  const displayAge = shouldUseFixedAnnual ? selectedAnnualAge : masterAge
  const STAR_SLOT_WIDTH_CLASS = 'w-[14px] min-w-[14px] sm:w-[16px] sm:min-w-[16px] lg:w-[18px] lg:min-w-[18px]'
  
  return (
    <div
      onClick={onClick}
      className={`
        group relative px-0.5 py-0.5 sm:py-2 lg:py-3 h-full min-h-[120px] sm:min-h-[140px] lg:min-h-[200px] flex flex-col
        bg-white/[0.03] backdrop-blur-sm
        border border-gray-300 sm:border-1 rounded-sm
        transition-all duration-300 cursor-pointer
        hover:bg-white/[0.06] hover:border-gray-400
        ${isLife ? 'bg-gold/[0.03]' : ''}
        ${isBody ? 'bg-star/[0.03]' : ''}
        ${chartType === 'transformation' && transformationShowCausePalace && isCausePalace ? 'bg-amber/[0.03]' : ''}
        ${isSelected ? 'ring-1 sm:ring-2 ring-star border-star z-10' : ''}
        ${isCurrentHighlightPalace ? 'ring-2 sm:ring-[3px] ring-blue-400/60 border-blue-400/80 shadow-[0_0_12px_rgba(96,165,250,0.4)]' : ''}
      `}
    >
      {/* 星曜排列 - 主星/輔星與雜曜並排容器 */}
      <div className={`relative flex flex-row mb-0 flex-1 justify-start items-start gap-x-0.5 overflow-visible ${chartType === 'transformation' && transformationShowCausePalace && isCausePalace ? 'pr-1 sm:pr-2' : ''}`}>
        {/* 主星 + 輔星容器 */}
        <div className="flex flex-row flex-wrap items-start gap-x-0 gap-y-0 flex-1 min-w-0">
          {/* 主星 */}
          {majorStars.map((star, i) => (
            <div key={`major-wrap-${i}`} className={`${STAR_SLOT_WIDTH_CLASS} flex justify-center items-start`}>
              <StarTag
                key={`major-${i}`}
                star={star}
                isMajorStar={isMajorStarName(star.name)}
                chartType={chartType}
                selectedDecadal={selectedDecadal}
                selectedAnnual={selectedAnnual}
                isCurrentDecadalPalace={isCurrentDecadalPalace}
                isCurrentAnnualPalace={isCurrentAnnualPalace}
                decadalLifePalaceStem={decadalLifePalaceStem}
                annualLifePalaceStem={annualLifePalaceStem}
              />
            </div>
          ))}
          {/* 輔星 */}
          {(chartType === 'flying' || chartType === 'transformation' || chartType === 'trireme') && minorStars.map((star, i) => {
            // 四化盤中，如果隱藏輔星，則只顯示四個重要輔星（左輔、右弼、文昌、文曲）
            const keyMinorStars = ['左輔', '左辅', '右弼', '文昌', '文曲']
            const shouldShow = !transformationHideMinorStars || chartType !== 'transformation' || keyMinorStars.includes(star.name)
            
            if (!shouldShow) return null
            
            return (
              <div key={`minor-wrap-${i}`} className={`${STAR_SLOT_WIDTH_CLASS} flex justify-center items-start`}>
                <StarTag
                  key={`minor-${i}`}
                  star={star}
                  isMajorStar={isMajorStarName(star.name)}
                  chartType={chartType}
                  selectedDecadal={selectedDecadal}
                  selectedAnnual={selectedAnnual}
                  isCurrentDecadalPalace={isCurrentDecadalPalace}
                  isCurrentAnnualPalace={isCurrentAnnualPalace}
                  decadalLifePalaceStem={decadalLifePalaceStem}
                  annualLifePalaceStem={annualLifePalaceStem}
                />
              </div>
            )
          })}
        </div>

        {/* 雜曜獨立容器 */}
        {(chartType === 'flying' || chartType === 'trireme') && adjectiveStars.length > 0 && (
          <div className="flex flex-row flex-wrap justify-end items-start content-start gap-x-0 gap-y-0 w-[48px] sm:w-[60px] lg:w-[70px] shrink-0">
            {adjectiveStars.map((name, i) => (
              <div key={`adj-wrap-${i}`} className={`${STAR_SLOT_WIDTH_CLASS} flex justify-center items-start`}>
                <StarTag
                  key={`adj-${i}`}
                  star={{ name }}
                  isMajorStar={false}
                  forceTextColorClass="text-text-muted/70"
                  chartType={chartType}
                  selectedDecadal={selectedDecadal}
                  selectedAnnual={selectedAnnual}
                  isCurrentDecadalPalace={isCurrentDecadalPalace}
                  isCurrentAnnualPalace={isCurrentAnnualPalace}
                  decadalLifePalaceStem={decadalLifePalaceStem}
                  annualLifePalaceStem={annualLifePalaceStem}
                />
              </div>
            ))}
          </div>
        )}

        {/* 來因標籤 - 星耀區右上角 */}
        {chartType === 'transformation' && transformationShowCausePalace && isCausePalace && (
          <div 
            className="absolute top-0 right-0 h-full flex items-start justify-end pointer-events-none"
          >
            <div
              className="px-0.5 py-0.5 rounded border border-red-500 text-red-500 text-[11px] sm:text-[12px] lg:text-[15px] font-medium bg-white/70"
              style={{ writingMode: 'vertical-rl', lineHeight: 1 }}
            >
              {language === 'zh-TW' ? '來因' : '来因'}
            </div>
          </div>
        )}
      </div>

      {/* 十二神显示 - 由 i18n.ts 中的定义完全控制显示内容和语言 */}
      {((chartType === 'flying' && flyingShowGods) || (chartType === 'transformation' && transformationShowGods)) && (
        <div className="flex justify-between text-[9px] sm:text-[10px] lg:text-[13px] text-text-muted mb-0.5 border-t border-white/[0.04] pt-0.5 px-1 sm:px-1.5">
          <span>{t(`longlifeDeity.${longlifeDeity}`, language) || longlifeDeity}</span>
          <span>{t(`boshi12Deity.${boshi12Deity}`, language) || boshi12Deity}</span>
        </div>
      )}

      {/* 同一屬性（單一 ABCD）時，於宮位中心標示得/失 */}
      {directionMark && (!directionFocus || (directionMark === '得' ? directionFocus === '得' : directionMark === '失' ? directionFocus === '失' : true)) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] sm:text-[12px] lg:text-[14px] font-semibold border ${
              directionMark === '得'
                ? 'bg-emerald-500/40 text-emerald-100 border-emerald-400/70'
                : directionMark === '失'
                ? 'bg-rose-500/40 text-rose-100 border-rose-400/70'
                : 'bg-amber-500/40 text-amber-100 border-amber-400/70'
            }`}
          >
            {directionMark}
          </span>
        </div>
      )}

      {/* 底部布局: 左下(干支) + 中間(西元+虛歲/流月) + 右下(流年/大限/宮位名) */}
      <div className="relative flex items-center justify-between w-full gap-1 py-0.5">
        {/* 左下: 干支(縱排) */}
        <div className="flex flex-col gap-0.5" style={{ writingMode: 'vertical-rl', minWidth: '14px' }}>
          <span className="text-[11px] sm:text-[12px] lg:text-[15px] text-text-secondary leading-none">{stem}{branch}</span>
        </div>

        {/* 中間: 由上而下顯示 西元+虛歲、流月 */}
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-0.5">
          {(displayYear !== null || displayAge !== null) && (
            <div className="text-[9px] sm:text-[10px] lg:text-[13px] text-text-muted text-center leading-none whitespace-nowrap">
              {displayYear !== null && <span className="mr-0.5">{displayYear}</span>}
              {displayAge !== null && <span>{displayAge}歲</span>}
            </div>
          )}

          {monthlySequenceLabels.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-0 text-[8px] sm:text-[9px] lg:text-[13px] text-gray-400 leading-none">
              {monthlySequenceLabels.map((label) => {
                // 只去掉最後一個 "月" 字，並將十一、十二顯示為冬、臘
                let cleanLabel = label.replace(/月$/, '')
                cleanLabel = cleanLabel.replace('十一', '冬').replace('十二', '臘')
                return <span key={`${branch}-${label}`} className="whitespace-nowrap">{cleanLabel}</span>
              })}
            </div>
          )}

          {(selectedDailyLabel || selectedHourlyLabel) && (
            <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] lg:text-[13px] text-gray-400 text-center leading-none whitespace-nowrap">
              {hasMergedDailyHourly ? (
                <span>{selectedHourlyLabel}</span>
              ) : (
                <>
                  {selectedDailyLabel && <span>{selectedDailyLabel}</span>}
                  {selectedHourlyLabel && <span>{selectedHourlyLabel}</span>}
                </>
              )}
            </div>
          )}
        </div>

        {/* 右下: 流年 + 大限 + 宮位名 */}
        <div className="flex flex-col items-end justify-end gap-0.5 pr-0.5" style={{ minWidth: '24px', marginRight: 0, boxSizing: 'border-box' }}>
          {selectedAnnualLabel && (
            <span className="text-[11px] sm:text-[12px] lg:text-[15px] font-medium text-center leading-none inline-block" style={{ color: '#00aeff', minWidth: 24, maxWidth: 36 }}>
              {selectedAnnualLabel}
            </span>
          )}

          {!selectedAnnualLabel && annualPalaceLabel && (selectedAnnual === null || selectedAnnual === undefined) && (
            <span className="text-[11px] sm:text-[12px] lg:text-[15px] text-gray-400 text-center leading-none">
              {annualPalaceLabel}
            </span>
          )}

          {selectedDecadalLabel && (
            <span className="text-[11px] sm:text-[12px] lg:text-[15px] font-medium text-center leading-none inline-block" style={{ color: '#34C759', minWidth: 24, maxWidth: 36 }}>
              {selectedDecadalLabel}
            </span>
          )}

          <span className="text-[11px] sm:text-[12px] lg:text-[15px] font-medium text-center leading-none inline-block" style={{ color: '#FF3B30', minWidth: 24, maxWidth: 36 }}>
            {displayPalaceName}
          </span>
        </div>
      </div>
    </div>
  )
}
