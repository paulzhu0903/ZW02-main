/* ============================================================
   命格金句分享卡片
   ============================================================ */

import { useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { useChartStore, useContentCacheStore, useSettingsStore } from '@/stores'
import { Button } from '@/components/ui'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------
   字体常量 (html2canvas 不支持 CSS 变量，需硬编码)
   ------------------------------------------------------------ */

const FONT_BRUSH = "'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive"
const FONT_SERIF = "'Noto Serif SC', 'Georgia', serif"

/* ------------------------------------------------------------
   天干地支转换
   ------------------------------------------------------------ */

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function yearToGanZhi(year: number): string {
  const stemIndex = (year - 4) % 10
  const branchIndex = (year - 4) % 12
  return `${STEMS[stemIndex]}${BRANCHES[branchIndex]}`
}

/* ------------------------------------------------------------
   从 AI 解读中提取金句
   ------------------------------------------------------------ */

function extractQuote(content: string): string | null {
  // 尝试匹配 "命格金句" 章节
  const sectionMatch = content.match(/###\s*陆[·.、]\s*命格金句[\s\S]*?(?=###|---|\n\n\n|$)/)
  if (sectionMatch) {
    // 提取引号内的内容
    const quotes = sectionMatch[0].match(/"([^"]+)"/g)
    if (quotes && quotes.length > 0) {
      return quotes.map(q => q.replace(/"/g, '')).join('\n')
    }
    // 尝试提取 > 引用块
    const blockQuote = sectionMatch[0].match(/>\s*[""]([^""]+)[""]/)
    if (blockQuote) {
      return blockQuote[1]
    }
  }
  return null
}

/* ------------------------------------------------------------
   获取命宫主星
   ------------------------------------------------------------ */

function getLifePalaceStars(chart: any): string {
  const lifePalace = chart?.palaces?.find((p: any) => p.name === '命宫' || p.name === '命宮')
  if (!lifePalace?.majorStars?.length) return '未知'
  return lifePalace.majorStars.map((s: any) => s.name.replace('星', '')).join('·')
}

/* ------------------------------------------------------------
   获取格局名称
   ------------------------------------------------------------ */

function getPatternName(chart: any, language: 'zh-TW' | 'zh-CN'): string | null {
  // 简化版格局判断 - 可后续扩展
  const lifePalace = chart?.palaces?.find((p: any) => p.name === '命宫' || p.name === '命宮')
  const stars = lifePalace?.majorStars?.map((s: any) => s.name) || []
  const palaceChar = language === 'zh-TW' ? '宮' : '宫'
  const hasStar = (simplified: string, traditional = simplified) => (
    stars.includes(simplified) || stars.includes(traditional)
  )

  if (hasStar('紫微') && hasStar('天府')) return `紫府同${palaceChar}格`
  if (hasStar('紫微') && hasStar('贪狼', '貪狼')) return language === 'zh-TW' ? `紫貪同${palaceChar}格` : `紫贪同${palaceChar}格`
  if (hasStar('紫微') && hasStar('天相')) return `紫相同${palaceChar}格`
  if (hasStar('太阳', '太陽') && hasStar('太阴', '太陰')) return `日月同${palaceChar}格`
  if (hasStar('天机', '天機') && hasStar('太阴', '太陰')) return language === 'zh-TW' ? '機月同梁格' : '机月同梁格'
  if (hasStar('廉贞', '廉貞') && hasStar('贪狼', '貪狼')) return language === 'zh-TW' ? `廉貪同${palaceChar}格` : `廉贪同${palaceChar}格`
  if (hasStar('武曲') && hasStar('贪狼', '貪狼')) return language === 'zh-TW' ? `武貪同${palaceChar}格` : `武贪同${palaceChar}格`

  return null
}

/* ------------------------------------------------------------
   分享卡片组件
   ------------------------------------------------------------ */

export function ShareCard() {
  const { chart, birthInfo } = useChartStore()
  const { aiInterpretation } = useContentCacheStore()
  const { language } = useSettingsStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)
  const [customQuote, setCustomQuote] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // 从 AI 解读中提取金句
  const extractedQuote = aiInterpretation ? extractQuote(aiInterpretation) : null
  const displayQuote = customQuote || extractedQuote || t('share.defaultQuote', language)

  // 命盘信息
  const ganZhi = birthInfo ? yearToGanZhi(birthInfo.year) : ''
  const gender = birthInfo?.gender === 'male' ? '乾造' : '坤造'
  const stars = chart ? getLifePalaceStars(chart) : ''
  const pattern = chart ? getPatternName(chart, language) : null
  const fiveElements = chart?.fiveElementsClass || ''

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return

    setGenerating(true)
    try {
      // 等待字体加载完成
      await document.fonts.ready

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a12',
        scale: 2,
        useCORS: true,
        logging: true,  // 开启日志
        allowTaint: true,
      })

      const dataUrl = canvas.toDataURL('image/png')

      // 创建下载链接
      const link = document.createElement('a')
      link.download = `紫微命格-${ganZhi}${gender}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('生成图片失败:', err)
      alert(`${t('share.downloadFailed', language)}: ${err instanceof Error ? err.message : t('share.unknownError', language)}`)
    } finally {
      setGenerating(false)
    }
  }, [ganZhi, gender, language])

  if (!chart || !birthInfo) {
    return (
      <div className="text-center py-12 text-text-muted">
        <div className="text-4xl mb-3 opacity-30">✦</div>
        <p>{t('share.noChart', language)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* 提示信息 */}
      {!extractedQuote && (
        <div className="text-center text-text-muted text-sm px-4">
          <p>{t('share.aiTip', language)}</p>
        </div>
      )}

      {/* 卡片预览 - 所有颜色硬编码，避免 oklab */}
      <div
        ref={cardRef}
        style={{
          width: '360px',
          height: '560px',
          background: '#0c0c18',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        {/* 外边框 - 双线描金 */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            right: '8px',
            bottom: '8px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 215, 0, 0.15)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            bottom: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 215, 0, 0.08)',
            pointerEvents: 'none',
          }}
        />

        {/* 四角装饰 */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'rgba(212, 175, 55, 0.3)', fontSize: '18px' }}>✦</div>
        <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'rgba(212, 175, 55, 0.3)', fontSize: '18px' }}>✦</div>
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', color: 'rgba(212, 175, 55, 0.3)', fontSize: '18px' }}>✦</div>
        <div style={{ position: 'absolute', bottom: '16px', right: '16px', color: 'rgba(212, 175, 55, 0.3)', fontSize: '18px' }}>✦</div>

        {/* 内容区 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* 顶部星辰装饰线 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '1px', background: 'rgba(212, 175, 55, 0.3)' }} />
            <span style={{ color: 'rgba(212, 175, 55, 0.5)', fontSize: '12px', letterSpacing: '0.1em' }}>☆ · ☆ · ☆</span>
            <div style={{ width: '48px', height: '1px', background: 'rgba(212, 175, 55, 0.3)' }} />
          </div>

          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2
              style={{
                fontSize: '20px',
                letterSpacing: '0.2em',
                color: '#FCD34D',
                fontFamily: FONT_SERIF,
                margin: 0,
              }}
            >
              {t('share.cardTitle', language)}
            </h2>
          </div>

          {/* 金句主体 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                fontSize: '18px',
                lineHeight: '2',
                color: '#FFFBEB',
                whiteSpace: 'pre-line',
                fontFamily: FONT_BRUSH,
                textAlign: 'center',
                padding: '0 16px',
              }}
            >
              "{displayQuote}"
            </div>
          </div>

          {/* 分隔线 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '1px', background: 'rgba(212, 175, 55, 0.3)' }} />
            <span style={{ color: 'rgba(212, 175, 55, 0.4)', fontSize: '12px' }}>❖</span>
            <div style={{ width: '64px', height: '1px', background: 'rgba(212, 175, 55, 0.3)' }} />
          </div>

          {/* 命盘信息 */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '14px',
                letterSpacing: '0.05em',
                color: 'rgba(252, 211, 77, 0.8)',
                fontFamily: FONT_SERIF,
                margin: '0 0 8px 0',
              }}
            >
              {t('share.lifePalaceStars', language)}：{stars}
            </p>
            {pattern && (
              <p style={{ fontSize: '12px', color: 'rgba(212, 175, 55, 0.6)', margin: '0 0 4px 0' }}>
                {t('share.pattern', language)}：{pattern}
              </p>
            )}
            <p style={{ fontSize: '12px', color: 'rgba(212, 175, 55, 0.5)', margin: 0 }}>
              {fiveElements}
            </p>
          </div>

          {/* 印章 + 年份 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: '1px solid rgba(255, 180, 0, 0.4)',
                background: 'rgba(255, 180, 0, 0.05)',
                color: 'rgba(212, 175, 55, 0.7)',
                fontSize: '14px',
                fontFamily: FONT_SERIF,
              }}
            >
              命
            </div>
            <p style={{ color: 'rgba(252, 211, 77, 0.6)', fontSize: '14px', letterSpacing: '0.1em', margin: 0 }}>
              {ganZhi}年 · {gender}
            </p>
          </div>

          {/* 底部水印 */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(212, 175, 55, 0.1)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(212, 175, 55, 0.3)', fontSize: '12px', letterSpacing: '0.2em', margin: 0 }}>
              {t('share.watermark', language)}
            </p>
          </div>
        </div>
      </div>

      {/* 编辑金句 */}
      <div className="space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={customQuote}
              onChange={(e) => setCustomQuote(e.target.value)}
              placeholder={t('share.quotePlaceholder', language)}
              className="w-full h-24 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/30 resize-none"
              style={{ fontFamily: FONT_BRUSH }}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                {t('form.cancel', language)}
              </Button>
              <Button size="sm" onClick={() => setIsEditing(false)}>
                {t('form.confirm', language)}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            {t('share.customizeQuote', language)}
          </button>
        )}
      </div>

      {/* 下载按钮 */}
      <Button
        onClick={handleDownload}
        disabled={generating}
        className="w-full"
        variant="gold"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-night border-t-transparent rounded-full animate-spin" />
            {t('share.generating', language)}
          </span>
        ) : (
          t('share.saveImage', language)
        )}
      </Button>

    </div>
  )
}
