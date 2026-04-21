/* ============================================================
   時間表查詢模態框 - 大限、流年、流月、流日、流時
   ============================================================ */

import { useState, useEffect } from 'react'
import { Select } from '@/components/ui'
import { type Language } from '@/lib/i18n'
import { solar2lunar } from 'iztro/lib/calendar'
import type { PalaceData } from './types'

interface TimeTableModalProps {
  isOpen: boolean
  onClose: () => void
  birthInfo: {
    year: number
    month: number
    day: number
    hour: number
  }
  palaceData?: PalaceData[]
  language: Language
  selectedDecadal?: number | null
  selectedAnnual?: number | null
  selectedMonthly?: number | null
  selectedDaily?: number | null
  selectedHourly?: number | null
  onConfirm?: (data: {
    year: number
    month: number
    day: number
    hour: number
    minute?: number
    selectedDecadal?: number | null
    selectedAnnual?: number | null
    selectedMonthly?: number | null
    selectedDaily?: number | null
    selectedHourly?: number | null
  }) => void
}

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function getGanZhiYear(year: number) {
  const heavenlyStem = HEAVENLY_STEMS[(year - 4) % 10]
  const earthlyBranch = EARTHLY_BRANCHES[(year - 4) % 12]
  return `${heavenlyStem}${earthlyBranch}`
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}月`,
}))

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}日`,
}))

const HOUR_SELECT_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}))

const MINUTE_SELECT_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}))

export function TimeTableModal({
  isOpen,
  onClose,
  birthInfo,
  palaceData = [],
  language,
  selectedDecadal: initialDecadal,
  selectedAnnual: initialAnnual,
  onConfirm,
}: TimeTableModalProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [month, setMonth] = useState<number>(1)
  const [day, setDay] = useState<number>(1)
  const [hour, setHour] = useState<number>(() => new Date().getHours())
  const [minute, setMinute] = useState<number>(() => new Date().getMinutes())
  const [selectedDecadal, setSelectedDecadal] = useState<number | null>(initialDecadal || null)
  const [selectedAnnual, setSelectedAnnual] = useState<number | null>(initialAnnual || null)

  useEffect(() => {
    if (isOpen) {
      // 每次開啟都同步系統當前時間，避免固定在 13:00
      const today = new Date()
      setYear(today.getFullYear())
      setMonth(today.getMonth() + 1)
      setDay(today.getDate())
      setHour(today.getHours())
      setMinute(today.getMinutes())
      setSelectedDecadal(initialDecadal || null)
      setSelectedAnnual(initialAnnual || null)
    }
  }, [isOpen, initialDecadal, initialAnnual])

  // 当选择流年后，自动更新年份
  useEffect(() => {
    if (selectedAnnual !== null && selectedDecadal !== null && annualData[selectedAnnual]) {
      setYear(annualData[selectedAnnual].year)
    }
  }, [selectedAnnual, selectedDecadal])

  const handleConfirm = () => {
    if (onConfirm) {
      // 先轉換為農曆月日（流月、流日計算基於農曆）
      let lunarMonth = month
      let lunarDay = day
      
      try {
        const lunarResult = solar2lunar(
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        )
        if (lunarResult) {
          lunarMonth = lunarResult.lunarMonth
          lunarDay = lunarResult.lunarDay
        }
      } catch (e) {
        console.error('Error converting to lunar:', e)
      }
      
      // 計算流月、流日、流時的索引（基於農曆月日和宮位順序 0-11）
      const selectedMonthlyIndex = selectedDecadal !== null && selectedAnnual !== null ? (lunarMonth - 1) % 12 : null
      const selectedDailyIndex = selectedDecadal !== null && selectedAnnual !== null ? (lunarDay - 1) % 12 : null
      const selectedHourlyIndex = selectedDecadal !== null && selectedAnnual !== null ? Math.floor((hour + 1) / 2) : null
      
      onConfirm({
        year,
        month: lunarMonth,
        day: lunarDay,
        hour,
        minute,
        selectedDecadal,
        selectedAnnual,
        selectedMonthly: selectedMonthlyIndex,
        selectedDaily: selectedDailyIndex,
        selectedHourly: selectedHourlyIndex,
      })
    }
    onClose()
  }

  // 計算大限數據（與 DecadalAnnualMonthlyTable 保持一致）
  const decadalData = palaceData
    .filter(p => p.decadal?.range)
    .map((p) => ({
      ageStart: p.decadal.range[0],
      ageEnd: p.decadal.range[1],
      stem: p.stem,
      branch: p.branch,
    }))
    .sort((a, b) => a.ageStart - b.ageStart)

  // 計算流年數據
  const getAnnualData = () => {
    if (selectedDecadal === null || !decadalData[selectedDecadal]) return []
    const decadal = decadalData[selectedDecadal]
    return Array.from({ length: 10 }, (_, i) => {
      const age = decadal.ageStart + i
      const year = birthInfo.year + age - 1
      return { age, year }
    })
  }

  const annualData = getAnnualData()

  // 获取年份选项
  const yearOptions = Array.from({ length: currentYear + 20 - birthInfo.year + 1 }, (_, i) => ({
    value: birthInfo.year + i,
    label: `${birthInfo.year + i}年`,
  })).reverse()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 p-8 rounded-2xl bg-white/[0.95] backdrop-blur-xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* 标题 */}
        <h2 className="text-2xl font-bold text-purple-600 mb-6">
          {language === 'zh-TW' ? '流年月日時表' : '流年月日时表'}
        </h2>

        
        {/* 大限、流年選擇 */}
        {palaceData.length > 0 && decadalData.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="text-sm font-semibold text-gray-700 mb-3">🎯 {language === 'zh-TW' ? '大限、流年選擇' : '大限、流年选择'}</div>

            <div className="grid grid-cols-2 gap-4">
              {/* 大限選擇 */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">{language === 'zh-TW' ? '大限' : '大限'}</label>
                <Select
                  options={[
                    { value: -1, label: language === 'zh-TW' ? '-- 未選擇 --' : '-- 未选择 --' },
                    ...decadalData.map((item, i) => ({
                      value: i,
                      label: `${item.ageStart}-${item.ageEnd}歲`
                    }))
                  ]}
                  value={selectedDecadal ?? -1}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setSelectedDecadal(val === -1 ? null : val)
                    setSelectedAnnual(null)
                  }}
                />
              </div>

              {/* 流年選擇 */}
              {selectedDecadal !== null && annualData.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">{language === 'zh-TW' ? '流年' : '流年'}</label>
                  <Select
                    options={[
                      { value: -1, label: language === 'zh-TW' ? '-- 未選擇 --' : '-- 未选择 --' },
                      ...annualData.map((item, i) => ({
                        value: i,
                        label: `${item.year}年`
                      }))
                    ]}
                    value={selectedAnnual ?? -1}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setSelectedAnnual(val === -1 ? null : val)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        
        {/* 日期時間輸入 */}
        {selectedAnnual !== null ? (
          // 流年已選擇：只需要選擇月、日、時、分
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              {language === 'zh-TW' ? `年份自動設定為 ${year}，請選擇月、日、時、分` : `年份已自动设定为 ${year}，请选择月、日、时、分`}
            </label>
            <div className="grid grid-cols-4 gap-3">
              <Select
                options={MONTH_OPTIONS}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
              <Select
                options={DAY_OPTIONS}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              />
              <Select
                options={HOUR_SELECT_OPTIONS}
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
              />
              <Select
                options={MINUTE_SELECT_OPTIONS}
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
              />
            </div>
          </div>
        ) : (
          // 流年未選擇：顯示完整的月日時選擇
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-4 block">
              {language === 'zh-TW' ? '請輸入陽曆日期，系統會自動轉為農曆' : '请输入阳历日期，系统会自动转为农历'}
            </label>

            {/* 日期輸入框 */}
            <div className="grid grid-cols-5 gap-3">
              <div>
                <div className="text-xs text-gray-600 mb-1 font-semibold">{language === 'zh-TW' ? '年' : '年'}</div>
                <Select
                  options={yearOptions}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1 font-semibold">{language === 'zh-TW' ? '月' : '月'}</div>
                <Select
                  options={MONTH_OPTIONS}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1 font-semibold">{language === 'zh-TW' ? '日' : '日'}</div>
                <Select
                  options={DAY_OPTIONS}
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1 font-semibold">{language === 'zh-TW' ? '時' : '时'}</div>
                <Select
                  options={HOUR_SELECT_OPTIONS}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1 font-semibold">{language === 'zh-TW' ? '分' : '分'}</div>
                <Select
                  options={MINUTE_SELECT_OPTIONS}
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        
        {/* 顯示轉換後的日期 */}
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-xs font-semibold text-blue-600 mb-3">
            📅 {language === 'zh-TW' ? '查詢日期時間' : '查询日期时间'}
          </div>
          <div className="text-xs text-gray-700 font-mono space-y-2">
            <div>【西曆】{year}年{String(month).padStart(2, '0')}月{String(day).padStart(2, '0')}日 {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</div>
            {(() => {
              try {
                const lunarResult = solar2lunar(
                  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                )
                if (lunarResult) {
                  const LUNAR_MONTH_LABELS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月']
                  const LUNAR_DAY_LABELS = [
                    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
                  ]
                  const SHICHEN_LABELS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
                  
                  const monthLabel = LUNAR_MONTH_LABELS[lunarResult.lunarMonth - 1]
                  const dayLabel = LUNAR_DAY_LABELS[lunarResult.lunarDay - 1]
                  
                  let shichenIndex: number
                  if (hour === 23) {
                    shichenIndex = 0
                  } else if (hour >= 0 && hour < 1) {
                    shichenIndex = 0
                  } else {
                    shichenIndex = Math.floor((hour + 1) / 2)
                  }
                  const hourLabel = SHICHEN_LABELS[shichenIndex] || ''
                  
                  return (
                    <>
                      <div>【農曆】{lunarResult.lunarYear}年{monthLabel}{dayLabel} {hourLabel}時</div>
                      <div>【天干地支】{getGanZhiYear(year)}年（{getGanZhiYear(lunarResult.lunarYear)}月）</div>
                    </>
                  )
                }
              } catch (e) {
                console.error('Error converting to lunar:', e)
              }
              return null
            })()}
          </div>
        </div>

        
        {/* 按鈕組 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 transition-colors text-sm font-medium"
          >
            {language === 'zh-TW' ? '取消' : '取消'}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md transition-all text-sm font-bold"
          >
            {language === 'zh-TW' ? '確定' : '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
