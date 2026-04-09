/* ============================================================
   Select 组件 - 高级玻璃态风格
   ============================================================ */

import type { SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  options: SelectOption[]
  error?: string
}

export function Select({ label, options, error, className = '', id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[12px] sm:text-[13px] text-text-secondary font-medium"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          id={selectId}
          className={`
            w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl
            bg-white border border-black/[0.1]
            text-[13px] sm:text-sm text-text
            transition-all duration-200
            focus:outline-none focus:bg-white
            focus:border-star focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]
            hover:bg-night-lighter hover:border-black/[0.15]
            appearance-none cursor-pointer
            pr-8 sm:pr-10
            ${error ? 'border-misfortune/50 focus:border-misfortune' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-white text-text py-2"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {/* 下拉箭头 */}
        <div
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            pointer-events-none
            text-text-muted transition-colors duration-200
            group-hover:text-text-secondary
            group-focus-within:text-star-light
          "
        >
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-[10px] sm:text-[11px] text-misfortune flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </span>
      )}
    </div>
  )
}
