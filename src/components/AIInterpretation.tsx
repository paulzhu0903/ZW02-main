/* ============================================================
   AI 解读组件
   ============================================================ */

import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChartStore, useSettingsStore, useContentCacheStore } from '@/stores'
import { extractKnowledge, buildChartIndicators, buildPromptContext } from '@/knowledge'
import type { ChartIndicators } from '@/knowledge'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { getSystemPrompt, buildUserPrompt, mapUIChartTypeToPromptChartType } from '@/lib/prompts'
import { Button, HoverHint } from '@/components/ui'
import { t, BRIGHTNESS_MAP } from '@/lib/i18n'

/* ------------------------------------------------------------
   Markdown 自定义样式组件
   ------------------------------------------------------------ */

const MarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gold mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-gold/90 mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-medium text-star-light mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-gold font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-none space-y-1.5 mb-3 pl-4">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1.5 mb-3 pl-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="relative pl-4 before:content-['◆'] before:absolute before:left-0 before:text-star/60 before:text-xs">
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-gold/40 pl-4 my-3 italic text-text-secondary">
      {children}
    </blockquote>
  ),
}

/* ============================================================
   輔助函數
   ============================================================ */

/**
 * 獲取本地化的亮度顯示名稱
 * 將中文亮度名稱（如"廟"）轉換為國際化的顯示字符
 */
function getBrightnessDisplay(brightness: string | undefined, language: 'zh-TW' | 'zh-CN'): string {
  if (!brightness) return ''
  
  const englishKey = BRIGHTNESS_MAP[brightness]
  if (!englishKey) return brightness
  
  return t(`brightness.${englishKey}`, language)
}

/* ------------------------------------------------------------
   AI 解读面板组件
   ------------------------------------------------------------ */

export function AIInterpretation() {
  const { chart, birthInfo } = useChartStore()
  const { provider, providerSettings, enableThinking, enableWebSearch, searchApiKey, language } = useSettingsStore()
  const { aiInterpretation, setAiInterpretation } = useContentCacheStore()
  const currentSettings = providerSettings[provider]

  // 显示的文本（逐字输出）
  const [displayText, setDisplayText] = useState('')
  // 完整文本（缓冲区）
  const fullTextRef = useRef('')
  // 当前显示位置
  const displayIndexRef = useRef(0)
  // 定时器
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 是否正在接收（ref 用于定时器闭包）
  const loadingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  // 是否正在输出动画
  const animating = loading
  const [error, setError] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptPreview, setPromptPreview] = useState('')
  const [copied, setCopied] = useState(false)

  // 组件挂载时，如果有缓存则直接显示
  useEffect(() => {
    if (aiInterpretation && !displayText) {
      setDisplayText(aiInterpretation)
      fullTextRef.current = aiInterpretation
      displayIndexRef.current = aiInterpretation.length
    }
  }, [aiInterpretation, displayText])

  /* ------------------------------------------------------------
     立即同步显示输出内容
     ------------------------------------------------------------ */

  const syncDisplayText = useCallback(() => {
    setDisplayText(fullTextRef.current)
    displayIndexRef.current = fullTextRef.current.length
  }, [])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  /**
   * 轉換輔星及雜曜的英文字段為中文
   * 將 type/scope 等字段轉換為中文對應值
   * 
   * iztro 庫中的星曜類型：
   * - helper: 輔星（六吉）
   * - soft: 柔和星（文昌、文曲、天魁、天鉞）
   * - tough: 剛硬星（六煞：地空、地劫、火星、鈴星、擎羊、陀羅）
   * - lucun: 祿存
   * - tianma: 天馬
   * - flower: 花曜（紅鸞、天喜）
   * - adjective: 雜曜
   */
  const convertHelperStarsToChineseFields = (helperStars: any[]): any[] => {
    if (!Array.isArray(helperStars)) return []

    // 星曜類型映射
    const typeMap: Record<string, string> = {
      // iztro 原生類型
      'helper': '輔星',           // 六吉（左輔、右弼、文昌、文曲、天魁、天鉞）
      'soft': '柔星',             // 柔和星（文昌、文曲、天魁、天鉞）
      'tough': '煞星',            // 六煞（地空、地劫、火星、鈴星、擎羊、陀羅）
      'lucun': '祿存',            // 祿存星
      'tianma': '天馬',           // 天馬星
      'flower': '花曜',           // 花曜類（紅鸞、天喜等）
      'adjective': '雜曜',        // 一般雜曜
      // 備用類型
      'positive': '吉曜',         // 吉利曜星
      'negative': '凶曜',         // 不利曜星
      'neutral': '中性曜',        // 中性曜星
    }

    // 範圍/來源映射
    const scopeMap: Record<string, string> = {
      'origin': '本宮',           // 本宮固有
      'origin-opposite': '對宮',  // 對宮傳來
      'target': '他宮',           // 其他宮位
      'self': '本身',
      'palace': '宮位',
    }

    return helperStars.map((star: any) => {
      // 如果是字符串，直接返回（向後相容）
      if (typeof star === 'string') {
        return {
          名稱: star,
          類型: '雜曜',
          範圍: '本宮',
        }
      }

      // 否則處理對象
      return {
        名稱: star.名稱 || star.name || '',
        類型: typeMap[star.類型 || star.type] || star.類型 || star.type || '雜曜',
        範圍: scopeMap[star.範圍 || star.scope] || star.範圍 || star.scope || '本宮',
      }
    })
  }

  /**
   * 為三合派轉換指標 JSON 格式
   * 從標準指標轉換為三合派所需的星曜清單與廟旺狀態
   */
  const convertToTripleHarmonyFormat = (indicators: ChartIndicators, chart: any, language: 'zh-TW' | 'zh-CN') => {
    const triremeIndicators: any[] = []

    // 遍歷 論命座標系 中的每個宮位
    if (indicators.論命座標系 && Array.isArray(indicators.論命座標系)) {
      indicators.論命座標系.forEach((palace: any) => {
        const palaceName = palace.宮位
        
        // 計算三方四正：子午卯酉方位
        // 寅午戌 (三合) / 巳酉丑 (三合) 等
        const sanFangSiZheng = calculateSanFangSiZheng(palace.地支, indicators.論命座標系)
        
        // 構建該宮位的指標
        const palaceIndicator = {
          宮位: palaceName,
          主星: palace.主星 || [],
          亮度: extractBrightness(chart, palaceName, language), // 從命盤中提取廟旺狀態
          輔星: convertHelperStarsToChineseFields(palace.輔星及雜曜 || []), // 轉換英文字段為中文
          三方四正會照: sanFangSiZheng,
          四化引動: {
            生年: extractBirthYearMutagen(indicators.基本資料?.生年四化 || [], palaceName),
            大限: extractDecadalMutagen(indicators.運限焦點?.當前大限)
          }
        }
        triremeIndicators.push(palaceIndicator)
      })
    }

    return triremeIndicators
  }

  /**
   * 計算三方四正宮位
   */
  const calculateSanFangSiZheng = (currentBranch: string, allPalaces: any[]) => {
    const branchOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const currentIndex = branchOrder.indexOf(currentBranch)
    if (currentIndex === -1) return {}

    // 計算三合：+4、+8（120度間隔）
    const trine1Index = (currentIndex + 4) % 12
    const trine2Index = (currentIndex + 8) % 12

    const result: Record<string, string[]> = {}

    // 找到三方四正宮位對應的星曜
    allPalaces.forEach((palace: any) => {
      const idx = branchOrder.indexOf(palace.地支)
      if (idx === trine1Index || idx === trine2Index) {
        result[palace.宮位] = palace.主星 || []
      }
    })

    return result
  }

  /**
   * 從命盤中提取宮位的廟旺狀態
   */
  const extractBrightness = (chart: any, palaceName: string, language: 'zh-TW' | 'zh-CN'): string => {
    const palaces = (chart as any)?.palaces || []
    const palace = palaces.find((p: any) => p?.name === palaceName)
    if (!palace) return ''

    // 取第一個主星的亮度
    const majorStars = (palace as any)?.majorStars || []
    if (majorStars.length > 0 && majorStars[0]?.brightness) {
      return getBrightnessDisplay(majorStars[0].brightness, language)
    }
    return ''
  }



  /**
   * 提取該宮位的生年四化
   */
  const extractBirthYearMutagen = (birthYearMutagens: any[], palaceName: string): string => {
    if (!Array.isArray(birthYearMutagens)) return ''
    
    const mutagensInPalace = birthYearMutagens.filter((m: any) => m.宮位 === palaceName)
    if (mutagensInPalace.length === 0) return ''

    const groupedByGan = new Map<string, string[]>()
    mutagensInPalace.forEach((m: any) => {
      // 從四化類型反推干（需要從命盤數據中提取）
      // 暫時使用簡化版本
      const mutagenType = m.四化
      if (!groupedByGan.has(m.星曜)) groupedByGan.set(m.星曜, [])
      groupedByGan.get(m.星曜)!.push(mutagenType)
    })

    // 格式化為 "干(星曜四化、星曜四化...)"
    return Array.from(groupedByGan.entries())
      .map(([star, mutagens]) => `${star}(${mutagens.join('、')})`)
      .join(' ')
  }

  /**
   * 提取該宮位的大限四化
   */
  const extractDecadalMutagen = (decadalInfo: any): string => {
    if (!decadalInfo) return ''
    
    // 大限信息中包含四化列表
    const mutagens = decadalInfo.四化 || []
    if (mutagens.length === 0) return ''

    return `${decadalInfo.天干}干(${mutagens.join('、')})`
  }

  const buildPromptPreview = useCallback(() => {
    if (!chart || !birthInfo) return null

    const { currentChartType } = useSettingsStore.getState()
    const knowledge = extractKnowledge(chart, birthInfo.year)
    const indicators = buildChartIndicators(chart, {
      year: birthInfo.year,
      month: birthInfo.month,
      day: birthInfo.day,
      hour: birthInfo.hour,
      minute: birthInfo.minute,
      gender: birthInfo.gender,
    }, knowledge)

    if (import.meta.env.DEV) {
      console.log('[AIInterpretation] current indicators index:', indicators)
    }

    // 根據盤面類型選擇 JSON 格式
    let indicatorsData: any = indicators
    if (currentChartType === 'trireme') {
      // 三合派：轉換為星曜清單與廟旺狀態格式
      indicatorsData = convertToTripleHarmonyFormat(indicators, chart, language)
    }

    const indicatorsJson = JSON.stringify(indicatorsData, null, 2)
    const contextStr = buildPromptContext(knowledge, language)

    const promptChartType = mapUIChartTypeToPromptChartType(currentChartType)

    const userMessage = buildUserPrompt({
      language,
      indicatorsJson,
      contextStr,
      chartType: promptChartType,
    })

    const systemMessage = getSystemPrompt(language, promptChartType)

    const promptText = [
      '===== System Prompt =====',
      systemMessage,
      '',
      '===== User Prompt =====',
      userMessage,
    ].join('\n')

    return {
      systemMessage,
      userMessage,
      promptText,
    }
  }, [chart, birthInfo, language])

  /* ------------------------------------------------------------
     开始解读
     ------------------------------------------------------------ */

  const handleInterpret = useCallback(async () => {
    if (loadingRef.current || loading) {
      console.warn('[AIInterpretation] duplicate request prevented')
      return
    }

    if (!chart || !birthInfo) return
    if (!currentSettings.apiKey) {
      setError(t('ai.configureApiKey', language))
      return
    }

    // 重置状态
    loadingRef.current = true
    setLoading(true)
    setError(null)
    setDisplayText('')
    fullTextRef.current = ''
    displayIndexRef.current = 0

    // 清理旧定时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      const promptData = buildPromptPreview()
      if (!promptData) return

      setPromptPreview(promptData.promptText)

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: promptData.systemMessage,
        },
        { role: 'user', content: promptData.userMessage },
      ]

      const config: LLMConfig = {
        provider,
        apiKey: currentSettings.apiKey,
        baseUrl: currentSettings.customBaseUrl || undefined,
        model: currentSettings.customModel || undefined,
        enableThinking,
        enableWebSearch,
        searchApiKey: searchApiKey || undefined,
      }

      // 流式接收，立即更新显示
      for await (const token of streamChat(config, messages)) {
        fullTextRef.current += token
        syncDisplayText()
      }

      // 保存到全局缓存
      setAiInterpretation(fullTextRef.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.failedRetry', language))
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [chart, birthInfo, provider, currentSettings, enableThinking, enableWebSearch, searchApiKey, syncDisplayText, setAiInterpretation, loading, buildPromptPreview])

  const handleTogglePrompt = useCallback(() => {
    if (!showPrompt) {
      const promptData = buildPromptPreview()
      if (promptData) {
        setPromptPreview(promptData.promptText)
      }
    }

    setShowPrompt(prev => !prev)
  }, [showPrompt, buildPromptPreview])

  const handleCopyPrompt = useCallback(() => {
    if (!promptPreview) {
      const promptData = buildPromptPreview()
      if (promptData) {
        setPromptPreview(promptData.promptText)
        navigator.clipboard.writeText(promptData.promptText).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => {
          setError(language === 'zh-TW' ? '複製失敗' : '复制失败')
        })
      }
    } else {
      navigator.clipboard.writeText(promptPreview).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        setError(language === 'zh-TW' ? '複製失敗' : '复制失败')
      })
    }
  }, [promptPreview, buildPromptPreview, language])

  if (!chart) return null

  return (
    <div
      className="
        relative p-3 sm:p-4 lg:p-6
        bg-gradient-to-br from-white/[0.04] to-transparent
        backdrop-blur-xl border border-white/[0.08] rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      "
    >
      {/* 顶部发光线 */}
      <div
        className="
          absolute top-0 left-1/2 -translate-x-1/2
          w-1/3 h-px
          bg-gradient-to-r from-transparent via-gold/50 to-transparent
        "
      />

      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-3">
        <h2
          className="
            text-base sm:text-lg lg:text-2xl font-semibold
            bg-gradient-to-r from-gold via-gold-light to-gold
            bg-clip-text text-transparent
          "
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {t('ai.title', language)}
        </h2>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentSettings.apiKey && (
            <HoverHint content={t('ai.promptHintNoApi', language)}>
              <button
                type="button"
                onClick={handleTogglePrompt}
                className="h-8 sm:h-10 min-w-[5rem] px-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap flex items-center justify-center"
              >
                {showPrompt ? t('ai.hidePrompt', language) : t('ai.showPrompt', language)}
              </button>
            </HoverHint>
          )}
          {currentSettings.apiKey && (
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="h-8 sm:h-10 min-w-[5rem] px-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap flex items-center justify-center"
            >
              {copied ? t('fortune.copied', language) : t('fortune.copyPrompt', language)}
            </button>
          )}
          <Button
            onClick={currentSettings.apiKey ? handleInterpret : handleTogglePrompt}
            disabled={loading}
            size="sm"
            variant="gold"
            className="h-8 sm:h-10 min-w-[5rem] px-2 sm:px-3 text-[10px] sm:text-xs"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-night border-t-transparent rounded-full animate-spin" />
                {t('ai.loading', language)}
              </span>
            ) : currentSettings.apiKey ? t('ai.start', language) : (showPrompt ? t('ai.hidePrompt', language) : t('ai.showPrompt', language))}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-2 sm:p-3 rounded-lg bg-misfortune/10 text-misfortune text-xs sm:text-sm mb-3 sm:mb-4 border border-misfortune/20">
          {error}
        </div>
      )}

      {showPrompt && promptPreview && (
        <div className="mb-4 rounded-xl border border-white/10 bg-night/40 overflow-hidden">
          <div className="px-3 py-2 text-[10px] sm:text-xs font-semibold text-star-light border-b border-white/10">
            {t('ai.promptPreview', language)}
          </div>
          <pre
            className="p-2 sm:p-3 text-text-secondary whitespace-pre-wrap break-words max-h-80 overflow-auto leading-relaxed text-[10px] sm:text-xs"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {promptPreview}
          </pre>
        </div>
      )}

      {/* 未配置提示 */}
      {!currentSettings.apiKey && !displayText && (
        <div className="text-text-muted text-xs sm:text-sm py-6 sm:py-8 text-center space-y-2 sm:space-y-3">
          <div className="text-2xl sm:text-3xl mb-2 sm:mb-3 opacity-30">☆</div>
          <p className="px-2">{t('ai.configureApiLong', language)}</p>
          <p className="text-[10px] sm:text-xs text-gold/80 px-2">{t('ai.promptHintNoApi', language)}</p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleTogglePrompt}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors"
            >
              {showPrompt ? t('ai.hidePrompt', language) : t('ai.showPrompt', language)}
            </button>
          </div>
        </div>
      )}

      {/* 解读内容+ Markdown 渲染 */}
      {displayText && (
        <div
          className="
            prose prose-invert max-w-none
            text-text-secondary text-xs sm:text-sm lg:text-base leading-5 sm:leading-6
          "
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {displayText}
          </ReactMarkdown>

          {/* 光标指示器 */}
          {animating && (
            <span className="inline-block w-0.5 h-5 bg-gold/80 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      )}

      {/* 加载占位 */}
      {loading && !displayText && (
        <div className="flex items-center justify-center gap-3 text-text-muted py-8 sm:py-12 text-sm sm:text-base">
          <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-star border-t-transparent rounded-full animate-spin" />
          <span>{t('ai.analyzingChart', language)}</span>
        </div>
      )}
    </div>
  )
}
