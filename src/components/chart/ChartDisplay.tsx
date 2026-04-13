/* ============================================================
   命盘可视化组件
   对齐文墨天机标准：
   - 完整星曜 + 亮度（庙旺平陷）
   - 宫干 + 大限范围
   - 博士/长生十二神 + 杂曜
   - 命主/身主 + 纳音五行
   ============================================================ */

import { useState, useEffect, useRef } from 'react'
import { useChartStore, useSettingsStore } from '@/stores'
import { t, BRIGHTNESS_MAP as BRIGHTNESS_MAP_I18N } from '@/lib/i18n'
import type { FunctionalAstrolabe, BirthInfo } from '@/lib/astro'
import { calculateSolarTime } from '@/lib/astro'
import { SIHUA_BY_GAN, SIHUA_BY_GAN_TRADITIONAL } from '@/knowledge/sihua'
import { 
  type PalaceData, 
  type StarData,
  PALACE_POSITIONS, 
  PALACE_BRANCH_INDEX,
  PALACE_ORDER,
  PALACE_NAME_TO_ENGLISH_MAP,
  STAR_NAME_MAP,
  MUTAGEN_COLORS,
  type StarTagProps,
  type PalaceCardProps,
  type DecadalAnnualMonthlyTableProps,
} from './types'
import {
  getNayin,
  isMajorStarName,
  getPalaceEdgePointTowardCenterWithDOM,
  collectMutagenLines,
  getDecadalPalaceIndex,
  markSelfMutagens,
  markCausePalace,
  getMutagenType,
} from './mutagenLines'
import { MutagenControls } from './MutagenControls'

/* ============================================================
   辅助函数
   ============================================================ */

/**
 * 根据年份获取天干地支
 * @param year - 年份
 * @returns 干支字符串，如"甲寅"
 */
function getYearGanZhi(year: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  
  const gan = ganList[(year - 1900 + 6) % 10]
  const zhi = zhiList[(year - 1900) % 12]
  
  return gan + zhi
}

const EARTHLY_BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] as const

function normalizeIndex(value: number): number {
  return ((value % 12) + 12) % 12
}

function getLunarMonthNumber(lunarDateText: string | undefined): number | null {
  if (!lunarDateText) return null

  const match = lunarDateText.match(/年(闰|閏)?(正|一|二|三|四|五|六|七|八|九|十[一二]?|冬|腊|臘)月/)
  const lunarMonthText = match?.[2]
  if (!lunarMonthText) return null

  const monthMap: Record<string, number> = {
    '正': 1, '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9,
    '十': 10,
    '十一': 11, '冬': 11,
    '十二': 12, '腊': 12, '臘': 12,
  }

  return monthMap[lunarMonthText] ?? null
}

function getTimeBranchIndex(timeText: string | undefined): number | null {
  if (!timeText) return null

  const match = timeText.match(/[子丑寅卯辰巳午未申酉戌亥]/)
  if (!match) return null

  const index = EARTHLY_BRANCH_ORDER.indexOf(match[0] as typeof EARTHLY_BRANCH_ORDER[number])
  return index >= 0 ? index : null
}

/**
 * 五虎遁法則：根據年份天干計算正月天干
 * @param year - 年份
 * @returns 正月天干，如"丙"、"戊"等
 */
function getFirstMonthGan(year: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const yearGan = ganList[(year - 1900 + 6) % 10]
  
  // 五虎遁法則
  const firstMonthMap: Record<string, string> = {
    '甲': '丙', '己': '丙',  // 甲己年起丙寅
    '乙': '戊', '庚': '戊',  // 乙庚年起戊寅
    '丙': '庚', '辛': '庚',  // 丙辛年起庚寅
    '丁': '壬', '壬': '壬',  // 丁壬年起壬寅
    '戊': '甲', '癸': '甲',  // 戊癸年起甲寅
  }
  
  return firstMonthMap[yearGan] || '甲'
}

/**
 * 計算指定月份的天干
 * @param year - 年份
 * @param lunarMonth - 農曆月份（1-12）
 * @returns 月份天干，如"丙"、"丁"等
 */
function getMonthlyGan(year: number, lunarMonth: number): string {
  const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const firstMonthGan = getFirstMonthGan(year)
  const firstMonthGanIndex = ganList.indexOf(firstMonthGan)
  
  // 正月是firstMonthGan，後續每月遞進一位天干
  const monthGanIndex = (firstMonthGanIndex + lunarMonth - 1) % 10
  return ganList[monthGanIndex]
}

function getMonthlySequenceByBranch(
  chart: FunctionalAstrolabe,
  palaceData: PalaceData[],
  selectedDecadal: number | null,
  selectedAnnual: number | null,
  selectedAnnualGanZhi: string | null,
  selectedAnnualYear: number | null,
  monthlyArrangementMethod: 'yuanYuePositioning' | 'douJun' = 'yuanYuePositioning',
): Record<string, string[]> {
  if (selectedDecadal === null || selectedAnnual === null || !selectedAnnualGanZhi || selectedAnnualYear === null) return {}

  const birthLunarMonth = getLunarMonthNumber((chart as any).lunarDate)
  const birthTimeBranchIndex = getTimeBranchIndex((chart as any).time)

  if (birthLunarMonth === null || birthTimeBranchIndex === null) return {}

  // 从selectedAnnualGanZhi中提取地支（最后一个字符）
  const yearlyBranch = selectedAnnualGanZhi.slice(-1)
  
  // 获取流年地支在宫位系统中的索引
  const yearlyIndex = PALACE_BRANCH_INDEX[yearlyBranch] ?? -1

  if (yearlyIndex < 0) return {}

  const monthlyMap: Record<string, string[]> = {}

  LUNAR_MONTH_NAMES.forEach((monthName, idx) => {
    const lunarMonth = idx + 1
    
    // 根据选择的方法计算月份宫位
    let monthlyIndex: number
    
    if (monthlyArrangementMethod === 'yuanYuePositioning') {
      // 正月定位法：正月所在宮位 = (流年地支 + 出生時支 - 出生月) mod 12
      // 然后每个月顺序推进
      const firstMonthIndex = normalizeIndex(yearlyIndex + birthTimeBranchIndex - birthLunarMonth)
      monthlyIndex = normalizeIndex(firstMonthIndex + lunarMonth - 1)
    } else {
      // 斗君法（iztro规则）：monthlyIndex = yearlyIndex - birthLunarMonth + birthTimeBranchIndex + lunarMonth
      monthlyIndex = normalizeIndex(yearlyIndex - birthLunarMonth + birthTimeBranchIndex + lunarMonth)
    }
    
    const targetPalace = palaceData.find((palace) => (PALACE_BRANCH_INDEX[palace.branch] ?? -1) === monthlyIndex)

    if (targetPalace) {
      if (!monthlyMap[targetPalace.branch]) {
        monthlyMap[targetPalace.branch] = []
      }
      
      // 計算流月天干和地支
      const monthlyGan = getMonthlyGan(selectedAnnualYear, lunarMonth)
      // 農曆月份對應地支：正月(寅)、二月(卯)、三月(辰)...十一月(子)、十二月(丑)
      const monthlyZhi = EARTHLY_BRANCH_ORDER[(lunarMonth + 1) % 12]
      const monthlyGanZhi = `${monthlyGan}${monthlyZhi}`
      
      // 合併月份名稱和干支（格式：正月庚寅月）
      monthlyMap[targetPalace.branch].push(`${monthName}月${monthlyGanZhi}月`)
    }
  })

  return monthlyMap
}

/**
 * 根据语言设置获取亮度显示字符
 * @param brightness - 亮度值（中文字符，如"廟"、"庙"、"望"、"平"、"陷"）
 * @param language - 语言代码
 * @returns 本地化后的亮度字符
 */
function getBrightnessDisplay(brightness: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!brightness) return ''
  
  // 将中文亮度名称映射为英文参数名
  const englishKey = BRIGHTNESS_MAP_I18N[brightness]
  if (!englishKey) return brightness
  
  // 通过 t() 函数获取本地化的亮度字符
  return t(`brightness.${englishKey}`, language)
}

function getLocalizedStarName(name: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!name) return ''

  const englishKey = STAR_NAME_MAP[name]
  return englishKey ? t(`star.${englishKey}`, language) || name : name
}

function getLocalizedZodiacName(zodiac: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
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

function getLocalizedAstroSign(sign: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
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

/* ------------------------------------------------------------
   星曜标签组件 - 带亮度和四化
   ------------------------------------------------------------ */




/* ------------------------------------------------------------
   星曜标签组件 - 带亮度和四化
   ------------------------------------------------------------ */

function StarTag({ star, showBrightness = true, isMajorStar = false, chartType = 'flying', selectedDecadal = null, selectedAnnual = null, isCurrentDecadalPalace = false, isCurrentAnnualPalace = false, decadalLifePalaceStem = null, annualLifePalaceStem = null }: StarTagProps) {
  const { language, triremeShowStarBrightness, triremeMutagenSquareSize } = useSettingsStore()
  // 四化盤面不顯示亮度；三合盤可由設定開關控制
  const displayBrightness = chartType === 'transformation'
    ? false
    : chartType === 'trireme'
      ? (triremeShowStarBrightness && showBrightness)
      : showBrightness
  const { name, brightness, mutagen } = star
  const hasMutagen = !!mutagen
  const brightnessChar = getBrightnessDisplay(brightness, language)
  const triremeSquareSize = triremeMutagenSquareSize
  const triremeSquareFontSize = Math.max(7, triremeSquareSize - 2)

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

  // 中文星名到英文参数名的映射（包含繁简体和简体变体）
  // 这个映射包含了所有 14 个主星 + 4 个关键辅星的所有可能写法，以及其他杂曜星
  const chineseToEnglishStarMap: Record<string, string> = {
    // 14 個主星 - 繁简体
    '紫微': 'ziwei',
    '天機': 'tianji', '天机': 'tianji',
    '太陽': 'taiyang', '太阳': 'taiyang',
    '武曲': 'wuqu',
    '天同': 'tiantong',
    '廉貞': 'lianzhen', '廉贞': 'lianzhen',
    '天府': 'tianfu',
    '太陰': 'taiyin', '太阴': 'taiyin',
    '貪狼': 'tanlang', '贪狼': 'tanlang',
    '巨門': 'jumen', '巨门': 'jumen',
    '天相': 'tianxiang',
    '天梁': 'tiangliang',
    '七殺': 'qisha', '七杀': 'qisha',
    '破軍': 'pojun', '破军': 'pojun',
    // 4 個關鍵輔星 - 繁简体
    '左輔': 'zuofu', '左辅': 'zuofu',
    '右弼': 'youbi',
    '文昌': 'wenchang',
    '文曲': 'wenqu',
    // 其他杂曜星（在四化盘中显示为灰色）- 繁简体
    '擎羊': 'qingyang',
    '陀羅': 'tuoluo', '陀罗': 'tuoluo',
    '火星': 'huoxing',
    '鈴星': 'lingxing', '铃星': 'lingxing',
    '地空': 'dikong',
    '地劫': 'dijie',
    '祿存': 'lucun', '禄存': 'lucun',
    '天馬': 'tianma', '天马': 'tianma',
    '紅鸞': 'hongluan', '红鸾': 'hongluan',
    '天喜': 'tianxi',
    '天刑': 'tianxing',
    '天姚': 'tianyao',
    '天哭': 'tiankue',
    '天虛': 'tianxu', '天虚': 'tianxu',
    '龍池': 'longchi', '龙池': 'longchi',
    '鳳閣': 'fengge', '凤阁': 'fengge',
    '華蓋': 'huagai', '华盖': 'huagai',
    '咸池': 'xianchi',
    '天德': 'tiande',
    '月德': 'yuede',
    '天官': 'tianguan',
    '天福': 'tianfu2',
    '解神': 'jieshen',
    '天巫': 'tianwu',
    '天月': 'tianyue',
    '陰煞': 'yinsha', '阴煞': 'yinsha',
    '台輔': 'taifu',
    '封誥': 'fenggao', '封诰': 'fenggao',
    '三台': 'santai',
    '八座': 'bazuo',
    '恩光': 'enguang',
    '天貴': 'tiangui', '天贵': 'tiangui',
    '天壽': 'tianshou', '天寿': 'tianshou',
    '天傷': 'tianshang', '天伤': 'tianshang',
    '龍德': 'longde', '龙德': 'longde',
    '天鑰': 'youyue', '天钺': 'youyue',
    '天魁': 'tiankui',
  }

  const normalizeStarName = (starName: string): string => chineseToEnglishStarMap[starName] || starName

  const getDecadalMutagenForCurrentStar = (): string | null => {
    if (chartType !== 'trireme' || !decadalLifePalaceStem || selectedDecadal === null) return null

    const starNameNormalized = normalizeStarName(name)
    const sihuaMapSimple = SIHUA_BY_GAN[decadalLifePalaceStem] || {}
    const sihuaMapTraditional = SIHUA_BY_GAN_TRADITIONAL[decadalLifePalaceStem] || {}

    const findMutagenKey = (sihuaMap: Record<string, string>): string | null => {
      for (const [mutagenKey, starName] of Object.entries(sihuaMap)) {
        if (normalizeStarName(starName) === starNameNormalized) {
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

    const starNameNormalized = normalizeStarName(name)
    const sihuaMapSimple = SIHUA_BY_GAN[annualLifePalaceStem] || {}
    const sihuaMapTraditional = SIHUA_BY_GAN_TRADITIONAL[annualLifePalaceStem] || {}

    const findMutagenKey = (sihuaMap: Record<string, string>): string | null => {
      for (const [mutagenKey, starName] of Object.entries(sihuaMap)) {
        if (normalizeStarName(starName) === starNameNormalized) {
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
  // 男星: 太阳、天机、天梁、天同、贪狼、文昌、左辅
  const maleStarParams = ['taiyang', 'tianji', 'tiangliang', 'tiantong', 'tanlang', 'wenchang', 'zuofu']
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
    'tianfu',   // 天府 - （中性，但在18颗内）
    'taiyin',   // 太阴 - 女
    'tanlang',  // 贪狼 - 男
    'jumen',    // 巨门 - 女
    'tianxiang',// 天相 - （中性，但在18颗内）
    'tiangliang', // 天梁 - 男
    'qisha',    // 七杀 - （中性，但在18颗内）
    'pojun',    // 破军 - 女
    'zuofu',    // 左辅 - 男
    'youbi',    // 右弼 - 女
    'wenchang', // 文昌 - 男
    'wenqu',    // 文曲 - 女
  ])
  
  // 获取星名的英文参数名
  const starEnglishParam = chineseToEnglishStarMap[name]
  
  // 主星用黑字，其他星耀用浅灰；四化盘中18颗关键星根据性别显示颜色
  let textColor = 'text-text-secondary'
  
  if (chartType === 'transformation') {
    // 四化盘中：只有18颗关键星显示性别颜色，其他所有星显示浅灰色（包括有ABCD标记的）
    if (starEnglishParam && colorfulStarsInTransformation.has(starEnglishParam)) {
      // 这是18颗关键星之一，应用性别颜色
      if (starEnglishParam === 'lianzhen') {
        // 廉贞例外：化禄是男星，化忌是女星
        if (mutagen === '化禄' || mutagen === '化祿') {
          textColor = 'text-cyan-400'  // 水蓝色（男星）
        } else if (mutagen === '化忌') {
          textColor = 'text-red-500'  // 红色（女星）
        }
      } else if (maleStarParams.includes(starEnglishParam)) {
        textColor = 'text-cyan-400'  // 水蓝色
      } else if (femaleStarParams.includes(starEnglishParam)) {
        textColor = 'text-red-500'  // 红色
      }
    } else {
      // 不在18颗关键星中，保持浅灰色
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

  return (
    <div className="flex flex-col items-center gap-0" style={{ minHeight: '20px' }}>
      <span
        className={`
          flex flex-col items-center justify-center text-[11px] sm:text-[12px] lg:text-[13px] px-0 py-0 rounded
          transition-all duration-200
          ${hasMutagen ? getMutagenTextColor() + ' font-medium' : `bg-white/5 ${textColor} hover:bg-white/10`}
        `}
        style={{ writingMode: 'vertical-rl', minWidth: '12px', minHeight: '12px', margin: '0 0 1px 0' }}
        data-star-name={name}
      >
        {displayName}
      </span>
      {(displayBrightness || mutagen || hasTriremeMutagenSquares) && (
        <div className="flex flex-col items-center justify-center" style={{ gap: '1px' }}>
          {displayBrightness && brightnessChar && (
            <span className="text-[11px] sm:text-[12px] lg:text-[13px] text-text-muted flex items-center justify-center" style={{ minWidth: '12px', minHeight: '12px' }}>{brightnessChar}</span>
          )}
          {(hasTriremeMutagenSquares || mutagen) && (() => {
            if (chartType === 'trireme' && hasTriremeMutagenSquares) {
              const renderTriremeSquare = (text: string, bgColor: string, layerKey: string) => (
                <span
                  key={layerKey}
                  className="flex items-center justify-center"
                  style={{
                    borderRadius: '0',
                    backgroundColor: bgColor,
                    color: 'white',
                    width: `${triremeSquareSize}px`,
                    height: `${triremeSquareSize}px`,
                    lineHeight: '1',
                    padding: '0',
                    transform: 'none',
                    fontSize: `${triremeSquareFontSize}px`,
                    fontWeight: 600,
                    visibility: text ? 'visible' : 'hidden',
                  }}
                >
                  {text || '\u00A0'}
                </span>
              )

              return (
                <div className="flex flex-col items-center justify-center" style={{ gap: '1px' }}>
                  {renderTriremeSquare(triremeBirthMutagen, '#FF3B30', 'birth')}
                  {renderTriremeSquare(triremeDecadalMutagen || '', '#34C759', 'decadal')}
                  {renderTriremeSquare(triremeAnnualMutagen || '', '#5AC8FA', 'annual')}
                </div>
              )
            }

            if (!mutagen) return null

            // 根據四化類別和盤面類型獲取顏色
            const getMutagenColors = (mutagen: string, isCurrentDecadalPalace?: boolean, isCurrentAnnualPalace?: boolean) => {
              // 先檢查是否是大限命宮或流年命宮 - 這些宮位的所有四化都應該顯示相應的顏色
              if (chartType === 'flying') {
                // 大限命宮的所有四化顯示綠色
                if (isCurrentDecadalPalace && selectedDecadal !== null) {
                  return { bgHex: '#34C759' }  // 大限四化：綠色
                }
                // 流年命宮的所有四化顯示藍色
                if (isCurrentAnnualPalace && selectedAnnual !== null) {
                  return { bgHex: '#007AFF' }  // 流年四化：藍色
                }
                
                // 非命宮宮位 - 檢查是否屬於該宮位天干的四化（生年四化）
                if (star.palaceStem) {
                  // 簡繁體星名對照
                  const starNameMap: Record<string, string> = {
                    '廉貞': '廉贞', '廉贞': '廉貞',
                    '破軍': '破军', '破军': '破軍',
                    '武曲': '武曲',
                    '太陽': '太阳', '太阳': '太陽',
                    '太陰': '太阴', '太阴': '太陰',
                    '天機': '天机', '天机': '天機',
                    '天梁': '天梁',
                    '天同': '天同',
                    '貪狼': '贪狼', '贪狼': '貪狼',
                    '巨門': '巨门', '巨门': '巨門',
                    '文曲': '文曲',
                    '文昌': '文昌',
                  }
                  
                  // 獲取該天干的四化映射（同時檢查簡體和繁體）
                  const sihuaMap = SIHUA_BY_GAN[star.palaceStem] || SIHUA_BY_GAN_TRADITIONAL[star.palaceStem]
                  if (sihuaMap) {
                    // 檢查當前星是否在該天干的四化列表中
                    const isSihuaStar = Object.values(sihuaMap).includes(name) || 
                                        Object.values(sihuaMap).includes(starNameMap[name] || '')
                    
                    if (isSihuaStar) {
                      return { bgHex: '#FF3B30', isBirthYearSihua: true }  // 生年四化：紅色
                    }
                  }
                }
              }
              
              // 四化盤：根據四化類型返回顏色
              const colorMap: Record<string, { bgHex: string }> = {
                '禄': { bgHex: '#34C759' },
                '祿': { bgHex: '#34C759' },
                '权': { bgHex: '#AF52DE' },
                '權': { bgHex: '#AF52DE' },
                '科': { bgHex: '#007AFF' },
                '忌': { bgHex: '#FF3B30' },
                '化禄': { bgHex: '#34C759' },
                '化祿': { bgHex: '#34C759' },
                '化权': { bgHex: '#AF52DE' },
                '化權': { bgHex: '#AF52DE' },
                '化科': { bgHex: '#007AFF' },
                '化忌': { bgHex: '#FF3B30' },
              }
              return colorMap[mutagen] || { bgHex: '#FF3B30' }
            }
            
            const colors = getMutagenColors(mutagen, isCurrentDecadalPalace, isCurrentAnnualPalace)
            
            // 根據盤面類型應用不同的樣式
            let borderRadiusStyle = '50%'
            let styleObj: React.CSSProperties = {
              borderRadius: borderRadiusStyle,
              width: '12px',
              height: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '0.8',
              padding: '0',
              transform: 'translateY(-1px)'
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
              // 四化盤：紅色邊框圓形（細邊框、更小）
              styleObj = {
                ...styleObj,
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                border: '1px solid #FF3B30',
                color: '#FF3B30'
              }
            }
            
            return (
              <span className="text-[11px] sm:text-[12px] lg:text-[13px] px-0.5 flex items-center justify-center"
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

/* ============================================================
   宫位卡片组件
   ============================================================ */

function PalaceCard({
  name, stem, branch, majorStars, minorStars, adjectiveStars,
  boshi12Deity, longlifeDeity, isLife, isBody, isCausePalace, isSelected, onClick, chartType = 'flying', selectedDecadal = null, selectedAnnual = null, monthlySequenceLabels = [], selectedAnnualAge = null, selectedAnnualGanZhi = null, selectedAnnualLabel = '', selectedDecadalLabel = '', yearGan = '', gender = 'male', birthInfo = null, palaceData = null, decadalLifePalaceStem = null, annualLifePalaceStem = null
}: PalaceCardProps) {
  const { language, transformationShowGods, flyingShowGods, transformationShowCausePalace } = useSettingsStore()
  
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
  
  // 计算是否是当前选中的大限或流年宫位
  let isCurrentDecadalPalace = false
  let isCurrentAnnualPalace = false
  
  if (selectedDecadal !== null && selectedDecadal !== undefined && englishPalaceName) {
    if (selectedDecadal === 0) {
      // 第一大限，只有命宫是大限命宫
      isCurrentDecadalPalace = englishPalaceName === 'ming'
    } else {
      // 第二大限及以后，需要计算转移后的宫位
      const originIndex = PALACE_ORDER.indexOf(englishPalaceName)
      if (originIndex !== -1) {
        const newIndex = getDecadalPalaceIndex(originIndex, selectedDecadal, gender, yearGan)
        const newPalaceKey = PALACE_ORDER[newIndex]
        // 检查转移后的宫位是否是"命宫"
        isCurrentDecadalPalace = newPalaceKey === 'ming'  // 大限命宫
      }
    }
  }
  
  // 流年命宫：根据流年地支确定
  if (selectedAnnual !== null && selectedAnnual !== undefined && selectedAnnualGanZhi) {
    const yearlyBranch = selectedAnnualGanZhi.slice(-1)
    isCurrentAnnualPalace = branch === yearlyBranch
  }
  
  // 原始宫位名称（用于右下角显示）
  const originalPalaceName = englishPalaceName 
    ? t(`palace.${englishPalaceName}`, language) || name
    : name

  // 宮位名稱固定為原始序列，不因大限/流年切換而改名
  const displayPalaceName = originalPalaceName
  const annualPalaceLabel = ''
  
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
      `}
    >
      {/* 星耀水平排列 - 统一容器处理所有星曜 */}
      <div className={`relative flex flex-row flex-wrap mb-0 flex-1 justify-start items-start gap-0 overflow-visible ${chartType === 'transformation' && transformationShowCausePalace && isCausePalace ? 'pr-1 sm:pr-2' : ''}`}>
        {(() => {
          // 构建统一的星曜数据数组
          const allStars = [
            // 主星
            ...majorStars.map((star, i) => ({ 
              key: `major-${i}`, 
              type: 'major' as const, 
              star, 
              index: i 
            })),
            // 副星
            ...(chartType === 'flying' || chartType === 'transformation' || chartType === 'trireme' ? minorStars : []).map((star, i) => ({ 
              key: `minor-${i}`, 
              type: 'minor' as const, 
              star, 
              index: i 
            })),
            // 杂曜
            ...(chartType === 'flying' || chartType === 'trireme' ? adjectiveStars : []).map((name, i) => ({ 
              key: `adj-${i}`, 
              type: 'adjective' as const, 
              name, 
              index: i 
            }))
          ]

          return allStars.map((item) => {
            if ('star' in item) {
              return (
                <StarTag 
                  key={item.key} 
                  star={item.star} 
                  isMajorStar={isMajorStarName(item.star.name)} 
                  showBrightness={item.type === 'major'}
                  chartType={chartType} 
                  selectedDecadal={selectedDecadal} 
                  selectedAnnual={selectedAnnual} 
                  isCurrentDecadalPalace={isCurrentDecadalPalace} 
                  isCurrentAnnualPalace={isCurrentAnnualPalace} 
                  decadalLifePalaceStem={decadalLifePalaceStem}
                  annualLifePalaceStem={annualLifePalaceStem}
                />
              )
            } else {
              // 杂曜
              return (
                <div key={item.key} className="flex flex-col items-center gap-0" style={{ minHeight: '20px' }}>
                  <span className="text-[11px] sm:text-[12px] lg:text-[13px] px-0.5 py-0 rounded bg-white/[0.03] text-text-muted/70 flex items-center justify-center" style={{ writingMode: 'vertical-rl', minWidth: '12px', minHeight: '12px' }}>
                    {t(`star.${item.name}`, language) || item.name}
                  </span>
                </div>
              )
            }
          })
        })()}

        {/* 来因标签 - 星耀区右上角 */}
        {chartType === 'transformation' && transformationShowCausePalace && isCausePalace && (
          <div 
            className="absolute top-0 right-0 h-full flex items-start justify-end pointer-events-none"
          >
            <div
              className="px-0.5 py-0.5 rounded border border-red-500 text-red-500 text-[11px] sm:text-[12px] lg:text-[13px] font-medium bg-white/70"
              style={{ writingMode: 'vertical-rl', lineHeight: 1 }}
            >
              {language === 'zh-TW' ? '來因' : '来因'}
            </div>
          </div>
        )}
      </div>

      {/* 十二神显示 - 由 i18n.ts 中的定义完全控制显示内容和语言 */}
      {((chartType === 'flying' && flyingShowGods) || (chartType === 'transformation' && transformationShowGods)) && (
        <div className="flex justify-between text-[9px] sm:text-[10px] lg:text-[11px] text-text-muted mb-0.5 border-t border-white/[0.04] pt-0.5">
          <span>{t(`longlifeDeity.${longlifeDeity}`, language) || longlifeDeity}</span>
          <span>{t(`boshi12Deity.${boshi12Deity}`, language) || boshi12Deity}</span>
        </div>
      )}


      {/* 底部布局: 左下(干支) + 中間(西元+虛歲/流月) + 右下(流年/大限/宮位名) */}
      <div className="relative flex items-center justify-between w-full gap-0.5 py-0.5">
        {/* 左下: 干支(縱排) */}
        <div className="flex flex-col gap-0.5" style={{ writingMode: 'vertical-rl', minWidth: '14px' }}>
          <span className="text-[11px] sm:text-[12px] lg:text-[13px] text-text-secondary leading-none">{stem}{branch}</span>
        </div>

        {/* 中間: 由上而下顯示 西元+虛歲、流月 */}
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-0.5">
          {(decadalYear !== null || masterAge !== null) && (
            <div className="text-[9px] sm:text-[10px] lg:text-[11px] text-text-muted text-center leading-none whitespace-nowrap">
              {decadalYear !== null && <span className="mr-0.5">{decadalYear}年</span>}
              {masterAge !== null && <span>{masterAge}歲</span>}
            </div>
          )}

          {monthlySequenceLabels.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-0 text-[8px] sm:text-[9px] lg:text-[10px] text-gray-400 leading-none">
              {monthlySequenceLabels.map((label) => (
                <span key={`${branch}-${label}`} className="whitespace-nowrap">{label}</span>
              ))}
            </div>
          )}
        </div>

        {/* 右下: 流年 + 大限 + 宮位名 */}
        <div className="flex flex-col items-end justify-end gap-0.5" style={{ minWidth: '34px', marginRight: '2px' }}>
          {selectedAnnualLabel && (
            <span className="text-[11px] sm:text-[12px] lg:text-[13px] font-medium text-right leading-none inline-block" style={{ color: '#5AC8FA', minWidth: 36, maxWidth: 36 }}>
              {selectedAnnualLabel}
            </span>
          )}

          {!selectedAnnualLabel && annualPalaceLabel && (selectedAnnual === null || selectedAnnual === undefined) && (
            <span className="text-[11px] sm:text-[12px] lg:text-[13px] text-gray-400 text-center leading-none">
              {annualPalaceLabel}
            </span>
          )}

          {selectedDecadalLabel && (
            <span className="text-[11px] sm:text-[12px] lg:text-[13px] font-medium text-right leading-none inline-block" style={{ color: '#34C759', minWidth: 36, maxWidth: 36 }}>
              {selectedDecadalLabel}
            </span>
          )}

          <span className="px-0.5 py-0 rounded text-[11px] sm:text-[12px] lg:text-[13px] font-medium text-right leading-none inline-block" style={{ color: '#FF3B30', minWidth: 36, maxWidth: 36 }}>
            {displayPalaceName}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   中宮区域
   ============================================================ */

interface CenterInfoProps {
  chart: FunctionalAstrolabe
  solarDate: string
  birthTime: string
  birthInfo?: Partial<BirthInfo>
  gender: string
  language: any
  nativeName?: string
}

function CenterInfo({ chart, solarDate, birthTime, birthInfo, gender, language, nativeName }: CenterInfoProps) {
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
      if (language === 'zh-TW') {
        shichen = shichen.replace(/时/g, '時')
        if (!shichen.includes('時')) {
          shichen = shichen + '時'
        }
      } else {
        shichen = shichen.replace(/時/g, '时')
        if (!shichen.includes('时')) {
          shichen = shichen + '时'
        }
      }
    }
    
    return `${yearGanZhi}年${monthDayText} ${shichen}`.trim()
  }

  return (
    <div className="
      relative h-full min-h-[260px] sm:min-h-[320px] lg:min-h-[400px] p-2 sm:p-3 lg:p-4
      flex flex-col items-center justify-start
      bg-gradient-to-br from-white/[0.04] to-white/[0.02]
       backdrop-blur-md border border-gray-300 sm:border-1 rounded-sm
      overflow-y-auto
    ">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white" />
      </div>

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
      <div className="text-[8px] sm:text-[9px] lg:text-[10pt] text-gray-500 space-y-0.5 sm:space-y-1 w-full px-1 sm:px-2 text-center">
        
        {/* 第一行：真太陽時 */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-1.5 gap-y-0">
          <span className="text-gray-500 whitespace-nowrap">{t('chart.solarTime', language)}:</span>
          <span className="text-gray-500 font-mono break-all">{solarDate}</span>
        </div>
        
        {/* 第二行：出生時間 */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-1.5 gap-y-0">
          <span className="text-gray-500 whitespace-nowrap">{t('chart.birthTime', language)}:</span>
          <span className="text-gray-500 font-mono break-all">
            {birthInfo?.year && birthInfo?.month && birthInfo?.day
              ? `${String(birthInfo.year).padStart(4, '0')}-${String(birthInfo.month).padStart(2, '0')}-${String(birthInfo.day).padStart(2, '0')} ${birthTime}`
              : birthTime
            }
          </span>
        </div>
        
        {/* 第三行：農曆 - 完整年月日時 */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-1.5 gap-y-0">
          <span className="text-gray-500 whitespace-nowrap">{t('chart.lunarDate', language)}:</span>
          <span className="text-gray-500 break-words">{getLunarDateFull()}</span>
        </div>
        
        {/* 第四行：四柱 */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-1.5 gap-y-0">
          <span className="text-gray-500 whitespace-nowrap">{t('chart.fourPillars', language)}:</span>
          <span className="text-gray-500 break-words">
            {yearPillar} {monthPillar} {dayPillar} {hourPillar}
          </span>
        </div>
        
        {/* 第五行：五行局 + 性别 */}
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          <span className="text-gray-500">{chart.fiveElementsClass}</span>
          <span className="text-gray-500">
            {yinYangLabel}{genderText}
          </span>
        </div>
        
        {/* 第六行：納音 */}
        {nayin && (
          <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-1.5 gap-y-0">
            <span className="text-gray-500 whitespace-nowrap">{t('chart.nayin', language)}:</span>
            <span className="text-gray-500 break-words">{nayin}</span>
          </div>
        )}
        
        {/* 第七行：命主 + 身主 */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-[7px] sm:text-[8px] lg:text-[9pt]">
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{t('chart.soul', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedStarName(chart.soul, language)}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{t('chart.body', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedStarName(chart.body, language)}</span>
          </div>
        </div>
        
        {/* 第八行：生肖 + 星座 */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-[7px] sm:text-[8px] lg:text-[9pt]">
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{t('chart.zodiac', language)}:</span>
            <span className="text-gray-500 ml-0.5">{getLocalizedZodiacName(chart.zodiac, language)}</span>
          </div>
          <div className="whitespace-nowrap">
            <span className="text-gray-500">{t('chart.astroSign', language)}:</span>
            <span className="text-gray-500 ml-1">{getLocalizedAstroSign(chart.sign, language)}</span>
          </div>
        </div>
        
      </div>

      {/* 图例 - 放在下方 */}
      <div className="w-full mt-4 pt-3 border-t border-white/[0.1]">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[8pt] sm:text-[9pt]">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            <span className="text-gray-500">{t('palace.life', language)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-star-light" />
            <span className="text-gray-500">{t('chart.body', language)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-fortune text-[7pt] sm:text-[8pt]">{t('mutagen.lucun', language)}</span>
            <span className="text-gold text-[7pt] sm:text-[8pt]">{t('mutagen.quan', language)}</span>
            <span className="text-star-light text-[7pt] sm:text-[8pt]">{t('mutagen.ke', language)}</span>
            <span className="text-misfortune text-[7pt] sm:text-[8pt]">{t('mutagen.ji', language)}</span>
            <span className="text-gray-500">{t('chart.mutagen', language)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-fortune text-[7pt] sm:text-[8pt]">{t('brightness.temple', language)}</span>
            <span className="text-gold text-[7pt] sm:text-[8pt]">{t('brightness.wang', language)}</span>
            <span className="text-gray-500 text-[7pt] sm:text-[8pt]">{t('brightness.ping', language)}</span>
            <span className="text-misfortune text-[7pt] sm:text-[8pt]">{t('brightness.xian', language)}</span>
            <span className="text-gray-500">{t('chart.brightness', language)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}



/* ============================================================
   解析命盤數據 - 完整版
   ============================================================ */

function parsePalaces(chart: FunctionalAstrolabe): PalaceData[] {
  return (chart.palaces || []).map((palace) => {
    const stem = palace.heavenlyStem as string
    
    // 主星（带亮度和四化）
    const majorStars: StarData[] = (palace.majorStars || []).map((s) => ({
      name: s.name as string,
      brightness: s.brightness as string | undefined,
      mutagen: s.mutagen as string | undefined,
      palaceStem: stem,  // 添加宮位天干
    }))

    // 辅星（完整，带亮度）
    const minorStars: StarData[] = (palace.minorStars || []).map((s) => ({
      name: s.name as string,
      brightness: s.brightness as string | undefined,
      mutagen: s.mutagen as string | undefined,
      palaceStem: stem,  // 添加宮位天干
    }))

    // 杂曜
    const adjectiveStars: string[] = ((palace as any).adjectiveStars || []).map(
      (s: any) => s.name as string
    )

    return {
      name: palace.name as string,
      stem,
      branch: palace.earthlyBranch as string,
      majorStars,
      minorStars,
      adjectiveStars,
      decadal: palace.decadal as { range: [number, number] },
      boshi12Deity: palace.boshi12 as string || '',
      longlifeDeity: palace.changsheng12 as string || '',
      isLife: palace.name === '命宫',
      isBody: palace.isBodyPalace === true,
      isCausePalace: false,  // 稍后由 markCausePalace 函数标记
    }
  })
}

/* ============================================================
   大限-流年-流月-流日-流時表格組件（支持展開/收闔）
   ============================================================ */

function DecadalAnnualMonthlyTable({
  palaceData,
  birthInfo,
  selectedDecadal: externalSelectedDecadal = null,
  setSelectedDecadal: externalSetSelectedDecadal,
  selectedAnnual: externalSelectedAnnual = null,
  setSelectedAnnual: externalSetSelectedAnnual,
  selectedMonthly: externalSelectedMonthly = null,
  setSelectedMonthly: externalSetSelectedMonthly,
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
  
  const [internalSelectedMonthly, internalSetSelectedMonthly] = useState<number | null>(0)
  const selectedMonthly = externalSelectedMonthly !== undefined ? externalSelectedMonthly : internalSelectedMonthly
  const setSelectedMonthly = externalSetSelectedMonthly || internalSetSelectedMonthly

  const [selectedDaily, setSelectedDaily] = useState<number | null>(0)
  const [dailyScrollOffset, setDailyScrollOffset] = useState(0)
  const [needsScrollSpacer, setNeedsScrollSpacer] = useState(false)
  const [annualYearsToShow, setAnnualYearsToShow] = useState(10) // 显示10个流年年份
  const tableWrapRef = useRef<HTMLDivElement>(null)
  
  // 當選擇新月份時，重置流日窗口位置
  const handleSetSelectedMonthly = (index: number | null) => {
    setSelectedMonthly(index)
    setSelectedDaily(0)
    setDailyScrollOffset(0)
  }
  
  // 天干地支列表
  const shichen = ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時']
  const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  
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
  const rowLabelClass = 'shrink-0 flex items-center justify-center px-1 py-0.5 sm:px-1.5 sm:py-0 text-[8px] sm:text-[12px] lg:text-[16px] text-text-muted font-medium leading-tight bg-[#f5f5f7] min-w-[36px] sm:min-w-[52px] border border-white/[0.12] rounded-sm whitespace-nowrap'
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
              className={`relative z-0 px-0.5 py-0.5 sm:px-1.5 sm:py-1.5 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-mono text-[7px] sm:text-[12px] lg:text-[16px] min-w-[44px] sm:min-w-[64px] ${
                selectedDecadal === i 
                  ? 'bg-white/[0.01] text-star-light' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                setSelectedDecadal(i)
                setSelectedAnnual(0)
                handleSetSelectedMonthly(0)
              }}
            >
              <div className={`flex flex-col items-center gap-px leading-tight rounded-[4px] px-0.5 py-0 sm:px-1.5 sm:py-0.5 ${selectedDecadal === i ? 'bg-star/20' : ''}`}>
                <div className="whitespace-nowrap">
                  {item.ageStart}~{item.ageEnd}
                </div>
                <div className="text-[6px] sm:text-[10px] text-text-muted whitespace-nowrap">
                  {item.stem}{item.branch}限
                </div>
              </div>
            </td>
          )))}

          {selectedDecadal !== null && annualData.length > 0 && renderScrollRow('流年', annualData.map((item, i) => (
            <td 
              key={i} 
              className={`relative z-0 px-1 py-1 sm:px-1.5 sm:py-1.5 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-mono text-[7px] sm:text-[12px] lg:text-[16px] min-w-[54px] sm:min-w-[72px] ${
                selectedAnnual === i 
                  ? 'bg-white/[0.01] text-fortune' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                setSelectedAnnual(i)
                handleSetSelectedMonthly(0)
              }}
            >
              <div className={`flex flex-col items-center gap-0 leading-tight rounded-[4px] px-1 py-0.5 sm:px-1.5 sm:py-1 ${selectedAnnual === i ? 'bg-fortune/20' : ''}`}>
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
            
            return (
            <td 
              key={i} 
              className={`relative z-0 px-1 py-1.5 sm:px-1.5 sm:py-2 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-medium text-[10px] sm:text-[12px] lg:text-[16px] min-w-[38px] sm:min-w-[48px] ${
                selectedMonthly === i 
                  ? 'bg-white/[0.01] text-gold' 
                  : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
              }`}
              onClick={() => {
                handleSetSelectedMonthly(i)
              }}
            >
              <div className={`rounded-[4px] px-1 py-0 sm:px-1.5 sm:py-0.5 flex flex-col items-center gap-0 leading-tight ${selectedMonthly === i ? 'bg-gold/20' : ''}`}>
                <div className="text-[8px] sm:text-[9px] lg:text-[10px]">{month}月</div>
                {monthlyGanZhi && (
                  <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-text-muted">
                    {monthlyGanZhi}月
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
                        const chineseDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                                            '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                                            '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
                        const dayLabel = chineseDays[dayIndex]
                        return (
                          <td 
                            key={dayIndex} 
                            className={`relative z-0 px-1 py-1.5 sm:px-1.5 sm:py-2 text-center cursor-pointer transition-colors font-medium text-[7px] sm:text-[12px] lg:text-[16px] min-w-[40px] sm:min-w-[52px] border-r border-white/[0.12] whitespace-nowrap ${
                              selectedDaily === dayIndex 
                                ? 'bg-white/[0.01] text-star-light' 
                                : 'bg-white/[0.01] text-text-secondary hover:bg-white/[0.05]'
                            }`}
                            onClick={() => setSelectedDaily(dayIndex)}
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

          {selectedMonthly !== null && renderScrollRow('流時', shichen.map((time, i) => (
            <td 
              key={i} 
              className="relative z-0 px-1 py-1.5 sm:px-1.5 sm:py-2 text-center cursor-pointer transition-colors border-r border-white/[0.12] font-medium text-[7px] sm:text-[12px] lg:text-[16px] bg-white/[0.01] text-text-secondary hover:bg-white/[0.05] whitespace-nowrap min-w-[42px] sm:min-w-[52px]"
            >
              <div className="whitespace-nowrap">
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
                setSelectedDecadal(i)
                setSelectedAnnual(0)
                setSelectedMonthly(0)
                setSelectedDaily(0)
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
                setSelectedAnnual(i)
                setSelectedMonthly(0)
                setSelectedDaily(0)
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

// interface DecadalAnnualTableProps {
//   palaceData: PalaceData[]
//   birthInfo: any
// }

/* ------------------------------------------------------------
   主命盘组件
   ------------------------------------------------------------ */

export function ChartDisplay() {
  const { chart, birthInfo } = useChartStore()
  const { language, defaultChartType, monthlyArrangementMethod } = useSettingsStore()
  const [selectedPalace, setSelectedPalace] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'flying' | 'trireme' | 'transformation'>(defaultChartType)
  const [selectedDecadal, setSelectedDecadal] = useState<number | null>(null)
  const [selectedAnnual, setSelectedAnnual] = useState<number | null>(null)
  const [selectedMonthly, setSelectedMonthly] = useState<number | null>(null)
  const [isDecadalExpanded, setIsDecadalExpanded] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 })
  const [isCompactMobile, setIsCompactMobile] = useState(false)
  const birthInfoKeyRef = useRef<string>('')
  const initializedRef = useRef(false)
  
  // 自化線顯示控制
  const [mutagenDisplay, setMutagenDisplay] = useState<{
    A: boolean
    B: boolean
    C: boolean
    D: boolean
  }>({ A: true, B: true, C: true, D: true })

  const lineStrokeWidth = isCompactMobile ? 1.25 : 2
  const lineDashArray = isCompactMobile ? '4,4' : '5,5'
  const arrowMarkerSize = isCompactMobile ? 7 : 10
  const arrowRefX = isCompactMobile ? 6.3 : 9
  const arrowRefY = isCompactMobile ? 2.2 : 3
  const arrowPath = isCompactMobile ? 'M0,0 L0,4.4 L6.5,2.2 z' : 'M0,0 L0,6 L9,3 z'

  if (!chart || !birthInfo) return null

  // 動態計算實際的 cellSize 和 grid 的偏移位置
  useEffect(() => {
    // 當 birthInfo 改變時重置大限和流年選擇
    const currentBirthInfoKey = `${birthInfo.year}-${birthInfo.month}-${birthInfo.day}-${birthInfo.hour}`
    if (currentBirthInfoKey !== birthInfoKeyRef.current) {
      birthInfoKeyRef.current = currentBirthInfoKey
      setSelectedDecadal(0)
      setSelectedAnnual(0)
      setSelectedMonthly(null)
      initializedRef.current = true
    } else if (!initializedRef.current) {
      // 首次掛載時初始化
      setSelectedDecadal(0)
      setSelectedAnnual(0)
      initializedRef.current = true
    }
    
    const updateGridLayout = () => {
      if (!gridRef.current) return

      const gridElement = gridRef.current
      const parentElement = gridElement.parentElement
      
      if (!parentElement) return
      
      // 獲取 grid 相對於父容器的位置
      const gridRect = gridElement.getBoundingClientRect()
      const parentRect = parentElement.getBoundingClientRect()
      const gridRelativeX = gridRect.left - parentRect.left
      const gridRelativeY = gridRect.top - parentRect.top
      setGridOffset({ x: gridRelativeX, y: gridRelativeY })
      setIsCompactMobile(window.innerWidth < 640)

    }

    updateGridLayout()
    
    // 在窗口 resize 時重新計算
    const resizeObserver = new ResizeObserver(() => {
      updateGridLayout()
    })
    
    // 監控grid容器的大小變化
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current)
    }
    
    // 監控window resize和scroll
    window.addEventListener('resize', updateGridLayout)
    window.addEventListener('scroll', updateGridLayout, true)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateGridLayout)
      window.removeEventListener('scroll', updateGridLayout, true)
    }
  }, [chartType, birthInfo])

  // 重置流月選擇（當 birthInfo 改變時）
  useEffect(() => {
    setSelectedMonthly(null)
  }, [birthInfo?.year, birthInfo?.month, birthInfo?.day])

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
    
    // 計算 palaceData
    let palaceDataComputed = parsePalaces(chart)
    palaceDataComputed = markSelfMutagens(palaceDataComputed)
    
    // 找到選中宮位的詳細信息
    const selectedPalaceData = palaceDataComputed.find(p => p.name === selectedPalace)
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

      // 將簡體星名轉換為繁體
      const mutagenStarChinese = STAR_NAME_MAP[mutagenStar] || mutagenStar

      // 找到該星的 DOM 元素
      const starElements = Array.from(gridRef.current!.querySelectorAll<HTMLElement>('span[data-star-name]'))
      const starElement = starElements.find(el => {
        const starNameAttr = el.getAttribute('data-star-name') || ''
        return starNameAttr === mutagenStarChinese || starNameAttr === mutagenStar
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
  }, [selectedPalace, chart, mutagenDisplay])

  // 計算生年天干
  const heavenlyStemList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const yearGan = heavenlyStemList[(birthInfo.year - 1900 + 6) % 10]
  const gender = birthInfo.gender as 'male' | 'female'

  let palaceData = parsePalaces(chart)
  // 標記自化（離心自化和向心自化）
  palaceData = markSelfMutagens(palaceData)
  // 標記來因宮
  palaceData = markCausePalace(palaceData, yearGan)

  // 由大限序號定位「大限命宮」天干，供三合盤額外四化顯示使用
  const decadalLifePalaceStem = (() => {
    if (selectedDecadal === null) return null

    const sortedDecadalPalaces = palaceData
      .filter(p => p.decadal?.range)
      .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])

    return sortedDecadalPalaces[selectedDecadal]?.stem || null
  })()

  const grid: (PalaceData | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null))

  palaceData.forEach((p) => {
    const pos = PALACE_POSITIONS[p.branch]
    if (pos) grid[pos.row][pos.col] = p
  })

  const hour = String(birthInfo.hour || 0).padStart(2, '0')
  const minute = String(birthInfo.minute || 0).padStart(2, '0')
  const birthTime = `${hour}:${minute}`
  const solarDate = calculateSolarTime(birthInfo)
  const genderDisplay = gender === 'male' ? '男' : '女'

  // 计算流年信息（如果选择了流年）
  let selectedAnnualYear: number | null = null
  let selectedAnnualAge: number | null = null
  let selectedAnnualGanZhi: string | null = null
  
  if (selectedDecadal !== null && selectedAnnual !== null) {
    // 计算排序后的大限数据（与表格中的排序保持一致）
    const sortedDecadalDataTemp = palaceData
      .filter(p => p.decadal?.range)
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

  // 由流年地支定位「年命宮」天干，供三合盤額外四化顯示使用
  const annualLifePalaceStem = (() => {
    if (!selectedAnnualGanZhi || selectedAnnual === null) return null
    const yearlyBranch = selectedAnnualGanZhi.slice(-1)
    return palaceData.find(p => p.branch === yearlyBranch)?.stem || null
  })()

  const monthlySequenceByBranch = getMonthlySequenceByBranch(chart, palaceData, selectedDecadal, selectedAnnual, selectedAnnualGanZhi, selectedAnnualYear, monthlyArrangementMethod)

  // 計算大限標籤映射 - 根據選中大限找出大命宮位
  let decadalLabelsByPalaceName: Record<string, string> = {}
  if (selectedDecadal !== null) {
    const decadalLabels = ['大命', '大父', '大福', '大田', '大官', '大友', '大遷', '大疾', '大財', '大子', '大夫', '大兄']
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
            decadalLabelsByPalaceName[palaceEnglishName] = decadalLabels[labelIndex]
          }
        }
      }
    }
  }

  // 計算流年標籤映射 - 根據流年地支找出年命宮位
  let annualLabelsByPalaceName: Record<string, string> = {}
  if (selectedAnnualGanZhi && selectedAnnual !== null) {
    const yearlyBranch = selectedAnnualGanZhi.slice(-1) // 提取地支
    const annualLabels = ['年命', '年父', '年福', '年田', '年官', '年友', '年遷', '年疾', '年財', '年子', '年夫', '年兄']
    
    // 找出流年地支對應的宮位（年命宮）
    const yearlyLifePalace = palaceData.find(p => p.branch === yearlyBranch)
    if (yearlyLifePalace) {
      // 獲取年命宮的英文名稱
      const lifeEnglishName = PALACE_NAME_TO_ENGLISH_MAP[yearlyLifePalace.name]
      if (lifeEnglishName) {
        // 在 PALACE_ORDER 中找出年命宮的位置
        const lifeIndex = PALACE_ORDER.indexOf(lifeEnglishName)
        if (lifeIndex !== -1) {
          // 從年命宮開始，為所有宮位分配標籤（以英文 key 存儲，避免中文字形差異）
          for (let i = 0; i < PALACE_ORDER.length; i++) {
            const palaceEnglishName = PALACE_ORDER[i]
            const labelIndex = (i - lifeIndex + PALACE_ORDER.length) % PALACE_ORDER.length
            annualLabelsByPalaceName[palaceEnglishName] = annualLabels[labelIndex]
          }
        }
      }
    }
  }

  const renderPalace = (palace: PalaceData | null, key: string) => {
    if (!palace) return <div key={key} />
    
    return (
      <div key={key} data-palace-branch={palace.branch} data-palace-name={palace.name}>
        <PalaceCard
          key={key}
          {...palace}
          isSelected={selectedPalace === palace.name}
          onClick={() => setSelectedPalace(selectedPalace === palace.name ? null : palace.name)}
          chartType={chartType}
          selectedDecadal={selectedDecadal}
          selectedAnnual={selectedAnnual}
          monthlySequenceLabels={monthlySequenceByBranch[palace.branch] || []}
          selectedAnnualAge={selectedAnnualAge}
          selectedAnnualGanZhi={selectedAnnualGanZhi}
          selectedAnnualLabel={(() => {
            const englishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
            return annualLabelsByPalaceName[englishKey] || ''
          })()}
          selectedDecadalLabel={(() => {
            const englishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
            return decadalLabelsByPalaceName[englishKey] || ''
          })()}
          yearGan={yearGan}
          gender={gender}
          birthInfo={birthInfo}
          palaceData={palaceData}
          decadalLifePalaceStem={decadalLifePalaceStem}
          annualLifePalaceStem={annualLifePalaceStem}
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
          const allLines = collectMutagenLines(palaceData)
          
          // 根据显示状态过滤线条（保持原有的显示逻辑）
          const lines = allLines.filter(line => {
            if (line.label) {
              const shouldDisplay = mutagenDisplay[line.label as 'A' | 'B' | 'C' | 'D'] ?? true
              return shouldDisplay
            }
            return true
          })
          
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
                    // 方法1: 完全相等
                    if (starNameAttr === line.starName) return true
                    // 方法2: 嘗試繁體/簡體互相轉換配對
                    const starNameChinese = STAR_NAME_MAP[starNameAttr] || starNameAttr
                    if (starNameChinese === line.starName) return true
                    // 方法3: line.starName也嘗試逆向轉換
                    if (starNameAttr === line.starName) return true
                    return false
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
                          x={line2X2 !== null ? line2X2 + gridOffset.x : line1X2 + gridOffset.x + (isCompactMobile ? 4 : 8)}
                          y={line2Y2 !== null ? line2Y2 + gridOffset.y - (isCompactMobile ? 8 : 10) : line1Y2 + gridOffset.y + (fromPalacePos.row === 0 ? (isCompactMobile ? 10 : 14) : (isCompactMobile ? -4 : -8))}
                          fontSize={isCompactMobile ? '10' : '14'}
                          fontWeight="medium"
                          fill={line.color}
                          opacity="0.8"
                          textAnchor={line2X2 !== null ? 'middle' : 'start'}
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
                  const fromPos = getPalaceEdgePointTowardCenterWithDOM(line.fromPalace, gridRef.current)
                  const toPos = getPalaceEdgePointTowardCenterWithDOM(line.toPalace, gridRef.current)
                  
                  if (!fromPos || !toPos) return null
                  
                  return (
                    <g key={`counter-${idx}`}>
                      {/* 向心自化虛線箭頭 */}
                      <line
                        x1={fromPos.x + gridOffset.x}
                        y1={fromPos.y + gridOffset.y}
                        x2={toPos.x + gridOffset.x}
                        y2={toPos.y + gridOffset.y}
                        stroke={line.color}
                        strokeWidth={lineStrokeWidth}
                        strokeDasharray={lineDashArray}
                        opacity={isCompactMobile ? 0.6 : 0.7}
                        markerEnd={`url(#${line.markerColor})`}
                      />
                      {/* 向心自化標籤 - 位置在90%處（靠近箭頭） */}
                      {line.label && (
                        <>
                          {/* 標籤背景 - 跟中間區域相同的透明白色 */}
                          <rect
                            x={fromPos.x + (toPos.x - fromPos.x) * 0.9 + gridOffset.x - (isCompactMobile ? 8 : 10)}
                            y={fromPos.y + (toPos.y - fromPos.y) * 0.9 + gridOffset.y - (isCompactMobile ? 13 : 16)}
                            width={isCompactMobile ? '16' : '20'}
                            height={isCompactMobile ? '16' : '20'}
                            fill="rgba(255, 255, 255, 0.9)"
                            rx={isCompactMobile ? '8' : '10'}
                            opacity="1"
                          />
                          {/* 標籤文字 */}
                          <text
                            x={fromPos.x + (toPos.x - fromPos.x) * 0.9 + gridOffset.x}
                            y={fromPos.y + (toPos.y - fromPos.y) * 0.9 + gridOffset.y }
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
              
              {/* 選中宮位發出的四條線 - 從天干頂部到四化星曜底部（不含標籤，通過 useEffect 修改 star tag 樣式） */}
              {selectedPalace && (() => {
                const gridElement = gridRef.current
                if (!gridElement) return null
                
                // 找到選中宮位的詳細信息
                let selectedPalaceData: PalaceData | null = null
                if (selectedPalace) {
                  selectedPalaceData = palaceData.find(p => p.name === selectedPalace) || null
                }
                
                if (!selectedPalaceData) {
                  console.warn(`[四化線] 找不到宮位: ${selectedPalace}`)
                  return null
                }
                
                const stem = selectedPalaceData.stem
                const sihuaMap = SIHUA_BY_GAN[stem]
                
                if (!sihuaMap) {
                  console.warn(`[四化線] 找不到天干的四化表: ${stem}`)
                  return null
                }
                
                // 獲取起點：選中宮位的天干頂部
                const fromCardSelector = `[data-palace-branch="${selectedPalaceData.branch}"]`
                const fromCardElement = gridElement.querySelector(fromCardSelector) as HTMLElement
                if (!fromCardElement) {
                  console.warn(`[四化線] 找不到宮位card: ${selectedPalaceData.branch}`)
                  return null
                }
                
                const bottomFlexDiv = fromCardElement.querySelector('div.relative.flex.items-center.justify-between') as HTMLElement
                let stemStartX: number | null = null
                let stemStartY: number | null = null
                
                if (bottomFlexDiv) {
                  const stemContainers = bottomFlexDiv.querySelectorAll('div[style*="vertical-rl"]')
                  if (stemContainers.length > 0) {
                    const stemContainer = stemContainers[0] as HTMLElement
                    const gridRect = gridElement.getBoundingClientRect()
                    const stemRect = stemContainer.getBoundingClientRect()
                    stemStartX = stemRect.left - gridRect.left + stemRect.width / 2
                    stemStartY = stemRect.top - gridRect.top
                  }
                }
                
                if (stemStartX === null || stemStartY === null) {
                  console.warn(`[四化線] 找不到天干位置`)
                  return null
                }
                
                // 為四個四化類型生成線條
                const mutagenKeys = ['化禄', '化权', '化科', '化忌']
                
                return (
                  <>
                    {mutagenKeys.map((mutagenKey, keyIdx) => {
                      // 檢查該四化類型是否應該顯示
                      const mutagenMapping: Record<string, 'A' | 'B' | 'C' | 'D'> = {
                        '化禄': 'A',
                        '化权': 'B',
                        '化科': 'C',
                        '化忌': 'D'
                      }
                      const label = mutagenMapping[mutagenKey]
                      const shouldDisplay = mutagenDisplay[label] ?? true
                      if (!shouldDisplay) return null
                      
                      const mutagenStar = sihuaMap[mutagenKey]
                      if (!mutagenStar) return null
                      
                      // 將簡體星名轉換為繁體以匹配命盤數據
                      const mutagenStarChinese = STAR_NAME_MAP[mutagenStar] || mutagenStar
                      
                      // 在palaceData中找到包含該星曜的宮位和該星的位置
                      let starEndX: number | null = null
                      let starEndY: number | null = null
                      
                      for (const palace of palaceData) {
                        const allStars = [...palace.majorStars, ...palace.minorStars]
                        const targetStarIndex = allStars.findIndex(s => s.name === mutagenStarChinese || s.name === mutagenStar)
                        
                        if (targetStarIndex !== -1) {
                          // 找到該星所在的宮位card
                          const toPalaceCardSelector = `[data-palace-branch="${palace.branch}"]`
                          const toPalaceCardElement = gridElement.querySelector(toPalaceCardSelector) as HTMLElement
                          if (!toPalaceCardElement) continue
                          
                          // 在宮位card中找到該星曜的DOM元素
                          const starElements = Array.from(toPalaceCardElement.querySelectorAll('span[data-star-name]'))
                          const starElement = starElements.find(el => {
                            const starNameAttr = el.getAttribute('data-star-name') || ''
                            return starNameAttr === mutagenStarChinese || starNameAttr === mutagenStar
                          }) as HTMLElement
                          
                          if (starElement) {
                            const gridRect = gridElement.getBoundingClientRect()
                            const starRect = starElement.getBoundingClientRect()
                            starEndX = starRect.left - gridRect.left + starRect.width / 2
                            starEndY = starRect.bottom - gridRect.top
                          }
                          break
                        }
                      }
                      
                      if (starEndX === null || starEndY === null) {
                        console.warn(`[四化線] 找不到星曜: ${mutagenStar}`)
                        return null
                      }
                      
                      // 提取四化類型作為顏色鍵
                      const mutagenType = getMutagenType(mutagenKey)
                      const colorInfo = MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]
                      
                      return (
                        <g key={`selected-palace-line-${keyIdx}`}>
                          {/* 實線箭頭 - 從天干頂部到星曜底部，和離心實線相同粗度 */}
                          <line
                            x1={stemStartX + gridOffset.x}
                            y1={stemStartY + gridOffset.y}
                            x2={starEndX + gridOffset.x}
                            y2={starEndY + gridOffset.y}
                            stroke={colorInfo.color}
                            strokeWidth={lineStrokeWidth}
                            opacity={isCompactMobile ? 0.5 : 0.6}
                            markerEnd={`url(#${colorInfo.marker})`}
                          />
                        </g>
                      )
                    })}
                  </>
                )
              })()}
            </>
          )
        })()}
      </svg>
      )}

      {/* 4x4 网格 */}
      <div ref={gridRef} className="grid grid-cols-4 gap-0 relative" style={{ zIndex: 2 }}>
        {/* Row 0 */}
        {grid[0].map((p, c) => renderPalace(p, `0-${c}`))}

        {/* Row 1: left + center(2x2) + right */}
        {renderPalace(grid[1][0], '1-0')}
        <div className="col-span-2 row-span-2" data-centerinfo>
          <CenterInfo chart={chart} solarDate={solarDate} birthTime={birthTime} birthInfo={birthInfo} gender={genderDisplay} language={language} nativeName={birthInfo?.name} />
        </div>
        {renderPalace(grid[1][3], '1-3')}

        {/* Row 2: left + right (center already spans) */}
        {renderPalace(grid[2][0], '2-0')}
        {renderPalace(grid[2][3], '2-3')}

        {/* Row 3 */}
        {grid[3].map((p, c) => renderPalace(p, `3-${c}`))}
      </div>

      {/* 盘面类型切换按钮 - 移到盘面下方 */}
      <div className="mt-4 sm:mt-10 mb-2 sm:mb-3 w-full overflow-x-auto px-0.5 sm:px-0">
        <div className="flex items-center justify-between gap-1 sm:gap-3 w-full min-w-max">
        {/* 第一部分：盤面類型按鈕（左邊） */}
        <div className="flex flex-nowrap justify-start gap-1 sm:gap-1.5 items-center shrink-0">
          {[
            { value: 'flying', label: '飛星' },
            { value: 'trireme', label: '三合' },
            { value: 'transformation', label: '四化' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setChartType(item.value as 'flying' | 'trireme' | 'transformation')}
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

        {/* 三合盤時的中間間隔 - 讓收闔按鍵居中 */}
        {chartType === 'trireme' && <div className="flex-1" />}

        {/* 第二部分：收合按鈕 */}
        <button
          onClick={() => setIsDecadalExpanded(!isDecadalExpanded)}
          className="rounded-md sm:rounded-lg font-medium transition-all bg-star text-white hover:bg-star-light shadow-lg flex items-center justify-center w-7 h-6 sm:w-7 sm:h-7 shrink-0"
          title={isDecadalExpanded ? '收起' : '展開'}
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

        {/* 第三部分：ABCD 控制组件 - 飛星盤與四化盤顯示，三合盤隱藏 */}
        {(chartType === 'flying' || chartType === 'transformation') && (
          <MutagenControls mutagenDisplay={mutagenDisplay} setMutagenDisplay={setMutagenDisplay} />
        )}
        </div>
      </div>

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
          isExpanded={isDecadalExpanded}
        />
      </div>
    </div>
  )
}
