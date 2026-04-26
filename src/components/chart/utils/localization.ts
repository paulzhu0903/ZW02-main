/**
 * 本地化相關函數
 */

import { t, BRIGHTNESS_MAP as BRIGHTNESS_MAP_I18N } from '@/lib/i18n'
import { getStarEnglishParam } from '@/lib/star-name'

/**
 * 根據語言設置獲取亮度顯示字符
 * @param brightness - 亮度值（中文字符，如"廟"、"庙"、"望"、"平"、"陷"）
 * @param language - 語言代碼
 * @returns 本地化後的亮度字符
 */
export function getBrightnessDisplay(brightness: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!brightness) return ''
  
  // 將中文亮度名稱映射為英文參數名
  const englishKey = BRIGHTNESS_MAP_I18N[brightness]
  if (!englishKey) return brightness
  
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

  const zodiacMapTW: Record<string, string> = {
    '鼠': '鼠', '牛': '牛', '虎': '虎', '兔': '兔', '龙': '龍', '龍': '龍',
    '蛇': '蛇', '马': '馬', '馬': '馬', '羊': '羊', '猴': '猴', '鸡': '雞',
    '雞': '雞', '狗': '狗', '猪': '豬', '豬': '豬'
  }

  const zodiacMapCN: Record<string, string> = {
    '鼠': '鼠', '牛': '牛', '虎': '虎', '兔': '兔', '龍': '龙', '龙': '龙',
    '蛇': '蛇', '馬': '马', '马': '马', '羊': '羊', '猴': '猴', '雞': '鸡',
    '鸡': '鸡', '狗': '狗', '豬': '猪', '猪': '猪'
  }

  return (language === 'zh-TW' ? zodiacMapTW[zodiac] : zodiacMapCN[zodiac]) || zodiac
}

/**
 * 獲取本地化的星座名
 */
export function getLocalizedAstroSign(sign: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!sign) return ''

  const signMapTW: Record<string, string> = {
    '白羊座': '牡羊座', '牡羊座': '牡羊座', 'Aries': '牡羊座',
    '金牛座': '金牛座', 'Taurus': '金牛座',
    '双子座': '雙子座', '雙子座': '雙子座', 'Gemini': '雙子座',
    '巨蟹座': '巨蟹座', 'Cancer': '巨蟹座',
    '狮子座': '獅子座', '獅子座': '獅子座', 'Leo': '獅子座',
    '处女座': '處女座', '處女座': '處女座', 'Virgo': '處女座',
    '天秤座': '天秤座', 'Libra': '天秤座',
    '天蝎座': '天蠍座', '天蠍座': '天蠍座', 'Scorpio': '天蠍座',
    '射手座': '射手座', 'Sagittarius': '射手座',
    '摩羯座': '摩羯座', 'Capricorn': '摩羯座',
    '水瓶座': '水瓶座', 'Aquarius': '水瓶座',
    '双鱼座': '雙魚座', '雙魚座': '雙魚座', 'Pisces': '雙魚座'
  }

  const signMapCN: Record<string, string> = {
    '牡羊座': '白羊座', '白羊座': '白羊座', 'Aries': '白羊座',
    '金牛座': '金牛座', 'Taurus': '金牛座',
    '雙子座': '双子座', '双子座': '双子座', 'Gemini': '双子座',
    '巨蟹座': '巨蟹座', 'Cancer': '巨蟹座',
    '獅子座': '狮子座', '狮子座': '狮子座', 'Leo': '狮子座',
    '處女座': '处女座', '处女座': '处女座', 'Virgo': '处女座',
    '天秤座': '天秤座', 'Libra': '天秤座',
    '天蠍座': '天蝎座', '天蝎座': '天蝎座', 'Scorpio': '天蝎座',
    '射手座': '射手座', 'Sagittarius': '射手座',
    '摩羯座': '摩羯座', 'Capricorn': '摩羯座',
    '水瓶座': '水瓶座', 'Aquarius': '水瓶座',
    '雙魚座': '双鱼座', '双鱼座': '双鱼座', 'Pisces': '双鱼座'
  }

  return (language === 'zh-TW' ? signMapTW[sign] : signMapCN[sign]) || sign
}
