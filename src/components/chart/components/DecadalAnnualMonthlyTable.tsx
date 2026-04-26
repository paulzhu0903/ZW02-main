/**
 * 大限-流年-流月-流日-流時表格組件（支持展開/收闔）
 */

import { useState, useEffect, useRef } from 'react'
import { getYearGanZhi, DISPLAY_MONTH_NAMES, EARTHLY_BRANCH_ORDER, CHINESE_DAY_NAMES, SHICHEN_NAMES } from '../utils/lunar'
import { getMonthlyGan } from '../utils/lunar'
import type { DecadalAnnualMonthlyTableProps } from '../types'

export function DecadalAnnualMonthlyTable({
  palaceData,
  birthInfo,
  selectedDecadal: externalSelectedDecadal = null,
  setSelectedDecadal: externalSetSelectedDecadal,
  selectedAnnual: externalSelectedAnnual = null,
  setSelectedAnnual: externalSetSelectedAnnual,
  selectedMonthly: externalSelectedMonthly = null,
  setSelectedMonthly: externalSetSelectedMonthly,
  selectedDaily: externalSelectedDaily = null,
  setSelectedDaily: externalSetSelectedDaily,
  selectedHourly: externalSelectedHourly = null,
  setSelectedHourly: externalSetSelectedHourly,
  isExpanded: externalIsExpanded,
}: DecadalAnnualMonthlyTableProps) {
  // 使用外部传入的状态，如果没有则使用内部状态
  const [internalSelectedDecadal, internalSetSelectedDecadal] = useState<number | null>(0)
  const selectedDecadal = externalSelectedDecadal !== undefined ? externalSelectedDecadal : internalSelectedDecadal
  const setSelectedDecadal = externalSetSelectedDecadal || internalSetSelectedDecadal
  
  const [internalSelectedAnnual, internalSetSelectedAnnual] = useState<number | null>(0)
  const selectedAnnual = externalSelectedAnnual !== undefined ? externalSelectedAnnual : internalSelectedAnnual
  const setSelectedAnnual = externalSetSelectedAnnual || internalSetSelectedAnnual
  
  const [internalIsExpanded] = useState(false)
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded
  
  const [internalSelectedMonthly, internalSetSelectedMonthly] = useState<number | null>(null)
  const selectedMonthly = externalSelectedMonthly !== undefined ? externalSelectedMonthly : internalSelectedMonthly
  const setSelectedMonthly = externalSetSelectedMonthly || internalSetSelectedMonthly

  const [internalSelectedDaily, internalSetSelectedDaily] = useState<number | null>(null)
  const selectedDaily = externalSelectedDaily !== undefined ? externalSelectedDaily : internalSelectedDaily
  const setSelectedDaily = externalSetSelectedDaily || internalSetSelectedDaily
  const [internalSelectedHourly, internalSetSelectedHourly] = useState<number | null>(null)
  const selectedHourly = externalSelectedHourly !== undefined ? externalSelectedHourly : internalSelectedHourly
  const setSelectedHourly = externalSetSelectedHourly || internalSetSelectedHourly
  const [dailyScrollOffset, setDailyScrollOffset] = useState(0)
  const [needsScrollSpacer, setNeedsScrollSpacer] = useState(false)
  const [annualYearsToShow, setAnnualYearsToShow] = useState(10) // 显示10个流年年份
  const tableWrapRef = useRef<HTMLDivElement>(null)
  
  // 當選擇新月份時，重置流日窗口位置
  const handleSetSelectedMonthly = (index: number | null) => {
    setSelectedMonthly(index)
    if (index === null) {
      setSelectedDaily(null)
      setSelectedHourly(null)
    } else {
      setSelectedDaily(null)
      setSelectedHourly(null)
    }
    setDailyScrollOffset(0)
  }
  
  // 天干地支列表
  const shichen = SHICHEN_NAMES
  const monthNames = DISPLAY_MONTH_NAMES
  
  // 提取大限信息
  const decadalData = palaceData
    .filter(p => p.decadal?.range)
    .map((p) => ({
      ageStart: p.decadal.range[0],
      ageEnd: p.decadal.range[1],
      stem: p.stem,
      branch: p.branch,
    }))
    .sort((a, b) => a.ageStart - b.ageStart)

  // 生成流年數據
  const getAnnualData = () => {
    if (selectedDecadal === null) return []
    const decadal = decadalData[selectedDecadal]
    return Array.from({ length: annualYearsToShow }, (_, i) => {
      const age = decadal.ageStart + i
      const year = birthInfo.year + (age - 1)
      return {
        age,
        year,
      }
    })
  }

  const annualData = getAnnualData()

  useEffect(() => {
    const updateScrollSpacer = () => {
      const root = tableWrapRef.current
      if (!root) return

      // 所有设备都显示10个流年
      setAnnualYearsToShow(10)

      const scrollAreas = Array.from(root.querySelectorAll<HTMLElement>('[data-scroll-area="true"]'))
      const hasOverflow = scrollAreas.some((el) => el.scrollWidth > el.clientWidth + 1)
      setNeedsScrollSpacer(hasOverflow)
    }

    const frameId = window.requestAnimationFrame(updateScrollSpacer)
    window.addEventListener('resize', updateScrollSpacer)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateScrollSpacer)
    }
  }, [isExpanded, selectedDecadal, selectedAnnual, selectedMonthly, dailyScrollOffset, palaceData])

  const rowClass = 'flex items-stretch gap-0 leading-none'
  const rowLabelClass = 'shrink-0 flex items-center justify-center px-1 py-0.5 sm:px-1.5 sm:py-0 text-[8px] sm:text-[12px] lg:text-[16px] text-text-muted font-medium leading-tight bg-[#f5f5f7] min-w-[18px] sm:min-w-[40px] border border-white/[0.12] rounded-sm whitespace-nowrap'
  const scrollAreaClass = `flex-1 min-w-0 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] ${needsScrollSpacer ? 'pb-1 sm:pb-1.5' : 'pb-0'}`
  const scrollTableClass = 'w-full min-w-full text-[8px] sm:text-[12px] lg:text-[16px] leading-tight table-fixed border-collapse border border-white/[0.12]'
  const arrowButtonClass = 'px-0.5 py-0.5 sm:px-1.5 sm:py-1 rounded-md sm:rounded-lg transition-all bg-white/[0.05] text-text-secondary hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed min-w-5 h-5 sm:min-w-7 sm:h-7 text-[10px] sm:text-base'

  const renderScrollRow = (label: string, cells: any) => (
    <div className={rowClass}>
      <div className={rowLabelClass}>{label}</div>
      <div
        className={scrollAreaClass}
        data-scroll-area="true"
        style={{ scrollbarGutter: needsScrollSpacer ? 'stable' : 'auto' }}
      >
        <table className={scrollTableClass}>
          <tbody>
            <tr className="border-b border-white/[0.12]">{cells}</tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div ref={tableWrapRef} className="pt-px border-t border-white/[0.06]">
      <div className="px-0.5 pb-1 text-[10px] text-text-muted sm:hidden">
        左右滑動可查看完整大限／流年表格
      </div>

      {/* 展開模式：完整表格 */}
      {isExpanded && (
        <div className="space-y-0">
          {renderScrollRow('大限', decadalData.map((item, i) => (
            <td 
              key={i} 
              className={`relative z-0 px-0 py-0.5 sm:px-1.5 sm:py-1.5 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-medium text-[7px] sm:text-[12px] lg:text-[16px] min-w-[44px] sm:min-w-[64px] ${
                selectedDecadal === i 
                  ? 'bg-white/[0.01] text-star-light' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                if (selectedDecadal === i) {
                  setSelectedDecadal(null)
                  setSelectedAnnual(null)
                  setSelectedMonthly(null)
                  setSelectedDaily(null)
                  setSelectedHourly(null)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedDecadal(i)
                setSelectedAnnual(null)
                setSelectedMonthly(null)
                setSelectedDaily(null)
                setSelectedHourly(null)
                setDailyScrollOffset(0)
              }}
            >
              <div className={`flex flex-col items-center gap-px leading-tight rounded-[2px] px-0.5 py-0 sm:px-1.5 sm:py-0.5 ${selectedDecadal === i ? 'bg-star/20' : ''}`}>
                <div className="whitespace-nowrap">
                  {item.ageStart}~{item.ageEnd}
                </div>
                <div className="text-[7px] sm:text-[12px] text-text-muted whitespace-nowrap">
                  {item.stem}{item.branch}限
                </div>
              </div>
            </td>
          )))}

          {selectedDecadal !== null && annualData.length > 0 && renderScrollRow('流年', annualData.map((item, i) => (
            <td 
              key={i} 
              className={`relative z-0 px-0 py-0.5 sm:px-1.5 sm:py-1.5 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-medium text-[7px] sm:text-[12px] lg:text-[16px] min-w-[54px] sm:min-w-[72px] ${
                selectedAnnual === i 
                  ? 'bg-white/[0.01] text-fortune' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                if (selectedAnnual === i) {
                  setSelectedAnnual(null)
                  setSelectedMonthly(null)
                  setSelectedDaily(null)
                  setSelectedHourly(null)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedAnnual(i)
                handleSetSelectedMonthly(null)
              }}
            >
              <div className={`flex flex-col items-center gap-0 leading-tight rounded-[2px] px-1 py-0.5 sm:px-1.5 sm:py-1 ${selectedAnnual === i ? 'bg-fortune/20' : ''}`}>
                <div className="whitespace-nowrap text-[7px] sm:text-[12px]">
                  {item.year}年
                </div>
                <div className="text-[7px] sm:text-[10px] text-text-muted whitespace-nowrap">
                  {getYearGanZhi(item.year)}{item.age}歲
                </div>
              </div>
            </td>
          )))}

          {selectedAnnual !== null && renderScrollRow('流月', monthNames.map((month, i) => {
            const monthIndex = i + 1
            // 獲取當前流年的年份
            const currentYear = annualData[selectedAnnual]?.year
            // 計算流月天干和地支
            const monthlyGan = currentYear ? getMonthlyGan(currentYear, monthIndex) : ''
            const monthlyZhi = EARTHLY_BRANCH_ORDER[(monthIndex + 1) % 12]
            const monthlyGanZhi = monthlyGan ? `${monthlyGan}${monthlyZhi}` : ''

            let displayMonth = month
            if (month === '冬') displayMonth = '冬'
            if (month === '臘') displayMonth = '臘'

            return (
            <td 
              key={i} 
              className={`relative z-0 px-0 py-0.5 sm:px-1.5 sm:py-2 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-medium text-[10px] sm:text-[12px] lg:text-[16px] min-w-[38px] sm:min-w-[48px] ${
                selectedMonthly === i 
                  ? 'bg-white/[0.01] text-gold' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                handleSetSelectedMonthly(selectedMonthly === i ? null : i)
              }}
            >
              <div className={`rounded-[4px] px-1 py-0.5 sm:px-1.5 sm:py-0.5 flex flex-col items-center gap-0 leading-tight ${selectedMonthly === i ? 'bg-gold/20' : ''}`}>
                <div className="text-[8px] sm:text-[9px] lg:text-[10px]">{displayMonth}月</div>
                {monthlyGanZhi && (
                  <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-text-muted">
                    {monthlyGanZhi}
                  </div>
                )}
              </div>
            </td>
            )
          }))}

          {/* 流日表格 - 使用左右箭頭控制 */}
          {selectedMonthly !== null && (
            <div className={rowClass}>
              <div className={rowLabelClass}>流日</div>

              <button
                onClick={() => setDailyScrollOffset(Math.max(0, dailyScrollOffset - 1))}
                disabled={dailyScrollOffset === 0}
                className={arrowButtonClass}
              >
                &lt;
              </button>

              <div className="overflow-hidden flex-1 min-w-0">
                <table className={scrollTableClass}>
                  <tbody>
                    <tr className="border-b border-white/[0.12]">
                      {Array.from({ length: 10 }, (_, i) => {
                        const dayIndex = dailyScrollOffset + i
                        if (dayIndex >= 30) return null
                        const dayLabel = CHINESE_DAY_NAMES[dayIndex]
                        return (
                          <td 
                            key={dayIndex} 
                            className={`relative z-0 px-0 py-1 sm:px-1.5 sm:py-2 text-center cursor-pointer transition-colors font-medium text-[8px] sm:text-[12px] lg:text-[16px] min-w-[30px] sm:min-w-[52px] border-r border-white/[0.12] whitespace-nowrap ${
                              selectedDaily === dayIndex 
                                ? 'bg-white/[0.01] text-star-light' 
                                : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
                            }`}
                            onClick={() => {
                              if (selectedDaily === dayIndex) {
                                setSelectedDaily(null)
                                setSelectedHourly(null)
                              } else {
                                setSelectedDaily(dayIndex)
                                setSelectedHourly(null)
                              }
                            }}
                          >
                            <div className={`whitespace-nowrap rounded-[4px] px-1 py-0 sm:px-1.5 sm:py-0.5 ${selectedDaily === dayIndex ? 'bg-star-light/20' : ''}`}>
                              {dayLabel}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setDailyScrollOffset(Math.min(20, dailyScrollOffset + 1))}
                disabled={dailyScrollOffset >= 20}
                className={arrowButtonClass}
              >
                &gt;
              </button>
            </div>
          )}

          {selectedMonthly !== null && selectedDaily !== null && renderScrollRow('流時', shichen.map((time, i) => (
            <td 
              key={i} 
              className={`relative z-0 px-0 py-1 sm:px-1.5 sm:py-2 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-medium text-[8px] sm:text-[12px] lg:text-[16px] whitespace-nowrap min-w-[30px] sm:min-w-[52px] ${
                selectedHourly === i
                  ? 'bg-white/[0.01] text-gold'
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                if (selectedHourly === i) {
                  setSelectedHourly(null)
                } else {
                  setSelectedHourly(i)
                }
              }}
            >
              <div className={`whitespace-nowrap rounded-[4px] px-1 py-0 sm:px-1.5 sm:py-0.5 ${selectedHourly === i ? 'bg-gold/20' : ''}`}>
                {time}
              </div>
            </td>
          )))}
        </div>
      )}

      {/* 收闔模式：只顯示大限及流年表格 */}
      {!isExpanded && (
        <div className="space-y-0">
          {renderScrollRow('大限', decadalData.map((item, i) => (
            <td 
              key={i} 
              className={`relative z-0 px-1 py-1 sm:px-1.5 sm:py-1.5 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-mono text-[10px] sm:text-[12px] lg:text-[16px] min-w-[50px] sm:min-w-[64px] ${
                selectedDecadal === i 
                  ? 'bg-white/[0.01] text-star-light' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                if (selectedDecadal === i) {
                  setSelectedDecadal(null)
                  setSelectedAnnual(null)
                  setSelectedMonthly(null)
                  setSelectedDaily(null)
                  setSelectedHourly(null)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedDecadal(i)
                setSelectedAnnual(null)
                setSelectedMonthly(null)
                setSelectedDaily(null)
                setSelectedHourly(null)
                setDailyScrollOffset(0)
              }}
            >
              <div className={`flex flex-col items-center gap-0 leading-tight rounded-[4px] px-1 py-0.5 sm:px-1.5 sm:py-1 ${selectedDecadal === i ? 'bg-star/20' : ''}`}>
                <div className="whitespace-nowrap text-[7px] sm:text-[12px]">
                  {item.ageStart}~{item.ageEnd}
                </div>
                <div className="text-[6.5px] sm:text-[10px] text-text-muted whitespace-nowrap">
                  {item.stem}{item.branch}限
                </div>
              </div>
            </td>
          )))}

          {selectedDecadal !== null && annualData.length > 0 && renderScrollRow('流年', annualData.map((item, i) => (
            <td 
              key={i} 
              className={`relative z-0 px-1 py-1 sm:px-1.5 sm:py-1.5 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-mono text-[10px] sm:text-[12px] lg:text-[16px] min-w-[54px] sm:min-w-[72px] ${
                selectedAnnual === i 
                  ? 'bg-white/[0.01] text-fortune' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                if (selectedAnnual === i) {
                  setSelectedAnnual(null)
                  setSelectedMonthly(null)
                  setSelectedDaily(null)
                  setSelectedHourly(null)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedAnnual(i)
                setSelectedMonthly(null)
                setSelectedDaily(null)
                setSelectedHourly(null)
                setDailyScrollOffset(0)
              }}
            >
              <div className={`flex flex-col items-center gap-0 leading-tight rounded-[4px] px-1 py-0.5 sm:px-1.5 sm:py-1 ${selectedAnnual === i ? 'bg-fortune/20' : ''}`}>
                <div className="whitespace-nowrap text-[7px] sm:text-[12px]">
                  {item.year}年
                </div>
                <div className="text-[6.5px] sm:text-[10px] text-text-muted whitespace-nowrap">
                  {getYearGanZhi(item.year)}{item.age}歲
                </div>
              </div>
            </td>
          )))}
        </div>
      )}
    </div>
  )
}
