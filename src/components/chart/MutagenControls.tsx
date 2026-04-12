/* ============================================================
   四化控制組件 - 顯示/隱藏控制按鈕和開關
   ============================================================ */

import type { MutagenDisplayState } from './types'

interface MutagenControlsProps {
  mutagenDisplay: MutagenDisplayState
  setMutagenDisplay: (display: MutagenDisplayState) => void
}

export function MutagenControls({ mutagenDisplay, setMutagenDisplay }: MutagenControlsProps) {
  return (
    <div className="flex flex-nowrap items-center gap-0.5 sm:gap-1.5 whitespace-nowrap shrink-0">
      {/* A/B/C/D 按鈕 */}
      {(['A', 'B', 'C', 'D'] as const).map((label) => (
        <button
          key={label}
          onClick={() => setMutagenDisplay({ ...mutagenDisplay, [label]: !mutagenDisplay[label] })}
          className={`
            w-6 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg font-bold transition-all duration-200 text-[9px] sm:text-xs flex items-center justify-center shrink-0
            ${mutagenDisplay[label]
              ? 'bg-star text-white shadow-lg'
              : 'bg-white/[0.05] text-text-secondary hover:bg-white/[0.1]'
            }
          `}
        >
          {label}
        </button>
      ))}
      
      {/* 全開/全關 Toggle Switch */}
      <div 
        className="relative inline-flex items-center cursor-pointer select-none shrink-0 ml-0.5 sm:ml-1"
        onClick={() => {
          if (Object.values(mutagenDisplay).every(v => v)) {
            setMutagenDisplay({ A: false, B: false, C: false, D: false })
          } else {
            setMutagenDisplay({ A: true, B: true, C: true, D: true })
          }
        }}
      >
        <input
          type="checkbox"
          checked={Object.values(mutagenDisplay).every(v => v)}
          onChange={() => {}}
          className="sr-only"
        />
        <div className={`
          w-7 h-4 sm:w-11 sm:h-6 rounded-full transition-all duration-200 flex items-center
          ${Object.values(mutagenDisplay).every(v => v)
            ? 'bg-star'
            : 'bg-white/[0.15]'
          }
        `}>
          <div className={`
            w-2.5 h-2.5 sm:w-4.5 sm:h-4.5 rounded-full bg-white shadow-md transition-all duration-200 transform
            ${Object.values(mutagenDisplay).every(v => v)
              ? 'translate-x-3.5 sm:translate-x-6'
              : 'translate-x-0.5 sm:translate-x-1'
            }
          `} />
        </div>
        <span className="ml-0.5 sm:ml-1 text-[8px] sm:text-[10px] font-medium text-text-secondary hidden sm:inline">
          {Object.values(mutagenDisplay).every(v => v) ? '全開' : '全關'}
        </span>
      </div>
    </div>
  )
}
