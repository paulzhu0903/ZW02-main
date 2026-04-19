/* ============================================================
   宮位 AI 氣泡提示組件
   點擊命盤宮位後，以浮動氣泡呼叫 AI 作精簡解讀
   支援本命 / 大限 / 流年 三種解讀模式
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSettingsStore } from '@/stores'
import { SIHUA_BY_GAN, SIHUA_BY_GAN_TRADITIONAL } from '@/knowledge/sihua'
import { getPalaceInfo } from '@/knowledge/palaces'
import { getStarInfo } from '@/knowledge/stars/majorStars'
import { localizeChineseText, localizeKnowledgeText } from '@/lib/localize-knowledge'
import { normalizeStarName as normalizeStarNameShared } from '@/lib/star-name'
import type { PalaceData } from './types'

type TabType = 'natal' | 'decadal' | 'annual'
type ChartType = 'flying' | 'trireme' | 'transformation'

function normalizePalaceName(name: string): string {
  return name
    .trim()
    .replace('命宮', '命宫')
    .replace('兄弟宮', '兄弟宫')
    .replace('夫妻宮', '夫妻宫')
    .replace('子女宮', '子女宫')
    .replace('財帛宮', '财帛宫')
    .replace('疾厄宮', '疾厄宫')
    .replace('遷移宮', '迁移宫')
    .replace('交友宮', '交友宫')
    .replace('奴仆宮', '交友宫')
    .replace('奴僕宮', '交友宫')
    .replace('仆役宮', '交友宫')
    .replace('僕役宮', '交友宫')
    .replace('官祿宮', '官禄宫')
    .replace('田宅宮', '田宅宫')
    .replace('福德宮', '福德宫')
    .replace('父母宮', '父母宫')
    .replace('奴仆', '交友')
    .replace('奴僕', '交友')
    .replace('仆役', '交友')
    .replace('僕役', '交友')
}

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
  anchorRect: DOMRect
  onClose: () => void
  chartType?: ChartType
  /** 此宮位在當前大限的角色標籤，例如「大命」「大財」 */
  decadalLabel?: string
  /** 此宮位在當前流年的角色標籤，例如「年命」「年財」 */
  annualLabel?: string
  /** 大限命宮天干 */
  decadalStem?: string | null
  /** 流年命宮天干 */
  annualStem?: string | null
  /** 流年干支，例如「甲子」 */
  annualGanZhi?: string | null
}

export function PalaceHintBubble({
  palace, anchorRect, onClose,
  chartType = 'trireme',
  decadalLabel, annualLabel,
  decadalStem, annualStem, annualGanZhi,
}: PalaceHintBubbleProps) {
  const { language } = useSettingsStore()
  const displayName = displayPalaceName(palace.name)
  const localizedDisplayName = localizeChineseText(displayName, language)
  const localizeVisibleText = (text: string) => localizeChineseText(text, language)

  const hasDecadal = !!decadalStem
  const hasAnnual  = !!annualStem && !!annualGanZhi
  const aiPaused = true

  const [activeTab, setActiveTab] = useState<TabType>('natal')
  const bubbleRef = useRef<HTMLDivElement>(null)

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

    const normalizedPalaceName = normalizePalaceName(displayName)
    const _palaceInfo = getPalaceInfo(normalizedPalaceName)

    const _majorStarSummary = palace.majorStars.map(s => {
      const m = s.mutagen ? `(${localizeVisibleText(s.mutagen)})` : ''
      const b = s.brightness ? localizeVisibleText(s.brightness) : ''
      return `${localizeVisibleText(s.name)}${b}${m}`
    }).join('、')
    const _minorStarSummary = palace.minorStars.map(s => localizeVisibleText(s.name)).join('、')

    const majorStarKnowledges = palace.majorStars
      .map((star) => {
        const info = getStarInfo(normalizeStarNameShared(star.name))
        if (!info) return null
        const palaceEffect = localizeKnowledgeText(info.palaceEffects[normalizedPalaceName] || info.description, isTW)
        return `- ${localizeVisibleText(star.name)}：${palaceEffect}`
      })
      .filter((v): v is string => !!v)

    const _starKnowledgeText = majorStarKnowledges.length > 0
      ? majorStarKnowledges.join('\n')
      : (isTW ? '- 此宮主星暫無本地知識條目，先以星曜組合觀察。' : '- 此宫主星暂无本地知识条目，先以星曜组合观察。')

    const palaceStarSet = new Set([
      ...palace.majorStars.map((s) => normalizeStarNameShared(s.name)),
      ...palace.minorStars.map((s) => normalizeStarNameShared(s.name)),
    ])

    const buildTransformationSOP = (label: string, stem: string, extra: string = '') => {
      const sihua = sihuaMap[stem] ?? {}
      const entries = Object.entries(sihua)
      const detailLines = entries.map(([mutagenKey, starName]) => {
        const inPalace = palaceStarSet.has(normalizeStarNameShared(starName))
        const marker = inPalace
          ? (isTW ? '落本宮' : '落本宫')
          : (isTW ? '不在本宮' : '不在本宫')
        return `- ${mutagenToABCD(mutagenKey)} (${localizeVisibleText(mutagenKey)}) → ${localizeVisibleText(starName)}：${marker}`
      })
      const hitCount = entries.filter(([, starName]) => palaceStarSet.has(normalizeStarNameShared(starName))).length

      return `${isTW ? '四化盤解說 SOP（本地）' : '四化盘解说 SOP（本地）'}
1. ${isTW ? '定位作用天干' : '定位作用天干'}：${label} = ${stem}
2. ${isTW ? '展開四化映射（A/B/C/D）' : '展开四化映射（A/B/C/D）'}：
${detailLines.join('\n') || '- —'}
3. ${isTW ? '檢核本宮承接' : '检核本宫承接'}：${hitCount}/${entries.length}
4. ${isTW ? '結論' : '结论'}：${
  hitCount > 0
    ? (isTW
      ? '本宮有承接該天干四化，屬於本宮可直接感受的議題。'
      : '本宫有承接该天干四化，属于本宫可直接感受的议题。')
    : (isTW
      ? '本宮未直接承接該天干四化，需結合飛宮與對宮再判讀。'
      : '本宫未直接承接该天干四化，需结合飞宫与对宫再判读。')
}
${extra}`
    }

    if (tab === 'natal') {
      if (chartType === 'transformation') {
        return `${buildTransformationSOP(
  isTW ? '本宮宮干' : '本宫宫干',
  palace.stem,
  isTW ? '提示：四化盤優先看結構與能量流向，再補生活語義。' : '提示：四化盘优先看结构与能量流向，再补生活语义。'
)}`
      }

      return `命宮：${palace.isLife ? '是' : '否'}　身宮：${palace.isBody ? '是' : '否'}
${isTW ? '三合盤 SOP：先宮位主題，再主星重點，最後看限運角色。' : '三合盘 SOP：先宫位主题，再主星重点，最后看限运角色。'}`
    }

    if (tab === 'decadal' && decadalStem) {
      if (chartType === 'transformation') {
        return `此宮在當前大限中的角色：${decadalLabel || '—'}
${buildTransformationSOP(
  isTW ? '大限命宮天干' : '大限命宫天干',
  decadalStem,
  isTW ? '提示：先看四化落星，再比對本宮是否承接。' : '提示：先看四化落星，再比对本宫是否承接。'
)}`
      }

      const sihua = sihuaMap[decadalStem] ?? {}
      const sihuaStr = Object.entries(sihua).map(([k, v]) => `${k}→${v}`).join('　')
      return `此宮在當前大限中的角色：${decadalLabel || '—'}
大限命宮天干：${decadalStem}
大限四化：${sihuaStr || '—'}
${isTW ? '三合盤 SOP：先看角色，再看四化作為強弱參考。' : '三合盘 SOP：先看角色，再看四化作为强弱参考。'}`
    }

    if (tab === 'annual' && annualStem && annualGanZhi) {
      if (chartType === 'transformation') {
        return `此宮在當前流年中的角色：${annualLabel || '—'}
流年干支：${annualGanZhi}
${buildTransformationSOP(
  isTW ? '流年命宮天干' : '流年命宫天干',
  annualStem,
  isTW ? '提示：流年層以事件應期為主，優先判讀 D(忌) 與 A(祿) 的落點。' : '提示：流年层以事件应期为主，优先判读 D(忌) 与 A(禄) 的落点。'
)}`
      }

      const sihua = sihuaMap[annualStem] ?? {}
      const sihuaStr = Object.entries(sihua).map(([k, v]) => `${k}→${v}`).join('　')
      return `此宮在當前流年中的角色：${annualLabel || '—'}
流年干支：${annualGanZhi}
流年命宮天干：${annualStem}
流年四化：${sihuaStr || '—'}
${isTW ? '三合盤 SOP：以流年角色對照本命主題，再看四化觸發點。' : '三合盘 SOP：以流年角色对照本命主题，再看四化触发点。'}`
    }

    // fallback
    return isTW
      ? '目前資料不足，請先選擇對應的大限或流年。'
      : '目前资料不足，请先选择对应的大限或流年。'
  }, [palace, displayName, decadalLabel, annualLabel, decadalStem, annualStem, annualGanZhi, language, chartType])

  const displayText = buildLocalText(activeTab)

  // 切換 tab 時：若已有快取直接顯示，否則觸發 AI
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return
    setActiveTab(tab)
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
      label: localizedDisplayName,
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
      {/* 標題列 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/[0.06] bg-white/40">
        <div className="flex items-center gap-2">
          <span className="text-misfortune font-bold text-sm">{localizedDisplayName}</span>
          <span className="text-text-muted text-xs font-medium">{palace.stem}{palace.branch}</span>
          {palace.isLife && (
            <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.5 rounded-full font-medium">命</span>
          )}
          {palace.isBody && (
            <span className="text-[10px] bg-star/10 text-star border border-star/20 px-1.5 py-0.5 rounded-full font-medium">身</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text transition-colors text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5"
        >
          ✕
        </button>
      </div>

      {/* 三個 Tab */}
      <div className="flex border-b border-black/[0.06] bg-white/20 rounded-t-[6px] overflow-hidden">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.key)}
              className={`
                flex-1 py-1.5 px-1 text-center transition-all duration-150 rounded-t-[6px]
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

      {/* 解讀內容（AI 暫停） */}
      <div className="px-3 py-2.5 min-h-[120px] max-h-[220px] overflow-y-auto text-xs leading-relaxed text-text-secondary">
        {aiPaused && (
          <div className="mb-2 text-[10px] text-misfortune bg-misfortune/10 border border-misfortune/20 rounded px-2 py-1">
            {language === 'zh-TW' ? 'AI 連線已暫停（節省流量模式）' : 'AI 连接已暂停（节省流量模式）'}
          </div>
        )}
        <span style={{ whiteSpace: 'pre-wrap' }}>{displayText}</span>
      </div>
    </div>,
    document.body
  )
}
