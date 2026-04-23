import { cloneElement, isValidElement, useId, useRef, useState, useEffect, type ReactElement } from 'react'

interface HoverHintProps {
  content: string
  children: ReactElement<Record<string, unknown>>
  className?: string
  position?: 'top' | 'bottom'
}

export function HoverHint({
  content,
  children,
  className = '',
  position = 'top',
}: HoverHintProps) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const tooltipPositionClass = position === 'bottom'
    ? 'top-full mt-1.5'
    : 'bottom-full mb-1.5'

  const showTooltip = () => {
    setIsVisible(true)
    // 清除之前的計時器
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    // 2秒後自動隱藏
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 2000)
  }

  const hideTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsVisible(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    showTooltip()
  }

  // 清理計時器
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  if (!isValidElement(children)) {
    return children
  }

  return (
    <span 
      ref={triggerRef}
      className={`hover-hint-trigger ${className}`.trim()}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={handleTouchStart}
    >
      {cloneElement(children, {
        'aria-describedby': tooltipId,
      })}
      <span
        id={tooltipId}
        role="tooltip"
        className={`hover-hint-bubble ${tooltipPositionClass} transition-opacity duration-200`}
        style={{
          opacity: isVisible ? 1 : 0,
          visibility: isVisible ? 'visible' : 'hidden',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {content}
      </span>
    </span>
  )
}