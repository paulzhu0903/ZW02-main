/**
 * 本地化相關函數
 */

import { t } from '@/lib/i18n'
import { getStarEnglishParam } from '@/lib/star-name'
import { BRIGHTNESS_MAP, MINOR_STAR_STANDARD_BRIGHTNESS } from '@/lib/brightness'
import { 
  ZODIAC_MAP_TW, 
  ZODIAC_MAP_CN, 
  ASTRO_SIGN_MAP_TW, 
  ASTRO_SIGN_MAP_CN 
} from './types'

/**
 * 根據語言設置獲取亮度顯示字符
 * @param brightness - 亮度值（中文字符，如"廟"、"庙"、"望"、"平"、"陷"）
 * @param language - 語言代碼
 * @param starName - 星名（用於補充缺失的亮度）
 * @returns 本地化後的亮度字符
 */
export function getBrightnessDisplay(brightness: string | undefined, language: 'zh-TW' | 'zh-CN', starName?: string): string {
  // 如果沒有亮度，嘗試用標準亮度補充
  let finalBrightness = brightness
  if (!finalBrightness && starName) {
    finalBrightness = MINOR_STAR_STANDARD_BRIGHTNESS[starName]
  }
  
  if (!finalBrightness) return ''
  
  // 將中文亮度名稱映射為英文參數名
  const englishKey = BRIGHTNESS_MAP[finalBrightness]
  if (!englishKey) return finalBrightness
  
  // 通過 t() 函數獲取本地化的亮度字符
  return t(`brightness.${englishKey}`, language)
}

/**
 * 獲取本地化的星名
 */
export function getLocalizedStarName(name: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!name) return ''

  const englishKey = getStarEnglishParam(name)
  return englishKey ? t(`star.${englishKey}`, language) || name : name
}

/**
 * 獲取本地化的生肖名
 */
export function getLocalizedZodiacName(zodiac: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!zodiac) return ''

  return (language === 'zh-TW' ? ZODIAC_MAP_TW[zodiac] : ZODIAC_MAP_CN[zodiac]) || zodiac
}

/**
 * 獲取本地化的星座名
 */
export function getLocalizedAstroSign(sign: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!sign) return ''

  return (language === 'zh-TW' ? ASTRO_SIGN_MAP_TW[sign] : ASTRO_SIGN_MAP_CN[sign]) || sign
}
