/* ============================================================
   AI 解读组件
   丝滑流式输出 + 书法字体 + Markdown 渲染
   ============================================================ */

import { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChartStore, useSettingsStore, useContentCacheStore } from '@/stores'
import { extractKnowledge, buildChartIndicators, buildPromptContext } from '@/knowledge'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { Button } from '@/components/ui'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------
   系统提示词
   ------------------------------------------------------------ */

const SYSTEM_PROMPT = `# 角色定位
你是一位精通「北派紫微斗數」與「欽天四化派」的命理師。此次解盤請**先以北派四化盤為主**，三合派與其他技法僅作輔助，不以星曜廟旺利陷作為主要論斷依據。

# 論盤核心原則
1. 優先看「來因宮、生年四化、自化／視同自化、飛星、體用、我宮／他宮」。
2. 必須先建立「北派欽天四化座標系」：各宮宮干、各宮地支、生年四化落宮、離心自化、向心自化、男女星、我宮/他宮。
3. 論述時需清楚交代能量流向，盡量用「A宮 → B宮」描述因果與體用變化。
4. 必須先做盤面結構判讀，再轉成白話，不可跳步。
5. 避免空泛雞湯、靈性話術與恐嚇語氣。
6. 若資料不足，需明說「依目前盤面資訊可先判斷…」，不可虛構。

# 北派欽天四化論斷 SOP
## 1. 確立來因宮
- 以出生年干所在之宮位為「來因宮」。
- 此宮為「體」，決定此生業力來源與生命主軸。

## 2. 定男、女星用神
- 根據生年四化所坐星曜，區分其陰陽屬性。
- 用以判斷命主與周遭人物的親疏、助力與債緣。

## 3. 分析生年四化（A / B / C / D）
- 化祿(A)：緣、財、欲望、圓滿。
- 化權(B)：權、能、成就、競爭。
- 化科(C)：名、貴人、條理、風度。
- 化忌(D)：債、執著、結局、收藏。
- 先觀察四化分佈宮位，這是命盤的靜態底色。

## 4. 觀察自化與視同自化
- 自化代表質變、反覆、消散與噴出。
- 需說清楚其對財、感情、關係與事件結果的影響。

## 5. 運用飛星串聯宮位（體用變換）
- 追蹤事件的起因、過程與結局。
- 特別關注化忌的沖照、轉忌與落點。

## 6. 配合象術心學解構心理層次
- 不只斷吉凶，還要解釋其心理根源與執著所在。
- 建議需能落實到實際行動與修心方向。

## 7. 運限推演（大限、流年、流月）
- 將大限與流年疊回本命盤。
- 說明哪一個宮位、哪一條四化線在當下最活躍。

# 輸出格式（務必依序）
## 壹· 北派四化盤摘要
- 來因宮是什麼，代表的人生主軸是什麼。
- 生年四化分佈在哪些宮位。
- 哪些自化／視同自化最關鍵。
- 目前大限／流年的焦點落在哪裡。

## 貳· 命格總斷
- 依來因宮與四化格局概括一生基調。
- 結合命宮、福德宮與自化，分析性情與內在需求。

## 參· 事業與財運
- 官祿方向：依官祿宮與飛化指出發展方向。
- 財運機緣：分析財帛宮與田宅宮，是守成、流動或財來財去。

## 肆· 婚姻與情感
- 夫妻宮與對待位的關係。
- 說明是福緣、債緣，還是彼此消耗，並給具體建議。

## 伍· 六親與人際
- 遷移、交友、父母、子女等宮位的得失互動。
- 說明誰是助力、誰是課題。

## 陸· 運勢隱憂與具體建議
- 健康提醒：依疾厄宮與相關飛化說明注意點。
- 本年／大限焦點：指出當前最需要注意的飛化忌與轉折。
- 修行課題：給出可執行的修心與行動建議。

# 表達要求
- 使用專業但白話的中文表達。
- 每段先講「盤面依據」，再講「白話解釋」。
- 保留術語，但要立刻補一句通俗說明。`

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
  const isTraditional = language === 'zh-TW'

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
    const contextStr = buildPromptContext(knowledge)

    const userMessage = `${isTraditional ? '請解讀以下命盤：' : '请解读以下命盘：'}

## ${isTraditional ? '關鍵指標 JSON' : '关键指标 JSON'}
${isTraditional
  ? '以下 JSON 是程式依命盤自動整理出的關鍵指標，請**優先依此做結構判讀**，再參考後面的補充上下文做交叉驗證。'
  : '以下 JSON 是程序依命盘自动整理出的关键指标，请**优先依此做结构判读**，再参考后面的补充上下文做交叉验证。'}

\`\`\`json
${indicatorsJson}
\`\`\`

// ## ${isTraditional ? '基本資訊' : '基本信息'}
// - ${t('chart.solarCalendar', language)}：${birthInfo.year}年${birthInfo.month}月${birthInfo.day}日
// - ${t('form.gender', language)}：${birthInfo.gender === 'male' ? t('form.male', language) : t('form.female', language)}
// - ${t('chart.fiveElementsClass', language)}：${chart.fiveElementsClass}

// ## ${isTraditional ? '補充盤面上下文' : '补充盘面上下文'}
// ${contextStr}

${isTraditional
  ? '請先依「北派欽天四化論斷 SOP」解盤，先建立座標系：各宮位天干、各宮位地支、生年四化落宮、離心自化、向心自化、男女星標記、我宮/他宮標記；再依此說明本命/大限/流年的體用關係與能量流動，最後才做白話解讀。'
  : '请先依「北派钦天四化论断 SOP」解盘，先建立坐标系：各宫位天干、各宫位地支、生年四化落宫、离心自化、向心自化、男女星标记、我宫/他宫标记；再依此说明本命/大限/流年的体用关系与能量流动，最后才做白话解读。'}`

    const systemMessage = `${SYSTEM_PROMPT}\n\n${isTraditional ? '請使用繁體中文輸出全部內容。' : '请使用简体中文输出全部内容。'}`

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
  }, [chart, birthInfo, isTraditional, language])

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

  if (!chart) return null

  return (
    <div
      className="
        relative p-6 lg:p-8
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
      <div className="flex items-center justify-between mb-6 gap-3">
        <h2
          className="
            text-xl lg:text-2xl font-semibold
            bg-gradient-to-r from-gold via-gold-light to-gold
            bg-clip-text text-transparent
          "
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {t('ai.title', language)}
        </h2>
        <div className="flex items-center gap-2">
          {currentSettings.apiKey && (
            <button
              type="button"
              onClick={handleTogglePrompt}
              title={t('ai.promptHintNoApi', language)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors"
            >
              {showPrompt ? t('ai.hidePrompt', language) : t('ai.showPrompt', language)}
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
        <div className="p-3 rounded-lg bg-misfortune/10 text-misfortune text-sm mb-4 border border-misfortune/20">
          {error}
        </div>
      )}

      {showPrompt && promptPreview && (
        <div className="mb-4 rounded-xl border border-white/10 bg-night/40 overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-star-light border-b border-white/10">
            {t('ai.promptPreview', language)}
          </div>
          <pre
            className="p-3 text-text-secondary whitespace-pre-wrap break-words max-h-80 overflow-auto leading-relaxed"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}
          >
            {promptPreview}
          </pre>
        </div>
      )}

      {/* 未配置提示 */}
      {!currentSettings.apiKey && !displayText && (
        <div className="text-text-muted text-sm py-8 text-center space-y-3">
          <div className="text-3xl mb-3 opacity-30">☆</div>
          <p>{t('ai.configureApiLong', language)}</p>
          <p className="text-xs text-gold/80">{t('ai.promptHintNoApi', language)}</p>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleTogglePrompt}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15 transition-colors"
            >
              {showPrompt ? t('ai.hidePrompt', language) : t('ai.showPrompt', language)}
            </button>
          </div>
        </div>
      )}

      {/* 解读内容 - 书法字体 + Markdown 渲染 */}
      {displayText && (
        <div
          className="
            prose prose-invert max-w-none
            text-text-secondary text-base leading-5
          "
          style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}
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
        <div className="flex items-center justify-center gap-3 text-text-muted py-12">
          <div className="w-5 h-5 border-2 border-star border-t-transparent rounded-full animate-spin" />
          <span>{t('ai.analyzingChart', language)}</span>
        </div>
      )}
    </div>
  )
}
