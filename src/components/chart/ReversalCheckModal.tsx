/* ============================================================
   反背檢測 Modal 組件
   顯示三方四正和 ABCD 反背檢測結果
   ============================================================ */

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettingsStore } from '@/stores'
import type { ABCDReversalSignal } from './abcdReversalSpec'
import { getReversalBadgeSpec } from './abcdReversalSpec'
import type { PalaceData } from './types'
import { PALACE_NAME_TO_ENGLISH_MAP } from './types'

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

  // 檢查是否與 ABCD toggle switch 重疊，如果重疊則向下移動
  if (mutagenControlsRect) {
    const modalBottom = top + 150 // 估計 modal 高度
    if (top < mutagenControlsRect.bottom && modalBottom > mutagenControlsRect.top) {
      // 與 ABCD switch 重疊，將 modal 移動到 switch 下方
      top = mutagenControlsRect.bottom + 12
    }
  }

  if (left + BUBBLE_W > viewW - margin) {
    left = viewW - BUBBLE_W - margin
  }

  if (left < margin) left = margin

  let maxModalHeight = viewH - top - margin
  if (maxModalHeight < 100) maxModalHeight = 100

  const isTW = language === 'zh-TW'

  function toTraditionalText(value: string): string {
    return value
      .replace(/禄/g, '祿')
      .replace(/权/g, '權')
      .replace(/宫/g, '宮')
      .replace(/财/g, '財')
      .replace(/迁/g, '遷')
      .replace(/禄/g, '祿')
      .replace(/测/g, '測')
      .replace(/检/g, '檢')
      .replace(/无/g, '無')
      .replace(/现/g, '現')
      .replace(/象/g, '象')
  }

  // 根據本命宮名查找大限/流年角色標籤
  // branch → 本命宮名
  const branchToPalaceName = new Map<string, string>(
    palaceData.map((p) => [p.branch, p.name])
  )

  // 根據地支查找大限/流年角色標籤
  function getPalaceRoleLabels(branch: string): { palaceName: string; decadal: string; annual: string } {
    const palaceName = branchToPalaceName.get(branch) || branch
    const engKey = PALACE_NAME_TO_ENGLISH_MAP[palaceName] || ''
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
      style={{ position: 'fixed', left, top, width: BUBBLE_W, zIndex: 50, pointerEvents: 'auto', borderRadius: '18px' }}
      className="glass relative overflow-visible shadow-2xl rounded-2xl"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] bg-white/30">
        {/* 標籤頁導航 */}
        <div className="flex gap-2">
          {abcdReversalSignals.length > 0 && (
            <button
              onClick={() => setActiveTab('abcd')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'abcd'
                  ? 'bg-misfortune text-white shadow-sm'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-text'
              }`}
            >
              ABCD {isTW ? '反背' : '反背'}
              <span className="ml-1 inline-block px-1.5 py-0.5 bg-black/10 rounded text-[10px] font-semibold">
                {abcdReversalSignals.length}
              </span>
            </button>
          )}
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

        {/* 標題和關閉按鈕 */}
        <h3 className="text-xs font-semibold text-text ml-auto">
          {isTW ? '反背檢測' : '反背檢測'}
          {selectedPalaceName && <span className="text-[10px] font-normal text-gray-400 ml-1.5">({toTraditionalText(selectedPalaceName)})</span>}
        </h3>
      </div>

      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 z-10 w-5 h-5 rounded-full bg-black/80 text-white hover:bg-black shadow-md transition-colors flex items-center justify-center text-[12px] leading-none"
        aria-label={isTW ? '關閉' : '關閉'}
      >
        ×
      </button>

      {/* 內容 */}
      <div
        className="px-3 py-2.5 overflow-y-auto text-xs leading-relaxed text-text-secondary flex flex-col"
        style={{ maxHeight: maxModalHeight, overflowY: 'auto' }}
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
        {activeTab === 'abcd' && abcdReversalSignals.length > 0 && (
          <div className="space-y-2">
            {/* 時間資訊區塊 - 只顯示一次 */}
            {(decadalTimeText || annualTimeText) && (
              <div className="mb-2 pb-2 border-b border-white/20 space-y-0.5">
                <div className="space-y-0.5 text-[12px] font-medium text-text">
                  {decadalTimeText && <div>{decadalTimeText}</div>}
                  {annualTimeText && <div>{annualTimeText}</div>}
                </div>
              </div>
            )}
            {abcdReversalSignals.map((signal) => {
              const badgeSpec = getReversalBadgeSpec(signal.severity, language as 'zh-TW' | 'zh-CN')
              const hasLabelData = Object.keys(decadalLabelsByPalaceName).length > 0 || Object.keys(annualLabelsByPalaceName).length > 0
              return (
                <div key={signal.id} className="border-l-2 border-white/20 pl-2 py-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-semibold text-[12px]">{toTraditionalText(signal.title)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${badgeSpec.className}`}>
                      {toTraditionalText(badgeSpec.label)}
                    </span>
                  </div>
                  {/* 宮位角色統計：本命 / 大限 / 流年 */}
                  {hasLabelData ? (
                    <div className="mt-1 space-y-0.5">
                      {signal.centrifugalPalaces.map((p) => renderPalaceRoleRow(p, '離心', signal.code))}
                      {signal.centripetalPalaces.map((p) => renderPalaceRoleRow(p, '向心', signal.code))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-gray-00 leading-snug">
                      <span className="block">{toTraditionalText(signal.summary)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 質能變檢查 */}
        {activeTab === 'qualityMutation' && qualityMutationResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-[12px] text-text">
              生年 ABCD 與同星曜、同類向心或離心四化重疊，判定為質能變。
            </div>
            {qualityMutationResults.map((item) => (
              <div key={`${item.code}-${item.star}`} className="border-l-2 border-white/20 pl-2 py-1">
                <div className="text-[12px] font-semibold text-text">
                  {`${item.code} ${toTraditionalText(item.star)}`}
                </div>
                <div className="text-[12px] text-text-secondary">
                  {`方向：${item.directions.map((d) => toTraditionalText(d)).join(' / ')}`}
                </div>
                {item.centripetalPalaces.length > 0 && (
                  <div className="text-[12px] text-text-secondary">
                    {`向心宮位：${item.centripetalPalaces.map((branch) => getPalaceRoleLabels(branch).palaceName).join('、')}`}
                  </div>
                )}
                {item.centrifugalPalaces.length > 0 && (
                  <div className="text-[12px] text-text-secondary">
                    {`離心宮位：${item.centrifugalPalaces.map((branch) => getPalaceRoleLabels(branch).palaceName).join('、')}`}
                  </div>
                )}
                {item.balanceLinks.length > 0 && (
                  <div className="text-[12px] text-text-secondary">
                    {`平衡宮位：${item.balanceLinks
                      .map((link) => {
                        const sourceName = getPalaceRoleLabels(link.sourceBranch).palaceName
                        const targetName = getPalaceRoleLabels(link.targetBranch).palaceName
                        return `追生年${item.balanceSourceCode}:${sourceName}生年${item.balanceSourceCode}${item.balanceTransformLabel}到${targetName}`
                      })
                      .join('；')}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 空狀態 */}
        {activeTab === 'abcd' && abcdReversalSignals.length === 0 && (
          <div className="text-center text-[10px] text-gray-400 py-2">
            {isTW ? '無 ABCD 反背現象' : '無 ABCD 反背現象'}
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
