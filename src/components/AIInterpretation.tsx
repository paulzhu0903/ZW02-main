/* ============================================================
   AI 解读组件
   ============================================================ */

import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChartStore, useSettingsStore, useContentCacheStore } from '@/stores'
import { extractKnowledge, buildChartIndicators, buildPromptContext } from '@/knowledge'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { getSystemPrompt, buildUserPrompt } from '@/lib/prompts'
import { Button } from '@/components/ui'
import { t } from '@/lib/i18n'

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

  const buildPromptPreview = useCallback(() => {
    if (!chart || !birthInfo) return null

    const knowledge = extractKnowledge(chart, birthInfo.year)
    const indicators = buildChartIndicators(chart, birthInfo.year, knowledge)

    if (import.meta.env.DEV) {
      console.log('[AIInterpretation] current indicators index:', indicators)
    }

    const indicatorsJson = JSON.stringify(indicators, null, 2)
    const contextStr = buildPromptContext(knowledge, language)

    const userMessage = buildUserPrompt({
      language,
      indicatorsJson,
      contextStr,
    })

    const systemMessage = getSystemPrompt(language)

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
            <button
              type="button"
              onClick={handleTogglePrompt}
              title={t('ai.promptHintNoApi', language)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap"
            >
              {showPrompt ? t('ai.hidePrompt', language) : t('ai.showPrompt', language)}
            </button>
          )}
          {currentSettings.apiKey && (
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors whitespace-nowrap"
            >
              {copied ? t('fortune.copied', language) : t('fortune.copyPrompt', language)}
            </button>
          )}
          <Button
            onClick={currentSettings.apiKey ? handleInterpret : handleTogglePrompt}
            disabled={loading}
            size="sm"
            variant="gold"
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
