import { cloneElement, isValidElement, useId, useRef, type ReactElement } from 'react'

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
  
  const tooltipPositionClass = position === 'bottom'
    ? 'top-full mt-1.5'
    : 'bottom-full mb-1.5'

  const showTooltip = () => {
    if (triggerRef.current) {
      const bubble = triggerRef.current.querySelector('.hover-hint-bubble') as HTMLElement
      if (bubble) {
        bubble.style.opacity = '1'
        bubble.style.visibility = 'visible'
      }
    }
  }

  const hideTooltip = () => {
    if (triggerRef.current) {
      const bubble = triggerRef.current.querySelector('.hover-hint-bubble') as HTMLElement
      if (bubble) {
        bubble.style.opacity = '0'
        bubble.style.visibility = 'hidden'
      }
    }
  }

  if (!isValidElement(children)) {
    return children
  }

  return (
    <span 
      ref={triggerRef}
      className={`hover-hint-trigger ${className}`.trim()}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={showTooltip}
      onTouchEnd={hideTooltip}
    >
      {cloneElement(children, {
        'aria-describedby': tooltipId,
      })}
      <span
        id={tooltipId}
        role="tooltip"
        className={`hover-hint-bubble ${tooltipPositionClass}`}
      >
        {content}
      </span>
    </span>
  )
}