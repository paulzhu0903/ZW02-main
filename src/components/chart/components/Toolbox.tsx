/**
 * 可拖動的Pill-shaped Toolbox組件
 * 收納五個常用按鈕：三方四正、bubble hint、反背檢查、飛宮、查詢時間表
 */

import { useState, useRef, useEffect } from 'react'
import { HoverHint } from '@/components/ui'
import TriIcon from '@/icons/Tri.svg'
import HintIcon from '@/icons/Hint.svg'
import CounterIcon from '@/icons/Counter.svg'
import FlyingIcon from '@/icons/Flying.svg'
import CalendarIcon from '@/icons/calendar.svg'

interface ToolboxProps {
  showSanFangSiZheng?: boolean
  onToggleSanFangSiZheng?: () => void
  showBubbleHint?: boolean
  onToggleBubbleHint?: () => void
  showReversalCheck?: boolean
  onToggleReversalCheck?: () => void
  showFlyGongToolbox?: boolean
  onToggleFlyGongToolbox?: () => void
  onTimeTableClick?: () => void
}

export function Toolbox({
  showSanFangSiZheng,
  onToggleSanFangSiZheng,
  showBubbleHint,
  onToggleBubbleHint,
  showReversalCheck,
  onToggleReversalCheck,
  showFlyGongToolbox,
  onToggleFlyGongToolbox,
  onTimeTableClick
}: ToolboxProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const toolboxRef = useRef<HTMLDivElement>(null)
  const dragStartPosRef = useRef({ x: 0, y: 0 })
  const hasMovedDuringDragRef = useRef(false)
  const dragThreshold = 5 // 拖動閾值（像素）

  // 設置預設位置在內容區域寬度 3/4 處
  useEffect(() => {
    const setDefaultPosition = () => {
      const toolboxWidth = 40 // 漢堡菜單寬度
      const toolboxHeight = 40 // 漢堡菜單高度
      const contentMaxWidth = 600 // 主頁內容最大寬度
      
      // 內容區域的起始 x 坐標（居中）
      const contentStartX = (window.innerWidth - contentMaxWidth) / 2
      
      // 公式：x = contentStartX + 3 * contentMaxWidth / 4 - 漢堡寬度 / 2
      const xPosition = contentStartX + (3 * contentMaxWidth / 4) - (toolboxWidth / 2)
      
      // y 軸保持在中宮右下角位置
      const centerInfoEl = document.querySelector('[data-centerinfo]') as HTMLElement
      const yPosition = centerInfoEl 
        ? centerInfoEl.getBoundingClientRect().bottom - toolboxHeight - 8
        : window.innerHeight - toolboxHeight - 20

      setPosition({
        x: xPosition,
        y: yPosition
      })
    }

    // 在下一幀進行設置，確保 DOM 完全渲染
    requestAnimationFrame(() => {
      setDefaultPosition()
    })

    // 監聽視窗大小變化
    window.addEventListener('resize', setDefaultPosition)
    return () => window.removeEventListener('resize', setDefaultPosition)
  }, [])

  // 監聽中宮元素變化，確保位置始終正確
  useEffect(() => {
    if (isDragging || isExpanded) return // 拖動或展開時不調整位置

    const observer = new MutationObserver(() => {
      const toolboxWidth = 40
      const toolboxHeight = 40
      const contentMaxWidth = 600 // 主頁內容最大寬度
      
      // 內容區域的起始 x 坐標（居中）
      const contentStartX = (window.innerWidth - contentMaxWidth) / 2
      
      // 公式：x = contentStartX + 3 * contentMaxWidth / 4 - 漢堡寬度 / 2
      const xPosition = contentStartX + (3 * contentMaxWidth / 4) - (toolboxWidth / 2)
      
      // y 軸保持在中宮右下角位置
      const centerInfoEl = document.querySelector('[data-centerinfo]') as HTMLElement
      const yPosition = centerInfoEl 
        ? centerInfoEl.getBoundingClientRect().bottom - toolboxHeight - 8
        : window.innerHeight - toolboxHeight - 20

      setPosition({
        x: xPosition,
        y: yPosition
      })
    })

    const centerInfoEl = document.querySelector('[data-centerinfo]') as HTMLElement
    if (centerInfoEl) {
      observer.observe(centerInfoEl, { 
        attributes: true, 
        subtree: true, 
        childList: true 
      })
    }

    return () => observer.disconnect()
  }, [isDragging, isExpanded])

  // 處理鼠標/觸摸按下 - 區分點擊和拖動
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    hasMovedDuringDragRef.current = false
    setIsDragging(true)
  }

  // 處理觸摸開始
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return // 只支持單點觸摸

    dragStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    hasMovedDuringDragRef.current = false
    setIsDragging(true)
  }

  // 處理拖動和點擊（滑鼠和觸摸）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - dragStartPosRef.current.x
      const deltaY = e.clientY - dragStartPosRef.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 只有移動超過閾值時，才真正開始拖動
      if (distance > dragThreshold) {
        hasMovedDuringDragRef.current = true
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }))
        dragStartPosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStartPosRef.current.x
      const deltaY = touch.clientY - dragStartPosRef.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 只有移動超過閾值時，才真正開始拖動
      if (distance > dragThreshold) {
        hasMovedDuringDragRef.current = true
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }))
        dragStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      }
    }

    const handleMouseUp = () => {
      // 如果沒有足夠的移動，則視為點擊
      if (isDragging && !hasMovedDuringDragRef.current) {
        setIsExpanded(true)
      }
      setIsDragging(false)
    }

    const handleTouchEnd = () => {
      // 如果沒有足夠的移動，則視為點擊
      if (isDragging && !hasMovedDuringDragRef.current) {
        setIsExpanded(true)
      }
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging])

  // 關閉toolbox
  const closeToolbox = () => {
    setIsExpanded(false)
  }

  // 按鈕從右往左排列（展開時）
  const buttons = [
    {
      key: 'timeTable',
      icon: CalendarIcon,
      alt: '查詢大限、流年、流月、流日、流時',
      tooltip: '查詢大限、流年、流月、流日、流時',
      active: false,
      onClick: onTimeTableClick
    },
    {
      key: 'flyGong',
      icon: FlyingIcon,
      alt: '飛宮',
      tooltip: '飛宮',
      active: showFlyGongToolbox,
      onClick: onToggleFlyGongToolbox
    },
    {
      key: 'reversalCheck',
      icon: CounterIcon,
      alt: '反背檢查',
      tooltip: '反背檢查',
      active: showReversalCheck,
      onClick: onToggleReversalCheck
    },
    {
      key: 'bubbleHint',
      icon: HintIcon,
      alt: '宮位提示',
      tooltip: '宮位提示',
      active: showBubbleHint,
      onClick: onToggleBubbleHint
    },
    {
      key: 'sanFangSiZheng',
      icon: TriIcon,
      alt: '三方四正',
      tooltip: '三方四正',
      active: showSanFangSiZheng,
      onClick: onToggleSanFangSiZheng
    }
  ]

  // 計算展開時的左邊界位置（使 pill 的右圓心與漢堡中心對齐）
  const expandedWidth = 240 // pill shape 展開寬度（調整以適應按鈕寬度）
  const collapsedWidth = 40 // 圓形寬度
  const adjustedLeft = isExpanded 
    ? position.x + collapsedWidth - expandedWidth
    : position.x

  return (
    <div
      ref={toolboxRef}
      className={`fixed z-50 ${!isDragging ? 'transition-all duration-300' : ''}`}
      style={{
        left: `${adjustedLeft}px`,
        top: `${position.y}px`,
        width: isExpanded ? `${expandedWidth}px` : `${collapsedWidth}px`,
        cursor: isDragging ? 'grabbing' : (isExpanded ? 'default' : 'grab')
      }}
    >
      {isExpanded ? (
        // 展開狀態：從右往左排列的按鈕 + X關閉按鈕
        <div 
          className="flex flex-row-reverse items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-gray-200" 
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* 拖動句柄 */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="flex items-center justify-center px-2 cursor-grab hover:bg-gray-100 rounded transition-colors"
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              closeToolbox()
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
          {buttons.map((button) => {
            const handleButtonClick = button.onClick
            if (!handleButtonClick) return null

            return (
              <HoverHint key={button.key} content={button.tooltip} position="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleButtonClick()
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                    button.active
                      ? 'bg-cyan-400 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <img src={button.icon} alt={button.alt} className="w-4 h-4" />
                </button>
              </HoverHint>
            )
          })}
        </div>
      ) : (
        // 收起狀態：藍底圓形漢堡菜單
        <div
          ref={toolboxRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-grab hover:bg-blue-600 transition-colors shadow-lg"
        >
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-white rounded"></div>
            <div className="w-3 h-0.5 bg-white rounded"></div>
            <div className="w-3 h-0.5 bg-white rounded"></div>
          </div>
        </div>
      )}
    </div>
  )
}