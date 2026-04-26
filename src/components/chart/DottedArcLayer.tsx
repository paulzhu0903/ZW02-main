import { useEffect, useState } from 'react'
import { SIHUA_BY_GAN } from '@/knowledge/sihua'
import { getChineseVariantCandidates } from '@/lib/localize-knowledge'
import { HoverHint } from '@/components/ui'
import { MUTAGEN_COLORS, OPPOSITE_PALACE, PALACE_POSITIONS, type PalaceData } from './types'
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
  createdAt: number
}

interface ArcStateItem {
  selectedPalaceName: string | null
  selectedPalaceBranch: string | null
  selectedArcLabel: 'A' | 'B' | 'C' | 'D' | null
}

type ArcLabel = 'A' | 'B' | 'C' | 'D' | null

interface BranchState {
  selectedArcLabel: ArcLabel
  currentPalaceName: string | null
  currentPalaceBranch: string | null
  arcTrail: ArcTrailItem[]
  arcStateStack: ArcStateItem[]
  selectedLabelsPerBranch: Record<string, Record<'A' | 'B' | 'C' | 'D', boolean>> // 每个宫位有独立的ABCD状态
  selectedLabelTime: number | null // 用于待选弧线动画
}

interface ArcMenuState {
  branch: string // 菜单显示的位置（当前宫位）
  rootBranch: string // 链条的所有者（发出弧线的起点）
  isFromArc?: boolean // 标记是否从已完成的弧线触发
}

interface TransientOppositeLine {
  id: string
  fromBranch: string
  toBranch: string
  createdAt: number
}

export function DottedArcLayer({
  palaceData,
  selectedPalace,
  setSelectedPalace,
  gridRef,
  gridOffset,
  isCompactMobile,
  lineStrokeWidth,
  resetVersion,
}: DottedArcLayerProps) {
  const [branchStates, setBranchStates] = useState<Record<string, BranchState>>({})
  const [arcMenu, setArcMenu] = useState<ArcMenuState | null>(null)
  const [transientOppositeLines, setTransientOppositeLines] = useState<TransientOppositeLine[]>([])

  const EMPTY_BRANCH_STATE: BranchState = {
    selectedArcLabel: null,
    currentPalaceName: null,
    currentPalaceBranch: null,
    arcTrail: [],
    arcStateStack: [],
    selectedLabelsPerBranch: {},
    selectedLabelTime: null,
  }

  const mutagenKeyByLabel: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: '化禄',
    B: '化权',
    C: '化科',
    D: '化忌',
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
    setBranchStates({})
  }

  const cleanCurrentChain = () => {
    // 清除当前链条的所有 branchStates
    setBranchStates((prev) => {
      const updated = { ...prev }
      // 清除当前打开的菜单对应的 root branch 的所有状态
      if (arcMenu) {
        delete updated[arcMenu.rootBranch]
        
        // 如果是 branch menu（isFromArc=true），还需要清除该 root branch 相关的所有其他 branch
        if (arcMenu.isFromArc) {
          // 由于 branch 本身就是 root（每个宫位都是自己的 root），所以只需删除该 root 即可
          // 其他链条的 branch 是不同的 root，不会被影响
        }
      }
      return updated
    })
    
    setArcMenu(null)
  }

  const undoOneArcStep = (rootBranch: string) => {
    const current = branchStates[rootBranch] || EMPTY_BRANCH_STATE
    
    if (current.arcTrail.length <= 0) return

    // 找出被移除的弧线
    const removedArcTrail = current.arcTrail[current.arcTrail.length - 1]
    const removedLabel = removedArcTrail?.label as 'A' | 'B' | 'C' | 'D' | undefined
    const removedFromBranch = removedArcTrail?.fromBranch
    const newArcTrail = current.arcTrail.slice(0, -1)
    
    // 更新状态：移除最后一条弧线，并从该宫位的selectedLabelsPerBranch中移除该label
    updateBranchState(rootBranch, (state) => {
      const newSelectedLabelsPerBranch = { ...state.selectedLabelsPerBranch }
      if (removedFromBranch && removedLabel) {
        newSelectedLabelsPerBranch[removedFromBranch] = {
          ...(newSelectedLabelsPerBranch[removedFromBranch] || { A: false, B: false, C: false, D: false }),
          [removedLabel]: false,
        }
      }
      return {
        ...state,
        arcTrail: newArcTrail,
        selectedLabelsPerBranch: newSelectedLabelsPerBranch,
      }
    })

    // 如果还有弧线，菜单移动到最后弧线的终点
    if (newArcTrail.length > 0) {
      const lastArcTrail = newArcTrail[newArcTrail.length - 1]
      setArcMenu({
        branch: lastArcTrail.toBranch,
        rootBranch: rootBranch,
        isFromArc: true,
      })
    } else {
      // 如果没有弧线了，关闭菜单（不跳回 root menu）
      setArcMenu(null)
    }
  }

  const getArcColorInfoByLabel = (label: 'A' | 'B' | 'C' | 'D') => {
    const mutagenKey = mutagenKeyByLabel[label]
    const mutagenType = getMutagenType(mutagenKey)
    return MUTAGEN_COLORS[mutagenType] || MUTAGEN_COLORS[mutagenKey]
  }

  useEffect(() => {
    resetAllArcChains()
  }, [resetVersion])

  // 清理過期的臨時對宮直線（3 秒後消失）、並觸發動畫重繪
  useEffect(() => {
    let animationFrameId: number
    
    const animate = () => {
      const now = Date.now()
      setTransientOppositeLines((prev) =>
        prev.filter((line) => now - line.createdAt < 3000)
      )
      animationFrameId = requestAnimationFrame(animate)
    }
    
    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

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

  const allArcTrails = Object.entries(branchStates).flatMap(([rootBranch, branch]) =>
    branch.arcTrail.map(arc => ({ ...arc, rootBranch }))
  )

  useEffect(() => {
    if (!selectedPalaceData) {
      setArcMenu(null)
      return
    }

    const rootBranch = selectedPalaceData.branch

    // 使用 updater 函数，处理菜单切换
    setArcMenu((prevMenu) => {
      // 如果是 Root Menu 且不是当前宫位，切换到新宫位
      if (prevMenu && !prevMenu.isFromArc && prevMenu.branch !== rootBranch) {
        return {
          branch: rootBranch,
          rootBranch,
        }
      }
      
      // 如果菜单关闭，打开新宫位的菜单
      if (!prevMenu) {
        return {
          branch: rootBranch,
          rootBranch,
        }
      }
      
      // 保持现有菜单（Branch Menu 或同宫位 Root Menu）
      return prevMenu
    })
  }, [selectedPalaceData])

  const getUnorderedPairKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`)

  // 計算二次貝塞爾曲線上給定參數t的點
  const getQuadraticBezierPoint = (
    start: { x: number; y: number },
    control: { x: number; y: number },
    end: { x: number; y: number },
    t: number,
  ) => {
    const t1 = 1 - t
    const x = t1 * t1 * start.x + 2 * t1 * t * control.x + t * t * end.x
    const y = t1 * t1 * start.y + 2 * t1 * t * control.y + t * t * end.y
    return { x, y }
  }

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
      <svg width="0" height="0">
        <defs>
          <marker
            id="arrowOrange"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#fb923c" />
          </marker>
        </defs>
      </svg>
      {allArcTrails.map((trail, trailIdx) => {
        const fromCenter = getCardCenter(trail.fromBranch)
        // 自化情況：起點和終點相同，終點使用邊緣位置
        const toCenter = trail.fromBranch === trail.toBranch 
          ? getDestinationEdgeAnchor(trail.toBranch)
          : getCardCenter(trail.toBranch)
        if (!fromCenter || !toCenter) return null

        const pairKey = getUnorderedPairKey(trail.fromBranch, trail.toBranch)
        const laneIndex = allArcTrails
          .slice(0, trailIdx)
          .filter(item => getUnorderedPairKey(item.fromBranch, item.toBranch) === pairKey)
          .length
        const pathD = buildArcPath(fromCenter, toCenter, trail.fromBranch, trail.toBranch, trail.label, laneIndex)
        if (!pathD) return null
        const colorInfo = getArcColorInfoByLabel(trail.label)

        // 找到 fromBranch 和 toBranch 对应的宫位信息
        const fromPalace = palaceData.find(p => p.branch === trail.fromBranch)
        const toPalace = palaceData.find(p => p.branch === trail.toBranch)

        // 计算弧线延伸动画
        const dx = toCenter.x - fromCenter.x
        const dy = toCenter.y - fromCenter.y
        const distance = Math.hypot(dx, dy)
        const elapsedTime = Date.now() - (trail.createdAt || Date.now())
        const drawDuration = 1200
        const drawProgress = Math.min(1, Math.max(0, elapsedTime) / drawDuration)
        
        // 虚线 offset：延伸阶段用实线从起点漸進延伸，完成后改為流动虚线
        let strokeDasharray: string
        let strokeDashoffset: number | string
        if (drawProgress < 1) {
          // 延伸阶段：实线从起点漸進延伸到终点
          const extensionLength = distance * drawProgress
          strokeDasharray = `${extensionLength},${distance}`
          strokeDashoffset = 0
        } else {
          // 完成后：4:2 虚线流动动画，更平順的循環
          strokeDasharray = "4,2"
          const flowSpeed = 40  // px/s 流動速度
          const timeAfterCompletion = elapsedTime - drawDuration
          const flowDistance = (timeAfterCompletion * flowSpeed) / 1000  // 轉換為毫秒
          strokeDashoffset = -(flowDistance % 6) // 6 = 4 (dash) + 2 (gap)，負值反向流動
        }
        
        // 虚线箭头：沿着弧线轨迹移动，使用 drawProgress 直接同步
        const arrowProgressOnCurve = drawProgress
        
        // 首先计算控制点（重复buildArcPath的逻辑）
        const nx = -dy / distance
        const ny = dx / distance
        const baseCurveOffset = Math.min(90, Math.max(32, distance * 0.18))
        const laneGap = isCompactMobile ? 12 : 16
        const curveOffset = baseCurveOffset + laneIndex * laneGap
        const orientationSign = trail.fromBranch < trail.toBranch ? 1 : -1
        const labelSign = trail.label === 'A' || trail.label === 'C' ? 1 : -1
        const direction = orientationSign * labelSign
        const controlX = (fromCenter.x + toCenter.x) / 2 + nx * curveOffset * direction
        const controlY = (fromCenter.y + toCenter.y) / 2 + ny * curveOffset * direction

        // 使用二次贝塞尔曲线计算箭头位置
        const arrowPoint = getQuadraticBezierPoint(
          fromCenter,
          { x: controlX, y: controlY },
          toCenter,
          arrowProgressOnCurve,
        )
        const arrowEndX = arrowPoint.x
        const arrowEndY = arrowPoint.y

        // 计算箭头指向的方向（切线方向）
        // 贝塞尔曲线的导数：B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
        const t = arrowProgressOnCurve
        const t1 = 1 - t
        const derivX = 2 * t1 * (controlX - fromCenter.x) + 2 * t * (toCenter.x - controlX)
        const derivY = 2 * t1 * (controlY - fromCenter.y) + 2 * t * (toCenter.y - controlY)
        const derivLen = Math.hypot(derivX, derivY)
        
        // 箭头长度
        const arrowLen = Math.min(12, distance * 0.08)
        const arrowStartX = arrowEndX - (derivX / derivLen) * arrowLen
        const arrowStartY = arrowEndY - (derivY / derivLen) * arrowLen
        const arrowPathD = `M ${arrowStartX + gridOffset.x} ${arrowStartY + gridOffset.y} L ${arrowEndX + gridOffset.x} ${arrowEndY + gridOffset.y}`

        return (
          <g key={`trail-${trailIdx}-${trail.fromBranch}-${trail.toBranch}-${trail.label}`}>
            {/* 虛線主線：與虛線箭頭一起出發到終點，延伸時就是虛線，完成後流動虛線 */}
            {drawProgress > 0 && (
              <path
                d={pathD}
                stroke={colorInfo.color}
                strokeWidth={lineStrokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                opacity={drawProgress < 1 ? drawProgress : (isCompactMobile ? 0.45 : 0.55)}
                fill="none"
              />
            )}
            {/* 虚线箭头，跟随虚线延伸和流动 */}
            {drawProgress > 0 && (
              <path
                d={arrowPathD}
                stroke={colorInfo.color}
                strokeWidth={lineStrokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                fill="none"
                opacity={drawProgress < 1 ? drawProgress : (isCompactMobile ? 0.45 : 0.55)}
                strokeLinecap="round"
                markerEnd={`url(#${colorInfo.marker})`}
              />
            )}
            {/* 点击弧线触发菜单，可从终点继续发出弧线 */}
            {fromPalace && toPalace && (
              <path
                d={pathD}
                stroke="transparent"
                strokeWidth={isCompactMobile ? 16 : 20}
                fill="transparent"
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={() => {
                  // 从弧线打开菜单：保持原始的 rootBranch，不改变链条所有权
                  setArcMenu({
                    branch: trail.toBranch, // 菜单显示位置 = 弧线终点
                    rootBranch: trail.rootBranch, // 保持原始 root，整条链属于同一个 root
                    isFromArc: true, // 标记这是从弧线触发
                  })
                }}
              />
            )}
          </g>
        )
      })}

      {/* 渲染臨時對宮直線 */}
      {transientOppositeLines.map((line) => {
        const fromCenter = getCardCenter(line.fromBranch)
        // 自化情況：起點和終點相同，終點使用邊緣位置
        const toCenter = line.fromBranch === line.toBranch
          ? getDestinationEdgeAnchor(line.toBranch)
          : getCardCenter(line.toBranch)
        if (!fromCenter || !toCenter) return null

        const pathD = `M ${fromCenter.x + gridOffset.x} ${fromCenter.y + gridOffset.y} L ${toCenter.x + gridOffset.x} ${toCenter.y + gridOffset.y}`
        const elapsedTime = Date.now() - line.createdAt
        const opacity = Math.max(0, 1 - elapsedTime / 3000) // 3秒內從1逐漸降到0
        
        // 計算直線長度（用於 stroke-dasharray 動畫）
        const dx = toCenter.x - fromCenter.x
        const dy = toCenter.y - fromCenter.y
        const lineLength = Math.hypot(dx, dy)
        
        // 虛線延遲 1.2 秒後才開始延伸（虛線完成後，橙線才開始）
        const arcCompletionDuration = 1200 // 虛線（弧線）完成需要 1.2 秒
        const orangeLineDuration = 1200 // 橙線延伸也需要 1.2 秒
        const elapsedAfterArcCompletion = Math.max(0, elapsedTime - arcCompletionDuration)
        const orangeDrawProgress = Math.min(1, elapsedAfterArcCompletion / orangeLineDuration)
        
        // 計算箭頭應該出現的位置：根據動畫進度從起點延伸到終點
        // 箭頭應該緊跟線條末端
        const arrowLength = Math.min(14, lineLength * 0.12)
        // 當前繪製到的位置：動畫完成後，終點應該是 toCenter
        const arrowEndX = orangeDrawProgress < 1 ? fromCenter.x + dx * orangeDrawProgress : toCenter.x
        const arrowEndY = orangeDrawProgress < 1 ? fromCenter.y + dy * orangeDrawProgress : toCenter.y
        // 箭頭從當前位置向後延伸 arrowLength 距離
        const arrowStartX = arrowEndX - (dx / lineLength) * arrowLength
        const arrowStartY = arrowEndY - (dy / lineLength) * arrowLength
        const arrowPathD = `M ${arrowStartX + gridOffset.x} ${arrowStartY + gridOffset.y} L ${arrowEndX + gridOffset.x} ${arrowEndY + gridOffset.y}`

        return (
          <g key={`opposite-line-${line.id}`}>
            {/* 橘線主線：延伸到終點，實線不虛線 */}
            {orangeDrawProgress > 0 && (
              <path
                d={pathD}
                stroke="#fb923c" // 橘色
                strokeWidth={lineStrokeWidth}
                fill="none"
                opacity={opacity}
                strokeLinecap="round"
                strokeDasharray={`${orangeDrawProgress * lineLength},${lineLength}`}
                strokeDashoffset={0}
              />
            )}
            {/* 橘線箭頭線段：與橘線一起延伸 */}
            {orangeDrawProgress > 0 && (
              <path
                d={arrowPathD}
                stroke="#fb923c" // 橘色
                strokeWidth={lineStrokeWidth}
                fill="none"
                opacity={opacity}
                strokeLinecap="round"
                markerEnd="url(#arrowOrange)"
              />
            )}
          </g>
        )
      })}

      {/* 隱藏待選弧線（實線），只显示已完成的虛線弧線 */}

      {arcMenu && (() => {
        const center = getCardCenter(arcMenu.branch)
        const cardRect = getCardRectRelativeToGrid(arcMenu.branch)
        if (!center || !cardRect) return null
        
        const panelWidth = Math.round(cardRect.width * 0.9)
        const panelHeight = isCompactMobile ? 90 : 130
        const hasArcs = (branchStates[arcMenu.rootBranch] || EMPTY_BRANCH_STATE).arcTrail.length > 0
        
        return (
        <foreignObject
          x={center.x + gridOffset.x - panelWidth / 2}
          y={center.y + gridOffset.y - panelHeight / 2}
          width={panelWidth}
          height={panelHeight}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div 
            className={`relative inline-flex w-full flex-col gap-2 rounded-xl border text-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md p-2 ${
              arcMenu.isFromArc 
                ? 'border-slate-400/70 bg-slate-400/85' 
                : 'border-slate-300/70 bg-gray-200/90'
            }`}
            style={{ pointerEvents: 'auto' }}
          >
            {/* 关闭按钮 */}
            <button
              type="button"
              className="absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center rounded-full bg-slate-600 text-white hover:bg-slate-700 transition-colors"
              onClick={() => {
                // 關閉菜單時，也清除宮位選擇，下次點擊才能重新打開菜單
                setArcMenu(null)
                setSelectedPalace(null)
              }}
              title="Close menu"
            >
              <span className="text-xs font-bold leading-none">×</span>
            </button>
            <div className="grid grid-cols-2 gap-1">
              {(['A', 'B', 'C', 'D'] as const).map((label) => {
                const currentBranch = arcMenu.branch
                const isSelected = (branchStates[arcMenu.rootBranch]?.selectedLabelsPerBranch?.[currentBranch]?.[label] ?? false)
                return (
                <button
                  key={label}
                  type="button"
                  className={`h-6 w-6 rounded border text-[13px] font-semibold leading-none transition-colors ${
                    isSelected
                      ? 'border-blue-400/80 bg-blue-200/80 text-blue-700 hover:bg-blue-300/80'
                      : 'border-white/50 bg-white/60 text-slate-700 hover:bg-white/85'
                  }`}
                  onClick={() => {
                    const rootBranch = arcMenu.rootBranch
                    
                    // 如果是从弧线触发，从终点创建新弧线（新 branch）
                    if (arcMenu.isFromArc) {
                      // 从菜单所在的宫位（终点）出发
                      const currentBranch = arcMenu.branch // 菜单显示的位置 = 弧线终点
                      const targetPalaceFromMenu = palaceData.find(p => p.branch === currentBranch)
                      if (!targetPalaceFromMenu) return
                      
                      const sihuaMap = SIHUA_BY_GAN[targetPalaceFromMenu.stem]
                      if (!sihuaMap) return
                      
                      // 检查该宫位的该 label 是否已被选中（每个宫位独立）
                      const currentBranchLabels = branchStates[rootBranch]?.selectedLabelsPerBranch?.[currentBranch] || { A: false, B: false, C: false, D: false }
                      const isCurrentlySelected = currentBranchLabels[label as 'A' | 'B' | 'C' | 'D']
                      
                      if (isCurrentlySelected) {
                        // 移除从该宫位出发的该 label 的弧线
                        const newArcTrail = (branchStates[rootBranch]?.arcTrail || []).filter(
                          arc => !(arc.fromBranch === currentBranch && arc.label === label)
                        )
                        updateBranchState(rootBranch, (state) => {
                          const newSelectedLabelsPerBranch = { ...state.selectedLabelsPerBranch }
                          newSelectedLabelsPerBranch[currentBranch] = {
                            ...(newSelectedLabelsPerBranch[currentBranch] || { A: false, B: false, C: false, D: false }),
                            [label]: false,
                          }
                          return {
                            ...state,
                            arcTrail: newArcTrail,
                            selectedLabelsPerBranch: newSelectedLabelsPerBranch,
                          }
                        })
                        // 保持菜单打开以支持继续复选
                        setArcMenu({
                          branch: currentBranch,
                          rootBranch,
                          isFromArc: true,
                        })
                      } else {
                        // 添加该 label 的新弧线
                        const mutagenKeyMap: Record<'A' | 'B' | 'C' | 'D', string> = {
                          'A': '化禄',
                          'B': '化权',
                          'C': '化科',
                          'D': '化忌',
                        }
                        const mutagenKey = mutagenKeyMap[label as 'A' | 'B' | 'C' | 'D']
                        const mutagenStar = sihuaMap[mutagenKey]
                        if (!mutagenStar) return
                        
                        const mutagenStarCandidates = getChineseVariantCandidates(mutagenStar)
                        
                        // 找到目标宫位
                        let targetPalace: PalaceData | null = null
                        for (const palace of palaceData) {
                          const allStars = [...palace.majorStars, ...palace.minorStars]
                          if (allStars.some(s => mutagenStarCandidates.includes(s.name))) {
                            targetPalace = palace
                            break
                          }
                        }
                        
                        if (targetPalace) {
                          const newArcTrail = [
                            ...(branchStates[rootBranch]?.arcTrail || []),
                            {
                              fromBranch: currentBranch,
                              toBranch: targetPalace.branch,
                              label: label as 'A' | 'B' | 'C' | 'D',
                              createdAt: Date.now(),
                            },
                          ]
                          
                          updateBranchState(rootBranch, (state) => {
                            const newSelectedLabelsPerBranch = { ...state.selectedLabelsPerBranch }
                            newSelectedLabelsPerBranch[currentBranch] = {
                              ...(newSelectedLabelsPerBranch[currentBranch] || { A: false, B: false, C: false, D: false }),
                              [label]: true,
                            }
                            return {
                              ...state,
                              arcTrail: newArcTrail,
                              selectedLabelsPerBranch: newSelectedLabelsPerBranch,
                            }
                          })
                          
                          // 添加臨時對宮直線（3秒後自動消失）
                          const oppositeToMerge = targetPalace.branch in OPPOSITE_PALACE 
                            ? OPPOSITE_PALACE[targetPalace.branch as keyof typeof OPPOSITE_PALACE]
                            : null
                          if (oppositeToMerge) {
                            setTransientOppositeLines((prev) => [
                              ...prev,
                              {
                                id: `${Date.now()}-${Math.random()}`,
                                fromBranch: targetPalace.branch,
                                toBranch: oppositeToMerge,
                                createdAt: Date.now(),
                              },
                            ])
                          }
                          
                          // 保持菜单打开以支持继续复选
                          setArcMenu({
                            branch: currentBranch,
                            rootBranch,
                            isFromArc: true,
                          })
                        }
                      }
                    } else {
                      // 从宫位触发（Root Menu）：toggle label（添加或移除弧线）
                      if (!selectedPalaceData) return
                      const currentBranch = selectedPalaceData.branch
                      const sihuaMap = SIHUA_BY_GAN[selectedPalaceData.stem]
                      if (!sihuaMap) return
                      
                      // 检查该宫位的该 label 是否已被选中（每个宫位独立）
                      const currentBranchLabels = branchStates[rootBranch]?.selectedLabelsPerBranch?.[currentBranch] || { A: false, B: false, C: false, D: false }
                      const isCurrentlySelected = currentBranchLabels[label as 'A' | 'B' | 'C' | 'D']
                      
                      if (isCurrentlySelected) {
                        // Root Menu toggle off：只清除該標籤的 chain，菜單保持開啟
                        const newArcTrail = (branchStates[rootBranch]?.arcTrail || []).filter(
                          arc => !(arc.fromBranch === currentBranch && arc.label === label)
                        )
                        updateBranchState(rootBranch, (state) => {
                          const newSelectedLabelsPerBranch = { ...state.selectedLabelsPerBranch }
                          newSelectedLabelsPerBranch[currentBranch] = {
                            ...(newSelectedLabelsPerBranch[currentBranch] || { A: false, B: false, C: false, D: false }),
                            [label]: false,
                          }
                          return {
                            ...state,
                            arcTrail: newArcTrail,
                            selectedLabelsPerBranch: newSelectedLabelsPerBranch,
                          }
                        })
                        // 保持菜單開啟在 Root Menu（isFromArc: false）
                        setArcMenu({
                          branch: currentBranch,
                          rootBranch,
                          isFromArc: false,
                        })
                      } else {
                        // 添加该 label 的弧线
                        const mutagenKeyMap: Record<'A' | 'B' | 'C' | 'D', string> = {
                          'A': '化禄',
                          'B': '化权',
                          'C': '化科',
                          'D': '化忌',
                        }
                        const mutagenKey = mutagenKeyMap[label as 'A' | 'B' | 'C' | 'D']
                        const mutagenStar = sihuaMap[mutagenKey]
                        if (!mutagenStar) return
                        
                        const mutagenStarCandidates = getChineseVariantCandidates(mutagenStar)
                        
                        // 找到目标宫位
                        let targetPalace: PalaceData | null = null
                        for (const palace of palaceData) {
                          const allStars = [...palace.majorStars, ...palace.minorStars]
                          if (allStars.some(s => mutagenStarCandidates.includes(s.name))) {
                            targetPalace = palace
                            break
                          }
                        }
                        
                        if (targetPalace) {
                          const newArcTrail = [
                            ...(branchStates[rootBranch]?.arcTrail || []),
                            {
                              fromBranch: currentBranch,
                              toBranch: targetPalace.branch,
                              label: label as 'A' | 'B' | 'C' | 'D',
                              createdAt: Date.now(),
                            },
                          ]
                          
                          updateBranchState(rootBranch, (state) => {
                            const newSelectedLabelsPerBranch = { ...state.selectedLabelsPerBranch }
                            newSelectedLabelsPerBranch[currentBranch] = {
                              ...(newSelectedLabelsPerBranch[currentBranch] || { A: false, B: false, C: false, D: false }),
                              [label]: true,
                            }
                            return {
                              ...state,
                              arcTrail: newArcTrail,
                              selectedLabelsPerBranch: newSelectedLabelsPerBranch,
                            }
                          })
                          
                          // 添加臨時對宮直線（3秒後自動消失）
                          const oppositeToMerge = targetPalace.branch in OPPOSITE_PALACE 
                            ? OPPOSITE_PALACE[targetPalace.branch as keyof typeof OPPOSITE_PALACE]
                            : null
                          if (oppositeToMerge) {
                            setTransientOppositeLines((prev) => [
                              ...prev,
                              {
                                id: `${Date.now()}-${Math.random()}`,
                                fromBranch: targetPalace.branch,
                                toBranch: oppositeToMerge,
                                createdAt: Date.now(),
                              },
                            ])
                          }
                          
                          // 保持菜单打开以支持继续复选
                          setArcMenu({
                            branch: currentBranch,
                            rootBranch,
                            isFromArc: false,
                          })
                        }
                      }
                    }
                  }}
                >
                  {label}
                </button>
              )
              })}
            </div>
            {arcMenu.isFromArc && (
            <div className="flex items-center justify-between gap-1">
              <HoverHint content="Undo" className="flex-1">
                <button
                  type="button"
                  disabled={!hasArcs}
                  className={`flex-1 flex h-6 items-center justify-center rounded-lg border font-medium transition-colors ${
                    hasArcs
                      ? 'border-yellow-200/60 bg-yellow-100/70 text-yellow-700 hover:bg-yellow-100'
                      : 'border-slate-200/40 bg-slate-100/40 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (hasArcs) {
                      undoOneArcStep(arcMenu.rootBranch)
                    }
                  }}
                >
                  <img src={UndoIcon} alt="Undo" className="w-3.5 h-3.5" />
                </button>
              </HoverHint>
              <HoverHint content="Clean Chain" className="flex-1">
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
                      cleanCurrentChain()
                    }
                  }}
                >
                  <img src={DeleteIcon} alt="Clean" className="w-3.5 h-3.5" />
                </button>
              </HoverHint>
            </div>
            )}
            </div>
          </foreignObject>
        )
      })()}
    </>
  )
}
