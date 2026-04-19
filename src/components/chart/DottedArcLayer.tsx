import { useEffect, useState } from 'react'
import { SIHUA_BY_GAN } from '@/knowledge/sihua'
import { getChineseVariantCandidates } from '@/lib/localize-knowledge'
import { MUTAGEN_COLORS, PALACE_POSITIONS, type PalaceData } from './types'
import { getMutagenType } from './mutagenLines'

interface DottedArcLayerProps {
  palaceData: PalaceData[]
  selectedPalace: string | null
  setSelectedPalace: (palaceName: string | null) => void
  gridRef: React.RefObject<HTMLDivElement | null>
  gridOffset: { x: number; y: number }
  isCompactMobile: boolean
  lineStrokeWidth: number
  lineDashArray: string
  resetVersion: number
}

interface ArcTrailItem {
  fromBranch: string
  toBranch: string
  label: 'A' | 'B' | 'C' | 'D'
}

interface ArcStateItem {
  selectedPalaceName: string
  selectedPalaceBranch: string
  selectedArcLabel: 'A' | 'B' | 'C' | 'D' | 'M' | null
}

type ArcLabel = 'A' | 'B' | 'C' | 'D' | 'M' | null

interface BranchState {
  selectedArcLabel: ArcLabel
  currentPalaceName: string | null
  currentPalaceBranch: string | null
  arcTrail: ArcTrailItem[]
  arcStateStack: ArcStateItem[]
}

interface ArcContinueMenuState {
  rootBranch: string
  targetPalaceName: string
  targetBranch: string
  fromPalaceName: string
  fromBranch: string
  currentArcLabel: 'A' | 'B' | 'C' | 'D'
}

export function DottedArcLayer({
  palaceData,
  selectedPalace,
  setSelectedPalace,
  gridRef,
  gridOffset,
  isCompactMobile,
  lineStrokeWidth,
  lineDashArray,
  resetVersion,
}: DottedArcLayerProps) {
  const [palaceRootMap, setPalaceRootMap] = useState<Record<string, string>>({})
  const [branchStates, setBranchStates] = useState<Record<string, BranchState>>({})
  const [arcContinueMenu, setArcContinueMenu] = useState<ArcContinueMenuState | null>(null)
  const [entryMenu, setEntryMenu] = useState<{ branch: string } | null>(null)

  const EMPTY_BRANCH_STATE: BranchState = {
    selectedArcLabel: null,
    currentPalaceName: null,
    currentPalaceBranch: null,
    arcTrail: [],
    arcStateStack: [],
  }

  const mutagenKeyByLabel: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: '化禄',
    B: '化权',
    C: '化科',
    D: '化忌',
  }
  const mutagenLabelByKey: Record<string, 'A' | 'B' | 'C' | 'D'> = {
    '化禄': 'A',
    '化权': 'B',
    '化科': 'C',
    '化忌': 'D',
  }

  const updateBranchState = (rootBranch: string, updater: (state: BranchState) => BranchState) => {
    setBranchStates((prev) => {
      const current = prev[rootBranch] || EMPTY_BRANCH_STATE
      return {
        ...prev,
        [rootBranch]: updater(current),
      }
    })
  }

  const resetAllArcChains = () => {
    setArcContinueMenu(null)
    setEntryMenu(null)
    setPalaceRootMap({})
    setBranchStates({})
  }

  const resetSingleBranch = (rootBranch: string) => {
    setArcContinueMenu(null)
    setEntryMenu(null)
    setBranchStates((prev) => ({
      ...prev,
      [rootBranch]: EMPTY_BRANCH_STATE,
    }))
  }

  const undoOneArcStep = (rootBranch: string) => {
    const current = branchStates[rootBranch] || EMPTY_BRANCH_STATE
    if (current.arcStateStack.length <= 0) return

    const prevState = current.arcStateStack[current.arcStateStack.length - 1]
    updateBranchState(rootBranch, (state) => ({
      ...state,
      arcStateStack: state.arcStateStack.slice(0, -1),
      arcTrail: state.arcTrail.slice(0, -1),
      selectedArcLabel: prevState.selectedArcLabel,
      currentPalaceName: prevState.selectedPalaceName,
      currentPalaceBranch: prevState.selectedPalaceBranch,
    }))
    setSelectedPalace(prevState.selectedPalaceName)
  }

  const getArcColorInfoByLabel = (label: 'A' | 'B' | 'C' | 'D') => {
    const mutagenKey = mutagenKeyByLabel[label]
    const mutagenType = getMutagenType(mutagenKey)
    return MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]
  }

  useEffect(() => {
    resetAllArcChains()
  }, [resetVersion])

  const gridElement = gridRef.current
  const gridRect = gridElement?.getBoundingClientRect() ?? null

  const getCardCenter = (branch: string): { x: number; y: number } | null => {
    if (!gridElement || !gridRect) return null

    const el = gridElement.querySelector(`[data-palace-branch="${branch}"]`) as HTMLElement | null
    if (!el) return null

    const rect = el.getBoundingClientRect()
    return {
      x: rect.left - gridRect.left + rect.width / 2,
      y: rect.top - gridRect.top + rect.height / 2,
    }
  }

  const getCardRectRelativeToGrid = (branch: string): { left: number; top: number; width: number; height: number } | null => {
    if (!gridElement || !gridRect) return null

    const el = gridElement.querySelector(`[data-palace-branch="${branch}"]`) as HTMLElement | null
    if (!el) return null

    const rect = el.getBoundingClientRect()
    return {
      left: rect.left - gridRect.left,
      top: rect.top - gridRect.top,
      width: rect.width,
      height: rect.height,
    }
  }

  const getDestinationEdgeAnchor = (branch: string): { x: number; y: number } | null => {
    const cardRect = getCardRectRelativeToGrid(branch)
    if (!cardRect) return null

    const pos = PALACE_POSITIONS[branch]
    if (!pos) {
      return {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height / 2,
      }
    }

    // 依使用者規則：
    // row 0 -> 上緣中點；row 3 -> 下緣中點
    // row 1/2 col 0 -> 左緣中點；row 1/2 col 3 -> 右緣中點
    if (pos.row === 0) {
      return {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top,
      }
    }
    if (pos.row === 3) {
      return {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height,
      }
    }
    if (pos.col === 0) {
      return {
        x: cardRect.left,
        y: cardRect.top + cardRect.height / 2,
      }
    }
    if (pos.col === 3) {
      return {
        x: cardRect.left + cardRect.width,
        y: cardRect.top + cardRect.height / 2,
      }
    }

    return {
      x: cardRect.left + cardRect.width / 2,
      y: cardRect.top + cardRect.height / 2,
    }
  }

  const selectedPalaceData = selectedPalace
    ? palaceData.find(p => p.name === selectedPalace) || null
    : null

  const currentRootBranch = selectedPalaceData
    ? (palaceRootMap[selectedPalaceData.branch] || selectedPalaceData.branch)
    : null

  const allArcTrails = Object.values(branchStates).flatMap(branch => branch.arcTrail)

  useEffect(() => {
    if (!selectedPalaceData) {
      setEntryMenu(null)
      return
    }

    const rootBranch = palaceRootMap[selectedPalaceData.branch] || selectedPalaceData.branch
    const activeLabel = (branchStates[rootBranch] || EMPTY_BRANCH_STATE).selectedArcLabel

    if (activeLabel !== null || arcContinueMenu) {
      setEntryMenu(null)
      return
    }

    setEntryMenu({
      branch: selectedPalaceData.branch,
    })
  }, [selectedPalaceData, palaceRootMap, branchStates, arcContinueMenu])

  const openArcMenu = (
    rootBranch: string,
    targetPalaceName: string,
    targetBranch: string,
    fromPalaceName: string,
    fromBranch: string,
    currentArcLabel: 'A' | 'B' | 'C' | 'D',
  ) => {
    setArcContinueMenu({
      rootBranch,
      targetPalaceName,
      targetBranch,
      fromPalaceName,
      fromBranch,
      currentArcLabel,
    })
  }

  const getUnorderedPairKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`)

  const buildArcPath = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromBranch: string,
    toBranch: string,
    label: 'A' | 'B' | 'C' | 'D',
    laneIndex: number,
  ): string | null => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.hypot(dx, dy)
    if (distance < 1) return null

    const nx = -dy / distance
    const ny = dx / distance
    const baseCurveOffset = Math.min(90, Math.max(32, distance * 0.18))
    const laneGap = isCompactMobile ? 12 : 16
    const curveOffset = baseCurveOffset + laneIndex * laneGap

    // 反向線（A->B 與 B->A）必定分居不同側，避免完全重疊
    const orientationSign = fromBranch < toBranch ? 1 : -1
    const labelSign = label === 'A' || label === 'C' ? 1 : -1
    const direction = orientationSign * labelSign

    const controlX = (from.x + to.x) / 2 + nx * curveOffset * direction
    const controlY = (from.y + to.y) / 2 + ny * curveOffset * direction

    return `M ${from.x + gridOffset.x} ${from.y + gridOffset.y} Q ${controlX + gridOffset.x} ${controlY + gridOffset.y} ${to.x + gridOffset.x} ${to.y + gridOffset.y}`
  }

  return (
    <>
      {allArcTrails.map((trail, trailIdx) => {
        const fromCenter = getCardCenter(trail.fromBranch)
        const toCenter = getCardCenter(trail.toBranch)
        if (!fromCenter || !toCenter) return null

        const pairKey = getUnorderedPairKey(trail.fromBranch, trail.toBranch)
        const laneIndex = allArcTrails
          .slice(0, trailIdx)
          .filter(item => getUnorderedPairKey(item.fromBranch, item.toBranch) === pairKey)
          .length
        const pathD = buildArcPath(fromCenter, toCenter, trail.fromBranch, trail.toBranch, trail.label, laneIndex)
        if (!pathD) return null
        const colorInfo = getArcColorInfoByLabel(trail.label)

        return (
          <path
            key={`trail-${trailIdx}-${trail.fromBranch}-${trail.toBranch}-${trail.label}`}
            d={pathD}
            stroke={colorInfo.color}
            strokeWidth={lineStrokeWidth}
            strokeDasharray={lineDashArray}
            opacity={isCompactMobile ? 0.45 : 0.55}
            fill="none"
            markerEnd={`url(#${colorInfo.marker})`}
          />
        )
      })}

      {Object.entries(branchStates).flatMap(([rootBranch, state]) => {
        if (state.selectedArcLabel === null || !state.currentPalaceName || !state.currentPalaceBranch) {
          return []
        }

        const currentPalace = palaceData.find(p => p.name === state.currentPalaceName)
        if (!currentPalace) return []

        const sihuaMap = SIHUA_BY_GAN[currentPalace.stem]
        if (!sihuaMap) return []

        const fromCenter = getCardCenter(currentPalace.branch)
        if (!fromCenter) return []

        const mutagenKeys = state.selectedArcLabel === 'M'
          ? ['化禄', '化权', '化科', '化忌']
          : [mutagenKeyByLabel[state.selectedArcLabel as 'A' | 'B' | 'C' | 'D']]

        return mutagenKeys.map((mutagenKey, keyIdx) => {
          const mutagenStar = sihuaMap[mutagenKey]
          if (!mutagenStar) return null

          const mutagenStarCandidates = getChineseVariantCandidates(mutagenStar)
          const currentArcLabel = mutagenLabelByKey[mutagenKey]
          if (!currentArcLabel) return null

          let targetPalace: PalaceData | null = null
          for (const palace of palaceData) {
            const allStars = [...palace.majorStars, ...palace.minorStars]
            const targetStarIndex = allStars.findIndex(s => mutagenStarCandidates.includes(s.name))
            if (targetStarIndex !== -1) {
              targetPalace = palace
              break
            }
          }

          if (!targetPalace) return null

          // 只有自化（同宮）使用邊緣停靠，其他傳播線使用中心點
          const isSelfMutagen = currentPalace.branch === targetPalace.branch
          const toAnchor = isSelfMutagen
            ? getDestinationEdgeAnchor(targetPalace.branch)
            : getCardCenter(targetPalace.branch)
          if (!toAnchor) return null

          const pairKey = getUnorderedPairKey(currentPalace.branch, targetPalace.branch)
          const laneIndex = allArcTrails
            .filter(item => getUnorderedPairKey(item.fromBranch, item.toBranch) === pairKey)
            .length
          const pathD = buildArcPath(
            fromCenter,
            toAnchor,
            currentPalace.branch,
            targetPalace.branch,
            currentArcLabel,
            laneIndex,
          )
          if (!pathD) return null

          const mutagenType = getMutagenType(mutagenKey)
          const colorInfo = MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]

          return (
            <g key={`selected-palace-line-${rootBranch}-${keyIdx}`}>
              <path
                d={pathD}
                stroke={colorInfo.color}
                strokeWidth={lineStrokeWidth}
                strokeDasharray={lineDashArray}
                opacity={isCompactMobile ? 0.6 : 0.7}
                fill="none"
                markerEnd={`url(#${colorInfo.marker})`}
              />
              {/* 擴大弧線點擊區，改為點選弧線觸發選單，避免長按箭頭誤觸 */}
              <path
                d={pathD}
                stroke="transparent"
                strokeWidth={isCompactMobile ? 16 : 20}
                fill="transparent"
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={() => {
                  openArcMenu(
                    rootBranch,
                    targetPalace.name,
                    targetPalace.branch,
                    currentPalace.name,
                    currentPalace.branch,
                    currentArcLabel,
                  )
                }}
              />
            </g>
          )
        })
      })}

      {arcContinueMenu && (() => {
        const targetCenter = getCardCenter(arcContinueMenu.targetBranch)
        const cardRect = getCardRectRelativeToGrid(arcContinueMenu.targetBranch)
        if (!targetCenter || !cardRect) return null
        const panelWidth = Math.round(cardRect.width * 0.8)
        const panelHeight = isCompactMobile ? 80 : 90
        return (
        <foreignObject
          x={targetCenter.x + gridOffset.x - panelWidth / 2}
          y={targetCenter.y + gridOffset.y- panelHeight / 2}
          width={panelWidth}
          height={panelHeight}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div 
            className="inline-flex w-full flex-col gap-1 rounded-xl border border-slate-300/70 bg-white/88 p-1.5 text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center justify-center gap-2.5">
              {(['A', 'B', 'C', 'D', 'M'] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="h-5 w-5 rounded border border-white/50 bg-white/60 text-[12px] font-semibold leading-none text-slate-700 transition-colors hover:bg-white/85"
                  onClick={() => {
                    const rootBranch = arcContinueMenu.rootBranch
                    if (selectedPalace) {
                      updateBranchState(rootBranch, (state) => ({
                        ...state,
                        arcStateStack: [
                          ...state.arcStateStack,
                          {
                            selectedPalaceName: selectedPalace,
                            selectedPalaceBranch: arcContinueMenu.fromBranch,
                            selectedArcLabel: state.selectedArcLabel,
                          },
                        ],
                        arcTrail: [
                          ...state.arcTrail,
                          {
                            fromBranch: arcContinueMenu.fromBranch,
                            toBranch: arcContinueMenu.targetBranch,
                            label: arcContinueMenu.currentArcLabel,
                          },
                        ],
                        selectedArcLabel: label,
                        currentPalaceName: arcContinueMenu.targetPalaceName,
                        currentPalaceBranch: arcContinueMenu.targetBranch,
                      }))
                    }
                    setPalaceRootMap(prev => ({
                      ...prev,
                      [arcContinueMenu.fromBranch]: rootBranch,
                      [arcContinueMenu.targetBranch]: rootBranch,
                    }))
                    setSelectedPalace(arcContinueMenu.targetPalaceName)
                    setArcContinueMenu(null)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                title="Back"
                className="flex h-6 w-10 items-center justify-center rounded-lg border border-slate-300/60 bg-white/70 text-slate-700 transition-colors hover:bg-white"
                onClick={() => {
                  undoOneArcStep(arcContinueMenu.rootBranch)
                  setArcContinueMenu(null)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <button
                type="button"
                title="Clean All"
                className="flex h-6 w-10 items-center justify-center rounded-lg border border-rose-200/60 bg-rose-100/70 text-rose-700 transition-colors hover:bg-rose-100"
                onClick={() => {
                  resetSingleBranch(arcContinueMenu.rootBranch)
                  setArcContinueMenu(null)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
            </div>
          </foreignObject>
        )
      })()}

      {entryMenu && (() => {
        const center = getCardCenter(entryMenu.branch)
        const cardRect = getCardRectRelativeToGrid(entryMenu.branch)
        if (!center || !cardRect) return null
        const panelWidth = Math.round(cardRect.width * 0.8)
        const panelHeight = isCompactMobile ? 44 : 48
        return (
        <foreignObject
          x={center.x + gridOffset.x - panelWidth / 2}
          y={center.y + gridOffset.y- panelHeight / 2}
          width={panelWidth}
          height={panelHeight}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div 
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300/70 bg-white/88 p-1.5 text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md"
            style={{ pointerEvents: 'auto' }}
          >
            {(['A', 'B', 'C', 'D', 'M'] as const).map((label) => (
              <button
                key={`entry-${label}`}
                type="button"
                className="h-5 w-5 rounded border border-white/50 bg-white/60 text-[12px] font-semibold leading-none text-slate-700 transition-colors hover:bg-white/85"
                onClick={() => {
                  if (!selectedPalaceData) return
                  const rootBranch = currentRootBranch || selectedPalaceData.branch
                  updateBranchState(rootBranch, (state) => ({
                    ...state,
                    selectedArcLabel: label,
                    currentPalaceName: selectedPalaceData.name,
                    currentPalaceBranch: selectedPalaceData.branch,
                  }))
                  setPalaceRootMap(prev => ({
                    ...prev,
                    [selectedPalaceData.branch]: rootBranch,
                  }))
                  setEntryMenu(null)
                }}
              >
                {label}
              </button>
            ))}
            </div>
          </foreignObject>
        )
      })()}
    </>
  )
}
