import { cloneElement, isValidElement, useId, type ReactElement } from 'react'

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
  const tooltipPositionClass = position === 'bottom'
    ? 'top-full mt-1.5'
    : 'bottom-full mb-1.5'

  if (!isValidElement(children)) {
    return children
  }

  return (
    <span className={`hover-hint-trigger ${className}`.trim()}>
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