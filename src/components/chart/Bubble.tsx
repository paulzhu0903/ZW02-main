/* ============================================================
   宮位 AI 氣泡提示組件
   點擊命盤宮位後，以浮動氣泡呼叫 AI 作精簡解讀
   支援本命 / 大限 / 流年 三種解讀模式
   ============================================================ */

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSettingsStore } from '@/stores'
import { SIHUA_BY_GAN, SIHUA_BY_GAN_TRADITIONAL } from '@/knowledge/sihua'
import { localizeChineseText } from '@/lib/localize-knowledge'
import { normalizeStarName as normalizeStarNameShared } from '@/lib/star-name'
import { OPPOSITE_PALACE, PALACE_NAME_TO_ENGLISH_MAP, DECADAL_PALACE_MAP, ANNUAL_PALACE_MAP, MONTHLY_PALACE_MAP, NATAL_PALACE_MAP } from './types'
import { PALACE_CLOCKWISE_BRANCHES, DECADAL_LABELS, ANNUAL_LABELS, MONTHLY_LABELS } from './utils/types'
import { getSanFangSiZhengBranches } from './utils/chartHelpers'
import type { PalaceData } from './types'

export type TabType = 'natal' | 'decadal' | 'annual' | 'monthly'
type ChartType = 'flying' | 'trireme' | 'transformation'

function displayPalaceName(name: string): string {
  return name
    .replace('奴仆', '交友')
    .replace('奴僕', '交友')
    .replace('仆役', '交友')
    .replace('僕役', '交友')
}

function mutagenToABCD(mutagenKey: string): string {
  if (mutagenKey.includes('祿') || mutagenKey.includes('禄')) return 'A'
  if (mutagenKey.includes('權') || mutagenKey.includes('权')) return 'B'
  if (mutagenKey.includes('科')) return 'C'
  if (mutagenKey.includes('忌')) return 'D'
  return '?'
}

export interface PalaceHintBubbleProps {
  palace: PalaceData
  allPalaces: PalaceData[]
  anchorRect: DOMRect
  onClose: () => void
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  chartType?: ChartType
  /** 此宮位在當前大限的角色標籤，例如「大命」「大財」 */
  decadalLabel?: string
  /** 此宮位在當前流年的角色標籤，例如「年命」「年財」 */
  annualLabel?: string
  /** 大限該角色宮位天干 */
  decadalStem?: string | null
  /** 流年該角色宮位天干 */
  annualStem?: string | null
  /** 流年干支，例如「甲子」 */
  annualGanZhi?: string | null
  /** 生年天干 */
  birthYearStem?: string | null
  /** 大限標籤映射（palace name -> 大限標籤） */
  decadalLabelsByPalaceName?: Record<string, string>
  /** 流年標籤映射（palace name -> 流年標籤），用於流年 tab 顯示忌入宮位 */
  annualLabelsByPalaceName?: Record<string, string>
  /** 此宮位在當前流月的角色標籤，例如「月命」「月財」 */
  monthlyLabel?: string
  /** 流月該角色宮位天干 */
  monthlyStem?: string | null
  /** 流月標籤映射（palace name -> 流月標籤） */
  monthlyLabelsByPalaceName?: Record<string, string>
}

export function PalaceHintBubble({
  palace, allPalaces, anchorRect, onClose, activeTab, onTabChange,
  chartType = 'trireme',
  decadalLabel, annualLabel,
  decadalStem, annualStem, annualGanZhi, birthYearStem,
  decadalLabelsByPalaceName = {},
  annualLabelsByPalaceName = {},
  monthlyLabel, monthlyStem, monthlyLabelsByPalaceName = {},
}: PalaceHintBubbleProps) {
  const { language } = useSettingsStore()
  const displayName = displayPalaceName(palace.name)
  const localizedDisplayName = localizeChineseText(displayName, language)
  const localizeVisibleText = (text: string) => localizeChineseText(text, language)

  const hasDecadal = !!decadalStem
  const hasAnnual  = !!annualStem && !!annualGanZhi
  const hasMonthly = !!monthlyStem && !!monthlyLabel

  const bubbleRef = useRef<HTMLDivElement>(null)
  const palaceEnglishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
  const natalTabLabel = NATAL_PALACE_MAP[palaceEnglishKey] || localizedDisplayName

  // 定位邏輯：優先貼齊大限／流年表格上方；抓不到時退回既有邏輯
  const margin = 8
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  const centerInfoEl = document.querySelector('[data-centerinfo]') as HTMLElement | null
  const palaceGridEl = document.querySelector('[data-palace-grid]') as HTMLElement | null
  const palaceGridRect = palaceGridEl?.getBoundingClientRect() || null
  const decadalAnnualTableEl = document.querySelector('[data-decadal-annual-table]') as HTMLElement | null
  const decadalAnnualTableRect = decadalAnnualTableEl?.getBoundingClientRect() || null
  const centerInfoRect = centerInfoEl?.getBoundingClientRect() || null
  const centerInfoRadius = centerInfoEl
    ? window.getComputedStyle(centerInfoEl).borderRadius || '2px'
    : '2px'

  const maxBubbleWidth = viewW - margin * 2
  const BUBBLE_W = palaceGridRect
    ? Math.round(Math.min(palaceGridRect.width, maxBubbleWidth))
    : decadalAnnualTableRect
      ? Math.round(Math.min(Math.max(decadalAnnualTableRect.width, 460), maxBubbleWidth))
    : centerInfoRect
      ? Math.round(Math.min(centerInfoRect.width + 120, maxBubbleWidth))
      : Math.round(Math.min(460, maxBubbleWidth))
  const BUBBLE_H = centerInfoRect ? Math.round(centerInfoRect.height) : 400

  let left = palaceGridRect
    ? palaceGridRect.left + (palaceGridRect.width - BUBBLE_W) / 2
    : decadalAnnualTableRect
      ? decadalAnnualTableRect.left + (decadalAnnualTableRect.width - BUBBLE_W) / 2
    : centerInfoRect
      ? centerInfoRect.left
      : anchorRect.right + margin
  let top = decadalAnnualTableRect
    ? (palaceGridRect ? palaceGridRect.bottom + 12 : decadalAnnualTableRect.top + 12)
    : centerInfoRect
      ? centerInfoRect.top
      : anchorRect.top


  if (!decadalAnnualTableRect && !centerInfoRect && left + BUBBLE_W > viewW - margin) {
    left = anchorRect.left - BUBBLE_W - margin
  }

  if (left < margin) left = margin
  // 動態計算最大高度，確保 modal 不會超過 palace grid 下方空間
  let maxModalHeight = viewH - top - margin
  if (maxModalHeight < 100) maxModalHeight = 100

  /* ----------------------------------------------------------
     本地解讀文字（AI 暫停模式）
     ---------------------------------------------------------- */
  const buildLocalText = useCallback((tab: TabType): string => {
    const isTW = language === 'zh-TW'
    const sihuaMap = isTW
      ? SIHUA_BY_GAN_TRADITIONAL
      : SIHUA_BY_GAN

    const palaceStarSet = new Set([
      ...palace.majorStars.map((s) => normalizeStarNameShared(s.name)),
      ...palace.minorStars.map((s) => normalizeStarNameShared(s.name)),
    ])

    const findPalaceByEnglishKey = (englishKey: string): PalaceData | undefined => {
      return allPalaces.find((p) => PALACE_NAME_TO_ENGLISH_MAP[p.name] === englishKey)
    }

    const findPalaceByStarName = (starName: string): PalaceData | undefined => {
      const target = normalizeStarNameShared(starName)
      return allPalaces.find((p) => {
        const allStars = [...p.majorStars, ...p.minorStars]
        return allStars.some((s) => normalizeStarNameShared(s.name) === target)
      })
    }

    const getTrineBranches = (baseBranch: string): [string, string] | null => {
      const { sanFang } = getSanFangSiZhengBranches(baseBranch)
      if (sanFang.length >= 3) return [sanFang[1], sanFang[2]]
      return null
    }

    const getOneSixBranch = (baseBranch: string): string | null => {
      const baseIdx = PALACE_CLOCKWISE_BRANCHES.indexOf(baseBranch as typeof PALACE_CLOCKWISE_BRANCHES[number])
      if (baseIdx < 0) return null
      // 一六共宗位：以選定宮為 1，對宮為 7，再順數 +1，即 base +7
      return PALACE_CLOCKWISE_BRANCHES[(baseIdx + 7) % 12]
    }

    // --- 字串樣板輔助函數區 ---
    const buildHitAlertLine = (sourceLabel: string, targetLabel: string): string => {
      return isTW
        ? `${localizeVisibleText(sourceLabel)}沖${localizeVisibleText(targetLabel)}`
        : `${localizeVisibleText(sourceLabel)}冲${localizeVisibleText(targetLabel)}`
    }

    const formatMissingStar = (label: string, star: string) => {
      const lbl = localizeVisibleText(label)
      const st = localizeVisibleText(star)
      return isTW
        ? `對宮沖判定：${lbl}化忌星（${st}）未在盤面定位。`
        : `对宫冲判定：${lbl}化忌星（${st}）未在盘面定位。`
    }

    const formatLine1 = (hits: string[]) => {
      if (hits.length > 0) {
        const hitStr = hits.join('、')
        return isTW
          ? `1. 生年四化是否落本宮：有（${hitStr}）`
          : `1. 生年四化是否落本宫：有（${hitStr}）`
      }
      return isTW ? '1. 生年四化是否落本宮：無。' : '1. 生年四化是否落本宫：无。'
    }

    const formatLine2 = (isHit: boolean, source: string, target: string, opposite: string) => {
      const src = localizeVisibleText(source)
      const tgt = localizeVisibleText(target)
      const opp = localizeVisibleText(opposite)
      return isHit
        ? (isTW ? `2. 沖同類宮職：是。${src}忌入${tgt}，沖${opp}。` : `2. 冲同类宫职：是。${src}忌入${tgt}，冲${opp}。`)
        : (isTW ? `2. 沖同類宮職：未命中。${src}忌入${tgt}，未沖${opp}。` : `2. 冲同类宫职：未命中。${src}忌入${tgt}，未冲${opp}。`)
    }

    const formatLine3 = (isHit: boolean, source: string, target: string, trines: string) => {
      const src = localizeVisibleText(source)
      const tgt = localizeVisibleText(target)
      const tri = localizeVisibleText(trines)
      return isHit
        ? (isTW ? `3. 忌入三合位：是。${src}忌入${tgt}（${tri}）。` : `3. 忌入三合位：是。${src}忌入${tgt}（${tri}）。`)
        : (isTW ? `3. 忌入三合位：未命中。${src}忌入${tgt}，三合位為${tri}。` : `3. 忌入三合位：未命中。${src}忌入${tgt}，三合位为${tri}。`)
    }

    const formatLine4 = (isHit: boolean, source: string, target: string, oneSixName: string) => {
      const src = localizeVisibleText(source)
      const tgt = localizeVisibleText(target)
      const os = localizeVisibleText(oneSixName)
      return isHit
        ? (isTW ? `4. 忌入一六共宗位：是。${src}忌入${os}。` : `4. 忌入一六共宗位：是。${src}忌入${os}。`)
        : (isTW ? `4. 忌入一六共宗位：未命中。${src}忌入${tgt}，一六共宗位為${os}。` : `4. 忌入一六共宗位：未命中。${src}忌入${tgt}，一六共宗位为${os}。`)
    }
    // --- 輔助函數區結束 ---

    const buildBirthMutagenCheck = (): string => {
      if (!birthYearStem) {
        return isTW ? '1. 生年四化是否落本宮：資料不足。' : '1. 生年四化是否落本宫：资料不足。'
      }

      const sihua = sihuaMap[birthYearStem] ?? {}
      const hits = Object.entries(sihua)
        .filter(([, starName]) => palaceStarSet.has(normalizeStarNameShared(starName)))
        .map(([mutagenKey, starName]) => `${mutagenToABCD(mutagenKey)}:${localizeVisibleText(starName)}`)

      return formatLine1(hits)
    }

    const buildDecadalOppositeCheck = (): string => {
      if (!decadalStem || !decadalLabel) return ''
      const sameTypeNatalLabel = `本${decadalLabel.slice(1)}`

      const sameTypeEnglish = Object.entries(DECADAL_PALACE_MAP).find(([, val]) => val === decadalLabel)?.[0]
      if (!sameTypeEnglish) return ''

      const natalSameTypePalace = findPalaceByEnglishKey(sameTypeEnglish)
      if (!natalSameTypePalace) return ''

      const oppositeBranch = OPPOSITE_PALACE[natalSameTypePalace.branch]
      if (!oppositeBranch) return ''

      const oppositePalace = allPalaces.find((p) => p.branch === oppositeBranch)
      const sihua = sihuaMap[decadalStem] ?? {}
      const jiStar = sihua['化忌']
      if (!jiStar) return ''

      const jiPalace = findPalaceByStarName(jiStar)
      // 驗證流年天干化忌所落宮位地支
      if (jiPalace) {
        console.log('[流年化忌落宮位]', jiPalace.name, '地支:', jiPalace.branch)
      }
      if (!jiPalace) {
        return formatMissingStar(decadalLabel, jiStar)
      }

      const isHitOpposite = jiPalace.branch === oppositeBranch
      const hitAlertLine = isHitOpposite ? buildHitAlertLine(decadalLabel, sameTypeNatalLabel) : ''

      // 取得本命標籤（沖同類宮職用）
      const natalLabel = jiPalace ? NATAL_PALACE_MAP[PALACE_NAME_TO_ENGLISH_MAP[jiPalace.name]] || displayPalaceName(jiPalace.name) : ''
      // 取得大限標籤（忌入三合位用）
      const jiPalaceEngKey = jiPalace ? PALACE_NAME_TO_ENGLISH_MAP[jiPalace.name] : ''
      const jiPalaceDecadalLabel = jiPalace && jiPalaceEngKey ? decadalLabelsByPalaceName[jiPalaceEngKey] || displayPalaceName(jiPalace.name) : ''
      
      const oppositeLine = formatLine2(isHitOpposite, decadalLabel, natalLabel, sameTypeNatalLabel)

      // 三合位以選定宮位的地支為基準
      const selectedDecadalBranch = palace.branch
      const trineBranches = getTrineBranches(selectedDecadalBranch)
      if (!trineBranches) return oppositeLine

      const getDecadalLabelByBranch = (branch: string) => {
        const p = allPalaces.find(p => p.branch === branch)
        if (!p) return `大${branch}`
        const engKey = PALACE_NAME_TO_ENGLISH_MAP[p.name]
        return decadalLabelsByPalaceName[engKey] || `大${branch}`
      }

      const isHitTrine = trineBranches.includes(jiPalace.branch)
      const trineDecadalNames = trineBranches.map((branch) => getDecadalLabelByBranch(branch)).join('、')

      const trineLine = formatLine3(isHitTrine, decadalLabel, jiPalaceDecadalLabel, trineDecadalNames)

      const oneSixBranch = getOneSixBranch(selectedDecadalBranch)
      // 一六共宗位標籤統一為大限標籤
      const oneSixName = oneSixBranch ? getDecadalLabelByBranch(oneSixBranch) : '—'
      const isHitOneSix = !!oneSixBranch && jiPalace.branch === oneSixBranch

      const oneSixLine = formatLine4(isHitOneSix, decadalLabel, jiPalaceDecadalLabel, oneSixName)

      return [hitAlertLine, oppositeLine, trineLine, oneSixLine].filter(Boolean).join('\n')
    }

    const buildAnnualOppositeCheck = (): string => {
      if (!annualStem || !annualLabel) return ''

      const sameTypeEnglish = Object.entries(ANNUAL_PALACE_MAP).find(([, val]) => val === annualLabel)?.[0]
      if (!sameTypeEnglish) return ''

      const expectedDecadalLabel = `大${annualLabel.slice(1)}`
      const decadalSameTypeEnglish = Object.entries(decadalLabelsByPalaceName).find(([, label]) => label === expectedDecadalLabel)?.[0]
      const decadalSameTypePalace = decadalSameTypeEnglish
        ? findPalaceByEnglishKey(decadalSameTypeEnglish)
        : findPalaceByEnglishKey(sameTypeEnglish)

      if (!decadalSameTypePalace) return ''

      const oppositeBranch = OPPOSITE_PALACE[decadalSameTypePalace.branch]
      if (!oppositeBranch) return ''

      const oppositePalace = allPalaces.find((p) => p.branch === oppositeBranch)
      const sihua = sihuaMap[annualStem] ?? {}
      const jiStar = sihua['化忌']
      if (!jiStar) return ''

      const jiPalace = findPalaceByStarName(jiStar)
      if (!jiPalace) {
        return formatMissingStar(annualLabel, jiStar)
      }

      const isHitOpposite = jiPalace.branch === oppositeBranch
      const hitAlertLine = isHitOpposite ? buildHitAlertLine(annualLabel, expectedDecadalLabel) : ''

      // 沖同類宮職：忌入以大限標籤為主
      const jiPalaceEngKey = jiPalace ? PALACE_NAME_TO_ENGLISH_MAP[jiPalace.name] : ''
      const jiPalaceDecadalLabel = jiPalace && jiPalaceEngKey ? decadalLabelsByPalaceName[jiPalaceEngKey] || displayPalaceName(jiPalace.name) : ''
      
      const oppositeLine = formatLine2(isHitOpposite, annualLabel, jiPalaceDecadalLabel, expectedDecadalLabel)

      // 三合位以選定宮位的地支為基準
      const selectedAnnualBranch = palace.branch
      const trineBranches = getTrineBranches(selectedAnnualBranch)
      if (!trineBranches) return oppositeLine

      const getAnnualLabelByBranch = (branch: string) => {
        const p = allPalaces.find(p => p.branch === branch)
        if (!p) return `年${branch}`
        const engKey = PALACE_NAME_TO_ENGLISH_MAP[p.name]
        return annualLabelsByPalaceName[engKey] || `年${branch}`
      }

      const isHitTrine = trineBranches.includes(jiPalace.branch)
      const trineAnnualNames = trineBranches.map((branch) => getAnnualLabelByBranch(branch)).join('、')
      
      // 忌入宮位名稱以 ANNUAL_LABELS 對應地支順序顯示
      const jiPalaceAnnualLabel = jiPalace ? getAnnualLabelByBranch(jiPalace.branch) : ''
      
      const trineLine = formatLine3(isHitTrine, annualLabel, jiPalaceAnnualLabel, trineAnnualNames)

      const oneSixBranch = getOneSixBranch(selectedAnnualBranch)
      // 一六共宗位標籤統一為流年標籤（如年福）
      const oneSixName = oneSixBranch ? getAnnualLabelByBranch(oneSixBranch) : '—'
      const isHitOneSix = !!oneSixBranch && jiPalace.branch === oneSixBranch

      const oneSixLine = formatLine4(isHitOneSix, annualLabel, jiPalaceAnnualLabel, oneSixName)

      return [hitAlertLine, oppositeLine, trineLine, oneSixLine].filter(Boolean).join('\n')
    }

    const buildMonthlyOppositeCheck = (): string => {
      if (!monthlyStem || !monthlyLabel) return ''

      const sameTypeEnglish = Object.entries(MONTHLY_PALACE_MAP).find(([, val]) => val === monthlyLabel)?.[0]
      if (!sameTypeEnglish) return ''

      const expectedAnnualLabel = `年${monthlyLabel.slice(1)}`
      const annualSameTypeEnglish = Object.entries(annualLabelsByPalaceName).find(([, label]) => label === expectedAnnualLabel)?.[0]
      const annualSameTypePalace = annualSameTypeEnglish
        ? findPalaceByEnglishKey(annualSameTypeEnglish)
        : findPalaceByEnglishKey(sameTypeEnglish)

      if (!annualSameTypePalace) return ''

      const oppositeBranch = OPPOSITE_PALACE[annualSameTypePalace.branch]
      if (!oppositeBranch) return ''

      const oppositePalace = allPalaces.find((p) => p.branch === oppositeBranch)
      const sihua = sihuaMap[monthlyStem] ?? {}
      const jiStar = sihua['化忌']
      if (!jiStar) return ''

      const jiPalace = findPalaceByStarName(jiStar)
      if (!jiPalace) {
        return formatMissingStar(monthlyLabel, jiStar)
      }

      const isHitOpposite = jiPalace.branch === oppositeBranch
      const hitAlertLine = isHitOpposite ? buildHitAlertLine(monthlyLabel, expectedAnnualLabel) : ''

      // 沖同類宮職：忌入優先以流年標籤為主，如果沒有則使用大限或原宮名
      const jiPalaceEngKey = jiPalace ? PALACE_NAME_TO_ENGLISH_MAP[jiPalace.name] : ''
      const jiPalaceAnnualLabel = jiPalace && jiPalaceEngKey ? annualLabelsByPalaceName[jiPalaceEngKey] || decadalLabelsByPalaceName[jiPalaceEngKey] || displayPalaceName(jiPalace.name) : ''
      
      const oppositeLine = formatLine2(isHitOpposite, monthlyLabel, jiPalaceAnnualLabel, expectedAnnualLabel)

      const selectedMonthlyBranch = palace.branch
      const trineBranches = getTrineBranches(selectedMonthlyBranch)
      if (!trineBranches) return oppositeLine

      const getMonthlyLabelByBranch = (branch: string) => {
        const p = allPalaces.find(p => p.branch === branch)
        if (!p) return `月${branch}`
        const engKey = PALACE_NAME_TO_ENGLISH_MAP[p.name]
        return monthlyLabelsByPalaceName[engKey] || `月${branch}`
      }

      const isHitTrine = trineBranches.includes(jiPalace.branch)
      const trineMonthlyNames = trineBranches.map((branch) => getMonthlyLabelByBranch(branch)).join('、')
      const jiPalaceMonthlyLabel = jiPalace ? getMonthlyLabelByBranch(jiPalace.branch) : ''
      
      const trineLine = formatLine3(isHitTrine, monthlyLabel, jiPalaceMonthlyLabel, trineMonthlyNames)

      const oneSixBranch = getOneSixBranch(selectedMonthlyBranch)
      // 一六共宗位標籤統一為流月標籤
      const oneSixName = oneSixBranch ? getMonthlyLabelByBranch(oneSixBranch) : '—'
      const isHitOneSix = !!oneSixBranch && jiPalace.branch === oneSixBranch

      const oneSixLine = formatLine4(isHitOneSix, monthlyLabel, jiPalaceMonthlyLabel, oneSixName)

      return [hitAlertLine, oppositeLine, trineLine, oneSixLine].filter(Boolean).join('\n')
    }

    const buildNatalSummary = (): string => {
      return buildBirthMutagenCheck()
    }

    const buildDecadalSummary = (): string => {
      return buildDecadalOppositeCheck()
    }

    const buildAnnualSummary = (): string => {
      return buildAnnualOppositeCheck()
    }

    if (tab === 'natal') {
      return buildNatalSummary()
    }

    if (tab === 'decadal' && decadalStem) {
      return buildDecadalSummary()
    }

    if (tab === 'annual' && annualStem && annualGanZhi) {
      return buildAnnualSummary()
    }

    if (tab === 'monthly' && monthlyStem) {
      return buildMonthlyOppositeCheck()
    }

    // fallback
    return isTW
      ? '目前資料不足，請先選擇對應的大限或流年。'
      : '目前资料不足，请先选择对应的大限或流年。'
  }, [palace, allPalaces, decadalLabel, annualLabel, monthlyLabel, decadalStem, annualStem, monthlyStem, annualGanZhi, birthYearStem, decadalLabelsByPalaceName, annualLabelsByPalaceName, monthlyLabelsByPalaceName, language])

  const displayText = buildLocalText(activeTab)
  const textLines = displayText.split('\n')
  const isHitAlertLine = (line: string) => {
    return /^[本大小年月][^\s]*[沖冲][本大小年月][^\s]*$/.test(line)
  }

  useEffect(() => {
    if (activeTab === 'monthly' && !hasMonthly) {
      onTabChange(hasAnnual ? 'annual' : hasDecadal ? 'decadal' : 'natal')
      return
    }
    if (activeTab === 'annual' && !hasAnnual) {
      onTabChange(hasDecadal ? 'decadal' : 'natal')
      return
    }
    if (activeTab === 'decadal' && !hasDecadal) {
      onTabChange('natal')
    }
  }, [activeTab, hasMonthly, hasAnnual, hasDecadal, onTabChange])

  // 切換 tab 時：若已有快取直接顯示，否則觸發 AI
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return
    onTabChange(tab)
  }

  // 移除點擊外部自動關閉，僅 close button 關閉

  /* ----------------------------------------------------------
     Tab 設定
     ---------------------------------------------------------- */
  const tabs: { key: TabType; label: string; sub: string; disabled: boolean; activeColor: string }[] = [
    {
      key: 'natal',
      label: localizeVisibleText(natalTabLabel),
      sub: '',
      disabled: false,
      activeColor: 'bg-misfortune text-white',
    },
    {
      key: 'decadal',
      label: decadalLabel ? localizeVisibleText(decadalLabel) : '—',
      sub: '',
      disabled: !hasDecadal,
      activeColor: 'bg-fortune text-white',
    },
    {
      key: 'annual',
      label: annualLabel ? localizeVisibleText(annualLabel) : '—',
      sub: '',
      disabled: !hasAnnual,
      activeColor: 'bg-star text-white',
    },
    {
      key: 'monthly',
      label: monthlyLabel ? localizeVisibleText(monthlyLabel) : '—',
      sub: '',
      disabled: !hasMonthly,
      activeColor: 'bg-indigo-500 text-white', // 針對流月使用靛藍色標籤
    },
  ]

  return createPortal(
    <div
      ref={bubbleRef}
      style={{ position: 'fixed', left, top, width: BUBBLE_W, zIndex: 50, pointerEvents: 'auto', borderRadius: '18px' }}
      className="glass relative overflow-visible shadow-2xl rounded-2xl"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.06] bg-white/30">
        <div className="flex flex-1 rounded-xl bg-black/[0.04] overflow-hidden">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.key)}
              className={`
                flex-1 py-1 px-1 text-center transition-all duration-150
                ${tab.disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : isActive
                    ? `${tab.activeColor} shadow-sm`
                    : 'text-text-muted hover:text-text hover:bg-black/5'
                }
              `}
            >
              <div className="text-[10px] font-semibold leading-tight">{tab.label}</div>
            </button>
          )
        })}
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 z-10 w-5 h-5 rounded-full bg-black/80 text-white hover:bg-black shadow-md transition-colors flex items-center justify-center text-[12px] leading-none"
        aria-label={language === 'zh-TW' ? '關閉' : '关闭'}
      >
        ×
      </button>

      {/* 解讀內容（AI 暫停） */}
      <div
        className="px-3 py-2.5 min-h-[80px] overflow-y-auto text-xs leading-relaxed text-text-secondary"
        style={{ maxHeight: maxModalHeight }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {textLines.map((line, idx) => (
            <div
              key={`${line}-${idx}`}
              className={isHitAlertLine(line) ? 'text-misfortune font-semibold' : ''}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
