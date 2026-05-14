/**
 * 大限-流年-流月-流日-流時表格組件（支持展開/收闔）
 */

import { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)
  const PAGE_SIZE = isMobile ? 8 : 10
  const [dailyScrollOffset, setDailyScrollOffset] = useState(0)
  const [decadalScrollOffset, setDecadalScrollOffset] = useState(0)
  const [annualScrollOffset, setAnnualScrollOffset] = useState(0)
  const [monthlyScrollOffset, setMonthlyScrollOffset] = useState(0)
  const [hourlyScrollOffset, setHourlyScrollOffset] = useState(0)
  const annualYearsToShow = 10 // 显示10个流年年份

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])
  
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
    setHourlyScrollOffset(0)
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
    if (selectedMonthly === null || selectedDaily === null) return

    const maxOffset = Math.max(0, CHINESE_DAY_NAMES.length - PAGE_SIZE)
    const targetOffset = Math.min(Math.floor(selectedDaily / PAGE_SIZE) * PAGE_SIZE, maxOffset)

    if (dailyScrollOffset !== targetOffset) {
      setDailyScrollOffset(targetOffset)
    }
  }, [selectedMonthly, selectedDaily, dailyScrollOffset, PAGE_SIZE])

  const rowClass = 'flex items-stretch gap-0 leading-none'
  const rowLabelClass = 'flex items-center justify-center px-1 py-1 sm:px-1 sm:py-1 text-[10px] sm:text-[12px] lg:text-[16px] text-text-muted font-medium leading-tight bg-[#f5f5f7] min-w-[18px] sm:min-w-[40px] border border-gray-500/[0.12] rounded-sm whitespace-nowrap'
  const tableWrapClass = 'overflow-hidden flex-1 min-w-0'
  const scrollTableClass = 'w-full min-w-full text-[10px] sm:text-[12px] lg:text-[16px] leading-tight table-fixed border-collapse border border-gray-500/[0.12]'
  const arrowButtonClass = 'self-center px-0 py-0.5 sm:px-0 sm:py-0.5 rounded-md sm:rounded-lg transition-all bg-white/[0.05] text-text-secondary hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed w-3 h-5 sm:w-3 sm:h-6 text-[10px] sm:text-sm'
  const tableCellClass = 'relative z-0 h-[30px] sm:h-[36px] lg:h-[42px] px-0.5 sm:px-1 text-center cursor-pointer transition-colors border-r border-gray-500/[0.12] whitespace-nowrap align-middle'
  const tableCellInnerClass = 'h-full w-full rounded-[3px] px-0.5 py-0 sm:px-1 sm:py-0.5 flex flex-col items-center justify-center gap-0 leading-tight'
  const maxDailyOffset = Math.max(0, CHINESE_DAY_NAMES.length - PAGE_SIZE)

  const renderPagedRow = (label: string, cells: any[], offset: number, setOffset: (value: number) => void) => {
    const maxOffset = Math.max(0, cells.length - PAGE_SIZE)
    const safeOffset = Math.min(offset, maxOffset)
    const visibleCells = cells.slice(safeOffset, safeOffset + PAGE_SIZE)
    const emptyCount = Math.max(0, PAGE_SIZE - visibleCells.length)

    return (
      <div className={rowClass}>
        <div className={rowLabelClass}>{label}</div>

        <button
          onClick={() => setOffset(Math.max(0, safeOffset - 1))}
          disabled={safeOffset === 0}
          className={arrowButtonClass}
        >
          &lt;
        </button>

        <div className={tableWrapClass}>
          <table className={scrollTableClass}>
            <tbody>
              <tr className="border-b border-gray-500/[0.12]">
                {visibleCells}
                {Array.from({ length: emptyCount }, (_, i) => (
                  <td key={`empty-${label}-${i}`} className={tableCellClass} />
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <button
          onClick={() => setOffset(Math.min(maxOffset, safeOffset + 1))}
          disabled={safeOffset >= maxOffset}
          className={arrowButtonClass}
        >
          &gt;
        </button>
      </div>
    )
  }

  return (
    <div className="pt-px border-t border-gray-500/[0.06] -mx-1 sm:-mx-2 lg:-mx-3">

      {/* 展開模式：完整表格 */}
      {isExpanded && (
        <div className="space-y-0">
          {renderPagedRow('大限', decadalData.map((item, i) => (
            <td 
              key={i} 
              className={`${tableCellClass} font-medium text-[9px] sm:text-[12px] lg:text-[16px] ${
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
                  setAnnualScrollOffset(0)
                  setMonthlyScrollOffset(0)
                  setHourlyScrollOffset(0)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedDecadal(i)
                setSelectedAnnual(null)
                setSelectedMonthly(null)
                setSelectedDaily(null)
                setSelectedHourly(null)
                setAnnualScrollOffset(0)
                setMonthlyScrollOffset(0)
                setHourlyScrollOffset(0)
                setDailyScrollOffset(0)
              }}
            >
              <div className={`${tableCellInnerClass} rounded-[2px] ${selectedDecadal === i ? 'bg-star/20' : ''}`}>
                <div className="whitespace-nowrap text-[9px] sm:text-[12px]">
                  {item.ageStart}~{item.ageEnd}
                </div>
                <div className="whitespace-nowrap text-[9px] sm:text-[10px] text-text-muted">
                  {item.stem}{item.branch}限
                </div>
              </div>
            </td>
          )), decadalScrollOffset, setDecadalScrollOffset)}

          {selectedDecadal !== null && annualData.length > 0 && renderPagedRow('流年', annualData.map((item, i) => (
            <td 
              key={i} 
              className={`${tableCellClass} font-medium text-[9px] sm:text-[12px] lg:text-[16px] ${
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
                  setMonthlyScrollOffset(0)
                  setHourlyScrollOffset(0)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedAnnual(i)
                setMonthlyScrollOffset(0)
                handleSetSelectedMonthly(null)
              }}
            >
              <div className={`${tableCellInnerClass} rounded-[2px] ${selectedAnnual === i ? 'bg-fortune/20' : ''}`}>
                <div className="whitespace-nowrap text-[9px] sm:text-[12px]">
                  {item.year}年
                </div>
                <div className="text-[9px] sm:text-[10px] text-text-muted whitespace-nowrap">
                  {getYearGanZhi(item.year)}{item.age}歲
                </div>
              </div>
            </td>
          )), annualScrollOffset, setAnnualScrollOffset)}

          {selectedAnnual !== null && renderPagedRow('流月', monthNames.map((month, i) => {
            const monthIndex = i + 1
            // 獲取當前流年的年份
            const currentYear = annualData[selectedAnnual]?.year
            // 計算流月天干和地支
            const monthlyGan = currentYear ? getMonthlyGan(currentYear, monthIndex) : ''
            const monthlyZhi = EARTHLY_BRANCH_ORDER[(monthIndex + 1) % 12]
            const monthlyGanZhi = monthlyGan ? `${monthlyGan}${monthlyZhi}` : ''

            const getDisplayMonth = (m: string): string => {
              if (m === '冬月') return '冬'
              if (m === '臘月') return '臘'
              return m.replace('月', '')
            }

            return (
            <td 
              key={i} 
              className={`${tableCellClass} font-medium text-[12px] sm:text-[12px] lg:text-[16px] ${
                selectedMonthly === i 
                  ? 'bg-white/[0.01] text-gold' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                handleSetSelectedMonthly(selectedMonthly === i ? null : i)
              }}
            >
              <div className={`${tableCellInnerClass} ${selectedMonthly === i ? 'bg-gold/20' : ''}`}>
                <div className="text-[10px] sm:text-[9px] lg:text-[10px]">{getDisplayMonth(month)}月</div>
                {monthlyGanZhi && (
                  <div className="text-[10px] sm:text-[9px] lg:text-[10px] text-text-muted">
                    {monthlyGanZhi}
                  </div>
                )}
              </div>
            </td>
            )
          }), monthlyScrollOffset, setMonthlyScrollOffset)}

          {/* 流日表格 - 使用左右箭頭控制 */}
          {selectedMonthly !== null && (
            <div className={rowClass}>
              <div className={rowLabelClass}>流日</div>

              <button
                onClick={() => {
                  setSelectedDaily(null)
                  setSelectedHourly(null)
                  setDailyScrollOffset(Math.max(0, dailyScrollOffset - PAGE_SIZE))
                }}
                disabled={dailyScrollOffset === 0}
                className={arrowButtonClass}
              >
                &lt;
              </button>

              <div className={tableWrapClass}>
                <table className={scrollTableClass}>
                  <tbody>
                    <tr className="border-b border-gray-500/[0.12]">
                      {Array.from({ length: PAGE_SIZE }, (_, i) => {
                        const dayIndex = dailyScrollOffset + i
                        if (dayIndex >= 30) return null
                        const dayLabel = CHINESE_DAY_NAMES[dayIndex]
                        return (
                          <td 
                            key={dayIndex} 
                            className={`${tableCellClass} font-medium text-[10px] sm:text-[12px] lg:text-[16px] ${
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
                            <div className={`${tableCellInnerClass} ${selectedDaily === dayIndex ? 'bg-star-light/20' : ''}`}>
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
                onClick={() => {
                  setSelectedDaily(null)
                  setSelectedHourly(null)
                  setDailyScrollOffset(Math.min(maxDailyOffset, dailyScrollOffset + PAGE_SIZE))
                }}
                disabled={dailyScrollOffset >= maxDailyOffset}
                className={arrowButtonClass}
              >
                &gt;
              </button>
            </div>
          )}

          {selectedMonthly !== null && selectedDaily !== null && renderPagedRow('流時', shichen.map((time, i) => (
            <td 
              key={i} 
              className={`${tableCellClass} font-medium text-[10px] sm:text-[12px] lg:text-[16px] ${
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
              <div className={`${tableCellInnerClass} ${selectedHourly === i ? 'bg-gold/20' : ''}`}>
                {time}
              </div>
            </td>
          )), hourlyScrollOffset, setHourlyScrollOffset)}
        </div>
      )}

      {/* 收闔模式：只顯示大限及流年表格 */}
      {!isExpanded && (
        <div className="space-y-0">
          {renderPagedRow('大限', decadalData.map((item, i) => (
            <td 
              key={i} 
              className={`${tableCellClass} font-medium text-[9px] sm:text-[12px] lg:text-[16px] ${
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
                  setAnnualScrollOffset(0)
                  setMonthlyScrollOffset(0)
                  setHourlyScrollOffset(0)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedDecadal(i)
                setSelectedAnnual(null)
                setSelectedMonthly(null)
                setSelectedDaily(null)
                setSelectedHourly(null)
                setAnnualScrollOffset(0)
                setMonthlyScrollOffset(0)
                setHourlyScrollOffset(0)
                setDailyScrollOffset(0)
              }}
            >
              <div className={`${tableCellInnerClass} ${selectedDecadal === i ? 'bg-star/20' : ''}`}>
                <div className="whitespace-nowrap text-[9px] sm:text-[12px]">
                  {item.ageStart}~{item.ageEnd}
                </div>
                <div className="whitespace-nowrap text-[9px] sm:text-[10px] text-text-muted">
                  {item.stem}{item.branch}限
                </div>
              </div>
            </td>
          )), decadalScrollOffset, setDecadalScrollOffset)}

          {selectedDecadal !== null && annualData.length > 0 && renderPagedRow('流年', annualData.map((item, i) => (
            <td 
              key={i} 
              className={`${tableCellClass} font-medium text-[9px] sm:text-[12px] lg:text-[16px] ${
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
                  setMonthlyScrollOffset(0)
                  setHourlyScrollOffset(0)
                  setDailyScrollOffset(0)
                  return
                }

                setSelectedAnnual(i)
                setMonthlyScrollOffset(0)
                setSelectedMonthly(null)
                setSelectedDaily(null)
                setSelectedHourly(null)
                setHourlyScrollOffset(0)
                setDailyScrollOffset(0)
              }}
            >
              <div className={`${tableCellInnerClass} ${selectedAnnual === i ? 'bg-fortune/20' : ''}`}>
                <div className="whitespace-nowrap text-[9px] sm:text-[12px]">
                  {item.year}年
                </div>
                <div className="text-[9px] sm:text-[10px] text-text-muted whitespace-nowrap">
                  {getYearGanZhi(item.year)}{item.age}歲
                </div>
              </div>
            </td>
          )), annualScrollOffset, setAnnualScrollOffset)}
        </div>
      )}
    </div>
  )
}
