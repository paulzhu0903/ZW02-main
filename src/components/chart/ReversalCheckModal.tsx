/* ============================================================
   顯示串聯/反背 三方四正 檢測結果
   ============================================================ */

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettingsStore } from '@/stores'
import type { ABCDReversalSignal } from './abcdReversalSpec'
import type { PalaceData } from './types'
import { NATAL_PALACE_MAP, PALACE_NAME_TO_ENGLISH_MAP, toTraditionalText } from './types'

export interface SanFangSiZhengResult {
  sanFang: {
    getCount: number
    lossCount: number
    hasReversal: boolean
  }
  siZheng: {
    getCount: number
    lossCount: number
    hasReversal: boolean
  }
}

export interface ReversalCheckModalProps {
  isOpen: boolean
  onClose: () => void
  sanFangSiZhengResult?: SanFangSiZhengResult | null
  abcdReversalSignals?: ABCDReversalSignal[]
  birthCodeMetaByCode?: Record<'A' | 'B' | 'C' | 'D', { palaceName: string; starName: string } | null>
  selectedPalaceName?: string | null
  decadalLabelsByPalaceName?: Record<string, string>
  annualLabelsByPalaceName?: Record<string, string>
  palaceData?: PalaceData[]
  selectedDecadal?: number | null
  selectedAnnualYear?: number | null
  selectedAnnualAge?: number | null
  selectedAnnualGanZhi?: string | null
  qualityMutationResults?: Array<{
    code: 'A' | 'B' | 'C' | 'D'
    star: string
    directions: Array<'向心' | '離心'>
    centripetalPalaces: string[]
    centrifugalPalaces: string[]
    balanceSourceCode: 'A' | 'B' | 'C' | 'D'
    balanceTransformLabel: string
    balanceSourcePalaces: string[]
    balanceTargetPalaces: string[]
    balanceLinks: Array<{ sourceBranch: string; targetBranch: string }>
  }>
  // 向後兼容
  result?: SanFangSiZhengResult
}

export function ReversalCheckModal({
  isOpen,
  onClose,
  sanFangSiZhengResult,
  abcdReversalSignals = [],
  birthCodeMetaByCode,
  selectedPalaceName,
  decadalLabelsByPalaceName = {},
  annualLabelsByPalaceName = {},
  palaceData = [],
  selectedDecadal = null,
  selectedAnnualYear = null,
  selectedAnnualAge = null,
  selectedAnnualGanZhi = null,
  qualityMutationResults = [],
  result, // 向後兼容
}: ReversalCheckModalProps) {
  const { language } = useSettingsStore()
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'abcd' | 'qualityMutation' | 'sanFangSiZheng'>('abcd')
  
  // 向後兼容：如果沒有提供新的 props，使用舊的 result prop
  const finalSanFangSiZhengResult = sanFangSiZhengResult || result

  if (!isOpen) {
    return null
  }

  // 定位邏輯完全複製 PalaceHintBubble，並避開 ABCD toggle switch
  const margin = 8
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  const centerInfoEl = document.querySelector('[data-centerinfo]') as HTMLElement | null
  const palaceGridEl = document.querySelector('[data-palace-grid]') as HTMLElement | null
  const decadalAnnualTableEl = document.querySelector('[data-decadal-annual-table]') as HTMLElement | null
  const mutagenControlsEl = document.querySelector('[data-mutagen-controls]') as HTMLElement | null
  
  const palaceGridRect = palaceGridEl?.getBoundingClientRect() || null
  const decadalAnnualTableRect = decadalAnnualTableEl?.getBoundingClientRect() || null
  const centerInfoRect = centerInfoEl?.getBoundingClientRect() || null
  const mutagenControlsRect = mutagenControlsEl?.getBoundingClientRect() || null
  const fixedBottomNavEl = Array.from(document.querySelectorAll('nav')).find((el) => {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return (
      style.position === 'fixed' &&
      style.display !== 'none' &&
      rect.height > 0 &&
      Math.abs(rect.bottom - viewH) <= 2 &&
      rect.top > viewH * 0.6
    )
  }) as HTMLElement | undefined
  const bottomNavReserve = fixedBottomNavEl ? Math.ceil(fixedBottomNavEl.getBoundingClientRect().height) + 8 : 0

  const maxBubbleWidth = viewW - margin * 2
  const BUBBLE_W = palaceGridRect
    ? Math.round(Math.min(palaceGridRect.width, maxBubbleWidth))
    : decadalAnnualTableRect
      ? Math.round(Math.min(Math.max(decadalAnnualTableRect.width, 460), maxBubbleWidth))
    : centerInfoRect
      ? Math.round(Math.min(centerInfoRect.width + 120, maxBubbleWidth))
      : Math.round(Math.min(460, maxBubbleWidth))

  let left = palaceGridRect
    ? palaceGridRect.left + (palaceGridRect.width - BUBBLE_W) / 2
    : decadalAnnualTableRect
      ? decadalAnnualTableRect.left + (decadalAnnualTableRect.width - BUBBLE_W) / 2
    : centerInfoRect
      ? centerInfoRect.left
      : margin

  let top = decadalAnnualTableRect
    ? (palaceGridRect ? palaceGridRect.bottom + 12 : decadalAnnualTableRect.top + 12)
    : centerInfoRect
      ? centerInfoRect.top
      : margin

  // 將 modal 盡量貼近 control area 下方，避免起始位置過低
  if (mutagenControlsRect) {
    const preferredTop = mutagenControlsRect.bottom + 6
    if (top > preferredTop) top = preferredTop
  }

  // 檢查是否與 ABCD toggle switch 重疊，如果重疊則向下移動
  if (mutagenControlsRect) {
    const modalBottom = top + 150 // 估計 modal 高度
    if (top < mutagenControlsRect.bottom && modalBottom > mutagenControlsRect.top) {
      // 與 ABCD switch 重疊，將 modal 移動到 switch 下方
      top = mutagenControlsRect.bottom + 6
    }
  }

  if (left + BUBBLE_W > viewW - margin) {
    left = viewW - BUBBLE_W - margin
  }

  if (left < margin) left = margin

  let maxModalHeight = viewH - top - margin - bottomNavReserve
  if (maxModalHeight < 100) maxModalHeight = 100
  const contentMaxHeight = Math.max(56, maxModalHeight - 46)

  const isTW = language === 'zh-TW'

  // 根據本命宮名查找大限/流年角色標籤
  // branch → 本命宮名
  const branchToPalaceName = new Map<string, string>(
    palaceData.map((p) => [p.branch, p.name])
  )

  // 根據地支查找大限/流年角色標籤
  function getPalaceRoleLabels(branch: string): { palaceName: string; decadal: string; annual: string } {
    const rawPalaceName = branchToPalaceName.get(branch) || branch
    const engKey = PALACE_NAME_TO_ENGLISH_MAP[rawPalaceName] || ''
    const palaceName = engKey ? NATAL_PALACE_MAP[engKey] || rawPalaceName : rawPalaceName
    return {
      palaceName: toTraditionalText(palaceName),
      decadal: engKey ? toTraditionalText(decadalLabelsByPalaceName[engKey] || '') : '',
      annual: engKey ? toTraditionalText(annualLabelsByPalaceName[engKey] || '') : '',
    }
  }

  const sortedDecadalPalaces = palaceData
    .filter((p) => p.decadal?.range)
    .sort((a, b) => a.decadal.range[0] - b.decadal.range[0])

  const selectedDecadalPalace =
    selectedDecadal !== null && selectedDecadal >= 0
      ? sortedDecadalPalaces[selectedDecadal] || null
      : null

  const decadalTimeText = selectedDecadalPalace
    ? `大限: ${selectedDecadalPalace.decadal.range[0]}~${selectedDecadalPalace.decadal.range[1]} ${toTraditionalText(selectedDecadalPalace.stem)}${toTraditionalText(selectedDecadalPalace.branch)}限`
    : ''

  const annualTimeText = selectedAnnualYear && selectedAnnualGanZhi && selectedAnnualAge
    ? `流年: ${selectedAnnualYear}年 ${toTraditionalText(selectedAnnualGanZhi)}${selectedAnnualAge}歲`
    : ''

  const abcdReversalCount = abcdReversalSignals.filter(
    (signal) => signal.centripetalPalaces.length > 0 && signal.centrifugalPalaces.length > 0,
  ).length
  const abcdChainCount = abcdReversalSignals.filter(
    (signal) => signal.centripetalPalaces.length > 1 || signal.centrifugalPalaces.length > 1,
  ).length

  // 渲染單一宮位標籤列（本命 → 大限 → 流年）
  function renderPalaceRoleRow(branch: string, direction: '離心' | '向心', code: string) {
    const { palaceName, decadal, annual } = getPalaceRoleLabels(branch)
    return (
      <div key={`${direction}-${branch}`} className="flex items-center gap-1.5 flex-wrap text-[12px] font-medium text-text">
        <span>{`${toTraditionalText(direction)}${code}`}</span>
        <span>{palaceName}</span>
        {decadal && <span>{decadal}</span>}
        {annual && <span>{annual}</span>}
      </div>
    )
  }

  return createPortal(
    <div
      ref={modalRef}
      style={{ position: 'fixed', left, top, width: BUBBLE_W, maxHeight: maxModalHeight, zIndex: 50, pointerEvents: 'auto', borderRadius: '10px' }}
      className="glass relative overflow-hidden shadow-2xl rounded-2xl"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] bg-white/30">
        {/* 標籤頁導航 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('abcd')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'abcd'
                ? 'bg-misfortune text-white shadow-sm'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-text'
            }`}
          >
            {`串聯${abcdChainCount}/反背${abcdReversalCount}`}
          </button>
          <button
            onClick={() => setActiveTab('qualityMutation')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'qualityMutation'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-text'
            }`}
          >
            質能變
            <span className="ml-1 inline-block px-1.5 py-0.5 bg-black/10 rounded text-[10px] font-semibold">
              {qualityMutationResults.length}
            </span>
          </button>
          {finalSanFangSiZhengResult && (
            <button
              onClick={() => setActiveTab('sanFangSiZheng')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'sanFangSiZheng'
                  ? 'bg-fortune text-white shadow-sm'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-text'
              }`}
            >
              {isTW ? '三方四正' : '三方四正'}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="ml-auto w-5 h-5 rounded-full bg-black/80 text-white hover:bg-black shadow-md transition-colors flex items-center justify-center text-[12px] leading-none"
          aria-label={isTW ? '關閉' : '關閉'}
        >
          ×
        </button>
      </div>

      {/* 內容 */}
      <div
        className="settings-scrollable min-h-0 px-3 py-2 overflow-y-scroll text-xs leading-snug text-text-secondary flex flex-col"
        style={{ maxHeight: contentMaxHeight, overflowY: 'scroll' }}
      >
        {/* 三方四正標籤 */}
        {activeTab === 'sanFangSiZheng' && finalSanFangSiZhengResult && (
          <div className="flex flex-row gap-x-3 gap-y-0">
            {/* 三方統計 */}
            <div className="flex-1 flex items-center gap-x-1">
              <span className="font-semibold whitespace-nowrap text-[11px]">{isTW ? '三方' : '三方'}</span>
              <span className="text-gray-400 font-semibold text-[10px]">得{finalSanFangSiZhengResult.sanFang.getCount}</span>
              <span className="text-gray-400 text-[10px]">/</span>
              <span className="text-gray-400 font-semibold text-[10px]">失{finalSanFangSiZhengResult.sanFang.lossCount}</span>
              <span className="text-gray-400 font-semibold text-[10px] ml-1">
                {isTW ? '反背' : '反背'}{finalSanFangSiZhengResult.sanFang.hasReversal ? '✓' : '✗'}
              </span>
            </div>

            {/* 四正統計 */}
            <div className="flex-1 flex items-center gap-x-1">
              <span className="font-semibold whitespace-nowrap text-[11px]">{isTW ? '四正' : '四正'}</span>
              <span className="text-gray-400 font-semibold text-[10px]">得{finalSanFangSiZhengResult.siZheng.getCount}</span>
              <span className="text-gray-400 text-[10px]">/</span>
              <span className="text-gray-400 font-semibold text-[10px]">失{finalSanFangSiZhengResult.siZheng.lossCount}</span>
              <span className="text-gray-400 font-semibold text-[10px] ml-1">
                {isTW ? '反背' : '反背'}{finalSanFangSiZhengResult.siZheng.hasReversal ? '✓' : '✗'}
              </span>
            </div>
          </div>
        )}

        {/* ABCD 反背標籤 */}
        {activeTab === 'abcd' && (
          <div className="space-y-1.5">
            {/* 時間資訊區塊 - 只顯示一次 */}
            {(decadalTimeText || annualTimeText) && (
              <div className="mb-1.5 pb-1.5 border-b border-white/20">
                <div className="flex items-center gap-2 text-[12px] font-medium text-text whitespace-nowrap overflow-x-auto">
                  {decadalTimeText && <span>{decadalTimeText}</span>}
                  {decadalTimeText && annualTimeText && <span className="text-gray-400">|</span>}
                  {annualTimeText && <span>{annualTimeText}</span>}
                </div>
              </div>
            )}
            {(() => {
              const CODE_ORDER: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
              const codeMap = new Map(abcdReversalSignals.map((s) => [s.code, s]))

              const buildRoleText = (branch: string, direction: '離心' | '向心') => {
                const { palaceName, decadal, annual } = getPalaceRoleLabels(branch)
                return [palaceName, direction, annual, decadal].filter(Boolean).join(' ')
              }

              const buildCodeMetaText = (signal: ABCDReversalSignal | undefined, code: 'A' | 'B' | 'C' | 'D') => {
                const birthMeta = birthCodeMetaByCode?.[code]
                if (birthMeta?.starName) {
                  const palaceName = birthMeta.palaceName ? toTraditionalText(birthMeta.palaceName) : '-'
                  const starName = toTraditionalText(birthMeta.starName)
                  return `${code}: ${palaceName} ${starName}${code}`
                }

                if (!signal) return `${code}: -`

                const fallbackBranch =
                  signal.palace ||
                  signal.centripetalPalaces[0] ||
                  signal.centrifugalPalaces[0] ||
                  ''
                const palaceName = fallbackBranch ? getPalaceRoleLabels(fallbackBranch).palaceName : '-'

                const rawStarName =
                  signal.evidence.ingressLine.starName ||
                  signal.evidence.reverseLine?.starName ||
                  signal.evidence.conflictLine?.starName ||
                  ''
                const starName = rawStarName ? toTraditionalText(rawStarName) : '-'

                return `${code}: ${palaceName} ${starName}${code}`
              }

              const cells = CODE_ORDER.map((code) => {
                const signal = codeMap.get(code)
                if (!signal) {
                  return {
                    code,
                    metaText: buildCodeMetaText(undefined, code),
                    chainLines: [] as string[],
                    reverseLines: [] as string[],
                  }
                }

                const centrifugalCount = signal.centrifugalPalaces.length
                const centripetalCount = signal.centripetalPalaces.length
                const chainDirection: '離心' | '向心' = centrifugalCount >= centripetalCount ? '離心' : '向心'
                const reverseDirection: '離心' | '向心' = chainDirection === '離心' ? '向心' : '離心'
                const chainPalaces = chainDirection === '離心' ? signal.centrifugalPalaces : signal.centripetalPalaces
                const reversePalaces = chainDirection === '離心' ? signal.centripetalPalaces : signal.centrifugalPalaces

                return {
                  code,
                  metaText: buildCodeMetaText(signal, code),
                  chainLines: chainPalaces.map((branch) => buildRoleText(branch, chainDirection)),
                  reverseLines: reversePalaces.map((branch) => buildRoleText(branch, reverseDirection)),
                }
              })

              return (
                <div className="border border-white/20 rounded overflow-hidden">
                  <div className="grid grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)] text-[12px]">
                    <div className="bg-white/20 border-white/20" />
                    <div className="bg-white/20 border-white/20 px-2 py-0.5 text-[11px] font-semibold text-text">串聯</div>
                    <div className="bg-white/20 border-white/20 px-2 py-0.5 text-[11px] font-semibold text-text">反背</div>

                    {cells.map((cell) => (
                      <div key={`row-${cell.code}`} className="contents">
                        <div className="bg-white/10 border-t border-white/20 px-2 py-0.5 text-[11px] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">
                          {cell.metaText}
                        </div>
                        <div className="border-t border-gray-500/[0.35] px-2 py-0.5 text-[11px] text-text-secondary space-y-0 min-h-[28px]">
                          {cell.chainLines.length > 0 ? cell.chainLines.map((line, idx) => (
                            <div key={`chain-${cell.code}-${idx}`}>{line}</div>
                          )) : <div className="text-gray-400">-</div>}
                        </div>
                        <div className="border-t border-gray-500/[0.35] px-2 py-0.5 text-[11px] text-text-secondary space-y-0 min-h-[28px]">
                          {cell.reverseLines.length > 0 ? cell.reverseLines.map((line, idx) => (
                            <div key={`reverse-${cell.code}-${idx}`}>{line}</div>
                          )) : <div className="text-gray-400">-</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 質能變檢查 */}
        {activeTab === 'qualityMutation' && qualityMutationResults.length > 0 && (
          <div className="space-y-1">
            {qualityMutationResults.map((item: (typeof qualityMutationResults)[number]) => {
              // 生成宮位信息：向心和離心宮位的組合
              const palaceLines: string[] = []
              
              // 向心宮位：宮有生年{code}又有向心{code}
              if (item.centripetalPalaces.length > 0) {
                item.centripetalPalaces.forEach((branch) => {
                  const palaceName = getPalaceRoleLabels(branch).palaceName
                  palaceLines.push(`${palaceName}有生年${item.code}又有向心${item.code}`)
                })
              }

              // 離心宮位：宮有生年{code}又有離心{code}
              if (item.centrifugalPalaces.length > 0) {
                item.centrifugalPalaces.forEach((branch) => {
                  const palaceName = getPalaceRoleLabels(branch).palaceName
                  palaceLines.push(`${palaceName}有生年${item.code}又有離心${item.code}`)
                })
              }

              return (
                <div key={`${item.code}-${item.star}`} className="border-l-2 border-white/20 pl-2 py-1">
                  <div className="text-[12px] font-semibold text-text">
                    {`${item.code} ${toTraditionalText(item.star)}`}
                  </div>
                  {palaceLines.length > 0 && (
                    <div className="text-[12px] text-text-secondary space-y-0.5">
                      {palaceLines.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  )}
                  {item.balanceLinks.length > 0 && (
                    <div className="text-[12px] text-text-secondary">
                      {`同組平衡：${item.balanceLinks
                        .map((link) => {
                          const sourceName = getPalaceRoleLabels(link.sourceBranch).palaceName
                          const targetName = getPalaceRoleLabels(link.targetBranch).palaceName
                          return `${sourceName}生年${item.balanceSourceCode}${item.balanceTransformLabel}到${targetName}`
                        })
                        .join('；')}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 空狀態 */}
        {activeTab === 'abcd' && abcdReversalSignals.length === 0 && (
          <div className="text-center text-[10px] text-gray-400 py-2">
            {isTW ? '無串聯/反背現象' : '無串聯/反背現象'}
          </div>
        )}
        {activeTab === 'sanFangSiZheng' && !finalSanFangSiZhengResult && (
          <div className="text-center text-[10px] text-gray-400 py-2">
            {isTW ? '無三方四正反背現象' : '無三方四正反背現象'}
          </div>
        )}
        {activeTab === 'qualityMutation' && qualityMutationResults.length === 0 && (
          <div className="text-center text-[10px] text-gray-400 py-2">
            無質能變現象
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
