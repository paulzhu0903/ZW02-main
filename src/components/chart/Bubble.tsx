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
import { OPPOSITE_PALACE, PALACE_NAME_TO_ENGLISH_MAP } from './types'
import { PALACE_CLOCKWISE_BRANCHES } from './utils/chartConstants'
import type { PalaceData } from './types'

export type TabType = 'natal' | 'decadal' | 'annual'
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
  /** 大限標籤映射（english key -> 大限標籤） */
  decadalLabelsByPalaceName?: Record<string, string>
}

export function PalaceHintBubble({
  palace, allPalaces, anchorRect, onClose, activeTab, onTabChange,
  chartType = 'trireme',
  decadalLabel, annualLabel,
  decadalStem, annualStem, annualGanZhi, birthYearStem,
  decadalLabelsByPalaceName = {},
}: PalaceHintBubbleProps) {
  const { language } = useSettingsStore()
  const displayName = displayPalaceName(palace.name)
  const localizedDisplayName = localizeChineseText(displayName, language)
  const localizeVisibleText = (text: string) => localizeChineseText(text, language)

  const hasDecadal = !!decadalStem
  const hasAnnual  = !!annualStem && !!annualGanZhi
  const aiPaused = true

  const DECADAL_LABEL_TO_ENGLISH: Record<string, string> = {
    '大命': 'life', '大父': 'parents', '大福': 'virtue', '大田': 'property',
    '大官': 'career', '大友': 'servants', '大遷': 'travel', '大疾': 'health',
    '大財': 'wealth', '大子': 'children', '大夫': 'spouse', '大兄': 'siblings',
  }

  const NATAL_LABEL_BY_ENGLISH: Record<string, string> = {
    'life': '本命',
    'parents': '本父',
    'virtue': '本福',
    'property': '本田',
    'career': '本官',
    'servants': '本友',
    'travel': '本遷',
    'health': '本疾',
    'wealth': '本財',
    'children': '本子',
    'spouse': '本夫',
    'siblings': '本兄',
  }

  const ANNUAL_LABEL_TO_ENGLISH: Record<string, string> = {
    '年命': 'life', '年父': 'parents', '年福': 'virtue', '年田': 'property',
    '年官': 'career', '年友': 'servants', '年遷': 'travel', '年疾': 'health',
    '年財': 'wealth', '年子': 'children', '年夫': 'spouse', '年兄': 'siblings',
  }

  const bubbleRef = useRef<HTMLDivElement>(null)
  const palaceEnglishKey = PALACE_NAME_TO_ENGLISH_MAP[palace.name] || ''
  const natalTabLabel = NATAL_LABEL_BY_ENGLISH[palaceEnglishKey] || localizedDisplayName

  // 定位邏輯：預設與中宮一致；抓不到中宮時退回 anchor 附近
  const margin = 8
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  const centerInfoEl = document.querySelector('[data-centerinfo]') as HTMLElement | null
  const centerInfoRect = centerInfoEl?.getBoundingClientRect() || null
  const centerInfoRadius = centerInfoEl
    ? window.getComputedStyle(centerInfoEl).borderRadius || '2px'
    : '2px'

  const BUBBLE_W = centerInfoRect ? Math.round(centerInfoRect.width) : 320
  const BUBBLE_H = centerInfoRect ? Math.round(centerInfoRect.height) : 400

  let left = centerInfoRect ? centerInfoRect.left : anchorRect.right + margin
  let top = centerInfoRect ? centerInfoRect.top : anchorRect.top

  if (!centerInfoRect && left + BUBBLE_W > viewW - margin) {
    left = anchorRect.left - BUBBLE_W - margin
  }

  if (left < margin) left = margin
  if (top + BUBBLE_H > viewH - margin) top = viewH - BUBBLE_H - margin
  if (top < margin) top = margin

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
      const baseIdx = PALACE_CLOCKWISE_BRANCHES.indexOf(baseBranch as typeof PALACE_CLOCKWISE_BRANCHES[number])
      if (baseIdx < 0) return null
      const plus4 = PALACE_CLOCKWISE_BRANCHES[(baseIdx + 4) % 12]
      const minus4 = PALACE_CLOCKWISE_BRANCHES[(baseIdx + 8) % 12]
      return [plus4, minus4]
    }

    const getOneSixBranch = (baseBranch: string): string | null => {
      const baseIdx = PALACE_CLOCKWISE_BRANCHES.indexOf(baseBranch as typeof PALACE_CLOCKWISE_BRANCHES[number])
      if (baseIdx < 0) return null
      // 一六共宗位：以選定宮為 1，對宮為 7，再順數 +1，即 base +7
      return PALACE_CLOCKWISE_BRANCHES[(baseIdx + 7) % 12]
    }

    const buildHitAlertLine = (sourceLabel: string, targetLabel: string): string => {
      return `${localizeVisibleText(sourceLabel)}沖${localizeVisibleText(targetLabel)}`
    }

    const buildBirthMutagenCheck = (): string => {
      if (!birthYearStem) {
        return isTW ? '1. 生年四化是否落本宮：資料不足。' : '1. 生年四化是否落本宫：资料不足。'
      }

      const sihua = sihuaMap[birthYearStem] ?? {}
      const hits = Object.entries(sihua)
        .filter(([, starName]) => palaceStarSet.has(normalizeStarNameShared(starName)))
        .map(([mutagenKey, starName]) => `${mutagenToABCD(mutagenKey)}:${localizeVisibleText(starName)}`)

      return hits.length > 0
        ? (isTW
          ? `1. 生年四化是否落本宮：有（${hits.join('、')}）`
          : `1. 生年四化是否落本宫：有（${hits.join('、')}）`)
        : (isTW
          ? '1. 生年四化是否落本宮：無。'
          : '1. 生年四化是否落本宫：无。')
    }

    const buildDecadalOppositeCheck = (): string => {
      if (!decadalStem || !decadalLabel) return ''
      const sameTypeNatalLabel = `本${decadalLabel.slice(1)}`

      const sameTypeEnglish = DECADAL_LABEL_TO_ENGLISH[decadalLabel]
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
      if (!jiPalace) {
        return isTW
          ? `對宮沖判定：${localizeVisibleText(decadalLabel)}化忌星（${localizeVisibleText(jiStar)}）未在盤面定位。`
          : `对宫冲判定：${localizeVisibleText(decadalLabel)}化忌星（${localizeVisibleText(jiStar)}）未在盘面定位。`
      }

      const isHitOpposite = jiPalace.branch === oppositeBranch
      const oppositeName = displayPalaceName(oppositePalace?.name || oppositeBranch)
      const hitAlertLine = isHitOpposite ? buildHitAlertLine(decadalLabel, sameTypeNatalLabel) : ''

      const oppositeLine = isHitOpposite
        ? (isTW
          ? `2. 小沖大(沖同類宮位)：是。${localizeVisibleText(decadalLabel)}化忌入${localizeVisibleText(oppositeName)}，沖${localizeVisibleText(sameTypeNatalLabel)}同類宮。`
          : `2. 小冲大(冲同类宫位)：是。${localizeVisibleText(decadalLabel)}化忌入${localizeVisibleText(oppositeName)}，冲${localizeVisibleText(sameTypeNatalLabel)}同类宫。`)
        : (isTW
          ? `2. 小沖大(沖同類宮位)：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，未入${localizeVisibleText(sameTypeNatalLabel)}同類對宮（${localizeVisibleText(oppositeName)}）。`
          : `2. 小冲大(冲同类宫位)：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，未入${localizeVisibleText(sameTypeNatalLabel)}同类对宫（${localizeVisibleText(oppositeName)}）。`)

      const trineBranches = getTrineBranches(natalSameTypePalace.branch)
      if (!trineBranches) return oppositeLine

      const trinePalaces = trineBranches.map((branch) => allPalaces.find((p) => p.branch === branch))
      const trineNames = trinePalaces
        .map((p, idx) => localizeVisibleText(displayPalaceName(p?.name || trineBranches[idx])))
        .join('、')
      const isHitTrine = trineBranches.includes(jiPalace.branch)

      const trineLine = isHitTrine
        ? (isTW
          ? `3. 忌入三合位：是。${localizeVisibleText(decadalLabel)}化忌入${localizeVisibleText(displayPalaceName(jiPalace.name))}（${trineNames}）。`
          : `3. 忌入三合位：是。${localizeVisibleText(decadalLabel)}化忌入${localizeVisibleText(displayPalaceName(jiPalace.name))}（${trineNames}）。`)
        : (isTW
          ? `3. 忌入三合位：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，三合位為${trineNames}。`
          : `3. 忌入三合位：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，三合位为${trineNames}。`)

      const oneSixBranch = getOneSixBranch(natalSameTypePalace.branch)
      const oneSixPalace = oneSixBranch ? allPalaces.find((p) => p.branch === oneSixBranch) : null
      const oneSixName = localizeVisibleText(displayPalaceName(oneSixPalace?.name || oneSixBranch || '—'))
      const isHitOneSix = !!oneSixBranch && jiPalace.branch === oneSixBranch

      const oneSixLine = isHitOneSix
        ? (isTW
          ? `4. 忌入一六共宗位：是。${localizeVisibleText(decadalLabel)}化忌入${oneSixName}。`
          : `4. 忌入一六共宗位：是。${localizeVisibleText(decadalLabel)}化忌入${oneSixName}。`)
        : (isTW
          ? `4. 忌入一六共宗位：未命中。一六共宗位為${oneSixName}。`
          : `4. 忌入一六共宗位：未命中。一六共宗位为${oneSixName}。`)

      return [hitAlertLine, oppositeLine, trineLine, oneSixLine].filter(Boolean).join('\n')
    }

    const buildAnnualOppositeCheck = (): string => {
      if (!annualStem || !annualLabel) return ''

      const sameTypeEnglish = ANNUAL_LABEL_TO_ENGLISH[annualLabel]
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
        return isTW
          ? `對宮沖判定：${localizeVisibleText(annualLabel)}化忌星（${localizeVisibleText(jiStar)}）未在盤面定位。`
          : `对宫冲判定：${localizeVisibleText(annualLabel)}化忌星（${localizeVisibleText(jiStar)}）未在盘面定位。`
      }

      const isHitOpposite = jiPalace.branch === oppositeBranch
      const oppositeName = displayPalaceName(oppositePalace?.name || oppositeBranch)
      const hitAlertLine = isHitOpposite ? buildHitAlertLine(annualLabel, expectedDecadalLabel) : ''

      const oppositeLine = isHitOpposite
        ? (isTW
          ? `2. 小沖大(沖同類宮位)：是。${localizeVisibleText(annualLabel)}化忌入${localizeVisibleText(oppositeName)}，沖${localizeVisibleText(expectedDecadalLabel)}同類宮。`
          : `2. 小冲大(冲同类宫位)：是。${localizeVisibleText(annualLabel)}化忌入${localizeVisibleText(oppositeName)}，冲${localizeVisibleText(expectedDecadalLabel)}同类宫。`)
        : (isTW
          ? `2. 小沖大(沖同類宮位)：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，未入${localizeVisibleText(expectedDecadalLabel)}同類對宮（${localizeVisibleText(oppositeName)}）。`
          : `2. 小冲大(冲同类宫位)：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，未入${localizeVisibleText(expectedDecadalLabel)}同类对宫（${localizeVisibleText(oppositeName)}）。`)

      const trineBranches = getTrineBranches(decadalSameTypePalace.branch)
      if (!trineBranches) return oppositeLine

      const trinePalaces = trineBranches.map((branch) => allPalaces.find((p) => p.branch === branch))
      const trineNames = trinePalaces
        .map((p, idx) => localizeVisibleText(displayPalaceName(p?.name || trineBranches[idx])))
        .join('、')
      const isHitTrine = trineBranches.includes(jiPalace.branch)

      const trineLine = isHitTrine
        ? (isTW
          ? `3. 忌入三合位：是。${localizeVisibleText(annualLabel)}化忌入${localizeVisibleText(displayPalaceName(jiPalace.name))}（${trineNames}）。`
          : `3. 忌入三合位：是。${localizeVisibleText(annualLabel)}化忌入${localizeVisibleText(displayPalaceName(jiPalace.name))}（${trineNames}）。`)
        : (isTW
          ? `3. 忌入三合位：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，三合位為${trineNames}。`
          : `3. 忌入三合位：未命中。化忌落${localizeVisibleText(displayPalaceName(jiPalace.name))}，三合位为${trineNames}。`)

      const oneSixBranch = getOneSixBranch(decadalSameTypePalace.branch)
      const oneSixPalace = oneSixBranch ? allPalaces.find((p) => p.branch === oneSixBranch) : null
      const oneSixName = localizeVisibleText(displayPalaceName(oneSixPalace?.name || oneSixBranch || '—'))
      const isHitOneSix = !!oneSixBranch && jiPalace.branch === oneSixBranch

      const oneSixLine = isHitOneSix
        ? (isTW
          ? `4. 忌入一六共宗位：是。${localizeVisibleText(annualLabel)}化忌入${oneSixName}。`
          : `4. 忌入一六共宗位：是。${localizeVisibleText(annualLabel)}化忌入${oneSixName}。`)
        : (isTW
          ? `4. 忌入一六共宗位：未命中。一六共宗位為${oneSixName}。`
          : `4. 忌入一六共宗位：未命中。一六共宗位为${oneSixName}。`)

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

    // fallback
    return isTW
      ? '目前資料不足，請先選擇對應的大限或流年。'
      : '目前资料不足，请先选择对应的大限或流年。'
  }, [palace, allPalaces, decadalLabel, annualLabel, decadalStem, annualStem, annualGanZhi, birthYearStem, decadalLabelsByPalaceName, language])

  const displayText = buildLocalText(activeTab)
  const textLines = displayText.split('\n')
  const isHitAlertLine = (line: string) => {
    return /^[本大小年][^\s]*沖[本大小年][^\s]*$/.test(line)
  }

  useEffect(() => {
    if (activeTab === 'annual' && !hasAnnual) {
      onTabChange(hasDecadal ? 'decadal' : 'natal')
      return
    }
    if (activeTab === 'decadal' && !hasDecadal) {
      onTabChange('natal')
    }
  }, [activeTab, hasAnnual, hasDecadal, onTabChange])

  // 切換 tab 時：若已有快取直接顯示，否則觸發 AI
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return
    onTabChange(tab)
  }

  // 點擊氣泡外部關閉
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

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
  ]

  return createPortal(
    <div
      ref={bubbleRef}
      style={{ position: 'fixed', left, top, width: BUBBLE_W, zIndex: 9999, pointerEvents: 'auto', borderRadius: centerInfoRadius }}
      className="glass overflow-hidden"
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
                flex-1 py-2 px-1 text-center transition-all duration-150
                ${tab.disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : isActive
                    ? `${tab.activeColor} shadow-sm`
                    : 'text-text-muted hover:text-text hover:bg-black/5'
                }
              `}
            >
              <div className="text-[11px] font-semibold leading-tight">{tab.label}</div>
            </button>
          )
        })}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-base leading-none hover:bg-slate-700 transition-colors"
          aria-label={language === 'zh-TW' ? '關閉' : '关闭'}
        >
          ×
        </button>
      </div>

      {/* 解讀內容（AI 暫停） */}
      <div className="px-3 py-2.5 min-h-[120px] max-h-[220px] overflow-y-auto text-xs leading-relaxed text-text-secondary">
        {aiPaused && (
          <div className="mb-2 text-[10px] text-misfortune bg-misfortune/10 border border-misfortune/20 rounded px-2 py-1">
            {language === 'zh-TW' ? 'AI 連線已暫停（節省流量模式）' : 'AI 连接已暂停（节省流量模式）'}
          </div>
        )}
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
