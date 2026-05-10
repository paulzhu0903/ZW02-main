/* ============================================================
   反背檢測 Modal 組件
   顯示三方四正和 ABCD 反背檢測結果
   ============================================================ */

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettingsStore } from '@/stores'
import type { ABCDReversalSignal } from './abcdReversalSpec'
import { getReversalBadgeSpec } from './abcdReversalSpec'

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
  // 向後兼容
  result?: SanFangSiZhengResult
}

export function ReversalCheckModal({
  isOpen,
  onClose,
  sanFangSiZhengResult,
  abcdReversalSignals = [],
  selectedPalaceName,
  result, // 向後兼容
}: ReversalCheckModalProps) {
  const { language } = useSettingsStore()
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'sanFangSiZheng' | 'abcd'>('sanFangSiZheng')
  
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

  return createPortal(
    <div
      ref={modalRef}
      style={{ position: 'fixed', left, top, width: BUBBLE_W, zIndex: 50, pointerEvents: 'auto', borderRadius: '18px' }}
      className="glass relative overflow-visible shadow-2xl rounded-2xl"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] bg-white/30">
        {/* 標籤頁導航 */}
        <div className="flex gap-2">
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
        </div>

        {/* 標題和關閉按鈕 */}
        <h3 className="text-xs font-semibold text-text ml-auto">
          {isTW ? '反背檢測' : '反背检测'}
          {selectedPalaceName && <span className="text-[10px] font-normal text-gray-400 ml-1.5">({selectedPalaceName})</span>}
        </h3>
      </div>

      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 z-10 w-5 h-5 rounded-full bg-black/80 text-white hover:bg-black shadow-md transition-colors flex items-center justify-center text-[12px] leading-none"
        aria-label={isTW ? '關閉' : '关闭'}
      >
        ×
      </button>

      {/* 內容 */}
      <div
        className="px-3 py-2.5 overflow-y-auto text-xs leading-relaxed text-text-secondary"
        style={{ maxHeight: maxModalHeight }}
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
            {abcdReversalSignals.map((signal) => {
              const badgeSpec = getReversalBadgeSpec(signal.severity, language as 'zh-TW' | 'zh-CN')
              return (
                <div key={signal.id} className="border-l-2 border-white/20 pl-2 py-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-semibold text-[12px]">{signal.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${badgeSpec.className}`}>
                      {badgeSpec.label}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-00 leading-snug">
                    <span className="block">{signal.summary}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 空狀態 */}
        {activeTab === 'abcd' && abcdReversalSignals.length === 0 && (
          <div className="text-center text-[10px] text-gray-400 py-2">
            {isTW ? '無 ABCD 反背現象' : '无 ABCD 反背现象'}
          </div>
        )}
        {activeTab === 'sanFangSiZheng' && !finalSanFangSiZhengResult && (
          <div className="text-center text-[10px] text-gray-400 py-2">
            {isTW ? '無三方四正反背現象' : '无三方四正反背现象'}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
