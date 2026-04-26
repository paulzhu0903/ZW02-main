/**
 * 星曜標籤組件 - 帶亮度和四化
 */

import { useSettingsStore } from '@/stores'
import { t } from '@/lib/i18n'
import { getStarEnglishParam, getStarLookupKey } from '@/lib/star-name'
import { SIHUA_BY_GAN, SIHUA_BY_GAN_TRADITIONAL } from '@/knowledge/sihua'
import { getBrightnessDisplay } from '../utils/localization'
import type { StarTagProps } from '../types'

// 主星 / 輔星 / 雜曜統一尺寸（base / sm / lg）
const STAR_SLOT_WIDTH_CLASS = 'w-[14px] min-w-[14px] sm:w-[16px] sm:min-w-[16px] lg:w-[18px] lg:min-w-[18px]'
const STAR_BASE_TEXT_CLASS = 'text-[10px] sm:text-[11px] md:text-[12px] lg:text-[14px] xl:text-[15px]'
const TRIREME_MUTAGEN_SQUARE_CLASS = 'flex items-center justify-center w-[14px] h-[14px] text-[10px] sm:w-[14px] sm:h-[14px] sm:text-[11px] md:text-[12px] lg:w-[16px] lg:h-[16px] lg:text-[14px] xl:text-[15px]'

export function StarTag({ star, isMajorStar = false, forceTextColorClass = '', chartType = 'flying', selectedDecadal = null, selectedAnnual = null, isCurrentDecadalPalace = false, isCurrentAnnualPalace = false, decadalLifePalaceStem = null, annualLifePalaceStem = null }: StarTagProps) {
  const { language } = useSettingsStore()
  // 三合盤顯示亮度；四化和飛星不顯示亮度
  const displayBrightness = chartType === 'trireme' ? true : false
  const { name, brightness, mutagen } = star
  const hasMutagen = !!mutagen
  const brightnessChar = getBrightnessDisplay(brightness, language)

  // 获取本地化的四化字符
  const getMutagenDisplay = (mutagen: string | undefined): string => {
    if (!mutagen) return ''
    
    // 映射繁體、簡體及其他变体到标准英文参数
    const mutagenMap: Record<string, string> = {
      '禄': 'lucun', '祿': 'lucun',
      '权': 'quan', '權': 'quan',
      '科': 'ke',
      '忌': 'ji',
      '化禄': 'huaLucun', '化祿': 'huaLucun',
      '化权': 'huaQuan', '化權': 'huaQuan',
      '化科': 'huaKe',
      '化忌': 'huaJi',
    }
    
    const key = mutagenMap[mutagen]
    if (!key) return mutagen // fallback to original if not found
    
    // 在 transformation 盤面，返回 A/B/C/D
    if (chartType === 'transformation') {
      const letterMap: Record<string, string > = {
        'lucun': 'A', 'quan': 'B', 'ke': 'C', 'ji': 'D',
        'huaLucun': 'A', 'huaQuan': 'B', 'huaKe': 'C', 'huaJi': 'D'
      }
      return letterMap[key] || mutagen
    }
    
    // 在其他盤面，返回本地化的字符
    return t(`mutagen.${key}`, language) || mutagen
  }
  const displayMutagen = getMutagenDisplay(mutagen)

  const getShortMutagenDisplay = (mutagenText: string | undefined): string => {
    if (!mutagenText) return ''
    const map: Record<string, string> = {
      '禄': t('mutagen.lucun', language),
      '祿': t('mutagen.lucun', language),
      '化禄': t('mutagen.lucun', language),
      '化祿': t('mutagen.lucun', language),
      '权': t('mutagen.quan', language),
      '權': t('mutagen.quan', language),
      '化权': t('mutagen.quan', language),
      '化權': t('mutagen.quan', language),
      '科': t('mutagen.ke', language),
      '化科': t('mutagen.ke', language),
      '忌': t('mutagen.ji', language),
      '化忌': t('mutagen.ji', language),
    }
    return map[mutagenText] || mutagenText
  }
  
  // 根據 mutagen 獲取文字顏色（不含背景）
  const getMutagenTextColor = (): string => {
    if (!mutagen) return ''
    
    // 只映射文字顏色，無背景色
    const colorMap: Record<string, string> = {
      '禄': 'text-fortune',
      '祿': 'text-fortune',
      '权': 'text-gold',
      '權': 'text-gold',
      '科': 'text-star-light',
      '忌': 'text-misfortune',
      '化禄': 'text-fortune',
      '化祿': 'text-fortune',
      '化权': 'text-gold',
      '化權': 'text-gold',
      '化科': 'text-star-light',
      '化忌': 'text-misfortune',
    }
    return colorMap[mutagen] || ''
  }

  // t()函数会自动将中文星星名称映射到英文参数名并翻译
  const displayName = t(`star.${name}`, language)

  const getDecadalMutagenForCurrentStar = (): string | null => {
    if (chartType !== 'trireme' || !decadalLifePalaceStem || selectedDecadal === null) return null

    const starNameNormalized = getStarLookupKey(name)
    const sihuaMapSimple = SIHUA_BY_GAN[decadalLifePalaceStem] || {}
    const sihuaMapTraditional = SIHUA_BY_GAN_TRADITIONAL[decadalLifePalaceStem] || {}

    const findMutagenKey = (sihuaMap: Record<string, string>): string | null => {
      for (const [mutagenKey, starName] of Object.entries(sihuaMap)) {
        if (getStarLookupKey(starName) === starNameNormalized) {
          return mutagenKey
        }
      }
      return null
    }

    const key = findMutagenKey(sihuaMapSimple) || findMutagenKey(sihuaMapTraditional)
    if (!key) return null
    return getShortMutagenDisplay(key)
  }

  const getAnnualMutagenForCurrentStar = (): string | null => {
    if (chartType !== 'trireme' || !annualLifePalaceStem || selectedAnnual === null) return null

    const starNameNormalized = getStarLookupKey(name)
    const sihuaMapSimple = SIHUA_BY_GAN[annualLifePalaceStem] || {}
    const sihuaMapTraditional = SIHUA_BY_GAN_TRADITIONAL[annualLifePalaceStem] || {}

    const findMutagenKey = (sihuaMap: Record<string, string>): string | null => {
      for (const [mutagenKey, starName] of Object.entries(sihuaMap)) {
        if (getStarLookupKey(starName) === starNameNormalized) {
          return mutagenKey
        }
      }
      return null
    }

    const key = findMutagenKey(sihuaMapSimple) || findMutagenKey(sihuaMapTraditional)
    if (!key) return null
    return getShortMutagenDisplay(key)
  }

  const triremeBirthMutagen = chartType === 'trireme' ? getShortMutagenDisplay(mutagen) : ''
  const triremeDecadalMutagen = getDecadalMutagenForCurrentStar()
  const triremeAnnualMutagen = getAnnualMutagenForCurrentStar()
  const hasTriremeMutagenSquares = chartType === 'trireme' && (!!triremeBirthMutagen || !!triremeDecadalMutagen || !!triremeAnnualMutagen)

  // 四化盤中重要的18顆星：14個主星 + 左輔、右弼、文昌、文曲
  // 使用英文参数名定义男星和女星
  // 男星: 太阳、天机、天梁、天同、贪狼、文昌、左辅、天相、天府、七杀
  const maleStarParams = ['taiyang', 'tianji', 'tiangliang', 'tiantong', 'tanlang', 'wenchang', 'zuofu', 'tianxiang', 'tianfu', 'qisha']
  // 女星: 破军、武曲、紫微、太阴、巨门、文曲、右弼
  const femaleStarParams = ['pojun', 'wuqu', 'ziwei', 'taiyin', 'jumen', 'wenqu', 'youbi']
  // 四化盤中显示性别颜色的18颗星（14个主星 + 左右昌曲）
  // 注意：这18颗星才会显示性别颜色，其他任何星都保持浅灰色
  const colorfulStarsInTransformation = new Set([
    'ziwei',    // 紫微 - 女
    'tianji',   // 天机 - 男
    'taiyang',  // 太阳 - 男
    'wuqu',     // 武曲 - 女
    'tiantong', // 天同 - 男
    'lianzhen', // 廉贞 - 特例（化禄男、化忌女）
    'tianfu',   // 天府 - 男
    'taiyin',   // 太阴 - 女
    'tanlang',  // 贪狼 - 男
    'jumen',    // 巨门 - 女
    'tianxiang',// 天相 - 男
    'tiangliang', // 天梁 - 男
    'qisha',    // 七杀 - 男
    'pojun',    // 破军 - 女
    'zuofu',    // 左辅 - 男
    'youbi',    // 右弼 - 女
    'wenchang', // 文昌 - 男
    'wenqu',    // 文曲 - 女
  ])
  
  // 获取星名的英文参数名
  const starEnglishParam = getStarEnglishParam(name)
  
  // 主星用黑字，其他星耀用浅灰；四化盘中18颗关键星根据性别显示颜色
  let textColor = 'text-text-secondary'
  
  if (chartType === 'transformation') {
    // 四化盘中：只有18颗关键星显示性别颜色，其他所有星（包括主星和辅星）都显示浅灰色
    if (starEnglishParam && colorfulStarsInTransformation.has(starEnglishParam)) {
      // 这是18颗关键星之一，应用性别颜色
      if (starEnglishParam === 'lianzhen') {
        // 廉贞例外：化禄是男星，化忌是女星
        if (mutagen === '化禄' || mutagen === '化祿') {
          textColor = 'text-[#00aeff]'  // 水蓝色（男星）
        } else if (mutagen === '化忌') {
          textColor = 'text-[#ff00ff]'  // 粉红色（女星）
        }
      } else if (maleStarParams.includes(starEnglishParam)) {
        textColor = 'text-[#00aeff]'  // 水蓝色
      } else if (femaleStarParams.includes(starEnglishParam)) {
        textColor = 'text-[#ff00ff]'  // 粉红色
      }
    } else {
      // 不在18颗关键星中，强制设为浅灰色（包括所有辅星、雜曜等）
      textColor = 'text-text-secondary'
    }
  } else {
    // 其他盘面中：主星显示为黑色，其他星保持浅灰
    if (!hasMutagen) {
      if (isMajorStar) {
        textColor = 'text-black'
      }
    }
  }

  // 确保四化盤中非18顆星的輔星仍為灰色（即使有forceTextColorClass也要覆蓋）
  if (!hasMutagen) {
    if (chartType === 'transformation') {
      // 四化盤中：只有18顆關鍵星才能改變顏色，其他都是灰色
      if (!starEnglishParam || !colorfulStarsInTransformation.has(starEnglishParam)) {
        textColor = 'text-text-secondary'
      }
    } else if (forceTextColorClass && !isMajorStar) {
      // 非四化盤且不是主星，使用forceTextColorClass
      textColor = forceTextColorClass
    }
  }

  return (
    <div className={`flex flex-col items-center ${STAR_SLOT_WIDTH_CLASS}`} style={{ minHeight: '30px' }}>
      <span
        className={`
          relative ${STAR_SLOT_WIDTH_CLASS} ${STAR_BASE_TEXT_CLASS} font-medium px-0 py-0 rounded
          transition-all duration-200
          ${hasMutagen ? getMutagenTextColor() : `bg-white/5 ${textColor} hover:bg-white/10`}
        `}
        style={{ minHeight: '30px', height: '30px', margin: '0 0 0px 0' }}
        data-star-name={name}
      >
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', textAlign: 'center', lineHeight: 1 }}
        >
          {displayName}
        </span>
      </span>
      {(displayBrightness || mutagen || hasTriremeMutagenSquares) && (
        <div className={`flex flex-col items-center justify-center ${STAR_SLOT_WIDTH_CLASS}`} style={{ gap: '1px' }}>
          {/* 亮度行 - 無論有沒有亮度都預留空間 */}
          {displayBrightness && (
            <span className={`${STAR_SLOT_WIDTH_CLASS} ${STAR_BASE_TEXT_CLASS} font-medium text-text-muted flex items-center justify-center`} style={{ minHeight: '12px' }}>
              {brightnessChar || '\u00A0'}
            </span>
          )}
          {/* 三合盤四化方塊 */}
          {chartType === 'trireme' && hasTriremeMutagenSquares && (() => {
            const renderTriremeSquare = (text: string, bgColor: string, layerKey: string) => {
              return (
                <span
                  key={layerKey}
                  className={TRIREME_MUTAGEN_SQUARE_CLASS}
                  style={{
                    borderRadius: '2px',
                    backgroundColor: bgColor,
                    color: 'white',
                    lineHeight: '1',
                    padding: '0',
                    transform: 'none',
                    fontWeight: 600,
                    visibility: text ? 'visible' : 'hidden',
                  }}
                >
                  {text || '\u00A0'}
                </span>
              )
            }

            return (
              <div className="flex flex-col items-center justify-center" style={{ gap: '1px' }}>
                {renderTriremeSquare(triremeBirthMutagen, '#FF3B30', 'birth')}
                {renderTriremeSquare(triremeDecadalMutagen || '', '#00c030', 'decadal')}
                {renderTriremeSquare(triremeAnnualMutagen || '', '#00aeff', 'annual')}
              </div>
            )
          })()}
          {/* 飛星盤和四化盤四化 */}
          {(chartType === 'flying' || chartType === 'transformation') && mutagen && (() => {
            // 根據四化類別和盤面類型獲取顏色
            const getMutagenColors = (mutagen: string, isCurrentDecadalPalace?: boolean, isCurrentAnnualPalace?: boolean) => {
              // 先檢查是否是大限命宮或流年命宮 - 這些宮位的所有四化都應該顯示相應的顏色
              if (chartType === 'flying') {
                // 大限命宮的所有四化顯示綠色
                if (isCurrentDecadalPalace && selectedDecadal !== null) {
                  return { bgHex: '#34C759', type: 'decadal' }  // 大限四化：綠色
                }
                // 流年命宮的所有四化顯示藍色
                if (isCurrentAnnualPalace && selectedAnnual !== null) {
                  return { bgHex: '#007AFF', type: 'annual' }  // 流年四化：藍色
                }
                
                // 非命宮宮位 - 檢查是否屬於該宮位天干的四化（生年四化）
                if ((star as any).palaceStem) {
                  // 獲取該天干的四化映射（同時檢查簡體和繁體）
                  const sihuaMap = SIHUA_BY_GAN[(star as any).palaceStem] || SIHUA_BY_GAN_TRADITIONAL[(star as any).palaceStem]
                  if (sihuaMap) {
                    // 檢查當前星是否在該天干的四化列表中
                    const currentStarKey = getStarLookupKey(name)
                    const isSihuaStar = Object.values(sihuaMap).some((starName) => getStarLookupKey(starName) === currentStarKey)
                    
                    if (isSihuaStar) {
                      return { bgHex: '#FF3B30', type: 'birth', isBirthYearSihua: true }  // 生年四化：紅色
                    }
                  }
                }
              }
              
              // 四化盤：根據四化類型返回顏色
              const colorMap: Record<string, { bgHex: string, type: string }> = {
                '禄': { bgHex: '#34C759', type: 'lucun' },
                '祿': { bgHex: '#34C759', type: 'lucun' },
                '权': { bgHex: '#AF52DE', type: 'quan' },
                '權': { bgHex: '#AF52DE', type: 'quan' },
                '科': { bgHex: '#007AFF', type: 'ke' },
                '忌': { bgHex: '#FF3B30', type: 'ji' },
                '化禄': { bgHex: '#34C759', type: 'lucun' },
                '化祿': { bgHex: '#34C759', type: 'lucun' },
                '化权': { bgHex: '#AF52DE', type: 'quan' },
                '化權': { bgHex: '#AF52DE', type: 'quan' },
                '化科': { bgHex: '#007AFF', type: 'ke' },
                '化忌': { bgHex: '#FF3B30', type: 'ji' },
              }
              return colorMap[mutagen] || { bgHex: '#FF3B30', type: 'ji' }
            }
            
            const colors = getMutagenColors(mutagen, isCurrentDecadalPalace, isCurrentAnnualPalace)
            
            // 根據盤面類型應用不同的樣式
            let borderRadiusStyle = '50%'
            let styleObj: React.CSSProperties = {
              borderRadius: borderRadiusStyle,
              width: '14px',
              minWidth: '14px',
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1',
              padding: '0',
              boxSizing: 'border-box',
            }
            
            if (chartType === 'flying') {
              // 飛星盤：四化文字變顏色，無背景色
              styleObj = {
                ...styleObj,
                borderRadius: 'unset',
                backgroundColor: 'transparent',
                color: colors.bgHex
              }
            } else if (chartType === 'transformation') {
              // 四化盤：紅色邊框圓形
              styleObj = {
                ...styleObj,
                borderRadius: '50%',
                border: '1px solid #FF3B30',
                color: '#FF3B30'
              }
            }
            
            return (
              <span className={`${STAR_BASE_TEXT_CLASS} flex items-center justify-center`}
                style={styleObj}>
                {displayMutagen}
              </span>
            )
          })()}
          {/* 注: 四化為純文字顯示，無背景色塊 */}
        </div>
      )}
    </div>
  )
}
