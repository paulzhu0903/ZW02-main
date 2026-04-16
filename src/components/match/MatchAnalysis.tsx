/* ============================================================
   双人合盘组件
   分析两人命盘的契合度
   ============================================================ */

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSettingsStore } from '@/stores'
import { generateChart, type BirthInfo, type Gender } from '@/lib/astro'
import { extractKnowledge, buildPromptContext } from '@/knowledge'
import { streamChat, type ChatMessage, type LLMConfig } from '@/lib/llm'
import { Button, Select } from '@/components/ui'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------
   年份/月份/日期选项
   ------------------------------------------------------------ */

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => ({
  value: currentYear - i,
  label: `${currentYear - i}年`,
}))
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}月`,
}))
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}日`,
}))
function getHourOptions(language: 'zh-TW' | 'zh-CN') {
  const shi = language === 'zh-TW' ? '時' : '时'

  return [
    { value: 23, label: `子${shi} (23:00-00:59)` },
    { value: 1, label: `丑${shi} (01:00-02:59)` },
    { value: 2, label: `丑${shi} (01:00-02:59)` },
    { value: 3, label: `寅${shi} (03:00-04:59)` },
    { value: 4, label: `寅${shi} (03:00-04:59)` },
    { value: 5, label: `卯${shi} (05:00-06:59)` },
    { value: 6, label: `卯${shi} (05:00-06:59)` },
    { value: 7, label: `辰${shi} (07:00-08:59)` },
    { value: 8, label: `辰${shi} (07:00-08:59)` },
    { value: 9, label: `巳${shi} (09:00-10:59)` },
    { value: 10, label: `巳${shi} (09:00-10:59)` },
    { value: 11, label: `午${shi} (11:00-12:59)` },
    { value: 12, label: `午${shi} (11:00-12:59)` },
    { value: 13, label: `未${shi} (13:00-14:59)` },
    { value: 14, label: `未${shi} (13:00-14:59)` },
    { value: 15, label: `申${shi} (15:00-16:59)` },
    { value: 16, label: `申${shi} (15:00-16:59)` },
    { value: 17, label: `酉${shi} (17:00-18:59)` },
    { value: 18, label: `酉${shi} (17:00-18:59)` },
    { value: 19, label: `戌${shi} (19:00-20:59)` },
    { value: 20, label: `戌${shi} (19:00-20:59)` },
    { value: 21, label: `亥${shi} (21:00-22:59)` },
    { value: 22, label: `亥${shi} (21:00-22:59)` },
    { value: 22, label: `亥${shi} (21:00-22:59)` },
    { value: 23, label: `亥${shi} (21:00-22:59)` },
  ]
}
const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
]

/* ------------------------------------------------------------
   合盘提示词
   ------------------------------------------------------------ */

const MATCH_PROMPT = `# Role
你是一位擅长推演人际姻缘的紫微斗数专家。根据提供的命盘信息进行解读。在合盘分析中，你不仅观察表面的星情互补，更注重通过"飞星四化"来推演两人深层的缘分羁绊与利弊关系。

# Analysis Logic
1.  **星情对看**：分析两人命宫主星的性质是否匹配（如：强弱搭配、动静结合）。
2.  **四化互飞**：推演A的命宫四化飞入B的宫位，判断A对B是生助（化禄）还是刑克（化忌），反之亦然。
3.  **宫位参合**：观察双方夫妻宫的意象是否与对方吻合。

# Output Format
请严格按照以下结构输出分析报告：

## 双人命盘合参解析

### 壹· 缘分深浅
* **契合综述**：不使用分数，而是用定性描述（如：天作之合、欢喜冤家、因缘波折、相辅相成）。
* **关系本质**：从命理角度解析，两人相遇是互相成就，还是互相偿还宿债。

### 贰· 性情互动
* **相合之处**：两人性格中能够产生共鸣或互补的地方。
* **磨合难点**：两人性格中容易产生摩擦或误解的本质原因（如：一方重情，一方重利）。

### 叁· 命理羁绊（四化互飞）
* **助益分析**：分析两人在一起，谁能旺谁？（如：对方是否有助于你的事业或财运）。
* **隐忧所在**：命理上是否存在互相刑克或拖累的情况？

### 肆· 现实展望
* **未来挑战**：若长期相处或步入婚姻，最需要共同面对的现实考验是什么？
* **相处建议**：针对两人的命局特点，给出具体的相处之道与沟通建议。

---
*注：缘分天定，份在人为。合盘分析旨在增进了解，非绝对定论。*`

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
  hr: () => (
    <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-text-muted not-italic">{children}</em>
  ),
}

/* ------------------------------------------------------------
   个人信息输入组件
   ------------------------------------------------------------ */

interface PersonInputProps {
  label: string
  value: BirthInfo
  onChange: (info: BirthInfo) => void
}

function PersonInput({ label, value, onChange }: PersonInputProps) {
  const { language } = useSettingsStore()

  const update = (field: keyof BirthInfo, val: number | Gender) => {
    onChange({ ...value, [field]: val })
  }

  return (
    <div
      className="
        relative p-5
        bg-gradient-to-br from-white/[0.04] to-transparent
        backdrop-blur-xl border border-white/[0.08] rounded-xl
        shadow-[0_4px_20px_rgba(0,0,0,0.2)]
      "
    >
      <h3
        className="text-lg font-medium mb-4 bg-gradient-to-r from-star-light to-gold bg-clip-text text-transparent"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {label}
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Select
            label={t('match.year', language)}
            options={YEAR_OPTIONS}
            value={value.year}
            onChange={(e) => update('year', Number(e.target.value))}
          />
          <Select
            label={t('match.month', language)}
            options={MONTH_OPTIONS}
            value={value.month}
            onChange={(e) => update('month', Number(e.target.value))}
          />
          <Select
            label={t('match.day', language)}
            options={DAY_OPTIONS}
            value={value.day}
            onChange={(e) => update('day', Number(e.target.value))}
          />
        </div>
        <Select
          label={t('match.hour', language)}
          options={getHourOptions(language)}
          value={value.hour}
          onChange={(e) => update('hour', Number(e.target.value))}
        />
        <div className="flex gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`
                flex-1 py-2 px-3 rounded-lg text-center text-sm cursor-pointer transition-all
                ${value.gender === opt.value
                  ? 'bg-star text-white'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }
              `}
            >
              <input
                type="radio"
                value={opt.value}
                checked={value.gender === opt.value}
                onChange={() => update('gender', opt.value as Gender)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------
   双人合盘主组件
   ------------------------------------------------------------ */

export function MatchAnalysis() {
  const { provider, providerSettings, enableThinking, enableWebSearch, searchApiKey, language } = useSettingsStore()
  const currentSettings = providerSettings[provider]

  const [person1, setPerson1] = useState<BirthInfo>({
    year: 1970, month: 9, day: 3, hour:13, gender: 'male',
  })
  const [person2, setPerson2] = useState<BirthInfo>({
    year: 1970, month: 3, day: 6, hour:20, gender: 'female',
  })
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = useCallback(async () => {
    if (!currentSettings.apiKey) {
      setError(t('match.configureApiKey', language))
      return
    }

    setLoading(true)
    setError(null)
    setResult('')

    try {
      // 生成两人命盘
      const chart1 = generateChart(person1)
      const chart2 = generateChart(person2)

      // 提取知识上下文
      const knowledge1 = extractKnowledge(chart1, person1.year)
      const knowledge2 = extractKnowledge(chart2, person2.year)
      const context1 = buildPromptContext(knowledge1)
      const context2 = buildPromptContext(knowledge2)

      const isTraditional = language === 'zh-TW'
      const userMessage = `${isTraditional ? '請分析以下兩人的命盤契合度：' : '请分析以下两人的命盘契合度：'}

## ${t('match.firstPerson', language)}
- ${isTraditional ? '出生' : '出生'}：${person1.year}年${person1.month}月${person1.day}日
- ${t('form.gender', language)}：${person1.gender === 'male' ? t('form.male', language) : t('form.female', language)}
- ${t('chart.fiveElementsClass', language)}：${chart1.fiveElementsClass}

${context1}

## ${t('match.secondPerson', language)}
- ${isTraditional ? '出生' : '出生'}：${person2.year}年${person2.month}月${person2.day}日
- ${t('form.gender', language)}：${person2.gender === 'male' ? t('form.male', language) : t('form.female', language)}
- ${t('chart.fiveElementsClass', language)}：${chart2.fiveElementsClass}

${context2}

${isTraditional ? '請分析兩人的契合度和相處建議。' : '请分析两人的契合度和相处建议。'}`

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `${MATCH_PROMPT}\n\n${isTraditional ? '請使用繁體中文輸出全部內容。' : '请使用简体中文输出全部内容。'}`,
        },
        { role: 'user', content: userMessage },
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

      let fullText = ''
      for await (const token of streamChat(config, messages)) {
        fullText += token
        setResult(fullText)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('match.analysisFailed', language))
    } finally {
      setLoading(false)
    }
  }, [person1, person2, provider, currentSettings, enableThinking, enableWebSearch, searchApiKey, language])

  return (
    <div className="animate-fade-in space-y-8 max-w-6xl mx-auto">
      {/* 顶部：双人信息输入 + 按钮 */}
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

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <h2
            className="
              text-xl lg:text-2xl font-semibold
              bg-gradient-to-r from-gold via-gold-light to-gold
              bg-clip-text text-transparent
            "
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t('nav.match', language)}
          </h2>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !currentSettings.apiKey}
            size="sm"
            variant="gold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-night border-t-transparent rounded-full animate-spin" />
                {t('fortune.analyzing', language)}
              </span>
            ) : currentSettings.apiKey ? t('match.startAnalyze', language) : t('fortune.configureApi', language)}
          </Button>
        </div>

        {/* 双人信息输入区 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PersonInput label={t('match.firstPerson', language)} value={person1} onChange={setPerson1} />
          <PersonInput label={t('match.secondPerson', language)} value={person2} onChange={setPerson2} />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-misfortune/10 text-misfortune text-sm border border-misfortune/20">
            {error}
          </div>
        )}
      </div>

      {/* 下方：分析结果 */}
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
            bg-gradient-to-r from-transparent via-star/50 to-transparent
          "
        />

        {/* 未配置提示 */}
        {!currentSettings.apiKey && !result && (
          <div className="text-text-muted text-sm py-8 text-center">
            <div className="text-3xl mb-3 opacity-30">⚭</div>
            {t('match.configureApiLong', language)}
          </div>
        )}

        {/* 未分析提示 */}
        {currentSettings.apiKey && !result && !loading && (
          <div className="text-text-muted text-sm py-8 text-center">
            <div className="text-3xl mb-3 opacity-30">⚭</div>
            {t('match.inputHint', language)}
          </div>
        )}

        {/* 加载中 */}
        {loading && !result && (
          <div className="flex items-center justify-center gap-3 text-text-muted py-12">
            <div className="w-5 h-5 border-2 border-star border-t-transparent rounded-full animate-spin" />
            <span>{t('match.loadingText', language)}</span>
          </div>
        )}

        {/* 分析结果 - Markdown 渲染 */}
        {result && (
          <div
            className="
              prose prose-invert max-w-none
              text-text-secondary text-lg lg:text-xl leading-loose
            "
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents}
            >
              {result}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
