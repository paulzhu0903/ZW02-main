import { useEffect, useState } from 'react'
import { SIHUA_BY_GAN } from '@/knowledge/sihua'
import { getChineseVariantCandidates } from '@/lib/localize-knowledge'
import { HoverHint } from '@/components/ui'
import { MUTAGEN_COLORS, PALACE_POSITIONS, type PalaceData } from './types'
import { getMutagenType } from './mutagenLines'
import UndoIcon from '@/icons/undo.svg'
import DeleteIcon from '@/icons/delete.svg'

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
  selectedPalaceName: string | null
  selectedPalaceBranch: string | null
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

interface ArcMenuState {
  branch: string
  rootBranch: string
  targetPalaceName?: string
  targetBranch?: string
  fromPalaceName?: string
  fromBranch?: string
  currentArcLabel?: 'A' | 'B' | 'C' | 'D'
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
  const [arcMenu, setArcMenu] = useState<ArcMenuState | null>(null)

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
    setArcMenu(null)
    setPalaceRootMap({})
    setBranchStates({})
  }

  const resetSingleBranch = (rootBranch: string) => {
    setArcMenu(null)
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

  const allArcTrails = Object.values(branchStates).flatMap(branch => branch.arcTrail)

  useEffect(() => {
    if (!selectedPalaceData) {
      setArcMenu(null)
      return
    }

    const rootBranch = palaceRootMap[selectedPalaceData.branch] || selectedPalaceData.branch
    const activeLabel = (branchStates[rootBranch] || EMPTY_BRANCH_STATE).selectedArcLabel

    if (activeLabel !== null) {
      setArcMenu(null)
      return
    }

    setArcMenu({
      branch: selectedPalaceData.branch,
      rootBranch,
    })
  }, [selectedPalaceData, palaceRootMap, branchStates])

  const openArcMenu = (
    rootBranch: string,
    targetPalaceName: string,
    targetBranch: string,
    fromPalaceName: string,
    fromBranch: string,
    currentArcLabel: 'A' | 'B' | 'C' | 'D',
  ) => {
    setArcMenu({
      branch: targetBranch,
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
          let toAnchor = isSelfMutagen
            ? getDestinationEdgeAnchor(targetPalace.branch)
            : getCardCenter(targetPalace.branch)
          if (!toAnchor) return null

          const pairKey = getUnorderedPairKey(currentPalace.branch, targetPalace.branch)
          const existingLaneCount = allArcTrails
            .filter(item => getUnorderedPairKey(item.fromBranch, item.toBranch) === pairKey)
            .length
          
          // 當選擇 M 時，檢查是否有多條 ABCD 弧線指向同一終點
          // 如果是，根據順序 A(0), B(1), C(2), D(3) 來增加弧度避免疊層
          let laneIndex = existingLaneCount
          let endpointOffsetMultiplier = 0
          if (state.selectedArcLabel === 'M') {
            // 檢查在同一批 mutagenKeys 中，有多少條弧線已經指向同一終點
            const sameBatchLanesForTarget = mutagenKeys
              .slice(0, keyIdx)
              .reduce((count, mk) => {
                const targetMutagenStar = sihuaMap[mk]
                if (!targetMutagenStar) return count
                const targetCandidates = getChineseVariantCandidates(targetMutagenStar)
                let targetPalaceCheck: PalaceData | null = null
                for (const palace of palaceData) {
                  const allStars = [...palace.majorStars, ...palace.minorStars]
                  if (allStars.some(s => targetCandidates.includes(s.name))) {
                    targetPalaceCheck = palace
                    break
                  }
                }
                if (targetPalaceCheck && getUnorderedPairKey(currentPalace.branch, targetPalaceCheck.branch) === pairKey) {
                  return count + 1
                }
                return count
              }, 0)
            laneIndex = existingLaneCount + sameBatchLanesForTarget
            endpointOffsetMultiplier = sameBatchLanesForTarget
          }
          
          // 當終點相同時，向外偏移（只在X方向）
          if (endpointOffsetMultiplier > 0 && fromCenter) {
            const dx = toAnchor.x - fromCenter.x
            if (dx !== 0) {
              const offsetDistance = 8 * endpointOffsetMultiplier
              const offsetDirection = dx > 0 ? 1 : -1
              toAnchor = {
                x: toAnchor.x + offsetDirection * offsetDistance,
                y: toAnchor.y,
              }
            }
          }

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

      {arcMenu && (() => {
        const center = getCardCenter(arcMenu.branch)
        const cardRect = getCardRectRelativeToGrid(arcMenu.branch)
        if (!center || !cardRect) return null
        
        const panelWidth = Math.round(cardRect.width * 0.9)
        const panelHeight = isCompactMobile ? 90 : 130
        const hasArcs = (branchStates[arcMenu.rootBranch] || EMPTY_BRANCH_STATE).arcStateStack.length > 0
        
        return (
        <foreignObject
          x={center.x + gridOffset.x - panelWidth / 2}
          y={center.y + gridOffset.y - panelHeight / 2}
          width={panelWidth}
          height={panelHeight}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div 
            className="inline-flex w-full flex-col gap-2 rounded-xl border border-slate-300/70 bg-gray-200/90 p-2 text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="grid grid-cols-3 gap-1">
              {(['A', 'B', 'C', 'D', 'M'] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="h-6 w-6 rounded border border-white/50 bg-white/60 text-[13px] font-semibold leading-none text-slate-700 transition-colors hover:bg-white/85"
                  onClick={() => {
                    const rootBranch = arcMenu.rootBranch
                    
                    // 如果是从弧线触发，记录前一个状态
                    if (arcMenu.fromBranch !== undefined && arcMenu.targetBranch !== undefined && arcMenu.currentArcLabel !== undefined && arcMenu.targetPalaceName !== undefined && selectedPalace) {
                      const fromBranch = arcMenu.fromBranch as string
                      const targetBranch = arcMenu.targetBranch as string
                      const currentArcLabel = arcMenu.currentArcLabel as 'A' | 'B' | 'C' | 'D'
                      const targetPalaceName = arcMenu.targetPalaceName as string
                      
                      updateBranchState(rootBranch, (state) => ({
                        ...state,
                        arcStateStack: [
                          ...state.arcStateStack,
                          {
                            selectedPalaceName: selectedPalace,
                            selectedPalaceBranch: fromBranch,
                            selectedArcLabel: state.selectedArcLabel,
                          },
                        ],
                        arcTrail: [
                          ...state.arcTrail,
                          {
                            fromBranch,
                            toBranch: targetBranch,
                            label: currentArcLabel,
                          },
                        ],
                        selectedArcLabel: label,
                        currentPalaceName: targetPalaceName,
                        currentPalaceBranch: targetBranch,
                      }))
                      setPalaceRootMap(prev => ({
                        ...prev,
                        [fromBranch]: rootBranch,
                        [targetBranch]: rootBranch,
                      }))
                      setSelectedPalace(targetPalaceName)
                    } else {
                      // 从宫位触发，开始新链
                      if (!selectedPalaceData) return
                      updateBranchState(rootBranch, (state) => ({
                        ...state,
                        arcStateStack: [
                          ...state.arcStateStack,
                          {
                            selectedPalaceName: state.currentPalaceName,
                            selectedPalaceBranch: state.currentPalaceBranch,
                            selectedArcLabel: state.selectedArcLabel,
                          },
                        ],
                        selectedArcLabel: label,
                        currentPalaceName: selectedPalaceData.name,
                        currentPalaceBranch: selectedPalaceData.branch,
                      }))
                      setPalaceRootMap(prev => ({
                        ...prev,
                        [selectedPalaceData.branch]: rootBranch,
                      }))
                    }
                    setArcMenu(null)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-1">
              <HoverHint content="Back" className="flex-1">
                <button
                  type="button"
                  disabled={!hasArcs}
                  className={`flex-1 flex h-6 items-center justify-center rounded-lg border font-medium transition-colors ${
                    hasArcs
                      ? 'border-slate-300/60 bg-white/70 text-slate-700 hover:bg-white'
                      : 'border-slate-200/40 bg-slate-100/40 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (hasArcs) {
                      undoOneArcStep(arcMenu.rootBranch)
                      setArcMenu(null)
                    }
                  }}
                >
                  <img src={UndoIcon} alt="Undo" className="w-3.5 h-3.5" />
                </button>
              </HoverHint>
              <HoverHint content="Clean All" className="flex-1">
                <button
                  type="button"
                  disabled={!hasArcs}
                  className={`flex-1 flex h-6 items-center justify-center rounded-lg border font-medium transition-colors ${
                    hasArcs
                      ? 'border-rose-200/60 bg-rose-100/70 text-rose-700 hover:bg-rose-100'
                      : 'border-slate-200/40 bg-slate-100/40 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (hasArcs) {
                      resetSingleBranch(arcMenu.rootBranch)
                      setArcMenu(null)
                    }
                  }}
                >
                  <img src={DeleteIcon} alt="Clean" className="w-3.5 h-3.5" />
                </button>
              </HoverHint>
            </div>
            </div>
          </foreignObject>
        )
      })()}
    </>
  )
}
