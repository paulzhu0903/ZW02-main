/* ============================================================
   事件卡片组件
   ============================================================

   涨 (positive): 金色闪光 + 上升箭头
   跌 (negative): 紫色脉冲 + 警示风格
   ============================================================ */

import { useState } from 'react'
import type { EventData } from '@/lib/fortune-score'

interface EventCardProps {
  event: EventData
  description?: string
  onRequestDescription: () => void
}

export function EventCard({
  event,
  description,
  onRequestDescription,
}: EventCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isPositive = event.type === 'positive'

  const handleRequestDescription = () => {
    setIsLoading(true)
    onRequestDescription()
  }

  return (
    <div
      className={`
        group relative overflow-hidden
        p-4 rounded-xl
        transition-all duration-300
        ${isPositive
          ? 'bg-gradient-to-br from-gold/10 to-amber-500/5 border border-gold/20 hover:border-gold/30'
          : 'bg-gradient-to-br from-rose-500/10 to-purple-500/5 border border-rose-500/20 hover:border-rose-500/30'
        }
      `}
    >
      {/* 闪光效果 */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-50
          transition-opacity duration-500
          ${isPositive
            ? 'bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.05),transparent_70%)]'
          }
        `}
      />

      {/* 顶部发光线 */}
      <div
        className={`
          absolute top-0 left-0 right-0 h-px
          ${isPositive
            ? 'bg-gradient-to-r from-transparent via-gold/40 to-transparent'
            : 'bg-gradient-to-r from-transparent via-rose-500/40 to-transparent'
          }
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
        `}
      />

      {/* 脉冲点 */}
      <div
        className={`
          absolute top-3 right-3
          w-2 h-2 rounded-full
          ${isPositive ? 'bg-gold' : 'bg-rose-500'}
          ${isLoading ? 'animate-ping' : ''}
        `}
      />
      <div
        className={`
          absolute top-3 right-3
          w-2 h-2 rounded-full
          ${isPositive ? 'bg-gold' : 'bg-rose-500'}
        `}
      />

      {/* 内容 */}
      <div className="relative">
        {/* 标题行 */}
        <div className="flex items-center gap-2 mb-2">
          {/* 趋势图标 */}
          <span
            className={`
              text-lg
              ${isPositive ? 'text-gold' : 'text-rose-400'}
            `}
          >
            {isPositive ? '↗' : '↘'}
          </span>

          {/* 标题 */}
          <h4
            className={`
              font-medium
              ${isPositive ? 'text-gold' : 'text-rose-400'}
            `}
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {event.title}
          </h4>

          {/* 性质标签 */}
          <span
            className={`
              px-2 py-0.5 rounded-full text-xs
              ${isPositive
                ? 'bg-gold/20 text-gold'
                : 'bg-rose-500/20 text-rose-400'
              }
            `}
          >
            {isPositive ? '吉' : '凶'}
          </span>
        </div>

        {/* 星曜标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {event.stars.map((star, idx) => (
            <span
              key={idx}
              className={`
                px-2 py-0.5 rounded text-xs
                ${isPositive
                  ? 'bg-amber-500/10 text-amber-300/80'
                  : 'bg-purple-500/10 text-purple-300/80'
                }
              `}
            >
              {star}
            </span>
          ))}
        </div>

        {/* 描述 (LLM 生成) */}
        <div
          className={`
            text-sm leading-relaxed
            transition-all duration-300
            mb-3
            ${description ? 'opacity-100' : 'opacity-60'}
          `}
          style={{ fontFamily: 'var(--font-brush)' }}
        >
          {description ? (
            description
          ) : (
            <span className="text-text-muted text-xs">
              點擊「確定」按鈕讓 AI 為你詳細解讀這個事件
            </span>
          )}
        </div>

        {/* 确定按钮 */}
        {!description && (
          <button
            onClick={handleRequestDescription}
            disabled={isLoading}
            className={`
              w-full py-2 px-3 rounded-lg text-xs font-medium
              transition-all duration-200
              ${isPositive
                ? 'bg-gold/20 text-gold hover:bg-gold/30 disabled:opacity-50'
                : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 disabled:opacity-50'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                AI 解讀中...
              </span>
            ) : (
              '確定'
            )}
          </button>
        )}
      </div>

      {/* 底部渐变 */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-8
          ${isPositive
            ? 'bg-gradient-to-t from-gold/3 to-transparent'
            : 'bg-gradient-to-t from-rose-500/3 to-transparent'
          }
          transition-opacity duration-300
        `}
      />
    </div>
  )
}
