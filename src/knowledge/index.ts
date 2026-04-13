/* ============================================================
   知识检索服务
   根据命盘数据检索相关知识，组装 AI 解读所需的上下文
   ============================================================ */

import { getStarInfo, type StarInfo } from './stars/majorStars'
import { getSihuaByGan, getSihuaInfo, type SihuaInfo } from './sihua'
import { t, type Language } from '@/lib/i18n'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'

/* ------------------------------------------------------------
   知识上下文类型
   ------------------------------------------------------------ */

interface StarWithBrightness {
  name: string
  brightness?: string      // 庙/旺/得/利/平/不/陷
  mutagen?: string         // 化禄/化权/化科/化忌
}

interface DecadalData {
  palaceName: string       // 大限所在宫位名
  ageRange: string         // "6-15" 年龄范围
  stem: string             // 大限天干
  mutagens: string[]       // 大限四化
}

interface YearlyData {
  year: number
  stem: string             // 流年天干
  branch: string           // 流年地支
  mutagens: string[]       // 流年四化
  palaceName: string       // 流年命宫所在宫位
}

interface PalaceData {
  name: string
  stem: string             // 宫干
  branch: string           // 地支
  majorStars: StarWithBrightness[]
  minorStars: StarWithBrightness[]  // 六吉六煞等
  adjectiveStars: string[]          // 杂曜
  isBodyPalace: boolean
  decadalRange?: string    // 大限年龄范围
}

export interface KnowledgeContext {
  // 基础信息
  命宫主星: StarInfo[]
  身宫主星: StarInfo[]
  身宫位置: string

  // 完整十二宫信息
  十二宫: PalaceData[]

  // 大限信息（十二个大限）
  大限: DecadalData[]

  // 流年信息（近10年 + 未来5年）
  流年: YearlyData[]

  // 四化分布（本命盘）
  四化分布: Array<{
    sihua: SihuaInfo
    star: string
    palace: string
  }>
}

export interface CentrifugalMutagenInfo {
  發生宮位: string
  星曜: string
  四化: string
}

export interface CounterMutagenInfo {
  來源宮位: string
  目標對宮: string
  星曜: string
  四化: string
}

export interface ChartIndicatorPalaceSummary {
  宮干: string
  地支: string
  我宮他宮: '我宮' | '他宮' | ''
  主星: string[]
  男女星: string[]
  離心自化: (string | CentrifugalMutagenInfo)[]
  向心自化: (string | CounterMutagenInfo)[]
  大限: string
}

export interface ChartIndicators {
  基本資料: {
    出生年?: number
    年干: string
    五行局: string
    命主: string
    命宮: string
    來因宮: string
    生年四化?: Array<{
      星曜: string
      四化: string
      宮位: string
      我宮他宮: '我宮' | '他宮' | ''
      男女星: string
    }>
  }
  北派四化重點: {
    離心自化: (string | CentrifugalMutagenInfo)[]
    向心自化: (string | CounterMutagenInfo)[]
  }
  論命座標系: Array<{
    宮位: string
    宮干: string
    地支: string
    我宮他宮: '我宮' | '他宮' | ''
    主星: string[]
    男女星: string[]
  }>
  核心宮位: Record<string, ChartIndicatorPalaceSummary | null>
  運限焦點: {
    當前年份: number
    目前虛歲: number | null
    當前大限: {
      宮位: string
      天干: string
      四化: string[]
    } | null
    近三年流年: Array<{
      年份: number
      流年命宮: string
      天干: string
      地支: string
      四化: string[]
    }>
  }

}

const MUTAGEN_LABEL_MAP: Record<string, 'A' | 'B' | 'C' | 'D'> = {
  '化禄': 'A',
  '化祿': 'A',
  '化权': 'B',
  '化權': 'B',
  '化科': 'C',
  '化忌': 'D',
}

const CAUSE_PALACE_BRANCH_MAP: Record<string, string> = {
  '甲': '戌', '乙': '酉', '丙': '申', '丁': '未',
  '戊': '午', '己': '巳', '庚': '辰', '辛': '卯',
  '壬': '寅', '癸': '亥',
}

const OPPOSITE_BRANCH_MAP: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉',
  '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
  '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
}

const SELF_PALACE_SET = new Set(['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄'])
const OTHER_PALACE_SET = new Set(['迁移', '交友', '官禄', '田宅', '福德', '父母'])

const STAR_NAME_NORMALIZATION: Record<string, string> = {
  '廉貞': '廉贞',
  '天機': '天机',
  '太陽': '太阳',
  '太陰': '太阴',
  '貪狼': '贪狼',
  '巨門': '巨门',
  '七殺': '七杀',
  '破軍': '破军',
  '左輔': '左辅',
}

function normalizeStarName(name: unknown): string {
  const value = String(name || '').trim()
  return STAR_NAME_NORMALIZATION[value] || value
}

function normalizePalaceName(name: unknown): string {
  return String(name || '')
    .trim()
    .replace('命宮', '命宫')
    .replace('財帛', '财帛')
    .replace('遷移', '迁移')
    .replace('官祿', '官禄')
    .replace('仆役', '交友')
    .replace('僕役', '交友')
}

function getPalaceRole(name: unknown): '我宮' | '他宮' | '' {
  const normalized = normalizePalaceName(name)
  if (SELF_PALACE_SET.has(normalized)) return '我宮'
  if (OTHER_PALACE_SET.has(normalized)) return '他宮'
  return ''
}

function getStarPolarityInfo(starName: unknown): { 陰陽: string; 男女星: string } {
  const info = getStarInfo(normalizeStarName(starName))
  if (!info) {
    return { 陰陽: '', 男女星: '' }
  }

  const yinYang = info.yinyang === '阳' ? '陽' : info.yinyang === '阴' ? '陰' : info.yinyang
  const genderTag = yinYang === '陽' ? '男星' : yinYang === '陰' ? '女星' : ''

  return {
    陰陽: yinYang,
    男女星: genderTag,
  }
}

function getMutagenList(mutagen: unknown): string[] {
  if (!mutagen) return []
  
  const values = Array.isArray(mutagen)
    ? mutagen.map(item => String(item)).filter(Boolean)
    : [String(mutagen)]
  
  // 确保格式正确：如果没有"化"字前缀，则添加
  return values.map(val => {
    const str = val.trim()
    if (str.startsWith('化')) {
      return str  // 已经有"化"字
    }
    // iztro 返回的是"禄"、"权"等单字，需要添加"化"字前缀
    return `化${str}`
  })
}

function formatStarLabel(star: { name?: unknown; brightness?: unknown; mutagen?: unknown }): string {
  const name = normalizeStarName(star.name)
  const mutagens = getMutagenList(star.mutagen)
  const mutagenStr = mutagens.length > 0 ? `[${mutagens.join('、')}]` : ''
  return `${name}${mutagenStr}`
}

function getPalaceBranch(palace: Record<string, unknown>): string {
  return String(palace.earthlyBranch || palace.branch || '')
}

function getPalaceStem(palace: Record<string, unknown>): string {
  return String(palace.heavenlyStem || palace.stem || '')
}


function collectPalaceMutagenHighlights(
  palace: Record<string, unknown>,
  oppositePalace?: Record<string, unknown>,
): { self: (string | CentrifugalMutagenInfo)[]; counter: (string | CounterMutagenInfo)[] } {
  const self: (string | CentrifugalMutagenInfo)[] = []
  const counter: (string | CounterMutagenInfo)[] = []
  
  const palaceName = normalizePalaceName(palace.name as string)
  const oppositeName = oppositePalace ? normalizePalaceName(oppositePalace.name as string) : ''

  const palaceStem = getPalaceStem(palace)
  
  // 離心自化: 本宮天干的四化
  if (palaceStem) {
    const sihuaMap = getSihuaByGan(palaceStem)
    if (sihuaMap) {
      const allStars = [
        ...((palace.majorStars as Array<Record<string, unknown>> | undefined) || []),
        ...((palace.minorStars as Array<Record<string, unknown>> | undefined) || []),
      ]
      
      // 遍歷四化表中的每個四化類型
      Object.entries(sihuaMap).forEach(([mutagenKey, targetStar]) => {
        // 檢查本宮中是否有該四化指向的星
        const targetStarNorm = normalizeStarName(targetStar)
        const hasTargetStar = allStars.some(s => normalizeStarName(s.name) === targetStarNorm)
        
        if (hasTargetStar) {
          self.push({
            發生宮位: palaceName,
            星曜: targetStarNorm,
            四化: mutagenKey,
          })
        }
      })
    }
  }
  
  // 向心自化: 對宮天干的四化指向本宮
  if (oppositePalace) {
    const oppositeStem = getPalaceStem(oppositePalace)
    if (oppositeStem) {
      const sihuaMap = getSihuaByGan(oppositeStem)
      if (sihuaMap) {
        const allStars = [
          ...((palace.majorStars as Array<Record<string, unknown>> | undefined) || []),
          ...((palace.minorStars as Array<Record<string, unknown>> | undefined) || []),
        ]
        
        // 遍歷四化表中的每個四化類型
        Object.entries(sihuaMap).forEach(([mutagenKey, targetStar]) => {
          // 檢查本宮中是否有該四化指向的星
          const targetStarNorm = normalizeStarName(targetStar)
          const hasTargetStar = allStars.some(s => normalizeStarName(s.name) === targetStarNorm)
          
          if (hasTargetStar) {
            counter.push({
              來源宮位: oppositeName,
              目標對宮: palaceName,
              星曜: targetStarNorm,
              四化: mutagenKey,
            })
          }
        })
      }
    }
  }

  return {
    self,
    counter,
  }
}

function summarizeIndicatorPalace(
  palace: Record<string, unknown>,
  oppositePalace?: Record<string, unknown>,
): ChartIndicatorPalaceSummary {
  const { self, counter } = collectPalaceMutagenHighlights(palace, oppositePalace)
  const decadal = palace.decadal as { range?: [number, number] } | undefined
  const majorStars = (palace.majorStars as Array<Record<string, unknown>> | undefined) || []

  return {
    宮干: getPalaceStem(palace),
    地支: getPalaceBranch(palace),
    我宮他宮: getPalaceRole(palace.name),
    主星: majorStars.map(formatStarLabel),
    男女星: majorStars.map(star => normalizeStarName(star.name)).filter(Boolean),
    離心自化: self,
    向心自化: counter,
    大限: decadal?.range ? `${decadal.range[0]}-${decadal.range[1]}` : '',
  }
}

export function buildChartIndicators(
  chart: FunctionalAstrolabe,
  birthYear?: number,
  context?: KnowledgeContext,
): ChartIndicators {
  const knowledge = context || extractKnowledge(chart, birthYear)
  const palaces = ((chart as unknown as { palaces?: Array<Record<string, unknown>> }).palaces || [])
  const fourPillars = String((chart as unknown as { chineseDate?: string }).chineseDate || '').split(' ')
  const yearGan = fourPillars[0]?.charAt(0) || ''
  const causeBranch = CAUSE_PALACE_BRANCH_MAP[yearGan] || ''
  const palaceByBranch = new Map<string, Record<string, unknown>>()

  palaces.forEach((palace) => {
    palaceByBranch.set(getPalaceBranch(palace), palace)
  })

  const lifePalace = palaces.find(palace => normalizePalaceName(palace.name) === '命宫')
  const causePalace = palaces.find(palace => getPalaceBranch(palace) === causeBranch)

  const corePalaceMap: Array<[string, string]> = [
    ['命宮', '命宫'],
    ['兄弟宮', '兄弟'],
    ['夫妻宮', '夫妻'],
    ['子女宮', '子女'],
    ['財帛宮', '财帛'],
    ['疾厄宮', '疾厄'],
    ['遷移宮', '迁移'],
    ['交友宮', '交友'],
    ['官祿宮', '官禄'],
    ['田宅宮', '田宅'],
    ['福德宮', '福德'],
    ['父母宮', '父母'],
  ]

  const corePalaces: Record<string, ChartIndicatorPalaceSummary | null> = {}
  for (const [label, palaceName] of corePalaceMap) {
    const palace = palaces.find(item => normalizePalaceName(item.name) === palaceName)
    if (!palace) {
      corePalaces[label] = null
      continue
    }

    const oppositeBranch = OPPOSITE_BRANCH_MAP[getPalaceBranch(palace)]
    const oppositePalace = oppositeBranch ? palaceByBranch.get(oppositeBranch) : undefined
    corePalaces[label] = summarizeIndicatorPalace(palace, oppositePalace)
  }

  const currentYear = new Date().getFullYear()
  const currentAge = birthYear ? currentYear - birthYear + 1 : null
  const currentDecadal = currentAge
    ? knowledge.大限.find((item) => {
        const [start, end] = item.ageRange.split('-').map(Number)
        return currentAge >= start && currentAge <= end
      }) || null
    : null

  const palaceCoordinates = palaces.map((palace) => {
    const oppositeBranch = OPPOSITE_BRANCH_MAP[getPalaceBranch(palace)]
    const oppositePalace = oppositeBranch ? palaceByBranch.get(oppositeBranch) : undefined
    const summary = summarizeIndicatorPalace(palace, oppositePalace)
    const normalizedPalaceName = normalizePalaceName(palace.name)
    const normalizedOppositeName = oppositePalace ? normalizePalaceName(oppositePalace.name) : ''

    return {
      宮位: normalizedPalaceName,
      宮干: summary.宮干,
      地支: summary.地支,
      宮位屬性: summary.我宮他宮,
      ...(normalizedPalaceName === '命宫' ? { 是否命宮: true as const } : {}),
      ...(palace.isBodyPalace === true ? { 是否身宮: true as const } : {}),
      ...(getPalaceBranch(palace) === causeBranch ? { 是否來因宮: true as const } : {}),
      對宮: normalizedOppositeName,
      主星: summary.主星,
      男女星標記: summary.男女星,
      離心自化: summary.離心自化,
      向心自化: summary.向心自化,
      大限: summary.大限,
    }
  })

  // Collect all self/counter mutagens from all 12 palaces
  const allSelfMutagens: (string | CentrifugalMutagenInfo)[] = []
  const allCounterMutagens: (string | CounterMutagenInfo)[] = []
  
  // 从所有12个宫位收集数据，而不仅仅是核心宫位
  palaceCoordinates.forEach(item => {
    if (item?.離心自化) {
      allSelfMutagens.push(...item.離心自化)
    }
    if (item?.向心自化) {
      allCounterMutagens.push(...item.向心自化)
    }
  })

  const selfHighlights = allSelfMutagens.filter((value, index, array) => {
    // Handle both string and object types
    if (typeof value === 'string') {
      return array.indexOf(value) === index
    } else {
      // For objects, find unique ones based on stringify comparison
      const stringified = JSON.stringify(value)
      return array.findIndex(v => typeof v === 'object' && JSON.stringify(v) === stringified) === index
    }
  })

  const counterHighlights = allCounterMutagens.filter((value, index, array) => {
    // Handle both string and object types
    if (typeof value === 'string') {
      return array.indexOf(value) === index
    } else {
      // For objects, find unique ones based on stringify comparison
      const stringified = JSON.stringify(value)
      return array.findIndex(v => typeof v === 'object' && JSON.stringify(v) === stringified) === index
    }
  })

  const natalMutagens = [...knowledge.四化分布]
    .sort((a, b) => {
      const order = ['A', 'B', 'C', 'D']
      const aIndex = order.indexOf(MUTAGEN_LABEL_MAP[a.sihua.name] || '?')
      const bIndex = order.indexOf(MUTAGEN_LABEL_MAP[b.sihua.name] || '?')
      return aIndex - bIndex
    })
    .map(item => {
      const normalizedPalace = normalizePalaceName(item.palace)
      const normalizedStar = normalizeStarName(item.star)
      const polarity = getStarPolarityInfo(normalizedStar)

      return {
        星曜: normalizedStar,
        四化: item.sihua.name,
        宮位: normalizedPalace,
        我宮他宮: getPalaceRole(normalizedPalace),
        男女星: polarity.男女星,
      }
    })

  return {
    基本資料: {
      出生年: birthYear,
      年干: yearGan,
      五行局: String((chart as unknown as { fiveElementsClass?: string }).fiveElementsClass || ''),
      命主: String((chart as unknown as { soul?: string }).soul || ''),
      命宮: normalizePalaceName(lifePalace?.name || ''),
      來因宮: normalizePalaceName(causePalace?.name || ''),
      生年四化: natalMutagens,
    },

    北派四化重點: {
      離心自化: selfHighlights,
      向心自化: counterHighlights,
    },

    論命座標系: palaceCoordinates.map(item => ({
      宮位: item.宮位,
      宮干: item.宮干,
      地支: item.地支,
      我宮他宮: item.宮位屬性,
      主星: item.主星,
      男女星: item.男女星標記,
      ...(item.離心自化.length > 0 ? { 離心自化: item.離心自化 } : {}),
      ...(item.向心自化.length > 0 ? { 向心自化: item.向心自化 } : {}),
      ...(item.是否來因宮 ? { 來因宮: true as const } : {}),
      ...(item.是否命宮 ? { 命宮: true as const } : {}),
      ...(item.是否身宮 ? { 身宮: true as const } : {}),
    })),
    核心宮位: corePalaces,
    運限焦點: {
      當前年份: currentYear,
      目前虛歲: currentAge,
      當前大限: currentDecadal ? {
        宮位: currentDecadal.palaceName,
        天干: currentDecadal.stem,
        四化: currentDecadal.mutagens,
      } : null,
      近三年流年: knowledge.流年
        .filter(item => item.year >= currentYear - 1 && item.year <= currentYear + 1)
        .map(item => ({
          年份: item.year,
          流年命宮: item.palaceName,
          天干: item.stem,
          地支: item.branch,
          四化: item.mutagens,
        })),
    },
  }
}

/* ------------------------------------------------------------
   从命盘提取知识上下文
   ------------------------------------------------------------ */

export function extractKnowledge(chart: FunctionalAstrolabe, birthYear?: number): KnowledgeContext {
  const context: KnowledgeContext = {
    命宫主星: [],
    身宫主星: [],
    身宫位置: '',
    十二宫: [],
    大限: [],
    流年: [],
    四化分布: [],
  }

  const palaces = chart.palaces || []

  // 遍历所有十二宫
  for (const palace of palaces) {
    const palaceName = normalizePalaceName(palace.name)
    const majorStars = palace.majorStars || []
    const minorStars = palace.minorStars || []
    const adjectiveStars = palace.adjectiveStars || []
    const decadal = palace.decadal as { range?: [number, number] } | undefined

    // 提取主星（含亮度和四化）
    const majorStarsData: StarWithBrightness[] = majorStars.map(star => ({
      name: String(star.name),
      brightness: star.brightness ? String(star.brightness) : undefined,
      mutagen: star.mutagen ? String(star.mutagen) : undefined,
    }))

    // 提取辅星（六吉六煞等，含四化）
    const minorStarsData: StarWithBrightness[] = minorStars.map(star => ({
      name: String(star.name),
      mutagen: star.mutagen ? String(star.mutagen) : undefined,
    }))

    // 提取杂曜
    const adjectiveStarsData = adjectiveStars.map(star => String(star.name))

    // 大限年龄范围
    const decadalRange = decadal?.range ? `${decadal.range[0]}-${decadal.range[1]}` : undefined

    // 构建宫位数据
    const palaceData: PalaceData = {
      name: palaceName,
      stem: String(palace.heavenlyStem || ''),
      branch: String(palace.earthlyBranch || (palace as unknown as { branch?: string }).branch || ''),
      majorStars: majorStarsData,
      minorStars: minorStarsData,
      adjectiveStars: adjectiveStarsData,
      isBodyPalace: !!palace.isBodyPalace,
      decadalRange,
    }

    context.十二宫.push(palaceData)

    // 收集大限信息
    if (decadal?.range) {
      const stem = String(palace.heavenlyStem || '')
      // 根据大限天干计算大限四化
      const decadalMutagens = getDecadalMutagens(stem)

      context.大限.push({
        palaceName,
        ageRange: `${decadal.range[0]}-${decadal.range[1]}`,
        stem,
        mutagens: decadalMutagens,
      })
    }

    // 命宫主星
    if (palaceName === '命宫') {
      for (const star of majorStars) {
        const info = getStarInfo(String(star.name))
        if (info) context.命宫主星.push(info)
      }
    }

    // 身宫主星
    if (palace.isBodyPalace) {
      context.身宫位置 = palaceName
      for (const star of majorStars) {
        const info = getStarInfo(String(star.name))
        if (info) context.身宫主星.push(info)
      }
    }

    // 收集四化分布（主星 + 辅星）
    for (const star of majorStars) {
      for (const mutagen of getMutagenList(star.mutagen)) {
        const sihuaInfo = getSihuaInfo(mutagen)
        if (sihuaInfo) {
          context.四化分布.push({
            sihua: sihuaInfo,
            star: String(star.name),
            palace: palaceName,
          })
        }
      }
    }

    for (const star of minorStars) {
      for (const mutagen of getMutagenList(star.mutagen)) {
        const sihuaInfo = getSihuaInfo(mutagen)
        if (sihuaInfo) {
          context.四化分布.push({
            sihua: sihuaInfo,
            star: String(star.name),
            palace: palaceName,
          })
        }
      }
    }
  }

  // 按年龄排序大限
  context.大限.sort((a, b) => {
    const aStart = parseInt(a.ageRange.split('-')[0])
    const bStart = parseInt(b.ageRange.split('-')[0])
    return aStart - bStart
  })

  // 提取流年信息（基于出生年计算近15年）
  if (birthYear) {
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 10
    const endYear = currentYear + 5

    for (let year = startYear; year <= endYear; year++) {
      try {
        const horoscope = chart.horoscope(new Date(`${year}-6-15`))
        const yearly = horoscope.yearly
        const yearlyBranch = String(yearly.earthlyBranch || '')

        // 根据流年地支查找对应的宫位
        const yearlyPalace = palaces.find(p => String(p.earthlyBranch || (p as unknown as { branch?: string }).branch || '') === yearlyBranch)
        const palaceName = yearlyPalace ? normalizePalaceName(yearlyPalace.name) : ''

        context.流年.push({
          year,
          stem: String(yearly.heavenlyStem || ''),
          branch: yearlyBranch,
          mutagens: (yearly.mutagen || []).map(m => String(m)),
          palaceName,
        })
      } catch {
        // 忽略计算错误
      }
    }
  }

  return context
}

/* ------------------------------------------------------------
   根据天干获取四化星
   ------------------------------------------------------------ */

const STEM_SIHUA: Record<string, string[]> = {
  '甲': ['廉贞化禄', '破军化权', '武曲化科', '太阳化忌'],
  '乙': ['天机化禄', '天梁化权', '紫微化科', '太阴化忌'],
  '丙': ['天同化禄', '天机化权', '文昌化科', '廉贞化忌'],
  '丁': ['太阴化禄', '天同化权', '天机化科', '巨门化忌'],
  '戊': ['贪狼化禄', '太阴化权', '右弼化科', '天机化忌'],
  '己': ['武曲化禄', '贪狼化权', '天梁化科', '文曲化忌'],
  '庚': ['太阳化禄', '武曲化权', '太阴化科', '天同化忌'],
  '辛': ['巨门化禄', '太阳化权', '文曲化科', '文昌化忌'],
  '壬': ['天梁化禄', '紫微化权', '左辅化科', '武曲化忌'],
  '癸': ['破军化禄', '巨门化权', '太阴化科', '贪狼化忌'],
}

function getDecadalMutagens(stem: string): string[] {
  return STEM_SIHUA[stem] || []
}

/* 格局检测（未启用） */
/*
function detectPatterns(chart: FunctionalAstrolabe): string[] {
  const patterns: string[] = []
  const palaces = chart.palaces || []

  // 找命宫
  const lifePalace = palaces.find(p => p.name === '命宫')
  if (!lifePalace) return patterns

  const majorStarNames = (lifePalace.majorStars || []).map(s => s.name as string)

  // 紫府同宫
  if (majorStarNames.includes('紫微') && majorStarNames.includes('天府')) {
    patterns.push('紫府同宫：紫微与天府同在命宫，帝星与财库星同宫，富贵格局。')
  }

  // 紫杀同宫
  if (majorStarNames.includes('紫微') && majorStarNames.includes('七杀')) {
    patterns.push('紫杀同宫：紫微与七杀同宫，权威与冲劲结合，有开创能力。')
  }

  // 机月同梁
  const hasJiyue = majorStarNames.includes('天机') || majorStarNames.includes('太阴')
  const hasTongliang = majorStarNames.includes('天同') || majorStarNames.includes('天梁')
  if (hasJiyue && hasTongliang) {
    patterns.push('机月同梁：文星组合，适合公职、文教、服务类工作。')
  }

  // 空宫
  if (majorStarNames.length === 0) {
    patterns.push('命宫无主星：需借对宫星曜论断，人生较多变化。')
  }

  // 检查化忌入命
  for (const star of lifePalace.majorStars || []) {
    if (String(star.mutagen) === '化忌') {
      patterns.push(`${star.name}化忌入命：需特别关注该星所主事项，有执着与困扰。`)
    }
  }

  return patterns
}
*/

/* 辅助：格式化极性标记 */
function formatPolarityMarker(starName: unknown): string {
  const { 男女星, 陰陽 } = getStarPolarityInfo(starName)
  return [男女星, 陰陽].filter(Boolean).join('/')
}

/* 辅助：格式化条件标签 */
function formatTags(...items: (string | boolean)[]): string {
  const tags = items.filter(item => typeof item === 'string' && item)
  return tags.length > 0 ? `【${tags.join(' / ')}】` : ''
}

/* 辅助：包装括号内容 */
function wrapContent(content: string): string {
  return content ? `（${content}）` : ''
}

/* 辅助：条件行追加 */
function addIfExists(lines: string[], label: string, content: string): void {
  if (content) lines.push(`  ${label}：${content}`)
}

/* 辅助：生成大限表项 */
function formatDecadalEntry(d: DecadalData): string[] {
  return [
    `### ${d.ageRange}歲：${d.palaceName}`,
    `- 大限天干：${d.stem}`,
    `- 大限四化：${d.mutagens.join('、')}`,
  ]
}

/* 生成 AI 提示词上下文 */
export function buildPromptContext(context: KnowledgeContext, language: Language = 'zh-TW'): string {
  const lines: string[] = ['【命盘完整信息】', '']

  // 命宫主星
  if (context.命宫主星.length > 0) {
    lines.push('## 命宫主星')
    context.命宫主星.forEach(star => 
      lines.push(`- ${star.name}（${star.group}）：${star.description}`)
    )
    lines.push('')
  }

  // 身宫信息
  if (context.身宫位置) {
    lines.push('## 身宫位置', `- 身宫在${context.身宫位置}`)
    context.身宫主星.forEach(star => 
      lines.push(`- ${star.name}：${star.description}`)
    )
    lines.push('')
  }

  // 完整十二宫信息
  lines.push('## 北派四化座標', '（以宮干、地支、生年四化、離心/向心自化、我宮/他宮為主）', '')

  const palaceByBranch = new Map(context.十二宫.map(p => [p.branch, p]))

  for (const palace of context.十二宫) {
    const oppositePalace = palace.branch ? palaceByBranch.get(OPPOSITE_BRANCH_MAP[palace.branch]) : undefined
    const { self, counter } = collectPalaceMutagenHighlights(
      palace as unknown as Record<string, unknown>,
      oppositePalace as unknown as Record<string, unknown> | undefined,
    )

    const majorStarsStr = palace.majorStars.length > 0
      ? palace.majorStars.map(s => {
          const name = normalizeStarName(s.name)
          const mutagens = getMutagenList(s.mutagen)
          const mutagenStr = mutagens.length > 0 ? `[${mutagens.join('、')}]` : ''
          return `${name}${mutagenStr}`
        }).join('、')
      : t('ai.context.noMajorStars', language)

    const genderMarkers = palace.majorStars
      .map(s => normalizeStarName(s.name))
      .filter(Boolean)
      .join('、')

    const tags = formatTags(getPalaceRole(normalizePalaceName(palace.name)), palace.isBodyPalace && '身宮')
    lines.push(`- ${normalizePalaceName(palace.name)}${tags}：${palace.stem}${palace.branch}`)
    lines.push(`  主星：${majorStarsStr}`)
    addIfExists(lines, '男女星', genderMarkers)
    
    // Format self and counter mutagens (可能是字符串或对象)
    const selfStr = self
      .map(item => typeof item === 'string' ? item : `${item.星曜}${item.四化}`)
      .join('、')
    const counterStr = counter
      .map(item => typeof item === 'string' ? item : `${item.星曜}${item.四化}`)
      .join('、')
    
    addIfExists(lines, '離心自化', selfStr)
    addIfExists(lines, '向心自化', counterStr)
  }

  lines.push('')

  // 生年四化
  if (context.四化分布.length > 0) {
    lines.push('## 生年四化')
    context.四化分布.forEach(item => {
      const normalizedStar = normalizeStarName(item.star)
      const normalizedPalace = normalizePalaceName(item.palace)
      const marker = formatPolarityMarker(normalizedStar)
      const role = getPalaceRole(normalizedPalace)
      const roleTag = role ? `【${role}】` : ''
      lines.push(`- ${normalizedStar}${item.sihua.name} → ${normalizedPalace}${roleTag}${wrapContent(marker)}`)
    })
    lines.push('')
  }

  // 大限信息
  if (context.大限.length > 0) {
    lines.push('## 十二大限', '（每个大限10年，按宫位天干飞化）', '')
    context.大限.forEach(d => {
      lines.push(...formatDecadalEntry(d), '')
    })
  }

  return lines.join('\n')
}

/* ------------------------------------------------------------
   导出知识库模块
   ------------------------------------------------------------ */

export * from './stars/majorStars'
export * from './palaces'
export * from './sihua'
