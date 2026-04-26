/**
 * 中宮區域組件
 */

import { HoverHint } from '@/components/ui'
import { t } from '@/lib/i18n'
import { localizeChineseText } from '@/lib/localize-knowledge'
import { getNayin } from '../mutagenLines'
import { getLocalizedStarName, getLocalizedZodiacName, getLocalizedAstroSign } from '../utils/localization'
import TriIcon from '@/icons/Tri.svg'
import HintIcon from '@/icons/Hint.svg'
import CounterIcon from '@/icons/Counter.svg'
import FlyingIcon from '@/icons/Flying.svg'
import CalendarIcon from '@/icons/calendar.svg'
import type { FunctionalAstrolabe, BirthInfo } from '@/lib/astro'

interface CenterInfoProps {
  chart: FunctionalAstrolabe
  solarDate: string
  birthTime: string
  birthInfo?: Partial<BirthInfo>
  gender: string
  language: any
  nativeName?: string
  onHourChange?: (hour: number) => void
  showSanFangSiZheng?: boolean
  onToggleSanFangSiZheng?: () => void
  showBubbleHint?: boolean
  onToggleBubbleHint?: () => void
  showReversalCheck?: boolean
  onToggleReversalCheck?: () => void
  showFlyGongToolbox?: boolean
  onToggleFlyGongToolbox?: () => void
  onTimeTableClick?: () => void
}

export function CenterInfo({ chart, solarDate, birthTime, birthInfo, gender, language, nativeName, onHourChange, showSanFangSiZheng, onToggleSanFangSiZheng, showBubbleHint, onToggleBubbleHint, showReversalCheck = false, onToggleReversalCheck, showFlyGongToolbox = false, onToggleFlyGongToolbox, onTimeTableClick }: CenterInfoProps) {
  // 分割四柱 - 格式: "甲辰 丙子 己卯 丁酉"
  const fourPillars = chart.chineseDate?.split(' ') || []
  const [yearPillar, monthPillar, dayPillar, hourPillar] = fourPillars
  
  // 计算年柱纳音
  const nayin = getNayin(yearPillar)

  // 获取生年天干用于判断阴阳
  const yearGan = yearPillar?.charAt(0) || ''
  const yangGanList = ['甲', '丙', '戊', '庚', '壬']
  const isYangGan = yangGanList.includes(yearGan)
  
  // 判断性别和阴阳
  const genderText = gender === '男' ? '男' : '女'
  const yinYangLabel = (genderText === '男' && isYangGan) || (genderText === '女' && !isYangGan) ? '陽' : '陰'
  
  // 农历日期 - 完整格式：庚戌年八月初三 未时
  const getLunarDateFull = (): string => {
    // 从四柱的yearPillar获取年份天干地支
    const yearGanZhi = yearPillar
    
    // 从chart.lunarDate提取农历月日（格式如："一九七〇年八月初三"）
    const lunarDate = (chart as any).lunarDate || ''
    // 从"年"字后面提取月日信息
    const parts = lunarDate.split('年')
    const monthDayText = parts.length > 1 ? parts[1] : ''
    
    // 从chart.time获取时辰名称（如"未時"或"未"）
    let shichen = (chart as any).time || (language === 'zh-TW' ? '未時' : '未时')
    if (shichen) {
      shichen = localizeChineseText(shichen, language)
      const shichenSuffix = language === 'zh-TW' ? '時' : '时'
      if (!shichen.includes(shichenSuffix)) {
        shichen = shichen + shichenSuffix
      }
    }
    
    return `${yearGanZhi}年${monthDayText} ${shichen}`.trim()
  }

  return (
    <div className="
      relative h-full min-h-[260px] sm:min-h-[320px] lg:min-h-[400px] p-2 sm:p-3 lg:p-4
      flex flex-col items-center justify-start
      bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent
      border border-slate-300/70
      ring-1 ring-white/40
      w-full
      rounded-[2px]
    "
    style={{ boxShadow: 'inset 3px 3px 12px rgba(148,163,184,0.4), 0 0 0 1px rgba(148,163,184,0.18)', pointerEvents: 'auto' }}>

      {/* 标题 */}
      <h3 className="
        text-[14px] sm:text-[16px] lg:text-[20px] font-semibold mb-2 sm:mb-3
        text-gray-500
      " style={{ fontFamily: 'var(--font-serif)' }}>
        {t('chart.title', language) || '紫微斗數命盤'}
      </h3>

      {/* 命主姓名 */}
      {nativeName && (
        <div className="text-[10px] sm:text-[11px] lg:text-[12pt] text-gray-500 mb-1 sm:mb-2 font-medium">
          {nativeName}
        </div>
      )}

      {/* 出生八字信息 - 按用户指定的格式 */}
      <div className="text-[10px] sm:text-[11px] lg:text-[12pt] text-gray-500 space-y-0.5 sm:space-y-1 w-full px-1 sm:px-2 text-left" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}>
        
        {/* 真太陽時 + 出生時間 與 調整按鈕 左右並排 */}
        <div className="flex items-center gap-3" style={{ pointerEvents: 'auto' }}>
          {/* 左側：真太陽時 + 出生時間 */}
          <div className="flex flex-col gap-y-0.5">
            {/* 第一行：真太陽時 */}
            <div className="flex flex-wrap items-center justify-start gap-x-1 sm:gap-x-1.5 gap-y-0">
              <span className="text-gray-500 whitespace-nowrap">{t('chart.solarTime', language)}:</span>
              <span className="text-gray-500 font-mono break-all">{solarDate}</span>
            </div>
            {/* 第二行：出生時間 */}
            <div className="flex flex-wrap items-center justify-start gap-x-1 sm:gap-x-1.5 gap-y-0">
              <span className="text-gray-500 whitespace-nowrap">{t('chart.birthTime', language)}:</span>
              <span className="text-gray-500 font-mono break-all">
                {birthInfo?.year && birthInfo?.month && birthInfo?.day
                  ? `${String(birthInfo.year).padStart(4, '0')}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')} ${birthTime}`
                  : birthTime
                }
              </span>
            </div>
          </div>

          {/* 右側：調整出生時間按鈕（上+下−） */}
          <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (onHourChange && birthInfo?.hour !== undefined) {
                    // 計算當前時辰索引
                    let currentShichenIndex: number
                    if (birthInfo.hour === 23) {
                      currentShichenIndex = 12  // 晚子時
                    } else if (birthInfo.hour === 0) {
                      currentShichenIndex = 0   // 早子時
                    } else {
                      currentShichenIndex = Math.floor((birthInfo.hour + 1) / 2)
                    }
                    
                    // 下一個時辰
                    let nextShichenIndex = (currentShichenIndex + 1) % 12
                    if (currentShichenIndex === 11) {
                      nextShichenIndex = 12  // 從亥時進到晚子時
                    }
                    
                    // 時辰索引轉換回小時
                    const newHour = 
                      nextShichenIndex === 0 ? 0 :
                      nextShichenIndex === 12 ? 23 :
                      nextShichenIndex * 2 - 1
                    
                    onHourChange(newHour)
                  }
                }}
                style={{ pointerEvents: 'auto' }}
                className="px-3.5 py-0 text-sm font-medium bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded transition cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (onHourChange && birthInfo?.hour !== undefined) {
                    // 計算當前時辰索引
                    let currentShichenIndex: number
                    if (birthInfo.hour === 23) {
                      currentShichenIndex = 12  // 晚子時
                    } else if (birthInfo.hour === 0) {
                      currentShichenIndex = 0   // 早子時
                    } else {
                      currentShichenIndex = Math.floor((birthInfo.hour + 1) / 2)
                    }
                    
                    // 上一個時辰
                    let prevShichenIndex = (currentShichenIndex - 1 + 13) % 13
                    if (prevShichenIndex === 12) prevShichenIndex = 11  // 從晚子時回退到亥時
                    
                    // 時辰索引轉換回小時
                    const newHour = 
                      prevShichenIndex === 0 ? 0 :
                      prevShichenIndex === 12 ? 23 :
                      prevShichenIndex * 2 - 1
                    
                    onHourChange(newHour)
                  }
                }}
                style={{ pointerEvents: 'auto' }}
                className="px-3.5 py-0 text-sm font-medium bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded transition cursor-pointer"
              >
                −
              </button>
            </div>
        </div>
        
        {/* 第三行：農曆 - 完整年月日時 */}
        <div className="flex flex-wrap items-center justify-start gap-x-1 sm:gap-x-1.5 gap-y-0">
          <span className="text-gray-500 whitespace-nowrap">{t('chart.lunarDate', language)}:</span>
          <span className="text-gray-500 break-words">{getLunarDateFull()}</span>
        </div>
        
        {/* 第四行：四柱 */}
        <div className="flex flex-wrap items-center justify-start gap-x-1 sm:gap-x-1.5 gap-y-0">
          <span className="text-gray-500 whitespace-nowrap">{t('chart.fourPillars', language)}:</span>
          <span className="text-gray-500 break-words">
            {yearPillar} {monthPillar} {dayPillar} {hourPillar}
          </span>
        </div>
        
        {/* 第五到第八行：2 欄 3 列資訊容器 */}
        <div className="grid w-[160px] grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] sm:text-[11px] lg:text-[12pt] text-gray-500">
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{chart.fiveElementsClass}</span>
            <span className="text-gray-500 ml-0.5">{yinYangLabel}{genderText}</span>
          </div>
          <div className="whitespace-nowrap text-left">
            {nayin && (
              <>
                <span className="text-gray-500">{t('chart.nayin', language)}:</span>
                <span className="text-gray-500 ml-0.5">{nayin}</span>
              </>
            )}
          </div>
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{t('chart.soul', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedStarName(chart.soul, language)}</span>
          </div>
          <div className="whitespace-nowrap text-left">
            <span className="text-gray-500">{t('chart.body', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedStarName(chart.body, language)}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{t('chart.zodiac', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedZodiacName(chart.zodiac, language)}</span>
          </div>
          <div className="whitespace-nowrap text-left">
            <span className="text-gray-500">{t('chart.astroSign', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedAstroSign(chart.sign, language)}</span>
          </div>
        </div>
        
      </div>

      {/* 三方四正 與 宮位提示 開關 */}
      {(onToggleSanFangSiZheng !== undefined || onToggleBubbleHint !== undefined) && (
        <div className="w-full mt-2.5 pt-2.5 border-t border-white/[0.07] flex items-center justify-center gap-2.5 flex-wrap">
          <HoverHint content="三方四正" position="bottom">
            <button
              onClick={onToggleSanFangSiZheng}
              className={`flex items-center justify-center px-1 py-1 text-[11px] sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm font-medium rounded transition cursor-pointer ${
                showSanFangSiZheng
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <img src={TriIcon} alt="三方四正" className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </HoverHint>

          {onToggleBubbleHint !== undefined && (
            <HoverHint content="宮位提示" position="bottom">
              <button
                onClick={onToggleBubbleHint}
                className={`flex items-center justify-center px-1 py-1 text-[11px] sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm font-medium rounded transition cursor-pointer ${
                  showBubbleHint
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <img src={HintIcon} alt="宮位提示" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </HoverHint>
          )}

          {onToggleReversalCheck !== undefined && (
            <HoverHint content="反背檢查" position="bottom">
              <button
                onClick={onToggleReversalCheck}
                className={`flex items-center justify-center px-1 py-1 text-[11px] sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm font-medium rounded transition cursor-pointer ${
                  showReversalCheck
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <img src={CounterIcon} alt="反背檢查" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </HoverHint>
          )}

          {onToggleFlyGongToolbox !== undefined && (
            <HoverHint content="飛宮" position="bottom">
              <button
                onClick={onToggleFlyGongToolbox}
                className={`flex items-center justify-center px-1 py-1 text-[11px] sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm font-medium rounded transition cursor-pointer ${
                  showFlyGongToolbox
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <img src={FlyingIcon} alt="飛宮" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </HoverHint>
          )}

          {onTimeTableClick !== undefined && (
            <HoverHint content="查詢大限、流年、流月、流日、流時" position="bottom">
              <button
                onClick={onTimeTableClick}
                className="flex items-center justify-center px-1 py-1 text-[11px] sm:gap-1.5 sm:px-2 sm:py-2 sm:text-sm font-medium rounded transition cursor-pointer bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300"
              >
                <img src={CalendarIcon} alt="時間表查詢" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </HoverHint>
          )}
        </div>
      )}
    </div>
  )
}
